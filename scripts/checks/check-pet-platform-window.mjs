import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const binary=process.env.DSH_CHATBOT_ELECTRON_PATH ?? join(process.env.DSH_HOME ?? join(homedir(),'.dsh'),'electron/Electron.app/Contents/MacOS/Electron');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(binary,[fileURLToPath(new URL('../../tests/desktop/pet-platform-window.cjs',import.meta.url))],{env,stdio:'inherit'});
const timeout=setTimeout(()=>child.kill(),65_000);
child.on('exit',code=>{clearTimeout(timeout);process.exitCode=code??1;});
