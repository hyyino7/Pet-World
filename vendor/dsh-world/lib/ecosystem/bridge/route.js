import { jsonObject, knownHost, readBody, sendJson } from "../../http.js";
import { bridgePaths, HomeUnavailable } from "./bridge.js";
const MAX_BODY_BYTES = 32 * 1024;
const MAX_TEXT = 2000;
const bad = { status: 400, body: { error: 'bad request' } };
const unavailable = { status: 503, body: { error: 'home unavailable' } };
function bridgePost(path, bridge, allowedHosts, action) {
    async function handle(req) {
        if (req.method !== 'POST')
            return { status: 405, body: { error: 'method not allowed' }, headers: { allow: 'POST' } };
        if (req.headers['sec-fetch-site'] === 'cross-site' || !knownHost(req.headers.host, allowedHosts))
            return { status: 403, body: { error: 'forbidden' } };
        const current = bridge();
        if (!current)
            return unavailable;
        const token = req.headers['x-dsh-world-token'];
        if (!current.checkToken(typeof token === 'string' ? token : undefined))
            return { status: 403, body: { error: 'forbidden' } };
        return action(current, req);
    }
    return {
        kind: 'exact', path,
        handler: async (req, res) => {
            let result;
            try {
                result = await handle(req);
            }
            catch (error) {
                result = error instanceof HomeUnavailable ? unavailable : { status: 500, body: { error: 'internal error' } };
            }
            sendJson(res, result);
        },
    };
}
/** A local app hands her partner's words to her home. */
export function bridgeRoute(prefix, bridge, allowedHosts = []) {
    return bridgePost(bridgePaths(prefix).sayPath, bridge, allowedHosts, async (current, req) => {
        const body = jsonObject(await readBody(req, MAX_BODY_BYTES));
        const text = typeof body?.text === 'string' ? body.text.trim() : '';
        const length = [...text].length;
        if (length < 1 || length > MAX_TEXT)
            return bad;
        return { status: 202, body: { accepted: true, id: (await current.say(text)).id } };
    });
}
/** Asks for one compaction of her home, held behind her running turn. */
export function compactRoute(prefix, bridge, request, allowedHosts = []) {
    return bridgePost(bridgePaths(prefix).compactPath, bridge, allowedHosts, () => {
        const refused = request();
        return refused ? { status: 409, body: { error: refused } } : { status: 202, body: { accepted: true } };
    });
}
