import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {resolve as resolvePath} from 'node:path';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
for(const [label,file] of [['desktop','vendor/dsh-pet/platform/runtime/electron-helper/shared-core.js'],['web','src/desktop/platform/client.js']]) {
  const readCarrier=()=>readFileSync(process.env.CHATPET_PET_SOURCE_ROOT?resolvePath(process.env.CHATPET_PET_SOURCE_ROOT,file):new URL('../../'+file,import.meta.url),'utf8');
  function fixture(deferRecognition=false) {
    const source=readCarrier(),from=source.indexOf('function createHearControl(opts) {'),to=source.indexOf('\n//#endregion',from);
    assert.ok(from>=0&&to>from);
    let resolve,reject,cancelled=0,intervals=0,transcribes=0,finish,providerSignal,finishRecognition;
    const input={isConnected:true,value:'',selectionStart:0,selectionEnd:0,focus(){},blur(){},setSelectionRange(){}};
    const events=new Map(),mic={dataset:{},addEventListener:(name,fn)=>events.set(name,fn)};
    const context={AbortController,document:{activeElement:null},window:{setInterval(){intervals++;return 1;},clearInterval(){intervals=0;}},canRecord:()=>true,
      startRecording:()=>new Promise((ok,no)=>{resolve=ok;reject=no;}),hearAudio:async(_url,_audio,signal)=>{transcribes++;providerSignal=signal;return deferRecognition?new Promise(ok=>{finishRecognition=ok;}):{ok:true,text:'heard'};},toBase64:()=>'',MIN_RECORD_MS:100,MAX_RECORD_MS:24000,SILENCE_PEAK:.1};
    const factory=vm.runInNewContext(source.slice(from,to)+'\ncreateHearControl',context);
    const control=factory({micBtn:mic,input,hint:{show(){},hide(){},flash(){}},resizeInput(){},hearUrl:'fixture://local'});
    const recorder={elapsedMs:()=>500,cancel(){cancelled++;},stop:()=>new Promise(ok=>{finish=ok;})};
    return {control,input,events,grant:()=>resolve(recorder),reject:()=>reject(Error('permission denied')),finish:()=>finish({peak:1,wave:new ArrayBuffer(0)}),providerSignal:()=>providerSignal,finishRecognition:()=>finishRecognition({ok:true,text:'late'}),stats:()=>({cancelled,intervals,transcribes})};
  }
  test(`${label}: disposal cancels a late microphone grant before any timer or provider`,async()=>{
    const f=fixture();f.control.start();f.control.dispose();f.input.isConnected=false;f.grant();await flush();
    assert.equal(f.control.isHearing(),false);assert.deepEqual(f.stats(),{cancelled:1,intervals:0,transcribes:0});
    f.control.start();assert.equal(f.control.isHearing(),false);
  });
  test(`${label}: late rejected permission after disposal has no unhandled failure`,async()=>{
    const f=fixture();f.control.start();f.control.dispose();f.reject();await flush();assert.equal(f.control.isHearing(),false);assert.equal(f.stats().intervals,0);
  });
  test(`${label}: disposal stops an active recorder exactly once`,async()=>{
    const f=fixture();f.control.start();f.grant();await flush();assert.equal(f.control.isHearing(),true);f.control.dispose();f.control.dispose();
    assert.deepEqual(f.stats(),{cancelled:1,intervals:0,transcribes:0});
  });
  test(`${label}: disposal during stop never admits late audio for transcription`,async()=>{
    const f=fixture();f.control.start();f.grant();await flush();f.control.stop();f.control.dispose();f.finish();await flush();assert.equal(f.stats().transcribes,0);assert.equal(f.input.value,'');
  });
  test(`${label}: release during startup still completes the original recording once`,async()=>{
    const f=fixture();f.control.start();f.events.get('pointerup')();f.grant();await flush();f.finish();await flush();assert.equal(f.stats().transcribes,1);assert.equal(f.input.value,'heard');f.control.dispose();
  });
  test(`${label}: disposal aborts the upstream recognition request and rejects its late result`,async()=>{
    const f=fixture(true);f.control.start();f.grant();await flush();f.control.stop();f.finish();await flush();
    assert.equal(f.providerSignal()?.aborted,false);f.control.dispose();assert.equal(f.providerSignal().aborted,true);
    f.finishRecognition();await flush();assert.equal(f.input.value,'');
  });
  function recorderFixture(fault,cleanupFault=false) {
    const source=readCarrier(),from=source.search(/async function startRecording\([^)]*\) \{/),to=source.indexOf('\n//#endregion',from);
    assert.ok(from>=0&&to>from);
    const expected=Error('fixture '+fault);let stopped=0,closed=0,disconnects=0,constructed=0;
    const fail=where=>{if(fault===where)throw expected;};
    const track=()=>({stop(){stopped++;if(cleanupFault&&stopped===1)throw Error('track shutdown fault');}});
    const stream={getTracks:()=>tracks},tracks=[track(),track()];
    const node=name=>({connect(){fail(name+'-connect');},disconnect(){disconnects++;if(cleanupFault)throw Error('disconnect fault');}});
    class AudioContext {
      constructor(){constructed++;fail('construct');}
      createMediaStreamSource(){fail('source');return node('source');}
      createScriptProcessor(){fail('processor');return node('processor');}
      async resume(){fail('resume');}
      close(){closed++;return cleanupFault?Promise.reject(Error('context close fault')):Promise.resolve();}
    }
    const fn=vm.runInNewContext(source.slice(from,to)+'\nstartRecording',{navigator:{mediaDevices:{getUserMedia:async()=>{fail('permission');return stream;}}},AudioContext,
      HEAR_SAMPLE_RATE:24000,MAX_RECORD_MS:24000,BLOCK_SAMPLES:4096,TAIL_SETTLE_MS:0,setTimeout});
    return {start:fn,expected,stats:()=>({stopped,closed,disconnects,constructed})};
  }
  for(const fault of ['construct','source','processor','source-connect','processor-connect','resume'])test(`${label}: recorder ${fault} failure releases granted microphone resources`,async()=>{
    const f=recorderFixture(fault);await assert.rejects(f.start(),error=>error===f.expected);
    assert.equal(f.stats().stopped,2,'Every granted track must stop on setup failure');assert.equal(f.stats().closed,fault==='construct'?0:1);
  });
  test(`${label}: recorder cleanup faults retain original rejection and release the remaining resources`,async()=>{
    const f=recorderFixture('resume',true);await assert.rejects(f.start(),error=>error===f.expected);await flush();
    assert.equal(f.stats().stopped,2);assert.equal(f.stats().closed,1);assert.equal(f.stats().disconnects,2);
  });
  test(`${label}: permission denial has no audio graph and successful cancel is idempotent`,async()=>{
    const denied=recorderFixture('permission');await assert.rejects(denied.start(),error=>error===denied.expected);assert.equal(denied.stats().constructed,0);assert.equal(denied.stats().stopped,0);
    const ok=recorderFixture('none'),recorder=await ok.start();recorder.cancel();recorder.cancel();assert.equal(ok.stats().stopped,2);assert.equal(ok.stats().closed,1);
  });
  function composedFixture() {
    const source=readCarrier(),from=source.search(/async function startRecording\([^)]*\) \{/),hear=source.indexOf('function createHearControl(opts) {',from),to=source.indexOf('\n//#endregion',hear);
    assert.ok(from>=0&&hear>from&&to>hear);
    let grant,resume,tracksStopped=0,contexts=0,closed=0,intervals=0,providerCalls=0;
    const tracks=[{stop(){tracksStopped++;}},{stop(){tracksStopped++;}}],stream={getTracks:()=>tracks};
    const node=()=>({connect(){},disconnect(){}});
    class AudioContext {
      constructor(){contexts++;}createMediaStreamSource(){return node();}createScriptProcessor(){return node();}
      resume(){return new Promise(ok=>{resume=ok;});}close(){closed++;return Promise.resolve();}
    }
    const input={isConnected:true,value:'',focus(){},blur(){},setSelectionRange(){}},mic={dataset:{},addEventListener(){}};
    const context={AbortController,AudioContext,navigator:{mediaDevices:{getUserMedia:()=>new Promise(ok=>{grant=ok;})}},document:{activeElement:null},window:{setInterval(){intervals++;return 1;},clearInterval(){intervals=0;}},
      canRecord:()=>true,hearAudio:async()=>{providerCalls++;return {ok:true,text:'must not happen'};},toBase64:()=>'',HEAR_SAMPLE_RATE:24000,BLOCK_SAMPLES:4096,TAIL_SETTLE_MS:0,MIN_RECORD_MS:100,MAX_RECORD_MS:24000,SILENCE_PEAK:.1,setTimeout};
    const factory=vm.runInNewContext(source.slice(from,to)+'\ncreateHearControl',context);
    const control=factory({micBtn:mic,input,hint:{show(){},hide(){},flash(){}},resizeInput(){},hearUrl:'fixture://local'});
    return {control,input,grant:()=>grant(stream),resume:()=>resume(),stats:()=>({tracksStopped,contexts,closed,intervals,providerCalls})};
  }
  test(`${label}: actual control and recorder cancel a late media grant before constructing audio`,async()=>{
    const f=composedFixture();f.control.start();f.control.dispose();f.input.isConnected=false;f.grant();await flush();
    assert.deepEqual(f.stats(),{tracksStopped:2,contexts:0,closed:0,intervals:0,providerCalls:0});assert.equal(f.control.isHearing(),false);
  });
  test(`${label}: actual control disposal immediately stops tracks while audio resume is pending`,async()=>{
    const f=composedFixture();f.control.start();f.grant();await flush();assert.equal(f.stats().contexts,1);assert.equal(f.stats().tracksStopped,0);
    f.control.dispose();assert.equal(f.stats().tracksStopped,2,'No wait for the pending resume promise');assert.equal(f.stats().closed,1);
    f.resume();await flush();assert.equal(f.control.isHearing(),false);assert.deepEqual(f.stats(),{tracksStopped:2,contexts:1,closed:1,intervals:0,providerCalls:0});
  });
}
