import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {Context} from '@deepseek-ai/cordis';
import type {Agent} from '@deepseek-ai/dsh-agent';
import {createCore} from '../../src/core/index.js';
import {createWorldService} from '../../src/world/service.js';
import {installCompanionFoundation} from '../../src/core/companion-foundation.js';
import {CompanionBehavior} from '../../src/living/body/plugin.js';
import {CompanionLife} from '../../src/life/plugin.js';
import {PersistentLifePlan} from '../../src/life/plan.js';
import type {Result} from '../../src/contracts/common.js';

const value=<T>(result:Result<T>):T=>{if(!result.ok)throw Error(result.error.message);return result.value;};

/** Actual composition/services/hooks; only DSH presentation and persistence are fake. */
async function fixture(t:TestContext) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'life-core-integration-'))),repo=join(root,'workspace');mkdirSync(repo);
  const host=createCore({dataDir:join(repo,'.chatpet/data/core'),companionId:'fish',scopeId:'owner',ownerActorId:'owner',displayName:'Fixture',character:'Fixture'});
  const preferences=value(await host.services.preferences.read(host.operator.request('preferences'),{}));
  const saved=value(await host.services.preferences.save(host.operator.request('bind'),{expectedRevision:preferences.revision,
    workspace:{id:'world',path:repo,title:'Fixture workspace'},conversation:preferences.conversation}));
  value(await host.services.workspace.initialize(host.operator.request('initialize'),{expectedPreferencesRevision:saved.revision}));
  const identity=value(await host.services.core.getIdentity(host.operator.request('identity'),{}));
  value(await host.services.core.reviseIdentity(host.operator.request('identity-update'),{ expectedScope:host.workspace.editScope(),expectedRevision:identity.revision,displayName:'Xiaoxi',character:'A continuing companion.'}));
  writeFileSync(join(repo,'.chatpet/self.md'),'My own continuous self-description.');
  const workspace={id:'world',path:repo,sessionIds:['owner-a','owner-b','guest'],attachSession:async()=>{}};
  const registry={get:(id:string)=>id==='world'?workspace:undefined,archivedSessionIds:[] as string[]};
  const listeners=new Map<string,((...args:any[])=>any)[]>(),sections=new Set<any>(),contexts=new Set<any>(),agents=new Map<string,any>(),services=new Map<string,any>();
  const warnings:unknown[]=[],flushes:string[]=[];
  let persist=true;
  function on(name:string,listener:(...args:any[])=>any,options?:{prepend?:boolean}) {
    const rows=listeners.get(name)??[];options?.prepend?rows.unshift(listener):rows.push(listener);listeners.set(name,rows);
    return()=>{const at=rows.indexOf(listener);if(at>=0)rows.splice(at,1);};
  }
  async function middleware(name:string,args:any[],end:()=>any):Promise<any> {
    const rows=[...(listeners.get(name)??[])];let index=0;
    const next=async():Promise<any>=>{const listener=rows[index++];return listener?listener(...args,next):end();};return next();
  }
  async function emit(name:string,...args:any[]) {for(const listener of [...(listeners.get(name)??[])])await listener(...args);}
  const ctx={on,get:(name:string)=>services.get(name),emit:(name:string,...args:any[])=>{void emit(name,...args);},effect:()=>()=>{},
    logger:()=>({warn:(...args:unknown[])=>warnings.push(args)}),agents:{get:(id:string)=>agents.get(id)},tools:{register:()=>()=>{}},
    sessions:{flush:async(session:any)=>{flushes.push(session.id);return persist;}},
    systemPrompt:{context:(section:any)=>{contexts.add(section);return()=>contexts.delete(section);},section:(section:any)=>{sections.add(section);return()=>sections.delete(section);},
      assemble:async(context:any)=>middleware('system-prompt/assemble',[{},context],()=>[...sections.values(),...contexts.values()].map(row=>row.text(context)).filter(Boolean).join('\n\n'))},
  } as unknown as Context;
  services.set('workspaceRegistry',registry);services.set('agents',ctx.agents);
  const world=createWorldService(host,()=>registry),behavior=new CompanionBehavior(ctx,host),life=new CompanionLife(ctx,host,'standard');
  services.set('petBehavior',behavior);services.set('petLife',life);
  const directory=join(repo,'.chatpet/data/life');mkdirSync(directory,{recursive:true});
  const plan=new PersistentLifePlan(directory,'fish',host.workspace.storageId(),'UTC');
  await plan.commit(0,{goal:'Continue resting',reason:'An accepted quiet intention',steps:[{id:'rest',kind:'hold',activity:'Resting quietly'}],nextConsiderAt:null});
  const dispose=installCompanionFoundation(ctx,host,world);
  function agent(id:string,preset='standard') {
    const events:any[]=[],session={id,header:{cwd:repo,agentPreset:preset},surface:{nodes:[] as number[]},eventAt:(seq:number)=>events[seq]};
    const result={id,session,ctx,events} as unknown as Agent & {events:any[]};agents.set(id,result);return result;
  }
  host.native.resolveNativeScope=(id:string)=>workspace.sessionIds.includes(id)?{workspaceId:'world',path:repo,storageId:host.workspace.storageId(),guest:id==='guest'}:undefined;
  const prompt=async(agent:Agent):Promise<string>=>(ctx as any).systemPrompt.assemble({agent});
  async function complete(agent:ReturnType<typeof fixtureAgent>,turn:number,outcome='completed',effective=true,beforeEnd?:()=>void) {
    const text=await prompt(agent);
    await middleware('agent/pre-step',[{agent,turn}],()=>({kind:'enter'}));
    if(effective)agent.events.push({type:'user/message',data:{source:{kind:'runtime-context',form:'snapshot',sections:[...contexts].map(row=>({name:row.name,text:row.text({agent})})).filter(row=>row.text)},content:[{type:'text',text}]}});
    // The fixture uses a compact sequence array rather than DSH's surface tree.
    if(effective)(agent.session.surface.nodes as unknown as number[]).push(agent.events.length-1);
    beforeEnd?.();
    await emit('session/event',agent.session,{type:'turn/end',data:{turn,reason:{kind:outcome}}});
    for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
    return text;
  }
  function fixtureAgent(id:string,preset?:string){return agent(id,preset);}
  t.after(async()=>{dispose();await life.close();await behavior.close();await host.close();rmSync(root,{recursive:true,force:true});});
  return {host,behavior,life,plan,repo,registry,services,warnings,flushes,agent:fixtureAgent,prompt,complete,emit,
    staticPrompt:(agent:Agent)=>[...sections].map(row=>row.text({agent})).filter(Boolean).join('\n\n'),
    contextSections:(agent:Agent)=>[...contexts].map(row=>({name:row.name,text:row.text({agent}),required:row.required})),
    get persist(){return persist;},set persist(next:boolean){persist=next;}};
}

