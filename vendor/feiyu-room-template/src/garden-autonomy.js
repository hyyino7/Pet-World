// Shared by the production bridge and local preview. A job is proposed first,
// walked to second, worked on third, then committed with its receipt in ONE
// garden save. The home save is only a presentation/behavior checkpoint.
import { CROPS, GARDEN_RULES, advanceGarden, applyGardenAction, gardenView, normalizeGardenCare, gardenConfiguration } from '../public/room/garden-state.js';
import { loadGarden, saveGarden } from './garden-store.js';
import { loadHomeState, saveHomeState, advanceHomeState, beginGardenWork, endGardenWork, homeView, pausePlannedHomeActivity } from './home-state.js';

const ACTIONS = ['till','plant','water','fertilize','harvest','sell','buySeed','buyCompost'];
const plotAction = (a) => ['till','plant','water','fertilize','harvest'].includes(a.type);
const labels = {till:'松土',plant:'播种',water:'浇水',fertilize:'施肥',harvest:'采收',sell:'出售收成',buySeed:'购买种子',buyCompost:'补充堆肥',visit:'巡视菜园'};
const keyOf = (a) => JSON.stringify([a.type,a.plotId??null,a.cropId??null,a.quantity??1,a.enabled??null]);

/** Deadlines for accepted work only; never enables the reference goal planner. */
export function nextGardenCareBoundary(g, h, now = Date.now(), env = {}) {
  const candidates=[];
  for(const at of [g.care.pendingConflict?.deadline,g.care.task?.pausedAt?undefined:g.care.task?.workUntil])
    if(Number.isFinite(at) && at>now)candidates.push(at);
  if(!g.care.task && !h.route && !h.dwell && !h.command && !h.freeTarget && !h.sleepPending && !restReason(h,now,env)
    && g.care.queue.some(job=>!job.pausedAt && !waitingForAcceptedWork(job,h,now)))
    candidates.push(Math.max(now+1,Number(g.care.nextPlanAt)||now));
  return candidates.length?Math.min(...candidates):null;
}

function restReason(home, now, env = {}) {
  // A host-owned plan chooses when to rest or replan. The executor only reports
  // concrete inability; it does not introduce a second clock/needs scheduler.
  if (env.goalPolicy === 'planned') {
    if (home.asleep || home.sleepPending) return '正在睡觉，已暂停菜园任务';
    if (home.needs.pain >= .7) return '身体不适，已暂停菜园任务';
    return '';
  }
  const hour = new Date(now).getHours() + new Date(now).getMinutes()/60;
  if (home.asleep || home.sleepPending || hour >= 22.5 || hour < 6.8) return '天晚了，先休息，醒来再照料菜园';
  const n=home.needs;
  if (n.pain >= .28 || n.energy < .35) return '先恢复体力，菜园稍后再照料';
  if (n.thirst >= .62 || n.hunger >= .66 || n.bladder >= .7) return '先照顾身体，稍后回来继续';
  if ((home.command && now < home.command.until) || (home.freeTarget && now < home.freeTarget.until) || now < home.reactionUntil || now < home.lastInteractionAt + 20_000) return '先回应你的安排，之后再来菜园';
  if ((env.unread || 0)>0 && now-(home.lastPhoneAt||0)>20*60_000) return '先看看消息，稍后再照料菜园';
  return '';
}

