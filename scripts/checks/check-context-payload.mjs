// Explicit read-only input only. Never discover/open a personal workspace.
// Compare fixed original tool results against current model-facing projections;
// this measures text size, not service-side tokens, caching or future behavior.
import {readFileSync} from 'node:fs';
import {zstdDecompressSync} from 'node:zlib';
import {foldSurface,deriveEventMessage} from '@deepseek-ai/dsh-session/surface';
import {roomOverview,gardenOverview} from '../../dist/src/room/tool-context.js';
import {economyOverview} from '../../dist/src/living/economy/tool-context.js';
import {planOverview} from '../../dist/src/living/plan/tool-context.js';
import {presentFacts} from '../../dist/src/core/interaction-presentation.js';
import {lifeHistoryCandidates,historicalStateOverview} from '../../dist/src/core/native/history-maintenance.js';
import {CoreNative} from '../../dist/src/core/native/conversation.js';
import {createLifeSourceAdapter} from '../../dist/src/living/plan/tool-policy.js';
import {createChannelSourceAdapter} from '../../dist/src/channels/sessions.js';
import {roomHistoryTools} from '../../dist/src/room/plugin.js';
import {economyStateToolDeclaration} from '../../dist/src/living/economy/plugin.js';
import {lifePlanReadToolDeclaration} from '../../dist/src/living/plan/plan-tools.js';

const args=process.argv.slice(2);if(args[0]==='--')args.shift();
const [file,...options]=args;
if(!file||file.startsWith('--'))throw Error('Usage: check-context-payload.mjs /absolute/events.json[l][.zstd] [--day YYYY-MM-DD] [--offset-hours 7]');
const option=name=>{const at=options.indexOf(name);return at<0?undefined:options[at+1];};
const wanted=option('--day'),offset=Number(option('--offset-hours')??7);
if(!Number.isFinite(offset)||Math.abs(offset)>14)throw Error('Invalid UTC offset');
let buffer=readFileSync(file),raw='';
if(file.endsWith('.zstd'))while(buffer.length){const result=zstdDecompressSync(buffer,{info:true});raw+=result.buffer.toString();buffer=buffer.subarray(result.engine.bytesWritten);}
else raw=buffer.toString();
const events=(raw.trim().startsWith('[')?JSON.parse(raw):raw.trim().split('\n').filter(Boolean).map(JSON.parse)).filter(event=>event.type!=='session');
const text=message=>(message?.content??[]).map(block=>block.text??block.arguments??'').join('\n');
const inPeriod=event=>!wanted||new Date(event.time+offset*3600000).toISOString().slice(0,10)===wanted;
let turn;const ownerTurns=new Set(),calls=new Map(),replacements=new Map(),produced={},notices={count:0,before:0,after:0};
for(const event of events){if(event.type==='turn/start')turn=event.data.turn;if(event.type==='user/message'&&event.data.source.kind==='user')ownerTurns.add(turn);if(event.type==='tool/call')calls.set(event.data.callId,event.data);}
for(const event of events){
  if(event.type==='tool/result') {
    const call=calls.get(event.data.message.toolCallId);if(!call)continue;
    let args,value;try{args=JSON.parse(call.arguments);value=JSON.parse(text(event.data.message));}catch{continue;}
    if(args.view==='full'||ownerTurns.has(call.turn)&&args.view!=='overview')continue;
    const project=call.name==='room_state'?roomOverview:call.name==='room_garden'&&args.type==='state'?gardenOverview:
      call.name==='pet_economy_state'&&!args.section?economyOverview:call.name==='life_plan_read'?planOverview:null;
    if(!project)continue;
    const after=JSON.stringify(project(value));replacements.set(event.seq,after);
    if(inPeriod(event)){const stats=produced[call.name]??={count:0,before:0,after:0};stats.count++;stats.before+=text(event.data.message).length;stats.after+=after.length;}
  } else if(event.type==='user/message'&&event.data.source.kind==='dsh-world-life'&&event.data.source.facts?.length) {
    const after=presentFacts(event.data.source.facts);replacements.set(event.seq,after);
    if(inPeriod(event)){notices.count++;notices.before+=text(event.data).length;notices.after+=after.length;}
  }
}
const visible={requests:0,allToolTextBefore:0,allToolTextAfter:0,candidateTextBefore:0,candidateTextAfter:0};
const maintenance={results:0,resultCharsBefore:0,resultCharsAfter:0,requestBodyBefore:0,requestBodyAfter:0,
  toolHistoryBefore:0,toolHistoryAfter:0,summaryCallsAdded:0};
const maintained=new Map();
const {sourceTable:sources,toolTable}=new CoreNative({});
for(const declaration of [...roomHistoryTools,economyStateToolDeclaration,lifePlanReadToolDeclaration])toolTable.register(declaration);
sources.register(createLifeSourceAdapter({},{},()=>false));
const offline=()=>{throw Error('History analysis does not admit live channel input');};
sources.register(createChannelSourceAdapter({guest:offline,ownerActorId:offline,admit:offline}));
const classify=message=>sources.classify(message);
for(let index=0;index<events.length;index++){
  if(events[index].type==='turn/end'&&events[index].data.reason.kind==='completed') {
    const prefix=events.slice(0,index+1),surface=foldSurface(prefix);
    for(const {event,call} of lifeHistoryCandidates(prefix,surface.nodes,classify)) {
      if(maintained.has(event.seq)||event.data.message.content.length!==1||event.data.message.content[0].type!=='text')continue;
      let args,value;try{args=JSON.parse(call.arguments);value=JSON.parse(text(event.data.message));}catch{continue;}
      const view=historicalStateOverview(toolTable,call.name,args,value);if(view===undefined)continue;
      const projected=JSON.stringify(view),before=text(event.data.message).length;if(projected.length>=before)continue;
      maintained.set(event.seq,projected);maintenance.results++;
      maintenance.resultCharsBefore+=before;maintenance.resultCharsAfter+=projected.length;
    }
  }
  if(events[index].type!=='assistant/message'||!inPeriod(events[index]))continue;
  visible.requests++;
  const surface=foldSurface(events.slice(0,index));
  for(const seq of surface.nodes){const event=events[seq],message=deriveEventMessage(event,surface.projectedMessages);if(!message)continue;
    const before=text(message).length,after=replacements.get(seq)?.length??before;
    const maintainedLength=maintained.get(seq)?.length??before;
    maintenance.requestBodyBefore+=before;maintenance.requestBodyAfter+=maintainedLength;
    if(event.type==='tool/result'){maintenance.toolHistoryBefore+=before;maintenance.toolHistoryAfter+=maintainedLength;}
    if(event.type==='tool/result'){visible.allToolTextBefore+=before;visible.allToolTextAfter+=after;}
    if(replacements.has(seq)){visible.candidateTextBefore+=before;visible.candidateTextAfter+=after;}
  }
}
console.log(JSON.stringify({unit:'text characters (UTF-16)',period:wanted??'all',produced,notices,visible,maintenance,
  limits:'Fixed original calls, owner full-view defaults preserved. Maintenance models native idle boundaries over legacy full defaults and retains the latest turn. Its savings overlap the overview estimates; never add the two. New runtime-context/header overhead, provider tokens/cache and changed decisions are not measured. No data written; no model or network calls.'},null,2));
