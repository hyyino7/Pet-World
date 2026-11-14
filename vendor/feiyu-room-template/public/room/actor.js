// 小蓝鱼的立绘播放器 —— dsh-pet 的透明 webm 动画贴在 3D 画面上。
//
// 只做表现：切片段、交叉淡入、脚下阴影、朝向相机。行为由 home-state.js 决定。
import * as THREE from './vendor/three.module.js';
import { animationAssets } from './animation-map.js';

// 有些原始走路片段开头是站立/起步前摇。循环时从 trim 点开始，
// 避免角色已经在移动、画面却还站着滑一段。
const LOOP_TRIM = Object.freeze({ run_happy: 0.90 });

export const CLIPS = Object.freeze({
  'life-drink':'assets/pet/life-drink.webm',
  'life-read':'assets/pet/life-read.webm',
  'life-garden-till':'assets/pet/life-garden-till.webm',
  'life-garden-plant':'assets/pet/life-garden-plant.webm',
  'life-garden-water':'assets/pet/life-garden-water.webm',
  'life-garden-fertilize':'assets/pet/life-garden-fertilize.webm',
  'life-garden-harvest':'assets/pet/life-garden-harvest.webm',
  'life-trade':'assets/pet/life-trade.webm',
  idle: 'assets/pet/idle.webm',
  idle_look: 'assets/pet/idle_look.webm',
  idle_hum: 'assets/pet/idle_hum.webm',
  walk: 'assets/pet/walk.webm',
  walk_fast: 'assets/pet/walk_fast.webm',
  run_happy: 'assets/pet/run_happy.webm',
  run_hurry: 'assets/pet/run_hurry.webm',
  // 公开模板不含用户私有的背面帧；保留 key，用正面待机兜底。
  back_idle: 'assets/pet/idle.webm',
  sleep_in: 'assets/pet/sleep_in.webm',
  sleep_loop: 'assets/pet/sleep_loop.webm',
  sleep_out: 'assets/pet/sleep_out.webm',
  eat_rice: 'assets/pet/eat_rice.webm',
  eat_snack: 'assets/pet/eat_snack.webm',
  wait_food: 'assets/pet/wait_food.webm',
  brush: 'assets/pet/brush.webm',
  mirror: 'assets/pet/mirror.webm',
  desk_code: 'assets/pet/desk_code.webm',
  desk_tap: 'assets/pet/desk_tap.webm',
  desk_mutter: 'assets/pet/desk_mutter.webm',
  fan: 'assets/pet/fan.webm',
  mooncake: 'assets/pet/mooncake.webm',
  kite: 'assets/pet/kite.webm',
  react_happy: 'assets/pet/react_happy.webm',
  react_pout: 'assets/pet/react_pout.webm',
  react_shy: 'assets/pet/react_shy.webm',
  react_scare: 'assets/pet/react_scare.webm',
  stretch: 'assets/pet/stretch.webm',
  sick: 'assets/pet/sick.webm',
  game: 'assets/pet/game.webm',
  dance: 'assets/pet/dance.webm',
  nap: 'assets/pet/nap.webm',
  curtsy: 'assets/pet/curtsy.webm',
  yawn: 'assets/pet/yawn.webm',
  mutter: 'assets/pet/mutter.webm',
  ...Object.fromEntries(Object.values(animationAssets).map(asset => [asset.roomClip, 'assets/pet/' + asset.roomClip + '.webm']))
});

