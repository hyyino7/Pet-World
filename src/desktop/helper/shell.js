'use strict';
// Native host adapter for the pinned, unmodified dsh-pet PetSprite shell.
// PetSprite owns drag/spring/throw, geometry, animation scheduling and playback.
// The host owns native chat, work eligibility and Emotion intent.
void (async () => {
  const bridge = window.pet;
  const [catalog, geometry, preferences, defaults] = await Promise.all([bridge.call('catalog'), bridge.call('geometry'), bridge.call('preferences'), fetch('../assets/interaction.json').then(r=>r.json())]);
  let settings = preferences;
  const notify = error => sprite.showWhisper(String(error.message ?? error), undefined, undefined, settings.desktopBubbleSeconds*1000, false);
  applyDeskGeometry(geometry);
  // Upstream renderer.js injectAssets: keep its shared menu/tooltip styling
  // and original font/cursors, with package-local asset URLs.
  const style=document.createElement('style');
  style.textContent=S.MENU_CSS+S.TOOLTIP_CSS+
    '@font-face{font-family:"ShangshouSoftCandy";src:url("../assets/fonts/soft-candy.ttf") format("truetype");font-display:swap;font-weight:400}'+
    '.pet-hit{cursor:url("../assets/cursor-grab.png") 16 16,grab}.pet-hit.dragging{cursor:url("../assets/cursor-grabbing.png") 16 16,grabbing}';
  document.head.appendChild(style);
  const interaction = { ...defaults, ...settings.desktopAppearance };
  config = {
    physics: interaction.physics, font: interaction.font,
    clickSoundEnabled: settings.desktopClickSound, confineToScreen: settings.desktopConfineToScreen,
  };
  document.documentElement.style.setProperty('--dsh-pet-font-family', S.fontStackOf(config.font.family));
  if (S.PET_ALPHA_FIX_ENABLED) document.documentElement.classList.add('pet-alpha-fix');
  const pool = group => catalog.actions.filter(asset => asset.group === group).map(asset => asset.id);
  const pet = {
    ...interaction,
    id: 'dafeiyu', name: '大肥鱼', size: settings.desktopSize ?? 232,
    fixedEnabled: settings.desktopFixed, balanceEnabled: true, whisperEnabled: true,
    workStatusEnabled: settings.desktopWorkStatusEnabled !== false,
  };
  const labels = new Map(catalog.actions.map(asset => [asset.id, asset.label]));
  function menuLabels(item) {
    if (item.children) return { ...item, children: item.children.map(menuLabels) };
    return item.anim ? { ...item, label: labels.get(item.anim) ?? item.label } : item;
  }
  // Only host endpoints differ from upstream. No upstream model/HTTP loops run.
  PetSprite.prototype.markPoseDirty = function () {};
  PetSprite.prototype.showChatFromMenu = function (file, encoded) {
    if (!file && !encoded) {void bridge.call('toggle');return;}
    void (file ? S.encodeImageFile(file) : Promise.resolve(encoded)).then(image=>bridge.call('attach-image',image)).catch(notify);
  };
  PetSprite.prototype.onContextMenu = function (event) {
    event.preventDefault();
    if (this.dragState.active || this.justDragged || this.menuOpen) return;
    this.stopThrow(); this.stopMove();
    const tree = [
      {label:'对话',action:'chat',hint:S.CHAT_HOTKEY_HINT},
      {label:'碎碎念',action:'whisper'},
      {label:'配图碎碎念',children:catalog.stickers.map(a=>({label:a.label,action:'whisper',image:a.id}))},
      {label:'查看余额',action:'show-balance'}, {label:'待办事项',action:'todo',hint:S.TODO_HOTKEY_HINT},
      {label:this.sleepPending?'叫住它':this.sleeping?'起来':'睡觉',action:this.sleeping||this.sleepPending?'wake':'sleep',hint:S.SLEEP_HOTKEY_HINT},
      ...S.buildMenuTree(this.animations).map(menuLabels),
      {label:settings.desktopClickSound?'关闭点击音效':'开启点击音效',action:'sound'},
      {label:settings.desktopWhisperEnabled?'关闭自动碎碎念':'开启自动碎碎念（调用模型）',action:'auto-whisper'},
      {label:settings.desktopFixed?'恢复自主移动':'固定位置',action:'fixed'},
      {label:'收起文字气泡',action:'clear-bubble'},
      {label:'重载桌宠',action:'reload'}, {label:'回到初始位置',action:'home'},
    ];
    this.menuOpen=true;this.setInteractive(true);this.syncInputBusy();window.__dshPetDebug.menuOpen=true;
    const menu=S.mountContextMenu({tree,x:event.clientX,y:event.clientY,clamp:this.visibleClampRect(),
      onAction:leaf=>this.onMenuAction(leaf),onClose:()=>{this.menuOpen=false;window.__dshPetDebug.menuOpen=false;this.syncInputBusy();if(!this.inputBusy())this.setInteractive(false);}});
    this.menuClose=menu.close;this.syncInputRegions();
  };
  const menuAction=PetSprite.prototype.onMenuAction;
  PetSprite.prototype.onMenuAction = function (leaf,...rest) {
    if (['sound','auto-whisper','fixed','clear-bubble','reload'].includes(leaf?.action)) {
      this.closeMenu();
      if (leaf.action==='clear-bubble') return this.clearWhisper();
      if (leaf.action==='reload') return void bridge.call('reload');
      const key=leaf.action==='sound'?'desktopClickSound':leaf.action==='fixed'?'desktopFixed':'desktopWhisperEnabled';
      void bridge.call('desktop-preference',{key,value:!settings[key]}).then(value=>{settings=value;config.clickSoundEnabled=value.desktopClickSound;}).catch(notify);
      return;
    }
    return menuAction.call(this,leaf,...rest);
  };
  PetSprite.prototype.openWorkSession = function () {void bridge.call('open-session',{sessionId:this.workSessionId}).catch(notify);};
  PetSprite.prototype.reloadDesktop = function () {void bridge.call('reload');};
  PetSprite.prototype.showWhisperFromMenu = function (image) {
    void bridge.call('desktop-api',{path:'/whisper'+(image?'?image='+encodeURIComponent(image):''),method:'POST'}).catch(notify);
  };
  PetSprite.prototype.showBalanceFromMenu = function () {
    void bridge.call('desktop-api',{path:'/balance',method:'POST'}).catch(notify);
  };
  PetSprite.prototype.onHotkey = function (event) {
    if (!this.hoverBody || event.repeat) return;
    if (S.isChatHotkey(event)) {event.preventDefault();void bridge.call('toggle');}
    else if (S.isCaptureHotkey(event)) {event.preventDefault();void this.captureEncoded().then(image=>bridge.call('attach-image',image)).catch(notify);}
    else if (S.isTodoHotkey?.(event)) {event.preventDefault();this.toggleTodo();}
    else if (S.isSleepHotkey?.(event)) {event.preventDefault();this.postSleepAction(this.sleeping||this.sleepPending?'wake':'sleep');}
  };
  const sprite = new PetSprite(pet);
  sprite.assetBase = '../assets/';
  sprite.hit.id = 'fish';
  sprite.hit.setAttribute('role', 'button'); sprite.hit.tabIndex = 0;
  sprites = [sprite];
  let work = null, queuedExpression = null;
  const observations = new Map();
  sprite.reportPlayback = (id, status) => {
    const record = observations.get(id);
    if (!record) return;
    void bridge.call('report', { ...record, status });
    if (status !== 'playing') observations.delete(id);
  };
  const originalPlay = sprite.playOnce.bind(sprite);
  sprite.playOnce = (name, id, url) => {
    if (!id && pool('expression').includes(name)) {
      id = crypto.randomUUID(); observations.set(id, { id, name, kind: 'random' });
    }
    originalPlay(name, id, url);
  };
  function express() {
    if (!queuedExpression || sprite.dragState.active || sprite.sleeping || work) return;
    const value = queuedExpression; queuedExpression = null;
    if (!pool('expression').includes(value.action)) return;
    const id = crypto.randomUUID();
    observations.set(id, { id, name: value.action, kind: 'expression' });
    sprite.stopMove(); originalPlay(value.action, id);
  }
  const ended = sprite.handleEnded.bind(sprite);
  sprite.handleEnded = () => {
    if (sprite.dragState.active) return ended();
    if (work?.terminal) { work = null; sprite.workState = null; }
    if (queuedExpression) {
      // Preserve upstream's truthful end receipt before the reply expression.
      if (sprite.playback) { sprite.reportPlayback(sprite.playback, 'ended'); sprite.playback = null; }
      express();
      if (!queuedExpression) return;
    }
    ended();
  };
  sprite.hit.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void bridge.call('toggle'); }
  });
  bridge.listen((type, value) => {
    if (type === 'preferences') {
      const appearanceChanged = JSON.stringify(settings.desktopAppearance) !== JSON.stringify(value.desktopAppearance);
      settings = value;
      config.clickSoundEnabled = value.desktopClickSound;
      config.confineToScreen = sprite.confineToScreen = value.desktopConfineToScreen === true;
      sprite.pet.fixedEnabled = value.desktopFixed;
      const showWork = value.desktopWorkStatusEnabled !== false;
      if (sprite.pet.workStatusEnabled && !showWork) {
        sprite.onWorkTick(null, ++workTick);
        work = null;
      }
      sprite.pet.workStatusEnabled = showWork;
      if(value.desktopFixed)sprite.stopMove();
      if(!value.desktopReplyBubble)sprite.clearWhisper();
      if(appearanceChanged || (value.desktopSize && value.desktopSize!==sprite.size))void bridge.call('reload');
    }
    if (type === 'say' && (!value.automatic || !sprite.sleeping || value.dream || value.life)) {
      const asset=catalog.stickers.find(a=>a.id===value.sticker || a.label===value.sticker);
      sprite.showWhisper(value.text,undefined,asset?new URL('../assets/'+encodeURIComponent(asset.file),location.href).href:undefined,settings.desktopBubbleSeconds*1000,value.whisper === true && !value.dream);
    }
    if (type === 'notice') notify(value.text);
    if (type === 'sleep') {queuedExpression=null;sprite.sleepPending=value.pending === true;sprite.setSleep(value);}
    if (type === 'sleep-text') {
      const pool=value.sleeping?interaction.sleepStartTexts:interaction.sleepEndTexts;
      sprite.showWhisper(S.pick(pool),undefined,undefined,settings.desktopBubbleSeconds*1000,false);
    }
    if (type === 'balance') {
      const balanceState = S.toBalanceState(value);
      if (balanceState?.ok) sprite.showBalanceNow(balanceState,true);
      else if (balanceState) sprite.showBalanceNotice(balanceState,true);
    }
    if (type === 'geometry') {
      const previous = { ...VIEW };
      if (applyDeskGeometry(value)) sprite.relayout(previous);
    }
    if (type === 'work' && sprite.pet.workStatusEnabled) {
      if (value && (work?.session !== value.session || work?.turn !== value.turn)) queuedExpression = null;
      work = value;
      // onWorkTick updates the real state and handles single-slot work loops.
      // A drag retains presentation priority; release consults this same state.
      if (sprite.dragState.active) { sprite.workState = value?.stage ?? null; return; }
      sprite.onWorkTick(value ? { state: value.stage, sessionId: value.session } : null, ++workTick);
      if (!value && !sprite.sleeping) { sprite.stopMove(); sprite.playIdle(); express(); }
    }
    if (type === 'expression' && value.action && (!work || work.session === value.sessionId && work.turn === value.turn)) {
      queuedExpression = value; express();
    }
  });
  window.addEventListener('pagehide', () => sprite.dispose(), { once: true });
  sprite.playIdle();
  window.__dshPetDebug.configOk = true; window.__dshPetDebug.spriteCount = 1;
  void bridge.call('body-ready');
})().catch(error => {
  document.getElementById('pet-error').textContent = error.message;
  document.getElementById('pet-error').classList.add('visible');
  console.error(error);
});
