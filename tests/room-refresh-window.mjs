// The actual Room process, preload, scene and Behavior share only a disposable
// workspace. Disable only the fixture's fallback poll to prove event delivery.
import {createServer} from 'node:http';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {CompanionBehavior} from '../dist/src/behavior/plugin.js';
import {Room} from '../dist/src/room/plugin.js';
import {roomAsset} from '../dist/src/room/assets.js';
import {emptyHomeState} from '#feiyu-home';

const temporary=realpathSync(mkdtempSync(join(tmpdir(),'room-event-window-')));
const directory=join(temporary,'.chatpet/data/life');mkdirSync(directory,{recursive:true});
writeFileSync(join(directory,'home.json'),JSON.stringify(emptyHomeState()));
let target={id:'fixture',path:temporary,sessionIds:[]},origin,behavior,room,ready=false,reads=0;
let emotion={label:'初始心情',feelings:['calm'],updatedAt:1};
const events=new Map(),views=[];
const emit=(name,...args)=>{for(const listener of events.get(name) ?? [])listener(...args);};
const host={native:{},workspace:{status:()=>({state:'ready',target}),storageId:()=>target.id}};
const registry={get:id=>id===target.id?target:undefined,archivedSessionIds:[]};
const ctx={petCore:host,workspaceRegistry:registry,
  get(name){return name==='petBehavior'?behavior:name==='petEmotion'?{read:async()=>{},roomSnapshot:()=>emotion}:name==='webServer'?{getOrigin:()=>origin}:undefined;},
  get petBehavior(){return behavior;},emit,
  on(name,listener){const listeners=events.get(name) ?? new Set();events.set(name,listeners);listeners.add(listener);return()=>listeners.delete(listener);},
};
const until=async(read,label,ms=16000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await read())return;await delay(15);}throw Error('Timed out: '+label);};
const injection=`<script type="module">
 const report=()=>fetch('/fixture-view',{method:'POST',body:JSON.stringify({activity:document.getElementById('activityText')?.textContent,emotion:document.getElementById('emotionChip')?.textContent})});
 const observer=new MutationObserver(report);observer.observe(document.getElementById('activityText'),{childList:true});observer.observe(document.getElementById('emotionChip'),{childList:true});
 const timer=setInterval(()=>{if(document.getElementById('loading')?.classList.contains('hide')){clearInterval(timer);void report();void fetch('/fixture-ready');}},20);
</script>`;
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/fixture-ready'){ready=true;res.end('ok');return;}
  if(req.url==='/fixture-view'){let raw='';for await(const chunk of req)raw+=chunk;views.push({...JSON.parse(raw),at:Date.now()});res.end('ok');return;}
  const response=await roomAsset(new Request('http://127.0.0.1'+req.url,{method:req.method}));
  const headers=Object.fromEntries(response.headers);delete headers['content-length'];res.writeHead(response.status,headers);
  let body=Buffer.from(await response.arrayBuffer());
  if(req.url==='/chatpet-room/index.html')body=Buffer.concat([body,Buffer.from(injection)]);
  if(req.url==='/chatpet-room/app.js'){
    const source=body.toString(),marker='const companionPollTimer = setInterval(poll, 1200);';
    assert.equal(source.split(marker).length,2);body=Buffer.from(source.replace(marker,'const companionPollTimer = setInterval(poll, 120000);'));
  }
  res.end(body);
 }catch(error){res.writeHead(500);res.end(String(error));}
});
let held=false,heldReady,releaseHeld;
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 origin='http://127.0.0.1:'+server.address().port;
 behavior=new CompanionBehavior(ctx,host);room=new Room(ctx);
 const request=room.request.bind(room);
 room.request=async(...args)=>{
   const value=await request(...args);if(args[1]==='roomState'){reads++;if(held){held=false;heldReady();await new Promise(resolve=>{releaseHeld=resolve;});}}
   return value;
 };
 await room.open(target.id);await until(()=>ready && reads>=2,'initial snapshot, native subscription and scene');
 await delay(50);const before=reads;
 room.window.changed({workspaceId:'another-workspace',bootId:behavior.bootId,revision:1000});
 await delay(70);assert.equal(reads,before,'unrelated workspace changes do not wake this Room');
 const started=Date.now(),result=await behavior.act(target.id,'feed');
 await until(()=>views.some(view=>view.at>=started && view.activity.includes(result.home.her.activity)),'body event appears without 1200ms poll',1000);
 const latency=views.find(view=>view.at>=started && view.activity.includes(result.home.her.activity)).at-started;
 assert.ok(latency<1000,JSON.stringify({latency}));

 // An old in-flight response must not overwrite a newer Emotion revision.
 held=true;const captured=new Promise(resolve=>{heldReady=resolve;});
 emotion={label:'过时的难过',feelings:['sad'],updatedAt:2};emit('pet/emotion.changed',target.id,{});
 await captured;
 emotion={label:'最新的开心',feelings:['happy'],updatedAt:3};emit('pet/emotion.changed',target.id,{});
 await behavior.snapshot(target.id);releaseHeld();
 await until(()=>views.some(view=>view.emotion.includes('最新的开心')),'queued refresh after in-flight response');
 assert.ok(!views.some(view=>view.emotion.includes('过时的难过')),'stale revision is never painted');

 // Existing bootId/revision also rejects a response from an unloaded service.
 held=true;const oldBootCaptured=new Promise(resolve=>{heldReady=resolve;});
 emotion={label:'旧一代状态',feelings:['worry'],updatedAt:4};emit('pet/emotion.changed',target.id,{});
 await oldBootCaptured;await behavior.close();
 emotion={label:'新一代状态',feelings:['calm'],updatedAt:5};behavior=new CompanionBehavior(ctx,host);
 await behavior.snapshot(target.id);releaseHeld();
 await until(()=>views.some(view=>view.emotion.includes('新一代状态')),'replacement Behavior generation');
 assert.ok(!views.some(view=>view.emotion.includes('旧一代状态')),'old generation never overwrites replacement');
 console.log(JSON.stringify({ok:true,nativeWindow:true,preloadBridge:true,bodyMirrorMs:latency,fallbackPollDisabledForFixture:true,
   wrongWorkspaceIgnored:true,staleRevisionRejected:true,oldBootRejected:true,reads,modelCalls:0,personalProfile:false}));
}finally{
 releaseHeld?.();await room?.close();await behavior?.close();server.closeAllConnections();
 if(server.listening)await new Promise(resolve=>server.close(resolve));rmSync(temporary,{recursive:true,force:true});
}
