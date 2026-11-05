import type { PetCoreHost } from '../core/index.js';
import type { ConversationOptions } from '../core/options.js';
import type { WorkspaceTarget } from '../core/preferences.js';

/** Structural subset of the native Connection RPC contract; no new transport. */
export type SettingsReply = { ok: true; value: unknown } | { ok: false; error: { code: string; message: string; details: Record<string, never> } };
export type SettingsHandler = (endpoint: string, payload: unknown, signal: AbortSignal, peer: { principal: { kind: string }; signal: AbortSignal }) => Promise<SettingsReply>;
export interface SettingsWorkspace extends WorkspaceTarget { status(): Promise<'ok' | 'missing-dir'> }
export interface SettingsWorkspaceRegistry { list(): SettingsWorkspace[]; get(id: string): SettingsWorkspace | undefined }
const messages: Record<string, string> = {
  STALE_REVISION: '设置已被其他操作修改，请刷新后重新编辑。',
  CONFLICT: '设置已被其他操作修改，请刷新后重新编辑。',
  INVALID_ARGUMENT: '设置值无效，请检查填写内容。', UNAUTHORIZED: '当前连接没有修改设置的权限。',
  DISABLED: 'Core 当前已停止或暂停写入，请检查核心模块状态。',
  UNAVAILABLE: '00-Core 尚未就绪，请检查核心模块是否启用。',
  NOT_FOUND: '所选工作区不存在，请刷新工作区列表。',
  WORKSPACE_INVALID: '绑定 Repo 的 .chatpet 资料无法加载。请检查 manifest.json、SOUL.md、USER.md 和 core.json 后刷新。原文件未被覆盖。',
  LIMIT_REACHED: '仍有执行进行中或结果未确认，请先停止或核对执行状态后再修改。',
  INELIGIBLE: '相关来源已撤回或无法校验，当前内容暂不展示。',
  CANCELLED: '请求已取消，请刷新核对实际保存结果。',
};
function fail(code: string): never { throw { code }; }
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_ARGUMENT');
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== keys.length || keys.some(key => !Object.hasOwn(obj, key))) fail('INVALID_ARGUMENT');
  return obj;
}
function unwrap<T>(value: { ok: true; value: T } | { ok: false; error: { code: string } }): T {
  if (!value.ok) fail(value.error.code);
  return value.value;
}
/** Owner-only, finite endpoint map. No caller-supplied operation, actor or authority is forwarded. */
export function settingsHandler(getHost: () => PetCoreHost | undefined, getWorkspaces: () => SettingsWorkspaceRegistry | undefined): SettingsHandler {
  return async (endpoint, payload, signal, peer) => {
    try {
      if (peer.principal.kind !== 'owner' || peer.signal.aborted) fail('UNAUTHORIZED');
      if (signal.aborted) fail('CANCELLED');
      const host = getHost(); if (!host) fail('UNAVAILABLE');
      const body = object(payload, ['requestId', 'input']);
      if (typeof body.requestId !== 'string' || body.requestId.length < 1 || body.requestId.length > 160) fail('INVALID_ARGUMENT');
      const context = () => host.operator.request(`settings:${endpoint}:${body.requestId}`);
      const options = { signal };
      if (endpoint === 'snapshot') {
        object(body.input, []);
        const initialWorkspace = unwrap(await host.services.workspace.inspect(context(), {}, options));
        if (initialWorkspace.state === 'unavailable') fail('WORKSPACE_INVALID');
        const identity = unwrap(await host.services.core.getIdentity(context(), {}, options));
        const policy = unwrap(await host.services.core.getPolicy(context(), {}, options));
        const prefs = unwrap(await host.services.preferences.read(context(), {}, options));
        const workspace = unwrap(await host.services.workspace.inspect(context(), {}, options));
        const profile = unwrap(await host.services.workspace.readProfile(context(), {}, options));
        const capabilities = unwrap(await host.services.core.listCapabilities(context(), {}, options));
        const registry = getWorkspaces();
        const workspaces = await Promise.all((registry?.list() ?? []).map(async workspace => ({
          id: workspace.id, title: workspace.title, path: workspace.path, state: await workspace.status(),
        })));
        return { ok: true, value: { identity: { revision: identity.revision, displayName: identity.displayName, character: identity.character },
          policy, preferences: prefs, capabilities, workspaces, workspaceAvailable: Boolean(registry), workspace, profile,
          nativeConversationReady: workspace.state === 'ready' && Boolean(registry) } };
      }
      if (endpoint === 'workbench') {
        object(body.input, []);
        return { ok: true, value: unwrap(await host.services.workbench.snapshot(context(), {}, options)) };
      }
      if (endpoint === 'matter') {
        const input = object(body.input, ['commitmentId']);
        return { ok: true, value: unwrap(await host.services.workbench.matter(context(), { commitmentId: input.commitmentId as string }, options)) };
      }
      if (endpoint === 'cancelActivity') {
        const input = object(body.input, ['activityId', 'expectedRevision']);
        return { ok: true, value: unwrap(await host.services.core.cancelActivity(context(), {
          activityId: input.activityId as string, expectedRevision: input.expectedRevision as number, reason: 'Owner stopped execution from the Core workbench',
        }, options)) };
      }
      if (endpoint === 'reconcileExecution') {
        const input = object(body.input, ['executionId']);
        return { ok: true, value: unwrap(await host.services.execution.reconcile(context(), { executionId: input.executionId as string }, options)) };
      }
      if (endpoint === 'initialize') {
        const input = object(body.input, ['expectedPreferencesRevision']);
        const prefs = unwrap(await host.services.preferences.read(context(), {}, options));
        const target = prefs.workspace && getWorkspaces()?.get(prefs.workspace.id);
        if (!target || target.path !== prefs.workspace?.path || await target.status() !== 'ok') fail('NOT_FOUND');
        return { ok: true, value: unwrap(await host.services.workspace.initialize(context(), {
          expectedPreferencesRevision: input.expectedPreferencesRevision as number,
        }, options)) };
      }
      if (endpoint === 'profile') {
        const input = object(body.input, ['expectedRevision', 'text']);
        return { ok: true, value: unwrap(await host.services.workspace.saveProfile(context(), {
          expectedRevision: input.expectedRevision as number, text: input.text as string,
        }, options)) };
      }
      if (endpoint === 'identity') {
        const input = object(body.input, ['expectedRevision', 'displayName', 'character']);
        const identity = unwrap(await host.services.core.reviseIdentity(context(), input as unknown as {
          expectedRevision: number; displayName: string; character: string;
        }, options));
        return { ok: true, value: { revision: identity.revision, displayName: identity.displayName, character: identity.character } };
      }
      if (endpoint === 'quiet') {
        const input = object(body.input, ['expectedRevision', 'quiet']);
        if (typeof input.quiet !== 'boolean') fail('INVALID_ARGUMENT');
        return { ok: true, value: unwrap(await host.services.preferences.setQuiet(context(), {
          expectedRevision: input.expectedRevision as number, quiet: input.quiet,
        }, options)) };
      }
      if (endpoint === 'preferences') {
        const input = object(body.input, ['expectedRevision', 'workspaceId', 'conversation']);
        if (input.workspaceId !== null && typeof input.workspaceId !== 'string') fail('INVALID_ARGUMENT');
        let workspace: WorkspaceTarget | null = null;
        if (input.workspaceId !== null) {
          const target = getWorkspaces()?.get(input.workspaceId as string);
          if (!target) fail('NOT_FOUND');
          if (await target.status() !== 'ok') fail('NOT_FOUND');
          workspace = { id: target.id, title: target.title, path: target.path };
        }
        object(input.conversation, ['maxHistoryMessages', 'maxContextChars', 'maxSteps', 'maxToolCalls', 'maxDurationMs']);
        return { ok: true, value: unwrap(await host.services.preferences.save(context(), {
          expectedRevision: input.expectedRevision as number, workspace,
          conversation: input.conversation as unknown as ConversationOptions,
        }, options)) };
      }
      fail('INVALID_ARGUMENT');
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'INTERNAL';
      return { ok: false, error: { code, message: messages[code] ?? '设置操作未完成，请刷新核对实际状态。', details: {} } };
    }
  };
}
