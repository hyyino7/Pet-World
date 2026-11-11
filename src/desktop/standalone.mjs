#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {constants, existsSync, fstatSync, openSync, readFileSync, closeSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';
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
  const binary = process.env.DSH_CHATBOT_ELECTRON_PATH || join(process.env.DSH_HOME || join(homedir(),'.dsh'),'electron/Electron.app/Contents/MacOS/Electron');
  if (!existsSync(binary)) throw Error('找不到 Electron，请设置 DSH_CHATBOT_ELECTRON_PATH');
  const env = {...process.env}; delete env.ELECTRON_RUN_AS_NODE;
  const helper = spawn(binary,[fileURLToPath(new URL('./helper/main.cjs',import.meta.url))],{env,stdio:['pipe','pipe','inherit']});
  const abort = new AbortController();
  const write = (type,value) => { if (helper.stdin.writable && !helper.stdin.destroyed) helper.stdin.write(JSON.stringify({type,value})+'\n'); };
  helper.stdin.on('error',()=>{});
  async function fetchFromHost(path,method='GET',body) {
    if (!remote) throw Error('当前为离线陪伴，在大肥鱼的桌宠设置中生成连接文件即可开启对话。');
    const result = await fetch(remote.baseUrl+'/'+path,{method,body,redirect:'error',
      signal:AbortSignal.any([abort.signal,AbortSignal.timeout(60000)]),
      headers:{Authorization:'Bearer '+remote.token,...(body ? {'Content-Type':'application/json'} : {})}});
    if (!result.ok) {
      const denied=result.status===401 || result.status===403;
      throw Object.assign(Error(denied ? '当前绑定已改变，请重新生成连接文件' : 'DSH 暂时无法完成此操作'),{denied});
    }
    if (result.headers.get('content-type')?.includes('audio/')) return {audio:Buffer.from(await result.arrayBuffer()).toString('base64'),mediaType:'audio/mpeg'};
    return result.json();
  }
  let following=false, polling=false, revision='', sleeping=false, timer, watching=false;
  let prefs = structuredClone(DEFAULT_COMPANION_SETTINGS);
  const currentBody=new Map();
  async function followBody() {
    if(watching)return;
    watching=true;
    let counter,offline=false;
    while(!abort.signal.aborted) {
      try {
        const state=await fetchFromHost(counter===undefined ? 'state' : 'state?since='+counter+'&timeout=10000');
        const frames=Object.entries(state.sections)
          .filter(([key,leaf])=>key.startsWith('nativeBody/') && leaf.counter>(counter??0))
          .sort((a,b)=>a[1].counter-b[1].counter);
        for(const [key,leaf] of frames) {
          const type=key.slice('nativeBody/'.length);
          const persistent=['preferences','sleep','work'].includes(type);
          if(persistent)currentBody.set(type,leaf.data);
          if(type==='preferences')prefs=leaf.data;
          if(counter!==undefined || persistent)write(type,leaf.data);
        }
        counter=state.counter;
        offline=false;
      } catch(error) {
        if(abort.signal.aborted)return;
        if(!offline)write('notice',{text:error.denied ? error.message : '独立桌宠正在等待 DSH 重新连接。'});
        if(error.denied) {
          following=false;update({sessionId:null,messages:[],generating:false,live:''});
          return;
        }
        offline=true;
        await pause(1500,undefined,{signal:abort.signal}).catch(()=>{});
      }
    }
  }
  function update(snapshot) {
    const next = JSON.stringify(snapshot);
    if (next !== revision) { revision=next; write('chat',snapshot); }
    return snapshot;
  }
  async function command(action,input) {
    if (action === 'preferences') {
      if(remote)try { prefs=await fetchFromHost('native-preferences'); } catch { /* Display the local pet while disconnected. */ }
      return prefs;
    }
    if (action === 'playback') {
      if(remote)return fetchFromHost('native-playback','POST',JSON.stringify(input));
      return;
    }
    if (action === 'desktop-preference') {
      if(remote) {
        prefs=await fetchFromHost('native-preferences','POST',JSON.stringify(input));
        write('preferences',prefs);
        return prefs;
      }
      const allowed = ['desktopClickSound','desktopFixed','desktopConfineToScreen','desktopReplyBubble'];
      if (!allowed.includes(input?.key) || typeof input.value !== 'boolean') throw Error('此设置需要在 DSH 打开');
      prefs[input.key] = input.value; write('preferences',prefs); return prefs;
    }
    if (['open','new','send','stop','open-session'].includes(action)) {
      const result = await fetchFromHost('native-chat','POST',JSON.stringify({action:action === 'open-session' ? 'open' : action,input}));
      following = true;
      return update(result);
    }
    if (action === 'desktop-api') {
      const path = String(input?.path ?? '').replace(/^\//,'');
      const feature=path.split('?')[0];
      if (!remote && (feature === 'sleep' || feature === 'wake')) {
        sleeping = feature === 'sleep';
        const frame=sleeping ? {sleeping,pending:false,start:'sleep-start',loop:'sleep-loop',end:'sleep-end'} : {sleeping,pending:false};
        currentBody.set('sleep',frame);write('sleep',frame);write('sleep-text',{sleeping});return {ok:true};
      }
      if (!/^(?:voice\/(?:hear|speak|voices)|todos(?:\/[\w-]+)?|whisper|sleep|wake|balance)(?:\?|$)/.test(path)) throw Error('桌宠操作无效');
      if(['sleep','wake','whisper','balance'].includes(feature))return fetchFromHost('native-feature','POST',JSON.stringify(input));
      return fetchFromHost(path,input.method,input.body);
    }
    throw Error('此操作需要在 DSH 打开');
  }
  const lines=createInterface({input:helper.stdout});
  lines.on('line',line=>{
    let item; try { item=JSON.parse(line); } catch { return; }
    if (item.type==='ready') {
      write('preferences',prefs);
      for(const [type,value] of currentBody)if(type!=='preferences')write(type,value);
      if(remote)void followBody();
      return;
    }
    if (item.type==='request') void command(item.action,item.input).then(
      result=>write('response',{id:item.id,ok:true,result}), error=>write('response',{id:item.id,ok:false,error:error.message}));
  });
  if (remote) timer = setInterval(async()=>{
    if (!following || polling) return;
    polling=true;
    try { update(await fetchFromHost('native-chat')); }
    catch { following=false; write('notice',{text:'独立窗口已与 DSH 断开，请重新打开聊天。'}); }
    finally { polling=false; }
  },500);
  const stop = () => { abort.abort(); helper.stdin.end(); };
  process.once('SIGINT',stop); process.once('SIGTERM',stop);
  try {
    const result = await new Promise((resolve,reject)=>{helper.once('exit',resolve);helper.once('error',reject);});
    if (typeof result === 'number') process.exitCode = result;
  } finally { clearInterval(timer); abort.abort(); lines.close(); process.off('SIGINT',stop); process.off('SIGTERM',stop); }
}
start().catch(error=>{ console.error(error.message); process.exitCode=1; });
