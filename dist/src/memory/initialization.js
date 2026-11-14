import { existsSync, lstatSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { memoryDirectory } from './client.js';
/** Offline schema preparation only: no HTTP host, scheduler, model or observations. */
export function initializeMemoryStorage(config, target, useConfiguredDirectory = true) {
    if (!config)
        return;
    const directory = memoryDirectory(config, target.path, useConfiguredDirectory);
    let parent = target.path;
    const parts = directory.slice(target.path.length + 1).split(/[\\/]/);
    for (const part of [...parts, 'data']) {
        parent = join(parent, part);
        if (!existsSync(parent))
            mkdirSync(parent, { mode: 0o700 });
        const stat = lstatSync(parent);
        if (!stat.isDirectory() || stat.isSymbolicLink())
            throw Error('Memory storage must stay within the workspace');
    }
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
        const stat = lstatSync(join(directory, 'data', 'memory.db') + suffix, { throwIfNoEntry: false });
        if (stat && (!stat.isFile() || stat.nlink !== 1))
            throw Error('Invalid existing Memory database; retained');
    }
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    const result = spawnSync(config.python, ['-B', join(root, 'src/memory/initialize.py'), directory], {
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, encoding: 'utf8', timeout: 30_000,
        maxBuffer: 1024 * 1024, windowsHide: true,
    });
    if (result.error || result.status !== 0)
        throw Error('Memory storage could not be initialized; existing files retained', { cause: result.error ?? new Error(result.stderr.trim()) });
}
//# sourceMappingURL=initialization.js.map