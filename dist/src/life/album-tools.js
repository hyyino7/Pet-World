import { createRequire } from 'node:module';
const { photoTools } = createRequire(import.meta.url)('#dsh-world/life/photoTools');
/** Use the upstream tools against the admitted message and the same bound album in ordinary chats. */
export function registerAlbumTools(ctx, host, library) {
    const catalog = photoTools({});
    const scopedTools = ctx.tools;
    for (const [index, definition] of catalog.entries()) {
        scopedTools.register({ ...definition, name: 'pet_' + definition.name, description: definition.description?.replaceAll('list_photos', 'pet_list_photos'),
            execute: async (args, exec) => {
                const agent = exec.agent, album = agent && library(agent);
                if (!agent || !album || !host.native.manages(agent.id))
                    throw Error('相册需要当前工作区的原生对话');
                exec.signal.throwIfAborted();
                const scoped = photoTools({ agent, store: () => album.album(), attachments: () => ctx.get('attachments'),
                    inside: () => library(agent) === album && host.native.manages(agent.id) });
                return scoped[index].execute(args, exec);
            },
        }, { when: ({ agent }) => Boolean(agent && library(agent)) });
    }
}
//# sourceMappingURL=album-tools.js.map