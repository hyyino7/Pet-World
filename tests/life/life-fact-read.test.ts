import test from 'node:test';
import assert from 'node:assert/strict';
import {readFactReferences} from '../../src/living/plan/facts.js';
import type {CompanionFact,CompanionFactSource} from '../../src/contracts/interaction.js';

const fact=(id:string,domain:CompanionFact['domain']):CompanionFact=>({version:1,id,requestId:id,domain,type:'fixture',
  occurredAt:'2026-11-13T01:00:00Z',actor:{kind:'owner',id:'owner',channel:'room'},result:{status:'completed',summary:id}});

test('the Life materializer reads acknowledged originals rather than requiring pending membership',async()=>{
  const body=fact('body-original','body'),gift=fact('gift-original','economy');
  const sources=new Map<CompanionFact['domain'],CompanionFactSource>();let pendingReads=0;
  for(const item of [body,gift])sources.set(item.domain,{
    pendingFacts:async()=>{pendingReads++;return[];},acknowledgeFacts:async()=>{},
    readFacts:async(workspaceId,ids)=>{assert.equal(workspaceId,'workspace');return ids.map(id=>{assert.equal(id,item.id);return item;});},
  });
  const result=await readFactReferences('workspace',[gift,body,gift],domain=>sources.get(domain),()=>{});
  assert.deepEqual(result,[gift,body,gift]);assert.equal(pendingReads,0);
  await assert.rejects(readFactReferences('workspace',[fact('unknown','body')],domain=>sources.get(domain),()=>{}));
});

test('a domain service replacement during immutable fact reads cannot leak an old binding',async()=>{
  let release:(facts:CompanionFact[])=>void=()=>{};
  let source:CompanionFactSource|undefined={pendingFacts:async()=>[],acknowledgeFacts:async()=>{},readFacts:()=>new Promise(resolve=>{release=resolve;})};
  const original=fact('original','body');
  const result=readFactReferences('workspace',[original],()=>source,()=>{});
  source=undefined;release([original]);await assert.rejects(result,/组件已变化/);
});
