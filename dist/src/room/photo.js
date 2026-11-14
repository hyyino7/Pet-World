import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
export function roomPhoto(home, garden, view, look, signal) {
    signal.throwIfAborted();
    if (!['eyes', 'overview'].includes(view) || !['forward', 'room'].includes(look))
        throw Error('未知的房间相机视角');
    const binary = process.env.DSH_CHATBOT_ELECTRON_PATH || join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'electron/Electron.app/Contents/MacOS/Electron');
    const helper = fileURLToPath(new URL('../../../src/room/shot-browser.cjs', import.meta.url));
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    return new Promise((resolve, reject) => {
        const child = execFile(binary, [helper], { env, signal, timeout: 60000, maxBuffer: 5 * 1024 * 1024 }, (error, out) => {
            if (error) {
                reject(Error('无法拍下房间：' + (signal.aborted ? '操作已结束' : error.message.slice(0, 300))));
                return;
            }
            try {
                const value = JSON.parse(out);
                if (typeof value.data !== 'string' || !value.data.startsWith('iVBORw0KGgo') || value.data.length < 1024)
                    throw Error('房间相机没有返回有效图片');
                resolve({ mediaType: 'image/png', data: value.data });
            }
            catch (cause) {
                reject(cause);
            }
        });
        child.stdin?.on('error', () => { });
        child.stdin?.end(JSON.stringify({ view, look, home, garden }));
    });
}
//# sourceMappingURL=photo.js.map