export function planGardenAction(raw, rotation = 0, now = Date.now()) {
  const g=advanceGarden(raw,now);
  const {crops:CROPS,rules:GARDEN_RULES}=gardenConfiguration(g);
  const dry=g.plots.filter(p=>p.cropId && p.progress<1 && p.moisture<.25).sort((a,b)=>a.moisture-b.moisture)[0];
  if(dry) return {type:'water',plotId:dry.id};
  const mature=g.plots.find(p=>p.cropId && p.progress>=1);
  if(mature) return {type:'harvest',plotId:mature.id};
  // Keep one of each crop in the basket; sell the rest to fund the next sowing.
  const sale=CROPS.find(c=>g.inventory[c.id]>1 || (g.coins<2 && g.inventory[c.id]>0));
  if(sale) return {type:'sell',cropId:sale.id,quantity:Math.min(99,g.inventory[sale.id]-(g.coins<2?0:1))};
  const empty=g.plots.find(p=>!p.cropId);
  if(empty){
    if(!empty.tilled) return {type:'till',plotId:empty.id};
    const planted=new Set(g.plots.map(p=>p.cropId));
    const order=Array.from({length:CROPS.length},(_,i)=>CROPS[(rotation+i)%CROPS.length]);
    const chosen=order.find(c=>!planted.has(c.id) && g.seeds[c.id]>0) || order.find(c=>g.seeds[c.id]>0);
    if(chosen) return {type:'plant',plotId:empty.id,cropId:chosen.id};
    const buy=order.find(c=>!planted.has(c.id) && c.seedCost<=g.coins) || order.find(c=>c.seedCost<=g.coins);
    if(buy) return {type:'buySeed',cropId:buy.id,quantity:1};
  }
  const feed=g.plots.find(p=>p.cropId && p.progress<.75 && !p.fertilized);
  if(feed && g.compost>0) return {type:'fertilize',plotId:feed.id};
  // Never buy optional fertilizer at the expense of the next planting cycle.
  if(feed && g.compost===0 && g.coins>=GARDEN_RULES.compostCost+12) return {type:'buyCompost',quantity:1};
  const missing=CROPS.slice(rotation%CROPS.length).concat(CROPS.slice(0,rotation%CROPS.length)).find(c=>g.seeds[c.id]===0 && g.coins>=c.seedCost+8);
  if(missing) return {type:'buySeed',cropId:missing.id,quantity:1};
  return null;
}

function createJob(g, action, source, now, requestId='') {
  const care=g.care; care.nextId+=1;
  const p=plotAction(action)?g.plots[action.plotId]:null;
  return {id:`garden-${care.nextId}`,requestId,action,source,phase:'queued',createdAt:now,startedAt:0,workUntil:0,fingerprint:keyOf(action),expectedPlot:p?{cropId:p.cropId,plantedAt:p.plantedAt}:null};
}
function finish(g, job, ok, message, now, status=ok?'completed':'failed'){
  const c=g.care;
  c.recent.push({id:job.id,type:job.action.type,ok,message,at:now}); c.recent=c.recent.slice(-16);
  const receipts=c.receipts.filter(v=>v.jobId===job.id);
  for(const receipt of receipts)Object.assign(receipt,{status,message,at:now});
  if(job.requestId&&!receipts.some(receipt=>receipt.requestId===job.requestId))
    c.receipts.push({requestId:job.requestId,jobId:job.id,fingerprint:job.fingerprint,status,message,at:now});
  c.task=null;c.status=message;c.nextPlanAt=now+2500;
  if(ok && job.action.type==='plant') c.rotation=(CROPS.findIndex(x=>x.id===job.action.cropId)+1)%CROPS.length;
}
function validForJob(g, job, now){
  const p=job.expectedPlot ? g.plots[job.action.plotId] : null;
  if(p && (p.cropId!==job.expectedPlot.cropId || p.plantedAt!==job.expectedPlot.plantedAt)) return {ok:false,message:'这畦已经有人照料过，已取消旧任务，重新安排'};
  return job.action.type==='visit'?{ok:true}:applyGardenAction(g,job.action,now);
}
function publicView(g,home,now){
  const view=gardenView(g,now), task=view.care.task;
  view.care={...view.care,task:task?{...task,...task.action}:null,queued:view.care.queue.length,character:{room:home.room,activity:home.activity,walking:!!home.route && now<home.route.arriveAt}};
  return view;
}

const CARE_CONFLICT_MS = 30_000;

/** 手头真正会挡住“现在去菜园”的事情；菜园任务本身不算冲突。 */
function careBlocker(g, h, now, env = {}) {
  if (g.care.task && !g.care.task.pausedAt) return {kind:'already',status:'running'};
  if (g.care.queue.some(job=>!job.pausedAt)) return {kind:'already',status:'queued'};
  if (g.care.task || g.care.queue.length) return {kind:'paused',label:'已有暂停的菜园任务',defaultDecision:'defer'};
  if (h.asleep || h.sleepPending) {
    return { kind: 'sleep', label: '正在睡觉/准备睡觉', defaultDecision: 'defer' };
  }
  if (h.command && now < h.command.until) {
    return { kind: 'command', label: '正在按你的安排做事', defaultDecision: 'defer' };
  }
  if (h.freeTarget && now < h.freeTarget.until) {
    return { kind: 'command', label: '正在走去你指的地方', defaultDecision: 'defer' };
  }
  if (h.route || h.dwell) {
    return { kind: 'home', label: '正在做手头的事', defaultDecision: 'defer' };
  }
  const reason = restReason(h, now, env);
  if (reason) return { kind: 'needs', label: reason, defaultDecision: 'defer' };
  return null;
}

