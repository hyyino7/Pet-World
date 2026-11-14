// Observe the shipped CLI's real Electron child without replacing its host or IPC.
const {app,BrowserWindow}=require('electron');
const {setTimeout:pause}=require('node:timers/promises');
const {writeFileSync}=require('node:fs');
const assert=require('node:assert/strict');
require(process.argv[2]);

async function until(probe,label,ms=8500) {
  const end=Date.now()+ms;
  while(Date.now()<end) {
    const result=await probe();
    if(result)return result;
    await pause(65);
  }
  throw Error('Timed out waiting for '+label);
}
async function run() {
  await app.whenReady();
  const page=name=>BrowserWindow.getAllWindows().find(win=>win.webContents.getURL().split('?')[0].endsWith(name+'.html') && !win.webContents.isLoading());
  const pet=await until(()=>page('body'),'desktop body'), chat=await until(()=>page('chat'),'companion chat');
  const body=code=>pet.webContents.executeJavaScript(code), ui=code=>chat.webContents.executeJavaScript(code);
  await until(()=>body('document.querySelector("video.is-front")?.videoWidth>0'),'decoding original pet media');
  const online=process.env.CHATPET_PROBE_MODE==='online';
  if(online)assert.equal(await body('sprites[0].size'),216);
  await body("sprites[0].postSleepAction('sleep')");
  await until(()=>body("sprites[0].sleepSet?.loop==='sleep-loop' && sprites[0].sleeping"),'original sleep animation');
  await body("sprites[0].postSleepAction('wake')");
  await until(()=>body("!sprites[0].sleeping || sprites[0].sleepPhase==='end'"),'wake transition');
  if(online) {
    await until(()=>body("document.querySelector('.pet-bub-row')?.textContent.includes('来自房间的提醒')"),'shared room reminder');
  }
  await body("window.pet.call('toggle')");
  if(online) {
    await until(()=>ui("document.querySelector('#history').textContent.includes('绑定伙伴的历史')"),'bound native chat history');
    await ui("document.querySelector('#fresh').click()");
    await until(()=>ui("document.querySelector('#history').textContent.includes('新的原生会话')"),'new native session');
    await ui("document.querySelector('#input').value='临时测试'; document.querySelector('#composer').requestSubmit()");
    await until(()=>ui("!document.querySelector('#stop').hidden"),'mock native turn');
    await ui("document.querySelector('#stop').click()");
    await until(()=>ui("document.querySelector('#status').textContent==='已停止'"),'stopping native turn');
    await until(()=>ui("document.querySelector('#history').textContent.includes('宿主随后更新的记录')"),'following native history updates');
  } else {
    await until(()=>ui("document.querySelector('#notice').textContent.includes('离线陪伴')"),'offline chat status');
  }
  writeFileSync(process.env.CHATPET_PROBE_RESULT,JSON.stringify({mode:online?'online':'offline',media:true,sleep:true,wake:true,chat:true}));
}
run().then(()=>app.quit(),error=>{console.error(error);app.exit(1);});
