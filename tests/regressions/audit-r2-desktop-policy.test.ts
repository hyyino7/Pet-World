import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,realpathSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {Context} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../../src/core/index.js';
import {DEFAULT_COMPANION_SETTINGS} from '../../src/core/companion-settings.js';
import {DesktopFeatures} from '../../src/desktop/features.js';

function deferred<T=void>() {let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
function fixture(sleeping=false) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'r2-desktop-policy-'))),directory=join(root,'.chatpet/data/desktop');mkdirSync(directory,{recursive:true});
  writeFileSync(join(directory,'todos.json'),'{"version":1,"todos":[]}');
  const started=deferred<AbortSignal>(),answer=deferred(),listeners=new Map<string,Function[]>(),frames:{type:string;value:any}[]=[];
  let quiet=false,visible=true,life=false;
  const settings={...DEFAULT_COMPANION_SETTINGS,desktopWhisperEnabled:true};
  const host={workspace:{status:()=>({state:'ready',target:{id:'a',path:root}}),storageId:()=>'a-stable',companionSettings:()=>settings,
    runtime:{conversation:{maxDurationMs:30_000},policy:()=>({quiet}),identity:()=>({displayName:'Fixture'})}},native:{context:()=>({identity:'Fixture'})}} as unknown as PetCoreHost;
  const ctx={on:(name:string,handler:Function)=>{listeners.set(name,[...(listeners.get(name)??[]),handler]);return()=>{};},logger:()=>({warn(){}}),
    get:(name:string)=>{
      if(name==='petBehavior')return {restState:()=>({sleeping,pending:false})};
      if(name==='petLife')return {running:()=>life};
      if(name==='agentDefaultModel')return {currentSelection:()=>({provider:'fixture',model:'fixture'})};
      if(name==='llm')return {async *stream(options:any){started.resolve(options.signal);await answer.promise;
        // Deliberately return even after abort: publication must recheck policy.
        yield {type:'block-start',index:0,blockType:'text'};yield {type:'text-delta',index:0,text:'Late automatic thought.'};
        yield {type:'block-end',index:0,block:{type:'text',text:'Late automatic thought.'}};yield {type:'finish',reason:{kind:'stop'}};}};
    }} as unknown as Context;
  const features=new DesktopFeatures(ctx,host,(type,value)=>frames.push({type,value}),()=>visible,()=>false);
  features[sleeping?'lastDream':'lastWhisper']=0;
  return {features,settings,started,answer,frames,setQuiet:()=>{quiet=true;},hide:()=>{visible=false;},setLife:()=>{life=true;},wake:()=>{sleeping=false;},
    emit:(name:string,...args:any[])=>listeners.get(name)?.forEach(handler=>handler(...args)),
    async close(){answer.resolve();await features.close();rmSync(root,{recursive:true,force:true});}};
}

for(const dream of [false,true])test(`R2-5: quiet mode aborts and suppresses an in-flight automatic ${dream?'dream':'whisper'}`,async()=>{
  const f=fixture(dream);let pending:Promise<unknown>|undefined;
  try {pending=f.features['tick']();const signal=await f.started.promise;f.setQuiet();f.emit('pet/core.changed','setQuiet');
    assert.equal(signal.aborted,true);f.answer.resolve();await pending;assert.equal(f.frames.some(frame=>['say','notice'].includes(frame.type)),false);
  }finally{f.answer.resolve();await pending;await f.close();}
});

test('R2-5: final automatic publication rechecks quiet even without a change event',async()=>{
  const f=fixture();let pending:Promise<unknown>|undefined;
  try {pending=f.features['tick']();await f.started.promise;f.setQuiet();f.answer.resolve();await pending;
    assert.equal(f.frames.some(frame=>['say','notice'].includes(frame.type)),false);
  }finally{f.answer.resolve();await pending;await f.close();}
});

for(const change of ['disabled','hidden','life','woken'] as const)test('R2-5: '+change+' revokes only the pending automatic generation',async()=>{
  const f=fixture(change==='woken');let pending:Promise<unknown>|undefined;
  try {pending=f.features['tick']();const signal=await f.started.promise;
    if(change==='disabled')f.settings.desktopWhisperEnabled=false;
    if(change==='hidden')f.hide();if(change==='life')f.setLife();if(change==='woken')f.wake();
    await f.features.refresh();assert.equal(signal.aborted,true);f.answer.resolve();await pending;
    assert.equal(f.frames.some(frame=>['say','notice'].includes(frame.type)),false);
  }finally{f.answer.resolve();await pending;await f.close();}
});

test('R2-5: a deliberate manual whisper remains available when quiet mode changes',async()=>{
  const f=fixture();let pending:Promise<any>|undefined;
  try {pending=f.features.whisper();const signal=await f.started.promise;f.setQuiet();f.settings.desktopWhisperEnabled=false;f.emit('pet/core.changed','setQuiet');
    assert.equal(signal.aborted,false);f.answer.resolve();assert.equal((await pending).ok,true);
    const say=f.frames.find(frame=>frame.type==='say');assert.equal(say?.value.text,'Late automatic thought.');assert.equal(say?.value.automatic,false);
  }finally{f.answer.resolve();await pending;await f.close();}
});

test('R2-5: quiet mode during todo loading suppresses the late reminder without consuming it',async()=>{
  const f=fixture(),listed=deferred(),release=deferred();let marked=0,pending:Promise<unknown>|undefined;
  f.features['todos']=async()=>({list:async()=>{listed.resolve();await release.promise;return [{id:'due',text:'Original reminder',dueAt:Date.now()-60_000,
    done:false,lastRemindedAt:null,createdAt:1,updatedAt:1,completedAt:null}];},markReminded:async()=>{marked++;}});
  try {pending=f.features['tick']();await listed.promise;f.setQuiet();release.resolve();await pending;
    assert.equal(f.frames.some(frame=>frame.type==='say'),false);assert.equal(marked,0,'a suppressed reminder remains eligible after quiet ends');
  }finally{release.resolve();f.answer.resolve();await pending;await f.close();}
});
