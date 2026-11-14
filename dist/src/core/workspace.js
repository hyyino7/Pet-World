import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, isAbsolute, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { preferences } from './preferences.js';
import { EMPTY_COMPANION_CONFIGURATION, parseCompanionConfiguration, resolveCompanionSettings } from './companion-settings.js';
import { companionRecordPaths, initializeCompanionRecords } from './record-paths.js';
import { initializeCompanionFiles, inspectCompanionFiles, validateCompanionConfiguration } from './initialization.js';
import { memoryDirectory } from '../memory/client.js';
import { conversationOptions } from './options.js';
import { bytesDigest, canonical, check, reject, revision, now } from './storage.js';
const BASE_REQUIRED = ['README.md', 'manifest.json', 'SOUL.md', 'USER.md', 'core.json'];
const REQUIRED = [...BASE_REQUIRED, 'COMPANION.md'];
const LEGACY_FILES = [...BASE_REQUIRED, 'STATE.md'];
const WORKSPACE_INSTRUCTIONS = `# Companion workspace

The companion documents are under .chatpet/. SOUL.md owns the configured name
and role; USER.md contains owner-provided information; COMPANION.md contains
optional interaction guidance. Blank documents are intentional and supply no
replacement persona. Self-description, its history and diaries belong to Core
and remain available without autonomous Life. Their selected paths are declared
in .chatpet/manifest.json, including compatible existing record locations.

core.json contains saved choices. Module databases and runtime data under data/
are storage, not documents to paste into a prompt. DSH owns native execution,
permissions and original sessions. Use registered memory capabilities for Bank
operations; do not create a parallel MEMORY.md or revive STATE.md. Preserve
existing workspace files and instructions.
`;
const MAX_BYTES = 64 * 1024;
/** Core-owned repository authority; module runtime data has its own writers. */
export class CoreWorkspace {
    runtime;
    port;
    initializers = new Map();
    constructor(runtime) {
        this.runtime = runtime;
        this.port = {
            inspect: runtime.call('workspace.inspect', false, () => this.status()),
            initialize: runtime.call('workspace.initialize', true, input => {
                const prefs = preferences(runtime);
                revision(prefs.revision, input.expectedPreferencesRevision);
                check(prefs.workspace !== null, 'Choose a workspace first');
                this.initialize(prefs.workspace);
                return this.status();
            }),
            saveCompanion: runtime.call('workspace.saveCompanion', true, input => {
                const binding = this.binding();
                if (!binding || binding.target.id !== input.workspaceId)
                    reject('STALE_BINDING', 'Workspace binding changed');
                const settings = parseCompanionConfiguration(input.settings);
                const docs = this.documents(binding.target);
                if (canonical(input.expectedSettings) !== canonical(docs.config.companion ?? EMPTY_COMPANION_CONFIGURATION))
                    reject('STALE_REVISION', 'Companion settings changed');
                this.replace(binding, 'core.json', JSON.stringify({ ...docs.config, companion: settings }, null, 2) + '\n');
                return settings;
            }),
            readProfile: runtime.call('workspace.readProfile', false, () => runtime.store.get('profile', 'current') ?? { revision: 1, text: '' }),
            saveProfile: runtime.call('workspace.saveProfile', true, input => {
                this.assertEditScope(input.expectedScope);
                check(typeof input.text === 'string' && Buffer.byteLength(input.text) <= MAX_BYTES, 'Invalid user profile');
                const current = runtime.store.get('profile', 'current') ?? { revision: 1, text: '' };
                revision(current.revision, input.expectedRevision);
                const binding = this.binding();
                check(binding !== null, 'Initialize the workspace first');
                this.replace(binding, 'USER.md', input.text);
                const value = { revision: current.revision + 1, text: input.text };
                runtime.store.put('profile', 'current', value);
                return value;
            }),
            readFoundation: runtime.call('workspace.readFoundation', false, () => this.foundation()),
            saveFoundation: runtime.call('workspace.saveFoundation', true, input => {
                const current = this.foundation(), binding = this.binding();
                if (!binding || binding.target.id !== input.workspaceId)
                    reject('STALE_BINDING', 'Workspace binding changed');
                if (current.revision !== input.expectedRevision)
                    reject('STALE_REVISION', 'Foundation changed; refresh before saving');
                check(typeof input.text === 'string', 'Invalid companion foundation');
                check(Buffer.byteLength(input.text) <= MAX_BYTES, 'Companion foundation is too large');
                this.atomic(this.directory(binding.target), 'COMPANION.md', input.text);
                this.runtime.fileEffect = true;
                return this.foundation();
            }),
        };
    }
    /** Captured by the editor, then checked inside the original synchronous
     * configuration mutation. No new binding generation or durable state. */
    editScope() {
        const prefs = preferences(this.runtime);
        return { preferencesRevision: prefs.revision, workspaceId: prefs.workspace?.id ?? null,
            storageId: prefs.workspace ? this.storageId() : null };
    }
    assertEditScope(expected) {
        check(expected && typeof expected === 'object' && !Array.isArray(expected)
            && Object.keys(expected).length === 3 && Number.isSafeInteger(expected.preferencesRevision) && expected.preferencesRevision > 0
            && (expected.workspaceId === null || typeof expected.workspaceId === 'string' && expected.workspaceId.length > 0)
            && (expected.storageId === null || typeof expected.storageId === 'string' && expected.storageId.length > 0), 'Invalid workspace editor scope');
        if (canonical(expected) !== canonical(this.editScope()))
            reject('STALE_BINDING', 'Workspace editor binding changed; refresh before saving');
    }
    binding() {
        const binding = this.runtime.store.get('workspace-binding', 'current');
        const target = preferences(this.runtime).workspace;
        return binding?.phase === 'ready' && target?.id === binding.target.id && target.path === binding.target.path ? binding : null;
    }
    directory(target) {
        check(realpathSync(target.path) === target.path && lstatSync(target.path).isDirectory(), 'Workspace root changed');
        const directory = join(target.path, '.chatpet');
        const stat = lstatSync(directory, { throwIfNoEntry: false });
        if (stat)
            check(stat.isDirectory() && !stat.isSymbolicLink(), 'Managed directory must not be a symlink');
        return directory;
    }
    read(directory, name) {
        check(REQUIRED.includes(name) || name === '.initialization-pending.json', 'Unknown managed file');
        const fd = openSync(join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
            const before = fstatSync(fd);
            check(before.isFile() && before.size <= MAX_BYTES, 'Managed file is not a bounded regular file');
            const bytes = readFileSync(fd);
            const after = fstatSync(fd);
            check(before.size === after.size && before.mtimeMs === after.mtimeMs && bytes.length === after.size, 'Managed file changed while reading');
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        }
        finally {
            closeSync(fd);
        }
    }
    atomic(directory, name, value) {
        check(Buffer.byteLength(value) <= MAX_BYTES, 'Managed file exceeds size limit');
        const file = join(directory, name);
        if (existsSync(file))
            check(lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink(), 'Refusing to replace a non-regular managed file');
        const temporary = join(directory, `.${name}.${randomUUID()}.tmp`);
        const fd = openSync(temporary, 'wx', 0o600);
        try {
            writeFileSync(fd, value);
            fsyncSync(fd);
        }
        finally {
            closeSync(fd);
        }
        try {
            renameSync(temporary, file);
            const dir = openSync(directory, 'r');
            try {
                fsyncSync(dir);
            }
            finally {
                closeSync(dir);
            }
        }
        finally {
            if (existsSync(temporary))
                rmSync(temporary);
        }
    }
    soul(identity) {
        check(typeof identity.displayName === 'string' && identity.displayName.length <= 256 && !/[\r\n]/.test(identity.displayName), 'Role name must be one line');
        check(typeof identity.character === 'string' && identity.character.length <= MAX_BYTES - 1024, 'Invalid role text');
        return `# ${identity.displayName}\n\n${identity.character}`;
    }
    documents(target) {
        const directory = this.directory(target);
        const manifestText = this.read(directory, 'manifest.json');
        const manifest = JSON.parse(manifestText);
        check(manifest.companionId === this.runtime.config.companionId, 'Workspace belongs to a different companion');
        check(Array.isArray(manifest.files) && (manifest.schemaVersion === 3 && REQUIRED.every(name => manifest.files.includes(name))
            && manifest.files.every(name => typeof name === 'string' && name.length > 0 && !isAbsolute(name) && !name.split(/[\\/]/).includes('..'))
            || manifest.schemaVersion === 2 && canonical(manifest.files) === canonical(BASE_REQUIRED)
            || manifest.schemaVersion === 1 && canonical(manifest.files) === canonical(LEGACY_FILES)), 'Unexpected managed format or file declaration');
        const soul = this.read(directory, 'SOUL.md');
        const match = soul.trim() === '' ? ['', '', ''] : /^# ([^\r\n]*)\r?\n\r?\n([\s\S]*)$/.exec(soul);
        check(match, 'SOUL.md requires a role heading, a blank line and character text');
        const identity = { displayName: match[1], character: match[2] };
        this.soul(identity);
        const user = this.read(directory, 'USER.md');
        const configText = this.read(directory, 'core.json');
        const raw = JSON.parse(configText);
        check(raw.schemaVersion === 1 && (raw.quiet === null || typeof raw.quiet === 'boolean') && Object.keys(raw).every(key => ['conversation', 'quiet', 'schemaVersion', 'companion'].includes(key)), 'Invalid core.json');
        const conversation = raw.conversation === null ? null : conversationOptions(raw.conversation);
        check(raw.conversation === null || raw.conversation && canonical(Object.keys(raw.conversation).filter(key => key !== 'maxHistoryMessages').sort()) === canonical(Object.keys(conversation).sort()), 'Invalid conversation configuration');
        return { identity, user, config: { schemaVersion: 1, quiet: raw.quiet, conversation, ...(Object.hasOwn(raw, 'companion') ? { companion: parseCompanionConfiguration(raw.companion) } : {}) }, hashes: {
                'manifest.json': bytesDigest(Buffer.from(manifestText)), 'SOUL.md': bytesDigest(Buffer.from(soul)),
                'USER.md': bytesDigest(Buffer.from(user)), 'core.json': bytesDigest(Buffer.from(configText)),
            } };
    }
    storageId() {
        const target = preferences(this.runtime).workspace;
        check(target, 'A bound workspace is required');
        const local = relative(target.path, this.runtime.store.directory);
        const owns = !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep);
        return owns ? this.runtime.store.meta('workspace.storage-id') ?? target.id : target.id;
    }
    /** Module-owned synchronous schema preparation, never a service start. */
    registerInitializer(id, run, files = []) {
        check(!this.initializers.has(id), 'Workspace initializer already registered');
        if (typeof files !== 'function')
            this.validateInventory(files);
        this.initializers.set(id, { run, files });
        return () => { this.initializers.delete(id); };
    }
    validateInventory(files) {
        check(Array.isArray(files) && files.every(name => typeof name === 'string' && name.length > 0 && !isAbsolute(name)
            && !name.split(/[\\/]/).includes('..')), 'Invalid initializer inventory');
    }
    inventory(target) {
        const root = this.directory(target), paths = companionRecordPaths(target.path);
        const local = (path) => relative(root, path).split(sep).join('/');
        const manifest = JSON.parse(this.read(root, 'manifest.json'));
        // Document readiness permits the one existing bootstrap Core to remain
        // outside the Repo until stopped/offline relocation. Never advertise a
        // second database, or forget a previously declared portable authority.
        const core = this.runtime.store.directory === join(root, 'data', 'core') || manifest.files.includes('data/core/core.sqlite');
        return [...new Set([...REQUIRED, local(paths.selfFile), local(paths.diaryDir) + '/', local(paths.historyDir) + '/',
                local(join(paths.photoDirectory, 'photos', 'album.sqlite')), ...inspectCompanionFiles(target.path),
                ...(core ? ['data/core/core.sqlite'] : []),
                ...[...this.initializers.values()].flatMap(entry => {
                    const files = typeof entry.files === 'function' ? entry.files(target) : entry.files;
                    this.validateInventory(files);
                    return [...files];
                })])];
    }
    verifyInventory(target) {
        const directory = this.directory(target);
        const manifest = JSON.parse(this.read(directory, 'manifest.json'));
        const files = [...new Set([...manifest.files, ...this.inventory(target)])];
        this.validateInventory(files);
        const inspected = new Set();
        for (const name of files) {
            const components = name.split('/').filter(Boolean);
            let path = directory;
            for (let index = 0; index < components.length; index++) {
                path = join(path, components[index]);
                if (inspected.has(path))
                    continue;
                const stat = lstatSync(path, { throwIfNoEntry: false });
                const folder = index < components.length - 1 || name.endsWith('/');
                check(stat && !stat.isSymbolicLink() && (folder ? stat.isDirectory() : stat.isFile() && stat.nlink === 1), 'Managed workspace is incomplete');
                if (!folder && /\.(?:sqlite|db)$/.test(name))
                    check(stat.size > 0, 'Managed database has no schema');
                inspected.add(path);
            }
        }
        validateCompanionConfiguration(target.path);
        return files;
    }
    initialize(target) {
        const directory = this.directory(target), store = this.runtime.store;
        const identity = store.require('identity', 'current');
        const previous = store.get('workspace-binding', 'current');
        const config = { schemaVersion: 1, quiet: null, conversation: null, companion: { ...EMPTY_COMPANION_CONFIGURATION } };
        if (!existsSync(directory)) {
            mkdirSync(directory, { mode: 0o700 });
            this.runtime.fileEffect = true;
        }
        const manifestFile = join(directory, 'manifest.json');
        if (existsSync(manifestFile)) {
            const manifest = JSON.parse(this.read(directory, 'manifest.json'));
            check(manifest.companionId === identity.companionId, 'Workspace belongs to a different companion');
            check([1, 2, 3].includes(manifest.schemaVersion), 'Unexpected managed format');
        }
        else {
            const known = previous?.target.id === target.id && previous.target.path === target.path;
            check(known || !BASE_REQUIRED.some(name => name !== 'manifest.json' && existsSync(join(directory, name))), 'Managed documents have no identity manifest; preserve and reconcile them before initialization');
            this.atomic(directory, 'manifest.json', JSON.stringify({ schemaVersion: 3, companionId: identity.companionId, files: REQUIRED }, null, 2) + '\n');
            this.runtime.fileEffect = true;
        }
        // Files survive a database rollback. Keep an explicit incomplete marker so
        // a failed schema initializer can never leave the previous binding ready.
        const pending = join(directory, '.initialization-pending.json');
        if (existsSync(pending)) {
            const marker = JSON.parse(this.read(directory, '.initialization-pending.json'));
            check(marker.companionId === identity.companionId, 'Initialization belongs to a different companion');
        }
        else
            this.atomic(directory, '.initialization-pending.json', JSON.stringify({ companionId: identity.companionId }) + '\n');
        this.runtime.fileEffect = true;
        const initialDocuments = {
            'README.md': '# Companion workspace\n\nSOUL.md contains the configured role, USER.md the owner profile, and COMPANION.md optional guidance.\nCore owns self-description and diaries; their canonical paths are listed in manifest.json.\ncore.json preserves saved choices; null means unconfigured. Module-owned storage lives under data/.\nDSH owns accounts, permissions and original sessions; portable full log copies live in data/core/native-sessions/.\nEmpty personal content is valid. Initialization never creates experiences or starts autonomous Life.\n',
            'SOUL.md': this.soul(identity), 'USER.md': store.get('profile', 'current')?.text ?? '',
            'COMPANION.md': '', 'core.json': JSON.stringify(config, null, 2) + '\n',
        };
        for (const [name, value] of Object.entries(initialDocuments))
            if (!existsSync(join(directory, name))) {
                this.atomic(directory, name, value);
                this.runtime.fileEffect = true;
            }
        // Validate saved content before any module schema or compatibility work.
        let docs = this.documents(target);
        const local = relative(target.path, this.runtime.store.directory);
        if (!isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep) && !store.meta('workspace.storage-id')) {
            const owner = store.meta('memory-configured-directory-owner');
            store.setMeta('workspace.storage-id', owner?.id ?? previous?.target.id ?? target.id);
        }
        const binding = { revision: (previous?.revision ?? 0) + 1, target, phase: 'ready', hashes: docs.hashes,
            initializedAt: previous?.initializedAt ?? now() };
        store.put('workspace-binding', 'current', binding);
        try {
            initializeCompanionFiles(target.path, { companionId: identity.companionId, scopeId: this.runtime.config.scopeId,
                storageId: this.storageId() }, () => store.get('emotion-state', this.storageId()));
            initializeCompanionRecords(target.path);
            for (const entry of this.initializers.values())
                entry.run(target);
            const manifest = { schemaVersion: 3, companionId: identity.companionId, files: this.inventory(target) };
            const content = JSON.stringify(manifest, null, 2) + '\n';
            if (this.read(directory, 'manifest.json') !== content) {
                this.atomic(directory, 'manifest.json', content);
                this.runtime.fileEffect = true;
            }
            // Existing root instructions are retained; fresh ones are minimal navigation.
            let instructions;
            try {
                instructions = openSync(join(target.path, 'AGENTS.md'), 'wx', 0o600);
            }
            catch (error) {
                if (error.code !== 'EEXIST')
                    throw error;
            }
            if (instructions !== undefined) {
                try {
                    writeFileSync(instructions, WORKSPACE_INSTRUCTIONS);
                    fsyncSync(instructions);
                }
                finally {
                    closeSync(instructions);
                }
                this.runtime.fileEffect = true;
            }
            docs = this.documents(target);
            binding.hashes = docs.hashes;
            this.verifyInventory(target);
            store.put('workspace-binding', 'current', binding);
            this.adopt(docs);
            rmSync(pending);
        }
        catch (error) {
            // Files are not transactional. A retry fills the same inventory, never resets it.
            store.put('workspace-binding', 'current', { ...binding, phase: 'inactive' });
            throw error;
        }
    }
    adopt(docs) {
        const store = this.runtime.store, identity = store.require('identity', 'current');
        if (identity.displayName !== docs.identity.displayName || identity.character !== docs.identity.character)
            store.put('identity', 'current', { ...identity, ...docs.identity, revision: identity.revision + 1 });
        const policy = this.runtime.policy();
        if (docs.config.quiet !== null && policy.quiet !== docs.config.quiet)
            store.put('policy', 'current', { ...policy, quiet: docs.config.quiet, revision: policy.revision + 1 });
        const prefs = preferences(this.runtime);
        if (docs.config.conversation !== null && canonical(prefs.conversation) !== canonical(docs.config.conversation))
            store.put('preferences', 'current', { ...prefs, conversation: docs.config.conversation, revision: prefs.revision + 1 });
        const user = store.get('profile', 'current');
        if (user?.text !== docs.user)
            store.put('profile', 'current', { revision: (user?.revision ?? 0) + 1, text: docs.user });
    }
    synchronize(operation) {
        if (['workspace.initialize', 'workspace.inspect'].includes(operation))
            return;
        if (operation === 'reviseIdentity') {
            const target = preferences(this.runtime).workspace;
            // An absent managed directory permits local role setup. An existing but
            // invalid directory/document must still fail instead of pretending to save.
            if (target && !lstatSync(this.directory(target), { throwIfNoEntry: false }))
                return;
        }
        // The control plane must stay available when the Repo or its managed
        // documents disappear. Cached identity/policy are configuration metadata,
        // not permission to inject context or recreate the missing files.
        if (['preferences.read', 'preferences.save', 'getIdentity', 'getPolicy', 'listCapabilities', 'workspace.readProfile'].includes(operation)
            && this.status().state !== 'ready')
            return;
        const binding = this.binding();
        if (!binding)
            return;
        const docs = this.documents(binding.target);
        if (canonical(docs.hashes) !== canonical(binding.hashes))
            this.runtime.store.transaction(() => {
                this.adopt(docs);
                this.runtime.store.put('workspace-binding', 'current', { ...binding, revision: binding.revision + 1, hashes: docs.hashes });
            });
    }
    replace(binding, name, value) {
        const directory = this.directory(binding.target), docs = this.documents(binding.target);
        if (canonical(docs.hashes) !== canonical(binding.hashes))
            reject('STALE_REVISION', 'Workspace files changed; refresh settings');
        this.atomic(directory, name, value);
        this.runtime.fileEffect = true;
        binding.hashes = { ...binding.hashes, [name]: bytesDigest(Buffer.from(value)) };
        binding.revision++;
        this.runtime.store.put('workspace-binding', 'current', binding);
    }
    write(kind, value) {
        const binding = this.binding();
        if (!binding)
            return;
        if (kind === 'identity') {
            if (!lstatSync(this.directory(binding.target), { throwIfNoEntry: false }))
                return;
            this.replace(binding, 'SOUL.md', this.soul(value));
            return;
        }
        if (kind === 'preferences' && (value.workspace?.id !== binding.target.id || value.workspace?.path !== binding.target.path))
            return;
        // Saving/rebinding host preferences is still possible before explicit
        // initialization; it must not restore a missing Repo as a side effect.
        if (kind === 'preferences' && this.status().state !== 'ready')
            return;
        const docs = this.documents(binding.target);
        const config = { ...docs.config, ...(kind === 'policy' ? { quiet: value.quiet } : { conversation: value.conversation }) };
        this.replace(binding, 'core.json', JSON.stringify(config, null, 2) + '\n');
    }
    /** One workspace membership check shared by native Core, Memory, Emotion and Desktop. */
    sessionStatus(session, registry) {
        if (session.header.parentSession || session.header.origin === 'subagent' || session.header.agentPreset === 'chatpet-channel-guest')
            return null;
        const target = preferences(this.runtime).workspace;
        if (!target || (session.header.cwd && session.header.cwd !== target.path))
            return null;
        const native = registry?.get(target.id);
        if (native?.path !== target.path || !native.sessionIds.includes(session.id))
            return null;
        return this.status();
    }
    companionConfiguration() {
        const binding = this.binding();
        check(binding, 'Initialize the workspace first');
        return this.documents(binding.target).config.companion ?? { ...EMPTY_COMPANION_CONFIGURATION };
    }
    companionSettings() {
        return resolveCompanionSettings(this.companionConfiguration());
    }
    /** Inspect actual storage, independently of document/binding readiness. Never
     * move a live database or make a configured fallback look already migrated. */
    storageStatus() {
        const target = preferences(this.runtime).workspace;
        const expectedCore = target ? join(target.path, '.chatpet', 'data', 'core') : null;
        const core = { current: this.runtime.store.directory, expected: expectedCore,
            ready: Boolean(expectedCore && this.runtime.store.directory === expectedCore && this.runtime.store.persisted()) };
        const config = this.runtime.config.memory;
        const owner = this.runtime.store.meta('memory-configured-directory-owner');
        const currentMemory = config && target ? memoryDirectory(config, target.path, !owner || owner.id === this.storageId()) : null;
        const expectedMemory = target ? join(target.path, '.chatpet', 'data', 'memory') : null;
        const memoryLocal = currentMemory && target ? relative(target.path, currentMemory) : null;
        const memory = config ? { configured: config.dataDir, current: currentMemory, expected: expectedMemory,
            ready: Boolean(currentMemory && memoryLocal && !isAbsolute(memoryLocal) && memoryLocal !== '..' && !memoryLocal.startsWith('..' + sep)
                && config.dataDir === currentMemory && existsSync(join(currentMemory, 'data', 'memory.db'))) } : null;
        const configuredCwd = this.runtime.config.cwd ?? null;
        const workingDirectory = { configured: configuredCwd, expected: target?.path ?? null,
            ready: Boolean(target && (!configuredCwd || configuredCwd === target.path)) };
        const runtime = config ? { python: config.python, directory: config.runtimeRoot ?? null, ready: false } : null;
        if (runtime?.directory) {
            try {
                const root = realpathSync(runtime.directory), python = realpathSync(runtime.python), local = relative(root, python);
                const receipt = JSON.parse(readFileSync(join(root, 'runtime.json'), 'utf8'));
                const inRepo = target ? relative(target.path, root) : null;
                runtime.ready = receipt.state === 'ready' && receipt.python === runtime.python && Boolean(local)
                    && !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep)
                    && Boolean(!target || inRepo && (isAbsolute(inRepo) || inRepo === '..' || inRepo.startsWith('..' + sep)));
            }
            catch { /* Device setup remains incomplete; settings must still open. */ }
        }
        return { complete: core.ready && (!memory || memory.ready) && (!runtime || runtime.ready) && workingDirectory.ready,
            core, memory, workingDirectory, runtime };
    }
    /** Reading never creates files or substitutes a bundled personality. */
    foundation() {
        const binding = this.binding();
        check(binding && this.status().state === 'ready', 'Initialize the workspace first');
        const path = join(this.directory(binding.target), 'COMPANION.md');
        const stat = lstatSync(path, { throwIfNoEntry: false });
        if (!stat)
            return { text: '', revision: bytesDigest(Buffer.from('')), source: 'empty', path };
        check(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size <= MAX_BYTES, 'Companion foundation is not a bounded regular file');
        const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
            const before = fstatSync(fd), data = readFileSync(fd), after = fstatSync(fd);
            check(before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs && data.length <= MAX_BYTES, 'Companion foundation changed while reading');
            const value = new TextDecoder('utf-8', { fatal: true }).decode(data);
            return { text: value, revision: bytesDigest(data), source: value.trim() ? 'owner' : 'empty', path };
        }
        finally {
            closeSync(fd);
        }
    }
    status() {
        const target = preferences(this.runtime).workspace, binding = this.binding();
        if (!target)
            return { state: 'unbound', revision: null, target: null, files: [], error: null, sourceRevision: null };
        if (!binding)
            return { state: 'pending', revision: null, target, files: [], error: null, sourceRevision: null };
        try {
            if (!this.runtime.store.persisted())
                return { state: 'pending', revision: binding.revision, target, files: [], error: 'Core database is absent or moved; initialize explicitly to persist the current companion', sourceRevision: null };
            const directory = this.directory(target);
            if (!existsSync(directory))
                return { state: 'pending', revision: binding.revision, target, files: [], error: 'Managed companion files are absent; initialize explicitly to prepare this workspace', sourceRevision: null };
            if (existsSync(join(directory, '.initialization-pending.json')))
                return { state: 'pending', revision: binding.revision, target, files: [], error: 'Initialization is incomplete; retry to prepare the same workspace', sourceRevision: null };
            const docs = this.documents(target);
            const manifest = JSON.parse(this.read(directory, 'manifest.json'));
            const files = manifest.schemaVersion === 3 ? this.verifyInventory(target) : [...BASE_REQUIRED];
            return { state: 'ready', revision: binding.revision, target, files, error: null, sourceRevision: bytesDigest(Buffer.from(canonical(docs.hashes))) };
        }
        catch {
            return { state: 'unavailable', revision: binding.revision, target, files: REQUIRED, error: 'Managed workspace files cannot be loaded; inspect the files and binding', sourceRevision: null };
        }
    }
}
//# sourceMappingURL=workspace.js.map