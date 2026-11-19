import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {workspace,saveBaseline,check} from './helpers.mjs';
import {report} from '../../scripts/arch/check.mjs';

test('vendor 生成源只列为跳过，自有生成脚本和 src 生成源照扫',t=>{
  const work=workspace(t,{
    'src/core/generated.js':"import '../living/plan/plugin.js';",
    'src/core/source.ts':"const words=['a','b','c'];",
    'scripts/build/source.mjs':"import '../../src/living/plan/plugin.js'; const words=['a','b','c'];",
    'vendor/upstream/source.js':"ctx.get('petUnknown'); const words=['a','b','c']; store.put('desktop-session',{});",
  });
  const layers=JSON.parse(readFileSync(join(work.root,'arch/layers.json'),'utf8'));
  layers.modules.core.generated=[{file:'src/core/generated.js',sources:[
    'scripts/build/source.mjs','src/core/source.ts','vendor/upstream/source.js',
  ]}];
  work.write('arch/layers.json',JSON.stringify(layers));
  const result=saveBaseline(work);
  assert.deepEqual(result.skipped,['src/core/generated.js']);
  for(const rows of [result.rules,result.vocabulary,result.writers])assert.ok(rows.every(r=>!r.file.startsWith('vendor/')));
  assert.deepEqual(result.skippedVendorSources,['vendor/upstream/source.js']);
  assert.ok(result.rules.some(r=>r.file==='scripts/build/source.mjs'&&r.rule==='R1'));
  for(const file of ['src/core/source.ts','scripts/build/source.mjs'])assert.ok(result.vocabulary.some(r=>r.file===file),file);
  const output=[];report(result,line=>output.push(line));
  assert.ok(output.some(line=>line.includes('跳过 vendor 生成源（1）')&&line.includes('vendor/upstream/source.js')));
  work.write('vendor/upstream/source.js',"ctx.get('petAnother'); const words=['x','y','z'];");
  assert.equal(check(work.root).status,0);
});
