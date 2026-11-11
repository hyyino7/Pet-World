import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,statSync,rmSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {PetPlatform} from '../dist/src/desktop/platform/plugin.js';

export function fixture(root,getOrigin=()=> 'http://127.0.0.1') {
  let target={id:'a',path:root}, turns=[], requests=0;
  const chat={id:'native-session',snapshot:()=>({workspaceId:'a',sessionId:'native-session',messages:turns,reason:'completed',generating:false}),
    run:async(action,input)=>{if(action==='send'){requests++;turns=[...turns,{id:requests*2,role:'user',text:input.text},{id:requests*2+1,role:'assistant',text:'native reply'}];}return chat.snapshot();}};
  const ctx={logger:console,connection:{broadcast(){}},get:()=>undefined,on:()=>()=>{},webServer:{getOrigin},
    petCore:{workspace:{status:()=>({state:'ready',target}),companionSettings:()=>({desktopSize:232,desktopFixed:false,desktopWorkStatusEnabled:true})}},petDesktop:{chat}};
  const platform=new PetPlatform(ctx);
  return {platform,rebind(id){target={...target,id};},requests:()=>requests};
}

test('bound platform runs original config, media, controls, animation and native chat',async()=>{
 const root=mkdtempSync(join(tmpdir(),'chatpet-platform-test-')), {platform,rebind,requests}=fixture(root);
 const request=(endpoint,method='GET',body)=>platform.handle(new URL('http://localhost/chatpet-presentation/'+endpoint),method,body?JSON.stringify(body):undefined,new AbortController().signal);
 try {
  const access=platform.ownerAccess('a'), tools=platform.controlAccess('a');
  assert.notEqual(access.token,tools.token);
  const conf=(await request('config')).obj;
  assert.equal(conf.main.pets[0].name,'大肥鱼');
  assert.equal(conf.main.pets[0].display,'web');
  const p=conf.main.pets[0];
  const multi=await request('config','PUT',{pets:[p,{...p,id:'second',name:'蓝鲸',position:{corner:'top-left',marginX:5,marginY:9}}]});
  assert.equal(multi.obj.main?.pets.length??multi.obj.ok,2,JSON.stringify(multi.obj));
  assert.deepEqual(platform.status().pets.map(x=>x.name),['大肥鱼','蓝鲸']);
  const pack=platform.status().packsDirectory;
  writeFileSync(join(pack,'mini-config.json'),JSON.stringify({pets:[{...p,id:'packpet',name:'自己的形象'}]}));
  mkdirSync(join(pack,'mini-animation'));writeFileSync(join(pack,'mini-animation','自定义.webm'),'my-pack');
  assert.equal(readFileSync((await request('thumb/mini/自定义.webm')).file,'utf8'),'my-pack');
  assert.equal((await request('thumb/main/点击回应-元气挥手.webm')).kind,'file');
  for(const name of conf.main.animations.baifan)assert.equal((await request('thumb/main/'+encodeURIComponent(name)+'.webm')).kind,'file');
  assert.equal((await request('pic/memes/main/可爱.png')).kind,'file');
  const anim=await request('anim?pet=second&surface=web','POST',{name:'螃蟹走路'});
  assert.equal(anim.obj.ok,true,JSON.stringify(anim.obj));
  assert.equal((await request('state')).obj.pets.second.anim.data.name,'螃蟹走路');
  assert.equal((await request('chat?pet=second','POST',{text:'和同一个伙伴聊天'})).obj.text,'native reply');
  assert.equal((await request('chat?pet=main')).obj.messages.at(-1).content,'native reply');
  assert.equal(requests(),1);
  const {file}=platform.standaloneAccess('a');
  assert.equal(statSync(file).mode&0o777,0o600);
  assert.equal(JSON.parse(readFileSync(file)).token,access.token);
  rebind('b');platform.sync();
  assert.equal(existsSync(file),false);
  assert.notEqual(platform.ownerAccess('b').token,access.token);
 }finally{platform.close();rmSync(root,{recursive:true,force:true});}
});

test('HTTP rejects visitor chat, accepts owner headers and confines media tokens to assets',async()=>{
 const root=mkdtempSync(join(tmpdir(),'chatpet-platform-web-')),{platform,requests}=fixture(root,()=> 'http://127.0.0.1:'+server.address().port);
 const server=createServer((req,res)=>platform.http(req,res));
 try{
  await new Promise((ok,no)=>server.once('error',no).listen(0,'127.0.0.1',ok));
  const base='http://127.0.0.1:'+server.address().port+'/chatpet-presentation';
  const owner=platform.ownerAccess('a'),control=platform.controlAccess('a');
  assert.equal(control.baseUrl,base);
  const action=await fetch(control.baseUrl+'/anim?pet=main&surface=web',{method:'POST',headers:{Authorization:'Bearer '+control.token},body:JSON.stringify({name:'螃蟹走路'})});
  assert.equal((await action.json()).ok,true);
  const req=(path,method='GET',token,body)=>fetch(base+'/'+path,{method,headers:token?{Authorization:'Bearer '+token}:{},body});
  assert.equal((await req('native-chat')).status,401);
  assert.equal((await req('chat?pet=main','POST',control.token,'{"text":"denied"}')).status,401);
  assert.equal(requests(),0);
  assert.equal((await req('m/'+owner.mediaToken+'/native-chat')).status,401);
  assert.equal((await req('m/'+owner.mediaToken+'/chat?pet=main','POST',undefined,'{"text":"denied"}')).status,401);
  const publicMedia=await req('m/'+owner.mediaToken+'/thumb/main/待机呼吸休闲.webm');
  assert.equal(publicMedia.status,200);assert.ok((await publicMedia.arrayBuffer()).byteLength>1024);
  assert.equal((await req('config','GET',owner.token)).status,200);
  assert.equal((await req('native-chat','POST',owner.token,JSON.stringify({action:'send',input:{text:'online'}}))).status,200);
  assert.equal(requests(),1);
 } finally {server.closeAllConnections();await new Promise(ok=>server.close(ok));platform.close();rmSync(root,{recursive:true,force:true});}
});
