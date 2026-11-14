import { roomRequest } from './native-room.js';
import * as THREE from './vendor/three.module.js';
import { createGardenWorld, GARDEN_PLOTS } from './garden-world.js';
import { mountGardenUI } from './garden-ui.js';

export function createGardenClient({world,renderer,camera,api,onOpen,onClose,onHomeAction}) {
  const model=createGardenWorld(world,renderer,{quality:world.quality});
  let opened=false,view=null,selected=0,readBusy=false,writeBusy=false,revision=0,failures=0;
  let visible=false,disposed=false,refreshPending=false,refreshTimer,readController;
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  const notice=document.createElement('div');notice.className='garden-connection';notice.setAttribute('role','status');notice.hidden=true;
  const noticeText=document.createElement('span');const retry=document.createElement('button');retry.type='button';retry.textContent='重试连接';notice.append(noticeText,retry);document.body.append(notice);
  retry.addEventListener('click',()=>refresh(true));
  const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.12,.32,-.93),new THREE.Vector3(1.12,.32,-.93),new THREE.Vector3(1.12,.32,.93),new THREE.Vector3(-1.12,.32,.93)
  ]),new THREE.LineBasicMaterial({color:0xffd987,transparent:true,opacity:.9,depthTest:false}));
  border.renderOrder=10;border.visible=false;world.scene.add(border);
  const particleGeo=new THREE.BufferGeometry();const particleCoords=new Float32Array(24*3);particleGeo.setAttribute('position',new THREE.BufferAttribute(particleCoords,3));
  const particles=new THREE.Points(particleGeo,new THREE.PointsMaterial({color:0xffd66b,size:.07,transparent:true,opacity:1,depthWrite:false}));
  particles.visible=false;world.scene.add(particles);let effectAt=0,effectKind='';
  const plots=GARDEN_PLOTS;
  // Coordinate definitions also serve the interaction overlay. Support the
  // exported {x,z} form without coupling scene objects to game state.
  const position=(id)=>{const p=plots.find?.(p=>p.id===id)||plots[id];return {x:p.x,z:p.z};};
  function select(id) {
    if(!Number.isInteger(id)||id<0||id>7)return;
    selected=id;const p=position(id);border.position.set(p.x,0,p.z);ui.selectPlot(id);
  }
  const ui=mountGardenUI({onAction:act,onControl:control,onSelectPlot:select,onClose:()=>setOpen(false),onHomeAction});
  select(0);
  function connection(text='') {noticeText.textContent=text;notice.hidden=!opened||!text;}
  async function request(path,body,signal) {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
    try {
      const response=await roomRequest(api(path),{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:signal?AbortSignal.any([controller.signal,signal]):controller.signal});
      const data=await response.json();
      if(!data || (!response.ok && !data.garden))throw new Error(data?.message||data?.error||'菜园暂时未连接，请稍后重试。');
      return data;
    } finally {clearTimeout(timeout);}
  }
  function accept(next) {
    if(!next||!Array.isArray(next.plots))throw new Error('菜园数据不完整。');
    view=next;ui.setView(view);
    // update() caches crop geometry; soil colour still follows every watering.
    model.update(view);
    connection('');
  }
  function refreshDelay() {
    if(failures)return 5000;
    if(!window.chatpetRoomBridge?.onChanged)return 15000;
    // Native events cover accepted work, not the passage of crop time. Read
    // the authoritative projection while it can change; never grow it here.
    if((view?.plots||[]).some(plot=>plot.cropId&&plot.progress<1&&plot.moisture>0))return 15000;
  }
  function clearRefresh() {
    if(refreshTimer!==undefined){clearTimeout(refreshTimer);refreshTimer=undefined;}
  }
  function scheduleRefresh() {
    if(disposed||!visible||document.hidden){clearRefresh();return;}
    if(refreshPending){changed();return;}
    clearRefresh();
    if(readBusy||writeBusy)return;
    const delay=refreshDelay();
    if(delay!==undefined)refreshTimer=setTimeout(()=>{refreshTimer=undefined;void refresh();},delay);
  }
  async function refresh(force=false) {
    if(disposed||!visible||document.hidden)return;
    if(readBusy||writeBusy){refreshPending=true;return;}
    clearRefresh();refreshPending=false;
    readBusy=true;const ticket=revision,controller=new AbortController();readController=controller;
    try {const data=await request('/api/garden/state',undefined,controller.signal);if(ticket===revision&&visible&&!disposed&&!document.hidden){accept(data.garden);failures=0;}}
    catch(e){
      if(controller.signal.aborted||ticket!==revision||!visible||disposed||document.hidden)return;
      failures++;
      // 已有快照时优先保留菜园画面；连续失败才弹出连接提示，避免一次慢请求盖住整个面板。
      if (!view || failures >= 3) connection(e.name==='AbortError'?'菜园连接超时，已保存的进度会保留。':e.message);
    }
    finally{
      readBusy=false;if(readController===controller)readController=undefined;
      scheduleRefresh();
    }
  }
  function changed(){
    if(disposed||!visible||document.hidden)return;
    refreshPending=true;clearRefresh();
    refreshTimer=setTimeout(()=>{refreshTimer=undefined;void refresh();},0);
  }
  function setVisible(value){
    if(disposed||visible===Boolean(value))return;
    visible=Boolean(value);revision++;
    clearRefresh();
    if(!visible){readController?.abort();refreshPending=false;}
    else changed();
  }
  async function act(action) {
    if(writeBusy)return {ok:false,message:'上一项操作还在保存，请稍等。'};
    writeBusy=true;const ticket=++revision;
    try {
      const data=await request('/api/garden/act',action);
      const live=ticket===revision&&visible&&!disposed&&!document.hidden;
      if(data.garden&&live)accept(data.garden);
      if(data.ok && live && Number.isInteger(action.plotId)) {
        select(action.plotId);const p=position(action.plotId);particles.position.set(p.x,.2,p.z);
        effectKind=action.type;effectAt=performance.now();particles.material.color.set(action.type==='water'?0x83d7ef:action.type==='harvest'?0xffdc76:0x95c77e);particles.visible=true;
      }
      return data;
    }catch(e){if(ticket===revision&&visible&&!disposed&&!document.hidden)connection('操作结果暂未确认，请重新连接后查看菜园。');return {ok:false,message:'连接中断，操作结果尚未确认；请重试连接查看进度。'};}
    finally{writeBusy=false;scheduleRefresh();}
  }
  async function control(action) {
    if(writeBusy)return {ok:false,message:'上一项安排还在保存，请稍等。'};
    writeBusy=true;const ticket=++revision;
    try {
      const data=await request('/api/garden/control',action);if(data.garden&&ticket===revision&&visible&&!disposed&&!document.hidden)accept(data.garden);
      return data;
    } catch {
      if(ticket===revision&&visible&&!disposed&&!document.hidden)connection('安排结果暂未确认，请重新连接后查看。');
      return {ok:false,message:'连接中断，请重新连接确认小蓝鱼的安排。'};
    } finally {writeBusy=false;scheduleRefresh();}
  }
  function setOpen(value) {
    opened=!!value;ui.setOpen(opened);border.visible=opened;
    const chip=document.getElementById('gardenChip');
    if(chip){const label=opened?'返回小屋':'进入菜园';chip.textContent=(opened?'🏡 ':'🌱 ')+label;chip.setAttribute('aria-label',label);chip.setAttribute('aria-pressed',String(opened));chip.title=opened?'返回小蓝鱼的小屋':'进入屋后菜园';}
    if(opened){onOpen();connection(view?'':'正在读取菜园…');refresh(true);}else{connection('');onClose();}
  }
  function handlePointer(e) {
    if(!opened)return false;
    ndc.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(ndc,camera);
    const hit=ray.intersectObjects(model.pickables,true)[0];
    if(hit){const id=hit.object.userData.gardenPlot;if(Number.isInteger(id))select(id);return true;}
    return false;
  }
  function tick(now) {
    model.animateCharacter(now);
    if(opened)border.material.opacity=.76+Math.sin(now*.003)*.17;
    if(effectAt){const t=(now-effectAt)/1100;
      if(t>=1){effectAt=0;particles.visible=false;}
      else{for(let i=0;i<24;i++){const a=i*2.39996;const r=.15+(i%5)*.13;particleCoords[i*3]=Math.cos(a)*r;particleCoords[i*3+2]=Math.sin(a)*r*.65;particleCoords[i*3+1]=effectKind==='water'?1.1-t*.95+(i%3)*.1:Math.sin(t*Math.PI)*(.6+(i%3)*.13);}
        particleGeo.attributes.position.needsUpdate=true;particles.material.opacity=1-t;}
    }
  }
  return {get isOpen(){return opened;},setOpen,toggle:()=>setOpen(!opened),handlePointer,tick,refresh,changed,setVisible,selectPlot:select,updateCharacter:model.updateCharacter,
    inspect:()=>({open:opened,selected,view,meshes:model.group.children.length}),
    destroy(){setVisible(false);disposed=true;ui.destroy();notice.remove();model.dispose();world.scene.remove(border,particles);border.geometry.dispose();border.material.dispose();particleGeo.dispose();particles.material.dispose();}};
}
