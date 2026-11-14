// Exercise the shipped 3D view and native message port against a disposable,
// persisted Room. No user profile, TV capture or platform account is used.
const {app, BrowserWindow, protocol, session} = require('electron');
const assert = require('node:assert/strict');
const {mkdtempSync, mkdirSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {setTimeout:delay} = require('node:timers/promises');
const root = mkdtempSync(join(tmpdir(),'chatpet-room-interactions-')), data = join(root,'room');
mkdirSync(data);
app.setPath('userData',join(root,'profile'));
app.on('quit',()=>{try{rmSync(root,{recursive:true,force:true});}catch{}});
protocol.registerSchemesAsPrivileged([{scheme:'room-fixture',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:true}}]);

async function until(read) {
  const end=Date.now()+30000;
  while (Date.now()<end) {const value=await read();if (value) return value;await delay(120);}
  throw Error('Timed out waiting for '+read.toString().slice(0,180));
}
async function main() {
  const {CompanionRoom}=await import('../dist/src/life/room.js'), {roomAsset}=await import('../dist/src/room/assets.js');
  const {loadHomeState,saveHomeState}=await import('#feiyu-home');
  const started=Date.now(), baseline=new Date(started), evening=process.argv.includes('--evening');
  baseline.setHours(evening?20:12,0,0,0);
  const now=()=>baseline.getTime()+Date.now()-started;
  const body=join(data,'home.json');
  saveHomeState(body,loadHomeState(body,now()),now());
  let room=new CompanionRoom(data,()=>undefined);
  const view=()=>room.view(now());
  await app.whenReady();
  const isolated=session.fromPartition('room-fixture');
  isolated.setPermissionRequestHandler((_c,_p,done)=>done(false));
  isolated.webRequest.onBeforeRequest((d,done)=>done({cancel:!['room-fixture://scene/','blob:room-fixture://scene/','data:'].some(prefix=>d.url.startsWith(prefix))}));
  const shell=`<!doctype html><meta charset="utf-8"><style>*{margin:0;border:0}iframe{width:100vw;height:100vh;display:block}</style>
    <iframe id="house"></iframe><script>
    addEventListener('message',async e=>{
      if(e.source!==house.contentWindow || e.origin!==location.origin || e.data.kind!=='chatpet.room')return;
      const res=await fetch('/fixture',{method:'POST',body:JSON.stringify(e.data)});
      e.ports[0].postMessage(await res.json()); e.ports[0].close();
    });
    house.src='/chatpet-room/?q=balanced&char=webm&clickmove=0';
    </script>`;
  const commands=[];
  isolated.protocol.handle('room-fixture',async req=>{
    if (req.url==='room-fixture://scene/') return new Response(shell,{headers:{'Content-Type':'text/html'}});
    if (req.url==='room-fixture://scene/fixture' && req.method==='POST') {
      const {endpoint,data:input}=await req.json();
      let value;
      if (endpoint==='roomState') value={...view(),lifeEnabled:true};
      if (endpoint==='roomGarden') value=room.garden('state',{},false,now());
      if (endpoint==='roomHistory') value={messages:[]};
      if (endpoint==='roomAction') {commands.push(input);value=room.act(input,'伙伴',now());}
      return Response.json({ok:!!value,value});
    }
    return roomAsset(req);
  });
  const win=new BrowserWindow({width:1280,height:900,useContentSize:true,show:false,webPreferences:{
    session:isolated,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const inside=async code=>{
    const child=win.webContents.mainFrame.frames[0];
    return child ? child.executeJavaScript(code) : null;
  };
  await win.loadURL('room-fixture://scene/');
  await until(()=>view().room.visits===1);
  await inside("document.querySelector('[data-act=talk]').click();document.getElementById('talkInput').value='一起看海';document.getElementById('talkSend').click()");
  await until(()=>view().room.notes.some(n=>n.text==='一起看海'));
  await until(async()=>await inside("document.getElementById('visitorNotes')?.textContent.includes('一起看海')"));
  const before=view().env.lamp;
  assert.equal(before, evening);
  assert.equal(view().room.lamp,before);
  const command=()=>inside("document.getElementById('lamp').textContent");
  assert.equal(await command(),before?'关灯':'开灯');
  await inside("document.getElementById('lamp').click()");
  await until(()=>commands.some(c=>c.action==='lamp' && c.on===!before));
  await until(async()=>await command()===(!before?'关灯':'开灯'));
  assert.equal(view().env.lamp,!before);
  // Project an original furniture picking cylinder using the camera state
  // that the running room exposes for its own rendering checks.
  const furniture=await inside(`(async()=>{
    const THREE=await import('./vendor/three.module.js'), debug=window.__homeDebug();
    const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,0.08,120);
    camera.position.fromArray(debug.camera);camera.quaternion.fromArray(debug.cameraQuat);camera.updateMatrixWorld(true);
    const canvas=document.querySelector('canvas');
    for (const [x,z] of [[7.85,1.75],[1.5,2.7],[4.95,4.6],[9.5,3.15],[11.4,1.32]]) {
      const p=new THREE.Vector3(x,.62,z).project(camera);
      for (const type of ['pointerdown','pointerup']) canvas.dispatchEvent(new PointerEvent(type,{button:0,pointerId:1,
        clientX:(p.x+1)*innerWidth/2,clientY:(1-p.y)*innerHeight/2,bubbles:true}));
      const info=document.getElementById('info');
      if (!info.classList.contains('hide') && info.dataset.spot) {
        const target=info.dataset.spot;document.getElementById('infoGo').click();return target;
      }
    }
    throw Error('Furniture did not open');
  })()`);
  await until(()=>commands.some(c=>c.action==='command' && c.spot===furniture));
  room.flush();
  room=new CompanionRoom(data,()=>undefined);
  await win.loadURL('room-fixture://scene/');
  await until(async()=>await inside("document.getElementById('visitorNotes')?.textContent.includes('一起看海')"));
  assert.equal(await inside("document.getElementById('visitorBoard').open=true;document.getElementById('visitorNotes').getBoundingClientRect().height>0"),true);
  assert.equal(view().room.visits,1);
  assert.equal(view().room.counts.talk,1);
  assert.equal(room.state.command?.spot ?? room.state.route?.target?.spot ?? room.state.dwell?.target?.spot,furniture);
  assert.equal(view().room.lamp,!before);
  assert.equal(view().env.lamp,!before);
  assert.equal(await command(),!before?'关灯':'开灯');
  console.log(JSON.stringify({ok:true,visits:1,notes:1,furniture,lampBefore:before,lampAfter:!before,persisted:true,paidCalls:0}));
  win.destroy();
}
main().then(()=>app.exit(0),e=>{console.error(e);app.exit(1);});
