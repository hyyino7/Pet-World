import {openAsBlob} from 'node:fs';
import {realpath, stat} from 'node:fs/promises';
import {extname, join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const roomPrefix = '/chatpet-room';
const root = fileURLToPath(new URL('../../../vendor/feiyu-room-template/public/room/', import.meta.url));
const mime: Record<string, string> = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.webm':'video/webm', '.png':'image/png', '.glb':'model/gltf-binary',
  '.jpg':'image/jpeg', '.webp':'image/webp', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.svg':'image/svg+xml'};

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
    const dir = await realpath(root), file = await realpath(join(dir, name));
    if (!file.startsWith(dir + sep) || !(await stat(file)).isFile()) return new Response(null, {status:404});
    const blob = await openAsBlob(file, {type});
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
