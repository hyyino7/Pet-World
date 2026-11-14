// Adapt the pinned renderer's display lifetime without owning its body or Life.
export function createDesktopPresentationLifecycle({document, sprites, wake, reset,
  subscribe, frames, onDispose = () => {}}) {
  let nativeVisible = !subscribe, ready = false, disposed = false, generation = 0;
  const paused = new Set();
  const wantsVisible = () => !disposed && nativeVisible && !document.hidden;
  const canPresent = () => wantsVisible() && ready;
  const pause = video => { if (!video.paused) paused.add(video); video.pause(); };
  function suspend() {
    frames?.setVisible(false);
    for (const sprite of sprites()) {
      sprite.companionPlaybackController?.suspend();
      sprite.stopMove(); sprite.stopThrow(); sprite.stopDragFollow(); sprite.stopSquash();
      if (sprite.dragState) sprite.dragState.active = false;
      sprite.pendingSquash = false;
      sprite.syncInputBusy();
    }
    for (const video of document.querySelectorAll('video')) pause(video);
  }
  function changed() {
    if (disposed) return;
    generation++; ready = false; reset(); suspend(); wake();
  }
  const onPlay = event => { if (!canPresent() && event.target?.tagName === 'VIDEO') pause(event.target); };
  document.addEventListener('play',onPlay,true);
  document.addEventListener('visibilitychange',changed);
  const unsubscribe = subscribe?.(value => {
    if (nativeVisible === value.visible) return;
    nativeVisible = value.visible; changed();
  });
  return {
    wantsVisible, canPresent, ticket: () => generation,
    accepts: ticket => wantsVisible() && ticket === generation,
    ready() {
      if (!wantsVisible()) return;
      ready = true;
      frames?.setVisible(true);
      const resume=Array.from(paused);paused.clear();
      for (const video of resume) {
        const owner=sprites().find(sprite=>sprite.videoA===video || sprite.videoB===video);
        if(owner && (owner.frozen || (owner.front===0?owner.videoA:owner.videoB)!==video))continue;
        if(video.isConnected !== false && !video.ended)video.play()?.catch?.(() => {});
      }
      for (const sprite of sprites()) sprite.applyCompanionPlayback?.(true);
    },
    dispose() {
      if(disposed)return;
      disposed=true;generation++;ready=false;suspend();paused.clear();wake();unsubscribe?.();
      document.removeEventListener('play',onPlay,true);
      document.removeEventListener('visibilitychange',changed);onDispose();
    },
  };
}

/** Batch cosmetic motion callbacks into at most 30 frames/s, with no hidden pump. */
export function createPresentationFrames({request, cancel, now = () => performance.now(),
  set = (fn,ms) => setTimeout(fn,ms), clear = handle => clearTimeout(handle)}) {
  const callbacks=new Map();let sequence=0,visible=false,timer,frame,last=-Infinity;
  function stop(){if(timer!==undefined){clear(timer);timer=undefined;}if(frame!==undefined){cancel(frame);frame=undefined;}}
  function schedule(){
    if(!visible||!callbacks.size||timer!==undefined||frame!==undefined)return;
    timer=set(()=>{timer=undefined;if(!visible)return;frame=request(at=>{
      frame=undefined;if(!visible)return;last=at;
      const pending=Array.from(callbacks.values());callbacks.clear();
      for(const callback of pending)callback(at);
      schedule();
    });},Math.max(0,1000/30-(now()-last)));
  }
  return {
    request(callback){const id=++sequence;if(visible){callbacks.set(id,callback);schedule();}return id;},
    cancel(id){callbacks.delete(id);if(!callbacks.size)stop();},
    setVisible(value){if(visible===Boolean(value))return;visible=Boolean(value);stop();if(!visible)callbacks.clear();else{last=-Infinity;schedule();}},
  };
}
