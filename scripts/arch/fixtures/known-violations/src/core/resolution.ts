export function unresolved(ctx, name, base, event, field) {
  ctx.get(`${name}`);
  ctx.get(`pet${name}`);
  import(`${base}/life/plugin.js`);
  ctx.on(`pet/${event}`,()=>{});
  ctx.emit(`pet/${event}`);
  const {[field]: service}=ctx;
  const {['pet'+name]: dynamic}=ctx;
  ctx[`pet${name}`];
}
const k='petLife';
const {[k]: life}=ctx;
type T=import('../life/plugin.js').X;
export function resolved(ctx) {
  const name='petLife';
  ctx.get(`${name}`);
  const base='../life';
  return import(`${base}/plugin.js`);
}
