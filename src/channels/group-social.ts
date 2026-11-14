import {lstatSync, readFileSync} from 'node:fs';
import {durableWrite} from '#dsh-world/life/lifeStore';
import type {SpeakerIdentity} from '#dsh-world/ecosystem/shared/identity';
import {evaluateWakeTriggerV2, noteModelMessagesV2, requestedReadThroughSeqV2, acknowledgeMessagesV2} from '#feiyu-room/group-wake';
import {SENSITIVE_RE} from '#feiyu-room/sensitive';
import type {GroupArguments} from './group-tools.js';

export interface WakeSettings {
  anyMessage:boolean; atMention:boolean; nameMention:boolean; question:boolean;
  keywords:string[]; speakerIds:string[]; probability:number; maxPerMinute:number; maxPerHour:number;
}
export const defaultWake:WakeSettings = {
  anyMessage:false, atMention:true, nameMention:true, question:true, keywords:[], speakerIds:[],
  probability:0, maxPerMinute:1, maxPerHour:12,
};
export function wakeSettings(value:unknown):WakeSettings {
  const w=value as WakeSettings;
  if (!w || [w.anyMessage,w.atMention,w.nameMention,w.question].some(v=>typeof v!=='boolean') ||
    !Array.isArray(w.keywords) || w.keywords.length>100 || w.keywords.some(k=>typeof k!=='string'||!k.trim()||k.length>64) ||
    !Array.isArray(w.speakerIds) || w.speakerIds.length>100 || w.speakerIds.some(id=>typeof id!=='string'||!/^\d{1,24}$/.test(id)) ||
    !Number.isFinite(w.probability)||w.probability<0||w.probability>1 ||
    !Number.isInteger(w.maxPerMinute)||w.maxPerMinute<1||w.maxPerMinute>60 ||
    !Number.isInteger(w.maxPerHour)||w.maxPerHour<1||w.maxPerHour>1000) throw Error('群唤醒设置无效');
  return {...w};
}

interface ChatLine {seq:number; messageId:string; speakerId:string; sender:string; text:string; reason:string|null; woken?:boolean}
export interface GroupReport {level:'info'|'warning'|'error'; message:string; at:number}
interface SocialState {
  lastUnreadSeq:number; lastReadThroughSeq:number; unread:ChatLine[]; wakes:number[];
  lastWakeReason:string; lastFeedback:string; reports?:GroupReport[];
}
export const socialOperations=new Set(['qq_get_unread','qq_mark_read','qq_send_message','qq_reply','qq_feedback','qq_report_feedback']);

/** Each native group has its own wake ledger and read receipts. Only messages
 * shown in this process can be acknowledged. A new process must fetch them again. */
export class GroupSocial {
  private seen=new Set<number>();
  private replies=new Map<string,{text:string;replyTo?:string}>();
  constructor(private file:string, private companionName:()=>string=()=> '') {}

  private read():SocialState {
    const stat=lstatSync(this.file,{throwIfNoEntry:false});
    if (!stat) return {lastUnreadSeq:0,lastReadThroughSeq:0,unread:[],wakes:[],lastWakeReason:'',lastFeedback:'',reports:[]};
    if (!stat.isFile() || stat.nlink!==1) throw Error('群聊记录不可用');
    return JSON.parse(readFileSync(this.file,'utf8')) as SocialState;
  }
  private save(state:SocialState) {durableWrite(this.file,JSON.stringify(state));}

  observe(id:SpeakerIdentity, text:string, segments:readonly {type:string;data?:Record<string,unknown>}[], reply:boolean, settings:WakeSettings) {
    const state=this.read(), messageId=id.platformMessageId!;
    if (state.unread.some(m=>m.messageId===messageId)) return;
    const plain=segments.length ? segments.filter(p=>p.type==='text').map(p=>String(p.data?.text??'')).join('') : text;
    const reason=evaluateWakeTriggerV2({wakeConfig:{triggers:settings}}, {
      message:segments,self_id:id.accountId,user_id:id.speakerId.slice(3),sender:{nickname:id.speakerName},
    },plain,reply,this.companionName());
    state.unread.push({seq:++state.lastUnreadSeq,messageId,speakerId:id.speakerId,
      sender:id.speakerName??id.speakerId,text:text.slice(0,200),reason});
    state.unread=state.unread.slice(-30);
    this.save(state);
  }

