// Presentation timing only. The host supplies the accepted Body projection;
// this adapter cannot choose goals, settle effects or acknowledge life facts.
export function createActivityPlaybackController({sample, play, visible = () => !document.hidden,
  now = () => Date.now(), set = (fn, ms) => setTimeout(fn, ms), clear = id => clearTimeout(id),
  failure = () => {}, invalidate = () => {}, present = () => {}}) {
  let descriptor, current, video, timer, endedBinding, endedKey, endedVideo, disposed = false, suspended = false, generation = 0;
  const stopTimer = () => { if (timer !== undefined) { clear(timer); timer = undefined; } };
  const pause = () => { try { video?.pause(); } catch {} };
  const detach = () => {
    if (endedBinding && endedBinding.video.onended===endedBinding.listener) endedBinding.video.onended=null;
    if (endedBinding?.error) endedBinding.video.removeEventListener('error',endedBinding.error);
    endedBinding=undefined;
  };
  function schedule(part) {
    stopTimer();
    const wait = part.nextInMs ?? (part.mode === 'once' && !part.complete ? part.durationMs - part.offsetMs : undefined);
    if (!disposed && wait !== undefined && Number.isFinite(wait) && wait > 0 && visible() && !suspended)
      timer = set(() => { timer = undefined; update(descriptor, true); }, Math.max(1, wait));
  }
  function update(next, force = false) {
    if (disposed) return;
    descriptor = next;
    const part = descriptor && sample(descriptor, now());
    if (!part) {
      endedKey = undefined; endedVideo = undefined;
      if(current || video){stopTimer();pause();detach();current=undefined;video=undefined;generation++;invalidate();}
      return;
    }
    if (endedKey !== part.key) { endedKey = undefined; endedVideo = undefined; }
    if (!visible()) { suspend(); return; }
    suspended = false;
    if (!force && current?.key === part.key && current.complete === part.complete) return;
    const same = current?.key === part.key;
    current = part; generation++;
    const ticket = generation;
    if (same && video && video.readyState >= 2) ready(video, part.key);
    else { pause(); video = undefined; endedVideo = undefined; play(part, generation); }
    if (ticket === generation) schedule(part);
  }
  function isCurrent(key, ticket) {
    return !disposed && !suspended && visible() && descriptor && current?.key === key
      && (ticket === undefined || ticket === generation) && sample(descriptor, now())?.key === key;
  }
  function ready(element, key, ticket) {
    if (!isCurrent(key, ticket)) { try { element.pause(); } catch {} return false; }
    const part = sample(descriptor, now());
    if (!part) return false;
    detach();video = element; current = part;
    element.loop = part.mode === 'loop';
    const duration = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : part.durationMs / 1000;
    const at = Math.max(0, Math.min(part.offsetMs / 1000, Math.max(0, duration - .001)));
    const playbackGeneration = generation;
    const held = endedKey === key && part.mode === 'once';
    if (!held || endedVideo !== element) {
      try { element.currentTime = held ? Math.max(0,duration - .001) : at; } catch { fail(key,playbackGeneration); return false; }
      if (held) endedVideo = element;
    }
    element.onended = () => {
      if (video !== element || !isCurrent(key,playbackGeneration)) return;
      if (part.mode === 'once') {
        if (endedKey !== key) {
          endedKey = key; endedVideo = element;
          element.pause();
          // A decoder may finish before the shared segment boundary. Hold the
          // real last frame, without playing a tail repeatedly until that wake.
          const endedDuration = Number(element.duration);
          if (Number.isFinite(endedDuration) && endedDuration > 0 && element.currentTime < endedDuration - .001)
            try { element.currentTime = Math.max(0,endedDuration - .001); } catch { fail(key,playbackGeneration); }
        }
        return;
      }
      update(descriptor, true);
    };
    const error=()=>fail(key,playbackGeneration);
    element.addEventListener('error',error);
    endedBinding={video:element,listener:element.onended,error};
    if (held || part.mode === 'static' || part.complete) element.pause();
    else { try { void element.play()?.catch?.(() => fail(key,playbackGeneration)); } catch { fail(key,playbackGeneration); return false; } }
    if (isCurrent(key,playbackGeneration)) present(element,part);
    schedule(part);
    return true;
  }
  function suspend() {
    if (disposed) return;
    suspended = true; generation++; stopTimer(); pause(); detach(); invalidate();
  }
  function fail(key,ticket) {
    if (!isCurrent(key,ticket)) return;
    const part = sample(descriptor,now());
    endedKey = undefined; endedVideo = undefined;
    generation++; stopTimer(); pause(); detach(); failure(descriptor,current);
    // A failed movie does not cancel the next accepted visual stage. Keep only
    // that real boundary, never a retry timer for a failed final loop/one-shot.
    if (part?.nextInMs !== undefined) schedule(part);
  }
  return {
    update, ready, isCurrent, suspend,
    active: () => Boolean(descriptor && !disposed),
    sample: () => descriptor && sample(descriptor, now()),
    fail,
    dispose() { if (disposed) return; suspend();detach();disposed = true;descriptor = undefined;current = undefined;video = undefined;endedKey = undefined;endedVideo = undefined; },
  };
}

