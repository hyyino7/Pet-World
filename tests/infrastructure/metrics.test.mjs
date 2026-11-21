import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve(import.meta.dirname, '../../scripts/arch/metrics.mjs');
const repairRecord = '**本期未重算**（保留 `原文` 和 \\|）';
const changeRecord = '第 5 类 2 文件 / 1 层（未达标）';
const table = [
  '| 项（7 项） | 基线 | 上一次 | 最新 | 口径 |',
  '| --- | --- | --- | --- | --- |',
  `| 6. 修复批次占比 | 旧比例 | 上次比例 | ${repairRecord} | 按批去重 |`,
  `| 7. 典型修改基线 | 旧基线 | 上次基线 | ${changeRecord} | 按层计数 |`,
];

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'her-world-metrics-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, content) => {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
  };
  const module = (root, layer, overrides) => ({
    root, layer, dependencies: [], services: [], reads: [], publishes: [], subscribes: [], generated: [], ...overrides,
  });
  write('arch/layers.json', {
    modules: {
      core: module('src/core/', 1, { generated: [{ file: 'src/core/generated.ts', sources: ['scripts/source.mjs'] }] }),
      living: module('src/living/', 2, {
        dependencies: ['core'], services: ['petBehavior', 'petEconomy'], publishes: ['pet/test'],
      }),
    },
  });
  write('arch/storage.json', { entries: [] });
  write('arch/baseline/vocabulary.json', {
    schemaVersion: 1,
    entries: [{ rule: 'R8', file: 'src/core/main.ts', target: 'kind', shape: 'bare string' }],
  });
  write('package.json', { type: 'module' });
  write('src/core/main.ts', [
    "import '../living/main.js';",
    "import './local.js';",
    "const name = choose ? 'petBehavior' : 'petEconomy';",
    'ctx.get(name);',
    "ctx.get('petMissing');",
    "ctx.on('pet/test', () => {});",
    "kind === 'x'; action === 'y';",
    'export type Example = { kind: string };',
    "export const words = ['a', 'b', 'c'];",
  ].join('\n'));
  write('src/core/local.ts', '');
  write('src/living/main.ts', [
    "import '../core/local.js';",
    'host.native.registry = {};',
    "kind === 'x';",
    "export const other = ['a', 'b', 'c'];",
  ].join('\n'));
  write('scripts/source.mjs', "action === 'y';\n");
  write('scripts/at-limit.mjs', '// line\n'.repeat(1500));
  write('tests/over-limit.ts', '// line\r\n'.repeat(1500) + '// last line');
  write('src/core/generated.ts', '// line\n'.repeat(1501));
  write('docs/product.md', ['### G5 手工度量', '', ...table, ''].join('\n'));
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  execFileSync('git', ['add', '--all'], { cwd: root });
  write('scripts/untracked.mjs', '// line\n'.repeat(1501));
  return { root, write };
}

function runMetrics(root, ...args) {
  const result = spawnSync(process.execPath, [script, '--root', root, ...args], {
    cwd: tmpdir(), encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

test('G5 在合成仓库统计违规、去重文件和依赖，排除生成及未跟踪文件', t => {
  const { root } = fixture(t);
  const result = runMetrics(root, '--json');
  assert.equal(result.status, 0, result.stderr);
  const metrics = JSON.parse(result.stdout);
  assert.deepEqual(metrics.violations, {
    R1: { targets: 1, callSites: 1, violationEdges: 1 },
    R2: { targets: 3, callSites: 2, violationEdges: 1 },
    R3: { targets: 1, callSites: 1, violationEdges: 1 },
    R4: { targets: 1, callSites: 1, violationEdges: 1 },
    total: 6,
  });
  assert.deepEqual(metrics.r8, {
    baselineEntries: 1,
    currentEntries: 3,
    duplicateRelations: 2,
    bareFields: 1,
    judgments: {
      kind: { runtime: { points: 2, files: 2 }, scanned: { points: 2, files: 2 } },
      action: { runtime: { points: 1, files: 1 }, scanned: { points: 2, files: 2 } },
      total: { runtime: { points: 3, files: 2 }, scanned: { points: 4, files: 3 } },
    },
  });
  assert.deepEqual(metrics.handwrittenFiles, {
    limit: 1500, count: 1, files: [{ file: 'tests/over-limit.ts', lines: 1501 }],
  });
  assert.equal(metrics.moduleDependencies.count, 2);
  assert.deepEqual(metrics.manual.map(({ label, status, record }) => [label, status, record]), [
    ['修复批次占比', '人工', repairRecord],
    ['典型修改基线', '人工', changeRecord],
  ]);

  const report = runMetrics(root);
  assert.equal(report.status, 0, report.stderr);
  assert.match(report.stdout, /^R2：3 条违规目标；2 个调用点；1 条违规依赖边$/mu);
  assert.match(report.stdout, /^R8 kind\/action 合计 字符串判断：运行源码 3 点\/2 文件；扫描范围 4 点\/3 文件$/mu);
  assert.match(report.stdout, /^  tests\/over-limit\.ts（1501 行）$/mu);
  assert.match(report.stdout, /^模块间依赖：2 条$/mu);
  assert.ok(report.stdout.includes(`修复批次占比：人工，${repairRecord}\n`));
  assert.ok(report.stdout.includes(`典型修改基线：人工，${changeRecord}\n`));
});

test('G5 人工记录缺失时报告具体原因', t => {
  const { root, write } = fixture(t);
  const heading = '### G5 手工度量';
  const cases = [
    [['### 其他度量', ...table], /缺少「G5 手工度量」章节/u],
    [[heading, '没有表格', '### 其他度量', ...table], /缺少 G5 度量表/u],
    [[heading, ...table.slice(0, -1), '### 其他度量', table.at(-1)], /缺少第 7 项「典型修改基线」/u],
    [[heading, ...table.slice(0, 2), table[2].replace(repairRecord, ''), table[3]], /第 6 项「修复批次占比」的最新记录为空/u],
  ];
  for (const [lines, reason] of cases) {
    write('docs/product.md', lines.join('\n'));
    const result = runMetrics(root, '--json');
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /docs\/product\.md/u);
    assert.match(result.stderr, reason);
  }
  rmSync(join(root, 'docs/product.md'));
  const missing = runMetrics(root, '--json');
  assert.equal(missing.status, 1, missing.stderr);
  assert.match(missing.stderr, /读取 docs\/product\.md 失败（ENOENT）/u);
});
