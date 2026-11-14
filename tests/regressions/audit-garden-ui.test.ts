import test from 'node:test';
import assert from 'node:assert/strict';
import {createContext,runInContext} from 'node:vm';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {Context} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../../src/core/index.js';
import {roomAsset} from '../../src/room/assets.js';
import {CROPS,GARDEN_RULES,createGarden} from '#feiyu-garden';
import {emptyHomeState} from '#feiyu-home';
import {CompanionBehavior} from '../../src/behavior/plugin.js';

// Minimal DOM boundary: execute the entire served UI, including its real
// render and click handlers, without launching a window or renderer.
class Element {
  children:Element[]=[];attributes=new Map<string,string>();listeners=new Map<string,Function>();
  className='';textContent='';id='';dataset:Record<string,string>={};parent?:Element;
  classList={toggle:()=>{},add:()=>{},remove:()=>{}};
  constructor(readonly tag:string){}
  append(...items:Element[]){for(const item of items){item.parent=this;this.children.push(item);}}
  setAttribute(key:string,value:string){this.attributes.set(key,value);}
  addEventListener(name:string,listener:Function){this.listeners.set(name,listener);}
  removeEventListener(name:string){this.listeners.delete(name);}
  replaceChildren(...items:Element[]){this.children=[];this.append(...items);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
  querySelector(selector:string):Element|undefined {return this.children.flatMap(child=>[child,...child.all()]).find(child=>selector.startsWith('.')?child.className.split(' ').includes(selector.slice(1)):child.tag===selector);}
  all():Element[]{return this.children.flatMap(child=>[child,...child.all()]);}
}

test('F8: the served garden switch and all rendered help describe a saved preference, including on/off changes',async()=>{
  const response=await roomAsset(new Request('http://fixture/chatpet-room/garden-ui.js'));assert.equal(response.status,200);
  const body=new Element('body'),controls:unknown[]=[];
  const context=createContext({document:{body,createElement:(tag:string)=>new Element(tag)},window:{chatpetCompanionIdentity:{label:()=>'<Xiaoxi>',htmlLabel:()=>'&lt;Xiaoxi&gt;'}},
    DEFAULT_CROPS:CROPS,DEFAULT_RULES:GARDEN_RULES,setTimeout,clearTimeout});
  runInContext((await response.text()).replace(/^import .*?;\n/m,'').replace('export function mountGardenUI','function mountGardenUI')+'\nglobalThis.mount=mountGardenUI;',context);
  const garden=createGarden(Date.now()),view={...garden,care:{autoEnabled:false,queued:[],task:null},stats:{},plots:garden.plots};
  const ui=context.mount({onControl:async(input:any)=>{controls.push(JSON.parse(JSON.stringify(input)));view.care.autoEnabled=input.enabled;return {ok:true,garden:view};}});
  try {
    ui.setView(view);ui.setOpen(true);
    const toggle=body.querySelector('.garden-auto-toggle')!;
    assert.equal(toggle.textContent,'园艺偏好');assert.equal(toggle.attributes.get('aria-label'),'<Xiaoxi>的园艺偏好');
    for(const enabled of [true,false]) {
      await toggle.listeners.get('click')!();ui.setView(view);
      assert.equal(toggle.attributes.get('aria-checked'),String(enabled));
      const allText=body.all().map(node=>node.textContent).join('\n');
      assert.match(allText,/仅保存选择，不会自动播种、采收、出售或补给/);assert.match(allText,/关闭偏好不会取消已经接受的活动/);
      assert.doesNotMatch(allText,/自主照料中|自行安排种植|会走到菜园安排/);
    }
    assert.deepEqual(controls,[{type:'auto',enabled:true},{type:'auto',enabled:false}]);
  } finally {ui.destroy();}
});

test('F8: changing the preference creates no automatic task and does not cancel accepted requested work',async t=>{
  const root=mkdtempSync(join(tmpdir(),'garden-preference-audit-')),directory=join(root,'.chatpet/data/life');mkdirSync(directory,{recursive:true});
  const now=new Date(2026,10,13,12).getTime();t.mock.timers.enable({apis:['Date'],now});
  const home=emptyHomeState(now);home.lastInteractionAt=0;home.needs={hunger:.1,thirst:.1,bladder:.1,energy:.9,pain:0};
  const garden=createGarden(now);garden.care.autoEnabled=false;
  writeFileSync(join(directory,'home.json'),JSON.stringify(home));writeFileSync(join(directory,'garden.json'),JSON.stringify(garden));
  const host={workspace:{status:()=>({state:'ready',target:{id:'a',path:root}}),storageId:()=>'a',runtime:{config:{companionId:'fish',ownerActorId:'owner'},store:{meta:()=>undefined},identity:()=>({displayName:'Fixture'})}}} as unknown as PetCoreHost;
  const ctx={on:()=>()=>{},emit:()=>{},get:()=>undefined} as unknown as Context;
  const behavior=new CompanionBehavior(ctx,host);
  t.after(async()=>{await behavior.close();rmSync(root,{recursive:true,force:true});});
  let sequence=0;
  const control=(data:Record<string,unknown>)=>behavior.garden('a','control',{...data,requestId:'fixture-'+ ++sequence}) as Promise<any>;
  await control({type:'auto',enabled:true});t.mock.timers.tick(30_000);await behavior.garden('a','state');
  let saved=JSON.parse(readFileSync(join(directory,'garden.json'),'utf8'));assert.equal(saved.care.task,null);assert.deepEqual(saved.care.queue,[]);
  const accepted=await control({type:'visit'});assert.equal(accepted.accepted,true);
  const requestId=accepted.requestId;await control({type:'auto',enabled:false});
  saved=JSON.parse(readFileSync(join(directory,'garden.json'),'utf8'));
  const receipt=saved.care.receipts.find((entry:any)=>entry.requestId===requestId);
  assert.ok(receipt);assert.notEqual(receipt.status,'cancelled');
});
