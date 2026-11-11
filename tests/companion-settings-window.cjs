// Run after pnpm run build with the standalone DSH Electron helper. The DSH
// renderer supplies React, and the production settings handler uses a temporary Repo.
const { app, BrowserWindow, ipcMain } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');
const { setTimeout: pause } = require('node:timers/promises');
const root = fs.mkdtempSync(join(tmpdir(), 'chatpet-settings-ui-'));
app.setPath('userData', join(root, 'profile'));
const frontend = join(process.env.DSH_APP || '/Applications/DeepSeek Harness.app',
  'Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets');

function createFixturePage() {
  const chunks = fs.readdirSync(frontend);
  const entry = chunks.find(name => /^index-.*\.js$/.test(name));
  assert.ok(entry, 'Installed DSH web frontend is required');
  for (const name of chunks.filter(name => /^(index|vendor)-.*\.js$/.test(name))) {
    fs.copyFileSync(join(frontend, name), join(root, name));
  }
  fs.copyFileSync(join(__dirname, '../src/console/client.js'), join(root, 'client.js'));
  fs.writeFileSync(join(root, 'preload.cjs'), `const {contextBridge, ipcRenderer} = require('electron');
    contextBridge.exposeInMainWorld('callSettings', (route, payload) => ipcRenderer.invoke('fixture:settings', route, payload));`);
  fs.writeFileSync(join(root, 'fixture.html'), `<!doctype html><meta charset="utf-8">
    <style>body{margin:0;font:14px system-ui,sans-serif;color:#20242a;background:white} #fixture {padding:18px;}</style>
    <div id="root" hidden></div><main id="fixture"></main>
    <script>window.__ModuleLoader__={
      load(entry){window.settingsEntry=entry},
      create({staticModules}){window.hostModules=staticModules; throw Error("Fixture supplied its own settings page")}
    };</script><script src="./client.js"></script><script type="module" src="./${entry}"></script>`);
}

