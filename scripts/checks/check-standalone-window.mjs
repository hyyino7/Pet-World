import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {homedir,tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PetPlatform} from '../../dist/src/desktop/platform/plugin.js';
import {DEFAULT_COMPANION_SETTINGS} from '../../dist/src/core/companion-settings.js';

const temp=mkdtempSync(join(tmpdir(),'chatpet-standalone-test-'));
const repo=join(temp,'binding');mkdirSync(repo);
const lookup=path=>fileURLToPath(new URL(path,import.meta.url));
const cli=lookup('../../'+JSON.parse(readFileSync(lookup('../../package.json'))).bin['dafeiyu-standalone']);
const binary=process.env.DSH_CHATBOT_ELECTRON_PATH || join(process.env.DSH_HOME || join(homedir(),'.dsh'),'electron/Electron.app/Contents/MacOS/Electron');
const wrapper=join(temp,'observe-electron.sh');
writeFileSync(wrapper,'#!/bin/sh\nexec "$CHATPET_PROBE_ELECTRON" "$CHATPET_PROBE_SOURCE" "$@"\n',{mode:0o700});
let body,available,origin,sessionId='original',turn=null,messages=[{id:1,role:'assistant',text:'绑定伙伴的历史'}],polls=0;
const actions=[];
const snapshot=()=>({workspaceId:'test',sessionId,messages,turn,generating:turn!==null,live:'',reason:actions.at(-1)==='stop'?'aborted':'completed'});
const chat={snapshot:()=>{
  if(actions.at(-1)==='stop' && ++polls===1)messages.push({id:3,role:'assistant',text:'宿主随后更新的记录'});
  return snapshot();
},run(action,input) {
  actions.push(action);
  if(action==='new') {sessionId='new';messages=[{id:1,role:'assistant',text:'新的原生会话'}];}
  if(action==='send') {assert.equal(input.sessionId,'new');assert.equal(input.text,'临时测试');messages.push({id:2,role:'user',text:input.text});turn=1;}
  if(action==='stop'){assert.equal(input.turn,1);turn=null;}
  return snapshot();
}};
const ctx={logger:console,get:()=>undefined,on:()=>()=>{},connection:{broadcast(){}},webServer:{getOrigin:()=>origin},
  petCore:{workspace:{status:()=>({state:'ready',target:{id:'test',path:repo}}),companionSettings:()=>({...DEFAULT_COMPANION_SETTINGS,desktopSize:216})}},
  petDesktop:{chat,recordPlayback(){},onPresentation(fn,active){body=fn;available=active;return ()=>{};},features:{
    restore(){body('sleep',{sleeping:false,pending:false});},
    request(input){
      const sleeping=input.path.split('?')[0]==='/sleep';
      body('sleep',{sleeping,pending:false,start:'sleep-start',loop:'sleep-loop',end:'sleep-end'});
      if(!sleeping)setTimeout(()=>body('say',{text:'来自房间的提醒',automatic:true,life:true}),400);
      return {ok:true};
    }
  }}};
const platform=new PetPlatform(ctx);
const server=createServer((req,res)=>platform.http(req,res));
async function run(mode,file) {
  const report=join(temp,mode+'.json');
  const env={...process.env,DSH_CHATBOT_ELECTRON_PATH:wrapper,CHATPET_PROBE_MODE:mode,CHATPET_PROBE_ELECTRON:binary,
    CHATPET_PROBE_SOURCE:lookup('../../tests/desktop/standalone-window-probe.cjs'),CHATPET_PROBE_RESULT:report};
  const child=spawn(cli,file?['--connection',file]:[],{env,stdio:['ignore','inherit','inherit']});
  const timeout=setTimeout(()=>child.kill('SIGTERM'),24000);
  try {const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});assert.equal(code,0);}
  finally {clearTimeout(timeout);}
  assert.equal(JSON.parse(readFileSync(report)).mode,mode);
}
try {
  await run('offline');
  await new Promise((ok,no)=>server.once('error',no).listen(0,'127.0.0.1',ok));
  origin='http://127.0.0.1:'+server.address().port;
  const {file}=platform.standaloneAccess('test');
  await run('online',file);
  assert.deepEqual(actions,['open','new','send','stop']);assert.ok(polls>0);assert.ok(available);
  console.log(JSON.stringify({status:'passed',entry:'dafeiyu-standalone',offlineBody:true,offlineSleep:true,onlineChatActions:actions,sharedRoomBubble:true,externalModels:0}));
} finally {
  platform.close();server.closeAllConnections();server.close();rmSync(temp,{recursive:true,force:true});
}
