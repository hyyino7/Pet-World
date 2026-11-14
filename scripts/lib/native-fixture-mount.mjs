import { join } from 'node:path';

/** Installed host, native persistence and workspace services sharing one disposable directory. */
export async function mountFixtureServices(ctx, load, root) {
  const mount = async (name, config) => { const m = await load(name); return ctx.plugin(m.default ?? m, config); };
  await mount('cordis-plugin-loader');
  ctx.loader.builtins.group = (await load('cordis-plugin-group')).default;
  for (const name of ['dsh-session', 'dsh-session-projection', 'dsh-agent', 'dsh-llm', 'dsh-system-prompt', 'dsh-tools', 'dsh-tool-executor-native']) await mount(name);
  await mount('dsh-session-persistence-jsonl', { root: join(root, 'sessions'), compression: 'none' });
  await mount('dsh-agent-loop', { agents: [] });
  for (const name of ['dsh-fs-local', 'dsh-subprocess-local', 'dsh-sandbox-local', 'dsh-shell-env', 'dsh-user-questions', 'dsh-token-meter', 'dsh-commands', 'dsh-storage']) await mount(name);
  await mount('dsh-working-directory', { defaultDirectory: root });
  await mount('dsh-sandbox-policy', { mode: 'workspace-write', workspaceRoot: root });
  await mount('dsh-bash-sandbox', { timeoutMs: 2000 });
  await mount('dsh-storage-json', { root: join(root, 'storage') });
  await mount('dsh-storage-domain', { backend: 'json', routes: {} });
  await mount('dsh-workspace');
  await mount('dsh-agent-preset-registry', { default: 'standard' });
  return mount;
}
