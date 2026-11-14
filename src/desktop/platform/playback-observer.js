// Included by the presentation build in both native renderers. This observer
// never chooses or starts an animation; callers invoke it after actual playback.
function createCompanionPlaybackObserver(send, allowedNames, createId = () => crypto.randomUUID()) {
  const active = new WeakMap();
  return (video, name, petId) => {
    if (!allowedNames.has(name) || video.paused || video.readyState < 2) return;
    const old = active.get(video);
    if (old?.name === name && old.source === video.src) return;
    old?.finish('cancelled');
    const id = 'random-' + createId(), source = video.src;
    let stopped = false;
    const publish = status => {try {void Promise.resolve(send({id, name, petId, status, kind:'random'})).catch(()=>{});}catch {}};
    const ended = () => {if(video.ended)finish(video.src===source?'ended':'cancelled');};
    const paused = () => {if(video.paused)finish(video.ended && video.src===source ? 'ended' : 'cancelled');};
    const failed = () => {if(video.error)finish(video.src===source?'failed':'cancelled');};
    const finish = status => {
      if (stopped) return;
      stopped = true;
      video.removeEventListener('ended', ended);
      video.removeEventListener('pause', paused);
      video.removeEventListener('error', failed);
      if (active.get(video)?.id === id) active.delete(video);
      publish(status);
    };
    active.set(video, {id,name,source,finish});
    video.addEventListener('ended', ended);
    video.addEventListener('pause', paused);
    video.addEventListener('error', failed);
    publish('playing');
    return id;
  };
}
