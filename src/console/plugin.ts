import type { Context } from '@deepseek-ai/cordis';
import { settingsHandler, type SettingsHandler, type SettingsWorkspaceRegistry } from './settings.js';

export const name = 'dsh-Chatpet';
export const inject = ['connection'];
/** Native owner-only exact routes; no separate server or replacement API dispatcher. */
export function apply(ctx: Context): void {
  const native = ctx as unknown as {
    connection: {
      browserPeer: Parameters<SettingsHandler>[3];
      fetch: { register(route: { path: string; methods: readonly ['POST']; requestBody: 'buffered'; fetch(request: Request): Promise<Response> }): () => Promise<void> };
    };
    get(name: 'workspaceRegistry'): SettingsWorkspaceRegistry | undefined;
  };
  const handler = settingsHandler(() => ctx.get('petCore'), () => native.get('workspaceRegistry'));
  for (const endpoint of ['snapshot', 'identity', 'quiet', 'preferences', 'initialize', 'profile', 'workbench', 'matter', 'cancelActivity', 'reconcileExecution']) {
    native.connection.fetch.register({ path: `/api/chatpetSettings/${endpoint}`, methods: ['POST'], requestBody: 'buffered',
      async fetch(request) {
        // Connection authenticates the physical request and admits only owner Peers
        // to exact routes. Reuse its browser RPC envelope and client correlation.
        if (request.headers.get('content-type')?.split(';', 1)[0].trim() !== 'application/json')
          return new Response('Expected JSON', { status: 415 });
        let body: { type?: unknown; rpcId?: unknown; method?: unknown; payload?: unknown };
        try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
        if (!body || body.type !== 'client-request' || typeof body.rpcId !== 'string' || body.rpcId.length > 160
          || body.method !== `chatpetSettings/${endpoint}`) return new Response('Invalid request', { status: 400 });
        const result = await handler(endpoint, body.payload, request.signal, native.connection.browserPeer);
        return Response.json({ type: 'server-response', rpcId: body.rpcId, result }, { headers: { 'Cache-Control': 'no-store' } });
      },
    });
  }
}
