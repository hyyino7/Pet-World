// Native adaptation. The owning DSH settings frame calls its authenticated Connection.
const endpoints = new Map([
  ['/api/home/state','roomState'], ['/api/home/act','roomAction'],
  ['/api/garden/state','roomGarden'], ['/api/garden/act','roomPlant'], ['/api/garden/control','roomCare'],
  ['/api/tv/opinion','roomTelevision'], ['/api/room/chat','roomChat'], ['/api/room/history','roomHistory'],
]);
export function roomRequest(url, options = {}) {
  const endpoint = endpoints.get(new URL(url, location.origin).pathname);
  if (!endpoint || parent === window) return Promise.reject(new Error('请从大肥鱼的日常生活页进入房间'));
  const data = options.body ? JSON.parse(options.body) : {};
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const finish = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); channel.port1.close(); };
    const abort = () => { finish(); reject(new Error('房间请求已结束')); };
    const timer = setTimeout(abort, ['roomTelevision','roomChat'].includes(endpoint) ? 310000 : 20000);
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener('abort', abort, {once:true});
    channel.port1.onmessage = ({data}) => {
      finish();
      resolve(new Response(JSON.stringify(data.ok ? data.value : {ok:false, error:data.error, message:data.error}), {
        status:data.ok ? 200 : 400, headers:{'content-type':'application/json'},
      }));
    };
    parent.postMessage({kind:'chatpet.room', endpoint, data}, location.origin, [channel.port2]);
  });
}
