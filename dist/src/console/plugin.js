import { settingsHandler } from './settings.js';
export const name = 'dsh-Chatpet';
export const inject = ['connection'];
/** Native owner-only exact routes; no separate server or replacement API dispatcher. */
export function apply(ctx) {
    const native = ctx;
    const handler = settingsHandler(() => ctx.get('petCore'), () => native.get('workspaceRegistry'), () => ctx.get('petDesktop'), () => Object.keys(ctx.get('petWorld')?.modules ?? {}), () => ctx.get('petEmotion'), () => ctx.get('petLife'), () => ctx.get('petRoom'), () => ctx.get('petChannels'), () => ctx.get('petPlatform'), () => ctx.get('petEconomy'));
    for (const endpoint of ['economyView', 'economyAction', 'economySettings', 'presentationTiming', 'presentationMigration', 'foundation', 'self', 'emotionState', 'emotionUpdate', 'roomOpen', 'petPlatformAccess', 'petControlAccess', 'petStandaloneAccess', 'qzoneState', 'qzoneSettings', 'qzoneDraft', 'qzoneRemove', 'groupState', 'groupSettings', 'groupSlang', 'groupResearch', 'channelStatus', 'bridgeSettings', 'messagingSettings', 'roomState', 'roomAction', 'roomGarden', 'roomPlant', 'roomCare', 'roomChat', 'roomTelevision', 'roomHistory', 'roomVoice', 'lifeView', 'lifeControl', 'lifeAction', 'lifePreferences', 'lifeDates', 'lifeJournal', 'lifeAlbum', 'lifeSearch', 'lifePhoto', 'lifeForgetPhoto', 'snapshot', 'worldView', 'archiveFind', 'archiveRead', 'desktopOpen', 'desktopClose', 'desktopAppearance', 'companion', 'identity', 'quiet', 'preferences', 'initialize', 'profile']) {
        native.connection.fetch.register({ path: `/api/chatpetSettings/${endpoint}`, methods: ['POST'], requestBody: 'buffered',
            async fetch(request) {
                // Connection authenticates the physical request and admits only owner Peers
                // to exact routes. Reuse its browser RPC envelope and client correlation.
                if (request.headers.get('content-type')?.split(';', 1)[0].trim() !== 'application/json')
                    return new Response('Expected JSON', { status: 415 });
                let body;
                try {
                    body = await request.json();
                }
                catch {
                    return new Response('Invalid JSON', { status: 400 });
                }
                if (!body || body.type !== 'client-request' || typeof body.rpcId !== 'string' || body.rpcId.length > 160
                    || body.method !== `chatpetSettings/${endpoint}`)
                    return new Response('Invalid request', { status: 400 });
                const result = await handler(endpoint, body.payload, request.signal, native.connection.browserPeer);
                return Response.json({ type: 'server-response', rpcId: body.rpcId, result }, { headers: { 'Cache-Control': 'no-store' } });
            },
        });
    }
}
//# sourceMappingURL=plugin.js.map