import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const index = JSON.parse(readFileSync(new URL('./index.json', import.meta.url), 'utf8'));
const categories = ['计划续行','同请求重试不重复生效','效果已落盘后结算失败再重启','睡眠中投喂的终态','种地时钟不倒退','离线消耗额度','日记按原日期恢复','历史日记保护','输入持久化先于确认','送达与记忆召回分开','阅读必须有真实文本','QQ 收件恢复','换目录时在途请求不写旧目录','隐藏后取消显示定时器','缺库不得空白替代'];
const families = ['日记与回顾','种地时钟','计划推进与完成契约','关闭后晚到的录音与取消'];
test('索引覆盖十五类和四个 L1 故障家族并保留合法固定身份', () => {
  assert.equal(index.version, 1);
  const ids = new Set(), identities = new Set();
  for (const row of index.entries) {
    assert.ok(!ids.has(row.id)); ids.add(row.id);
    assert.ok(['L1','L2','L3'].includes(row.level));
    assert.ok(['M1','阶段 1','阶段 2','阶段 3','阶段 4'].includes(row.l1Stage));
    assert.ok(typeof row.name === 'string' && row.name.trim());
    assert.ok(row.file.startsWith('tests/') || row.file.startsWith('dist/tests/'));
    const identity = JSON.stringify([row.file,row.name]);
    assert.ok(!identities.has(identity)); identities.add(identity);
    for (const category of row.categories) assert.ok(categories.includes(category));
    for (const family of row.families) {assert.ok(families.includes(family)); assert.equal(row.level,'L1');}
  }
  for (const category of categories) assert.ok(index.entries.some(row => row.categories.includes(category) && row.level !== 'L3'), category);
  for (const family of families) assert.ok(index.entries.some(row => row.families.includes(family) && row.level === 'L1'), family);
});

test('5.8 会话策略每格都有有效的非 L3 行为测试', () => {
  const rows = ['1','2','3','4','5','6','7','8-chat','8-tv','9'];
  const expected = new Set([
    ...rows.flatMap(row => ['来源','选择','生命周期','绑定'].map(cell => `5.8.2#${row}/${cell}`)),
    ...rows.flatMap(row => ['工具','记忆','情绪'].map(cell => `5.8.3#${row}/${cell}`)),
    ...['home','owner','desktop','room','guest','whisper'].flatMap(row =>
      ['历史','组装'].map(cell => `5.8.4#${row}/${cell}`)),
  ]);
  const covered = new Set();
  for (const row of index.entries) {
    if (!Object.hasOwn(row,'policyCells')) continue;
    assert.ok(Array.isArray(row.policyCells) && row.policyCells.length > 0,row.id);
    assert.equal(new Set(row.policyCells).size,row.policyCells.length,row.id);
    for (const cell of row.policyCells) {
      assert.ok(expected.has(cell),`${row.id} / ${cell}`);
      if (row.level !== 'L3') covered.add(cell);
    }
  }
  assert.deepEqual([...expected].filter(cell => !covered.has(cell)),[]);
});

function probe(t, source, names = ['literal [x].*']) {
  const directory = mkdtempSync(join(tmpdir(), 'behavior-runner-'));
  t.after(() => rmSync(directory, {recursive:true,force:true}));
  const file = join(directory,'fixture.test.mjs'), path = join(directory,'index.json');
  writeFileSync(file, "import test from 'node:test';\n" + source);
  writeFileSync(path, JSON.stringify({entries:names.map((name,i) => ({id:'probe'+i,level:'L2',file,name}))}));
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath,[resolve('scripts/checks/run-behavior-list.mjs'),path],{encoding:'utf8',timeout:10_000,env});
}
test('runner 按字面匹配并允许恰好一次成功', t => {
  const result = probe(t,"test('literal [x].*',()=>{}); test('literal xZZ',()=>{throw Error('must not run')});");
  assert.equal(result.status,0,result.stderr); assert.match(result.stdout,/PASS probe0/);
});
test('runner 拒绝零匹配而非依赖原生退出码', t => {
  const result = probe(t,"test('other',()=>{});"); assert.equal(result.status,1); assert.match(result.stderr,/执行 0 次/);
});
test('runner 拒绝重复执行的同名身份', t => {
  const result = probe(t,"test('literal [x].*',()=>{}); test('literal [x].*',()=>{});");
  assert.equal(result.status,1); assert.match(result.stderr,/执行 2 次/);
});
test('runner 拒绝重复的索引身份', t => {
  const result = probe(t,"test('same',()=>{});",['same','same']); assert.equal(result.status,1); assert.match(result.stderr,/重复测试身份/);
});
test('runner 拒绝 skip 及运行时 skip', t => {
  for (const source of ["test('literal [x].*',{skip:true},()=>{});","test('literal [x].*',t=>t.skip());"]) {
    const result = probe(t,source); assert.equal(result.status,1,result.stdout); assert.match(result.stderr,/通过 0 次/);
  }
});
test('runner 拒绝 todo 及运行时 todo', t => {
  for (const source of ["test('literal [x].*',{todo:true},()=>{});","test('literal [x].*',t=>t.todo());"]) {
    const result = probe(t,source); assert.equal(result.status,1,result.stdout); assert.match(result.stderr,/通过 0 次/);
  }
});
test('runner 拒绝取消和普通失败', t => {
  for (const source of ["test('literal [x].*',{signal:AbortSignal.abort()},()=>{});","test('literal [x].*',()=>{throw Error('broken')});"]) {
    const result = probe(t,source); assert.equal(result.status,1,result.stdout); assert.match(result.stderr,/通过 0 次/);
  }
});
test('runner 不以同名嵌套测试冒充顶层身份', t => {
  const result = probe(t,"test('parent',async t=>{await t.test('literal [x].*',()=>{});});");
  assert.equal(result.status,1); assert.match(result.stderr,/执行 0 次/);
});
test('runner 不以 suite 或加载失败冒充成功测试', t => {
  for (const source of ["import {describe} from 'node:test'; describe('literal [x].*',()=>{});","throw Error('cannot load');"]) {
    const result = probe(t,source); assert.equal(result.status,1,result.stdout);
  }
});
