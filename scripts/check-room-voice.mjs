// A hidden isolated Electron window uses Chromium's synthetic microphone and
// local speech substitutes. It never records the owner's microphone or calls AI.
import {spawnSync} from 'node:child_process';
import {join,dirname} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const binary=process.env.DSH_CHATBOT_ELECTRON_PATH || join(process.env.DSH_HOME || join(homedir(),'.dsh'),'electron/Electron.app/Contents/MacOS/Electron');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const result=spawnSync(binary,[join(root,'tests/room-voice-window.cjs')],{cwd:root,env,stdio:'inherit',timeout:45000});
if(result.error)throw result.error;process.exit(result.status ?? 1);
