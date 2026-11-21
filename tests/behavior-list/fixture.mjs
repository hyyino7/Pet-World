import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,realpathSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {emptyHomeState} from '#feiyu-home';
import {createGarden} from '#feiyu-garden';
import {setTimeout as pause} from 'node:timers/promises';
import {Context} from '@deepseek-ai/cordis';
import {corePlugin,consolePlugin,behaviorPlugin,economyPlugin,lifePlugin,voicePlugin,channelsPlugin,memoryPlugin,roomPlugin,desktopPlugin,platformPlugin,emotionPlugin,guestPreset,resolveCompanionHome} from '../../dist/tests/behavior-list/entries.js';
import {policyHost} from './policy-host.mjs';
import {say} from '../../scripts/checks/lib/native-conversation-scenarios.mjs';
export const value = result => {assert.equal(result.ok,true,JSON.stringify(result));return result.value;};
export const signal = () => new AbortController().signal;
export async function until(check, label='边界操作完成', attempts=300) {
  for(let i=0;i<attempts;i++){if(await check())return;await pause(2);}
  assert.fail(label);
}

// 假的仅为 DSH 服务、文件工具、模型响应；所有插件从 apply 入口安装。
// 原生日志写入临时目录；重新启动插件时只恢复这些磁盘日志。
export async function fixture(t,{now='2026-11-15T12:00:00Z',economy=true,life=true,recognizer,memory=false,channels=false,search,policy=false,room=false,desktop=false,platform=false,emotion=false,console=false,intervals=false,limits,configure,seedGarden}={}) {
  t.mock.timers.enable({apis:intervals?['Date','setInterval']:['Date'],now:Date.parse(now)});
  const root=realpathSync(mkdtempSync(join(tmpdir(),'behavior-list-'))),repo=join(root,'workspace');mkdirSync(repo);
  const config={dataDir:join(root,'core'),companionId:'fish',scopeId:'owner',ownerActorId:'owner',displayName:'Fixture',character:'Synthetic companion'};
  if(memory)config.memory={python:resolve('.venv/bin/python'),dataDir:join(repo,'.chatpet/data/memory')};
  let services,handlers,effects,agents,ctx,sections,contexts,tools,guards,dsh,guest,routes,flushAllowed=true,sequence=0;
  const warnings=[],sent=[],flushes=[],cancellations=[],archives=[];
  const logFile=id=>join(root,`native-${id}.json`);
  const workspace={id:'world',path:repo,sessionIds:['home','owner-b','guest'],async attachSession(id){if(!this.sessionIds.includes(id))this.sessionIds.push(id);}};
  const external=new Map();
  const registry={
    get:id=>id==='world'?workspace:external.get(id),archivedSessionIds:[],
    async archiveSession(id){archives.push({id,flushed:flushes.at(-1)});this.archivedSessionIds.push(id);},
    async create(path){const id='channel-'+external.size;
      const previous=[...external.values()].find(row=>row.path===path);
      if(previous)return previous;
      const created={id,path,sessionIds:[],attachSession:workspace.attachSession};
      external.set(id,created);return created;
    },
  };
  async function emit(name,...args){for(const fn of [...(handlers.get(name)??[])])await fn(...args);}
  async function middleware(name,args,end=async()=>undefined){
    const agent=(name==='system-prompt/assemble'?args[1]:args[0])?.agent;
    const isGuest=agent?.session.header.agentPreset===guestPreset.GUEST_PRESET;
    const selected=dsh&&isGuest&&guest.handlers.has(name)?guest.handlers:handlers;
    const rows=[...(selected.get(name)??[])];let i=0;
    const next=()=>{const fn=rows[i++];return fn?fn(...args,next):end();};return next();
  }
  function makeAgent(id,cwd=repo,preset=id==='guest'?'chatpet-channel-guest':'standard'){
    const events=existsSync(logFile(id))?JSON.parse(readFileSync(logFile(id),'utf8')):[];
    const localTools=new Map(),restrictions=new Set();
    const toolService={
      register(tool){localTools.set(tool.name,tool);return()=>localTools.delete(tool.name);},
      definitions(){return [...tools.values()].map(row=>row.tool).concat([...localTools.values()]);},
      restrict(mask){restrictions.add(mask);return()=>restrictions.delete(mask);},
      guard(fn){guards.add(fn);return()=>guards.delete(fn);},
    };
    const session={id,header:{id,cwd,agentPreset:preset},surface:{nodes:[]},
      get seq(){return events.length;},eventAt:seq=>events[seq],snapshotEvents:()=>events,
      append(type,data){const event={type,data,seq:events.length,time:Date.now()};events.push(event);session.surface.nodes.push(event.seq);return event;}};
    session.surface.nodes=events.map(event=>event.seq);
    const agent={id,session,status:'idle',inbox:{nextStep:[],nextTurn:[],remove(id){
        for(const key of ['nextStep','nextTurn'])this[key]=this[key].filter(row=>row.id!==id);
      }},ctx:{...ctx,tools:toolService},
      whenIdle:async()=>{
        if(!policy||(!agent.inbox.nextTurn.length&&agent.status==='idle'))return;
        await until(()=>!agent.inbox.nextTurn.length&&agent.status==='idle','原生轮次结束',2000);
      },
      cancel(reason){cancellations.push({id,reason});if(!policy)agent.status='idle';},inject(){},

      steer(message){sent.push(message);agent.inbox.nextStep.push(message);void emit('agent/inbox/inserted',{agent,message});},
      followup(message){sent.push(message);agent.inbox.nextTurn.push(message);void emit('agent/inbox/inserted',{agent,message});}};
    if(dsh)agent.ctx=dsh.makeScope(agent,preset===guestPreset.GUEST_PRESET?guest.key:undefined);
    agents.set(id,agent);
    return {agent,localTools,restrictions,restore(log){
      events.splice(0,events.length,...log);
      session.surface.nodes=events.map(event=>event.seq);
    }};
  }
  let agentInfo;
  async function start(){
    services=new Map();handlers=new Map();effects=[];agents=new Map();sections=new Set();contexts=new Set();tools=new Map();guards=new Set();
    dsh=policy?await policyHost(repo,effects):undefined;
    const logger=Object.assign(()=>logger,{warn:(...args)=>warnings.push(args),error:(...args)=>warnings.push(args),info(){}});
    const lifecycle = new Context();
    ctx={[Context.isolate]:lifecycle[Context.isolate],fiber:lifecycle.fiber,
      get:name=>services.get(name),provide(name,service){services.set(name,service);ctx[name]=service;ctx.emit('internal/status');},
      on(name,fn,options){const rows=handlers.get(name)??[];options?.prepend?rows.unshift(fn):rows.push(fn);handlers.set(name,rows);return()=>{const i=rows.indexOf(fn);if(i>=0)rows.splice(i,1);};},
      emit(name,...args){void emit(name,...args).catch(error=>warnings.push(error));},logger,
      effect(factory){const stop=factory();if(typeof stop==='function')effects.push(stop);return()=>{};},
      inject(names,apply){if(names.every(name=>services.has(name)))apply(ctx);return {dispose(){}};},
      agents:{get:id=>agents.get(id),list:()=>[...agents.values()]},
      sessions:{get:id=>agents.get(id)?.session,async flush(session){
        if(!flushAllowed)return false;
        writeFileSync(logFile(session.id),JSON.stringify(session.snapshotEvents()));flushes.push(session.id);return true;}},
      tools:{register(tool,options){tools.set(tool.name,{tool,options});return()=>tools.delete(tool.name);},
        definitions:()=>[...tools.values()].map(row=>row.tool),guard(fn){guards.add(fn);return()=>guards.delete(fn);}},
      systemPrompt:{section(row){sections.add(row);return()=>sections.delete(row);},context(row){contexts.add(row);return()=>contexts.delete(row);}},
    };
    ctx.root=ctx;
    ctx.systemPrompt.assemble=context=>middleware('system-prompt/assemble',[{},context],async()=>[...sections,...contexts].map(row=>row.text(context)).filter(Boolean).join('\n'));
    if(dsh){
      ctx.tools=dsh.ctx.tools;ctx.systemPrompt=dsh.ctx.systemPrompt;
      guest={key:{id:guestPreset.GUEST_PRESET},handlers:new Map()};
      guest.scope=dsh.makeScope(guest.key);
      guest.ctx={...ctx,tools:guest.scope.tools,systemPrompt:guest.scope.systemPrompt,
        inject(names,apply){if(names.every(name=>services.has(name)))apply(Object.assign(Object.create(guest.ctx),Object.fromEntries(names.map(name=>[name,services.get(name)]))));},
        on(name,fn,options){if(!['agent/pre-step','agent/request','system-prompt/assemble'].includes(name))return()=>{};
          const rows=guest.handlers.get(name)??[];
          options?.prepend?rows.unshift(fn):rows.push(fn);guest.handlers.set(name,rows);
          return()=>{const i=rows.indexOf(fn);if(i>=0)rows.splice(i,1);};},
      };
      services.set('agentPresets',{composedPreset:scope=>
        [...agents.values()].find(agent=>agent.ctx===scope)?.session.header.agentPreset??'standard'});
    }
    services.set('agents',ctx.agents);services.set('sessions',ctx.sessions);
    services.set('workspaceRegistry',registry);
    services.set('sessionController',{
      async create({workspaceId,sessionId='home',agentPreset}={}) {
        const selected=registry.get(workspaceId)??workspace;
        await selected.attachSession(sessionId);
        if(!agents.has(sessionId))agentInfo.set(sessionId,makeAgent(sessionId,selected.path,agentPreset));
        return {sessionId};
      },
      async resolveAgent(id){return agents.has(id)?{agent:agents.get(id)}:{error:{code:'session/not-found'}};},
      async rename(){},cancel({sessionId}){agents.get(sessionId)?.cancel({kind:'user'});},
    });
    function persisted(header){
      const {id}=header;
      const events=()=>existsSync(logFile(id))?JSON.parse(readFileSync(logFile(id),'utf8')):[];
      return {header,inheritedEventCount:0,async read(){return {events:events()};},
        async append(added){
          const log=[...events(),...added];
          writeFileSync(logFile(id),JSON.stringify(log));
          agentInfo.get(id)?.restore(log);
        },
        async flush(){},async close(){},
      };
    }
    const persistence={
      async open(id){
        if(!agents.has(id)||!existsSync(logFile(id)))throw Object.assign(Error('Synthetic native log missing'),{name:'SessionNotFound'});
        return persisted(agents.get(id).session.header);
      },
      async create(header){return persisted(header);},
    };
    services.set('sessionPersistence',persistence);ctx.sessionPersistence=persistence;
    services.set('workingDirectory',{ensure:async()=>repo});
    services.set('fs',{resolve:async path=>resolve(repo,path),processPath:path=>path});
    services.set('profileContext',{dir:join(root,'profile')});ctx.profileContext=services.get('profileContext');
    if(recognizer)services.set('speechToText',recognizer);
    if(!dsh)for(const name of ['read','write','bash'])ctx.tools.register({name});
    agentInfo=new Map([workspace,...external.values()].flatMap(row=>row.sessionIds.map(id=>[
      id,makeAgent(id,row.path,row===workspace?undefined:guestPreset.GUEST_PRESET),
    ])));
    if(policy)services.set('attachments',{admitPromptContent:async content=>structuredClone(content)});
    configure?.(services);
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
      seedGarden?.(garden);
      writeFileSync(join(bodyDirectory,'garden.json'),JSON.stringify(garden));
    }
    behaviorPlugin.apply(ctx);
    if(economy)economyPlugin.apply(ctx);
    if(life)lifePlugin.apply(ctx);
    if(memory)memoryPlugin.apply(ctx);
    routes=new Map();
    ctx.webServer={getOrigin:()=> 'http://fixture.invalid',register(route){
      routes.set(route.path,route);
      return ()=>routes.delete(route.path);
    }};
    ctx.sessionController=services.get('sessionController');
    if(console || platform)ctx.connection={browserPeer:{principal:{kind:'owner'},signal:signal()},fetch:ctx.webServer,broadcast(){}};
    if(console)consolePlugin.apply(ctx);
    if(search)services.set('web',{search});
    if(desktop || platform)desktopPlugin.apply(ctx);
    if(platform)platformPlugin.apply(ctx);
    if(room){ctx.workspaceRegistry=registry;roomPlugin.apply(ctx);}
    if(emotion)emotionPlugin.apply(ctx);
    if(dsh)guestPreset.apply(guest.ctx);
    if(channels)channelsPlugin.apply(ctx,{deviceDirectory:join(root,'channels')});
    voicePlugin.apply(ctx,{deviceDirectory:join(root,'voice')});
  }
  async function bind(path){
    const host=services.get('petCore'),request=()=>host.operator.request('binding-'+sequence++);
    const before=value(await host.services.preferences.read(request(),{}));
    const saved=value(await host.services.preferences.save(request(),{expectedRevision:before.revision,workspace:{id:'world',path,title:'Synthetic'},conversation:{...before.conversation,...limits}}));
    value(await host.services.workspace.initialize(request(),{expectedPreferencesRevision:saved.revision}));workspace.path=path;
  }
  async function close(){const failures=[];for(const dispose of effects.splice(0).reverse())try{await dispose();}catch(error){failures.push(error);}if(failures.length)throw new AggregateError(failures,'假宿主关闭失败：'+failures.flatMap(error=>error.errors??[error]).map(error=>error.message).join('; '));}
  t.after(async()=>{try{await close();}finally{rmSync(root,{recursive:true,force:true});}});
  await start();
  const service=name=>services.get(name);
  async function begin(id='home',message){
    const {agent}=agentInfo.get(id);
    const queued=message&&['nextStep','nextTurn'].some(key=>agent.inbox[key].some(row=>row.id===message.id));
    if(queued)agent.inbox.remove(message.id);
    agent.status='running';
    const turn=++sequence;
    message??={id:'owner-'+turn,role:'user',source:{kind:'user'},content:[{type:'text',text:'Synthetic owner input'}]};
    if(!queued||!policy)await emit('agent/inbox/inserted',{agent,message});
    await emit('session/event',agent.session,agent.session.append('turn/start',{turn}));
    const active={agent,turn,step:0};
    await step(active,[message]);
    return active;
  }
  async function step(active,messages=[]){
    const {agent,turn}=active;
    for(const message of messages)agent.inbox.remove(message.id);
    active.toolSet?.dispose();
    if(dsh)active.toolSet=await ctx.tools.resolve({agent,signal:signal()});
    const promptContext={agent,scope:agent,toolSet:active.toolSet};
    active.prompt=await middleware('system-prompt/assemble',[{},promptContext],async()=>dsh?agent.ctx.systemPrompt.assemble(promptContext):undefined);
    const decision=await middleware('agent/pre-step',[{agent,turn,step:++active.step,messages,signal:signal()}],async()=>({kind:'enter',messages:[]}));
    assert.equal(decision.kind,'enter','原生准入必须成功');
    active.injections=decision.messages;
    for(const input of [...(decision.messages??[]),...messages])await emit('session/event',agent.session,agent.session.append('user/message',input));
    const current=active.prompt?.contexts??[...contexts].map(row=>({name:row.name,text:row.text({agent})})).filter(row=>row.text);
    if(current.length)await emit('session/event',agent.session,agent.session.append('user/message',{id:`context-${turn}-${active.step}`,role:'user',source:{kind:'runtime-context',form:'snapshot',sections:current},content:[{type:'text',text:current.map(row=>row.text).join('\n')}]}));
  }
  async function end(active,kind='completed',text='Synthetic model response'){
    const {agent,turn}=active;
    active.toolSet?.dispose();
    const stream=[];
    async function* model(){
      const split=text.indexOf('<pet-expression>')+5;
      for await(const chunk of say(text)) {
        if(chunk.type==='text-delta'&&split>4) {
          yield {...chunk,text:text.slice(0,split)};
          yield {...chunk,text:text.slice(split)};
        } else yield chunk;
      }
    }
    if(dsh)for await(const chunk of await middleware('llm/stream',[{sessionId:agent.id,signal:signal()}],model))stream.push(chunk);
    const content=dsh?stream.flatMap(chunk=>chunk.type==='block-end'?[chunk.block]:[]):[{type:'text',text}];
    await emit('session/event',agent.session,agent.session.append('assistant/message',{turn,message:{role:'assistant',content},stream}));
    if(!policy)agent.status='idle';
    await emit('session/event',agent.session,agent.session.append('turn/end',{turn,reason:{kind}}));
    if(policy)agent.status='idle';
    await pause(3);
  }
  const execution=(agent,name,args)=>({agent,name,arguments:args,signal:signal(),token:Symbol(name),callId:'tool-'+sequence++});
  const prepare=exec=>middleware('tools/pre-execute',[exec]);
  async function prepareTool(active,name,args){
    const exec=execution(active.agent,name,args);
    await prepare(exec);
    return {check:()=>ctx.tools.checkGuards(exec),finish:()=>emit('tools/result',exec)};
  }
  async function tool(active,name,args){
    const {agent,turn}=active,info=agentInfo.get(agent.id);
    const exec=execution(agent,name,args), {callId}=exec;
    await emit('session/event',agent.session,agent.session.append('tool/call',{turn,name,callId,arguments:JSON.stringify(args)}));
    let output,error;
    try {
      await prepare(exec);
      if(dsh){
        const denial=ctx.tools.checkGuards(exec);
        if(denial)throw Error(denial);
        const definition=ctx.tools.executable(name,agent,active.toolSet);
        if(!definition)throw Error('工具在当前入口不可用：'+name);
        output=await definition.execute(args,exec);
      } else {
        if([...info.restrictions].some(mask=>!mask.allow.includes(name)))throw Error('Native tool restriction: '+name);
        const denial=[...guards].map(guard=>guard(exec)).find(Boolean);if(denial)throw Error(String(denial));
        const row=tools.get(name),definition=info.localTools.get(name)??row?.tool;
        assert.ok(definition,'工具已注册：'+name);
        if(row?.options?.when)assert.equal(row.options.when({agent}),true,'工具在当前入口可用');
        if(name==='write'){writeFileSync(resolve(repo,args.file_path),args.content);output='Written';}
        else if(name==='read')output=readFileSync(resolve(repo,args.file_path),'utf8');
        else output=await definition.execute(args,exec);
      }
    }catch(cause){error=cause;output=cause.message;}
    await emit('session/event',agent.session,agent.session.append('tool/result',{turn,message:{role:'tool',toolCallId:callId,isError:!!error,content:[{type:'text',text:String(output)}]}}));
    await emit('tools/result',exec);
    if(error)throw error;return typeof output==='string'&&output.startsWith('{')?JSON.parse(output):output;
  }
  async function settings(endpoint,input,requestId=`settings-${++sequence}`){
    const path=`/api/chatpetSettings/${endpoint}`, rpcId=`rpc-${++sequence}`;
    const response=await routes.get(path).fetch(new Request(`http://fixture.invalid${path}`,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({type:'client-request',rpcId,method:`chatpetSettings/${endpoint}`,payload:{requestId,input}}),
    }));
    assert.equal(response.status,200);
    const envelope=await response.json();
    assert.equal(envelope.type,'server-response');assert.equal(envelope.rpcId,rpcId);
    return envelope.result;
  }
  return {root,repo,config,workspace,warnings,sent,flushes,cancellations,archives,registry,bind,begin,step,end,tool,prepareTool,emit,middleware,
    settings,
    home:()=>resolveCompanionHome(ctx,service('petCore')),
    create:async sessionId=>(await service('sessionController').create({workspaceId:'world',sessionId})).sessionId,
    schemas:({agent,toolSet})=>ctx.tools.schemas(agent,toolSet).map(schema=>schema.name),
    toolSchema:({agent,toolSet},name)=>ctx.tools.schemas(agent,toolSet).find(schema=>schema.name===name),
    registerTool:(...args)=>dsh.register(...args),
    service,route:path=>routes.get(path),get host(){return service('petCore');},get body(){return service('petBehavior');},get economy(){return service('petEconomy');},get life(){return service('petLife');},
    agent:id=>agentInfo.get(id).agent,agents:()=>[...agents.values()],logFile,
    async restart(beforeStart){await close();beforeStart?.();await start();},
    set flushAllowed(value){flushAllowed=value;},
    async enable(){const preferences=(await service('petLife').snapshot('world')).preferences;
      await service('petLife').settings('world',preferences,{...preferences,wake:'',review:''});await service('petLife').control('world',true);await service('petBehavior').setAutonomy('world',true);},
    ownerAction:(action,id)=>service('petEconomy').ownerAction('world',action,id,signal()),
  };
}

export async function ownerPlan(f,steps,id){
  const active=await f.begin(id),before=await f.tool(active,'life_plan_read',{view:'full'});
  await f.tool(active,'life_plan_update',{expectedRevision:before.revision,plan:{goal:'Synthetic intention',reason:'Behavior preservation',steps,nextConsiderAt:null}});
  await f.end(active);
}