const POSTER = Object.freeze({
  ...Object.fromEntries(Object.keys(CLIPS).filter(key => !key.startsWith('mapped-')).map(key => [key, `assets/pet/${key}.png`])),
  ...Object.fromEntries(Object.values(animationAssets).filter(asset => asset.posterFile).map(asset => [asset.roomClip, 'assets/pet/' + asset.roomClip + '.png'])),
  back_idle: 'assets/pet/idle.png',
  react_pout: 'assets/pet/idle.png'
});
const PLANE_W = 1.422;
const PLANE_H = 1.6;
const FEET_CENTER_Y = 0.667; // 角色脚底在画面 91.7% 高度处，保证脚踩在地面
const FADE_MS = 260;

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 120);
  g.addColorStop(0, 'rgba(24,28,34,.5)');
  g.addColorStop(0.45, 'rgba(24,28,34,.2)');
  g.addColorStop(1, 'rgba(24,28,34,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(128, 128, 120, 92, 0, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class Layer {
  constructor(scene, index) {
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.loop = true;
    this.video.preload = 'auto';
    // 离屏 video 也要进入 DOM：部分 Chromium 对完全脱离文档的第二个 video
    // 会一直停在 readyState=0（本次新跑姿就撞上了），不是编码问题。
    this.video.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:180px;pointer-events:none';
    document.body.appendChild(this.video);
    this.texture = new THREE.VideoTexture(this.video);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: index === 0 ? 1 : 0,
      alphaTest: 0.02,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_W, PLANE_H), this.material);
    this.mesh.position.set(0, FEET_CENTER_Y, index * 0.0015);
    this.mesh.visible = false;
    this.src = '';
    this.loadLog = [];
    this.fade = 0;
    this.target = 0;
    this.suspended = false;
    scene.add(this.mesh);
  }
  load(src) {
    // 同一个源已经解码好：直接完成。
    this.loadLog.push({ s: src, p: 'start', rs: this.video.readyState });
    if (this.loadLog.length > 12) this.loadLog.shift();
    // 否则先挂监听再设置 src ——
    // 预取/缓存命中时 loadeddata 可能在监听挂上之前就触发，旧写法会白等 4.5s 超时。
    if (this.src === src) {
      if (this.video.readyState >= 2) return Promise.resolve();
      // 关键：轮询会重复 setClip 同一个片段。若这里重新赋值 src/load()，
      // 会把上一笔加载中止，结果永远停在 idle。复用同一笔 Promise。
      if (this._pendingLoad) return this._pendingLoad;
    }
    this.src = src;
    this.mesh.visible = true;
    const pending = new Promise((resolve, reject) => {
      let done = false, timer;
      const cleanup = () => {
        this.video.removeEventListener('loadeddata', finish);
        this.video.removeEventListener('canplay', finish);
        this.video.removeEventListener('error', finish);
        if (timer !== undefined) clearTimeout(timer);
      };
      const finish = () => { if (!done) {
        done = true; cleanup();
        this.loadLog.push({ s: src, p: 'finish', rs: this.video.readyState });
        if (this.loadLog.length > 12) this.loadLog.shift();
        resolve();
      } };
      this.video.addEventListener('loadeddata', finish, { once: true });
      this.video.addEventListener('canplay', finish, { once: true });
      this.video.addEventListener('error', finish, { once: true });
      try {
        this.video.src = src;
        this.video.load();
        // 离屏 video 不主动 play 时，部分 Chromium 会停在 readyState=0；
        // muted 的 play 只是催加载，真正淡入仍等 setClip。
        this.play();
        if (this.video.readyState >= 2) finish();
        if (!done) timer = setTimeout(finish, 4500);
      } catch (error) {
        if (!done) { done = true; cleanup(); reject(error); }
      }
    });
    this._pendingLoad = pending;
    const clear = () => { if (this._pendingLoad === pending) this._pendingLoad = null; };
    pending.then(clear, clear);
    return pending;
  }
  play() {
    if (!this.suspended) this.video.play().catch(() => {});
  }
  setTarget(v) { this.target = v; }
  tick(dt) {
    if (this.fade !== this.target) {
      const step = dt * 1000 / FADE_MS;
      this.fade += Math.sign(this.target - this.fade) * Math.min(step, Math.abs(this.target - this.fade));
      this.material.opacity = this.fade;
    }
    // Priming a pending load still needs play; a settled transparent layer
    // must stop even when it was superseded before its fade ever began.
    if (this.target === 0 && this.fade <= 0.001 && !this._pendingLoad) {
      this.mesh.visible = false;
      if (!this.video.paused) try { this.video.pause(); } catch { /* 忽略 */ }
    } else if (this.fade > 0.001) this.mesh.visible = true;
  }
}

