import { lstatSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { validClockTime } from '#dsh-world/life/alarm';
import { createDiaryReader } from '#dsh-world/life/diary';
import { createPhotoStore, type PhotoStore } from '#dsh-world/life/photos';
import { createLifeStore } from '#dsh-world/life/lifeStore';

export interface LifePreferences {
  wake: string;
  review: string;
  dailyBudget: number | null;
  compactAfterReview: boolean;
}

export const defaultLifePreferences: LifePreferences = {
  wake: '09:00', review: '22:00', dailyBudget: null, compactAfterReview: false,
};

export function parseLifePreferences(raw: unknown): LifePreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('生活设置无效');
  const values = raw as Record<string, unknown>;
  const {wake, review, dailyBudget, compactAfterReview} = values;
  if (Object.keys(values).length !== 4 || !validClockTime(wake) || !validClockTime(review) ||
      typeof compactAfterReview !== 'boolean' ||
      !(dailyBudget === null || (typeof dailyBudget === 'number' && Number.isFinite(dailyBudget) && dailyBudget > 0))) {
    throw Error('请输入有效的 24 小时时间及每日金额');
  }
  return {wake, review, dailyBudget, compactAfterReview};
}

function checked(path: string, directory = false) {
  const stat = lstatSync(path, {throwIfNoEntry: false});
  if (stat && (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)) {
    throw Error('生活档案路径无效');
  }
}

/** One upstream album per binding, opened only by a photo operation. */
export class LifeLibrary {
  private photos?: PhotoStore;
  constructor(readonly directory: string, private timeZone: string) {}
  album() {
    if (this.photos) return this.photos;
    const dir = join(this.directory, 'photos');
    checked(dir, true);
    mkdirSync(dir, {recursive: true, mode: 0o700});
    for (const name of ['album.sqlite', 'album.sqlite-wal', 'album.sqlite-shm', 'album.sqlite-journal', 'index.json']) checked(join(dir, name));
    return this.photos = createPhotoStore(this.directory);
  }
  dates() {
    for (const dir of ['diary', 'activity', 'life']) checked(join(this.directory, dir), true);
    const diary = createDiaryReader(join(this.directory, 'diary'));
    const store = createLifeStore(this.directory, this.timeZone);
    return [...new Set([...diary.dates(), ...store.activityDays()])].sort().reverse();
  }
  journal(day: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error('日期无效');
    for (const dir of ['diary', 'activity', 'life']) checked(join(this.directory, dir), true);
    const diaryDir = join(this.directory, 'diary');
    checked(join(diaryDir, day + '.md'));
    checked(join(this.directory, 'activity', day + '.jsonl'));
    return {day, activity: createLifeStore(this.directory, this.timeZone).activity(day)};
  }
  close() { this.photos?.close(); this.photos = undefined; }
}