function pendingQuestion(blocker) {
  const tail = blocker.defaultDecision === 'force' ? '直接去菜园照料' : '把手里的事做完';
  return `她现在${blocker.label}。要先让她做完，还是直接去菜园照料？30 秒内不回答，她会先${tail}。`;
}

/** 用户选择“直接去照料”时，把挡路的房间行为清掉；身体/睡眠也按用户选择让路。 */
function forceCare(g, h, now) {
  g.care.nextPlanAt = 0;
  g.care.forceUntil = now + 5 * 60_000;
  h.asleep = false;
  h.sleepPending = false;
  h.command = null;
  h.route = null;
  h.dwell = null;
  h.freeTarget = null;
  h.reactionUntil = 0;
  h.nextDecisionAt = 0;
}

function waitingForAcceptedWork(job,h,now) {
  if(!job.deferUntilIdle)return false;
  const previous=job.deferOperationId && h.plannedExecutions?.[job.deferOperationId];
  if(previous && !['completed','cancelled','failed'].includes(previous.status))return true;
  if(job.deferOperationId && !previous && h.currentPlannedOperation===job.deferOperationId)return true;
  return !!(h.asleep || h.sleepPending || h.route || h.dwell || h.command && now<h.command.until
    || h.freeTarget && now<h.freeTarget.until || now<h.reactionUntil);
}

function rememberCareRequest(g,job,requestId,now,message='已记下这次照料安排') {
  if(!requestId)return;
  const previous=g.care.receipts.find(receipt=>receipt.requestId===requestId);
  if(!previous)g.care.receipts.push({requestId,jobId:job.id,fingerprint:keyOf({type:'careNow'}),status:job.pausedAt?'paused':'queued',message,at:now});
}

function blockingPlannedOperation(g,h) {
  const operationId=h.currentPlannedOperation;
  const execution=operationId && h.plannedExecutions?.[operationId];
  if(!execution || execution.status!=='running')return undefined;
  const target=h.route?.target || h.dwell?.target;
  if(target?.plannedOperationId===operationId)return operationId;
  if(execution.kind==='garden' && g.care.task?.requestId===operationId && target?.gardenJobId===g.care.task.id)return operationId;
  if(execution.kind==='body' && execution.input?.action==='sleep' && h.companionAction?.id===operationId
    && (h.sleepPending || h.asleep))return operationId;
  return undefined;
}

function prioritizeCare(g,h,job,now) {
  delete job.deferUntilIdle;delete job.deferOperationId;job.pausedAt=0;job.phase='queued';
  if(g.care.task!==job){
    g.care.queue=g.care.queue.filter(each=>each.id!==job.id);
    g.care.queue.unshift(job);
  }
  forceCare(g,h,now);
  for(const row of g.care.receipts.filter(row=>row.jobId===job.id))Object.assign(row,{status:'queued',message:'已将原照料安排改为优先执行',at:now});
}

function resolvePending(g, h, decision, now) {
  const pending = g.care.pendingConflict;
  if (!pending) return false;
  // The same durable request survives an explicit answer, timeout or restart.
  // Do not rely on the retired autonomous goal generator to recreate it later.
  const requestId=pending.requestId || pending.id;
  let job=g.care.task?.requestId===requestId ? g.care.task : g.care.queue.find(each=>each.requestId===requestId);
  const receipt=g.care.receipts.find(each=>each.requestId===requestId);
  if(!job && receipt && ['completed','failed','cancelled'].includes(receipt.status)) {
    g.care.pendingConflict=null;g.care.status=receipt.message;return true;
  }
  if(!job) {
    if(g.care.queue.length>=17){g.care.status='原照料请求已保留，等待已有队列腾出位置';return false;}
    job=pending.job || createJob(g,(g.economyConfig ? null : planGardenAction(g,g.care.rotation,now))||{type:'visit'},'requested',now,requestId);
    job.requestId=requestId;
    g.care.queue.push(job);
  }
  if(decision==='defer') {
    job.deferUntilIdle=true;
    const operationId=pending.deferOperationId || blockingPlannedOperation(g,h);
    if(operationId)job.deferOperationId=operationId;
    else delete job.deferOperationId;
  } else {
    delete job.deferUntilIdle;delete job.deferOperationId;
  }
  rememberCareRequest(g,job,requestId,now,decision==='defer'?'已保留稍后照料任务，等当前安排完成':'已接受这次照料安排');
  g.care.pendingConflict = null;
  if (decision === 'force') {
    forceCare(g, h, now);
    g.care.status = '你让她先去菜园，她已经出发了';
  } else {
    g.care.nextPlanAt = now;
    g.care.status = '先把手头的事做完，稍后再去菜园';
  }
  return true;
}

