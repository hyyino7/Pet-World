// Exercise the shipped Electron main/preload/renderers in isolated windows with a local host fixture.
const { app, BrowserWindow, Tray } = require('electron');
const assert = require('node:assert/strict');
const { setTimeout: pause } = require('node:timers/promises');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const directory = mkdtempSync(join(tmpdir(), 'chatpet-ui-check-'));
const state = { sessionId: 'ui-fixture', workspaceId: 'test', messages: [], turn: null, generating: false, live: '' };
let sends = 0;
const input = message => process.stdin.emit('data', Buffer.from(JSON.stringify(message) + '\n'));
const log = process.stdout.write.bind(process.stdout);
process.stdout.write = (line, ...args) => {
  let msg;
  try { msg = JSON.parse(String(line)); } catch { return log(line, ...args); }
  if (msg.type !== 'request') return log(line, ...args);
  if (msg.action === 'preferences') {
    setImmediate(()=>input({type:'response',value:{id:msg.id,ok:true,result:{desktopClickSound:true,desktopReplyBubble:true,desktopWhisperEnabled:false,desktopBubbleSeconds:10}}}));return true;
  }
  if (msg.action === 'desktop-api') {
    if (msg.input.path.startsWith('/balance')) setImmediate(()=>input({type:'balance',value:{ok:false,provider:'fixture',reason:'unsupported'}}));
    setImmediate(()=>input({type:'response',value:{id:msg.id,ok:true,result:{ok:true,todos:[]}}}));return true;
  }
  if (msg.action === 'send') {
    assert.equal(msg.input.text, '你好大肥鱼');
    sends++;
    state.messages.push({ role: 'user', text: msg.input.text });
    Object.assign(state, { generating: true, turn: 1, live: '正在打招呼' });
  }
  if (msg.action === 'stop') {
    assert.equal(msg.input.turn, 1);
    Object.assign(state, { generating: false, turn: null, live: '', reason: 'aborted' });
  }
  setImmediate(() => input({ type: 'response', value: { id: msg.id, ok: true, result: state } }));
  return true;
};
let trayMenu;
const setMenu = Tray.prototype.setContextMenu;
Tray.prototype.setContextMenu = function(menu) { trayMenu = menu; return setMenu.call(this, menu); };
require('../../src/desktop/helper/main.cjs');
async function until(probe, name) {
  for (let i = 0; i < 100; i++) { const result = await probe(); if (result) return result; await pause(75); }
  throw Error('Timed out waiting for ' + name);
}
async function run() {
  await app.whenReady();
  const byPage = page => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().split('?')[0].endsWith(page + '.html') && !w.webContents.isLoading());
  const body = await until(() => byPage('body'), 'pet window');
  const chat = await until(() => byPage('chat'), 'chat window');
  const evalChat = code => chat.webContents.executeJavaScript(code).catch(error=>{console.error('Chat check failed:',code);throw error;});
  await until(() => body.webContents.executeJavaScript('!!document.querySelector("video.is-front") && document.querySelector("video.is-front").videoWidth > 0'), 'decoded fish animation');
  const evalBody = code => body.webContents.executeJavaScript(code).catch(error=>{console.error('Body check failed:',code);throw error;});
  // A transparent canvas includes menu/bubble margins above the character.
  // The host must permit its origin above the menu bar, otherwise upward drag
  // stops when that invisible margin reaches the OS window boundary.
  const oldBounds=body.getContentBounds();
  const raisedY=oldBounds.y-700;
  await evalBody(`window.pet.call('bounds', [${oldBounds.x},${raisedY},${oldBounds.width},${oldBounds.height},0,0,232,0,0,0,100,300])`);
  assert.equal(body.getContentBounds().y,raisedY,'transparent window origin must follow the body above the menu bar');
  await evalBody('sprites[0].sendBounds(sprites[0].pos.x,sprites[0].pos.y)');
  await evalBody(`{const s=sprites[0];s.stopThrow();s.stopMove();s.sendBounds(s.pos.x,s.margin.t+30);s.startThrow(s.pos.x,s.pos.y,0,-800);}`);
  await until(()=>body.getContentBounds().y < -20,'flight continues above the transparent-margin boundary');
  const rising=body.getContentBounds().y;await pause(60);
  assert.ok(body.getContentBounds().y < rising-5,'window keeps rising while upstream physics rises');
  await until(()=>evalBody('sprites[0].throwState && sprites[0].throwState.vy > 0'),'original gravity returns the pet downwards');
  await evalBody('sprites[0].stopThrow();sprites[0].goHome()');
  const beforeMove = body.getBounds().x;
  assert.equal(await evalBody("sprites[0].stopThrow();sprites[0].stopMove();sprites[0].tryMove('walk')"), 'walk');
  await until(() => body.getBounds().x !== beforeMove, 'original animation-driven wandering');
  input({ type: 'work', value: { session: 'ui-fixture', turn: 1, stage: 'working' } });
  await until(() => evalBody('document.querySelector("video.is-front").src.endsWith("type.webm")'), 'work animation');
  // Controlled renderer events reproduce missing pointerup without depending
  // on the physical cursor or altering the installed pet. Capture itself is
  // stubbed only in this fixture because synthetic pointers are not active OS pointers.
  await evalBody(`{
    const fish = document.getElementById('fish'), capture = fish.setPointerCapture;
    fish.setPointerCapture = () => {};
    fish.dispatchEvent(new PointerEvent('pointerdown', {button:0,pointerId:77,pointerType:'mouse',screenX:100,screenY:100}));
    fish.setPointerCapture = capture;
    fish.dispatchEvent(new PointerEvent('pointermove', {pointerId:77,pointerType:'mouse',screenX:120,screenY:100}));
  }`);
  await until(() => evalBody('document.querySelector("video.is-front").src.endsWith("held.webm")'), 'drag animation');
  await evalBody(`window.dispatchEvent(new MouseEvent('mousemove', {buttons:0,screenX:120,screenY:100,clientX:70,clientY:70}))`);
  await until(() => evalBody('document.querySelector("video.is-front").src.endsWith("type.webm")'), 'work restored after missing pointerup');
  assert.equal(chat.isVisible(), false, 'fallback release must not open chat');
  input({ type: 'work', value: {session:'ui-fixture',turn:1,stage:'success',terminal:true} });
  input({ type: 'expression', value: { sessionId: 'ui-fixture', turn: 1, action: 'wave' } });
  await until(() => evalBody('document.querySelector("video.is-front").src.endsWith("cheer.webm")'), 'terminal animation before queued expression');
  await evalBody('document.querySelector("video.is-front").dispatchEvent(new Event("ended"))');
  await until(() => evalBody('document.querySelector("video.is-front").src.endsWith("wave.webm") && !document.querySelector("video.is-front").paused && document.querySelector("video.is-front").readyState >= 2'), 'decoded Emotion playback after drag');
  writeFileSync(join(directory, 'drag-recovered.png'), (await body.webContents.capturePage()).toPNG());
  const toggle = () => body.webContents.executeJavaScript('sprites[0].showChatFromMenu()');
  await evalBody('document.getElementById("fish").click()');
  assert.equal(chat.isVisible(),false,'ordinary click responds without opening chat');
  await until(()=>evalBody('sprites[0].pendingSquash || sprites[0].anim !== "idle"'),'upstream click response');
  input({type:'say',value:{text:'原生回复气泡，不增加模型调用'}});
  await until(()=>evalBody('document.querySelector(".pet-bubble").innerText.includes("原生回复气泡")'),'reply bubble');
  await evalBody('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await pause(240);
  writeFileSync(join(directory,'bubble.png'),(await body.webContents.capturePage()).toPNG());
  await evalBody('sprites[0].onContextMenu({preventDefault(){},clientX:100,clientY:100})');
  assert.equal(await evalBody('sprites[0].menuOpen'),true);
  assert.equal(await evalBody('getComputedStyle(document.querySelector(".dsh-pet-menu")).position'), 'fixed');
  await evalBody('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await pause(240);
  writeFileSync(join(directory,'menu.png'),(await body.webContents.capturePage()).toPNG());
  await evalBody('sprites[0].closeMenu()');
  await until(()=>evalBody('clickAudio && Number.isFinite(clickAudio.duration) && clickAudio.duration > 0'),'packaged click sound decoded');
  await evalBody('sprites[0].toggleTodo()');
  await until(()=>evalBody('document.querySelector(".dsh-pet-todo-input") && !document.querySelector(".dsh-pet-todo-input").disabled'),'original todo panel bridge');
  assert.equal(await evalBody('document.querySelector(".pet-bubble").innerText.includes("清单加载失败")'),false);
  assert.equal(await evalBody("fetch(BASE+'/todos',{method:'POST',headers:{'content-type':'application/json'},body:'{\"text\":\"测试待办\"}'}).then(r=>r.json()).then(value=>value.ok)"),true,'original panel JSON mutations cross the local bridge');
  await evalBody('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await pause(240);
  writeFileSync(join(directory,'todos.png'),(await body.webContents.capturePage()).toPNG());
  await evalBody('sprites[0].closeTodo();sprites[0].clearWhisper();sprites[0].showBalanceFromMenu()');
  await until(()=>evalBody('sprites[0].balanceWrap === true'),'unsupported balance notice');
  input({type:'sleep',value:{sleeping:true,start:'sleep-start',loop:'sleep-loop',end:'sleep-end'}});
  await until(()=>evalBody('document.querySelector("video.is-front").src.endsWith("sleep-start.webm")'),'sleep start');
  await evalBody('document.querySelector("video.is-front").dispatchEvent(new Event("ended"))');
  await until(()=>evalBody('document.querySelector("video.is-front").src.endsWith("sleep-loop.webm")'),'sleep loop');
  input({type:'sleep',value:{sleeping:false}});
  await until(()=>evalBody('document.querySelector("video.is-front").src.endsWith("sleep-end.webm")'),'wake');
  await evalBody('document.querySelector("video.is-front").dispatchEvent(new Event("ended"))');
  await toggle();
  await until(() => chat.isVisible() && evalChat('!document.getElementById("fresh").disabled'), 'open native session');
  await evalChat(`{const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;canvas.getContext('2d').fillRect(0,0,2,2);setImage(window.PetShared.encodeCanvas(canvas));}`);
  assert.equal(await evalChat('!document.getElementById("attachment").hidden'),true);
  await evalChat('document.getElementById("remove-image").click()');
  assert.equal(await evalChat('document.getElementById("attachment").hidden'),true);
  await evalChat(`const box=document.getElementById('input'); box.focus(); box.dispatchEvent(new CompositionEvent('compositionstart'));
    box.value='你好大肥鱼'; box.dispatchEvent(new Event('input')); box.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}));
    box.dispatchEvent(new CompositionEvent('compositionend'));`);
  assert.equal(sends, 0);
  await pause(100);
  await evalChat("box.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");
  await until(() => evalChat("document.getElementById('history').innerText.includes('正在打招呼')"), 'streamed reply');
  assert.equal(sends, 1);
  await evalChat("document.getElementById('hide').click()");
  await until(() => !chat.isVisible(), 'fold');
  await toggle();
  await until(() => chat.isVisible() && evalChat("!document.getElementById('stop').disabled"), 'reopen');
  await evalChat("document.getElementById('stop').click()");
  await until(() => evalChat("document.getElementById('status').innerText.includes('已停止')"), 'stop');
  assert.equal(sends, 1);
  writeFileSync(join(directory, 'chat.png'), (await chat.webContents.capturePage()).toPNG());
  writeFileSync(join(directory, 'fish.png'), (await body.webContents.capturePage()).toPNG());
  assert.equal(body.hasShadow(), false);
  assert.equal(body.webContents.getBackgroundThrottling(), false);
  assert.equal(await evalBody('getComputedStyle(document.querySelector("video")).filter'), 'none');
  const preferences = await evalBody("window.pet.call('preferences')");
  input({type: 'preferences', value: {...preferences, desktopConfineToScreen: true, desktopWorkStatusEnabled: false}});
  await until(() => evalBody('sprites[0].confineToScreen && !sprites[0].pet.workStatusEnabled'), 'live desktop settings');
  const menuColumns = await evalBody(`(() => {
    const menu = S.mountContextMenu({tree:[{label:'branch',children:[{label:'child',action:'child'}]},{label:'leaf',action:'leaf'}], x:100,y:100,onAction(){}});
    const root = document.querySelector('.dsh-pet-menu'), entries = root.querySelector('.dsh-pet-menu-column').children;
    const count = () => [...root.querySelectorAll('.dsh-pet-menu-column')].filter(node => node.style.display !== 'none').length;
    entries[0].dispatchEvent(new MouseEvent('mouseenter'));const opened = count();
    entries[1].dispatchEvent(new MouseEvent('mouseenter'));const closed = count();
    menu.close();return [opened,closed];
  })()`);
  assert.deepEqual(menuColumns, [2,1]);
  await evalBody('sprites[0].tipOn = true');
  body.webContents.send('pet:pointer-left');
  await until(() => evalBody('!sprites[0].tipOn'), 'pointer-left tooltip release');
  for (const [tier, percent] of [0,20,40,60,80,100].entries()) {
    input({type:'balance',value:{ok:true,provider:'fixture',shape:'windows',data:{monthly:percent}}});
    await until(() => evalBody(`sprites[0].anim === sprites[0].animations.events.balance[${tier}] && document.querySelector("video.is-front").readyState >= 2`), 'decoded balance tier '+tier);
  }
  input({type:'say',value:{text:'专属碎碎念', whisper:true, sticker:'可爱'}});
  await until(() => evalBody('sprites[0].animations.events.whisper.includes(sprites[0].anim) && document.querySelector("video.is-front").readyState >= 2'), 'decoded whisper action');
  await until(() => trayMenu?.items[0]?.checked, 'original native tray menu');
  const visibleMenu = trayMenu;
  trayMenu.items[0].click(); await until(() => trayMenu !== visibleMenu && !body.isVisible() && !trayMenu.items[0].checked, 'hide body from tray');
  trayMenu.items[0].click(); await until(() => body.isVisible() && trayMenu.items[0].checked, 'show body from tray');
  log(JSON.stringify({ status: 'passed', directory, received: sends, dragRecovery: "controlled-renderer-events", emotionPlayback: true, clickFeedback:true, menu:true, replyBubble:true, sleep:true, soundDecoded:true, todoPanel:true, balanceNotice:true, imagePreview:true, upperFlightBoundary:true, upstreamDesktop047:true, decodedBalanceTiers:6, tray:true }) + '\n');
}
run().then(() => {
  // The fixture must not leave hidden topmost windows behind when it finishes.
  for (const win of BrowserWindow.getAllWindows()) win.destroy();
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
