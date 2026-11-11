import type { Context } from '@deepseek-ai/cordis';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { collectPaths } from '#dsh-world/life/activity';
import { readStable } from '#dsh-world/memoryFiles';
import { renderSelf } from '#dsh-world/self';
import type { PetCoreHost } from '../core/index.js';
import { check, digest } from '../core/storage.js';

export interface ReviewScope {
  id: string; directory: string; timeZone: string; sessionIds: readonly string[];
  running?:boolean; isHome(id: string): boolean;
}
interface Evidence { sources: string[]; private: boolean }
interface Writing { before: string | null; old: Evidence; changed: Evidence }
const owned = (path: string) => path === 'self.md' || /^(?:diary|self\.history)\/\d{4}-\d{2}-\d{2}\.md$/.test(path);

function fileInScope(host: PetCoreHost, scope: ReviewScope, name: string) {
  const current = host.workspace.status();
  check(owned(name) && current.state === 'ready' && current.target?.id === scope.id
    && join(current.target.path, '.chatpet', 'data', 'life') === scope.directory, 'Life writing is outside the bound workspace');
  let path = current.target.path;
  for (const part of ['.chatpet', 'data', 'life', ...name.split('/')]) {
    path = join(path, part);
    const stat = lstatSync(path, {throwIfNoEntry: false});
    if (!stat) continue;
    check(!stat.isSymbolicLink() && (path === join(scope.directory, name) ? stat.isFile() && stat.nlink === 1 : stat.isDirectory()),
      'Unexpected Life writing path');
  }
  return path;
}
const writingKey = (host: PetCoreHost, name: string) => digest([host.workspace.storageId(), name]);
function sessionEvidence(host: PetCoreHost, id: string): Evidence {
  const store = host.workspace.runtime.store;
  return {sources: store.get<string[]>('native-history', id) ?? [],
    private: store.get<boolean>('native-memory-enabled', id) === false};
}
function evidence(host: PetCoreHost, scope: ReviewScope, name: string, version: string | null): Evidence {
  const saved = host.workspace.runtime.store.get<Writing>('life-writing', writingKey(host, name));
  const store=host.workspace.runtime.store;
  const versionKey=version ? writingKey(host,'self-version:'+version) : undefined;
  if (saved) {
    const lineage=saved.before === version ? saved.old : saved.changed;
    if(name==='self.md' && versionKey) store.put('life-self-version',versionKey,lineage);
    return lineage;
  }
  if(name.startsWith('self.history/') && versionKey) {
    const known=store.get<Evidence>('life-self-version',versionKey);
    if(known)return known;
    const self=fileInScope(host,scope,'self.md');
    if(existsSync(self)&&digest(readFileSync(self,'utf8'))===version)return evidence(host,scope,'self.md',version);
  }
  // Before per-write lineage, the retained home history bounds what an existing
  // model-authored file could contain. A new imported author file has no model
  // session dependencies until it is rewritten by one.
  let home = scope.sessionIds.find(scope.isHome);
  if (!home) {
    const path=join(scope.directory,'life.json'), stat=lstatSync(path,{throwIfNoEntry:false});
    if(stat) {
      check(stat.isFile() && stat.nlink===1, 'Invalid Life state file');
      const savedId=JSON.parse(readFileSync(path,'utf8')).homeSessionId;
      if(typeof savedId==='string') {
        if(!scope.sessionIds.includes(savedId))return {sources:[],private:true};
        home=savedId;
      }
    }
  }
  const imported = version && home ? sessionEvidence(host, home) : {sources: [], private: false};
  if (version) host.workspace.runtime.store.put('life-writing', writingKey(host, name), {before: version, old: imported, changed: imported} satisfies Writing);
  if(name==='self.md' && versionKey)store.put('life-self-version',versionKey,imported);
  return imported;
}

export async function readLifeWriting(host: PetCoreHost, scope: ReviewScope, name: string, consumerSessionId?: string, attach = true): Promise<string | undefined> {
  const file = fileInScope(host, scope, name);
  if (!existsSync(file)) return;
  const read = await readStable(file);
  if (read.kind === 'missing') return;
  check(read.kind === 'ok', 'Life writing is unreadable or changing');
  const version = digest(read.content), initial = evidence(host, scope, name, version);
  if (initial.private) return;
  if (initial.sources.length) {
    const memory = consumerSessionId ? host.native.memoryFor(consumerSessionId) : host.native.memory;
    if (!memory || await memory.sourcesForWriting(scope.id, initial.sources) !== 'eligible') return;
    if (consumerSessionId && attach) await host.native.useSources(consumerSessionId, initial.sources);
  }
  fileInScope(host, scope, name);
  const after = await readStable(file);
  if (after.kind !== 'ok' || after.content !== read.content
    || digest(evidence(host, scope, name, version)) !== digest(initial)) return;
  fileInScope(host, scope, name);
  return read.content;
}

export async function readSelfPrompt(host: PetCoreHost, scope: ReviewScope, sessionId: string, attach: boolean) {
  const content = await readLifeWriting(host, scope, 'self.md', sessionId, attach);
  if (!content?.trim()) return '';
  // World owns quoting, Unicode limits and the truncation notice.
  const file = fileInScope(host, scope, 'self.md');
  let rendered = '';
  const compared = await readStable(file, async () => { rendered = renderSelf(file); });
  fileInScope(host, scope, 'self.md');
  return compared.kind === 'ok' && compared.content === content ? rendered : '';
}

/** Record dependencies before file dispatch, even if the host is interrupted
 * before a tool result arrives. A denied/failed write preserves the previous
 * eligibility while its content is unchanged. */
export function trackLifeWriting(ctx: Context, host: PetCoreHost, getScope: () => ReviewScope | undefined) {
  ctx.on('tools/pre-execute', async (exec, next) => {
    const scope = getScope(), agent = exec.agent;
    if (!scope || !agent || !scope.sessionIds.includes(agent.id) || !['read', 'write', 'edit'].includes(exec.name)) return next();
    const names = new Set(collectPaths(exec.arguments, false, []).map(path =>
      relative(scope.directory, resolve(agent.session.header.cwd ?? scope.directory, path)).split(sep).join('/')).filter(owned));
    for (const name of names) {
      const file = fileInScope(host, scope, name);
      if ((exec.name === 'read' || exec.name === 'edit') && existsSync(file)
        && await readLifeWriting(host, scope, name, agent.id) === undefined)
        return {kind: 'deny', reason: '这份自述或日记的来源已变化，当前会话无法读取。'};
      if (exec.name === 'read') continue;
      const prior = await readStable(file);
      if (prior.kind === 'failed') return {kind: 'deny', reason: '无法确认文件原有版本。'};
      const before = prior.kind === 'ok' ? digest(prior.content) : null;
      const old = evidence(host, scope, name, before), changed = sessionEvidence(host, agent.id);
      if (exec.name === 'edit') {
        changed.sources = [...new Set([...old.sources, ...changed.sources])];
        changed.private ||= old.private;
      }
      fileInScope(host, scope, name);
      host.workspace.runtime.store.put('life-writing', writingKey(host, name), {before, old, changed} satisfies Writing);
    }
    return next();
  });
}
