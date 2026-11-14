// Presentation scheduling only. No world time, activity or model decisions live here.
export function createPresentationLoop({draw, fps, now = () => performance.now(),
  set = (fn, ms) => setTimeout(fn, ms), clear = handle => clearTimeout(handle),
  request = fn => requestAnimationFrame(fn), cancel = handle => cancelAnimationFrame(handle)}) {
  let visible = false, disposed = false, timer, frame, last = -Infinity, dirty = true;
  function stop() {
    if (timer !== undefined) { clear(timer); timer = undefined; }
    if (frame !== undefined) { cancel(frame); frame = undefined; }
  }
  function schedule() {
    if (disposed || !visible || timer !== undefined || frame !== undefined) return;
    const rate = Math.max(0, Math.min(30, Number(fps()) || 0));
    if (!dirty && !rate) return;
    const delay = Math.max(0, 1000 / (rate || 30) - (now() - last));
    timer = set(() => {
      timer = undefined;
      if (disposed || !visible) return;
      frame = request(at => {
        frame = undefined;
        if (disposed || !visible) return;
        dirty = false; last = at;
        draw(at);
        schedule();
      });
    }, delay);
  }
  return {
    invalidate() {
      dirty = true;
      if (timer !== undefined) { clear(timer); timer = undefined; }
      schedule();
    },
    setVisible(value) {
      if (disposed || visible === Boolean(value)) return;
      visible = Boolean(value); stop();
      if (visible) { dirty = true; last = -Infinity; schedule(); }
    },
    dispose() { disposed = true; visible = false; stop(); },
    inspect: () => ({visible, disposed, scheduled: timer !== undefined || frame !== undefined}),
  };
}

/** Suspend visual media, including play() promises which finish after hiding. */
export function createMediaGate(root, visible = true) {
  const paused = new Set();
  const isMedia = node => node && /^(VIDEO|AUDIO)$/.test(node.tagName);
  const media = () => Array.from(root.querySelectorAll('video, audio'));
  const hold = item => { if (!item.paused) paused.add(item); item.pause(); };
  const onPlay = event => { if (!visible && isMedia(event.target)) hold(event.target); };
  root.addEventListener('play', onPlay, true);
  return {
    setVisible(value) {
      visible = Boolean(value);
      if (!visible) for (const item of media()) hold(item);
      else {
        const resume = Array.from(paused); paused.clear();
        for (const item of resume) if (item.isConnected !== false && !item.ended) item.play()?.catch?.(() => {});
      }
    },
    dispose() { visible = false; for (const item of media()) hold(item); paused.clear(); root.removeEventListener('play', onPlay, true); },
  };
}
