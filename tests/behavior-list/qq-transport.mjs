import {registerHooks} from 'node:module';

export function qqTransport(t) {
  let gateway;
  const sent=[];
  const sdk='data:text/javascript,'+encodeURIComponent('export const createBridge = options => globalThis.__behaviorQQTransport(options);');
  const hook=registerHooks({resolve(specifier,context,next){
    return specifier==='#dsh-world/adapters/qq-sdk'?{url:sdk,shortCircuit:true}:next(specifier,context);
  }});
  globalThis.__behaviorQQTransport=options=>{
    gateway=options;
    return {start:async()=>{},stop:async()=>{},getState:()=> 'online',
      async sendPrivate(id,text){sent.push({id,text});return {messageId:'reply-'+sent.length};},
      async sendGroup(){throw Error('Unexpected group send');}};
  };
  t.after(()=>{hook.deregister();delete globalThis.__behaviorQQTransport;});
  return {sent,get gateway(){return gateway;}};
}