export class SpriteActor {
  constructor(scene, { onEnded } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'da-feiyu-sprite';
    this.group.scale.setScalar(1.28);
    scene.add(this.group);
    this.layers = [new Layer(this.group, 0), new Layer(this.group, 1)];
    this.active = 0;
    this.current = '';
    this.onEnded = onEnded;
    this.endedHandler = null;
    this.flip = false;
    this.ready = false;
    this.visible = true;
    this.suspended = false;
    this.clipLog = [];

    // 脚下阴影：地面一份；坐/躺时再给接触面一份
    const st = shadowTexture();
    this.floorShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0.9 })
    );
    this.floorShadow.rotation.x = -Math.PI / 2;
    this.floorShadow.position.y = 0.008;
    this.floorShadow.scale.set(0.62, 0.38, 1);
    scene.add(this.floorShadow);
    this.surfaceShadow = this.floorShadow.clone();
    this.surfaceShadow.material = this.floorShadow.material.clone();
    this.surfaceShadow.material.opacity = 0.55;
    scene.add(this.surfaceShadow);
    this._pos = new THREE.Vector2(6.3, 5.1);
    this._target = new THREE.Vector2(6.3, 5.1);
    this._elev = 0;
    this._targetElev = 0;
    this._walking = false;
    this._time = 0;
  }

  async prime(name = 'idle') {
    const layer = this.layers[this.active];
    await layer.load(CLIPS[name]);
    layer.setTarget(1);
    layer.fade = 1;
    layer.material.opacity = 1;
    layer.play();
    this.current = name;
    this.ready = true;
  }

  // 预取移动用的两种跑姿；真正切换仍走 setClip，避免首次出发还在等视频加载。
  prefetch(names = []) {
    if (!Array.isArray(names) || !names.length) return;
    this._prefetch = this._prefetch || [];
    for (const name of names) {
      if (!CLIPS[name] || this._prefetch.some((x) => x.name === name)) continue;
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.src = CLIPS[name];
      v.load();
      this._prefetch.push({ name, el: v });
    }
  }

  /** Join the shared presentation timeline without choosing life goals. */
  setPlayback(playback, sample, now = () => Date.now()) {
    this.playback = playback;
    this.playbackSampler = sample;
    this.playbackNow = now;
    this.refreshPlayback();
  }

  clearPlayback() {
    this.clearPlaybackTimer();
    this.playback = null;
    this.playbackSampler = null;
    this.clipPlaybackKey = null;
    for (const layer of this.layers) { layer.playbackEndedKey = null; layer.playbackEndedVideo = null; }
  }

  clearPlaybackTimer() {
    if (this.playbackTimer !== undefined) clearTimeout(this.playbackTimer);
    this.playbackTimer = undefined;
  }

  playbackSample() {
    return this.playback && this.playbackSampler?.(this.playback, this.playbackNow());
  }

  alignPlayback(layer, sample) {
    layer.playbackMirror = sample.mirror === true;
    if (layer.posterTexture) { layer.video.pause(); return; }
    if (layer.playbackEndedKey && layer.playbackEndedKey === sample.key && sample.mode === 'once') {
      layer.video.pause();
      if (layer.video.readyState < 2) { layer.playbackEndedVideo = null; return; }
      if (layer.playbackEndedVideo !== layer.video) {
        const duration = Number(layer.video.duration);
        if (Number.isFinite(duration)) try { layer.video.currentTime = Math.max(0,duration - .001); } catch { /* Metadata can still be pending. */ }
        layer.playbackEndedVideo = layer.video;
      }
      return;
    }
    layer.playbackEndedKey = null;
    layer.playbackEndedVideo = null;
    const duration = Number(layer.video.duration);
    const end = Number.isFinite(duration) ? Math.max(0, duration - 0.001) : Infinity;
    try { layer.video.currentTime = Math.max(0, Math.min(end, sample.offsetMs / 1000)); } catch { /* Metadata can still be pending. */ }
    if (sample.mode === 'static' || sample.complete) layer.video.pause();
    else layer.play();
  }

  refreshPlayback(force = false) {
    this.clearPlaybackTimer();
    if (!this.playback || this.suspended || !this.visible) return;
    const sample = this.playbackSample();
    if (!sample) return;
    if (this.clipPlaybackKey !== sample.key || this.current !== sample.roomClip) {
      this.setClip(sample.roomClip, { once: sample.mode !== 'loop', playbackKey: sample.key,
        sample: () => this.playbackSample(), onEnded: () => this.refreshPlayback(true) });
    } else if (force || sample.complete || sample.mode === 'static') {
      this.alignPlayback(this.layers[this.active], sample);
    }
    // A single boundary wakeup, never a background animation polling loop.
    if (Number.isFinite(sample.nextInMs) && sample.nextInMs > 0) {
      this.playbackTimer = setTimeout(() => this.refreshPlayback(true), Math.min(2147483647, sample.nextInMs));
    }
  }

  async showPlaybackFallback(layer, name, generation) {
    this.playbackFault = 'Animation unavailable: ' + name;
    layer.playbackEndedKey = null;
    layer.playbackEndedVideo = null;
    for (const item of this.layers) item.video.pause();
    try {
      const texture = await new THREE.TextureLoader().loadAsync(POSTER[name] || POSTER.idle);
      if (this.clipGeneration !== generation) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      layer.posterTexture?.dispose();
      layer.posterTexture = texture;
      layer.material.map = texture;
      layer.material.needsUpdate = true;
      layer.setTarget(1);
      for (const item of this.layers) if (item !== layer) item.setTarget(0);
    } catch { /* Keep the last still and factual activity label if the poster also fails. */ }
  }

  async setClip(name, { once = false, fade = true, onEnded = null, playbackKey = null, sample = null } = {}) {
    if (!CLIPS[name]) name = 'idle';
    this.clipLog.push({ n: name, p: 'start', cur: this.current, a: this.active });
    if (this.clipLog.length > 20) this.clipLog.shift();
    if (this.current === name && this.clipPlaybackKey === playbackKey && (!once || playbackKey)) return;
    const generation = this.clipGeneration = (this.clipGeneration || 0) + 1;
    this.clipPlaybackKey = playbackKey;
    const nextIndex = 1 - this.active;
    const next = this.layers[nextIndex];
    const prev = this.layers[this.active];
    next.posterTexture?.dispose();
    next.posterTexture = null;
    next.material.map = next.texture;
    next.material.needsUpdate = true;
    next.mesh.visible = true;
    next.playbackMirror = sample?.()?.mirror === true;
    next.playbackEndedKey = null;
    next.playbackEndedVideo = null;
    // 清掉这个图层上一轮留下的“跳过前摇后手动循环”监听，避免叠监听。
    if (next.video._trimEnded) {
      next.video.removeEventListener('ended', next.video._trimEnded);
      next.video._trimEnded = null;
    }
    // 不在这里 await 视频：轮询/连续 setClip 时，等待会让 current 一直停在 idle。
    // 先把逻辑片段切过去，视频 ready 后再淡入；加载失败也不会卡住移动。
    const loaded = next.load(CLIPS[name]);
    const trimStart = once || playbackKey ? 0 : (LOOP_TRIM[name] || 0);
    next.video.loop = !once && !trimStart;
    if (trimStart) {
      // 不用 loop 属性：loop 会从 0 重播，前摇每次循环都会出现。
      const onTrimEnded = () => {
        if (this.current !== name) return;
        try { next.video.currentTime = trimStart; } catch { /* 还没元数据 */ }
        next.play();
      };
      next.video.addEventListener('ended', onTrimEnded);
      next.video._trimEnded = onTrimEnded;
    }
    next.mesh.visible = true;
    next.fade = 0;
    next.material.opacity = 0;
    next.setTarget(0);
    if (next.video._onceEnded) next.video.removeEventListener('ended', next.video._onceEnded);
    if (once) {
      const clipVideo = next.video;
      const ended = () => {
        if (this.clipGeneration !== generation || this.current !== name || next.video !== clipVideo) return;
        // Shared once clips hold or join their next visual segment. They do not
        // complete a body operation or return to an independent idle chain.
        if (playbackKey) {
          const current = sample?.();
          if (current?.key === playbackKey && current.mode === 'once' && next.playbackEndedKey !== playbackKey) {
            next.playbackEndedKey = playbackKey; next.playbackEndedVideo = next.video;
            next.video.pause();
            const duration = Number(next.video.duration);
            if (Number.isFinite(duration) && next.video.currentTime < duration - .001)
              try { next.video.currentTime = Math.max(0,duration - .001); } catch { /* Keep the decoded final frame if seeking is unavailable. */ }
          }
          return;
        }
        this.onEnded?.(name);
        onEnded?.();
      };
      next.video._onceEnded = ended;
      next.video.addEventListener('ended', ended, { once: true });
    }

    this.active = nextIndex;
    this.current = name;
    this._lastSwap = performance.now();
    loaded.then(() => {
      if (this.clipGeneration !== generation || this.current !== name) return;
      if (playbackKey && (next.video.readyState < 2 || next.video.error)) {
        this.showPlaybackFallback(next, name, generation);
        return;
      }
      this.playbackFault = null;
      const current = sample?.();
      if (playbackKey && (!current || current.key !== playbackKey || current.roomClip !== name)) {
        this.refreshPlayback();
        return;
      }
      if (current) this.alignPlayback(next, current);
      else {
        try { next.video.currentTime = trimStart; } catch { /* Metadata can still be pending. */ }
        next.play();
      }
      next.setTarget(1);
      if (fade) {
        prev.setTarget(0);
      } else {
        prev.fade = 0;
        prev.material.opacity = 0;
        prev.mesh.visible = false;
        next.fade = 1;
        next.material.opacity = 1;
        try { prev.video.pause(); } catch { /* 忽略 */ }
      }
    }).catch(() => {});
    return loaded;
  }

  setVisible(v) {
    const changed = this.visible !== v;
    this.visible = v;
    this.group.visible = v;
    this.floorShadow.visible = v;
    this.surfaceShadow.visible = v;
    if (changed) this.setSuspended(this.suspended);
  }

  setSuspended(value) {
    this.suspended = Boolean(value);
    const suspended = this.suspended || !this.visible;
    this.clearPlaybackTimer();
    for (const layer of this.layers) {
      layer.suspended = suspended;
      if (suspended) layer.video.pause();
      else if (!this.playback && (layer.target > 0 || layer.fade > 0)) layer.play();
    }
    if (suspended) for (const item of this._prefetch || []) item.el.pause();
    else if (this.playback) this.refreshPlayback(true);
  }

  update(dt, camera, { pos, elev = 0, walking = false, flip = false, faceCamera = true, snap = false }) {
    this._time += dt;
    this._target.set(pos[0], pos[1]);
    const d = this._pos.distanceTo(this._target);
    if (snap || d > 2.2) this._pos.copy(this._target);
    else {
      const k = 1 - Math.pow(0.001, dt);
      this._pos.lerp(this._target, Math.min(1, k * 1.4));
    }
    this._targetElev = elev;
    this._elev = snap ? this._targetElev : this._elev + (this._targetElev - this._elev) * Math.min(1, dt * 7);
    this._walking = walking;

    const bob = walking ? Math.abs(Math.sin(this._time * 7.2)) * 0.014 : Math.sin(this._time * 1.7) * 0.006;
    this.group.position.set(this._pos.x, this._elev + (walking ? bob : 0), this._pos.y);
    if (faceCamera) {
      const dx = camera.position.x - this._pos.x;
      const dz = camera.position.z - this._pos.y;
      this.group.rotation.y = Math.atan2(dx, dz);
    }
    this.flip = this.playback ? this.layers[this.active].playbackMirror === true : flip;
    for (const layer of this.layers) {
      const mirrored = this.playback ? layer.playbackMirror === true : flip;
      layer.mesh.scale.x = mirrored ? -1 : 1;
    }
    for (const l of this.layers) l.tick(dt);

    // 阴影
    this.floorShadow.position.set(this._pos.x, 0.008, this._pos.y);
    this.floorShadow.scale.setScalar(walking ? 0.6 + Math.sin(this._time * 7.2) * 0.03 : 0.62);
    const sitting = this._elev > 0.1;
    this.surfaceShadow.visible = this.visible && sitting;
    if (sitting) {
      this.surfaceShadow.position.set(this._pos.x, this._elev + 0.006, this._pos.y);
      this.surfaceShadow.scale.set(0.52, 0.32, 1);
      this.surfaceShadow.material.opacity = 0.5;
    }
    this.floorShadow.material.opacity = sitting ? 0.18 : 0.55;
  }

  /** 截图模式：用预生成的透明 PNG，避免无头浏览器等视频首帧。 */
  async prepareShotPoster(name) {
    const key = CLIPS[name] ? name : 'idle';
    const layer = this.layers[this.active];
    try {
      const tex = await new THREE.TextureLoader().loadAsync(POSTER[key] || POSTER.idle);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      const old = layer.material.map;
      layer.material.map = tex;
      layer.material.opacity = 1;
      layer.material.needsUpdate = true;
      layer.mesh.visible = true;
      layer.video.pause();
      this.current = key;
      if (old && old !== tex) { try { old.dispose(); } catch { /* 忽略 */ } }
      return true;
    } catch {
      return this.prepareShot(key, 2.4).then(() => true).catch(() => false);
    }
  }

  /** 截图模式：不用真的等播放，直接把视频 seek 到指定帧。 */
  async prepareShot(name, seconds = 2.4) {
    const layer = this.layers[this.active];
    await layer.load(CLIPS[name] || CLIPS.idle);
    layer.video.pause();
    await new Promise((resolve) => {
      let done = false;
      let timer;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        layer.video.removeEventListener('seeked', finish);
        resolve();
      };
      layer.video.addEventListener('seeked', finish, { once: true });
      timer = setTimeout(finish, 1200);
      try { layer.video.currentTime = seconds; } catch { finish(); }
    });
    layer.video.pause();
    layer.material.opacity = 1;
    layer.mesh.visible = true;
    this.current = name;
  }

  dispose() {
    this.clearPlaybackTimer();
    this.clipGeneration = (this.clipGeneration || 0) + 1;
    this.playback = null;
    for (const l of this.layers) {
      try { l.video.pause(); l.video.src = ''; } catch { /* 忽略 */ }
      l.posterTexture?.dispose();
      l.texture.dispose();
      l.material.dispose();
      l.mesh.geometry.dispose();
    }
    this.floorShadow.geometry.dispose();
    this.floorShadow.material.dispose();
    this.surfaceShadow.material.dispose();
  }
}
