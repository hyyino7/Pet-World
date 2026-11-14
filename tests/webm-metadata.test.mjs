// Source-only EBML boundary tests; this reader is not shipped at runtime.
import test from 'node:test';
import assert from 'node:assert/strict';
import {webmDurationMs} from '../scripts/lib/webm-metadata.mjs';

const bytes=hex=>Buffer.from(hex,'hex');
function size(value,width=1) {
  let encoded=(1n<<BigInt(width*7))+BigInt(value);
  const result=Buffer.alloc(width);
  for(let i=width-1;i>=0;i--){result[i]=Number(encoded&255n);encoded>>=8n;}
  return result;
}
const unknown=width=>size((1n<<BigInt(width*7))-1n,width);
const element=(id,payload=Buffer.alloc(0),length=size(payload.length))=>Buffer.concat([bytes(id),length,payload]);
const float=(value,width=8)=>{const out=Buffer.alloc(width);width===4?out.writeFloatBE(value):out.writeDoubleBE(value);return out;};
const duration=(value=4917,width=8)=>element('4489',float(value,width));
const info=(...children)=>element('1549a966',Buffer.concat(children));
const segment=(...children)=>element('18538067',Buffer.concat(children),size(Buffer.concat(children).length,4));
const header=element('1a45dfa3');
const webm=(...children)=>Buffer.concat([header,segment(...children)]);
const scale=value=>element('2ad7b1',Buffer.from(value));

for(const width of [4,8])test('WebM metadata reads a '+width+'-byte big-endian Duration with default TimestampScale',()=>{
  assert.equal(webmDurationMs(webm(info(duration(4917,width)))),4917);
});
test('WebM metadata applies the scale after Duration and retains fractional milliseconds',()=>{
  assert.equal(webmDurationMs(webm(info(duration(10.25),scale([0x0f,0x42,0x40])))),10.25);
  assert.equal(webmDurationMs(webm(info(duration(10250),scale([0x03,0xe8])))),10.25);
});
test('WebM metadata accepts all unsigned TimestampScale widths and an empty schema default',()=>{
  for(let width=1;width<=8;width++){
    const value=Buffer.alloc(width);value[width-1]=1;
    assert.equal(webmDurationMs(webm(info(element('2ad7b1',value),duration(1_000_000)))),1);
  }
  assert.equal(webmDurationMs(webm(info(scale([]),duration()))),4917);
});
for(let width=1;width<=8;width++)test('WebM metadata bounds an unknown-size Segment with a '+width+'-byte size to the file',()=>{
  assert.equal(webmDurationMs(Buffer.concat([header,element('18538067',info(duration()),unknown(width))])),4917);
});
test('WebM metadata accepts known size VINTs in every supported width',()=>{
  for(let width=1;width<=8;width++){
    const metadata=info(duration());
    assert.equal(webmDurationMs(Buffer.concat([header,element('18538067',metadata,size(metadata.length,width))])),4917);
  }
});
test('WebM metadata skips opaque payloads and finds only a direct Segment Info',()=>{
  const falseInfo=info(duration(99999));
  const opaque=element('1f43b675',Buffer.concat([bytes('a380'),falseInfo,bytes('000000')]));
  assert.equal(webmDurationMs(webm(element('ec',falseInfo),opaque,info(duration()))),4917);
  assert.equal(webmDurationMs(webm(info(element('7ba9',falseInfo),duration()))),4917);
  assert.throws(()=>webmDurationMs(webm(opaque,element('ec',falseInfo))),/missing Info\/Duration/);
  assert.throws(()=>webmDurationMs(Buffer.concat([element('1a45dfa3',falseInfo),segment(opaque)])),/missing Info\/Duration/);
});
test('WebM metadata validates later container boundaries without reading Cluster payloads',()=>{
  assert.throws(()=>webmDurationMs(webm(info(duration()),element('1f43b675',bytes('00'),size(2)))),/exceeds container/);
});
test('WebM metadata accepts zero-length skipped elements and advances past them',()=>{
  assert.equal(webmDurationMs(Buffer.concat([header,element('ec'),segment(element('ec'),info(duration()),element('ec'))])),4917);
});

