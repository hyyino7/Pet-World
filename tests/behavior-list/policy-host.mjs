import {Context} from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import Tools, {defineTool,projectToolSchema} from '@deepseek-ai/dsh-tools';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const requireTools = createRequire(createRequire(import.meta.url).resolve('@deepseek-ai/dsh-tools'));
const {createScope} = await import(pathToFileURL(requireTools.resolve('@deepseek-ai/dsh-scope')).href);

// Tool activation, inheritance, guard selection and prompt providers are real DSH services.
// The only tool bodies substituted here belong to the upstream host.
export async function policyHost(repo, effects) {
  const root = new Context();
  const prompt = await root.plugin(SystemPrompt, {includeHarnessIdentity:false});
  const tools = await root.plugin(Tools);
  effects.push(async () => {await tools.dispose(); await prompt.dispose();});
  let ctx;
  const owner=await root.plugin({inject:['tools','systemPrompt'],apply(scope){ctx=scope;}});
  effects.push(() => owner.dispose());
  ctx.tools.setExecutor({describe:definitions=>({schemas:definitions.map(tool=>projectToolSchema(tool,true))})});
  ctx.systemPrompt.context({name:'fixture.optional',order:100,text:()=> 'Optional runtime context'});
  const preset = {id:'standard'};
  const standard = createScope(ctx,preset);
  effects.push(() => standard.dispose());
  function register(name, body = async () => name, carrier = ctx) {
    return carrier.tools.register(defineTool({
      name, description:name, parameters:{file_path:{type:'string'},content:{type:'string'}},
      output:{schema:{type:'string'},render:(_args,text)=>[{type:'text',text}]},execute:body,
    }));
  }
  register('bash');
  register('read', async args => readFileSync(resolve(repo,args.file_path),'utf8'), standard.ctx);
  register('write', async args => {
    writeFileSync(resolve(repo,args.file_path),args.content);
    return 'Written';
  },standard.ctx);

  return {ctx,register,makeScope(agent,parent=preset) {
    const scope = createScope(ctx,agent,{parent});
    effects.push(() => scope.dispose());
    return scope.ctx;
  }};
}
