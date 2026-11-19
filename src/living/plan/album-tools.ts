import type {Context} from '@deepseek-ai/cordis';
import type {Agent} from '@deepseek-ai/dsh-agent';
import type {ToolDefinition} from '@deepseek-ai/dsh-tools';
import {createRequire} from 'node:module';
import type {PetCoreHost} from '../../core/index.js';
import type {CompanionRecordLibrary} from '../../core/records.js';

const {photoTools} = createRequire(import.meta.url)('#dsh-world/life/photoTools') as {
  photoTools(deps:{agent?:Agent;store?:()=>ReturnType<CompanionRecordLibrary['album']>;attachments?:()=>unknown;inside?:()=>boolean}):ToolDefinition[];
};
export const upstreamAlbumToolNames = photoTools({}).map(tool => tool.name);

/** Use the upstream tools against the admitted message and the same bound album in ordinary chats. */
export function registerAlbumTools(ctx:Context, host:PetCoreHost, library:(agent:Agent)=>CompanionRecordLibrary|undefined) {
  const catalog = photoTools({});
  const scopedTools = ctx.tools as unknown as {register(tool:ToolDefinition,options:{when(context:{agent?:Agent}):boolean}):()=>void};
  for (const [index,definition] of catalog.entries()) {
    const name = 'pet_'+definition.name;
    scopedTools.register({...definition, name, description:definition.description?.replaceAll('list_photos','pet_list_photos'),
      execute:async(args,exec)=>{
        const agent=exec.agent, album=agent && library(agent);
        if (!agent || !album || !host.native.manages(agent.id)) throw Error('相册需要当前工作区的原生对话');
        exec.signal.throwIfAborted();
        const scoped=photoTools({agent,store:()=>album.album(),attachments:()=>ctx.get('attachments' as never),
          inside:()=>library(agent)===album && host.native.manages(agent.id)});
        return scoped[index].execute(args,exec);
      },
    }, {when:({agent}:{agent?:Agent})=>Boolean(agent && library(agent))});
    ctx.effect(() => host.native.toolTable.register({name,sources:['owner']}).revoke);
  }
}
