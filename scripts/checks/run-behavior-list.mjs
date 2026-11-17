import {readFileSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {run} from 'node:test';

// 索引身份固定为文件 + 顶层测试的字面名字；过滤器只缩小运行范围，结果事件才是证据。
const literal = name => new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
export async function runBehaviorList(entries, {cwd = process.cwd(), report = console.log} = {}) {
  const groups = new Map(), errors = [];
  for (const entry of entries) {
    const file = realpathSync(resolve(cwd, entry.file));
    const rows = groups.get(file) ?? [];
    if (rows.some(row => row.name === entry.name)) throw Error(`重复测试身份：${entry.file} / ${entry.name}`);
    rows.push({...entry, seen: 0, passed: 0}); groups.set(file, rows);
  }
  for (const [file, rows] of groups) {
    const stream = run({files: [file], cwd, concurrency: false, timeout: 30_000,
      testNamePatterns: rows.map(row => literal(row.name))});
    for await (const event of stream) {
      if (!['test:pass', 'test:fail'].includes(event.type)) continue;
      const data = event.data;
      const row = rows.find(row => row.name === data.name && data.nesting === 0 && data.file && realpathSync(resolve(cwd, data.file)) === file);
      if (row) {
        row.seen++;
        if (event.type === 'test:pass' && !('skip' in data) && !('todo' in data) && data.details.type !== 'suite') row.passed++;
        else errors.push(`${row.id}: 未成功执行（${data.skip ? 'skip' : data.todo ? 'todo' : data.details.error?.failureType ?? event.type}）`);
      }
      if (event.type === 'test:fail') errors.push(`${data.name}: ${data.details.error?.message ?? '测试失败'}`);
    }
    for (const row of rows) {
      if (row.seen !== 1 || row.passed !== 1) errors.push(`${row.id}: ${row.file} / ${row.name}，执行 ${row.seen} 次，通过 ${row.passed} 次`);
      else report(`PASS ${row.id} [${row.level}] ${row.name}`);
    }
  }
  if (!entries.length) errors.push('行为清单为空');
  if (errors.length) throw Error(errors.join('\n'));
  return entries.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const index = JSON.parse(readFileSync(resolve(process.argv[2] ?? 'tests/behavior-list/index.json'), 'utf8'));
    const total = await runBehaviorList(index.entries.filter(entry => entry.level !== 'L3'));
    console.log(`行为清单：${total} 条全部执行并通过`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
