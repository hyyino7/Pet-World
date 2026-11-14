import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import ts from 'typescript';

// Exercise the generated upstream readers and their actual say dispatchers.
// Only clocks and display sinks are substituted; no runtime or app is started.
const native=readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/events.js','utf8');
const nativeShared=readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/shared-core.js','utf8');
const web=readFileSync('src/desktop/platform/client.js','utf8');
function declaration(source,name) {
  const tree=ts.createSourceFile('carrier.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  let found;
  function visit(node) {
    if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node.getText(tree);
    if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name)
      found='const '+name+' = '+node.initializer.getText(tree)+';';
    if(!found)ts.forEachChild(node,visit);
  }
  visit(tree);assert.ok(found,'Generated say boundary changed: '+name);return found;
}
function carrier(kind) {
  let now=1000;const displayed=[],voices=[];
  const scope=createContext({Date:{now:()=>now},sayRef:{current:{}},setSayTick(){},
    sprites:[{pet:{id:'main'},showWhisper:(text,image,url,duration,anim)=>displayed.push({text,image,url,duration,anim}),
      clearWhisper:()=>displayed.push({clear:true})}],S:{playSayVoice:said=>voices.push(said)}});
  runInContext(declaration(kind==='native'?nativeShared:web,'readSay')+'\nglobalThis.reader=readSay;',scope);
  if(kind==='native') {
    scope.S.readSay=scope.reader;
    runInContext(declaration(native,'applySayLeaf')+'\nglobalThis.deliver=leaf=>applySayLeaf("main",leaf);',scope);
  } else {
    runInContext(declaration(web,'applyPetLeaf')+'\nglobalThis.deliver=leaf=>applyPetLeaf("say","main",leaf);',scope);
  }
  return {at(value){now=value;},read:data=>scope.reader({counter:1000,data}),
    deliver:data=>scope.deliver({counter:1000,data}),
    shown:()=>kind==='native'?displayed.at(-1):scope.sayRef.current.main,
    count:()=>kind==='native'?displayed.length:scope.sayRef.current.main?.seq??0,
    voices};
}
const feedback={text:'Actual owner interaction',image:'可爱',duration:8000,expiresAt:9000,anim:false};

for(const kind of ['native','web']) {
  test(kind+': delayed feedback consumes only the remaining real episode window',()=>{
    const c=carrier(kind);c.at(4000);c.deliver(feedback);
    assert.equal(c.shown().text,feedback.text);assert.equal(c.shown().duration,5000);
    assert.equal(c.shown().image,feedback.image);assert.equal(c.shown().anim,false);
    c.at(8999);assert.equal(c.read(feedback).duration,1);
  });
  test(kind+': feedback received at or after its deadline cannot replace a newer chat',()=>{
    const c=carrier(kind);c.deliver({text:'Newer actual chat',duration:3000,anim:false});
    const count=c.count(),voices=c.voices.length;
    for(const at of [9000,12000]) {
      c.at(at);assert.equal(c.read(feedback),null);c.deliver(feedback);
      assert.equal(c.count(),count);assert.equal(c.shown().text,'Newer actual chat');
      assert.equal(c.voices.length,voices);
    }
  });
  test(kind+': a bounded feedback without valid duration cannot fall back to the ordinary longer default',()=>{
    const c=carrier(kind);c.at(8500);
    for(const duration of [undefined,NaN,Infinity,-1])
      assert.equal(c.read({...feedback,duration}).duration,500);
    assert.equal(c.read({...feedback,duration:200}).duration,200);
    assert.equal(c.read({...feedback,duration:0}).duration,0);
  });
  test(kind+': ordinary say and explicit clear retain upstream behavior',()=>{
    const c=carrier(kind);c.at(12000);
    assert.equal(c.read({text:'Ordinary chat'}).duration,undefined);
    assert.equal(c.read({text:'Ordinary chat',duration:7000}).duration,7000);
    assert.equal(c.read({text:'Ordinary chat',duration:0}).duration,0);
    for(const expiresAt of [undefined,NaN,Infinity,'9000'])
      assert.equal(c.read({text:'Ordinary chat',duration:7000,expiresAt}).duration,7000);
    const clear=c.read({clear:true,expiresAt:9000});assert.equal(clear.kind,'clear');
  });
}
