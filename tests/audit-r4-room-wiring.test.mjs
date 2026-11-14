import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import ts from 'typescript';
import {CROPS,GARDEN_RULES,createGarden} from '#feiyu-garden';

const room='vendor/feiyu-room-template/public/room/';
const app=readFileSync(room+'app.js','utf8');
const parsed=ts.createSourceFile('app.js',app,ts.ScriptTarget.Latest,true);
function actualFunction(name){const node=parsed.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.ok(node,name);return node.getText(parsed);}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

class Element {
  children=[];attributes=new Map();listeners=new Map();registrationCounts=new Map();dataset={};style={};className='';textContent='';hidden=false;
  constructor(tag='div'){this.tag=tag;const names=new Set();this.classList={toggle:(name,on)=>{const next=on??!names.has(name);next?names.add(name):names.delete(name);return next;},add:name=>names.add(name),remove:name=>names.delete(name)};}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  setAttribute(name,value){this.attributes.set(name,value);}
  addEventListener(name,listener){this.registrationCounts.set(name,(this.registrationCounts.get(name)??0)+1);if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(listener);}
  removeEventListener(name,listener){this.listeners.get(name)?.delete(listener);}
  async click(){for(const listener of [...(this.listeners.get('click')??[])])await listener({});}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  querySelector(selector){return this.all().find(node=>selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):node.tag===selector);}
}
function evaluateModule(file,modules,context){
  const code=ts.transpileModule(readFileSync(room+file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  context.exports={};context.require=name=>{assert.ok(modules[name],name);return modules[name];};runInContext(code,context);return context.exports;
}

function gardenFixture(){
  const body=new Element('body'),requests=[],timers=new Map();let sequence=0;
  const garden=createGarden(Date.now()),roomRequest=async(url,options)=>{requests.push({url,method:options.method,payload:options.body?JSON.parse(options.body):undefined});
    return {ok:true,json:async()=>url.endsWith('/api/home/act')?{ok:true,home:{her:{}}}:{ok:true,garden}};};
  const document={body,hidden:false,createElement:tag=>new Element(tag),getElementById:()=>null};
  const context=createContext({document,window:{prompt:()=> '  a real owner message  ',chatpetRoomBridge:{onChanged:()=>{}}},
    AbortController,AbortSignal,performance:{now:()=>0},setTimeout:(fn)=>{const id=++sequence;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
    setInterval:()=>0,clearInterval:()=>{},roomRequest,withToken:path=>'/owner'+path,pendingAction:'',state:{env:{lamp:true}},
    applyState:()=>{},poll:async()=>{},toast:()=>{},setBubble:()=>{}});
  runInContext(actualFunction('act')+'\n'+actualFunction('gardenHomeAction'),context);
  const {mountGardenUI}=evaluateModule('garden-ui.js',{'./garden-state.js':{CROPS,GARDEN_RULES}},context);
  class Geometry{attributes={};setFromPoints(){return this;}setAttribute(name,value){this.attributes[name]=value;return this;}dispose(){}}
  class Material{constructor(options){Object.assign(this,options);this.color={set(){}};}dispose(){}}
  class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material;this.position={set(){}};}}
  const three={Raycaster:class{},Vector2:class{},Vector3:class{},LineLoop:Mesh,BufferGeometry:Geometry,LineBasicMaterial:Material,BufferAttribute:class{},Points:Mesh,PointsMaterial:Material};
  const model={group:{children:[]},pickables:[],update(){},updateCharacter(){},animateCharacter(){},dispose(){}};
  const {createGardenClient}=evaluateModule('garden-client.js',{'./native-room.js':{roomRequest},'./vendor/three.module.js':three,
    './garden-world.js':{createGardenWorld:()=>model,GARDEN_PLOTS:Array.from({length:8},(_,id)=>({id,x:id,z:0}))},'./garden-ui.js':{mountGardenUI}},context);
  const client=createGardenClient({world:{scene:{add(){},remove(){}}},renderer:{},camera:{},api:path=>'/owner'+path,
    onOpen(){},onClose(){},onHomeAction:context.gardenHomeAction});
  client.setVisible(true);client.setOpen(true);
  return {client,context,requests,buttons:()=>body.all().filter(node=>node.className==='garden-social-button'),close:()=>{client.destroy();assert.equal(timers.size,0);}};
}

for(const [action,label,extra] of [['pet','摸摸头',{}],['feed','喂小鱼干',{}],['water','倒杯水',{}],['play','陪她玩',{}],['talk','留句话',{text:'a real owner message'}],['wake','叫醒',{}],['lamp','灯',{on:false}]]) {
  test(`R4: garden ${action} button dispatches through the actual owner home-action callback`,async()=>{
    const f=gardenFixture();
    try {await settle();assert.equal(f.buttons().length,7);await f.buttons().find(button=>button.textContent===label).click();await settle();
      assert.deepEqual(f.requests.filter(row=>row.url.endsWith('/api/home/act')),[{url:'/owner/api/home/act',method:'POST',payload:{action,...extra}}]);
    }finally{f.close();}
  });
}

test('R4: cancelling a garden message prompt does not dispatch an empty owner interaction',async()=>{
  const f=gardenFixture();try {await settle();f.context.window.prompt=()=>null;await f.buttons().find(button=>button.textContent==='留句话').click();await settle();
    assert.equal(f.requests.filter(row=>row.url.endsWith('/api/home/act')).length,0);
  }finally{f.close();}
});

function qualityFixture(){
  const quality=new Element('button'),qualityState=new Element('span'),modeButtons=['webm','3d'].map(mode=>Object.assign(new Element('button'),{dataset:{mode}}));
  const requests=[],values=new Map();
  const context=createContext({modelQuality:'optimized',modelReady:false,modelSwitching:null,modelLoading:null,charMode:'webm',chibiReady:false,
    VIEW:{follow:false,mode:'overview'},document:{querySelectorAll:selector=>selector==='#modeChip button'?modeButtons:[]},
    $:id=>id==='modelQualityChip'?quality:id==='modelQualityState'?qualityState:null,
    localStorage:{setItem:(key,value)=>values.set(key,value)},ensureModel3d:async value=>{requests.push(value);context.modelQuality=value;context.modelReady=true;return true;},
    ensure3d:async()=>true,toast:()=>{},focusCharacter:()=>{},resetView:()=>{},applySpriteViewPref:()=>{},applyBubblePref:()=>{},applyCharVisibility:()=>{},syncCharacter:()=>{},setMode:()=>{}});
  const from=app.indexOf("document.querySelectorAll('#modeChip button').forEach((b) => {"),to=app.indexOf('applyClickMovePref();',from);
  assert.ok(from>=0&&to>from,'actual startup wiring section changed');
  runInContext(actualFunction('updateModelQualityChip')+'\n'+actualFunction('switchModelQuality')+'\n'+app.slice(from,to),context);
  return {quality,qualityState,modeButtons,requests,context};
}

test('R4: model quality responds immediately before any character-mode switch',async()=>{
  const f=qualityFixture();assert.equal(f.quality.listeners.get('click')?.size,1);
  await f.quality.click();assert.deepEqual(f.requests,['source']);assert.equal(f.qualityState.textContent,'高画质');assert.equal(f.quality.attributes.get('aria-pressed'),'true');
});

test('R4: mode changes do not register the quality listener again or duplicate one quality selection',async()=>{
  const f=qualityFixture();
  for(let i=0;i<8;i++)await f.modeButtons[i%2].click();
  // Native EventTarget deduplicates the same callback; separately verify that
  // startup wiring is attempted only once, rather than asserting a false claim
  // that repeated registration necessarily duplicates browser invocation.
  assert.equal(f.quality.registrationCounts.get('click'),1);assert.equal(f.quality.listeners.get('click')?.size,1);
  await f.quality.click();assert.deepEqual(f.requests,['source']);
});
