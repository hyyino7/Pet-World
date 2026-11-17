import '../memory/plugin.js';
export function clean(ctx, scope, host, name) {
  ctx.get('petCore');
  const alias = scope;
  alias.petMemory;
  ctx.on('session/event', () => {});
  ctx.on('pet/core.changed', () => {});
  ctx.emit('pet/core.changed');
  // 集合的 get 和对象字段不是运行时服务读取。
  ctx.agents.get(name);
  const map = new Map();
  map.get(name);
  host.native.local = undefined;
}
