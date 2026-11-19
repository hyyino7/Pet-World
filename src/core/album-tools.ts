import type {Context} from '@deepseek-ai/cordis';
import type {Agent} from '@deepseek-ai/dsh-agent';
import type {ToolDefinition} from '@deepseek-ai/dsh-tools';
import {createRequire} from 'node:module';
import type {PetCoreHost} from './index.js';
import type {CompanionRecordLibrary} from './records.js';

type Album = CompanionRecordLibrary['photoTools'];
const {photoTools} = createRequire(import.meta.url)('#dsh-world/life/photoTools') as {
  photoTools(deps:{agent?:Agent;store?:()=>Album;attachments?:()=>unknown;inside?:()=>boolean}):ToolDefinition[];
};
export const upstreamAlbumToolNames = photoTools({}).map(tool => tool.name);

/** Use the upstream tools against the admitted message and the same bound album in ordinary chats. */
export function registerAlbumTools(ctx:Context, host:PetCoreHost, currentAlbum:(agent:Agent)=>Album|undefined) {
  const catalog = photoTools({});
  const scopedTools = ctx.tools as unknown as {register(tool:ToolDefinition,options:{when(context:{agent?:Agent}):boolean}):()=>void};
  for (const [index,definition] of catalog.entries()) {
    const name = 'pet_'+definition.name;
    scopedTools.register({...definition, name, description:definition.description?.replaceAll('list_photos','pet_list_photos'),
      execute:async(args,exec)=>{
        const agent=exec.agent, album=agent && currentAlbum(agent);
        if (!agent || !album || !host.native.manages(agent.id)) throw Error('相册需要当前工作区的原生对话');
        exec.signal.throwIfAborted();
        const scoped=photoTools({agent,store:()=>album,attachments:()=>ctx.get('attachments' as never),
          inside:()=>currentAlbum(agent)===album && host.native.manages(agent.id)});
        return scoped[index].execute(args,exec);
      },
    }, {when:({agent}:{agent?:Agent})=>Boolean(agent && currentAlbum(agent))});
    ctx.effect(() => host.native.toolTable.register({name,sources:['owner']}).revoke);
  }
}
