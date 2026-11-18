import type {Agent} from '@deepseek-ai/dsh-agent';
import type {Message} from '@deepseek-ai/dsh-llm';
import type {SessionEvent,UserMessage} from '@deepseek-ai/dsh-session';
import type {CompanionToolDeclaration,RegistrationLease,SourceClassificationResult} from '../../contracts/tables.js';
import {NATIVE_HISTORY_CONTEXT_SOURCES} from '../../contracts/tables.js';
import type {CompanionToolTable} from '../tables/tools.js';

export const isHistoryObject=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);

/** Reuse module-owned structured projections, never middle-slice JSON or prose.
 * Explicit full/detail/receipt reads and already-small results are immutable. */
function projectHistory(declaration:CompanionToolDeclaration|undefined,args:unknown,value:unknown):unknown|undefined {
  if(!isHistoryObject(args)||!isHistoryObject(value)||args.view==='full'||value.view!==undefined||value.ok===false
    ||'factIds' in args||'section' in args)return;
  return declaration?.historyOverview?.(args,value);
}

export function historicalStateOverview(tools:CompanionToolTable,name:string,args:unknown,value:unknown):unknown|undefined {
  return projectHistory(tools.get(name),args,value);
}

/** Only completed Life turns, excluding owner takeovers, reviews and the latest
 * turn. Raw tool calls identify reads; mutations, errors and other tools stay. */
type ClassifySource=(message:UserMessage)=>SourceClassificationResult;
const historyContextSources = new Set<string>(NATIVE_HISTORY_CONTEXT_SOURCES);

export function lifeHistoryCandidates(
  events:readonly SessionEvent[],nodes:readonly number[],classify:ClassifySource,warn:(message:string)=>void=console.warn,
):{
  event:SessionEvent<'tool/result'>;call:SessionEvent<'tool/call'>['data'];lease:RegistrationLease;
}[] {
  let turn:number|undefined;
  const states=new Map<number,{lease?:RegistrationLease;protected:boolean;completed:boolean}>();
  const calls=new Map<string,SessionEvent<'tool/call'>['data']>();
  for(const event of events) {
    if(event.type==='turn/start'){turn=event.data.turn;states.set(turn,{protected:false,completed:false});}
    if(event.type==='tool/call')calls.set(event.data.callId,event.data);
    const state=turn===undefined?undefined:states.get(turn);
    if(!state)continue;
    if(event.type==='user/message'&&!historyContextSources.has(event.data.source.kind)) {
      const classification=classify(event.data);
      if(!classification||'kind' in classification) {
        state.protected=true;
        if(classification)warn(`History classification failed for ${event.data.source.kind} (adapter ${classification.adapterId}); retaining turn ${turn}`);
      } else {
        if(classification.historyProjection?.participates)state.lease=classification.lease;
        if(classification.historyProjection?.protectsTurn)state.protected=true;
      }
    }
    if(event.type==='turn/end'){state.completed=event.data.reason.kind==='completed';turn=undefined;}
  }
  const latest=Math.max(...states.keys());
  return nodes.flatMap(seq=>{
    const event=events[seq];if(event?.type!=='tool/result'||event.data.message.isError)return [];
    const call=calls.get(event.data.message.toolCallId),state=call&&states.get(call.turn);
    if(!call||!state?.lease?.isCurrent()||state.protected||!state.completed||call.turn===latest)return [];
    return [{event,call,lease:state.lease}];
  });
}

export interface HistoryProjection {
  event:SessionEvent<'tool/result'>;text:string;lease:RegistrationLease;isToolCurrent():boolean;
}
export interface HistoryMaintenanceResult {replaced:number;charsBefore:number;charsAfter:number}

/** Idle maintenance is read-only. Native persistence requires replacement
 * tool results inside an open turn, so landing waits for the next real request.
 * This does not wake a session or consume/acknowledge any domain facts. */
export async function prepareLifeHistory(
  agent:Agent,isCurrent:()=>boolean,classify:ClassifySource,tools:CompanionToolTable,
):Promise<HistoryProjection[]> {
  if(agent.status!=='idle'||agent.inbox.nextTurn.length||agent.inbox.nextStep.length||!isCurrent())return [];
  return agent.runMaintenance(async signal=>{
    const changes:HistoryProjection[]=[];
    const candidates=lifeHistoryCandidates(agent.session.snapshotEvents(),agent.session.surface.nodes,classify,
      message=>agent.ctx.logger('chatpet-context').warn(message));
    for(const {event,call,lease} of candidates) {
      signal.throwIfAborted();if(!isCurrent())return [];
      const declaration=tools.get(call.name);
      if(!declaration?.historyOverview)continue;
      const original=agent.session.deriveEventMessage(event);
      if(!original||original.content.length!==1||original.content[0]?.type!=='text')continue;
      let args:unknown,value:unknown;
      try{args=JSON.parse(call.arguments);value=JSON.parse(original.content[0].text);}catch{continue;}
      const view=projectHistory(declaration,args,value);if(view===undefined)continue;
      const text=JSON.stringify(view);
      // The table freezes a separate sources array for each registration.
      if(text.length<original.content[0].text.length)changes.push({
        event,text,lease,isToolCurrent:()=>tools.get(call.name)?.sources===declaration.sources,
      });
    }
    return changes;
  });
}

/** Native pruning pattern: shadow pricing, positional replacement and exact
 * source citation. Must run in agent/request, never in the idle log. Ordinary
 * native turn persistence checkpoints the change; originals remain replayable. */
export function applyLifeHistory(agent:Agent,changes:readonly HistoryProjection[],meter:{estimateMessage(message:Message):number}):HistoryMaintenanceResult {
  const result={replaced:0,charsBefore:0,charsAfter:0},session=agent.session;
  const visible=new Set<number>(session.surface.nodes);
  for(const {event,text,lease,isToolCurrent} of changes) {
    if(!lease.isCurrent()||!isToolCurrent()||!visible.has(event.seq))continue; // Native compaction may have superseded the prepared span.
    const original=session.deriveEventMessage(event);
    if(!original||original.content.length!==1||original.content[0]?.type!=='text')continue;
    const appendPrune=session.append.bind(session) as (type:'compaction/prune',data:{
      shadowedRange:{start:number;end:number};shadowedSeqs:number[];shadowedTokenCount:number;
    })=>unknown;
    appendPrune('compaction/prune',{shadowedRange:{start:event.seq,end:event.seq},shadowedSeqs:[event.seq],
      shadowedTokenCount:meter.estimateMessage(original)});
    session.append('tool/result',{...event.data,message:{...original,content:[{type:'text',text}]} as typeof event.data.message},
      {surfaceOp:{op:'replace',startSeq:event.seq,endSeq:event.seq},sourceEventSeqs:[event.seq]});
    visible.delete(event.seq);
    result.replaced++;result.charsBefore+=original.content[0].text.length;result.charsAfter+=text.length;
  }
  return result;
}
