import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext,runInNewContext} from 'node:vm';
import ts from 'typescript';

const root='vendor/feiyu-room-template/public/room/';
const files=new Map(['actor.js','model-actor.js','actor3d.js','app.js'].map(name=>[name,ts.createSourceFile(name,readFileSync(root+name,'utf8'),ts.ScriptTarget.Latest,true)]));
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
class V2{constructor(x=0,y=0){this.x=x;this.y=y;}set(x,y){this.x=x;this.y=y;return this;}copy(v){return this.set(v.x,v.y);}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y);}lerp(v,k){this.x+=(v.x-this.x)*k;this.y+=(v.y-this.y)*k;return this;}}
class V3{constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}copy(v){return this.set(v.x,v.y,v.z);}setScalar(value){return this.set(value,value,value);}}
function method(file,actor,name){const source=files.get(file),cls=source.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text===actor);
  const found=cls?.members.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(source)===name);assert.ok(found,file+' '+actor+'.'+name);return {source,node:found};}
function actualMethod(file,actor,name,{motionOnly=false,context={}}={}){
  const {source,node}=method(file,actor,name);let statements=[...node.body.statements];
  if(motionOnly){const end=statements.findIndex(statement=>ts.isVariableStatement(statement)&&statement.declarationList.declarations.some(declaration=>declaration.name.getText(source)==='walking'));assert.ok(end>0,'actual 3D motion boundary changed');statements=statements.slice(0,end);}
  const asyncPrefix=node.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.AsyncKeyword)?'async ':'';
  return runInNewContext(`(${asyncPrefix}function(${node.parameters.map(parameter=>parameter.getText(source)).join(',')}){${statements.map(statement=>statement.getText(source)).join('\n')}})`,context);
}
function shadow(){return {position:new V3(),scale:new V3(),material:{opacity:1},visible:true};}
function actorState(){return {_pos:new V2(6.3,5.1),_target:new V2(6.3,5.1),_elev:0,_targetElev:0,_time:0,_t:0,t:0,ready:true,visible:true,
  group:{position:new V3(),rotation:{y:0},visible:true},layers:[],floorShadow:shadow(),surfaceShadow:shadow(),setFace(){}};}
const camera={position:new V3(8,4,9)};
const actors=[['sprite','actor.js','SpriteActor'],['model','model-actor.js','ModelActor'],['chibi','actor3d.js','ChibiActor']];
for(const [kind,file,name]of actors)for(const snap of [true,false])test(`R4: ${kind} ${snap?'snapshot aligns':'ordinary frame preserves smoothing'} position and furniture elevation`,()=>{
  const actor=actorState(),frame={pos:[6.3,3.2],elev:.62,walking:false,flip:false,snap};
  const before=JSON.stringify(frame),update=actualMethod(file,name,'update',{motionOnly:kind!=='sprite'});
  if(kind==='sprite')update.call(actor,.016,camera,frame);
  else {actualMethod(file,name,'setPose').call(actor,frame);update.call(actor,.016,camera,{mode:'overview',snap});}
  if(snap){assert.equal(actor._pos.x,6.3);assert.equal(actor._pos.y,3.2);assert.equal(actor._elev,.62);}
  else{assert.ok(actor._pos.y>3.2&&actor._pos.y<5.1);assert.ok(actor._elev>0&&actor._elev<.62);}
  assert.equal(JSON.stringify(frame),before,'presentation never mutates the Body snapshot');
});

function bootFixture({view='overview',kind='sprite'}={}){
  const her={pos:[6.3,3.2],elev:.62,room:'living',pose:'sit',kind:'rest',facing:90,asleep:false},before=JSON.stringify(her);
  const actor=actorState(),model=actorState(),chibi=actorState(),calls=[],timers=new Map();let sequence=0;
  const captured=(type,target,file,name)=>(dt,cam,frame)=>{calls.push({type,frame:{...frame}});actualMethod(file,name,'update',{motionOnly:type!=='sprite'}).call(target,dt,cam,frame);};
  actor.update=captured('sprite',actor,'actor.js','SpriteActor');actor.setVisible=value=>{actor.visible=value;};actor.prepareShotPoster=async()=>true;
  for(const [type,target,file,name]of [['model',model,'model-actor.js','ModelActor'],['chibi',chibi,'actor3d.js','ChibiActor']]){
    target.update=captured(type,target,file,name);target.setVisible=value=>{target.group.visible=value;};target.setPose=actualMethod(file,name,'setPose');
  }
  const camera={position:new V3(),lookAt(){},updateProjectionMatrix(){}};
  const context=createContext({HIDE_HUD:false,SHOT:true,VIEW:{target:new V3()},world:{setLabelsVisible(){},setCeilingVisible(){},updateEnvironment(){},updateCutaway(){}},
    poll:async()=>{},state:{her,env:{lamp:true}},INITIAL_ROOM:'living',params:{get:key=>key==='char'?(kind==='sprite'?'webm':'3d'):null},
    charMode:kind==='sprite'?'webm':'3d',actor,model3d:kind==='model'?model:null,chibi:kind==='chibi'?chibi:null,
    modelReady:kind==='model',chibiReady:kind==='chibi',ensure3d:async()=>true,applyCharVisibility(){},clipFor:()=> 'idle',
    SHOT_VIEW:view,SHOT_LOOK:'forward',camera,camPos:new V3(),camLook:new V3(),ROOM_CAM:{living:{center:[6.3,5.1],az:.2,elev:.5,r:5}},
    renderer:{shadowMap:{},render:()=>calls.push({type:'render'})},scene:{},THREE:{Vector3:V3},
    document:{title:'pending',body:{classList:{add(){}}}},$:()=>({classList:{add(){}}}),
    setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),applyModelExpression(){},
    performance:{now:()=>0}});
  const source=files.get('app.js'),node=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='boot');assert.ok(node);
  runInContext(node.getText(source),context);
  return {context,actor,model,chibi,calls,timers,camera,her,before};
}

