import type {ChannelContextMessage} from '#dsh-world/ecosystem/shared/context';
import {conversationKey, speakerIdentity, type SpeakerIdentity} from '#dsh-world/ecosystem/shared/identity';
import {createBatcher} from '#dsh-world/ecosystem/qq-native/batch';
import {createOutbox} from '#dsh-world/ecosystem/qq-native/outbox';
import {planReply, stripHostNoise, type QqPart} from '#dsh-world/ecosystem/qq-native/replies';
import {isSilentMarker} from '#feiyu-room/group-wake';
import type {createQzoneLedger} from './group-qzone.js';
import type {QQSettings} from './messaging-settings.js';

type Segment = {type:string; data?:Record<string,unknown>};
export interface QQMessage {kind:'group'|'private'; selfId:string; userId:string; groupId?:string; messageId:string; text:string;
  segments?:Segment[]; sender?:{nickname?:string;card?:string}; time?:number}
export type QQTransport = Pick<ReturnType<typeof import('#dsh-world/adapters/qq-sdk').createBridge>,
  'start'|'stop'|'getState'|'sendPrivate'|'sendGroup'|'sendCustomFace'|'publishQzone'|'getForward'|'sendGroupSticker'|'recordText'|'sendVoice'>;
export interface QQOptions {
  wsUrl:string; accessToken?:string; onGroupMessage(message:QQMessage):void; onPrivateMessage(message:QQMessage):void;
  onState(s:string):void; onNotice(type:string):void; log(level:string,message:string):void;
}
interface Host {
  settings:QQSettings; qzone:ReturnType<typeof createQzoneLedger>;
  active():boolean; allowed(id:SpeakerIdentity):boolean; owner(id:SpeakerIdentity):boolean;
  take(id:SpeakerIdentity):boolean;
  speak(text:string):Promise<Buffer>;
  decideGroup(id:SpeakerIdentity,trigger:boolean):{mode:'v1'|'v2';wake:boolean};
  groupQuote(id:SpeakerIdentity):string|undefined;
  groupResponse(id:SpeakerIdentity,text:string,mode:'v1'|'v2'):string;
  observeGroup(id:SpeakerIdentity,message:QQMessage,flags:{replyToSelf:boolean}):void;
  ask(text:string,id:SpeakerIdentity,context:ChannelContextMessage[],mode:'v1'|'v2'):Promise<{text:string}>;
  transport(options:QQOptions):QQTransport;
}
interface Received { identity:SpeakerIdentity; text:string; at:string; record:boolean; mode:'v1'|'v2' }
type Packet = {identity:SpeakerIdentity; parts:string|(QqPart|{type:'reply';id:string})[]};

/** World QQ home, SDK, reply planner, batching and retry queue. The owner
 * binding is explicit and group batches retain a single verified speaker. */
