import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGardenPauses } from '../economy/garden-clock.js';
import { parseLifePreferences } from './library.js';
export class LifeControlFileError extends Error {
    constructor(cause) {
        super('生活开关文件无效，已保留原文件', { cause });
    }
}
export function safeLifeFile(file) {
    const stat = lstatSync(file, { throwIfNoEntry: false });
    if (stat && (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1))
        throw Error('生活数据文件无效，已保留原文件');
    return stat;
}
export function lifeDirectories(workspacePath) {
    const managed = join(workspacePath, '.chatpet');
    const data = join(managed, 'data');
    return [managed, data, join(data, 'life')];
}
function readControl(workspacePath) {
    try {
        const directories = lifeDirectories(workspacePath);
        for (const path of directories) {
            const stat = lstatSync(path, { throwIfNoEntry: false });
            if (!stat)
                return;
            if (!stat.isDirectory() || stat.isSymbolicLink())
                throw Error('生活时钟控制目录无效');
        }
        const file = join(directories[2], 'control.json');
        if (!safeLifeFile(file))
            return;
        const settings = JSON.parse(readFileSync(file, 'utf8'));
        if (!settings || settings.version !== 1 || typeof settings.enabled !== 'boolean')
            throw Error('生活开关版本或启用状态无效');
        const enabled = settings.enabled;
        const pauses = parseGardenPauses(settings.pauses, enabled);
        const preferences = settings.preferences;
        return { enabled, pauses, preferences };
    }
    catch (cause) {
        throw new LifeControlFileError(cause);
    }
}
/** Reads the committed clock without starting Life or creating files. */
export function readLifeControl(workspacePath) {
    const saved = readControl(workspacePath);
    if (saved)
        return { enabled: saved.enabled, pauses: saved.pauses };
}
export function readLifeSettings(workspacePath) {
    const saved = readControl(workspacePath);
    if (!saved)
        return;
    const { enabled, pauses, preferences } = saved;
    return { enabled, pauses, preferences: preferences === undefined ? undefined : parseLifePreferences(preferences) };
}
//# sourceMappingURL=control-file.js.map