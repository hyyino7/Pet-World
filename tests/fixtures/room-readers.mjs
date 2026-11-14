import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {adaptRoomRefresh} from '../../dist/src/room/assets.js';

// Execute the shipped read/notification functions; only transport, timers and DOM are fake.
export function roomReaders(home,gardenRead) {
  const app=adaptRoomRefresh(readFileSync('vendor/feiyu-room-template/public/room/app.js','utf8'));
  const garden=readFileSync('vendor/feiyu-room-template/public/room/garden-client.js','utf8');
  const slice=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
  const tasks=new Map();let id=0,visible=true;
  const clock={setTimeout(fn){const key=++id;tasks.set(key,fn);return key;},clearTimeout(key){tasks.delete(key);}};
  const doc={hidden:false};let mainReads=0,gardenReads=0;
  const g=vm.createContext({...clock,document:doc,window:{chatpetRoomBridge:{onChanged(){}}},visible:true,AbortController,
    request:async()=>{gardenReads++;return gardenRead();},accept(value){g.view=value;},connection(){}});
  vm.runInContext('let disposed=false,view={plots:[]},failures=0,refreshTimer,refreshPending=false,readBusy=false,writeBusy=false,revision=0,readController,expectedVersion=null,appliedVersion=null,refreshForced=false;'+slice(garden,'  function refreshDelay()','  function setVisible('),g);
  const c=vm.createContext({...clock,document:doc,window:{chatpetRoomBridge:{onChanged(){}}},performance:{now:()=>Date.now()},console,
    displayAllowed:()=>visible,withToken:x=>x,roomRequest:async()=>{mainReads++;const data=await home();return{ok:true,json:async()=>data};},
    gardenController:{changed:change=>g.changed(change),setVisible(){}},actor:{setSuspended(){}},mediaGate:null,presentationLoop:null,
    $:()=>({classList:{add(){}},textContent:''})});
  vm.runInContext(`let requestInFlight=false,companionRefreshPending=false,companionExplicitRefreshPending=false,companionExpectedVersion=null,companionAppliedVersion=null;
    let presentationReady=true,presentationGeneration=0,presentationNeedsSnapshot=false,viewRefreshTimer,viewRefreshAt,prevT=0;
    const SHOT=true;let state={},visitRegistered=true;
    ${slice(app,'function refreshCompanionRoom(change)','\n}').concat('\n}')}
    function applyState(data){if(companionExpectedVersion&&(data.behavior.bootId!==companionExpectedVersion.bootId||data.behavior.revision<companionExpectedVersion.revision))return false;companionAppliedVersion=data.behavior;}
    ${slice(app,'async function poll()','// Native changes are the normal refresh path.')}
    ${slice(app,'function requestViewRefresh(delay','\nfunction synchronizePresentation()')}`,c);
  return {
    start:()=>Promise.all([c.poll(),g.refresh(true)]),changed:change=>c.refreshCompanionRoom(change),
    visibility(value){visible=value;doc.hidden=!value;g.visible=value;},
    get counts(){return{main:mainReads,garden:gardenReads};},
    async drain(){for(let i=0;i<40;i++){for(let j=0;j<12;j++)await Promise.resolve();if(!tasks.size)return;const [key,fn]=tasks.entries().next().value;tasks.delete(key);fn();}throw Error('Read notifications did not converge');},
  };
}
