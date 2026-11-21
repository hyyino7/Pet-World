import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {BODY_METRICS} from '../../dist/src/contracts/behavior.js';
import {fixture, signal, value} from './fixture.mjs';
import {panelNodes, renderEconomyPanel} from './economy-panel.mjs';

test('身体指标按既有顺序用于计划与设置页并保留校验行为', async t => {
  const f = await fixture(t, {policy:true, console:true});
  f.workspace.status = async () => 'ok';
  const metrics = ['hunger','thirst','energy','bladder','pain'];
  const reconsiderWhen = metrics.map(metric => ({metric,comparison:'gte',value:.5}));
  const draft = {goal:'合成计划',reason:'检查身体指标',steps:[],nextConsiderAt:null,reconsiderWhen};
  const active = await f.begin();
  const properties = f.toolSchema(active,'life_plan_update').parameters.properties.plan.properties;
  assert.deepEqual(properties.reconsiderWhen.items.properties.metric.enum, metrics);
  const {revision} = await f.life.readPlan('world');
  const submitted = await f.tool(active,'life_plan_update',{expectedRevision:revision,plan:draft});
  assert.deepEqual(submitted.plan.reconsiderWhen, reconsiderWhen);
  await f.end(active);
  assert.throws(() => f.life.updatePlan('world',submitted.revision,{
    ...draft,reconsiderWhen:[{metric:'constructor',comparison:'gte',value:.5}],
  }), {message:'Invalid body-state condition'});
  const coerced = [{metric:['hunger'],comparison:'lte',value:.4}];
  assert.deepEqual((await f.life.updatePlan('world',submitted.revision,{
    ...draft,reconsiderWhen:coerced,
  })).plan.reconsiderWhen, coerced);

  let viewRead;
  const page = renderEconomyPanel((endpoint,input,_signal,requestId) => {
    const response = f.settings(endpoint,input,requestId).then(value);
    if (endpoint === 'economyView') viewRead = response;
    return response;
  });
  page.render();
  t.after(page.mount());
  const before = await viewRead;
  await setImmediate();
  const find = (type, label) => panelNodes(page.render(), node =>
    node.type === type && (node.props?.label === label || node.children[0] === label));
  const [section] = find('details','食物身体效果');
  const fields = panelNodes(section, node => node.type === 'field');
  assert.deepEqual(Array.from(fields, field => field.props.label),
    ['饥饿变化','口渴变化','体力变化','如厕需求变化','疼痛变化']);
  for (const [index,field] of fields.entries()) {
    const [current] = find('field',field.props.label);
    current.props.onChange(String((index+1)/10));
  }
  const [save] = find('button','保存经济配置');
  await save.props.onClick();
  const meal = 'food:improved-meal';
  const after = value(await f.settings('economyView',{workspaceId:'world'}));
  const effects = after.configuration.foodEffects[meal];
  assert.deepEqual(Object.entries(effects).sort(), metrics.map((metric,index) => [metric,(index+1)/10]).sort());
  assert.deepEqual(Object.keys(BODY_METRICS), metrics);
  assert.equal(after.configuration.revision, before.configuration.revision+1);

  const invalid = effects => f.economy.settings('world',after.configurationVersion,{foodEffects:{[meal]:effects}},'invalid',signal());
  await assert.rejects(invalid({constructor:2,hunger:2}), {message:'Unknown body need'});
  await assert.rejects(invalid({hunger:2,constructor:2}), {message:'Body need delta must be between -1 and 1'});
});
