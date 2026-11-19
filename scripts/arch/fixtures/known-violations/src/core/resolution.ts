export function unresolved(ctx, name, base, event, field) {
  ctx.get(`${name}`);
  ctx.get(`pet${name}`);
  import(`${base}/living/plan/plugin.js`);
  ctx.on(`pet/${event}`,()=>{});
  ctx.emit(`pet/${event}`);
  const {[field]: service}=ctx;
  const {['pet'+name]: dynamic}=ctx;
  ctx[`pet${name}`];
}
const k='petLife';
const {[k]: life}=ctx;
type T=import('../living/plan/plugin.js').X;
export function resolved(ctx) {
  const name='petLife';
  ctx.get(`${name}`);
  const base='../living/plan';
  return import(`${base}/plugin.js`);
}
