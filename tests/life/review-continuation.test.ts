import test from 'node:test';
import assert from 'node:assert/strict';
import type {Context} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../../src/core/index.js';
import {apply} from '../../src/core/native/agent.js';
import {createUserMessage} from '@deepseek-ai/dsh-llm';

function fixture() {
  const handlers=new Map<string,Function[]>(),events:any[]=[],guards:Function[]=[];
  let storageId='bank',allowed:string[]|undefined;
  const agent:any={id:'home',status:'idle',session:{id:'home',header:{cwd:'/fixture',agentPreset:'standard'},snapshotEvents:()=>events},
    ctx:{tools:{restrict({allow}:any){allowed=allow;return()=>{allowed=undefined;};}}}};
  const native:any={acceptsInput:(_id:string,message:any)=>message.source.kind==='user'||message.source.kind==='dsh-world-life',
    tools:()=>[],observeInputs(){},begin:async()=>{},finish(){},finishTurn:async()=>{},memoryFor:()=>undefined,guardTool(){}};
  const status={state:'ready',target:{id:'world',path:'/fixture'}};
  const host={native,workspace:{status:()=>status,storageId:()=>storageId}} as unknown as PetCoreHost;
  const ctx={on(name:string,fn:Function){handlers.set(name,[...(handlers.get(name)??[]),fn]);return()=>{};},effect(){},get(){return undefined;},
    tools:{definitions:()=>['read','write','bash','life_plan_read'].map(name=>({name})),register:()=>()=>{},guard(fn:Function){guards.push(fn);return()=>{};}},
    agents:new Map([[agent.id,agent]])} as unknown as Context;
  const stop=apply(ctx,host,{sessionStatus:()=>status} as any);
  let turn=0;
  async function start(source:any) {
    agent.status='idle';const message=createUserMessage({source,content:[{type:'text',text:'fixture'}]});
    for(const fn of handlers.get('agent/inbox/inserted')??[])fn({agent,message});
    events.push({type:'turn/start',data:{turn:++turn}},{type:'user/message',data:message});
    await handlers.get('agent/pre-step')!.at(-1)!({agent,turn,step:1,messages:[message],signal:new AbortController().signal},async()=>({kind:'enter',messages:[]}));
    agent.status='running';return allowed;
  }
  async function end(kind:string) {
    const event={type:'turn/end',data:{turn,reason:{kind}}};events.push(event);
    await handlers.get('session/event')!.at(-1)!(agent.session,event);agent.status='idle';
  }
  return {start,end,stop,rebind(){storageId='other';}};
}
const review={kind:'dsh-world-life',purpose:'review',reviewDay:'2026-11-14'},alarm={kind:'dsh-world-life'};

test('interrupted review keeps native read/write through the next Life alarm, then releases them',async t=>{
  const f=fixture();t.after(f.stop);
  assert.ok((await f.start(review))?.includes('write'));await f.end('aborted');
  const resumed=await f.start(alarm);assert.ok(resumed?.includes('read'));assert.ok(resumed?.includes('write'));assert.ok(!resumed?.includes('bash'));
  await f.end('completed');assert.ok(!(await f.start(alarm))?.includes('write'));await f.end('completed');
});

for(const change of ['binding','owner'] as const)test('interrupted review does not leak permission after '+change,async t=>{
  const f=fixture();t.after(f.stop);await f.start(review);await f.end('aborted');
  if(change==='binding')f.rebind();else {assert.equal(await f.start({kind:'user'}),undefined);await f.end('completed');}
  assert.ok(!(await f.start(alarm))?.includes('write'));await f.end('completed');
});
