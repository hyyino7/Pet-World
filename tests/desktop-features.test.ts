import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,realpathSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Context} from '@deepseek-ai/cordis';
import {createCore} from '../src/core/index.js';
import {DesktopFeatures} from '../src/desktop/features.js';

test('upstream Desktop todos survive restart; malformed data is preserved; native whisper and unsupported balance are explicit',async t=>{
  const root=realpathSync(mkdtempSync(join(tmpdir(),'pet-features-'))),repo=join(root,'repo');mkdirSync(repo);
  const host=createCore({dataDir:join(root,'core'),companionId:'fish',scopeId:'scope',ownerActorId:'owner',displayName:'Fish',character:'Preserved personality.'});
  const ok=(r:any)=>{assert.equal(r.ok,true,JSON.stringify(r));return r.value;};
  const prefs=ok(await host.services.preferences.read(host.operator.request('read'),{}));
  const saved=ok(await host.services.preferences.save(host.operator.request('bind'),{expectedRevision:prefs.revision,workspace:{id:'repo',path:repo,title:'repo'},conversation:prefs.conversation}));
  ok(await host.services.workspace.initialize(host.operator.request('init'),{expectedPreferencesRevision:saved.revision}));
  const frames:{type:string;value:any}[]=[];let calls=0;let lifeRunning=false;let sleeping=false;
  const bodyRequests:string[]=[];
  // Actual pending/arrival sleep transitions are covered by life-body.test.ts.
  // This fixture verifies the feature adapter's public Behavior delegation.
  const behavior={
    restState(id:string){assert.equal(id,'repo');return {sleeping,pending:false};},
    async act(id:string,action:string){
      assert.equal(id,'repo');assert.ok(action==='sleep'||action==='wake');bodyRequests.push(action);
      const next=action==='sleep',changed=next!==sleeping;sleeping=next;
      return {changed,home:{her:{activity:sleeping?'正在睡觉':'醒来了'}}};
    },
  };
  const ctx={get(name:string){
    if(name==='petBehavior')return behavior;
    if(name==='petLife')return {running:()=>lifeRunning};
    if(name==='agentDefaultModel')return {currentSelection:()=>({provider:'fixture',model:'local'})};
    if(name==='llm')return {async *stream(options:any){calls++;assert.match(options.system,/Preserved personality/);yield {type:'block-start',index:0,blockType:'text'};yield {type:'text-delta',index:0,text:'今天也慢慢来。'};yield {type:'block-end',index:0,block:{type:'text',text:'今天也慢慢来。'}};yield {type:'finish',reason:{kind:'stop'}};}};
  },logger:()=>({warn(){},info(){}})} as unknown as Context;
  const make=()=>new DesktopFeatures(ctx,host,(type,value)=>frames.push({type,value}),()=>true,()=>false);
  let features=make();
  try {
    const result=await features.request({path:'/todos',method:'POST',body:JSON.stringify({text:'Finish the sample',dueAt:Date.now()+60000})});
    assert.equal(result.ok,true);assert.equal(result.todo.text,'Finish the sample');
    await features.close();features=make();
    const list=await features.request({path:'/todos',method:'GET'});assert.equal(list.todos.length,1);
    const patch=await features.request({path:'/todos/'+result.todo.id,method:'PATCH',body:'{"done":true}'});assert.equal(patch.todo.done,true);
    assert.equal((await features.whisper()).ok,true);assert.equal(calls,1);assert.equal(frames.find(x=>x.type==='say')?.value.text,'今天也慢慢来。');
    assert.equal(frames.at(-1)?.value.whisper, true);
    assert.ok(frames.at(-1)?.value.sticker, 'Automatic illustration comes from the actual sticker catalog');
    assert.equal((await features.balance()).reason,'unsupported');assert.equal(calls,1);
    await features.request({path:'/sleep',method:'POST'});await assert.rejects(features.whisper(),/睡觉/);
    await features.request({path:'/wake',method:'POST'});
    await features.request({path:'/todos/'+result.todo.id,method:'PATCH',body:JSON.stringify({done:false,dueAt:Date.now()-1})});
    await features['tick']();assert.equal(frames.filter(f=>f.type==='say'&&f.value.reminder).length,1);
    await features['tick']();assert.equal(frames.filter(f=>f.type==='say'&&f.value.reminder).length,1,'reminder acknowledgement prevents duplicates');
    const old=host.workspace.companionSettings();
    ok(await host.services.workspace.saveCompanion(host.operator.request('enable-auto'),{workspaceId:'repo',expectedSettings:old,settings:{...old,desktopWhisperEnabled:true}}));
    const now=Date.now();t.mock.timers.enable({apis:['Date'],now});t.mock.timers.tick(5*60_000+1);
    const policy=host.workspace.runtime.policy();host.workspace.runtime.store.put('policy','current',{...policy,quiet:true});
    await features['tick']();assert.equal(calls,1,'quiet suppresses automatic inference');
    host.workspace.runtime.store.put('policy','current',policy);
    lifeRunning=true;await features['tick']();assert.equal(calls,1,'Life suppresses automatic whisper inference');
    lifeRunning=false;await features['tick']();assert.equal(calls,2,'one scheduled native inference');
    await features['tick']();assert.equal(calls,2,'interval prevents repeated inference');
    const timed = host.workspace.companionSettings();
    ok(await host.services.workspace.saveCompanion(host.operator.request('whisper-options'),{workspaceId:'repo',expectedSettings:timed,
      settings:{...timed,desktopWhisperImageEnabled:false,desktopSleepTalkSeconds:30}}));
    assert.ok(!(await features.whisper()).image);
    assert.equal((await features.whisper('praise')).image,'praise','An explicitly chosen image has priority');
    await features.request({path:'/sleep',method:'POST'});
    t.mock.timers.tick(29_999);
    const beforeDream = calls;
    await features['tick'](); assert.equal(calls, beforeDream);
    t.mock.timers.tick(1);
    await features['tick'](); assert.equal(calls,beforeDream+1);
    assert.deepEqual([frames.at(-1)?.value.dream,frames.at(-1)?.value.whisper,frames.at(-1)?.value.sticker],[true,false,undefined]);
    await features.request({path:'/wake',method:'POST'});
    t.mock.timers.reset();
    assert.deepEqual(bodyRequests,['sleep','wake','sleep','wake']);
    const file=join(repo,'.chatpet/data/desktop/todos.json');writeFileSync(file,'broken original');
    await assert.rejects(features.request({path:'/todos',method:'POST',body:'{"text":"cannot overwrite"}'}));assert.equal(readFileSync(file,'utf8'),'broken original');
  } finally {t.mock.timers.reset();await features.close();await host.close();rmSync(root,{recursive:true,force:true});}
});
