import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,realpathSync,rmSync,readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {EmotionFile} from '../dist/src/emotion/state.js';

const limit=262144,at=123456789;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t,legacy=()=>undefined) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'fish-emotion-size-')));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'.chatpet'));
  const scope={path:root,companionId:'fish',scopeId:'owner',storageId:'bank'};
  const file=join(root,'.chatpet','data','emotion','state.json');
  const store=new EmotionFile(scope,legacy);
  return {root,scope,file,store};
}
const unique=(char,count=256,length=512)=>Array.from({length:count},(_,i)=>char.repeat(length-3)+String(i).padStart(3,'0'));
function edit(store,extra={}) {
  const current=store.load();
  return {expectedRevision:current.document.revision,expectedHash:current.contentHash,mood:'calm',...extra};
}
function assertPreserved(f,before,bytes) {
  assert.equal(hash(readFileSync(f.file)),hash(bytes),'Rejected input must not replace the readable canonical state');
  assert.deepEqual(f.store.load(),before,'Revision and content hash must remain usable');
  assert.deepEqual(readdirSync(join(f.root,'.chatpet','data','emotion')),['state.json'],'Rejected input leaves no temporary document');
  const small=f.store.update(edit(f.store,{mood:'still editable'}),at);
  assert.equal(small.state.mood,'still editable');
}

for(const [name,extra] of [
  ['multibyte feelings',{feelings:unique('情')}],
  ['combined independently valid lists',{feelings:unique('f'),memories:unique('m')}],
  ['dependency metadata',{dependencies:{sources:[{id:'源'.repeat(90000),revision:'1'}],memories:[]}}],
  ['JSON-escaped feelings',{feelings:unique('\n')}],
]) {
  test(`R6-03: oversized ${name} retains canonical bytes, revision/hash and editability`,t=>{
    const f=fixture(t);f.store.initialize();f.store.update(edit(f.store,{mood:'original'}),at);
    const before=f.store.load(),bytes=readFileSync(f.file);
    assert.throws(()=>f.store.update(edit(f.store,extra),at),/emotion/i);
    assertPreserved(f,before,bytes);
  });
}

test('R6-03: a large valid UTF-8 document remains readable across reopen and can be shortened',t=>{
  const f=fixture(t);f.store.initialize();
  const feelings=unique('情',150,400);
  const result=f.store.update(edit(f.store,{feelings,reason:'retained independent state'}),at);
  const bytes=readFileSync(f.file);assert.ok(bytes.length>150000 && bytes.length<limit);
  const reopened=new EmotionFile(f.scope,()=>{throw Error('Canonical state must not fall back to legacy');});
  assert.deepEqual(reopened.snapshot(reopened.load()),result);assert.deepEqual(result.state.feelings,feelings);
  assert.equal(reopened.update(edit(reopened,{feelings:['calm']}),at).state.feelings.length,1);
});

function exactSizeInput(f,bytes) {
  const current=f.store.load(),state={mood:'calm',reason:'',at,memories:[],dependencies:{sources:[{id:'x',revision:'1'}],memories:[]}};
  const document={...current.document,revision:current.document.revision+1,current:state};
  const initial=Buffer.byteLength(JSON.stringify(document,null,2)+'\n');
  state.dependencies.sources[0].id='x'.repeat(bytes-initial+1);
  assert.equal(Buffer.byteLength(JSON.stringify(document,null,2)+'\n'),bytes);
  return edit(f.store,{dependencies:state.dependencies});
}
test('R6-03: the existing exact byte limit is accepted, readable and durable',t=>{
  const f=fixture(t);f.store.initialize();
  const result=f.store.update(exactSizeInput(f,limit),at);
  assert.equal(readFileSync(f.file).length,limit);
  assert.deepEqual(new EmotionFile(f.scope,()=>undefined).snapshot(f.store.load()),result);
});
test('R6-03: one byte beyond the existing limit is rejected before replacing an exact-limit state',t=>{
  const f=fixture(t);f.store.initialize();f.store.update(exactSizeInput(f,limit),at);
  const before=f.store.load(),bytes=readFileSync(f.file);
  assert.throws(()=>f.store.update(exactSizeInput(f,limit+1),at),/emotion/i);
  assertPreserved(f,before,bytes);
});
test('R6-03: oversized legacy adoption preserves its source and creates no unreadable canonical replacement',t=>{
  const legacy={mood:'legacy feeling',reason:'retain this original',at,memories:[],feelings:unique('情')};
  const original=JSON.stringify(legacy),f=fixture(t,()=>legacy);
  assert.throws(()=>f.store.load(),/emotion/i);
  assert.equal(existsSync(f.file),false);
  assert.equal(JSON.stringify(legacy),original);
  assert.deepEqual(readdirSync(join(f.root,'.chatpet')),[],'Size rejection occurs before creating canonical paths');
});
