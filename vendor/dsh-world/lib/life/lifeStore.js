import { constants, closeSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { formatLocalTime } from "../timeContext.js";
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const dayFile = /^\d{4}-\d{2}-\d{2}\.jsonl$/;
const renameAttempts = 10;
const transientRename = new Set(['EPERM', 'EBUSY', 'EACCES']);
// Core's recorded-home reader has the same technical storage boundary. Reject
// before creating a temporary file; never publish a state Core cannot reopen.
export const LIFE_STATE_MAX_BYTES = 64 * 1024;
// Every factory for the same Life file participates in the same synchronous
// read/merge/write boundary. A runtime may retain its read object for its whole
// lifetime; its writes must not replace newer module-owned fields.
const stateBaselines = new WeakMap();
const encodedFields = state => new Map(Object.keys(state).map(key => [key, JSON.stringify(state[key])]));
function syncState(target, value) {
    for (const key of Object.keys(target)) if (!Object.hasOwn(value, key)) delete target[key];
    for (const key of Object.keys(value)) {
        if (JSON.stringify(target[key]) !== JSON.stringify(value[key])) target[key] = value[key];
    }
    return target;
}
function sleepSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
const sameInode = (left, right) => left.dev === right.dev && left.ino === right.ino;
function regularFile(file) {
    const stat = lstatSync(file, { throwIfNoEntry: false });
    if (stat && (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1))
        throw new Error(`dsh-world: unsafe non-regular or linked Life file: ${file}; original retained`);
    return stat;
}
function descriptor(file, fd, expected) {
    const stat = fstatSync(fd), current = regularFile(file);
    if (!stat.isFile() || stat.nlink !== 1 || !current || !sameInode(stat, current) || expected && !sameInode(stat, expected))
        throw new Error(`dsh-world: Life file changed while opening: ${file}; original retained`);
    return stat;
}
function directory(path, create = false, expected) {
    let stat = lstatSync(path, { throwIfNoEntry: false });
    if (!stat && create) {
        mkdirSync(path, { recursive: true, mode: 0o700 });
        stat = lstatSync(path);
    }
    if (!stat || !stat.isDirectory() || stat.isSymbolicLink() || expected && !sameInode(stat, expected))
        throw new Error(`dsh-world: unsafe or changed Life directory: ${path}; original retained`);
    return stat;
}
function readRegular(file) {
    const before = regularFile(file);
    if (!before) return;
    const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        descriptor(file, fd, before);
        const text = readFileSync(fd, 'utf8');
        descriptor(file, fd, before);
        return text;
    }
    finally { closeSync(fd); }
}
/** Exported for tests only (injectable rename). On Windows a reader, indexer or antivirus can briefly lock the target, so a rename that fails with EPERM/EBUSY/EACCES is retried with a short backoff. */
export function durableWrite(file, text, rename = renameSync) {
    directory(dirname(file));
    regularFile(file);
    // Exclusively own a new inode. A leftover predictable temp is neither used
    // nor removed, including when it is a dangling link or another writer's file.
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    let owned;
    try {
        const fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
        try {
            owned = descriptor(temporary, fd);
            writeFileSync(fd, text);
            fsyncSync(fd);
            descriptor(temporary, fd, owned);
        }
        finally { closeSync(fd); }
        for (let attempt = 1;; attempt++) {
            directory(dirname(file));
            const current = regularFile(temporary);
            if (!current || !sameInode(current, owned))
                throw new Error(`dsh-world: Life temporary file changed: ${temporary}; replacement retained`);
            regularFile(file);
            try {
                rename(temporary, file);
                owned = undefined;
                break;
            }
            catch (error) {
                if (attempt >= renameAttempts || !transientRename.has(error.code ?? '')) throw error;
                sleepSync(Math.min(100, 10 * 2 ** (attempt - 1)));
            }
        }
    }
    catch (error) {
        // A replacement at the same path is not ours to remove.
        const remaining = lstatSync(temporary, { throwIfNoEntry: false });
        if (owned && remaining?.isFile() && !remaining.isSymbolicLink() && remaining.nlink === 1 && sameInode(remaining, owned))
            rmSync(temporary);
        throw error;
    }
}
function append(file, value) {
    const before = regularFile(file);
    const flags = constants.O_RDWR | constants.O_APPEND | constants.O_NOFOLLOW;
    const fd = openSync(file, before ? flags : flags | constants.O_CREAT | constants.O_EXCL, 0o600);
    try {
        const size = descriptor(file, fd, before).size;
        const last = Buffer.alloc(1);
        const torn = size > 0 && readSync(fd, last, 0, 1, size - 1) === 1 && last[0] !== 10;
        descriptor(file, fd, before);
        writeFileSync(fd, `${torn ? '\n' : ''}${JSON.stringify(value)}\n`);
        fsyncSync(fd);
    }
    finally { closeSync(fd); }
}
/** Skips unparsable or non-object lines (a half-written tail or a damaged line). */
function readJsonl(file) {
    const text = readRegular(file);
    if (text === undefined) return [];
    return text.split('\n').filter(Boolean).flatMap(line => { try {
        const value = JSON.parse(line);
        return value && typeof value === 'object' ? [value] : [];
    }
    catch { return []; } });
}
export function createLifeStore(worldDir, timeZone) {
    const stateFile = join(worldDir, 'life.json');
    const lifeDir = join(worldDir, 'life');
    const activityDir = join(worldDir, 'activity');
    let activityGap = false;
    const rootIdentity = directory(worldDir, true);
    const lifeIdentity = directory(lifeDir, true), activityIdentity = directory(activityDir, true);
    let seenStateFile = Boolean(regularFile(stateFile));
    const rootCurrent = () => directory(worldDir, false, rootIdentity);
    const lifeCurrent = () => { rootCurrent(); directory(lifeDir, false, lifeIdentity); };
    const activityCurrent = () => { rootCurrent(); directory(activityDir, false, activityIdentity); };
    /** A life.json that is not JSON stops the life line (the console says why) and is left as it is. */
    function readFresh() {
        rootCurrent();
        const text = readRegular(stateFile);
        if (text === undefined) {
            if (seenStateFile) throw new Error(`dsh-world: ${stateFile} disappeared while Life was running; it was not recreated`);
            return { version: 1 };
        }
        try {
            seenStateFile = true;
            return JSON.parse(text);
        }
        catch (error) {
            throw new Error(`dsh-world: ${stateFile} is not valid JSON; it was left untouched`, { cause: error });
        }
    }
    function read() {
        const state = readFresh();
        stateBaselines.set(state, encodedFields(state));
        return state;
    }
    function merge(state, latest) {
        const baseline = stateBaselines.get(state);
        // An object returned by read has a known edit set, including deletions.
        // A new object is a patch; omitting a field never deletes it.
        for (const key of new Set([...Object.keys(state), ...(baseline?.keys() ?? [])])) {
            if (baseline && baseline.get(key) === JSON.stringify(state[key])) continue;
            if (Object.hasOwn(state, key)) latest[key] = state[key];
            else delete latest[key];
        }
        return latest;
    }
    function write(state) {
        const merged = merge(state, readFresh());
        const text = JSON.stringify(merged, null, 2);
        if (Buffer.byteLength(text, 'utf8') > LIFE_STATE_MAX_BYTES)
            throw new Error(`dsh-world: life.json exceeds its ${LIFE_STATE_MAX_BYTES}-byte storage limit; the previous file was retained`);
        durableWrite(stateFile, text);
        seenStateFile = true;
        syncState(state, merged);
        stateBaselines.set(state, encodedFields(merged));
    }
    function refresh(state) {
        const latest = readFresh(), baseline = encodedFields(latest);
        syncState(state, merge(state, latest));
        stateBaselines.set(state, baseline);
        return state;
    }
    function update(change) {
        const state = read();
        const result = change(state);
        if (result && typeof result.then === 'function') throw new TypeError('Life store updates must be synchronous');
        write(state);
        return state;
    }
    const localDay = (iso) => formatLocalTime(new Date(iso), timeZone).slice(0, 10);
    return {
        read,
        write, update, refresh,
        appendWake: (record) => { lifeCurrent(); append(join(lifeDir, 'wakes.jsonl'), record); },
        appendCompaction: (record) => { rootCurrent(); append(join(worldDir, 'compactions.jsonl'), record); },
        /** Never throws: a failed write is reported to the caller and marks the next record. The gap flag is in-memory and marks the next successful write, which may land in a later day's file. */
        appendActivity(record) {
            try {
                activityCurrent();
                append(join(activityDir, `${localDay(record.time)}.jsonl`), activityGap ? { ...record, gapBefore: true } : record);
                activityGap = false;
                return true;
            }
            catch {
                activityGap = true;
                return false;
            }
        },
        wakes: () => { lifeCurrent(); return readJsonl(join(lifeDir, 'wakes.jsonl')); },
        compactions: () => { rootCurrent(); return readJsonl(join(worldDir, 'compactions.jsonl')); },
        activity: (day) => { if (!dayPattern.test(day)) return []; activityCurrent(); return readJsonl(join(activityDir, `${day}.jsonl`)); },
        activityDays: () => {
            activityCurrent();
            return readdirSync(activityDir).filter(name => dayFile.test(name)).map(name => {
                regularFile(join(activityDir, name));
                return name.slice(0, 10);
            }).sort().reverse();
        },
    };
}
