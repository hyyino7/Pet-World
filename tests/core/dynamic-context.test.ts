import {foldSurface,deriveEventMessage} from '@deepseek-ai/dsh-session/surface';
import {createUserMessage} from '@deepseek-ai/dsh-llm';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import SystemPrompt,{renderPrompt,renderContextSections} from '@deepseek-ai/dsh-system-prompt';
import type {Agent} from '@deepseek-ai/dsh-agent';
import {registerWorldContext,registerWorldPrompt,retireDynamicContext} from '../../src/core/native/prompt.js';

test('native required dynamic context refreshes while the stable system and other agents remain isolated',async t=>{
  const ctx=new Context();const plugin=await ctx.plugin(SystemPrompt);t.after(()=>plugin.dispose());
  const require=createRequire(import.meta.url),promptRequire=createRequire(require.resolve('@deepseek-ai/dsh-system-prompt'));
  const {createScope}=await import(pathToFileURL(promptRequire.resolve('@deepseek-ai/dsh-scope')).href);
  const component=await ctx.plugin({inject:['systemPrompt'],async apply(owner:Context){
  let state='asleep';const agent={id:'home'} as Agent,other={id:'other'} as Agent;
  const scope=createScope(owner,agent),otherScope=createScope(owner,other);
  Object.assign(agent,{ctx:scope.ctx});Object.assign(other,{ctx:otherScope.ctx});
  t.after(()=>{scope.dispose();otherScope.dispose();});
  const stable=registerWorldPrompt(owner,'fixture.rules',10,()=> 'Stable owner-authored rules');
  const dynamic=registerWorldContext(owner,'fixture.body',14,a=>a===agent?state:'');
  t.after(()=>{dynamic();stable();});
  const first=await owner.systemPrompt.assemble({scope:agent,agent});
  const prefix=renderPrompt(first);assert.equal(renderContextSections(first).find(row=>row.name==='fixture.body')?.text,'asleep');
  state='awake, water actually consumed';
  owner.systemPrompt.suppressRuntimeContext();
  const second=await owner.systemPrompt.assemble({scope:agent,agent});
  assert.equal(renderPrompt(second),prefix);
  assert.equal(renderContextSections(second).find(row=>row.name==='fixture.body')?.text,state,'Required current state survives optional-context suppression');
  assert.ok(!renderContextSections(await owner.systemPrompt.assemble({scope:other,agent:other})).some(row=>row.name==='fixture.body'));
  const events:any[]=[];
  const append=(type:string,data:any,intent:any={surfaceOp:'append'})=>{const event={type,data,seq:events.length,time:events.length,...intent};events.push(event);return event;};
  Object.assign(agent,{session:{get surface(){return foldSurface(events);},eventAt:(seq:number)=>events[seq],append}});
  const native=owner.systemPrompt.context({name:'native.cwd',order:0,text:'Disposable workspace',required:true});t.after(()=>native());
  const snapshot=async()=>{const sections=renderContextSections(await owner.systemPrompt.assemble({scope:agent,agent}));
    return append('user/message',createUserMessage({source:{kind:'runtime-context',form:'snapshot',sections},content:[{type:'text',text:sections.map(row=>row.text).join('\n\n')}]}));};
  const original=await snapshot(),retained=structuredClone(original);
  const count=events.length;retireDynamicContext(agent,1,1);assert.equal(events.length,count,'Equal current snapshot must not rewrite its prefix');
  for(let i=0;i<30;i++) {state='Actual activity '+i;await owner.systemPrompt.assemble({scope:agent,agent});retireDynamicContext(agent,i+2,1);await snapshot();}
  const visible=foldSurface(events).nodes.map(seq=>deriveEventMessage(events[seq])).filter(Boolean);
  assert.equal(visible.filter(message=>(message!.source as any)?.sections?.some((row:any)=>row.name==='fixture.body')).length,1);
  assert.ok(visible.length<=2,'Repeated live-state refreshes cannot accumulate full snapshots');
  assert.deepEqual(events[original.seq],retained,'Every original event survives its positional replacement');
  assert.ok(visible.some(message=>JSON.stringify(message).includes('Disposable workspace')),'Other producers remain visible');
  dynamic();retireDynamicContext(agent,40,1);
  assert.ok(!renderContextSections(await owner.systemPrompt.assemble({scope:agent,agent})).some(row=>row.name==='fixture.body'));
  }});t.after(()=>component.dispose());
});
