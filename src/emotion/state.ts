import { constants, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { EmotionDependencies, EmotionSnapshot, EmotionState, EmotionUpdate } from '../contracts/emotion.js';
import { readRoomMood } from './index.js';

interface Scope { path: string; companionId: string; scopeId: string; storageId: string }
interface Document { schema: 1; companionId: string; scopeId: string; storageId: string; revision: number; current: EmotionState | null; importedLegacy?: true }
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
function strings(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length > 256 || value.some(item => typeof item !== 'string' || !item || item.length > 512)) throw Error('Invalid emotion ' + name);
  return [...new Set(value)];
}
export function readDependencies(value: unknown): EmotionDependencies {
  if (!object(value)) throw Error('Invalid emotion dependencies');
  const list = (items: unknown) => {
    if (!Array.isArray(items) || items.length > 4096 || items.some(row => !object(row) || typeof row.id !== 'string' || !row.id || typeof row.revision !== 'string' || !row.revision)) throw Error('Invalid emotion dependency versions');
    return items.map(row => ({ id: row.id as string, revision: row.revision as string }));
  };
  return { sources: list(value.sources), memories: list(value.memories) };
}
export function readEmotionState(value: unknown): EmotionState {
  if (!object(value) || typeof value.mood !== 'string' || !value.mood.trim() || value.mood.length > 160 || typeof value.reason !== 'string' || value.reason.length > 4000 || typeof value.at !== 'number' || !Number.isFinite(value.at) || value.at < 0) throw Error('Invalid maintained emotion state');
  if(Object.keys(value).some(key=>!['mood','reason','at','memories','feelings','roomMood','dependencies'].includes(key)))throw Error('Unknown emotion content; retained for review');
  const state: EmotionState = { mood: value.mood, reason: value.reason, at: value.at, memories: strings(value.memories, 'memory references') };
  if (value.roomMood !== undefined) { const roomMood = readRoomMood(value.roomMood); if (!roomMood) throw Error('Invalid emotion Room values'); state.roomMood = roomMood; }
  if (value.feelings !== undefined) state.feelings = strings(value.feelings, 'feelings');
  if (value.dependencies !== undefined) state.dependencies = readDependencies(value.dependencies);
  return state;
}

/** One canonical file; old Core rows are only a one-time import source. */
export class EmotionFile {
  constructor(private readonly scope: Scope, private readonly legacy: () => unknown) {}
  private location(create = false) {
    if (realpathSync(this.scope.path) !== this.scope.path) throw Error('Emotion workspace moved');
    let directory = this.scope.path;
    for (const part of ['.chatpet', 'data', 'emotion']) {
      directory = join(directory, part);
      if (!existsSync(directory)) {
        if (!create) return undefined;
        if (part === '.chatpet') throw Error('Emotion requires an initialized companion Repo');
        mkdirSync(directory, {mode: 0o700});
      }
      const stat = lstatSync(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Emotion directory must remain inside the bound Repo');
    }
    return join(directory, 'state.json');
  }
  private empty(): Document { return {schema: 1, companionId: this.scope.companionId, scopeId: this.scope.scopeId, storageId: this.scope.storageId, revision: 0, current: null}; }
  load(): {document: Document; contentHash: string} {
    const file = this.location();
    if (!file || !existsSync(file)) {
      const previous = this.legacy();
      const document = this.empty();
      if (previous) {
        document.current = readEmotionState(previous); document.revision = 1; document.importedLegacy = true;
        this.write(document, {revision: 0, contentHash: hash('absent')});
        return this.load();
      }
      return {document, contentHash: hash('absent')};
    }
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 262144) throw Error('Invalid emotion file; the original has been retained');
    const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    let text: string; try { text = readFileSync(fd, 'utf8'); } finally { closeSync(fd); }
    const raw: unknown = JSON.parse(text);
    if (!object(raw) || raw.schema !== 1 || raw.companionId !== this.scope.companionId || raw.scopeId !== this.scope.scopeId || raw.storageId !== this.scope.storageId || !Number.isSafeInteger(raw.revision) || Number(raw.revision) < 1 || Object.keys(raw).some(key=>!['schema','companionId','scopeId','storageId','revision','current','importedLegacy'].includes(key))) throw Error('Emotion identity, revision or schema mismatch; the original has been retained');
    const document: Document = {schema: 1, companionId: this.scope.companionId, scopeId: this.scope.scopeId, storageId: this.scope.storageId, revision: Number(raw.revision), current: raw.current === null ? null : readEmotionState(raw.current), ...(raw.importedLegacy === true ? {importedLegacy: true} : {})};
    return {document, contentHash: hash(text)};
  }
  snapshot(value: ReturnType<EmotionFile['load']>): EmotionSnapshot {
    return {status: value.document.current ? 'ready' : 'empty', revision: value.document.revision, contentHash: value.contentHash, ...(value.document.current ? {state: structuredClone(value.document.current)} : {})};
  }
  private write(document: Document, expected: {revision: number; contentHash: string}) {
    const file = this.location(true)!;
    // No await between the final comparison and rename: stale editors cannot replace a newer revision.
    if (existsSync(file)) {
      const current = this.load();
      if (current.document.revision !== expected.revision || current.contentHash !== expected.contentHash) throw Error('Emotion changed; refresh before saving');
    } else if (expected.revision !== 0 || expected.contentHash !== hash('absent')) throw Error('Emotion file changed; refresh before saving');
    const temp = file + '.' + randomUUID() + '.tmp';
    const fd = openSync(temp, 'wx', 0o600);
    try { writeFileSync(fd, JSON.stringify(document, null, 2) + '\n'); fsyncSync(fd); } finally {closeSync(fd);}
    try {renameSync(temp, file);} finally {if (existsSync(temp)) unlinkSync(temp);}
  }
  update(input: EmotionUpdate, at = Date.now()): EmotionSnapshot {
    const previous = this.load();
    if (previous.document.revision !== input.expectedRevision || previous.contentHash !== input.expectedHash) throw Error('Emotion changed; refresh before saving');
    const state = readEmotionState({mood: input.mood, reason: input.reason ?? '', at, memories: input.memories ?? [], ...(input.feelings ? {feelings: input.feelings} : {}), ...(input.roomMood ? {roomMood: input.roomMood} : {}), ...(input.dependencies ? {dependencies: input.dependencies} : {})});
    const document = {...previous.document, revision: previous.document.revision + 1, current: state};
    this.write(document, {revision: input.expectedRevision, contentHash: input.expectedHash});
    return this.snapshot(this.load());
  }
}
