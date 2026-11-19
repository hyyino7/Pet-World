import {closeSync, constants, fstatSync, lstatSync, openSync, readdirSync, readFileSync, type Stats} from 'node:fs';
import {join} from 'node:path';
import {check} from '../../core/storage.js';
import type {ActivityReader, CompanionBinding} from '../../core/tables/companion-ports.js';
import {lifeDirectories, safeLifeFile} from './control-file.js';

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const dayFile = /^\d{4}-\d{2}-\d{2}\.jsonl$/;
const sameInode = (before: Stats, after?: Stats) => before.dev === after?.dev && before.ino === after.ino;

function directory(path: string) {
  const stat = lstatSync(path, {throwIfNoEntry:false});
  if (stat) check(stat.isDirectory() && !stat.isSymbolicLink(), 'Companion archive path is invalid');
  return stat;
}

function activities(binding: CompanionBinding) {
  const dirs = lifeDirectories(binding.path);
  if (!dirs.every(directory)) return;
  const root = dirs[2], path = join(root, 'activity');
  directory(join(root, 'life'));
  safeLifeFile(join(root, 'life.json'));
  const stat = directory(path);
  if (stat) return {path, stat};
}

/** Read the upstream Life JSONL format without starting Life or making directories. */
export const activityReader: ActivityReader = {
  activityDays(binding) {
    const dir = activities(binding);
    if (!dir) return [];
    const days = readdirSync(dir.path).filter(name => dayFile.test(name)).map(name => {
      safeLifeFile(join(dir.path, name));
      return name.slice(0, 10);
    });
    check(sameInode(dir.stat, activities(binding)?.stat), 'Companion activity directory changed');
    return days.sort().reverse();
  },
  activity(binding, day) {
    const dir = dayPattern.test(day) && activities(binding);
    if (!dir) return [];
    const file = join(dir.path, day + '.jsonl'), before = safeLifeFile(file);
    if (!before) return [];
    const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const verify = () => {
        const stat = fstatSync(fd);
        check(sameInode(dir.stat, activities(binding)?.stat) && sameInode(before, safeLifeFile(file)) &&
          stat.isFile() && stat.nlink === 1 && sameInode(before, stat), 'Companion activity file changed');
      };
      verify();
      const text = readFileSync(fd, 'utf8');
      verify();
      return text.split('\n').filter(Boolean).flatMap(line => {
        try { const item = JSON.parse(line); return item && typeof item === 'object' ? [item] : []; }
        catch { return []; }
      });
    } finally { closeSync(fd); }
  },
};