async function check() {
  const { createCore } = await import('../dist/src/core/index.js');
  const { settingsHandler } = await import('../dist/src/console/settings.js');
  const { CompanionEmotion } = await import('../dist/src/emotion/plugin.js');
  const world = await import('../dist/src/world/index.js');
  const directory = join(root, '蓝鱼小屋');
  fs.mkdirSync(directory);
  const workspace = { id: 'fixture', title: '蓝鱼小屋', path: fs.realpathSync(directory),
    sessionIds: ['chat-a', 'chat-b', 'chat-c'], status: async () => 'ok' };
  const secondDirectory = join(root, '新小屋');
  fs.mkdirSync(secondDirectory);
  const secondWorkspace = { id: 'second', title: '新小屋', path: fs.realpathSync(secondDirectory),
    sessionIds: [], status: async () => 'ok' };
  const targets = [workspace, secondWorkspace];
  const config = { dataDir: join(root, 'core'), companionId: 'settings-fixture', scopeId: 'fixture',
    ownerActorId: 'owner', displayName: '大肥鱼', character: '一条喜欢听你说话的蓝鱼。',
    memory: { dataDir: join(workspace.path, '.chatpet/data/memory'), python: fs.realpathSync(join(__dirname, '../.venv/bin/python')) } };
  const host = createCore(config);
  const emotion = new CompanionEmotion(host);
  const searchCalls = [];
  const memoryRows = [
    { id: 'source-a', excerpt: '主人提到了蓝色风铃' },
    { id: 'source-b', excerpt: '这条记录的来源已撤回' },
  ];
  let delayDetail = false;
  let completeDetail;
  host.native.memory.findForOwner = async (workspaceId, query) => {
    searchCalls.push({ workspaceId, query });
    return { items: query === '风铃' && workspaceId === workspace.id ? memoryRows : [], limit: 8 };
  };
  host.native.memory.readForOwner = async (workspaceId, id) => {
    searchCalls.push({ workspaceId, id });
    if (id !== memoryRows[0].id || workspaceId !== workspace.id) throw { code: 'INELIGIBLE' };
    if (delayDetail) await new Promise(resolve => { completeDetail = resolve; });
    return { id, content: '喜欢蓝色风铃。', dialogue: [{ role: 'user', text: '这是应当只在详情里出现的原话。' }] };
  };
  const upstreamHome = await import('../vendor/feiyu-room-template/home-state.js');
  let lifeEnabled = false, lifeState = upstreamHome.emptyHomeState();
  let schedule = {wake:'09:00',review:'22:00',dailyBudget:null,compactAfterReview:false};
  const life = {
    snapshot: async workspaceId => ({workspaceId, enabled:lifeEnabled, running:lifeEnabled, preferences:schedule,timeZone:'Asia/Saigon', home:upstreamHome.homeView(lifeState), life:{}, activity:[]}),
    control: async (_id, enabled) => ({enabled:lifeEnabled=enabled}),
    settings: async (_id,expected,next) => {assert.deepEqual(expected,schedule);schedule=next;return schedule;},
    library:async(_id,op)=>op==='dates'?['2026-11-11']:op==='journal'?{day:'2026-11-11',diary:'今天在屋后种了菜。',activity:[]}:
      op==='album'?{photos:[],total:0,offset:0,limit:12,hasMore:false}:undefined,
    act: async (_id, action) => {const result=upstreamHome.applyHomeAction(lifeState,{action,at:Date.now()});lifeState=result.state;return result;}
  };
  const channelDefaults = (await import('../dist/src/channels/messaging-settings.js')).defaults;
  const channels = {request:async(_id,op)=>{
    if (op==='groupState') return {settings:{affinity:true,slang:true,stickers:true,forwards:true,roleCard:'',roleMode:'v2'},slang:[],affinity:[],stickers:[]};
    return {bridge:{preferences:{enabled:false,outlets:[]}},messaging:{config:{...channelDefaults,qq:{...channelDefaults.qq,allowGroups:['123']}}}};
  }};
  const handler = settingsHandler(() => host, () => ({ list: () => targets, get: id => targets.find(target => target.id === id) }),
    undefined, () => Object.keys(world), () => emotion, () => life, undefined, () => channels);
  const signal = new AbortController().signal;
  const peer = { principal: { kind: 'owner' }, signal };
  const call = async (endpoint, input = {}) => {
    const result = await handler(endpoint, { requestId: randomUUID(), input }, signal, peer);
    assert.ok(result.ok, JSON.stringify(result.error));
    return result.value;
  };
  let failNextSnapshot = true;
  let failNextInitialize = false;
  let failNextWorld = false;
  const calls = [];
  ipcMain.handle('fixture:settings', (_, route, payload) => {
    assert.match(route, /^chatpetSettings\/[A-Za-z]+$/);
    const endpoint = route.split('/').pop();
    const observed = { endpoint, input: payload.input };
    calls.push(observed);
    if (endpoint === 'snapshot' && failNextSnapshot) {
      failNextSnapshot = false;
      return { ok: false, error: { code: 'UNAVAILABLE', message: '暂时无法读取' } };
    }
    if (endpoint === 'initialize' && failNextInitialize) {
      failNextInitialize = false;
      return { ok: false, error: { code: 'UNAVAILABLE', message: '本次初始化未完成' } };
    }
    if (endpoint === 'worldView' && failNextWorld) {
      failNextWorld = false;
      return { ok: false, error: { code: 'UNAVAILABLE', message: '临时无法读取 World 资料' } };
    }
    return handler(endpoint, payload, signal, peer).then(result => {
      if (endpoint === 'worldView' && result.ok) observed.responseKeys = Object.keys(result.value);
      return result;
    });
  });

  createFixturePage();
  const win = new BrowserWindow({ width: 800, height: 900, useContentSize: true, show: false,
    webPreferences: { preload: join(root, 'preload.cjs'), backgroundThrottling: false } });
  try {
    const evaluate = (func, ...args) => win.webContents.executeJavaScript(
      '(' + func.toString() + ')(' + args.map(arg => JSON.stringify(arg)).join(',') + ')');
    async function waitFor(func, ...args) {
      for (let index = 0; index < 90; index++) {
        if (await evaluate(func, ...args)) return;
        await pause(50);
      }
      throw Error('Timed out at ' + func + '\n' + await evaluate(() => document.querySelector('#fixture').innerText.slice(0,2000)));
    }
    async function click(label, selector = 'button') {
      await waitFor((label, selector) => {
        const element = Array.from(document.querySelectorAll('#fixture ' + selector))
          .find(element => element.textContent.trim() === label);
        if (!element || element.disabled) return false;
        element.click();
        return true;
      }, label, selector);
      await pause(40);
    }
    async function setField(label, value) {
      await waitFor((label, value) => {
        const field = Array.from(document.querySelectorAll('#fixture label'))
          .find(element => element.textContent.trim().startsWith(label))?.control;
        if (!field || field.disabled) return false;
        const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype
          : field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value);
        field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
        return true;
      }, label, String(value));
    }
    async function fieldValue(label) {
      return evaluate(label => Array.from(document.querySelectorAll('#fixture label'))
        .find(element => element.textContent.trim().startsWith(label))?.control?.value, label);
    }
    const activeTab = () => evaluate(() => document.querySelector('#fixture [role=tab][aria-selected=true]').textContent.trim());
    const panelText = () => evaluate(() => document.querySelector('#fixture [role=tabpanel]').innerText);
    const pageText = () => evaluate(() => document.querySelector('#fixture').innerText);
    const waitForSaved = () => waitFor(() => [...document.querySelectorAll('#fixture [role=status]')]
      .some(element => element.innerText.includes('设置已保存')));
    async function screenshot(name) {
      const destination = process.argv.includes('--screenshots') ? join(__dirname, '../.cache/settings-redesign') : null;
      if (!destination) return;
      await evaluate(async () => { window.scrollTo(0, 0); await document.fonts.ready; });
      await pause(120);
      const debuggerApi = win.webContents.debugger;
      debuggerApi.attach();
      try {
        const { cssContentSize } = await debuggerApi.sendCommand('Page.getLayoutMetrics');
        const { data } = await debuggerApi.sendCommand('Page.captureScreenshot', {
          captureBeyondViewport: true, format: 'png', clip: { ...cssContentSize, scale: 1 },
        });
        assert.ok(data.length > 1000, 'Could not capture ' + name);
        fs.mkdirSync(destination, { recursive: true });
        fs.writeFileSync(join(destination, name + '.png'), Buffer.from(data, 'base64'));
      } finally {
        debuggerApi.detach();
      }
    }

    await win.loadFile(join(root, 'fixture.html'));
    await waitFor(() => Boolean(window.hostModules?.react && window.settingsEntry));
    await evaluate(() => {
      const ctx = {
        slots: {
          inject(_, install) { install(); },
          register(descriptor, component) {
            if (descriptor.name !== 'settings.section') return;
            window.settingsSlot = { id: descriptor.id, label: descriptor.label };
            const React = window.hostModules.react;
            window.hostModules['react-dom/client'].createRoot(document.querySelector('#fixture'))
              .render(React.createElement(component, descriptor.inject()));
          },
        },
        connection: { rpc: { call(_, route, payload) { return window.callSettings(route, payload); } } },
      };
      window.settingsEntry.factory(name => window.hostModules[name]).apply(ctx);
    });
    await waitFor(() => document.querySelector('#fixture [role=alert]')?.textContent.includes('暂时无法读取'));
    assert.deepEqual(await evaluate(() => window.settingsSlot), { id: 'dsh-Chatpet', label: '大肥鱼' });
    await click('刷新设置');
    await waitFor(() => !document.querySelector('#fixture [role=alert]') && !!document.querySelector('#fixture [role=tabpanel] h3'));
    assert.deepEqual(await evaluate(() => [...document.querySelectorAll('#fixture [role=tab]')].map(el => el.innerText)),
      ['概览', '角色与记忆', '对话与档案', '日常生活', '桌宠互动', '工作区与维护']);
    assert.equal(await activeTab(), '概览');
    assert.match(await panelText(), /未绑定/);
    await click('对话与档案', '[role=tab]');
    assert.equal(calls.some(row => row.endpoint === 'worldView'), false);
    assert.match(await panelText(), /工作区/);
    await click('概览', '[role=tab]');
    await click('绑定工作区');
    assert.equal(await activeTab(), '工作区与维护');
    await waitFor(() => Boolean(document.querySelector('#fixture select')));
    await evaluate(() => {
      const select = document.querySelector('#fixture select');
      select.value = 'fixture';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click('绑定并初始化');
    await waitFor(() => document.querySelector('#fixture [role=tabpanel]').innerText.includes('已从 .chatpet/ 加载'));
    const initial = await call('snapshot');
    const originalUser = '这是蓝鱼小屋独有的测试资料。';
    const originalMood = '期待出游';
    const secondUser = '新小屋已保存的用户资料。';
    const existingRepo = join(secondDirectory, '.chatpet');
    fs.mkdirSync(existingRepo);
    for (const name of ['README.md', 'manifest.json', 'SOUL.md', 'core.json']) {
      fs.copyFileSync(join(directory, '.chatpet', name), join(existingRepo, name));
    }
    fs.writeFileSync(join(existingRepo, 'USER.md'), secondUser);
    await call('profile', { expectedRevision: initial.profile.revision, text: originalUser });
    emotion.complete('chat-a', { workspaceId: workspace.id, path: workspace.path, turn: 1,
      intent: { mood: originalMood, reason: '测试私有缘由' }, memoryIds: [], memoryCalls: new Map() });
    assert.equal(initial.workspace.state, 'ready');
    assert.deepEqual(initial.memory, { newSessions: true, provider: 'stopped' });
    await click('运行状态', 'summary');
    assert.equal(await evaluate(() => [...document.querySelectorAll('#fixture dt')].find(el => el.innerText === '记忆')
      ?.nextElementSibling?.innerText), '未运行，按需启动');
    assert.ok(fs.existsSync(join(directory, '.chatpet', 'SOUL.md')));
    await click('概览', '[role=tab]');
    assert.doesNotMatch(await pageText(), /工作区已绑定，Repo/);
    assert.doesNotMatch(await panelText(), /chatpet-settings-ui-/);
    const memoryRow = await evaluate(() => [...document.querySelectorAll('#fixture .cp-overview-row')]
      .find(el => el.querySelector('strong')?.textContent === '长期记忆')?.innerText);
    assert.match(memoryRow, /新对话已启用/);
    assert.doesNotMatch(memoryRow, /不可用|待接入|故障/);
    await screenshot('overview');
    await click('日常生活', '[role=tab]');
    await waitFor(() => [...document.querySelectorAll('button')].some(b=>b.textContent==='开启生活'));
    await click('开启生活');
    await waitFor(() => [...document.querySelectorAll('button')].some(b=>b.textContent==='暂停生活'));
    await click('倒杯水');
    await waitFor(() => document.querySelector('[role=tabpanel]').textContent.includes('有人给你倒了杯水'));
    await setField('默认起床','08:45');
    await click('保存作息和预算'); assert.equal(schedule.wake,'08:45');
    await click('翻日记和活动'); await click('2026-11-11');
    await waitFor(()=>document.querySelector('[role=tabpanel]').textContent.includes('今天在屋后种了菜。'));
    await click('打开相册');
    await waitFor(()=>document.querySelector('[role=tabpanel]').textContent.includes('相册还没有照片'));
    await click('管理渠道'); await click('群 123','summary'); await click('读取群资料');
    await waitFor(()=>document.querySelector('[role=tabpanel]').textContent.includes('本群公开角色卡'));
    await screenshot('life');
    await click('暂停生活');
    await waitFor(() => [...document.querySelectorAll('button')].some(b=>b.textContent==='开启生活'));
    await click('概览', '[role=tab]');
    const startWorldCalls = calls.length;
    failNextWorld = true;
    await click('查找对话档案');
    await waitFor(() => document.querySelector('#fixture [role=tabpanel]').innerText.includes('临时无法读取'));
    await click('重试读取');
    await waitFor(() => /3\s*个会话/.test(document.querySelector('#fixture [role=tabpanel]').innerText));
    assert.equal(await activeTab(), '对话与档案');
    assert.match(await panelText(), /已关联会话/);
    assert.doesNotMatch(await panelText(), /原生会话副本/);
    assert.equal(searchCalls.length, 0);
    const textSearch = (text) => setField('查找已收录的对话或记忆', text);
    const search = async (query) => { await textSearch(query); await click('搜索档案'); };
    const originalQuote = '这是应当只在详情里出现的原话。';
    function assertSectionRead(start, section) {
      const reads = calls.slice(start).filter(item => item.endpoint === 'worldView');
      assert.ok(reads.length, 'No view read for ' + section);
      assert.ok(reads.every(item => item.input.workspaceId === workspace.id && item.input.section === section));
      const successful = reads.filter(item => item.responseKeys);
      assert.ok(successful.length);
      for (const read of successful) {
        const payloadFields = read.responseKeys.filter(key => !['section', 'workspaceId'].includes(key));
        assert.deepEqual(payloadFields, [section]);
      }
    }
    assertSectionRead(startWorldCalls, 'sessions');
    await textSearch('风铃');
    assert.equal(searchCalls.length, 0);
    await click('搜索档案');
    await waitFor(excerpt => document.querySelector('#fixture [role=tabpanel]').innerText.includes(excerpt), memoryRows[0].excerpt);
    assert.deepEqual(searchCalls, [{ workspaceId: workspace.id, query: '风铃' }]);
    assert.doesNotMatch(await panelText(), /应当只在详情/);
    await click(memoryRows[0].excerpt);
    await click('关联对话原文', 'summary');
    await waitFor(quote => document.querySelector('#fixture [role=tabpanel]').innerText.includes(quote), originalQuote);
    await screenshot('conversation-archive');
    assert.deepEqual(searchCalls.at(-1), { workspaceId: workspace.id, id: memoryRows[0].id });
    await search('风铃');
    await click(memoryRows[1].excerpt);
    await waitFor(() => !!document.querySelector('#fixture [role=alert]'));
    assert.doesNotMatch(await panelText(), /应当只在详情/);
    assert.doesNotMatch(await panelText(), /这条记录的来源已撤回/);
    await search('风铃');
    await click(memoryRows[0].excerpt);
    await click('关联对话原文', 'summary');
    await waitFor(quote => document.querySelector('#fixture [role=tabpanel]').innerText.includes(quote), originalQuote);
    await search('未收录');
    assert.doesNotMatch(await panelText(), /应当只在详情|主人提到了蓝色风铃/);
    await search('风铃');
    delayDetail = true;
    await click(memoryRows[0].excerpt);
    assert.equal(typeof completeDetail, 'function');
    await click('角色与记忆', '[role=tab]');
    completeDetail();
    delayDetail = false;
    const archiveReturnStart = calls.length;
    await click('对话与档案', '[role=tab]');
    await waitFor(() => /3\s*个会话/.test(document.querySelector('#fixture [role=tabpanel]').innerText));
    assertSectionRead(archiveReturnStart, 'sessions');
    assert.doesNotMatch(await panelText(), /应当只在详情|主人提到了蓝色风铃/);

    const roleStart = calls.length;
    await click('角色与记忆', '[role=tab]');
    await waitFor(text => document.querySelector('#fixture [role=tabpanel]').innerText.includes(text), originalUser);
    assertSectionRead(roleStart, 'profile');
    assert.match(await panelText(), /一条喜欢听你说话的蓝鱼/);
    assert.match(await panelText(), /\d[\d,]*\s*token/i);
    const desktopStart = calls.length;
    await click('桌宠互动', '[role=tab]');
    await waitFor(text => document.querySelector('#fixture [role=tabpanel]').innerText.includes(text), originalMood);
    assertSectionRead(desktopStart, 'emotion');
    assert.doesNotMatch(await panelText(), /测试私有缘由/);
    await click('动作与贴图', 'summary');
    const assets = await panelText();
    assert.ok(emotion.catalog.actions.some(asset => assets.includes(asset.label || asset.name)));
    assert.ok(emotion.catalog.stickers.some(asset => assets.includes(asset.label || asset.name)));
    assert.ok(calls.slice(startWorldCalls).every(row => ['worldView', 'archiveFind', 'archiveRead'].includes(row.endpoint) && row.input.workspaceId === workspace.id));
    assert.equal(host.native.memory.connection.lifecycle, 'stopped');
    await click('工作区与维护', '[role=tab]');
    await click('World 功能的接入情况', 'summary');
    const moduleSources = await evaluate(() => [...document.querySelectorAll('#fixture details')]
      .find(el => el.querySelector('summary')?.innerText === 'World 功能的接入情况')?.innerText);
    for (const feature of ['人设提示', '工作区范围', '近期历史', '对话归档', '记忆查询', '批量整理', '心情状态', '自主生活',
      '日记与反思', '长期相册', '主动消息', '渠道路由', 'QQ', '微信', '健康与故障', '活动与用量']) {
      assert.ok(moduleSources.includes(feature), feature);
    }
    await screenshot('workspace-integrations');
    assert.doesNotMatch(await evaluate(() => [...document.querySelectorAll('#fixture [role=tabpanel] button, #fixture [role=switch]')]
      .map(element => element.textContent).join('\n')), /启动.*生活|开启.*QQ|登录.*微信/);

    await click('概览', '[role=tab]');
    await click('编辑角色');
    assert.equal(await activeTab(), '角色与记忆');
    assert.equal(await evaluate(() => document.activeElement.getAttribute('aria-label')), '身份与角色');
    await screenshot('persona-memory');
    await setField('角色名称', '小汐');
    await setField('每次召回块数', 6);
    await click('对话与档案', '[role=tab]');
    assert.doesNotMatch(await panelText(), /小汐/);
    await click('桌宠互动', '[role=tab]');
    await setField('文字气泡显示时长', 19);
    await click('角色与记忆', '[role=tab]');
    assert.equal(await fieldValue('角色名称'), '小汐');
    assert.equal(await fieldValue('每次召回块数'), '6');
    await click('保存角色');
    await waitForSaved();
    assert.equal((await call('snapshot')).identity.displayName, '小汐');
    const before = (await call('snapshot')).companion;
    assert.notEqual(before.memoryRecallCount, 6);
    assert.notEqual(before.desktopBubbleSeconds, 19);
    await click('保存记忆设置');
    await waitForSaved();
    assert.deepEqual((await call('snapshot')).companion, { ...before, memoryRecallCount: 6 });
    await setField('每次召回块数', 7);
    await click('桌宠互动', '[role=tab]');
    assert.doesNotMatch(await pageText(), /设置已保存/);
    assert.equal(await fieldValue('文字气泡显示时长'), '19');
    await click('保存桌宠设置');
    await waitForSaved();
    assert.deepEqual((await call('snapshot')).companion, { ...before, memoryRecallCount: 6, desktopBubbleSeconds: 19 });
    await click('角色与记忆', '[role=tab]');
    assert.equal(await fieldValue('每次召回块数'), '7');
    await click('保存记忆设置');
    await waitForSaved();
    assert.equal((await call('snapshot')).companion.memoryRecallCount, 7);
    assert.equal(calls.filter(row => row.endpoint === 'companion').length, 3);
    await click('刷新设置');
    await waitFor(() => Boolean(document.querySelector('#fixture input[type=number]')));
    assert.equal(await fieldValue('每次召回块数'), '7');

    win.setContentSize(360, 760);
    await waitFor(() => window.innerWidth === 360);
    for (const label of ['概览', '对话与档案', '角色与记忆', '桌宠互动', '工作区与维护']) {
      await click(label, '[role=tab]');
      const overflow = await evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, label + ' overflows at 360px by ' + overflow + 'px');
    }
    // A binding can succeed even when the following initialization fails. The
    // first Repo's settings must disappear as soon as the new binding is stored.
    failNextInitialize = true;
    await setField('DSH 工作区', 'second');
    await click('绑定并初始化');
    await waitFor(() => document.querySelector('#fixture [role=alert]')?.innerText.includes('初始化'));
    const pending = await call('snapshot');
    assert.equal(pending.preferences.workspace.id, 'second');
    assert.equal(pending.workspace.state, 'pending');
    const beforePending = calls.length;
    await click('对话与档案', '[role=tab]');
    assert.doesNotMatch(await panelText(), /蓝鱼小屋独有|期待出游|3\s*个会话/);
    assert.ok(calls.slice(beforePending).every(row => row.endpoint !== 'worldView'));
    await click('角色与记忆', '[role=tab]');
    assert.equal(await fieldValue('每次召回块数'), undefined);
    await click('桌宠互动', '[role=tab]');
    assert.equal(await fieldValue('文字气泡显示时长'), undefined);
    await click('工作区与维护', '[role=tab]');
    await click('检查并初始化资料目录');
    await waitFor(() => document.querySelector('#fixture [role=tabpanel]').innerText.includes('已从 .chatpet/ 加载'));
    const recovered = await call('snapshot');
    assert.equal(recovered.workspace.state, 'ready');
    assert.equal(recovered.preferences.workspace.id, 'second');
    assert.deepEqual(recovered.companion, before);
    await click('对话与档案', '[role=tab]');
    await waitFor(() => /0\s*个会话/.test(document.querySelector('#fixture [role=tabpanel]').innerText));
    await click('角色与记忆', '[role=tab]');
    await waitFor(text => document.querySelector('#fixture [role=tabpanel]').innerText.includes(text), secondUser);
    assert.doesNotMatch(await panelText(), /蓝鱼小屋独有/);
    await click('桌宠互动', '[role=tab]');
    assert.doesNotMatch(await panelText(), /期待出游/);
    await click('工作区与维护', '[role=tab]');

    // If the recovery read also fails, require a fresh read before editing.
    failNextInitialize = true;
    failNextSnapshot = true;
    await setField('DSH 工作区', 'fixture');
    await click('绑定并初始化');
    await waitFor(() => Boolean(document.querySelector('#fixture [role=alert]')));
    await click('角色与记忆', '[role=tab]');
    assert.equal(await fieldValue('角色名称'), undefined);
    assert.equal(await fieldValue('每次召回块数'), undefined);
    await click('刷新设置');
    await waitFor(() => Boolean(document.querySelector('#fixture input')));
    assert.equal((await call('snapshot')).preferences.workspace.id, 'fixture');
    assert.equal(host.native.memory.connection.lifecycle, 'stopped', 'Opening settings must leave the lazy provider stopped');
    console.log('Passed all six settings tabs including Life controls and persisted fact projection and sixteen integration labels, scoped prompts and expressions, ' +
      'explicit archive searches and source reads, withheld and late replies, separate drafts, narrow layouts and rebinding recovery.');
  } finally {
    ipcMain.removeHandler('fixture:settings');
    await host.close();
    win.destroy();
  }
}

app.on('window-all-closed', () => {});
app.whenReady().then(check).then(() => app.exit(0)).catch(error => { console.error(error); app.exit(1); });
app.on('quit', () => fs.rmSync(root, { recursive: true, force: true }));
