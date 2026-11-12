import type { Context } from '@deepseek-ai/cordis';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { collectPaths } from '#dsh-world/life/activity';
import { readStable } from '#dsh-world/memoryFiles';
import { renderSelf } from '#dsh-world/self';
import type { PetCoreHost } from './index.js';
import { check } from './storage.js';

export interface CompanionWritingScope {
  id: string; directory: string; timeZone: string; sessionIds: readonly string[];
  running?:boolean; isHome(id: string): boolean;
}
const owned = (path: string) => path === 'self.md' || /^(?:diary|self\.history)\/\d{4}-\d{2}-\d{2}\.md$/.test(path);

function fileInScope(host: PetCoreHost, scope: CompanionWritingScope, name: string) {
  const current = host.workspace.status();
  check(owned(name) && current.state === 'ready' && current.target?.id === scope.id
    && join(current.target.path, '.chatpet', 'data', 'life') === scope.directory, 'Companion writing is outside the bound workspace');
  let path = current.target.path;
  for (const part of ['.chatpet', 'data', 'life', ...name.split('/')]) {
    path = join(path, part);
    const stat = lstatSync(path, {throwIfNoEntry: false});
    if (!stat) continue;
    check(!stat.isSymbolicLink() && (path === join(scope.directory, name) ? stat.isFile() && stat.nlink === 1 : stat.isDirectory()),
      'Unexpected companion writing path');
  }
  return path;
}
/** Self and diaries are module-owned documents, not Memory projections. Bank
 * withdrawal does not erase these files or make an owner conversation unusable.
 * Native scope and stable-file checks remain independent of Memory availability. */
export async function readCompanionWriting(host: PetCoreHost, scope: CompanionWritingScope, name: string, consumerSessionId?: string, _attach = true): Promise<string | undefined> {
  if (consumerSessionId && !scope.sessionIds.includes(consumerSessionId)) return;
  const file = fileInScope(host, scope, name);
  if (!existsSync(file)) return;
  const read = await readStable(file);
  if (read.kind === 'missing') return;
  check(read.kind === 'ok', 'Companion writing is unreadable or changing');
  fileInScope(host, scope, name);
  return read.content;
}

export async function readSelfPrompt(host: PetCoreHost, scope: CompanionWritingScope, sessionId: string, attach: boolean) {
  const content = await readCompanionWriting(host, scope, 'self.md', sessionId, attach);
  if (!content?.trim()) return '';
  // World owns quoting, Unicode limits and the truncation notice.
  const file = fileInScope(host, scope, 'self.md');
  let rendered = '';
  const compared = await readStable(file, async () => { rendered = renderSelf(file); });
  fileInScope(host, scope, 'self.md');
  return compared.kind === 'ok' && compared.content === content ? rendered : '';
}

/** Keep the existing local path guard; DSH still owns file-tool permissions.
 * There is no whole-chat dependency graph or Memory mode stored by this hook. */
export function trackCompanionWriting(ctx: Context, host: PetCoreHost, getScope: () => CompanionWritingScope | undefined) {
  return ctx.on('tools/pre-execute', (exec, next) => {
    const scope = getScope(), agent = exec.agent;
    if (!scope || !agent || !scope.sessionIds.includes(agent.id) || !['read', 'write', 'edit'].includes(exec.name)) return next();
    for (const path of collectPaths(exec.arguments, false, [])) {
      const name = relative(scope.directory, resolve(agent.session.header.cwd ?? scope.directory, path)).split(sep).join('/');
      if (owned(name)) fileInScope(host, scope, name);
    }
    return next();
  });
}
