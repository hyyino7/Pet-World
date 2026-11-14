import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import {PassThrough,Writable} from 'node:stream';
import {createInterface} from 'node:readline';
import {constants,mkdtempSync,writeFileSync,readFileSync,openSync,closeSync,fstatSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {DEFAULT_COMPANION_SETTINGS} from '../dist/src/core/companion-settings.js';

const entry=new URL('../src/desktop/standalone.mjs',import.meta.url);

/** Actual CLI control flow, isolated at fs/child/display/network boundaries.
 * The child is an in-memory stream, never Electron or another process. */
function fixture(t,args=[]) {
  const root=mkdtempSync(join(tmpdir(),'standalone-code-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const frames=[],requests=[],hooks=new Map(),waiters=new Map();let spawns=0;
  const helper=new EventEmitter();helper.stdout=new PassThrough();
  helper.stdin=new Writable({write(chunk,_encoding,next){
    for(const line of String(chunk).trim().split('\n'))if(line){const frame=JSON.parse(line);frames.push(frame);
      if(frame.type==='response'){const pending=waiters.get(frame.value.id);waiters.delete(frame.value.id);frame.value.ok?pending?.resolve(frame.value.result):pending?.reject(Error(frame.value.error));}}
    next();
  }});
  const fakeProcess={argv:['node','standalone',...args],env:{DSH_CHATBOT_ELECTRON_PATH:'/fixture/electron'},
    getuid:process.getuid?.bind(process),exitCode:undefined,
    once:(name,fn)=>hooks.set(name,fn),off:(name,fn)=>{if(hooks.get(name)===fn)hooks.delete(name);}};
  let sequence=0;
  const request=(action,input)=>new Promise((resolve,reject)=>{const id=++sequence;waiters.set(id,{resolve,reject});helper.stdout.write(JSON.stringify({type:'request',id,action,input})+'\n');});
  const source=readFileSync(entry,'utf8').replace(/^#![^\n]*\n/,'').replace(/^import .*;\n/gm,'')
    .replaceAll('import.meta.url',JSON.stringify(entry.href))
    .replace(/start\(\)\.catch\([^\n]+\);\s*$/,'globalThis.startStandalone=start;');
  const context=vm.createContext({process:fakeProcess,console,constants,fstatSync,openSync,readFileSync,closeSync,
    existsSync:()=>true,homedir:()=>root,join,fileURLToPath,createInterface,structuredClone,URL,AbortSignal,DEFAULT_COMPANION_SETTINGS,
    spawn:()=>{spawns++;return helper;},
    fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({ok:true})};},
    setInterval:()=>assert.fail('The CLI must not retain its obsolete polling loop'),
  });
  vm.runInContext(source,context,{filename:fileURLToPath(entry)});
  t.after(()=>{helper.stdout.destroy();helper.stdin.destroy();});
  return {root,frames,requests,hooks,helper,request,start:()=>context.startStandalone(),spawns:()=>spawns,
    connection(value){const file=join(root,'connection.json');writeFileSync(file,JSON.stringify(value),{mode:0o600});return file;}};
}

test('connected standalone delegates to the managed presentation and chat without creating another child or polling',async t=>{
  const f=fixture(t),file=f.connection({baseUrl:'http://127.0.0.1:7340/chatpet-presentation',token:'fixture-token'});
  // A fresh context selects the normal CLI argument path with this private file.
  const connected=fixture(t,['--connection',file]);await connected.start();
  assert.equal(connected.spawns(),0);assert.equal(connected.requests.length,2);
  assert.deepEqual(connected.requests.map(row=>new URL(row.url).pathname),['/chatpet-presentation/presentation','/chatpet-presentation/native-chat-window']);
  assert.ok(connected.requests.every(row=>row.options.headers.Authorization==='Bearer fixture-token'));
});

test('offline standalone completes the actual shell handshake, retains local controls and refuses model or host actions',async t=>{
  const f=fixture(t),run=f.start();assert.equal(f.spawns(),1);
  t.after(async()=>{f.helper.emit('exit',0);await run;});
  f.helper.stdout.write('{"type":"ready"}\n');
  const catalog=JSON.parse(readFileSync(new URL('../src/desktop/assets/catalog.json',import.meta.url),'utf8'));
  const defaults=JSON.parse(readFileSync(new URL('../src/desktop/assets/interaction.json',import.meta.url),'utf8'));
  const shell=readFileSync(new URL('../src/desktop/helper/shell.js',import.meta.url),'utf8');
  const preamble=shell.slice(0,shell.indexOf('  let settings = preferences;')).replace('void (async () => {','globalThis.shellReady = (async () => {');
  const handshake=vm.runInNewContext(preamble+'globalThis.handshake={catalog,geometry,preferences,defaults,identity};})();',{
    window:{pet:{call:(action,input)=>action==='catalog'?Promise.resolve(catalog):action==='geometry'?Promise.resolve({displays:[]}):f.request(action,input)}},
    fetch:async()=>({json:async()=>defaults}),
  });
  await handshake;
  // These are the exact startup requests made by the retained shell above.
  assert.ok(catalog.actions.length>0);assert.equal((await f.request('identity')).displayName,'');
  assert.equal((await f.request('preferences')).desktopReplyBubble,DEFAULT_COMPANION_SETTINGS.desktopReplyBubble);
  await f.request('desktop-preference',{key:'desktopFixed',value:true});
  assert.equal((await f.request('preferences')).desktopFixed,true);
  await f.request('desktop-api',{path:'/sleep',method:'POST'});await f.request('desktop-api',{path:'/wake',method:'POST'});
  assert.deepEqual(f.frames.filter(frame=>frame.type==='sleep').map(frame=>frame.value.sleeping),[true,false]);
  await assert.rejects(f.request('send',{text:'This must not invoke a model'}),/离线陪伴/);
  for(const path of ['/whisper','/balance','/todos','/voice/speak'])await assert.rejects(f.request('desktop-api',{path,method:'POST'}),/离线陪伴/);
  await assert.rejects(f.request('desktop-preference',{key:'desktopWhisperEnabled',value:true}),/DSH/);
  assert.equal(f.requests.length,0,'Offline control performs no network or model calls');
  f.hooks.get('SIGTERM')();assert.equal(f.helper.stdin.writableEnded,true);
  f.helper.emit('exit',0);await run;assert.equal(f.hooks.size,0);
});

test('invalid standalone connection is rejected before any fetch or child startup',async t=>{
  const f=fixture(t),file=f.connection({baseUrl:'https://example.invalid/chatpet-presentation',token:'fixture-token'});
  const invalid=fixture(t,['--connection',file]);await assert.rejects(invalid.start(),/连接文件无效/);
  assert.equal(invalid.spawns(),0);assert.equal(invalid.requests.length,0);
});
