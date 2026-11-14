import { constants, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { EmotionFile } from '../emotion/state.js';
import { defaultLifePreferences, parseLifePreferences } from '../life/library.js';
import { check } from './storage.js';
const DIRECTORIES = ['data', 'data/core', 'data/core/native-sessions', 'data/memory', 'data/emotion',
    'data/pet-platform', 'data/desktop', 'data/desktop/images', 'data/behavior', 'data/channels',
    'data/life', 'data/life/activity', 'data/life/life'];
const load = createRequire(import.meta.url);
const petConfig = load(join(dirname(load.resolve('dsh-Chatpet/package.json')), 'vendor/dsh-pet/platform/runtime.mjs'));
/** Technical containers only. Optional services are neither opened nor enabled. */
function containers(root) {
    check(realpathSync(root) === root, 'Workspace root changed');
    const managed = join(root, '.chatpet');
    for (const name of ['', ...DIRECTORIES]) {
        const directory = join(managed, name);
        const stat = lstatSync(directory, { throwIfNoEntry: false });
        check(!stat || stat.isDirectory() && !stat.isSymbolicLink(), 'Initialization directory is not local to the Repo');
        if (!stat)
            mkdirSync(directory, { mode: 0o700 });
    }
}
function regular(file) {
    const stat = lstatSync(file, { throwIfNoEntry: false });
    check(!stat || stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Initialization file is not a regular local file');
    return stat;
}
function createEmpty(file, value) {
    if (regular(file))
        return;
    const fd = openSync(file, 'wx', 0o600);
    try {
        writeFileSync(fd, JSON.stringify(value, null, 2) + '\n');
        fsyncSync(fd);
    }
    finally {
        closeSync(fd);
    }
}
export function inspectCompanionFiles(root) {
    const managed = join(root, '.chatpet');
    const pet = existsSync(join(managed, 'data/pet-platform/main-config.jsonc'))
        ? 'data/pet-platform/main-config.jsonc' : 'data/pet-platform/main-config.json';
    return [...DIRECTORIES.map(name => name + '/'), pet, 'data/life/control.json', 'data/emotion/state.json'];
}
/** Read-only validation used by readiness checks; it never repairs a bad file. */
export function validateCompanionConfiguration(root) {
    const managed = join(root, '.chatpet');
    const primary = join(managed, 'data/pet-platform/main-config.jsonc');
    const file = existsSync(primary) ? primary : join(managed, 'data/pet-platform/main-config.json');
    regular(file);
    const pet = petConfig.readJsonc(file);
    check(pet !== null && typeof pet === 'object' && !Array.isArray(pet), 'Invalid Pet configuration; original retained');
    const control = join(managed, 'data/life/control.json');
    regular(control);
    const fd = openSync(control, constants.O_RDONLY | constants.O_NOFOLLOW);
    let content;
    try {
        content = JSON.parse(readFileSync(fd, 'utf8'));
    }
    finally {
        closeSync(fd);
    }
    check(content !== null && typeof content === 'object' && !Array.isArray(content), 'Invalid Life control file');
    const saved = content;
    check(saved.version === 1 && typeof saved.enabled === 'boolean', 'Invalid Life control state');
    if (saved.preferences !== undefined)
        parseLifePreferences(saved.preferences);
}
export function initializeCompanionFiles(root, identity, legacyEmotion) {
    containers(root);
    const managed = join(root, '.chatpet');
    const petFile = join(managed, 'data/pet-platform/main-config.jsonc');
    const legacyPet = join(managed, 'data/pet-platform/main-config.json');
    regular(petFile);
    regular(legacyPet);
    if (!existsSync(petFile) && !existsSync(legacyPet))
        createEmpty(petFile, { pets: [] });
    const control = join(managed, 'data/life/control.json');
    createEmpty(control, { version: 1, enabled: false, preferences: { ...defaultLifePreferences } });
    validateCompanionConfiguration(root);
    // Emotion owns its format and legacy import. A null state is valid, not a mood.
    new EmotionFile({ path: root, ...identity }, legacyEmotion).initialize();
}
//# sourceMappingURL=initialization.js.map