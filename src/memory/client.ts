import { fileURLToPath, pathToFileURL } from 'node:url';
import { isAbsolute, join, relative, sep } from 'node:path';
import { existsSync, lstatSync } from 'node:fs';

export interface MemoryConfig { dataDir: string; python: string; serviceEntry?: string }
export interface MemoryScope { companionId: string; scopeId: string; workspaceId: string }
export interface SourceDependency { id: string; revision: string }
export interface Dependencies { sources: SourceDependency[]; memories: SourceDependency[] }
export type Decision = 'eligible' | 'ineligible' | 'unknown';
export interface RecalledMemory { memory: { id: string; version: number; content: string;
  type?: string; status?: string; epistemic?: string; metadata?: { epistemic?: string } }; dependencies: Dependencies;
  conversation?: { sourceId: string; text: string; role?: string }[] }

/** One selected provider/client artifact, not a replacement REST or process host. */
export class MemoryConnection {
  private host: any;
  private client: any;
  private scope?: MemoryScope;
  private directory?: string;
  private transition: Promise<void> = Promise.resolve();
  constructor(readonly config: MemoryConfig) {
    if (!isAbsolute(config.dataDir) || !isAbsolute(config.python)) throw new Error('Memory paths must be explicitly configured absolute paths');
    if (config.serviceEntry && !isAbsolute(config.serviceEntry)) throw new Error('Memory service entry must be an absolute trusted host path');
  }
  get lifecycle(): 'ready' | 'stopped' | 'unresolved' {
    return this.host?.ready && this.client ? 'ready' : this.host?.child ? 'unresolved' : 'stopped';
  }
  async start(scope: MemoryScope, workspacePath: string, useConfiguredDirectory: boolean): Promise<void> {
    const configured = relative(workspacePath, this.config.dataDir);
    const directory = useConfiguredDirectory && configured && configured !== '..' && !configured.startsWith('..' + sep) && !isAbsolute(configured)
      ? this.config.dataDir : join(workspacePath, '.chatpet', 'data', 'memory');
    let parent = workspacePath;
    for (const part of relative(workspacePath, directory).split(sep)) {
      parent = join(parent, part);
      if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error('Workspace Memory directory contains a symbolic link');
    }
    const next = this.transition.then(() => this.open(scope, directory));
    this.transition = next.catch(() => {});
    return next;
  }
  private async open(scope: MemoryScope, directory: string): Promise<void> {
    if (this.client && directory === this.directory && JSON.stringify(scope) === JSON.stringify(this.scope)) return;
    if (this.host) await this.stop();
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    const { MemoryProcessHost } = await import(pathToFileURL(`${root}vendor/mnemosyne/src/memory-process.js`).href);
    const { MemoryClient } = await import(pathToFileURL(`${root}vendor/mnemosyne/src/memory-client.js`).href);
    this.host = new MemoryProcessHost({ serviceRoot: `${root}vendor/mnemosyne/service`, serviceEntry: this.config.serviceEntry ?? `${root}src/memory/main.py`,
      dataDir: directory, python: this.config.python,
      serviceEnv: { CHATPET_MEMORY_SCOPE: JSON.stringify(scope), PYTHONDONTWRITEBYTECODE: '1' } });
    this.scope = scope;
    this.directory = directory;
    this.client = new MemoryClient(await this.host.start({ timeoutMs: 10000 }));
  }
  async call<T>(operation: string, args: Record<string, unknown>, expectedWorkspaceId?: string): Promise<T> {
    if (!this.client || !this.scope) throw new Error('Memory provider unavailable');
    if (expectedWorkspaceId !== undefined && this.scope.workspaceId !== expectedWorkspaceId)
      throw Object.assign(new Error('Memory workspace changed'), { code: 'STALE_BINDING' });
    try { return await this.client.request('POST', `/pet/v1/${operation}`, { scope: this.scope, ...args }); }
    catch (error) {
      const detail = (error as { data?: { detail?: unknown } })?.data?.detail;
      if (error instanceof Error && typeof detail === 'string') error.message = `Memory ${operation}: ${detail}`;
      throw error;
    }
  }
  async validate(dependencies: Dependencies, expectedWorkspaceId?: string): Promise<Decision> {
    try { return (await this.call<{ decision: Decision }>('validate', { ...dependencies }, expectedWorkspaceId)).decision; }
    catch { return 'unknown'; }
  }
  async close(): Promise<void> {
    const next = this.transition.then(() => this.stop());
    this.transition = next.catch(() => {});
    return next;
  }
  private async stop(): Promise<void> {
    this.client = undefined;
    if (this.host && (await this.host.stop()).state !== 'stopped') throw new Error('Memory owned child remains unresolved');
    this.host = undefined;
  }
}
