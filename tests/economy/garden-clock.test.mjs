import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceGarden, createGarden} from '#feiyu-garden';
import {advanceGardenClock, parseGardenPauses} from '../../dist/src/living/economy/garden-clock.js';

test('分段只推进已提交时钟之后的启用时间，区间优先于旧开关',()=>{
  const start=10_000_000, hour=3_600_000;
  const garden=createGarden(start);
  Object.assign(garden.plots[0],{tilled:true,cropId:'radish',moisture:.8,plantedAt:start,
    cropProfile:{growMs:12*hour,waterDurationFactor:1.25}});
  const committed=advanceGarden(garden,start+hour);
  const now=start+5*hour;
  const pauses=[
    {from:start-hour,to:start},
    {from:start+hour/2,to:start+2*hour},
    {from:start+3*hour,to:null},
  ];
  const result=advanceGardenClock(committed,now,{enabled:false,pauses},advanceGarden);
  const expected=advanceGarden(garden,start+2*hour);
  assert.equal(result.plots[0].progress,expected.plots[0].progress);
  assert.equal(result.plots[0].moisture,expected.plots[0].moisture);
  assert.equal(result.updatedAt,now);
  assert.deepEqual(advanceGardenClock(result,start,{enabled:false,pauses},advanceGarden),result);
  assert.deepEqual(advanceGardenClock(committed,now,{enabled:false},advanceGarden),{...committed,updatedAt:now});
  assert.deepEqual(advanceGardenClock(committed,now,{enabled:false,pauses:[]},advanceGarden),advanceGarden(committed,now));
});

test('拒绝无法重建时钟的暂停记录',()=>{
  assert.equal(parseGardenPauses(undefined,false),undefined);
  assert.deepEqual(parseGardenPauses([],true),[]);
  assert.deepEqual(parseGardenPauses([{from:4,to:5},{from:5,to:null}],false),[{from:4,to:5},{from:5,to:null}]);
  for(const [pauses,enabled] of [
    [{},true], [[],false], [[{from:-1,to:4}],true], [[{from:5,to:4}],true],
    [[{from:4,to:7},{from:6,to:8}],true], [[{from:4,to:null},{from:6,to:8}],true],
    [[{from:4,to:null}],true], [[{from:4,to:6}],false],
  ]) assert.throws(()=>parseGardenPauses(pauses,enabled),/暂停区间无效/);
});
