import {openAsBlob} from 'node:fs';
import {realpath, stat, readFile} from 'node:fs/promises';
import {extname, join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import { feelingLabels } from '../behavior/presentation.js';

export const roomPrefix = '/chatpet-room';
const root = fileURLToPath(new URL('../../../vendor/feiyu-room-template/public/room/', import.meta.url));
const localVoice = fileURLToPath(new URL('../../../src/room/voice-client.js', import.meta.url));
const sharedVoice = fileURLToPath(new URL('../../../src/desktop/helper/upstream/shared-core.js', import.meta.url));
const mime: Record<string, string> = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.webm':'video/webm', '.png':'image/png', '.glb':'model/gltf-binary',
  '.jpg':'image/jpeg', '.webp':'image/webp', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.svg':'image/svg+xml'};

/** Preserve the shipped scene; missing expression assets use accurate text. */
export function adaptRoomApp(source:string):string {
  const before="  if (emo && Number.isFinite(emo.mood)) {\n    emoChip.textContent = `心情 · ${emo.label || ''}`;";
  const after=`  const emotionWords = ${JSON.stringify(feelingLabels)};\n  const emotionText = emo?.label || (emo?.feelings || []).map(feeling => emotionWords[feeling] || feeling).join('、');\n  if (emo && (Number.isFinite(emo.mood) || emotionText)) {\n    emoChip.textContent = \`心情 · \${emotionText || ''}\`;`;
  if(source.split(before).length!==2)throw Error('Room mood chip source changed');
  const activity="  $('activityText').textContent = her.activity || '在发呆';";
  if(source.split(activity).length!==2)throw Error('Room activity label source changed');
  return adaptRoomRefresh(source.replace(before,()=>after).replace(activity,
    "  const expressionText = state.presentation?.action === 'expression' ? state.presentation.expression?.actionLabel : '';\n  $('activityText').textContent = (her.activity || '在发呆') + (expressionText ? ' · 表情：' + expressionText : '');"));
}

/** Reuse the scene's poll/apply functions, with native change wakeups. */
export function adaptRoomRefresh(source:string):string {
  const replace=(before:string,after:string)=>{
    if(source.split(before).length!==2)throw Error('Room refresh source changed: '+before.slice(0,40));
    source=source.replace(before,()=>after);
  };
  replace('let requestInFlight = false;',`let requestInFlight = false;
let companionRefreshPending = false;
let companionExpectedVersion = null;
let companionAppliedVersion = null;
function refreshCompanionRoom(change) {
  if (!change || typeof change.bootId !== 'string' || !Number.isSafeInteger(change.revision)) return;
  if (companionAppliedVersion?.bootId === change.bootId && companionAppliedVersion.revision >= change.revision) return;
  if (companionExpectedVersion?.bootId === change.bootId && companionExpectedVersion.revision > change.revision) return;
  companionExpectedVersion = {bootId:change.bootId,revision:change.revision};
  void poll();
}`);
  replace('function applyState(next) {\n  if (!next) return;',`function applyState(next) {
  if (!next) return;
  const version = next.behavior;
  if (version && Number.isSafeInteger(version.revision) && typeof version.bootId === 'string') {
    if (companionExpectedVersion && (version.bootId !== companionExpectedVersion.bootId || version.revision < companionExpectedVersion.revision)) return;
    if (companionAppliedVersion?.bootId === version.bootId && version.revision < companionAppliedVersion.revision) return;
    companionAppliedVersion = {bootId:version.bootId,revision:version.revision};
  }`);
  replace('async function poll() {\n  if (requestInFlight) return;',
    'async function poll() {\n  if (requestInFlight) { companionRefreshPending = true; return; }');
  replace('    requestInFlight = false;\n  }\n}',`    requestInFlight = false;
    if (companionRefreshPending) { companionRefreshPending = false; queueMicrotask(poll); }
  }
}`);
  replace("  setInterval(poll, 1200);\n  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });",`  const companionPollTimer = setInterval(poll, 1200);
  const stopCompanionChanges = window.chatpetRoomBridge?.onChanged?.(refreshCompanionRoom);
  const companionVisible = () => { if (!document.hidden) void poll(); };
  document.addEventListener('visibilitychange', companionVisible);
  window.addEventListener('pagehide', () => {
    clearInterval(companionPollTimer);
    stopCompanionChanges?.();
    document.removeEventListener('visibilitychange', companionVisible);
  }, {once:true});
  void poll();`);
  return source;
}

/** Extend the existing owner RPC transport; no public audio/state HTTP route. */
export function adaptRoomTransport(source:string):string {
  const marker='const endpoints = new Map([';
  if(source.split(marker).length!==2)throw Error('Room transport source changed');
  return source.replace(marker,marker+"\n  ['/api/room/voice','roomVoice'],")
    .replaceAll("['roomTelevision','roomChat'].includes(endpoint)","['roomTelevision','roomChat','roomVoice'].includes(endpoint)");
}

/** The public route serves only shipped artwork and code. Personal state uses DSH's owner Connection. */
export async function roomAsset(request: Request): Promise<Response> {
  if (!['GET','HEAD'].includes(request.method)) return new Response(null, {status:405});
  const path = new URL(request.url).pathname;
  if (!path.startsWith(roomPrefix + '/')) return new Response(null, {status:404});
  let name: string;
  try { name = decodeURIComponent(path.slice(roomPrefix.length + 1)) || 'index.html'; }
  catch { return new Response(null, {status:400}); }
  if (name.split(/[\\/]/).some(part => !part || part.startsWith('.')) || name.includes('\0')) return new Response(null, {status:404});
  const type = mime[extname(name).toLowerCase()];
  if (!type) return new Response(null, {status:404});
  try {
    let blob:Blob;
    if(name==='voice-client.js'||name==='shared-core.js')blob=await openAsBlob(name==='voice-client.js'?localVoice:sharedVoice,{type});
    else {
      const dir = await realpath(root), file = await realpath(join(dir, name));
      if (!file.startsWith(dir + sep) || !(await stat(file)).isFile()) return new Response(null, {status:404});
      if(name==='app.js')blob=new Blob([adaptRoomApp(await readFile(file,'utf8'))],{type});
      else if(name==='native-room.js')blob=new Blob([adaptRoomTransport(await readFile(file,'utf8'))],{type});
      else if(name==='index.html') {
        const html=await readFile(file,'utf8'),marker='<script type="module" src="./app.js"></script>';
        if(html.split(marker).length!==2)throw Error('Room page source changed');
        blob=new Blob([html.replace(marker,'<script src="./shared-core.js"></script>\n<script type="module" src="./voice-client.js"></script>\n'+marker)],{type});
      } else blob=await openAsBlob(file,{type});
    }
    const headers = new Headers({'Content-Type':type, 'X-Content-Type-Options':'nosniff', 'Accept-Ranges':'bytes',
      'Cache-Control':'private, no-cache', 'Referrer-Policy':'no-referrer', 'Content-Security-Policy':"frame-ancestors 'self'; object-src 'none'; base-uri 'none'"});
    const range = request.headers.get('range');
    let body = blob;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, blob.size - Number(match?.[2]));
      const end = match?.[1] && match[2] ? Math.min(blob.size - 1, Number(match[2])) : blob.size - 1;
      if (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || (!match[1] && !match[2])) {
        headers.set('Content-Range', 'bytes */' + blob.size);
        return new Response(null, {status:416, headers});
      }
      body = blob.slice(start,end + 1,type);
      headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + blob.size);
    }
    headers.set('Content-Length', String(body.size));
    return new Response(request.method === 'HEAD' ? null : body, {headers, status:range ? 206 : 200});
  } catch { return new Response(null, {status:404}); }
}
