import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CoreRuntime } from './core.js';
import { preferences, type CorePreferences, type WorkspaceTarget } from './preferences.js';
import { conversationOptions } from './options.js';
import type { CompanionIdentity, AttentionPolicy } from '../contracts/core.js';
import type { ServiceCall } from '../contracts/common.js';
import { bytesDigest, canonical, check, reject, revision, text, now } from './storage.js';

const REQUIRED = ['README.md', 'manifest.json', 'SOUL.md', 'USER.md', 'core.json'] as const;
const LEGACY_FILES = [...REQUIRED, 'STATE.md'];
const MAX_BYTES = 64 * 1024;
interface Manifest { schemaVersion: 1 | 2; companionId: string; files: readonly string[] }
interface FileConfig { schemaVersion: 1; quiet: boolean; conversation: CorePreferences['conversation'] }
interface Binding { revision: number; target: WorkspaceTarget; phase: 'ready' | 'inactive'; hashes: Record<string, string>; initializedAt: string }
interface Documents { identity: Pick<CompanionIdentity, 'displayName' | 'character'>; user: string; config: FileConfig; hashes: Record<string, string> }
export interface WorkspaceStatus {
  state: 'unbound' | 'pending' | 'ready' | 'unavailable'; revision: number | null;
  target: WorkspaceTarget | null; files: readonly string[]; error: string | null;
  sourceRevision: string | null;
}
export interface WorkspaceService {
  inspect: ServiceCall<Record<string, never>, WorkspaceStatus>;
  initialize: ServiceCall<{ expectedPreferencesRevision: number }, WorkspaceStatus>;
  readProfile: ServiceCall<Record<string, never>, { revision: number; text: string }>;
  saveProfile: ServiceCall<{ expectedRevision: number; text: string }, { revision: number; text: string }>;
}