export function createGardenCaretaker({homeFile,gardenFile,getEnv=()=>({}),storage={loadHomeState,saveHomeState,loadGarden,saveGarden}}){
  if(!homeFile||!gardenFile) throw new Error('菜园照料需要独立的房间与菜园存档路径');
  let lastHomeSave=0;
  function tick(now=Date.now()){
    const env=getEnv(now)||{};
    let g=advanceGarden(storage.loadGarden(gardenFile,now),now);
    let h=storage.loadHomeState(homeFile,now);
    let careDirty=env.passive===false;
    const pending=g.care.pendingConflict;
    if(pending && now>=pending.deadline){
      resolvePending(g,h,pending.defaultDecision,now);
      careDirty=true;
    }
    const beforeCare=JSON.stringify(g.care);
    let homeTransition=false, gardenCommit=false;
    if(env.autonomy===false && g.care.task?.source==='auto'){
      const job=g.care.task;
      h=endGardenWork(h,job,now,'自主照料已暂停');
      finish(g,job,false,'自主照料已暂停',now,'cancelled');
      homeTransition=true;careDirty=true;
    }
    // Recover from a crash after garden commit but before home checkpoint.
    const owner=h.route?.target?.gardenJobId || h.dwell?.target?.gardenJobId;
    if(owner && owner!==g.care.task?.id){
      h=endGardenWork(h,{id:owner},now,'菜园操作已结算，继续接下来的安排');homeTransition=true;
    }
    const forced = Number(g.care.forceUntil) > now;
    let reason = g.care.pendingConflict ? '在等你回答，先不安排菜园' : (forced ? '' : restReason(h,now,env));
    if(g.care.task && !g.care.task.pausedAt && reason){
      const job=g.care.task;
      h=endGardenWork(h,job,now,reason);
      finish(g,job,false,`${reason}；已暂停这次${labels[job.action.type]}`,now,'cancelled');homeTransition=true;
    }
    const mayPlan=!reason && !g.care.task?.pausedAt && (g.care.task || g.care.queue.some(job=>!job.pausedAt&&!waitingForAcceptedWork(job,h,now)) || (env.autonomy!==false && g.care.autoEnabled && now>=g.care.nextPlanAt));
    const beforeMotion=JSON.stringify([h.route,h.dwell,h.asleep,h.sleepPending]);
    if(reason && !h.route && !h.dwell)h.nextDecisionAt=0;
    const advanced=advanceHomeState(h,now,{...env,gardenReady:!!mayPlan}); h=advanced.state;
    if(beforeMotion!==JSON.stringify([h.route,h.dwell,h.asleep,h.sleepPending]))homeTransition=true;
    reason = g.care.pendingConflict ? '在等你回答，先不安排菜园' : (Number(g.care.forceUntil) > now ? '' : restReason(h,now,env));
    if(g.care.task && !g.care.task.pausedAt && reason){
      const interrupted=g.care.task;h=endGardenWork(h,interrupted,now,reason);
      finish(g,interrupted,false,`${reason}；已暂停这次${labels[interrupted.action.type]}`,now,'cancelled');homeTransition=true;
    }
    const job=g.care.task;
    if(job && !job.pausedAt){
      const route=h.route?.target?.gardenJobId===job.id;
      const dwell=h.dwell?.target?.gardenJobId===job.id;
      if(route){job.phase='walking';g.care.status=`正在走去${labels[job.action.type]}`;}
      else if(dwell){
        job.phase='working';job.workUntil=h.dwell.until;g.care.status=`小蓝鱼正在${labels[job.action.type]}`;
        if(now>=h.dwell.until){
          const valid=validForJob(g,job,now);
          const result=valid.ok?(job.action.type==='visit'?{ok:true,state:g,message:'到了菜园门口，看看菜畦的长势'}:applyGardenAction(g,job.action,now)):valid;
          if(result.state)g=result.state;
          finish(g,job,result.ok,`小蓝鱼：${result.message}`,now);
          // Persist receipt BEFORE clearing home dwell: replay cannot spend/reward twice.
          storage.saveGarden(gardenFile,g);gardenCommit=true;
          h=endGardenWork(h,job,now,g.care.status,result.ok);homeTransition=true;
        }
      }else if(h.route||h.dwell||h.command||h.freeTarget||reason){
        finish(g,job,false,'你的新安排已接手，原菜园任务已取消',now,'cancelled');homeTransition=true;
      }else{
        // Missing home checkpoint after crash: restart the physical trip; no effect yet.
        h=beginGardenWork(h,job,now);job.startedAt=now;job.phase='walking';homeTransition=true;
      }
    }
    // An untouched, disabled garden has no care story or future plan to report.
    // Requested jobs and explicitly enabled autonomy retain the original path.
    if(!g.care.task && (g.care.autoEnabled || g.care.queue.length || g.care.pendingConflict)){
      if(reason){g.care.status=reason;}
      else if(!h.route&&!h.dwell&&now>=g.care.nextPlanAt){
        const queuedIndex=g.care.queue.findIndex(job=>!job.pausedAt&&!waitingForAcceptedWork(job,h,now));
        let next=queuedIndex>=0 ? g.care.queue.splice(queuedIndex,1)[0] : null;
        if(!next&&env.autonomy!==false&&g.care.autoEnabled){
          const action=planGardenAction(g,g.care.rotation,now);
          if(action)next=createJob(g,action,'auto',now);
        }
        if(next){
          const valid=validForJob(g,next,now);
          if(!valid.ok){finish(g,next,false,valid.message,now);}
          else{
            g.care.task=next;next.startedAt=now;next.phase='walking';
            h=beginGardenWork(h,next,now);g.care.status=`出发去${labels[next.action.type]}`;homeTransition=true;
          }
        }else if(g.care.queue.length){
          g.care.status=g.care.queue.every(each=>each.pausedAt)
            ?'原照料任务已暂停，等待明确继续'
            :'已保留稍后照料任务，等待当前安排完成';
          // Deferred work waits on its persisted condition, not another timer.
        }else if(env.goalPolicy==='planned'){
          g.care.status='本次照料已结束，等待下一项明确安排';
        }else{g.care.status=g.care.autoEnabled?'菜园照料好了，等作物慢慢长大':'自主照料已暂停，你仍可请小蓝鱼完成指定操作';g.care.nextPlanAt=now+15_000;}
      }
    }
    if(!gardenCommit && (careDirty || JSON.stringify(g.care)!==beforeCare))storage.saveGarden(gardenFile,g);
    // Routine needs are checkpointed at most every 20 seconds, physical job transitions immediately.
    const checkpoint=homeTransition||now-lastHomeSave>=20_000;
    if(checkpoint){h=storage.saveHomeState(homeFile,h,now);lastHomeSave=now;}
    return {state:h,env,garden:publicView(g,h,now),changed:advanced.changed||homeTransition};
  }
  function control(input={},now=Date.now()){
    const env=getEnv(now)||{};
    // Validation/idempotency precede tick: a malformed request never starts work.
    if(!input || typeof input!=='object' || Array.isArray(input))return {ok:false,message:'照料安排需要有效的操作内容'};
    const type=input.type==='go'?'visit':input.type;
    if (['pause','resume','cancel'].includes(type)) {
      if (typeof input.requestId !== 'string' || !input.requestId || input.requestId.length > 96)
        return {ok:false,message:'执行控制需要原任务的请求编号'};
      const g=storage.loadGarden(gardenFile,now);
      const job=g.care.task?.requestId===input.requestId ? g.care.task : g.care.queue.find(row=>row.requestId===input.requestId);
      const receipt=g.care.receipts.find(row=>row.requestId===input.requestId);
      let h=storage.loadHomeState(homeFile,now);
      if (!job) {
        // A prior garden commit may have won the crash race with its home
        // checkpoint. Finish physical cancellation even when the job is gone.
        if (receipt && ['pause','cancel'].includes(type)) {
          h=pausePlannedHomeActivity(h,receipt.jobId,now);storage.saveHomeState(homeFile,h,now);
        }
        return {ok:receipt?.status==='completed',status:receipt?.status || 'failed',message:receipt?.message || '原任务不存在',garden:publicView(g,h,now),home:homeView(h,now,env)};
      }
      if (type==='pause') {
        if (!job.pausedAt) {
          job.remainingWorkMs=h.dwell?.target?.gardenJobId===job.id ? Math.max(0,h.dwell.until-now) : job.remainingWorkMs;
          job.pausedAt=now;job.phase='paused';
        }
        // Retrying a paused request must also reconcile an older home save.
        h=pausePlannedHomeActivity(h,job.id,now);
        if (g.care.task===job) {g.care.task=null;g.care.queue.unshift(job);}
        for(const row of g.care.receipts.filter(row=>row.jobId===job.id))Object.assign(row,{status:'paused',message:'原任务已暂停',at:now});
      } else if (type==='resume') {
        job.pausedAt=0;job.phase='queued';
        for(const row of g.care.receipts.filter(row=>row.jobId===job.id))Object.assign(row,{status:'queued',message:'原任务已恢复，等待执行',at:now});
      } else if (type==='cancel') {
        h=pausePlannedHomeActivity(h,job.id,now);
        if (g.care.task===job) finish(g,job,false,'原任务已取消',now,'cancelled');
        else {
          g.care.queue=g.care.queue.filter(row=>row!==job);
          for(const row of g.care.receipts.filter(row=>row.jobId===job.id))Object.assign(row,{status:'cancelled',message:'原任务已取消',at:now});
        }
      }
      g.care.status=type==='cancel'?'原任务已取消':type==='pause'?'原任务已暂停':'原任务已恢复，等待执行';
      storage.saveGarden(gardenFile,g);storage.saveHomeState(homeFile,h,now);
      return {ok:true,status:type==='cancel'?'cancelled':type==='pause'?'paused':'queued',message:type==='cancel'?'原任务已取消':type==='pause'?'原任务已暂停':'原任务继续执行',garden:publicView(g,h,now),home:homeView(h,now,env)};
    }
    if(![...ACTIONS,'visit','auto','careNow'].includes(type))return {ok:false,message:'没有识别出这项照料安排'};
    if(input.requestId!==undefined && (typeof input.requestId!=='string'||!input.requestId.trim()||input.requestId.length>96||/[\u0000-\u001f\u007f]/.test(input.requestId)))return {ok:false,message:'请求编号必须是 1 到 96 字的文本'};
    if(type==='auto'&&typeof input.enabled!=='boolean')return {ok:false,message:env.goalPolicy==='planned'?'请选择开启或关闭园艺偏好':'请选择开启或暂停自主照料'};
    const action={type};
    for(const field of ['plotId','cropId','quantity'])if(input[field]!==undefined)action[field]=input[field];
    if(type==='auto')action.enabled=input.enabled;
    let g=advanceGarden(storage.loadGarden(gardenFile,now),now);
    if(type==='careNow'){
      let h=storage.loadHomeState(homeFile,now);
      const decision=input.decision;
      if(decision!==undefined && !['force','defer'].includes(decision))return {ok:false,message:'请选择先做手头的事或直接去菜园'};
      const previous=input.requestId&&g.care.receipts.find(row=>row.requestId===input.requestId);
      if(previous){
        if(previous.fingerprint!==keyOf({type:'careNow'}))return {ok:false,message:'相同请求编号不能用于不同的操作'};
        const job=g.care.task?.id===previous.jobId ? g.care.task : g.care.queue.find(each=>each.id===previous.jobId);
        if(job && decision==='force' && (job.deferUntilIdle || job.pausedAt)){
          prioritizeCare(g,h,job,now);
          storage.saveGarden(gardenFile,g);storage.saveHomeState(homeFile,h,now);
          const result=tick(now), current=result.garden.care.task?.id===job.id;
          const receipt=result.garden.care.receipts.find(row=>row.requestId===input.requestId);
          const status=current?'running':receipt?.status || 'queued';
          return {ok:!['failed','cancelled'].includes(status),accepted:['queued','running'].includes(status),reused:true,requestId:input.requestId,status,
            message:current?'原照料任务已继续执行':'原照料任务已改为优先执行，实际进度以任务状态为准',garden:result.garden,home:homeView(result.state,now,result.env)};
        }
        const status=job?.pausedAt?'paused':g.care.task===job&&job?'running':previous.status;
        return {ok:!['failed','cancelled'].includes(status),accepted:['queued','running'].includes(status),reused:true,requestId:input.requestId,status,
          message:status==='paused'?'原照料任务已暂停，请明确继续原任务':previous.message,garden:publicView(g,h,now),home:homeView(h,now,env)};
      }
      const resolveCare=()=>{
        const pending=g.care.pendingConflict;
        const requestId=pending.requestId || pending.id;
        const resolved=resolvePending(g,h,decision || pending.defaultDecision,now);
        if(resolved){
          const job=g.care.task?.requestId===requestId ? g.care.task : g.care.queue.find(each=>each.requestId===requestId);
          if(job&&input.requestId!==requestId)rememberCareRequest(g,job,input.requestId,now);
        }
        storage.saveGarden(gardenFile,g);storage.saveHomeState(homeFile,h,now);
        const result=tick(now);
        const receipt=result.garden.care.receipts.find(row=>row.requestId===requestId);
        const status=resolved ? receipt?.status || 'queued' : 'waiting';
        return {ok:resolved,accepted:resolved&&!['failed','cancelled','completed','paused'].includes(status),conflict:!resolved,requestId,status,
          ...(resolved?{}:{pending:result.garden.care.pendingConflict}),
          message:resolved ? (decision==='force'?'已接收这次照料安排，实际进度以菜园任务为准':'已保留稍后照料任务，等当前安排结束再执行') : '原照料请求已保留，正在等待已有队列腾出位置',
          garden:result.garden,home:homeView(result.state,now,result.env)};
      };
      if(g.care.pendingConflict){
        if(!decision)return {ok:true,accepted:false,conflict:true,pending:g.care.pendingConflict,message:g.care.pendingConflict.question,garden:publicView(g,h,now),home:homeView(h,now,env)};
        return resolveCare();
      }
      const blocker=careBlocker(g,h,now,env);
      if(blocker?.kind==='paused')return {ok:true,accepted:false,conflict:false,status:'paused',message:'原照料任务已暂停，请明确继续原任务；没有开始新的照料',garden:publicView(g,h,now),home:homeView(h,now,env)};
      if(blocker?.kind==='already'){
        const job=g.care.task&&!g.care.task.pausedAt ? g.care.task : g.care.queue.find(each=>!each.pausedAt);
        // A new tool call has a new request ID, but "go now" still reprioritizes
        // the existing deferred job rather than leaving its old dependency.
        if(decision==='force' && g.care.task!==job)prioritizeCare(g,h,job,now);
        rememberCareRequest(g,job,input.requestId,now,blocker.status==='running'?'复用正在执行的照料任务':'复用已经排队的照料任务');
        storage.saveGarden(gardenFile,g);
        if(decision==='force' && g.care.task!==job)storage.saveHomeState(homeFile,h,now);
        const result=tick(now);
        const receipt=result.garden.care.receipts.find(row=>row.requestId===(input.requestId || job.requestId));
        const current=result.garden.care.task?.id===job.id;
        const queued=result.garden.care.queue.some(each=>each.id===job.id);
        const status=current?'running':queued?'queued':receipt?.status || 'completed';
        return {ok:!['failed','cancelled'].includes(status),accepted:['running','queued'].includes(status),reused:true,requestId:input.requestId || job.requestId,status,
          message:current?'她正在照料，继续同一项任务':queued?'照料任务已经排队，等待当前安排完成':receipt?.message || '原照料任务已结束',garden:result.garden,home:homeView(result.state,now,result.env)};
      }
      const id=`care-${now}-${Math.random().toString(36).slice(2,8)}`;
      const requestId=input.requestId || id;
      const job=createJob(g,(g.economyConfig ? null : planGardenAction(g,g.care.rotation,now))||{type:'visit'},'requested',now,requestId);
      if(blocker){
        const deferOperationId=blockingPlannedOperation(g,h);
        g.care.pendingConflict={id,requestId,job,...(deferOperationId?{deferOperationId}:{}),question:pendingQuestion(blocker),kind:blocker.kind,createdAt:now,deadline:now+CARE_CONFLICT_MS,defaultDecision:blocker.defaultDecision||'defer'};
        g.care.status=g.care.pendingConflict.question;
        if(decision)return resolveCare();
        g.care=normalizeGardenCare(g.care,Number.isSafeInteger(g.economyRevision));storage.saveGarden(gardenFile,g);
        return {ok:true,accepted:false,conflict:true,pending:g.care.pendingConflict,message:g.care.pendingConflict.question,garden:publicView(g,h,now),home:homeView(h,now,env)};
      }
      g.care.queue.push(job);rememberCareRequest(g,job,requestId,now);g.care.nextPlanAt=now;
      g.care=normalizeGardenCare(g.care,Number.isSafeInteger(g.economyRevision));storage.saveGarden(gardenFile,g);
      const result=tick(now);
      const receipt=result.garden.care.receipts.find(row=>row.requestId===requestId);
      const status=result.garden.care.task?.id===job.id?'running':receipt?.status || 'queued';
      return {ok:!['failed','cancelled'].includes(status),accepted:['queued','running'].includes(status),conflict:false,requestId,status,
        message:status==='running'?'已接收这次照料安排，正在前往现场':receipt?.message || '已记下这次照料安排',garden:result.garden,home:homeView(result.state,now,result.env)};
    }
    const requestId=input.requestId||'';const fingerprint=keyOf(action);
    const existing=requestId&&g.care.receipts.find(r=>r.requestId===requestId);
    if(existing){
      if(existing.fingerprint!==fingerprint)return {ok:false,message:'相同请求编号不能用于不同的操作'};
      const h=storage.loadHomeState(homeFile,now);return {ok:!['failed','cancelled'].includes(existing.status),accepted:existing.status==='queued',requestId,status:existing.status,message:existing.message,garden:publicView(g,h,now),home:homeView(h,now,getEnv(now))};
    }
    if(type==='auto'){
      g.care.autoEnabled=input.enabled;g.care.nextPlanAt=0;
      // Disabling autonomy cancels only the automatic job; explicit requests remain.
      if(!input.enabled&&g.care.task?.source==='auto'){
        const job=g.care.task,h=endGardenWork(storage.loadHomeState(homeFile,now),job,now,'自主照料已暂停');
        finish(g,job,false,'自主照料已暂停',now,'cancelled');storage.saveHomeState(homeFile,h,now);
      }
      const message=input.enabled?(env.goalPolicy==='planned'?'已保存照料偏好，下一项菜园活动由当前生活计划安排':'小蓝鱼会自己安排照料菜园'):(env.goalPolicy==='planned'?'园艺偏好已关闭；生活计划和明确指令仍有效':'已暂停自主照料');g.care.status=message;
      if(requestId)g.care.receipts.push({requestId,jobId:'',fingerprint,status:'completed',message,at:now});
      g.care=normalizeGardenCare(g.care,Number.isSafeInteger(g.economyRevision));storage.saveGarden(gardenFile,g);
      const result=tick(now);return {ok:true,accepted:false,status:'completed',requestId,message,garden:result.garden,home:homeView(result.state,now,result.env)};
    }
    if(g.care.queue.length>=16)return {ok:false,message:'她已经记下很多安排，等完成一些后再告诉她吧'};
    const valid=type==='visit'?{ok:true}:applyGardenAction(g,action,now);
    if(!valid.ok)return {ok:false,message:valid.message};
    const job=createJob(g,action,'requested',now,requestId);g.care.queue.push(job);g.care.nextPlanAt=0;
    const message=`已记下${labels[type]}，小蓝鱼会走到现场完成；完成后才会结算`;
    if(requestId)g.care.receipts.push({requestId,jobId:job.id,fingerprint,status:'queued',message,at:now});
    g.care=normalizeGardenCare(g.care,Number.isSafeInteger(g.economyRevision));storage.saveGarden(gardenFile,g);
    const result=tick(now);return {ok:true,accepted:true,status:'queued',requestId,message,garden:result.garden,home:homeView(result.state,now,result.env)};
  }
  return {tick,control};
}
