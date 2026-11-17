import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,realpathSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {emptyHomeState} from '#feiyu-home';
import {createGarden} from '#feiyu-garden';
import {setTimeout as pause} from 'node:timers/promises';
import {corePlugin,behaviorPlugin,economyPlugin,lifePlugin,voicePlugin,channelsPlugin,memoryPlugin} from '../../dist/tests/behavior-list/entries.js';
export const value = result => {assert.equal(result.ok,true,JSON.stringify(result));return result.value;};
export const signal = () => new AbortController().signal;
export async function until(check, label='边界操作完成') {
  for(let i=0;i<300;i++){if(await check())return;await pause(2);}
  assert.fail(label);
}

// 假的仅为 DSH 服务、文件工具、模型响应；所有插件从 apply 入口安装。
// 原生日志写入临时目录；重新启动插件时只恢复这些磁盘日志。
export async function fixture(t,{now='2026-11-15T12:00:00Z',economy=true,life=true,recognizer,memory=false,channels=false,search}={}) {
  t.mock.timers.enable({apis:['Date'],now:Date.parse(now)});
  const root=realpathSync(mkdtempSync(join(tmpdir(),'behavior-list-'))),repo=join(root,'workspace');mkdirSync(repo);
  const config={dataDir:join(root,'core'),companionId:'fish',scopeId:'owner',ownerActorId:'owner',displayName:'Fixture',character:'Synthetic companion'};
  if(memory)config.memory={python:resolve('.venv/bin/python'),dataDir:join(repo,'.chatpet/data/memory')};
  let services,handlers,effects,agents,ctx,sections,contexts,tools,guards,flushAllowed=true,sequence=0;
  const warnings=[],sent=[],flushes=[];
  const logFile=id=>join(root,`native-${id}.json`);
  const workspace={id:'world',path:repo,sessionIds:['home','owner-b','guest'],async attachSession(id){if(!this.sessionIds.includes(id))this.sessionIds.push(id);}};
  const registry={get:id=>id==='world'?workspace:undefined,archivedSessionIds:[]};
  async function emit(name,...args){for(const fn of [...(handlers.get(name)??[])])await fn(...args);}
  async function middleware(name,args,end=async()=>undefined){
    const rows=[...(handlers.get(name)??[])];let i=0;
    const next=()=>{const fn=rows[i++];return fn?fn(...args,next):end();};return next();
  }
  function makeAgent(id){
    const events=existsSync(logFile(id))?JSON.parse(readFileSync(logFile(id),'utf8')):[];
    const localTools=new Map(),restrictions=new Set();
    const toolService={
      register(tool){localTools.set(tool.name,tool);return()=>localTools.delete(tool.name);},
      definitions(){return [...tools.values()].map(row=>row.tool).concat([...localTools.values()]);},
      restrict(mask){restrictions.add(mask);return()=>restrictions.delete(mask);},
      guard(fn){guards.add(fn);return()=>guards.delete(fn);},
    };
    const session={id,header:{id,cwd:repo,agentPreset:id==='guest'?'chatpet-channel-guest':'standard'},surface:{nodes:[]},
      get seq(){return events.length;},eventAt:seq=>events[seq],snapshotEvents:()=>events,
      append(type,data){const event={type,data,seq:events.length,time:Date.now()};events.push(event);session.surface.nodes.push(event.seq);return event;}};
    session.surface.nodes=events.map(event=>event.seq);
    const agent={id,session,status:'idle',inbox:{nextStep:[],nextTurn:[]},ctx:{...ctx,tools:toolService},
      whenIdle:async()=>{},cancel(){agent.status='idle';},
      steer(message){sent.push(message);agent.inbox.nextStep.push(message);void emit('agent/inbox/inserted',{agent,message});},
      followup(message){sent.push(message);agent.inbox.nextTurn.push(message);void emit('agent/inbox/inserted',{agent,message});}};
    agents.set(id,agent);return {agent,localTools,restrictions};
  }
  let agentInfo;
  async function start(){
    services=new Map();handlers=new Map();effects=[];agents=new Map();sections=new Set();contexts=new Set();tools=new Map();guards=new Set();
    const logger=Object.assign(()=>logger,{warn:(...args)=>warnings.push(args),error:(...args)=>warnings.push(args),info(){}});
    ctx={get:name=>services.get(name),provide(name,service){services.set(name,service);ctx[name]=service;},
      on(name,fn,options){const rows=handlers.get(name)??[];options?.prepend?rows.unshift(fn):rows.push(fn);handlers.set(name,rows);return()=>{const i=rows.indexOf(fn);if(i>=0)rows.splice(i,1);};},
      emit(name,...args){void emit(name,...args).catch(error=>warnings.push(error));},logger,
      effect(factory){const stop=factory();if(typeof stop==='function')effects.push(stop);return()=>{};},
      agents:{get:id=>agents.get(id),list:()=>[...agents.values()]},
      sessions:{get:id=>agents.get(id)?.session,async flush(session){
        if(!flushAllowed)return false;
        writeFileSync(logFile(session.id),JSON.stringify(session.snapshotEvents()));flushes.push(session.id);return true;}},
      tools:{register(tool,options){tools.set(tool.name,{tool,options});return()=>tools.delete(tool.name);},
        definitions:()=>[...tools.values()].map(row=>row.tool),guard(fn){guards.add(fn);return()=>guards.delete(fn);}},
      systemPrompt:{section(row){sections.add(row);return()=>sections.delete(row);},context(row){contexts.add(row);return()=>contexts.delete(row);}},
    };
    ctx.systemPrompt.assemble=context=>middleware('system-prompt/assemble',[{},context],async()=>[...sections,...contexts].map(row=>row.text(context)).filter(Boolean).join('\n'));
    services.set('agents',ctx.agents);
    services.set('workspaceRegistry',registry);
    services.set('sessionController',{async create(){return {sessionId:'home'};},async resolveAgent(id){return {agent:agents.get(id)};},async rename(){},cancel(){}});
    const persistence={async open(id){return {header:agents.get(id).session.header,inheritedEventCount:0,
      async read(){return {events:existsSync(logFile(id))?JSON.parse(readFileSync(logFile(id),'utf8')):[]};},
      async append(events){const old=existsSync(logFile(id))?JSON.parse(readFileSync(logFile(id),'utf8')):[];writeFileSync(logFile(id),JSON.stringify([...old,...events]));},
      async flush(){},async close(){}};}};
    services.set('sessionPersistence',persistence);ctx.sessionPersistence=persistence;
    services.set('workingDirectory',{ensure:async()=>repo});
    services.set('fs',{resolve:async path=>resolve(repo,path),processPath:path=>path});
    services.set('profileContext',{dir:join(root,'profile')});ctx.profileContext=services.get('profileContext');
    if(recognizer)services.set('speechToText',recognizer);
    for(const name of ['read','write','bash'])ctx.tools.register({name});
    agentInfo=new Map(workspace.sessionIds.map(id=>[id,makeAgent(id)]));
    await corePlugin.apply(ctx,config);
    const host=services.get('petCore');
    if(host.workspace.status().state!=='ready')await bind(repo);
    const bodyDirectory=join(repo,'.chatpet/data/life');mkdirSync(bodyDirectory,{recursive:true});
    if(!existsSync(join(bodyDirectory,'home.json'))) {
      // 用上游默认结构预置合成存档，固定非睡眠、无在途动作的起点，便于照料断言。
      // needs 的基线供投喂及离线额度测试使用；关闭菜园自动照料，让种植只由测试入口驱动。
      const home=Object.assign(emptyHomeState(Date.now()),{room:'living',spot:'sofa',asleep:false,sleepPending:false,route:null,dwell:null,command:null,freeTarget:null,reactionUntil:0,lastInteractionAt:0,eventLog:[],needs:{hunger:.8,thirst:.2,energy:.8,bladder:.1,pain:0}});
      writeFileSync(join(bodyDirectory,'home.json'),JSON.stringify(home));
      const garden=createGarden(Date.now());garden.care.autoEnabled=false;
      writeFileSync(join(bodyDirectory,'garden.json'),JSON.stringify(garden));
    }
    behaviorPlugin.apply(ctx);
    if(economy)economyPlugin.apply(ctx);
    if(life)lifePlugin.apply(ctx);
    if(memory)memoryPlugin.apply(ctx);
    ctx.webServer={getOrigin:()=> 'http://fixture.invalid',register:()=>()=>{}};
    ctx.sessionController=services.get('sessionController');
    if(search)services.set('web',{search});
    if(channels)channelsPlugin.apply(ctx,{deviceDirectory:join(root,'channels')});
    voicePlugin.apply(ctx,{deviceDirectory:join(root,'voice')});
  }
  async function bind(path){
    const host=services.get('petCore'),request=()=>host.operator.request('binding-'+sequence++);
    const before=value(await host.services.preferences.read(request(),{}));
    const saved=value(await host.services.preferences.save(request(),{expectedRevision:before.revision,workspace:{id:'world',path,title:'Synthetic'},conversation:before.conversation}));
    value(await host.services.workspace.initialize(request(),{expectedPreferencesRevision:saved.revision}));workspace.path=path;
  }
  async function close(){const failures=[];for(const dispose of effects.splice(0).reverse())try{await dispose();}catch(error){failures.push(error);}if(failures.length)throw new AggregateError(failures,'假宿主关闭失败：'+failures.flatMap(error=>error.errors??[error]).map(error=>error.message).join('; '));}
  await start();t.after(async()=>{await close();rmSync(root,{recursive:true,force:true});});
  const service=name=>services.get(name);
  async function begin(id='home',message){
    const {agent}=agentInfo.get(id);agent.status='running';
    const turn=++sequence;
    if(message)for(const key of ['nextStep','nextTurn'])agent.inbox[key]=agent.inbox[key].filter(row=>row.id!==message.id);
    message??={id:'owner-'+turn,role:'user',source:{kind:'user'},content:[{type:'text',text:'Synthetic owner input'}]};
    await emit('agent/inbox/inserted',{agent,message});
    await emit('session/event',agent.session,agent.session.append('turn/start',{turn}));
    await middleware('system-prompt/assemble',[{}, {agent}],async()=>{});
    const decision=await middleware('agent/pre-step',[{agent,turn,step:1,messages:[message],signal:signal()}],async()=>({kind:'enter',messages:[]}));
    assert.equal(decision.kind,'enter','原生准入必须成功');
    for(const input of [message,...(decision.messages??[])])await emit('session/event',agent.session,agent.session.append('user/message',input));
    const current=[...contexts].map(row=>({name:row.name,text:row.text({agent})})).filter(row=>row.text);
    if(current.length)await emit('session/event',agent.session,agent.session.append('user/message',{id:'context-'+turn,role:'user',source:{kind:'runtime-context',form:'snapshot',sections:current},content:[{type:'text',text:current.map(row=>row.text).join('\n')}]}));
    return {agent,turn};
  }
  async function end(active,kind='completed'){
    const {agent,turn}=active;
    await emit('session/event',agent.session,agent.session.append('assistant/message',{turn,message:{role:'assistant',content:[{type:'text',text:'Synthetic model response'}]},stream:[]}));
    agent.status='idle';await emit('session/event',agent.session,agent.session.append('turn/end',{turn,reason:{kind}}));
    await pause(3);
  }
  async function tool(active,name,args){
    const {agent,turn}=active,info=agentInfo.get(agent.id),exec={agent,name,arguments:args,signal:signal(),token:Symbol(name)};
    const callId='tool-'+sequence++;
    await emit('session/event',agent.session,agent.session.append('tool/call',{turn,name,callId,arguments:JSON.stringify(args)}));
    let output,error;
    try {
      await middleware('tools/pre-execute',[exec]);
      if([...info.restrictions].some(mask=>!mask.allow.includes(name)))throw Error('Native tool restriction: '+name);
      const denial=[...guards].map(guard=>guard(exec)).find(Boolean);if(denial)throw Error(String(denial));
      const row=tools.get(name),definition=info.localTools.get(name)??row?.tool;
      assert.ok(definition,'工具已注册：'+name);
      if(row?.options?.when)assert.equal(row.options.when({agent}),true,'工具在当前入口可用');
      if(name==='write'){writeFileSync(resolve(repo,args.file_path),args.content);output='Written';}
      else if(name==='read')output=readFileSync(resolve(repo,args.file_path),'utf8');
      else output=await definition.execute(args,exec);
    }catch(cause){error=cause;output=cause.message;}
    await emit('session/event',agent.session,agent.session.append('tool/result',{turn,message:{role:'tool',toolCallId:callId,isError:!!error,content:[{type:'text',text:String(output)}]}}));
    await emit('tools/result',exec);
    if(error)throw error;return typeof output==='string'&&output.startsWith('{')?JSON.parse(output):output;
  }
  return {root,repo,config,workspace,warnings,sent,flushes,bind,begin,end,tool,emit,middleware,
    service,get host(){return service('petCore');},get body(){return service('petBehavior');},get economy(){return service('petEconomy');},get life(){return service('petLife');},
    agent:id=>agentInfo.get(id).agent,logFile,
    async restart(){await close();await start();},
    set flushAllowed(value){flushAllowed=value;},
    async enable(){const preferences=(await service('petLife').snapshot('world')).preferences;
      await service('petLife').settings('world',preferences,{...preferences,wake:'',review:''});await service('petLife').control('world',true);await service('petBehavior').setAutonomy('world',true);},
    ownerAction:(action,id)=>service('petEconomy').ownerAction('world',action,id,signal()),
  };
}
