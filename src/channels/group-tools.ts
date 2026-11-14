import type {Agent} from '@deepseek-ai/dsh-agent';
import {defineTool, type ToolDefinition} from '@deepseek-ai/dsh-tools';
import type {SpeakerIdentity} from '#dsh-world/ecosystem/shared/identity';

export interface GroupTransport {
  forward?(id:string):Promise<unknown>;
  sendSticker?(identity:SpeakerIdentity, id:string):Promise<unknown>;
}
const output = {schema:{type:'string' as const},render:(_args:unknown,text:string)=>[{type:'text' as const,text}]};
const string = {type:'string' as const}, required = {...string,required:true as const};
const specs:{name:string;description:string;parameters:Record<string,{type:'string'|'integer';required?:true}>}[] = [
  {name:'qq_get_unread',description:'读取本群已收到的未读消息、来源和可确认的水位。',parameters:{}},
  {name:'qq_mark_read',description:'将已经看到的本群消息标为已读。',parameters:{throughSeq:{type:'integer',required:true}}},
  {name:'qq_send_message',description:'选择发给当前群的正文。可用 replyToMessageId 引用本群的一条实际消息。每次唤醒只发送最终选择。',parameters:{text:required,replyToMessageId:string}},
  {name:'qq_reply',description:'回复当前群内的指定消息，平台会展示对应的引用。',parameters:{text:required,replyToMessageId:required}},
  {name:'qq_feedback',description:'决定旁观时选择 silent，参与讨论后可反馈 participated。',parameters:{decision:required}},
  {name:'qq_report_feedback',description:'向主人报告本群的观察或问题。此条仅在当前群的管理界面展示。level 支持 info、warning 和 error。',parameters:{level:string,message:required}},
  {name:'qq_memory_append',description:'依据本群亲历的互动，给这条消息的实际作者留一条简短印象。',parameters:{messageId:required,note:required}},
  {name:'qq_memory_update',description:'根据本群成员的更正更新对其的简短印象。',parameters:{messageId:required,note:required}},
  {name:'qq_memory_remove',description:'清除对本群这条消息实际作者的印象。',parameters:{messageId:required}},
  {name:'qq_slang_query', description:'查询本群讨论过的用语。已审核的解释可用于聊天。',parameters:{query:string}},
  {name:'qq_slang_submit', description:'在当前群发言中发现新用语时，提交原词与其真实消息编号，供本群审核。',parameters:{term:required,messageId:required}},
  {name:'qq_list_stickers', description:'按词查看本群收藏的表情和备注。',parameters:{query:string}},
  {name:'qq_collect_sticker', description:'收藏本群已收到消息中的指定 QQ 表情，供本群再次使用。',parameters:{messageId:required,id:required,note:string}},
  {name:'qq_sticker_note',description:'更新本群某张收藏表情的简短备注。',parameters:{id:required,note:required}},
  {name:'qq_send_sticker',description:'将本群收藏的一张表情发回当前聊天。',parameters:{id:required}},
  {name:'qq_get_forward_msg',description:'按本群实际收到的合并转发编号，查看聊天记录和嵌套转发。',parameters:{id:required}},
];
export interface GroupArguments {
  id?:string; query?:string; term?:string; note?:string; messageId?:string;
  text?:string; throughSeq?:number; decision?:string; level?:string; message?:string; replyToMessageId?:string;
}
export function groupTools(agent:Agent, allowed:(name:string)=>boolean, run:(name:string,args:GroupArguments)=>Promise<unknown>) {
  const tools = agent.ctx.tools as unknown as {register(definition:ToolDefinition, scope:{when(context:{agent?:Agent}):boolean}):()=>void};
  const offs = specs.map(({name,description,parameters})=>{
    const tool = defineTool({name,description,parameters,output,
      execute:async(args, exec)=>{
        exec.signal.throwIfAborted();
        if (exec.agent!==agent || !allowed(name)) throw Error('当前群玩法未启用');
        // Native tool errors may otherwise include a backend URL or a private
        // device path. Public results contain only this group's scoped data.
        try {return JSON.stringify(await run(name,args));}
        catch {throw Error('群操作未完成，请核对当前群的功能、消息编号或网关回执。');}
      }});
    return tools.register(tool,{when:context=>context.agent===agent && allowed(name)});
  });
  return () => offs.forEach(off=>off());
}
