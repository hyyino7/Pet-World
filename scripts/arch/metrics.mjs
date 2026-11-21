import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { readJson } from './lib/ast.mjs';
import { scan } from './lib/scan.mjs';

const lineLimit = 1500;
const codeExtensions = new Set(['.ts', '.mts', '.cts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.py', '.sh', '.html', '.css']);

function longHandwrittenFiles(root, skipped) {
  const tracked = execFileSync('git', ['ls-files', '--deduplicate', '-z', '--', 'src/', 'scripts/', 'tests/'], {
    cwd: root, encoding: 'utf8',
  }).split('\0');
  const generated = new Set(skipped);
  const files = [];
  for (const file of tracked) {
    if (generated.has(file) || !codeExtensions.has(extname(file))) continue;
    const path = join(root, file);
    if (!lstatSync(path, { throwIfNoEntry: false })?.isFile()) continue;
    const rows = readFileSync(path, 'utf8').split(/\r\n|[\r\n]/u);
    const lines = rows.length - Number(rows.at(-1) === '');
    if (lines > lineLimit) files.push({ file, lines });
  }
  return { limit: lineLimit, count: files.length, files };
}

function judgmentCounts(rows) {
  return { points: rows.length, files: new Set(rows.map(row => row.file)).size };
}

function collectMetrics(root) {
  const result = scan(root);
  const { modules } = readJson(join(root, 'arch/layers.json'));
  const baseline = readJson(join(root, 'arch/baseline/vocabulary.json'));
  const rules = Object.fromEntries(['R1', 'R2', 'R3', 'R4'].map(rule => [rule, 0]));
  for (const entry of result.rules) rules[entry.rule]++;

  const judgments = Object.fromEntries(['kind', 'action'].map(target => {
    const rows = result.judgments.filter(row => row.target === target);
    return [target, {
      runtime: judgmentCounts(rows.filter(row => row.file.startsWith('src/'))),
      scanned: judgmentCounts(rows),
    }];
  }));
  const edges = new Set(result.edges
    .filter(({ from, to }) => from !== to && Object.hasOwn(modules, from) && Object.hasOwn(modules, to))
    .map(({ from, to }) => JSON.stringify([from, to])));

  return {
    violations: { ...rules, total: result.rules.length },
    r8: { baselineEntries: baseline.entries.length, currentEntries: result.vocabulary.length, judgments },
    handwrittenFiles: longHandwrittenFiles(root, result.skipped),
    moduleDependencies: { count: edges.size },
    manual: [
      { label: '修复批次占比', status: '人工', source: 'docs/product.md#g5-手工度量' },
      { label: '典型修改基线', status: '人工', source: 'docs/product.md#典型修改前后对比' },
    ],
  };
}

function printMetrics({ violations, r8, handwrittenFiles, moduleDependencies, manual }) {
  const { total, ...rules } = violations;
  console.log(`R1–R4 违规目标：${Object.entries(rules).map(([rule, count]) => `${rule} ${count}`).join('、')}，合计 ${total} 条`);
  console.log(`R8：基线 ${r8.baselineEntries} 条，当前 ${r8.currentEntries} 条重复关系/裸字符串`);
  for (const [target, { runtime, scanned }] of Object.entries(r8.judgments)) {
    console.log(`R8 ${target} 字符串判断：运行源码 ${runtime.points} 点/${runtime.files} 文件；扫描范围 ${scanned.points} 点/${scanned.files} 文件`);
  }
  console.log(`手写超过 ${handwrittenFiles.limit} 行的文件：${handwrittenFiles.count} 个`);
  for (const { file, lines } of handwrittenFiles.files) console.log(`  ${file}（${lines} 行）`);
  console.log(`模块间依赖：${moduleDependencies.count} 条`);
  for (const { label, status, source } of manual) console.log(`${label}：${status}，见 ${source}`);
}

const metrics = collectMetrics(resolve(import.meta.dirname, '../..'));
if (process.argv.includes('--json')) console.log(JSON.stringify(metrics, null, 2));
else printMetrics(metrics);
