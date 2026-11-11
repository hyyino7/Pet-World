import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {PetCoreHost} from '../src/core/index.js';
import {LifeLibrary, parseLifePreferences} from '../src/life/library.js';
import {CompanionVoice} from '../src/voice/plugin.js';

test('a saved album and dated journal survive reopening, and deleted photos stay deleted', t => {
  const root = mkdtempSync(join(tmpdir(),'fish-library-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'diary')); writeFileSync(join(root,'diary','2026-11-11.md'),'garden');
  const settings = {wake:'08:15',review:'20:35',dailyBudget:0.75,compactAfterReview:true};
  assert.deepEqual(parseLifePreferences(settings),settings);
  assert.throws(()=>parseLifePreferences({...settings,wake:'31:00'}));
  assert.throws(()=>parseLifePreferences({...settings,dailyBudget:0}));
  let library = new LifeLibrary(root,'Asia/Ho_Chi_Minh');
  assert.deepEqual(library.dates(),['2026-11-11']);
  const photo = library.album().keep({ref:{attachmentId:'native-photo',mediaType:'image/png',bytes:3,width:1,height:1},data:new Uint8Array([1,2,3])},'garden');
  library.close(); library = new LifeLibrary(root,'Asia/Ho_Chi_Minh');
  assert.equal(library.album().list().photos[0].id,photo.id);
  assert.deepEqual([...library.album().image(photo.id)!.data],[1,2,3]);
  library.album().forget(photo.id); library.close();
  library = new LifeLibrary(root,'Asia/Ho_Chi_Minh'); assert.equal(library.album().list().total,0); library.close();
});

test('shared Pet speech resolves the selected native recognizer and reuses the scoped audio cache', async t=>{
  const root=mkdtempSync(join(tmpdir(),'fish-voice-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  let id='a', heard=0, spoken=0;
  const host={workspace:{status:()=>({state:'ready',target:{id}}),storageId:()=>id}} as unknown as PetCoreHost;
  const voice = new CompanionVoice(host,root,()=>({listProviders:()=>['local'],
    resolve:(value:unknown)=>value,transcribe:async(value:{audio:Uint8Array})=>{heard++;assert.deepEqual([...value.audio],[1,2]);return {text:'临时录音'};}}));
  const registryFile='../src/desktop/upstream/host/voice/registry.js';
  const {registerVoiceProvider} = await import(registryFile);
  const release = registerVoiceProvider({id:'fixture',name:'fixture',synthesize:async()=>{spoken++;return Buffer.from('audio-fixture');}});
  t.after(()=>{release(); voice.release();});
  const hear=await voice.handle({rest:'voice/hear',method:'POST',body:JSON.stringify({audio:'AQI='})});
  assert.equal(hear.kind,'json'); if (hear.kind==='json') assert.deepEqual(hear.obj,{ok:true,text:'临时录音'});
  assert.equal(heard,1);
  const input={rest:'voice/speak',method:'POST',body:JSON.stringify({text:'本地测试'})};
  const first=await voice.handle(input);
  assert.equal(first.kind,'file'); if(first.kind==='file') assert.equal(readFileSync(first.file,'utf8'),'audio-fixture');
  await voice.handle(input); assert.equal(spoken,1);
  id='b'; voice.refresh(); await voice.handle(input); assert.equal(spoken,2);
});