for(const view of ['overview','free'])test(`R4: actual ${view} photograph boot snaps the sprite before its one rendered frame`,async()=>{
  const f=bootFixture({view});await f.context.boot();
  const update=f.calls.find(call=>call.type==='sprite');assert.equal(update.frame.snap,true);assert.equal(f.actor._pos.y,f.her.pos[1]);assert.equal(f.actor._elev,f.her.elev);
  assert.equal(f.calls.filter(call=>call.type==='render').length,1);assert.equal(JSON.stringify(f.her),f.before);
  const ready=[...f.timers.values()].find(timer=>timer.ms===350);assert.ok(ready);ready.fn();assert.equal(f.context.document.title,'HOME_READY');
});
for(const kind of ['model','chibi'])test(`R4: actual 3D ${kind} photograph boot snaps the same Body coordinates`,async()=>{
  const f=bootFixture({kind});await f.context.boot();const update=f.calls.find(call=>call.type===kind);assert.equal(update.frame.snap,true);
  assert.equal(f[kind]._pos.y,f.her.pos[1]);assert.equal(f[kind]._elev,f.her.elev);assert.equal(JSON.stringify(f.her),f.before);
});
test('R4: first-person photograph keeps self hidden and reads exact Body coordinates directly',async()=>{
  const f=bootFixture({view:'eyes'});await f.context.boot();assert.equal(f.actor.visible,false);assert.equal(f.calls.some(call=>call.type==='sprite'),false);
  assert.equal(f.camera.position.x,f.her.pos[0]+.08);assert.equal(f.camera.position.z,f.her.pos[1]);assert.equal(f.camera.position.y,1.22+f.her.elev);assert.equal(JSON.stringify(f.her),f.before);
});

function shotFixture({seek='manual',posterFails=false}={}){
  const timers=new Map(),listeners=new Set();let sequence=0,seeks=0,currentTime=0;
  const video={pause(){},addEventListener:(name,fn)=>{assert.equal(name,'seeked');listeners.add(fn);},removeEventListener:(name,fn)=>listeners.delete(fn)};
  Object.defineProperty(video,'currentTime',{get:()=>currentTime,set:value=>{seeks++;if(seek==='throws')throw Error('fixture seek rejected');currentTime=value;if(seek==='sync')for(const callback of [...listeners])callback();}});
  const layer={load:async()=>{},video,material:{},mesh:{}};
  const context={CLIPS:{idle:'fixture idle'},POSTER:{idle:'fixture poster'},THREE:{TextureLoader:class{async loadAsync(){if(posterFails)throw Error('fixture poster unavailable');return {dispose(){}};}}},
    setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
  const actor={layers:[layer],active:0};actor.prepareShot=actualMethod('actor.js','SpriteActor','prepareShot',{context});actor.prepareShotPoster=actualMethod('actor.js','SpriteActor','prepareShotPoster',{context});
  return {actor,video,layer,timers,listeners,seekCount:()=>seeks,emit:()=>{for(const callback of [...listeners])callback();},tick:()=>{for(const [id,timer]of [...timers]){timers.delete(id);timer.fn();}}};
}

test('R4: a seeked frame settles once and removes both timeout and listener',async()=>{
  const f=shotFixture();let settled=0;const pending=f.actor.prepareShot('idle',2.4).then(()=>{settled++;});await settle();
  assert.doesNotThrow(()=>f.emit());await pending;assert.equal(settled,1);assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);
  f.emit();f.tick();await settle();assert.equal(settled,1);assert.equal(f.actor.current,'idle');assert.equal(f.layer.material.opacity,1);
});
test('R4: frame timeout settles once and removes the late seek listener',async()=>{
  const f=shotFixture();const pending=f.actor.prepareShot('idle');await settle();assert.equal([...f.timers.values()][0].ms,1200);
  assert.doesNotThrow(()=>f.tick());await pending;assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);f.emit();
});
test('R4: missing PNG falls back to the original video frame and finishes without invalid diagnostics',async()=>{
  const f=shotFixture({posterFails:true});const pending=f.actor.prepareShotPoster('idle');await settle();assert.equal(f.seekCount(),1);
  assert.doesNotThrow(()=>f.emit());assert.equal(await pending,true);assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);
});
for(const seek of ['sync','throws'])test(`R4: ${seek} seek cannot strand the photo promise or its cleanup`,async()=>{
  const f=shotFixture({seek}),pending=f.actor.prepareShot('idle');await settle();
  await Promise.race([pending,new Promise((_,reject)=>setImmediate(()=>reject(Error('photo did not settle after seek'))))]);
  assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);
});
