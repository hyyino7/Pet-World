import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {workspace,saveBaseline,check} from './helpers.mjs';

const old="export function old(ctx) { ctx.get('petLife'); }";
const create=t=>{const work=workspace(t,{'src/core/example.ts':old});saveBaseline(work);return work;};
test('未改变的旧违规通过，report 也做棘轮比较',t=>{
  const work=create(t),result=check(work.root,['--','--report']);
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/R2 src\/core\/example.ts:1/);
});
test('直接新增违规失败',t=>{
  const work=create(t);work.write('src/core/example.ts',old+"\nexport function added(ctx) {ctx.get('petBehavior');}");
  assert.equal(check(work.root).status,1);
});
test('删除旧违规并在另一个函数加相同服务仍失败',t=>{
  const work=create(t);work.write('src/core/example.ts',"export function other(ctx) {ctx.get('petLife');}");
  const result=check(work.root);assert.equal(result.status,1);assert.match(result.stdout,/新增 1；消失 1/);
});
test('同一函数多出相同表达式仍失败',t=>{
  const work=create(t);work.write('src/core/example.ts',"export function old(ctx) {ctx.get('petLife');ctx.get('petLife');}");
  assert.equal(check(work.root).status,1);
});
test('旧条目消失时必须同提交收紧，再次检查通过',t=>{
  const work=create(t);work.write('src/core/example.ts','export const fixed = true;');
  assert.equal(check(work.root).status,1);
  assert.equal(check(work.root,['--write-baseline']).status,0);
  assert.equal(check(work.root).status,0);
  assert.equal(JSON.parse(readFileSync(join(work.root,'arch/baseline/rules.json'),'utf8')).entries.length,0);
});
test('--write-baseline 拒绝新增且不部分改写其他基线',t=>{
  const work=create(t),path=join(work.root,'arch/baseline/rules.json'),before=readFileSync(path,'utf8');
  work.write('src/core/example.ts',old+"\nexport function added(ctx) {ctx.get('petBehavior');}");
  const result=check(work.root,['--write-baseline']);assert.equal(result.status,1);assert.match(result.stderr,/只能删条目/);
  assert.equal(readFileSync(path,'utf8'),before);
});
test('基线缺失不能重新初始化以放行旧违规',t=>{
  const work=workspace(t,{'src/core/example.ts':old});assert.equal(check(work.root,['--write-baseline']).status,1);
});
test('移动行号、注释、格式和引号风格不改变身份',t=>{
  const work=create(t);work.write('src/core/example.ts','\n\nexport function old(ctx) { /* move */ ctx . get ( "petLife" ) ; }');
  assert.equal(check(work.root).status,0);
});
test('R8 新增重复定义不能用同总数抵消',t=>{
  const work=workspace(t,{'src/core/a.ts':"const words=['a','b','c'];",'src/life/b.ts':"const words=['a','b','c'];"});
  saveBaseline(work);work.write('src/life/b.ts','');work.write('src/room/c.ts',"const words=['a','b','c'];");
  assert.equal(check(work.root).status,1);
});
