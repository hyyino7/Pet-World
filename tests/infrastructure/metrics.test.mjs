import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const options = { cwd: root, encoding: 'utf8' };

test('G5 度量沿用架构报告的判断点，并排除超过行数阈值的生成文件', () => {
  const metrics = JSON.parse(execFileSync(process.execPath, ['scripts/arch/metrics.mjs', '--json'], options));
  const report = spawnSync(process.execPath, ['scripts/arch/check.mjs', '--report'], options);
  assert.ifError(report.error);
  assert.equal(report.signal, null);
  const counts = /^R8 (kind|action) 字符串判断：运行源码 (\d+) 点\/(\d+) 文件；扫描范围 (\d+) 点\/(\d+) 文件$/gmu;
  const expected = Object.fromEntries(Array.from(report.stdout.matchAll(counts), ([, target, points, files, scannedPoints, scannedFiles]) => [
    target,
    { runtime: { points: Number(points), files: Number(files) }, scanned: { points: Number(scannedPoints), files: Number(scannedFiles) } },
  ]));
  assert.deepEqual(Object.keys(expected).sort(), ['action', 'kind'], report.stderr);
  assert.deepEqual(metrics.r8.judgments, expected);

  const { modules } = JSON.parse(readFileSync(join(root, 'arch/layers.json'), 'utf8'));
  const generated = Object.values(modules).flatMap(module => module.generated.map(item => item.file));
  const tracked = execFileSync('git', ['ls-files', '-z', '--', ...generated], options).split('\0').filter(Boolean);
  const oversized = tracked.filter(file => {
    const source = readFileSync(join(root, file), 'utf8');
    const breaks = source.match(/\r\n|[\r\n]/gu)?.length ?? 0;
    return breaks + Number(source.length > 0 && !/[\r\n]$/u.test(source)) > 1500;
  });
  assert.ok(oversized.includes('src/living/body/animation-map.ts'));
  const { count, files } = metrics.handwrittenFiles;
  assert.equal(count, files.length);
  const reported = new Set(files.map(item => item.file));
  for (const file of oversized) assert.ok(!reported.has(file), `生成文件计入了手写文件：${file}`);
});
