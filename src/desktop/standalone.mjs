#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {constants, existsSync, fstatSync, openSync, readFileSync, closeSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DEFAULT_COMPANION_SETTINGS} from '../../dist/src/core/companion-settings.js';

function connection(file) {
  if (!file) return;
  const fd = openSync(file,constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > 8192 || st.nlink !== 1 || (process.getuid && (st.uid !== process.getuid() || (st.mode & 0o077)))) {
      throw Error('请选择桌宠设置生成的本机私有连接文件');
    }
    const {baseUrl,token} = JSON.parse(readFileSync(fd,'utf8'));
    const url = new URL(baseUrl);
    if (url.pathname !== '/chatpet-presentation' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) ||
      !['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || typeof token !== 'string' || !token) {
      throw Error('独立桌宠连接文件无效');
    }
    return {baseUrl:url.href,token};
  } finally { closeSync(fd); }
}

async function start() {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 2 && args[0] === '--connection')) {
    console.log('Usage: dafeiyu-standalone [--connection PATH]'); return;
  }
  const remote = connection(args[1]);
  // Connected launch addresses the managed presentation; it never creates a second body.
  if (remote) {
    for (const [path,body] of [['presentation',{action:'show'}],['native-chat-window',{}]]) {
      const response=await fetch(remote.baseUrl+'/'+path,{method:'POST',redirect:'error',
        signal:AbortSignal.timeout(60000),headers:{Authorization:'Bearer '+remote.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!response.ok)throw Error(response.status===401 || response.status===403 ? '当前绑定已改变，请重新生成连接文件' : 'DSH 暂时无法打开桌宠');
      const value=await response.json();
      if(value.ok===false)throw Error(value.message || 'DSH 暂时无法打开桌宠');
    }
    console.log('已打开当前大肥鱼和原生聊天窗口。');
    return;
  }
  const binary = process.env.DSH_CHATBOT_ELECTRON_PATH || join(process.env.DSH_HOME || join(homedir(),'.dsh'),'electron/Electron.app/Contents/MacOS/Electron');
  if (!existsSync(binary)) throw Error('找不到 Electron，请设置 DSH_CHATBOT_ELECTRON_PATH');
  const env = {...process.env}; delete env.ELECTRON_RUN_AS_NODE;
  const helper = spawn(binary,[fileURLToPath(new URL('./helper/main.cjs',import.meta.url))],{env,stdio:['pipe','pipe','inherit']});
  const write = (type,value) => { if (helper.stdin.writable && !helper.stdin.destroyed) helper.stdin.write(JSON.stringify({type,value})+'\n'); };
  helper.stdin.on('error',()=>{});
  const offlineMessage='当前为离线陪伴，在大肥鱼的桌宠设置中生成连接文件即可开启对话。';
  let sleeping=false;
  const prefs = structuredClone(DEFAULT_COMPANION_SETTINGS);
  const currentBody=new Map();
  async function command(action,input) {
    if (action === 'preferences') return prefs;
    // An unbound offline sprite has no companion identity or history to claim.
    if (action === 'identity') return {displayName:''};
    if (action === 'playback') return;
    if (action === 'desktop-preference') {
      const allowed = ['desktopClickSound','desktopFixed','desktopConfineToScreen','desktopReplyBubble'];
      if (!allowed.includes(input?.key) || typeof input.value !== 'boolean') throw Error('此设置需要在 DSH 打开');
      prefs[input.key] = input.value; write('preferences',prefs); return prefs;
    }
    if (['open','new','send','stop','open-session'].includes(action)) throw Error(offlineMessage);
    if (action === 'desktop-api') {
      const path = String(input?.path ?? '').replace(/^\//,'');
      const feature=path.split('?')[0];
      if (feature === 'sleep' || feature === 'wake') {
        sleeping = feature === 'sleep';
        const frame=sleeping ? {sleeping,pending:false,start:'sleep-start',loop:'sleep-loop',end:'sleep-end'} : {sleeping,pending:false};
        currentBody.set('sleep',frame);write('sleep',frame);write('sleep-text',{sleeping});return {ok:true};
      }
      if (!/^(?:voice\/(?:hear|speak|voices)|todos(?:\/[\w-]+)?|whisper|sleep|wake|balance)(?:\?|$)/.test(path)) throw Error('桌宠操作无效');
      throw Error(offlineMessage);
    }
    throw Error('此操作需要在 DSH 打开');
  }
  const lines=createInterface({input:helper.stdout});
  lines.on('line',line=>{
    let item; try { item=JSON.parse(line); } catch { return; }
    if (item.type==='ready') {
      write('preferences',prefs);
      for(const [type,value] of currentBody)if(type!=='preferences')write(type,value);
      return;
    }
    if (item.type==='request') void command(item.action,item.input).then(
      result=>write('response',{id:item.id,ok:true,result}), error=>write('response',{id:item.id,ok:false,error:error.message}));
  });
  const stop = () => { helper.stdin.end(); };
  process.once('SIGINT',stop); process.once('SIGTERM',stop);
  try {
    const result = await new Promise((resolve,reject)=>{helper.once('exit',resolve);helper.once('error',reject);});
    if (typeof result === 'number') process.exitCode = result;
  } finally { lines.close(); process.off('SIGINT',stop); process.off('SIGTERM',stop); }
}
start().catch(error=>{ console.error(error.message); process.exitCode=1; });
