// Adapted from pinned dsh-world 0.7.4 ecosystem/wechat/index.js (MIT).
// The Pet host scopes each tool, inbound account/recipient and receipt to the selected channel.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { jsonObject, knownHost, readBody, sendJson } from "../http.js";
import { speakerIdentity } from "../ecosystem/shared/identity.js";
import { durableWrite } from "../life/lifeStore.js";
import { createWechatHome, WechatHomeBusy } from "../ecosystem/wechat/home.js";
import { channelContext, channelMedia, channelReference } from "../ecosystem/shared/context.js";
import { admitContextImages } from "../ecosystem/wechat/images.js";
import { dirname, join } from 'node:path';
import { createWechatSending } from "../ecosystem/wechat/sending.js";
import { createWechatReading } from "../ecosystem/wechat/reading.js";
import { createStickerLibrary } from "../ecosystem/wechat/stickerLibrary.js";
import { createStickerTools } from "../ecosystem/wechat/stickerTools.js";
import { createWechatPresence } from "../ecosystem/wechat/presence.js";
import { reassembleOnChange, registerScopedTool } from "../worldScope.js";
import { worldPath } from "../worldRoutes.js";
export function createWechatModule(deps) {
    const path = worldPath(deps.worldId ?? 'default') + '/wechat/ask';
    const token = randomBytes(32).toString('hex');
    const dataDirectory = deps.dataDirectory ?? dirname(deps.file);
    const stickerDir = join(dataDirectory, 'stickers');
    const stickers = createStickerLibrary(stickerDir);
    const sending = createWechatSending({ ...deps, file: join(dataDirectory, 'wechat-outbox.sqlite'), worldId: deps.worldId ?? 'default', hasSticker: id => stickers.has(id) });
    const reading = createWechatReading({ target: sending.target, images: (identity, context) => {
            if (!deps.incomingDir)
                throw new Error('Group image directory is unavailable');
            return admitContextImages(deps.ctx, deps.incomingDir, identity, context);
        } });
    const stickerTools = createStickerTools({ library: stickers, stagingDir: join(stickerDir, 'incoming'), target: sending.target, ask: reading.ask });
    const presence = createWechatPresence();
    const attached = new Map();
    const requests = new Set();
    let closing;
    let stopped = false;
    let lastContactAt;
    /** What the adapter last said about the WeChat account itself; only the adapter knows whether it is logged in. */
    let accountState;
    const settings = () => deps.settings?.() ?? { contextMessages: 5, bufferSeconds: 3 };
    const { inWorld } = deps;
    const inside = (agent) => !inWorld || inWorld(agent.session);
    function detach(agent) {
        const disposers = attached.get(agent);
        if (!disposers)
            return false;
        attached.delete(agent);
        for (const dispose of disposers.reverse()) {
            try {
                dispose();
            }
            catch { /* agent already disposed */ }
        }
        return true;
    }
    /** Gives the agent the WeChat tools while it is in her world and takes them away once it leaves; true when that changed them. */
    function attach(agent) {
        if (stopped)
            return false;
        if (!inside(agent))
            return detach(agent);
        if (attached.has(agent))
            return false;
        const disposers = [];
        try {
            for (const tool of [...sending.tools, reading.tool, reading.imageTool, ...stickerTools])
                if (deps.toolAllowed(agent, tool.name))
                    disposers.push(registerScopedTool(agent, {
                        ...tool, ...(tool.name === 'wechat_send' ? {description: tool.description.replace('普通最终回答不会自动转发到微信。','普通最终回答会自动排队发回原聊天。本轮已显式发送时，最终回答不会再发。')} : {}), execute(args, execution) {
                            if (!deps.toolAllowed(agent, tool.name, args))
                                throw Error('当前微信会话无权使用这个目标');
                            return tool.execute(args, execution);
                        },
                    }, () => !stopped && inside(agent) && deps.toolAllowed(agent, tool.name), () => detach(agent)));
            attached.set(agent, disposers);
        }
        catch (error) {
            for (const dispose of disposers.reverse())
                dispose();
            throw error;
        }
        return true;
    }
    // Following her world, every session is reconciled as it is created, receives a message and assembles its prompt;
    // without one, only the homes the module itself opens get the tools.
    const disposers = [
        deps.ctx.on('agent/disposed', ({ agent }) => { attached.delete(agent); }),
        ...inWorld ? [
            deps.ctx.on('agent/created', ({ agent }) => { attach(agent); return undefined; }),
            deps.ctx.on('agent/inbox/inserted', ({ agent }) => { attach(agent); }),
            reassembleOnChange(deps.ctx, attach),
        ] : [],
    ];
    const home = createWechatHome({ ...deps, home: async (identity) => { const agent = await deps.home(identity); attach(agent); return agent; }, images: async (identity, context, reference) => {
            if (!reference?.image && !context.some(message => message.image || message.reference?.image))
                return [];
            if (!deps.incomingDir)
                throw new Error('Group image directory is unavailable');
            return admitContextImages(deps.ctx, deps.incomingDir, identity, context, reference);
        } });
    async function handle(req) {
        const given = req.headers['x-dsh-world-token'];
        if (!knownHost(req.headers.host, deps.allowedHosts) || req.headers['sec-fetch-site'] === 'cross-site' || typeof given !== 'string')
            return { status: 403, body: { error: 'forbidden' } };
        const bytes = Buffer.from(given), expected = Buffer.from(token);
        if (bytes.length !== expected.length || !timingSafeEqual(bytes, expected))
            return { status: 403, body: { error: 'forbidden' } };
        if (stopped)
            return { status: 503, body: { error: 'wechat unavailable' } };
        lastContactAt = new Date().toISOString();
        if (req.method !== 'POST')
            return { status: 405, body: { error: 'method not allowed' }, headers: { allow: 'POST' } };
        let body;
        try { body = deps.acceptBody(jsonObject(await readBody(req, 64 * 1024))); }
        catch { return { status: 403, body: { error: 'account or conversation unavailable' } }; }
        if (body && 'status' in body) {
            const reported = body.status?.wechat;
            if (reported !== 'online' && reported !== 'offline')
                return { status: 400, body: { error: 'bad status' } };
            accountState = reported;
            if (reported === 'offline')
                presence.clear();
            return { status: 200, body: { accepted: true } };
        }
        if (body && 'outbox' in body) {
            try {
                const job = await sending.poll(body.outbox);
                presence.accept(body.outbox);
                const read = reading.poll();
                accountState = 'online';
                return { status: 200, body: { accepted: true, settings: settings(), ...(job ? { job } : {}), ...(read ? { read } : {}) } };
            }
            catch (error) {
                presence.clear();
                deps.ctx.logger.warn('dsh-world WeChat outbox failed:', error);
                return { status: 400, body: { error: 'invalid WeChat outbox binding or pending job; check adapter configuration' } };
            }
        }
        if (body && 'readResult' in body) {
            try {
                const readAccepted = reading.accept(body.readResult);
                return { status: 200, body: { accepted: true, readAccepted } };
            }
            catch (error) {
                deps.ctx.logger.warn('dsh-world WeChat read failed:', error);
                return { status: 400, body: { error: 'invalid WeChat history result' } };
            }
        }
        if (body && 'receipt' in body) {
            const receipt = body.receipt;
            if (!receipt || typeof receipt !== 'object' || typeof receipt.id !== 'string' || !/^[a-f0-9]{64}$/.test(receipt.id)
                || !Number.isSafeInteger(receipt.confirmed) || receipt.confirmed < 0 || receipt.confirmed > 16
                || !['sent', 'uncertain', 'failed'].includes(receipt.status ?? ''))
                return { status: 400, body: { error: 'bad receipt' } };
            try {
                await sending.receipt(receipt);
                return { status: 200, body: { accepted: true } };
            }
            catch (error) {
                deps.ctx.logger.warn('dsh-world WeChat receipt failed:', error);
                return { status: 503, body: { error: 'receipt not recorded; retry receipt only' } };
            }
        }
        const text = typeof body?.text === 'string' ? body.text.trim() : '';
        let identity;
        let context;
        let media;
        let reference;
        try {
            identity = speakerIdentity(body?.identity);
            context = channelContext(body?.context, identity, settings().contextMessages);
            media = channelMedia(body?.media, identity);
            reference = channelReference(body?.reference, identity);
        }
        catch {
            return { status: 400, body: { error: 'bad identity or context' } };
        }
        if ((!text && !media.length && !reference) || [...text].length > 2000)
            return { status: 400, body: { error: 'bad request' } };
        if (identity.channel !== 'wechat')
            return { status: 400, body: { error: 'bad channel' } };
        if ((identity.conversationType === 'group') !== identity.conversationId.endsWith('@chatroom'))
            return { status: 400, body: { error: 'bad conversation type' } };
        try {
            return { status: 200, body: { accepted: true, ...(await deps.receive(identity, async () => {
                const answer = await home.ask(text || (media.length ? '[微信图片]' : '[微信引用]'), identity, context, media, reference);
                if (stopped || !deps.canReply(identity, answer.sessionId)) throw Error('目标聊天已停用');
                sending.enqueueReply(identity, answer);
                return {id: answer.id};
            })) } };
        }
        catch (error) {
            if (error instanceof WechatHomeBusy)
                return { status: 409, body: { error: 'home busy; message not taken in, ask again later' } };
            deps.ctx.logger.warn('dsh-world WeChat request failed:', error);
            return { status: 503, body: { error: 'home request failed; delivery must be checked before retrying' } };
        }
    }
    return {
        async reach(identity,sessionId,text) {
            const state=sending.status();
            if (stopped || accountState!=='online' || !lastContactAt || Date.now()-Date.parse(lastContactAt)>125000 ||
                state.accountId!==identity.accountId || !deps.reachAllowed(identity.accountId,identity.conversationId))
                throw Error('主人微信适配器未就绪');
            sending.target(identity.conversationId);
            const ids=sending.enqueueReply(identity,{sessionId,text,reach:true});
            if (!ids?.length) throw Error('主动消息内容为空');
            const end=Date.now()+70000;
            while(!stopped && Date.now()<end) {
                const states=sending.deliveryStates(ids);
                if (states.every(s=>s==='sent')) return;
                if (states.some(s=>s==='failed'||s==='uncertain') || !deps.reachAllowed(identity.accountId,identity.conversationId)) break;
                await new Promise(resolve=>setTimeout(resolve,150));
            }
            throw Error('微信主动消息尚无送达回执');
        },
        presence: (now) => !stopped && accountState === 'online' ? presence.summary(now) : undefined,
        status() { return { ...sending.status(), lastContactAt: lastContactAt ?? null, account: accountState ?? null, ...settings() }; },
        start() {
            durableWrite(deps.file, JSON.stringify({ origin: deps.origin(), token, path, pid: process.pid, protocol: 4, references: true }, null, 2));
            if (inWorld)
                for (const agent of deps.ctx.agents.list())
                    attach(agent);
        },
        stop() {
            if (stopped)
                return closing;
            stopped = true;
            reading.stop();
            home.stop();
            for (const dispose of disposers)
                dispose();
            for (const agent of attached.keys())
                detach(agent);
            try {
                if (JSON.parse(readFileSync(deps.file, 'utf8')).token === token)
                    rmSync(deps.file, { force: true });
            }
            catch { /* already absent, or a newer module owns the file */ }
            return closing = Promise.allSettled([...requests]).then(() => sending.stop());
        },
        route: { kind: 'exact', path, handler: async (req, res) => {
                let result;
                const request = handle(req);
                requests.add(request);
                try {
                    result = await request;
                }
                catch {
                    result = { status: 500, body: { error: 'internal error' } };
                }
                finally {
                    requests.delete(request);
                }
                sendJson(res, result);
            } },
    };
}
