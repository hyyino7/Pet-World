import {lstatSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseGardenPauses, type GardenClock} from '../economy/garden-clock.js';
import {parseLifePreferences} from './library.js';

export class LifeControlFileError extends Error {
  constructor(cause?: unknown) {
    super('生活开关文件无效，已保留原文件', {cause});
  }
}

export function safeLifeFile(file: string) {
  const stat = lstatSync(file,{throwIfNoEntry:false});
  if (stat && (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1))
    throw Error('生活数据文件无效，已保留原文件');
  return stat;
}

export function lifeDirectories(workspacePath: string) {
  const managed = join(workspacePath,'.chatpet');
  const data = join(managed,'data');
  return [managed,data,join(data,'life')] as const;
}

function readControl(workspacePath: string) {
  try {
    const directories = lifeDirectories(workspacePath);
    for (const path of directories) {
      const stat = lstatSync(path,{throwIfNoEntry:false});
      if (!stat) return;
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('生活时钟控制目录无效');
    }
    const file = join(directories[2],'control.json');
    if (!safeLifeFile(file)) return;
    const settings = JSON.parse(readFileSync(file,'utf8'));
    if (!settings || settings.version !== 1 || typeof settings.enabled !== 'boolean')
      throw Error('生活开关版本或启用状态无效');
    const enabled: boolean = settings.enabled;
    const pauses = parseGardenPauses(settings.pauses,enabled);
    const preferences: unknown = settings.preferences;
    return {enabled,pauses,preferences};
  } catch (cause) {
    throw new LifeControlFileError(cause);
  }
}

/** Reads the committed clock without starting Life or creating files. */
export function readLifeControl(workspacePath: string): GardenClock | undefined {
  const saved = readControl(workspacePath);
  if (saved) return {enabled:saved.enabled,pauses:saved.pauses};
}

export function readLifeSettings(workspacePath: string) {
  const saved = readControl(workspacePath);
  if (!saved) return;
  const {enabled,pauses,preferences} = saved;
  return {enabled,pauses,preferences:preferences === undefined ? undefined : parseLifePreferences(preferences)};
}
