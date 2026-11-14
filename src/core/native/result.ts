import {foldConsumedWork} from '@deepseek-ai/dsh-agent';
import type {SessionEvent} from '@deepseek-ai/dsh-session';
import {finalReply} from '../upstream/messages.js';

export interface NativeRunResult {
  state:'completed'|'cancelled'|'failed'|'unknown';
  hostTurnIds:readonly string[];text:string;reason?:string;
}

/** Read the original native log; this neither schedules nor resumes a session. */
export function nativeResult(events:readonly SessionEvent[],messageId:string):NativeRunResult {
  const inputIndex=events.findIndex(event=>event.type==='user/message'&&event.data.id===messageId);
  if(inputIndex<0) {
    // Native pre-step rejection can consume input without a user/message event.
    const queued=events.findIndex(event=>event.type==='agent/inbox/spliced'&&event.data.inserted.some(message=>message.id===messageId));
    if(queued>=0) {
      const consumed=foldConsumedWork(events.slice(queued));
      if(consumed.droppedUnrun)return {state:'cancelled',text:'',hostTurnIds:[],reason:'Native inbox confirms unrun work was dropped'};
      if(consumed.end) {
        const reason=consumed.end.data.reason.kind;
        if(['error','blocked','aborted'].includes(reason))return {state:reason==='aborted'?'cancelled':'failed',text:'',
          hostTurnIds:[String(consumed.end.data.turn)],reason:`Native work ended before its first step: ${reason}`};
      }
    }
    return {state:'unknown',text:'',hostTurnIds:[],reason:'Native log does not prove that this input entered a turn'};
  }
  const turnStart=events.slice(0,inputIndex+1).reverse().find(event=>event.type==='turn/start');
  if(!turnStart||turnStart.type!=='turn/start')return {state:'unknown',text:'',hostTurnIds:[],reason:'Input has no owned turn boundary'};
  const turn=turnStart.data.turn,end=events.slice(inputIndex).find(event=>event.type==='turn/end'&&event.data.turn===turn);
  const hostTurnIds=[String(turn)];
  if(!end||end.type!=='turn/end')return {state:'unknown',text:'',hostTurnIds,reason:'Owned native turn has no terminal receipt'};
  const text=finalReply(events.slice(inputIndex),turn);
  if(end.data.reason.kind==='completed')return {state:'completed',hostTurnIds,text};
  if(end.data.reason.kind==='aborted')return {state:'cancelled',hostTurnIds,text:'',reason:'Native turn confirms cancellation'};
  if(['error','blocked','max-tokens'].includes(end.data.reason.kind))return {state:'failed',hostTurnIds,text:'',reason:`Native turn ended: ${end.data.reason.kind}`};
  return {state:'unknown',hostTurnIds,text:'',reason:`Native turn ended: ${end.data.reason.kind}`};
}
