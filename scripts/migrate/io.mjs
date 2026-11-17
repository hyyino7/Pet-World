import { MigrationError, requireMigration, checked } from './errors.mjs';
import { randomUUID, createHash } from 'node:crypto';
import { closeSync, fsyncSync, lstatSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const json = file => JSON.parse(readFileSync(file, 'utf8'));
export function regular(file) {
  const stat = lstatSync(file, {throwIfNoEntry:false});
  requireMigration(!stat || stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'symlink-or-hardlink');
  return stat;
}
export function inspectTree(path) {
  const stat = lstatSync(path, {throwIfNoEntry:false});
  if (!stat) return;
  requireMigration(!stat.isSymbolicLink(), 'symlink-or-hardlink');
  if (stat.isDirectory()) for (const name of readdirSync(path)) inspectTree(join(path, name));
  else regular(path);
}
export function atomicWrite(file, text) {
  regular(file);
  const stage = file + '.' + randomUUID() + '.tmp';
  try {
    const fd = openSync(stage, 'wx', 0o600);
    try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(stage, file);
    const directory = openSync(dirname(file), 'r');
    try { fsyncSync(directory); } finally { closeSync(directory); }
  } finally { if (lstatSync(stage, {throwIfNoEntry:false})) unlinkSync(stage); }
}
export function readJournal(file) {
  if (!regular(file)) return {rows:[], truncated:false};
  const text = readFileSync(file, 'utf8'), lines = text.split('\n');
  const tail = lines.pop();
  // Only a non-newline-terminated final record may be a torn append.
  return {rows:lines.map(line => checked('journal-invalid', () => JSON.parse(line))), truncated:tail.length > 0};
}
export function appendJournal(file, row) {
  const {rows} = readJournal(file);
  atomicWrite(file, [...rows, row].map(value => JSON.stringify(value) + '\n').join(''));
}

/** Match Core's pid/token ownership; an invalid or live lease is never replaced. */
export function acquireLock(file) {
  const token = `${process.pid}:${randomUUID()}`;
  let stale = false;
  const previous = regular(file);
  if (previous) {
    const saved = readFileSync(file, 'utf8'), pid = Number(saved.split(':')[0]);
    requireMigration(Number.isSafeInteger(pid) && pid > 0 && /^[1-9][0-9]*:[^:\s]+$/.test(saved), 'lock-invalid');
    try { process.kill(pid, 0); throw new MigrationError('lock-held'); }
    catch (error) {
      if (error.code === 'EPERM') throw new MigrationError('lock-held');
      if (error.code !== 'ESRCH') throw error;
    }
    const current = regular(file);
    requireMigration(current?.ino === previous.ino && current.dev === previous.dev && readFileSync(file, 'utf8') === saved, 'lock-invalid');
    unlinkSync(file); stale = true;
  }
  let fd;
  try { fd = openSync(file, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new MigrationError('lock-held'); throw error; }
  try { writeFileSync(fd, token); fsyncSync(fd); } finally { closeSync(fd); }
  return {stale, release() {
    if (regular(file) && readFileSync(file, 'utf8') === token) unlinkSync(file);
  }};
}
