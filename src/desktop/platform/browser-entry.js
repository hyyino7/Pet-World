// Composed with the released Pet client and the companion settings by the local build.
function registerCompanion(info) {
  window.__ModuleLoader__.load({...info, factory(require) {
    const settings = info.factory(require);
    return {...settings, apply(ctx) {
      settings.apply(ctx);
      if (typeof ctx.inject !== 'function') return;
      ctx.inject(['slots','locale','connection','remote','commandUi'], scope => {
        scope.effect(() => {
          const lifetime = new AbortController();
          let timer, presentation, loading;
          const rpc = (method,input) => scope.connection.rpc.call('/api','chatpetSettings/'+method,
            {requestId:crypto.randomUUID(),input},lifetime.signal);
          function schedule(delay) {
            if (!timer && !lifetime.signal.aborted) timer=setTimeout(()=>{timer=undefined;void mount();}, delay);
          }
          function mount() {
            if (loading) return loading;
            loading=(async()=>{
              await presentation?.dispose();
              presentation=undefined;
              const status=await rpc('snapshot',{}), workspaceId=status?.value?.preferences?.workspace?.id;
              if (!workspaceId) throw Error('未绑定工作区');
              const reply=await rpc('petPlatformAccess',{workspaceId});
              if (!reply?.ok || lifetime.signal.aborted) throw Error('桌宠平台未连接');
              const {path,token,mediaToken}=reply.value;
              if(path!=='/chatpet-presentation'||!token||!/^[a-f0-9]{64}$/.test(mediaToken)) throw Error('无效的桌宠凭证');
              const presentationPath=path+'/m/'+mediaToken;
              const fetchOwner=async(input,init)=>{
                const url=new URL(input instanceof Request ? input.url : input,document.baseURI);
                const local=url.protocol===location.protocol && url.host===location.host;
                if (!local || !url.pathname.startsWith(presentationPath+'/')) return globalThis.fetch(input,init);
                const headers=new Headers(input instanceof Request ? input.headers : undefined);
                new Headers(init?.headers).forEach((value,key)=>headers.set(key,value));
                headers.set('Authorization','Bearer '+token);
                const response=await globalThis.fetch(input,{...init,headers,redirect:'error'});
                if(response.status===401)schedule(25);
                return response;
              };
              presentation=scope.plugin(makePetPresentation(require,fetchOwner,presentationPath));
            })().catch(()=>schedule(8000)).finally(()=>{loading=undefined;});
            return loading;
          }
          void mount();
          return async()=>{lifetime.abort();clearTimeout(timer);await loading;await presentation?.dispose();};
        });
      });
    }};
  }});
}
