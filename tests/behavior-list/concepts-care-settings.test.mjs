import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setImmediate} from 'node:timers/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {fixture, value} from './fixture.mjs';

function findLifePage(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'LifePage') return node;
  return ts.forEachChild(node, findLifePage);
}

function renderLifePage(request) {
  const source = readFileSync(new URL('../../src/console/client.js', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('client.js', source, ts.ScriptTarget.Latest, true);
  const component = findLifePage(tree);
  assert.ok(component);
  const hooks = [];
  let cursor, mount, refresh;
  const LifePage = runInNewContext(`(${component.getText(tree)})`, {
    h: (type, props, ...children) => ({type, props, children}),
    React: {Fragment: Symbol('Fragment'), useEffect(effect) {mount = effect;}},
    Card: Symbol('Card'), EconomyPanel: Symbol('EconomyPanel'), RoomView: Symbol('RoomView'),
    facts: () => null,
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], next => {hooks[index] = next;}];
    },
    useRef(initial) {return hooks[cursor++] ??= {current:initial};},
    AbortController,
    setInterval(callback) {refresh = callback;},
    clearInterval() {},
  });
  return {
    mount: () => mount(),
    refresh: () => refresh(),
    buttons() {
      cursor = 0;
      const tree = LifePage({workspaceId:'world', request});
      const card = tree.children.find(node => node?.props?.title === '陪它一会儿');
      return card?.children[0].children.map(fragment => fragment.children[0]) ?? [];
    },
  };
}

test('设置页照料按钮按 lifeView 顺序和文案渲染并逐个执行', async t => {
  const f = await fixture(t, {console:true});
  const actions = [
    {action:'feed', label:'免费基础餐食'}, {action:'water', label:'倒杯水'},
    {action:'pet', label:'摸摸头'}, {action:'play', label:'一起玩'},
    {action:'sleep', label:'去睡觉'}, {action:'wake', label:'叫醒'},
  ];
  const receipts = [];
  let viewRead, override;
  const page = renderLifePage((endpoint, input) => {
    const response = f.settings(endpoint, input).then(value);
    if (endpoint === 'lifeView') {
      viewRead = response;
      return override ? response.then(view => ({...view, careActions:override})) : response;
    }
    return response.then(result => {receipts.push(result.fact); return result;});
  });
  assert.deepEqual(page.buttons(), []);
  t.after(page.mount());
  assert.deepEqual((await viewRead).careActions, actions);
  await setImmediate();

  const labels = buttons => Array.from(buttons, button => button.children[0]);
  const buttons = page.buttons();
  assert.deepEqual(labels(buttons), actions.map(({label}) => label));
  for (const button of buttons) await button.props.onClick();
  assert.deepEqual(receipts.map(({type, actor}) => [type, actor.channel]), actions.map(({action}) => [action, 'settings']));

  override = [{action:'wake', label:'测试文案'}, actions[0]];
  await page.refresh();
  assert.deepEqual(labels(page.buttons()), override.map(({label}) => label));
});
