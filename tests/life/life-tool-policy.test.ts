import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {Context} from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import Tools from '@deepseek-ai/dsh-tools';
import {lifeToolAllowed,lifeInheritedToolNames,registerLifeToolPolicy,restrictLifeTools} from '../../src/life/tool-policy.js';
import {COMPANION_TOOL_SOURCES} from '../../src/contracts/tables.js';
import {CompanionToolTable} from '../../src/core/tables/tools.js';

test('native step schemas exclude programming capabilities and exact disposal restores owner tools',async t=>{
  const toolRequire=createRequire(createRequire(import.meta.url).resolve('@deepseek-ai/dsh-tools'));
  const {createScope}=await import(pathToFileURL(toolRequire.resolve('@deepseek-ai/dsh-scope')).href);
  const ctx=new Context();
  const prompt=await ctx.plugin(SystemPrompt),tools=await ctx.plugin(Tools);
  t.after(async()=>{await tools.dispose();await prompt.dispose();});
  const component=await ctx.plugin({inject:['tools'],async apply(owner:Context){
  const names=['life_plan_read','life_plan_update','room_state','pet_economy_state','pet_memory_recall','pet_emotion_update',
    'bash','write','read','edit','apply_patch','web_search','spawn_agent'];
  const table=new CompanionToolTable();
  registerLifeToolPolicy(owner,table);
  for(const name of names.slice(0,6))owner.effect(()=>table.register({name,sources:COMPANION_TOOL_SOURCES}).revoke);
  for(const name of names.filter(name=>!['read','write','edit'].includes(name)))owner.tools.register({name,description:name,parameters:{type:'object'},
    output:{schema:{type:'string'},render:()=>[]},execute:async()=>''});
  const preset={id:'standard-preset'};
  const presetScope=createScope(owner,preset);t.after(()=>presetScope.dispose());
  for(const name of ['read','write','edit'])presetScope.ctx.tools.register({name,description:name,parameters:{type:'object'},
    output:{schema:{type:'string'},render:()=>[]},execute:async()=>''});
  assert.ok(!owner.tools.definitions().some(tool=>tool.name==='write'),'File tools are inherited from a preset, not global');
  const agent={id:'disposable-agent'};
  const scope=createScope(owner,agent,{parent:preset});t.after(()=>scope.dispose());
  // Native Life attaches these directly to the existing agent's scope.
  scope.ctx.tools.register({name:'plan_next',description:'native Life alarm',parameters:{type:'object'},
    output:{schema:{type:'string'},render:()=>[]},execute:async()=>''});
  const release=restrictLifeTools(table,scope.ctx.tools,lifeInheritedToolNames(owner.tools,agent));
  const step=await owner.tools.resolve({agent,signal:new AbortController().signal} as any);
  const schemaNames=owner.tools.schemas(agent,step).map(tool=>tool.name);
  assert.deepEqual(schemaNames,['life_plan_read','life_plan_update','room_state','pet_economy_state','pet_memory_recall','pet_emotion_update','plan_next']);
  assert.equal(owner.tools.executable('bash',agent,step),undefined);
  step.dispose();release();
  assert.ok(owner.tools.schemas(agent).some(tool=>tool.name==='bash'));
  assert.ok(owner.tools.schemas(agent).some(tool=>tool.name==='write'));
  const reviewRelease=restrictLifeTools(table,scope.ctx.tools,lifeInheritedToolNames(owner.tools,agent,true),true);
  const reviewNames=owner.tools.schemas(agent).map(tool=>tool.name);
  assert.ok(reviewNames.includes('read'));assert.ok(reviewNames.includes('write'));
  assert.ok(reviewNames.includes('plan_next'),'Agent-local Life tools remain native scoped registrations');
  assert.ok(!reviewNames.includes('edit'));assert.ok(!reviewNames.includes('bash'));reviewRelease();
  }});
  t.after(()=>component.dispose());
});

test('life capability policy never treats a name prefix as permission',async t=>{
  const table=new CompanionToolTable();
  const component=await new Context().plugin({apply(ctx:Context){registerLifeToolPolicy(ctx,table);}});
  t.after(()=>component.dispose());
  for(const name of ['bash','apply_patch','life_shell','pet_memory_forget','spawn_agent','run_code'])assert.equal(lifeToolAllowed(table,name),false,name);
  assert.equal(lifeToolAllowed(table,'write'),false);assert.equal(lifeToolAllowed(table,'write',true),true);
});