test('two owner conversations assemble the same identity, self, accepted plan and committed body facts with Life/Memory off',async t=>{
  const f=await fixture(t),a=f.agent('owner-a'),b=f.agent('owner-b');
  await f.behavior.act('world','water','owner-water','desktop');
  const facts=await f.behavior.pendingFacts('world');assert.equal(facts.length,1);
  const [first,second]=await Promise.all([f.prompt(a),f.prompt(b)]);
  for(const text of [first,second]) {assert.match(text,/continuous self-description/);assert.ok(text.includes(f.plan.read().plan!.id));assert.ok(text.includes(facts[0].id));}
  assert.match(f.host.native.context().identity,/Xiaoxi/);assert.equal(f.life.running(),false);assert.equal(f.host.native.memory,undefined);
  assert.equal((await f.behavior.pendingFacts('world')).length,1,'Prompt assembly alone is not successful perception');
  await f.complete(a,1);assert.equal((await f.behavior.pendingFacts('world')).length,0);
  assert.equal((await f.behavior.readFacts('world',[facts[0].id]))[0].actor.channel,'desktop');
  assert.equal(f.plan.read().plan!.status,'active','A reply does not replace the accepted intention');
});

test('guest, foreign and archived conversations receive no private environment facts',async t=>{
  const f=await fixture(t);await f.behavior.act('world','water','private-water');const fact=(await f.behavior.pendingFacts('world'))[0];
  for(const agent of [f.agent('guest','chatpet-channel-guest'),f.agent('foreign'),f.agent('owner-a')]) {
    if(agent.id==='owner-a')f.registry.archivedSessionIds.push(agent.id);
    const text=await f.prompt(agent);assert.ok(!text.includes(fact.id));
    await f.complete(agent,2);assert.equal((await f.behavior.pendingFacts('world')).length,1);
  }
  assert.deepEqual(f.flushes,[]);
});

test('failed persistence, failed turns and absent effective context retain facts for a later owner turn',async t=>{
  const f=await fixture(t),a=f.agent('owner-a');await f.behavior.act('world','water','retry-water');
  f.persist=false;await f.complete(a,1);assert.equal((await f.behavior.pendingFacts('world')).length,1);
  f.persist=true;await f.complete(a,2,'failed');assert.equal((await f.behavior.pendingFacts('world')).length,1);
  a.events.length=0;(a.session.surface.nodes as unknown as number[]).length=0;
  await f.complete(a,3,'completed',false);assert.equal((await f.behavior.pendingFacts('world')).length,1);
  await f.complete(a,4);assert.equal((await f.behavior.pendingFacts('world')).length,0);
  assert.ok(f.warnings.length>0,'The persistence fault is observable');
});

test('unloading a domain while a prepared turn finishes cannot acknowledge its stale service',async t=>{
  const f=await fixture(t),a=f.agent('owner-a');await f.behavior.act('world','water','reload-water');
  const original=f.behavior.acknowledgeFacts.bind(f.behavior);let acks=0;
  f.behavior.acknowledgeFacts=async(...args)=>{acks++;return original(...args);};
  await f.complete(a,5,'completed',true,()=>{f.services.delete('petBehavior');});assert.equal(acks,0);
  f.services.set('petBehavior',f.behavior);assert.equal((await f.behavior.pendingFacts('world')).length,1);
});

test('body/interaction updates change required tail context without changing the system prefix or accepted plan',async t=>{
  const f=await fixture(t),a=f.agent('owner-a');await f.prompt(a);
  const before=f.staticPrompt(a),plan=JSON.stringify(f.plan.read());
  await f.behavior.act('world','water','new-water','desktop');await f.prompt(a);
  assert.equal(f.staticPrompt(a),before);
  const contexts=f.contextSections(a);assert.ok(contexts.every(row=>row.required));
  assert.ok(contexts.find(row=>row.name==='chatpet.interactions')?.text.includes('desktop'));
  await f.complete(a,1);assert.equal((await f.behavior.pendingFacts('world')).length,0);
  assert.equal(JSON.stringify(f.plan.read()),plan);
});