export function openQQ(host:Host) {
  const config=host.settings, contexts=new Map<string,ChannelContextMessage[]>(), sentIds=new Set<string>();
  let stopped=false, sent=0, failed=0, blocked=0, error:string|null=null, state='connecting';
  const allowed=(id:SpeakerIdentity)=>!stopped&&host.active()&&host.allowed(id);
  const recentGroupText:string[]=[];
  const voiceTimes=new Map<string,number[]>();
  let voiceReceived=0, voiceVerified=0, voiceUncertain=0;
  const muted=()=>!!config.mutedUntil && Date.now()<Date.parse(config.mutedUntil);
  const history=(id:SpeakerIdentity,line:ChannelContextMessage) => {
    if (!config.contextMessages) return;
    const key=conversationKey(id);
    contexts.set(key,[...(contexts.get(key)??[]),line].slice(-config.contextMessages));
  };
  const outbox=createOutbox<Packet>({async send({identity,parts}) {
    if (!allowed(identity)) return;
    if (client.getState()!=='online') throw Error('QQ 离线');
    // A timed-out submission may already have been sent. Only a definite
    // pre-send disconnection enters the upstream retry queue.
    try {
      const response=await (identity.conversationType==='group' ? client.sendGroup(identity.conversationId,parts):client.sendPrivate(identity.conversationId,parts));
      if (!response.messageId) throw Error('no receipt');
      sentIds.add(conversationKey(identity)+':'+response.messageId); if(sentIds.size>500) sentIds.delete(sentIds.values().next().value!);
      sent++;
    } catch {failed++;error='发送结果待核对';}
  }, dropped(){failed++;error='回复在通道恢复前已过期';}});
  async function answer(key:string, gathered:Received[]) {
    const last=gathered.at(-1)!;
    if (!allowed(last.identity) || !config.autoReply || muted()) return;
    if(config.voiceEnabled) {
      for(const item of gathered.filter(item=>item.record)) {
        let transcript='';
        try {transcript=await client.recordText(item.identity.platformMessageId!);} catch { /* gateway may not support transcription */ }
        voiceReceived++;
        item.text=item.text.replace('[语音]',()=>transcript?'[语音转写] '+transcript:'[语音未取得转写]');
      }
    }
    if(!allowed(last.identity)||muted())return;
    const prior=contexts.get(conversationKey(last.identity))??[];
    const quoted=gathered.slice(0,-1).map(item=>({id:item.identity.platformMessageId!, occurredAt:item.at, text:item.text, identity:item.identity}));
    // For a group the original home accepts attributed context. In a private
    // batch all lines have the same verified author; all platform IDs stay in
    // the durable input receipts.
    const group=last.identity.conversationType==='group';
    const question=group?last.text:gathered.map(item=>item.text).join('\n');
    try {
      const context=group?[...prior,...quoted].slice(-20):[];
      // World rejects oversized channel-context bodies. Keep the freshest
      // actual messages within its bound even after a busy group batch.
      while(context.length && Buffer.byteLength(JSON.stringify(context))>16*1024)context.shift();
      const reply=await host.ask(question,last.identity,context,last.mode);
      if (!allowed(last.identity) || muted()) return;
      let quoteId=group?host.groupQuote(last.identity):undefined;
      const words=stripHostNoise(group?host.groupResponse(last.identity,reply.text,last.mode):reply.text);
      if(group && !words && (last.mode==='v2' || isSilentMarker(reply.text)))return;
      if (!words) {failed++;error='没有可发送的回复正文';return;}
      const voice=words.match(/^\[\[voice:([^\[\]]{1,500})\]\]$/u)?.[1];
      const spoken=voice ?? (last.record && words.length<=500 ? words : undefined);
      const targetKey=conversationKey(last.identity), now=Date.now();
      const times=(voiceTimes.get(targetKey)??[]).filter(t=>now-t<3600000);
      const withinLimit=(!config.voicePerHour || times.length<config.voicePerHour) &&
        (!config.voicePerMinute || times.filter(t=>now-t<60000).length<config.voicePerMinute);
      if(config.voiceEnabled && spoken && withinLimit) {
        // Reserve while the TTS call is in progress. A synthesis failure does
        // not consume Room's conversation-specific audio quota.
        times.push(now);voiceTimes.set(targetKey,times);
        let bytes:Buffer|undefined;
        try {bytes=await host.speak(spoken);} catch {voiceTimes.set(targetKey,(voiceTimes.get(targetKey)??[]).filter(t=>t!==now));error='语音合成不可用，已改用文字';}
        if(!allowed(last.identity)||muted())return;
        if(bytes) {
          try {
            const result=await client.sendVoice(last.identity.conversationId,group?'group':'private',bytes);
            if(result.messageId)sentIds.add(conversationKey(last.identity)+':'+result.messageId);
            if(result.verified){voiceVerified++;sent++;}else{voiceUncertain++;error='语音已提交，网关未能回读确认';}
          } catch {voiceUncertain++;error='语音提交结果待核对';}
          return;
        }
      }
      const plan=planReply(voice??words);
      for (const item of gathered) history(item.identity,{id:item.identity.platformMessageId!,occurredAt:item.at,text:item.text,identity:item.identity});
      const outgoing=speakerIdentity({...last.identity,speakerId:'qq:'+config.accountId,speakerName:undefined,platformMessageId:undefined});
      history(last.identity,{id:key+':reply:'+last.identity.platformMessageId,occurredAt:new Date().toISOString(),text:words,identity:outgoing});
      for (const parts of plan.messages) {
        if (!allowed(last.identity)) return;
        // A remote participant cannot cause the gateway to upload host files.
        const safe=Array.isArray(parts)?parts.filter(p=>p.type!=='image'||host.owner(last.identity)&&/^https:\/\//i.test(p.file)):parts;
        if (safe.length) {
          const attributed=quoteId?[{type:'reply' as const,id:quoteId},...(typeof safe==='string'?[{type:'text' as const,text:safe}]:safe)]:safe;
          quoteId=undefined;
          await outbox.send({identity:last.identity,parts:attributed});
        }
      }
      for (const sticker of plan.stickers) if (allowed(last.identity) && host.owner(last.identity))
        await client.sendCustomFace(sticker,group?{groupId:last.identity.conversationId}:{userId:last.identity.conversationId});
      for (const post of plan.qzone) if (allowed(last.identity)&&host.owner(last.identity)) await host.qzone.publish(post,recentGroupText,body=>publish(body));
    } catch { if(!stopped){failed++;error='QQ 回合或扩展投递失败，请核对渠道回执';} }
  }
  const activeAnswers=new Set<Promise<void>>();
  const batch=createBatcher<Received>({quietMs:()=>config.batchQuietMs,flush:(key,items)=>{
    const work=answer(key,items);activeAnswers.add(work);void work.finally(()=>activeAnswers.delete(work));
  }});
  function deliver(msg:QQMessage) {
    if(stopped||!host.active()||!msg?.messageId||msg.userId===msg.selfId||!msg.text?.trim())return;
    let identity:SpeakerIdentity;
    try {identity=speakerIdentity({channel:'qq',accountId:msg.selfId,conversationId:msg.kind==='group'?msg.groupId:msg.userId,
      conversationType:msg.kind,speakerId:'qq:'+msg.userId,speakerName:msg.sender?.card||msg.sender?.nickname,platformMessageId:msg.messageId});}
    catch {blocked++;return;}
    if(!allowed(identity)){blocked++;return;}
    if(!host.take(identity))return;
    const text=msg.text.trim().slice(0,2000), at=new Date().toISOString();
    const replyToSelf=Boolean(msg.segments?.some(s=>s.type==='reply' && sentIds.has(conversationKey(identity)+':'+s.data?.id)));
    if(msg.kind==='group') {
      recentGroupText.push(text);if(recentGroupText.length>100)recentGroupText.shift();
      try {host.observeGroup(identity,msg,{replyToSelf});} catch {failed++;error='群资料无法读取';}
    }
    const directed=replyToSelf || config.groupTrigger==='all' || config.groupKeywords.some(word=>text.includes(word)) ||
      msg.segments?.some(s=>s.type==='at'&&String(s.data?.qq)===msg.selfId);
    let mode:'v1'|'v2'='v1', wake=config.autoReply&&!muted();
    if(wake && msg.kind==='group') {
      try {const decision=host.decideGroup(identity,Boolean(directed));mode=decision.mode;wake=decision.wake;}
      catch {wake=false;failed++;error='群唤醒设置无法读取';}
    }
    if(!wake){history(identity,{id:msg.messageId,occurredAt:at,text,identity});return;}
    batch.add(JSON.stringify([conversationKey(identity),identity.speakerId,mode]),{identity,text,at,mode,record:Boolean(msg.segments?.some(s=>s.type==='record'))});
  }
  const token=config.tokenEnv?process.env[config.tokenEnv]:undefined;
  if (config.tokenEnv&&!token) throw Error('QQ 凭据环境变量未设置');
  const client=host.transport({wsUrl:config.wsUrl,accessToken:token,onGroupMessage:deliver,onPrivateMessage:deliver,
    onState(value){state=value;if(value==='online')error=null;},onNotice(type){if(type==='bot_offline')error='QQ 账号离线';},
    log(level){if(level==='error')error='QQ WebSocket 连接或投递失败';}});
  function publish(text:string) {
    if(stopped||!host.active()||client.getState()!=='online')throw Error('QQ 空间账号已离线');
    return client.publishQzone(text);
  }
  function checkDrafts() {
    if(stopped||!host.active()||client.getState()!=='online')return;
    void host.qzone.tick(recentGroupText,publish).catch(()=>{if(!stopped)error='QQ 空间草稿或回执待核对';});
  }
  const timeline=setInterval(checkDrafts,60000);
  timeline.unref();
  outbox.start();
  void client.start().catch(()=>{if(!stopped)error='QQ 网关连接失败，等待重连';});
  return {
    async reach(id:SpeakerIdentity,text:string) {
      if(!allowed(id)||!host.owner(id)||muted()||client.getState()!=='online')throw Error('主人 QQ 不可用');
      const response=await client.sendPrivate(id.conversationId,text);
      if(!response.messageId)throw Error('QQ 主动消息未取得回执');
      sent++;
      return String(response.messageId);
    },
    async forward(id:SpeakerIdentity, messageId:string){if(!allowed(id)||id.conversationType!=='group')throw Error('本群已停用');return client.getForward(messageId);},
    async sendSticker(id:SpeakerIdentity, stickerId:string){if(!allowed(id)||id.conversationType!=='group')throw Error('本群已停用');return client.sendGroupSticker(id.conversationId,stickerId);},
    status:()=>({connected:client.getState()==='online',state:client.getState()||state,error,sent,failed,blocked,voiceReceived,voiceVerified,voiceUncertain,outbox:outbox.size}),
    async close(){stopped=true;clearInterval(timeline);batch.clear();outbox.stop();await client.stop();await Promise.allSettled(activeAnswers);}};
}