/** Keep the pinned native sprite's loader, double buffer and input protections. */
export function installNativeActivityPlayback(Sprite, {sample, lifecycle}) {
  const original = Object.fromEntries(['switchTo','playIdle','handleEnded','restartLoop','setSleep','dispose','onMenuAction','applyFreeze']
    .map(name => [name, Sprite.prototype[name]]));
  const style = (sprite,video,field,value) => {
    sprite.companionPlaybackStyles ??= new Map();
    const owned=sprite.companionPlaybackStyles.get(video) ?? {};
    owned[field] ??= {before:video.style[field] || ''};
    owned[field].value=value;sprite.companionPlaybackStyles.set(video,owned);video.style[field]=value;
  };
  const clearPending = sprite => {
    if (sprite.companionLoadTimer !== undefined) window.clearTimeout(sprite.companionLoadTimer);
    sprite.companionLoadTimer = undefined;
    sprite.companionLoadFailure = undefined;
    const native = sprite.companionLoadReady;
    if (native) native.video.removeEventListener('loadeddata',native.listener);
    sprite.companionLoadReady = undefined;
    for (const [video,handlers] of sprite.companionPlaybackBindings ?? []) {
      video.removeEventListener('loadeddata',handlers.ready);
      video.removeEventListener('error',handlers.error);
    }
    sprite.companionPlaybackBindings?.clear();
  };
  Sprite.prototype.applyCompanionPlayback = function(force = false) {
    if (this.companionPlaybackResuming) return true;
    const descriptor = this.pet.companionPlayback;
    if (!descriptor) { this.releaseCompanionPlayback(); return false; }
    this.pendingSquash = false;
    this.companionPlaybackController ??= createActivityPlaybackController({sample,
      visible: () => lifecycle.canPresent() && !this.frozen,
      present: (video,part) => {style(this,video,'visibility','');style(this,video,'transform',part.mirror === true ? 'scaleX(-1)' : '');},
      invalidate: () => {
        clearPending(this); this.gen++; this.pending = null;
      },
      play: (part, ticket) => {
        this.stopMove();
        // A different accepted operation may reuse the same movie. Invalidate
        // an older pending swap before using the original source loader.
        clearPending(this);
        if (this.pending) { this.gen++; this.pending = null; }
        original.switchTo.call(this, part.desktopClip, part.mode !== 'loop');
        this.companionLoadFailure = {gen:this.gen,fail:()=>this.companionPlaybackController.fail(part.key,ticket)};
        const target = this.front === 0 ? this.videoB : this.videoA;
        target.autoplay = false;
        const ready = () => {
          target.removeEventListener('loadeddata', ready);
          target.removeEventListener('error',error);
          if (!this.companionPlaybackController.ready(target, part.key, ticket)) return;
        };
        const error = () => this.companionPlaybackController.fail(part.key,ticket);
        this.companionPlaybackBindings ??= new Map();
        this.companionPlaybackBindings.set(target,{ready,error});
        target.addEventListener('loadeddata', ready);
        target.addEventListener('error',error);
      },
      failure: descriptor => {
        clearPending(this); this.gen++; this.pending = null;
        for (const video of [this.videoA,this.videoB]) { video.pause(); style(this,video,'visibility','hidden'); }
        this.showWhisper?.(descriptor.notice || '当前动作暂时无法显示',undefined,undefined,undefined,false);
      },
    });
    this.sleeping = descriptor.kind === 'sleep';
    this.sleepPhase = this.sleeping ? 'loop' : null;
    this.companionPlaybackOwnsSleep = true;
    this.companionPlaybackController.update(descriptor, force);
    return true;
  };
  Sprite.prototype.releaseCompanionPlayback = function() {
    if (!this.companionPlaybackController) return false;
    this.pendingSquash = false;
    this.companionPlaybackController.dispose(); this.companionPlaybackController = undefined;
    for (const [video,owned] of this.companionPlaybackStyles ?? []) for (const [field,value] of Object.entries(owned))
      if (video.style[field]===value.value) video.style[field]=value.before;
    this.companionPlaybackStyles?.clear();
    if (this.companionPlaybackOwnsSleep) {
      this.sleeping=false; this.sleepPhase=null; this.sleepSet=null; this.companionPlaybackOwnsSleep=false;
    }
    if (!this.sleeping && this.animations?.idle?.length) original.playIdle?.call(this);
    return true;
  };
  if (original.applyFreeze) Sprite.prototype.applyFreeze = function(next) {
    const managed=Boolean(this.pet.companionPlayback),changed=this.frozen!==next;
    if (managed && changed && next) this.companionPlaybackController?.suspend();
    this.companionPlaybackResuming=managed && changed && !next;
    let result;
    try {result=original.applyFreeze.call(this,next);}finally {this.companionPlaybackResuming=false;}
    if (managed && changed && !next) this.applyCompanionPlayback(true);
    return result;
  };
  Sprite.prototype.switchTo = function(...args) {
    if (this.pet.companionPlayback) {
      if (args[2]) this.reportPlayback(args[2],'cancelled','body-activity');
      return this.applyCompanionPlayback();
    }
    return original.switchTo.apply(this,args);
  };
  for (const name of ['playIdle','handleEnded','restartLoop','setSleep']) {
    if (!original[name]) continue;
    Sprite.prototype[name] = function(...args) {
      if (this.pet.companionPlayback) return this.applyCompanionPlayback(name === 'restartLoop');
      return original[name].apply(this,args);
    };
  }
  if (original.onMenuAction) Sprite.prototype.onMenuAction = function(leaf,...args) {
    if (this.pet.companionPlayback && leaf?.anim) {
      this.closeMenu?.();
      if (leaf.playbackId) this.reportPlayback(leaf.playbackId,'cancelled','body-activity');
      return this.applyCompanionPlayback();
    }
    return original.onMenuAction.call(this,leaf,...args);
  };
  Sprite.prototype.dispose = function(...args) {
    this.companionPlaybackController?.dispose();
    return original.dispose?.apply(this,args);
  };
}
