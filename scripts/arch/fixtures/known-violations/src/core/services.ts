// 最小化保留 companion-foundation 的 bind 别名、解构和条件计算名。
export function aliases(ctx, scope, flag, unknownName) {
  const get = ctx.get.bind(ctx);
  get('petLife');
  const {get: read} = scope;
  read('petBehavior');
  const copy = ctx;
  const {petRoom: room} = copy;
  copy.petDesktop;
  scope['petChannels'];
  const name = flag ? 'petBehavior' : 'petEconomy';
  ctx.get(name);
  ctx.get(unknownName);
  ctx[unknownName];
}
export const plugin = {inject: ['petLife', 'petCore']};
export const inject = ['petEconomy'];
