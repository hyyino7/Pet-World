// Isolated Chromium compositor regression; never connects to a running Room.
const {app,BrowserWindow}=require('electron');
const {readFileSync,writeFileSync,mkdtempSync,rmSync}=require('node:fs');
const {join,resolve}=require('node:path');const {tmpdir}=require('node:os');const {pathToFileURL}=require('node:url');const assert=require('node:assert/strict');
const temp=mkdtempSync(join(tmpdir(),'her-world-canvas-'));app.setPath('userData',join(temp,'profile'));
const source=readFileSync(process.env.CHATPET_FRAME_SOURCE||'vendor/feiyu-room-template/public/room/app.js','utf8');
const at=source.indexOf('  // 自适应：'),render=source.indexOf('  renderer.render(scene, camera);');
const frame=render>at?source.slice(at,source.indexOf('  world.setClock?.',at)):
  'renderer.render(scene,camera);'+source.slice(at,source.indexOf('\n}\n\n// 灯影刷新',at));
const html=join(temp,'index.html');
writeFileSync(html,`<style>body{margin:0;background:#0a1018}canvas{display:block;width:64px;height:64px}</style><canvas></canvas><script type="module">
import * as THREE from ${JSON.stringify(pathToFileURL(resolve('vendor/feiyu-room-template/public/room/vendor/three.module.js')).href)};
try {
 const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.setSize(64,64,false);renderer.setPixelRatio(1.35);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();scene.background=new THREE.Color(0x00ff00);renderer.render(scene,camera);
 let ratio=1.35,fpsN=0,fpsAcc=0,lastAdapt=0,now=0,elapsed=0,measuredFps=6,presentationResizePending=false,innerWidth=64,innerHeight=64;
 const tier='standard',SHOT=false,devicePixelRatio=2,presentationFps=()=>6;
 window.probe={draw(color,resize){scene.background.set(color);now+=10000;elapsed=resize?1/6:.5;fpsN=resize?0:59;fpsAcc=59*elapsed;
  if(resize){innerWidth=80;presentationResizePending=true;}
  const dt=Math.min(.2,elapsed);${frame}
 },lost:()=>renderer.getContext().isContextLost()};
} catch(e){window.failure=String(e)}
</script>`);
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:160,height:120,webPreferences:{offscreen:true,webSecurity:false,backgroundThrottling:false}});
 const wait=()=>new Promise(r=>setTimeout(r,40));
 const pixel=async()=>{await wait();const image=await win.webContents.capturePage({x:1,y:1,width:1,height:1});return Array.from(image.toBitmap().subarray(0,4));};
 try {
  await win.loadFile(html);for(let i=0;i<50&&!await win.webContents.executeJavaScript('!!window.probe');i++)await wait();
  assert.deepEqual(await pixel(),[0,255,0,255]);
  await win.webContents.executeJavaScript('probe.draw(0xff0000,false)');assert.deepEqual(await pixel(),[0,0,255,255],'Quality change must present the newly drawn scene, not the page background');
  await win.webContents.executeJavaScript('probe.draw(0x0000ff,true)');assert.deepEqual(await pixel(),[255,0,0,255],'Window resize must draw before presentation');
  assert.equal(await win.webContents.executeJavaScript('probe.lost()'),false);
  console.log('Canvas quality/resize compositor checks passed.');
 } catch(error){console.error(error);process.exitCode=1;}
 finally{win.destroy();rmSync(temp,{recursive:true,force:true});app.exit(process.exitCode||0);}
});