  wake(id:SpeakerIdentity, configured:boolean, settings:WakeSettings, recovering=false) {
    const state=this.read();
    const row=state.unread.find(m=>m.messageId===id.platformMessageId && m.speakerId===id.speakerId);
    if (!row) return false;
    if (row.woken) return recovering;
    const reason=row.reason || (configured ? 'accountTrigger' : '');
    if (!reason) return false;
    const now=Date.now();
    state.wakes=state.wakes.filter(time=>now-time<3600000);
    if (state.wakes.length>=settings.maxPerHour || state.wakes.filter(time=>now-time<60000).length>=settings.maxPerMinute) return false;
    row.woken=true;
    state.lastWakeReason=reason;
    state.wakes.push(now);
    this.save(state);
    return true;
  }

  view() {
    const state=this.read();
    return {unread:state.unread.length,lastFeedback:state.lastFeedback,lastWakeReason:state.lastWakeReason,reports:state.reports??[]};
  }

  private unread() {
    const state={...this.read(),modelSeenSeqs:this.seen};
    const readThroughSeq=noteModelMessagesV2(state,state.unread);
    this.seen=state.modelSeenSeqs;
    return {messages:state.unread.map(({seq,messageId,sender,speakerId,text})=>({seq,messageId,sender,speakerId,text})),readThroughSeq};
  }

  private markRead(throughSeq:number|undefined) {
    if (typeof throughSeq!=='number') throw Error('请提供展示过的消息水位');
    const state={...this.read(),modelSeenSeqs:this.seen};
    const through=requestedReadThroughSeqV2(state,{throughSeq},true);
    const count=acknowledgeMessagesV2(state,through);
    const {modelSeenSeqs,...updated}=state;
    this.seen=modelSeenSeqs;
    this.save(updated);
    return {count,throughSeq:through};
  }

  private report({message,level}:GroupArguments) {
    const raw=message?.trim();
    if (!raw) throw Error('反馈不能为空');
    const state=this.read(), now=Date.now(), reports=state.reports??[];
    if (reports.filter(r=>now-r.at<60000).length>=5 || reports.filter(r=>now-r.at<3600000).length>=20) throw Error('反馈过于频繁');
    const entry:GroupReport={at:now,level:level==='error'||level==='warning'?level:'info',
      message:raw.slice(0,500).replace(new RegExp(SENSITIVE_RE.source,'gi'),'***')};
    state.reports=[...reports,entry].slice(-500);
    this.save(state);
    return entry;
  }

  act(id:SpeakerIdentity,name:string,input:GroupArguments) {
    const key=id.platformMessageId;
    if (!key) throw Error('没有当前群的入站消息');
    if (name==='qq_get_unread') return this.unread();
    if (name==='qq_mark_read') return this.markRead(input.throughSeq);
    if (name==='qq_report_feedback') return this.report(input);
    const state=this.read();
    if (name==='qq_send_message' || name==='qq_reply') {
      const text=input.text?.trim();
      if (!text || text.length>500) throw Error('群消息必须是 1 至 500 个字符');
      this.replies.set(key,{text,replyTo:input.replyToMessageId});
      state.lastFeedback='选择发言';
      this.save(state);
      return {queued:true,note:'已选择发言，等待本轮结束后由 QQ 送回当前群。'};
    }
    if (name!=='qq_feedback' || !['silent','participated'].includes(String(input.decision))) throw Error('未知的群反馈');
    if (input.decision==='silent') this.replies.delete(key);
    state.lastFeedback=input.decision==='silent'?'选择旁观':'已处理群消息';
    this.save(state);
    return {feedback:state.lastFeedback};
  }

  response(id:SpeakerIdentity) {
    const key=id.platformMessageId!, reply=this.replies.get(key)?.text ?? '';
    this.replies.delete(key);
    return reply;
  }
  quoteTarget(id:SpeakerIdentity) {return this.replies.get(id.platformMessageId!)?.replyTo;}
}
