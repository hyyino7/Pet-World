'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const endpoints=new Set(['roomState','roomAction','roomGarden','roomPlant','roomCare','roomChat','roomTelevision','roomHistory','roomVoice']);
const changeListeners=new Set();
let latestChange;
const changed=(_event,value)=>{
  if(!value||typeof value.workspaceId!=='string'||typeof value.bootId!=='string'||!Number.isSafeInteger(value.revision)||value.revision<0)return;
  latestChange={workspaceId:value.workspaceId,bootId:value.bootId,revision:value.revision};
  for(const listener of changeListeners)listener({...latestChange});
};
ipcRenderer.on('chatpet-room:changed',changed);
window.addEventListener('unload',()=>{changeListeners.clear();ipcRenderer.removeListener('chatpet-room:changed',changed);},{once:true});
contextBridge.exposeInMainWorld('chatpetRoomBridge',Object.freeze({
  onChanged(listener){
    if(typeof listener!=='function')throw Error('无效的房间订阅');
    changeListeners.add(listener);
    if(latestChange)queueMicrotask(()=>{if(changeListeners.has(listener))listener({...latestChange});});
    return()=>changeListeners.delete(listener);
  },
  request(endpoint,data,requestId){
    if(!endpoints.has(endpoint)||!data||typeof data!=='object'||Array.isArray(data)||typeof requestId!=='string'||!requestId||requestId.length>160)return Promise.reject(Error('无效的房间请求'));
    return ipcRenderer.invoke('chatpet-room:request',endpoint,data,requestId);
  },
  cancel(requestId){if(typeof requestId==='string'&&requestId.length<=160)ipcRenderer.send('chatpet-room:cancel',requestId);},
}));
