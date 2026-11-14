import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import assert from 'node:assert/strict';
const binary = process.env.DSH_CHATBOT_ELECTRON_PATH || join(process.env.DSH_HOME || join(homedir(),'.dsh'),'electron/Electron.app/Contents/MacOS/Electron');
for (let cycle=0;cycle<2;cycle++) {
  const env={...process.env}; delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(binary,[join(import.meta.dirname,'../src/desktop/helper/main.cjs')],{env,stdio:['pipe','pipe','pipe']});
  let errors=''; child.stderr.on('data',data=>{errors+=data;});
  const exited=new Promise((resolve,reject)=>{child.once('exit',(code,signal)=>resolve({code,signal}));child.once('error',reject);});
  const lines=createInterface({input:child.stdout});
  let timeout;
  try {
    await Promise.race([new Promise(resolve=>lines.on('line',line=>{
      const msg=JSON.parse(line);
      if(msg.type==='request' && msg.action==='preferences') child.stdin.write(JSON.stringify({type:'response',value:{id:msg.id,ok:true,result:{desktopClickSound:false,desktopReplyBubble:true,desktopWhisperEnabled:false,desktopBubbleSeconds:10}}})+'\n');
      if(msg.type==='ready') resolve();
      if(msg.type==='request' && msg.action!=='preferences') child.stdin.write(JSON.stringify({type:'response',value:{id:msg.id,ok:true,result:null}})+'\n');
    })),exited.then(()=>{throw Error('Helper exited before ready: '+errors);}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Helper startup timeout: '+errors)),15000);})]);
    clearTimeout(timeout);
    child.stdin.end();
    const result=await Promise.race([exited,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Helper did not stop: '+errors)),3000);})]);
    assert.deepEqual(result,{code:0,signal:null});
    console.log(JSON.stringify({check:'real-desktop-lifecycle',cycle:cycle+1,status:'passed'}));
  } finally {clearTimeout(timeout);lines.close();if(child.exitCode===null) child.kill('SIGKILL');}
}