/** Core-owned repository authority. Runtime ledgers and credentials never move here. */
export class CoreWorkspace {
  readonly port: WorkspaceService;
  constructor(readonly runtime: CoreRuntime) {
    this.port = {
      inspect: runtime.call('workspace.inspect', false, () => this.status(), true),
      initialize: runtime.call('workspace.initialize', true, input => {
        const prefs = preferences(runtime); revision(prefs.revision, input.expectedPreferencesRevision);
        check(prefs.workspace !== null, 'Choose a workspace first');
        this.initialize(prefs.workspace); return this.status();
      }, true),
      readProfile: runtime.call('workspace.readProfile', false, () => runtime.store.get<{ revision: number; text: string }>('profile', 'current') ?? { revision: 1, text: '' }, true),
      saveProfile: runtime.call('workspace.saveProfile', true, input => {
        text(input.text, 'user profile', MAX_BYTES);
        const current = runtime.store.get<{ revision: number; text: string }>('profile', 'current') ?? { revision: 1, text: '' };
        revision(current.revision, input.expectedRevision);
        const binding = this.binding(); check(binding !== null, 'Initialize the workspace first');
        this.replace(binding, 'USER.md', input.text);
        const value = { revision: current.revision + 1, text: input.text }; runtime.store.put('profile', 'current', value); return value;
      }, true),
    };
  }
  private binding(): Binding | null {
    const binding = this.runtime.store.get<Binding>('workspace-binding', 'current');
    const target = preferences(this.runtime).workspace;
    return binding?.phase === 'ready' && target?.id === binding.target.id && target.path === binding.target.path ? binding : null;
  }
  private directory(target: WorkspaceTarget): string {
    check(realpathSync(target.path) === target.path && lstatSync(target.path).isDirectory(), 'Workspace root changed');
    const directory = join(target.path, '.chatpet');
    if (existsSync(directory)) check(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(), 'Managed directory must not be a symlink');
    return directory;
  }
  private read(directory: string, name: string): string {
    check(REQUIRED.includes(name as typeof REQUIRED[number]), 'Unknown managed file');
    const fd = openSync(join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = fstatSync(fd); check(before.isFile() && before.size <= MAX_BYTES, 'Managed file is not a bounded regular file');
      const bytes = readFileSync(fd); const after = fstatSync(fd);
      check(before.size === after.size && before.mtimeMs === after.mtimeMs && bytes.length === after.size, 'Managed file changed while reading');
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } finally { closeSync(fd); }
  }
  private atomic(directory: string, name: string, value: string): void {
    check(Buffer.byteLength(value) <= MAX_BYTES, 'Managed file exceeds size limit');
    const file = join(directory, name);
    if (existsSync(file)) check(lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink(), 'Refusing to replace a non-regular managed file');
    const temporary = join(directory, `.${name}.${randomUUID()}.tmp`);
    const fd = openSync(temporary, 'wx', 0o600);
    try { writeFileSync(fd, value); fsyncSync(fd); } finally { closeSync(fd); }
    try { renameSync(temporary, file); const dir = openSync(directory, 'r'); try { fsyncSync(dir); } finally { closeSync(dir); } }
    finally { if (existsSync(temporary)) rmSync(temporary); }
  }
  private soul(identity: Pick<CompanionIdentity, 'displayName' | 'character'>): string {
    text(identity.displayName, 'displayName', 256); check(!/[\r\n]/.test(identity.displayName), 'Role name must be one line');
    text(identity.character, 'character', MAX_BYTES - 1024);
    return `# ${identity.displayName}\n\n${identity.character}`;
  }
  private documents(target: WorkspaceTarget): Documents {
    const directory = this.directory(target);
    const manifestText = this.read(directory, 'manifest.json');
    const manifest = JSON.parse(manifestText) as Manifest;
    check(manifest.companionId === this.runtime.config.companionId, 'Workspace belongs to a different companion');
    check(Array.isArray(manifest.files) && (manifest.schemaVersion === 2 && canonical(manifest.files) === canonical(REQUIRED)
      || manifest.schemaVersion === 1 && canonical(manifest.files) === canonical(LEGACY_FILES)), 'Unexpected managed format or file declaration');
    const soul = this.read(directory, 'SOUL.md'); const match = /^# ([^\r\n]+)\r?\n\r?\n([\s\S]+)$/.exec(soul);
    check(match, 'SOUL.md requires a role heading, a blank line and character text');
    const identity = { displayName: match![1], character: match![2] }; this.soul(identity);
    const user = this.read(directory, 'USER.md');
    const configText = this.read(directory, 'core.json'); const raw = JSON.parse(configText) as FileConfig;
    check(raw.schemaVersion === 1 && typeof raw.quiet === 'boolean' && canonical(Object.keys(raw).sort()) === canonical(['conversation', 'quiet', 'schemaVersion']), 'Invalid core.json');
    const conversation = conversationOptions(raw.conversation);
    check(raw.conversation && canonical(Object.keys(raw.conversation).sort()) === canonical(Object.keys(conversation).sort()), 'Invalid conversation configuration');
    return { identity, user, config: { schemaVersion: 1, quiet: raw.quiet, conversation }, hashes: {
      'manifest.json': bytesDigest(Buffer.from(manifestText)), 'SOUL.md': bytesDigest(Buffer.from(soul)),
      'USER.md': bytesDigest(Buffer.from(user)), 'core.json': bytesDigest(Buffer.from(configText)),
    } };
  }
  private initialize(target: WorkspaceTarget): void {
    const directory = this.directory(target), store = this.runtime.store;
    const identity = store.require<CompanionIdentity>('identity', 'current');
    const config: FileConfig = { schemaVersion: 1, quiet: this.runtime.policy().quiet, conversation: preferences(this.runtime).conversation };
    if (!existsSync(directory)) {
      const stage = join(target.path, `.chatpet-initialize-${randomUUID()}`); mkdirSync(stage, { mode: 0o700 });
      try {
        const manifest: Manifest = { schemaVersion: 2, companionId: identity.companionId, files: REQUIRED };
        for (const [name, value] of Object.entries({
          'README.md': '# Chatpet Workspace\n\nSOUL.md and USER.md are editable profile sources. core.json is validated configuration.\nCore governs real execution; Memory owns long-term memory. No task summary is generated here.\nExecution receipts, native logs and credentials retain their runtime owners.\n',
          'manifest.json': JSON.stringify(manifest, null, 2) + '\n', 'SOUL.md': this.soul(identity),
          'USER.md': store.get<{ text: string }>('profile', 'current')?.text || '# User\n\n',
          'core.json': JSON.stringify(config, null, 2) + '\n',
        })) this.atomic(stage, name, value);
        check(!existsSync(directory), 'Managed directory appeared during initialization');
        renameSync(stage, directory); this.runtime.fileEffect = true;
      } finally { if (existsSync(stage)) rmSync(stage, { recursive: true }); }
    }
    let docs = this.documents(target); // Validate existing material before migration/adoption.
    const manifest = JSON.parse(this.read(directory, 'manifest.json')) as Manifest;
    if (manifest.schemaVersion === 1) {
      // Retire the old declaration without reading, deleting or updating STATE.md.
      this.atomic(directory, 'manifest.json', JSON.stringify({ schemaVersion: 2, companionId: manifest.companionId, files: REQUIRED }, null, 2) + '\n');
      this.runtime.fileEffect = true; docs = this.documents(target);
    }
    check(REQUIRED.every(name => existsSync(join(directory, name))), 'Managed workspace is incomplete');
    const previous = store.get<Binding>('workspace-binding', 'current');
    if (previous?.phase === 'ready' && previous.target.id === target.id && previous.target.path === target.path && canonical(previous.hashes) === canonical(docs.hashes)) return;
    const binding: Binding = { revision: (previous?.revision ?? 0) + 1, target, phase: 'ready', hashes: docs.hashes, initializedAt: previous?.initializedAt ?? now() };
    store.put('workspace-binding', 'current', binding); this.adopt(docs);
  }
  private adopt(docs: Documents): void {
    const store = this.runtime.store, identity = store.require<CompanionIdentity>('identity', 'current');
    if (identity.displayName !== docs.identity.displayName || identity.character !== docs.identity.character)
      store.put('identity', 'current', { ...identity, ...docs.identity, revision: identity.revision + 1 });
    const policy = this.runtime.policy();
    if (policy.quiet !== docs.config.quiet) store.put('policy', 'current', { ...policy, quiet: docs.config.quiet, revision: policy.revision + 1 });
    const prefs = preferences(this.runtime);
    if (canonical(prefs.conversation) !== canonical(docs.config.conversation))
      store.put('preferences', 'current', { ...prefs, conversation: docs.config.conversation, revision: prefs.revision + 1 });
    const user = store.get<{ revision: number; text: string }>('profile', 'current');
    if (user?.text !== docs.user) store.put('profile', 'current', { revision: (user?.revision ?? 0) + 1, text: docs.user });
  }
  synchronize(operation: string): void {
    if (['workspace.initialize', 'workspace.inspect', 'cancelActivity', 'execution.interrupt', 'execution.inspect', 'reportDelivery'].includes(operation) || operation.startsWith('maintenance.')) return;
    const binding = this.binding(); if (!binding) return;
    const docs = this.documents(binding.target);
    if (canonical(docs.hashes) !== canonical(binding.hashes)) this.runtime.store.transaction(() => {
      this.adopt(docs); this.runtime.store.put('workspace-binding', 'current', { ...binding, revision: binding.revision + 1, hashes: docs.hashes });
    });
  }
  private replace(binding: Binding, name: string, value: string): void {
    const directory = this.directory(binding.target), docs = this.documents(binding.target);
    if (canonical(docs.hashes) !== canonical(binding.hashes)) reject('STALE_REVISION', 'Workspace files changed; refresh settings');
    this.atomic(directory, name, value); this.runtime.fileEffect = true;
    binding.hashes = { ...binding.hashes, [name]: bytesDigest(Buffer.from(value)) }; binding.revision++;
    this.runtime.store.put('workspace-binding', 'current', binding);
  }
  write(kind: 'identity' | 'policy' | 'preferences', value: CompanionIdentity | AttentionPolicy | CorePreferences): void {
    const binding = this.binding(); if (!binding) return;
    if (kind === 'identity') { this.replace(binding, 'SOUL.md', this.soul(value as CompanionIdentity)); return; }
    if (kind === 'preferences' && ((value as CorePreferences).workspace?.id !== binding.target.id || (value as CorePreferences).workspace?.path !== binding.target.path)) return;
    const docs = this.documents(binding.target);
    const config = { ...docs.config, ...(kind === 'policy' ? { quiet: (value as AttentionPolicy).quiet } : { conversation: (value as CorePreferences).conversation }) };
    this.replace(binding, 'core.json', JSON.stringify(config, null, 2) + '\n');
  }
  status(): WorkspaceStatus {
    const target = preferences(this.runtime).workspace, binding = this.binding();
    if (!target) return { state: 'unbound', revision: null, target: null, files: [], error: null, sourceRevision: null };
    if (!binding) return { state: 'pending', revision: null, target, files: [], error: null, sourceRevision: null };
    try {
      const docs = this.documents(target);
      return { state: 'ready', revision: binding.revision, target, files: REQUIRED, error: null, sourceRevision: bytesDigest(Buffer.from(canonical(docs.hashes))) };
    } catch { return { state: 'unavailable', revision: binding.revision, target, files: REQUIRED, error: 'Managed workspace files cannot be loaded; inspect the files and binding', sourceRevision: null }; }
  }
}