const malformed=[
  ['empty file',Buffer.alloc(0),/truncated VINT/],
  ['missing EBML header',segment(info(duration())),/missing EBML header/],
  ['missing Segment',header,/missing Segment/],
  ['missing Info',webm(element('1f43b675')),/missing Info\/Duration/],
  ['missing Duration',webm(info(scale([1]))),/missing Duration/],
  ['root Info',Buffer.concat([header,info(duration()),segment()]),/unexpected root element/],
  ['duplicate Duration',webm(info(duration(),duration())),/duplicate Duration/],
  ['duplicate TimestampScale',webm(info(scale([1]),duration(),scale([1]))),/duplicate TimestampScale/],
  ['duplicate Info',webm(info(duration()),info(duration())),/duplicate Info/],
  ['multiple Segments',Buffer.concat([webm(info(duration())),segment(info(duration()))]),/multiple Segments/],
  ['zero Duration',webm(info(duration(0))),/positive and finite/],
  ['negative Duration',webm(info(duration(-1))),/positive and finite/],
  ['NaN Duration',webm(info(duration(NaN))),/positive and finite/],
  ['infinite Duration',webm(info(duration(Infinity))),/positive and finite/],
  ['empty Duration',webm(info(element('4489'))),/4- or 8-byte float/],
  ['wrong float length',webm(info(element('4489',bytes('000000')))),/4- or 8-byte float/],
  ['zero TimestampScale',webm(info(scale([0]),duration())),/invalid TimestampScale/],
  ['oversized TimestampScale',webm(info(scale(Array(9).fill(1)),duration())),/invalid TimestampScale length/],
  ['unsafe TimestampScale',webm(info(scale(Array(8).fill(255)),duration())),/invalid TimestampScale/],
  ['unsafe total duration',webm(info(duration(Number.MAX_VALUE))),/supported range/],
  ['zero ID VINT prefix',webm(bytes('0080')),/invalid ID VINT/],
  ['reserved zero ID',webm(bytes('8080')),/invalid element ID/],
  ['reserved all-ones ID',webm(bytes('ff80')),/invalid element ID/],
  ['nonminimal ID',webm(bytes('400180')),/invalid element ID/],
  ['five-byte ID',webm(bytes('080000000180')),/invalid ID VINT/],
  ['zero size VINT prefix',webm(bytes('ec00')),/invalid size VINT/],
  ['truncated ID',webm(bytes('15')),/truncated VINT/],
  ['truncated size',webm(bytes('ec40')),/truncated VINT/],
  ['truncated payload',webm(info(element('4489',float(1),size(9)))),/exceeds container/],
  ['huge declared size',webm(element('ec',Buffer.alloc(0),size(2n**54n,8))),/exceeds container/],
  ['unknown-size Info',webm(element('1549a966',duration(),unknown(8))),/unknown element size/],
  ['unknown-size Cluster',webm(info(duration()),element('1f43b675',bytes('00'),unknown(1))),/unknown element size/],
  ['unknown-size scalar',webm(info(element('4489',float(1),unknown(1)))),/unknown element size/],
  ['unknown-size EBML header',Buffer.concat([element('1a45dfa3',Buffer.alloc(0),unknown(1)),segment(info(duration()))]),/unknown element size/],
];
for(const [name,data,pattern] of malformed)test('WebM metadata rejects '+name,()=>{
  assert.throws(()=>webmDurationMs(data,'test.webm'),error=>pattern.test(error.message)&&error.message.includes('test.webm'));
});
test('WebM metadata rejects every truncated prefix of a valid finite-size container',()=>{
  const data=webm(info(duration()));
  for(let length=0;length<data.length;length++)assert.throws(()=>webmDurationMs(data.subarray(0,length)));
});
test('WebM metadata has a fixed element budget even for repeated empty elements',()=>{
  assert.throws(()=>webmDurationMs(webm(...Array.from({length:4096},()=>element('ec')),info(duration()))),/element limit exceeded/);
});
