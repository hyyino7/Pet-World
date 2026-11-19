import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, renameSync} from 'node:fs';
import {join} from 'node:path';
import {workspace, saveBaseline, check} from './helpers.mjs';

const caller = 'src/core/imports.ts';
const target = 'src/life/words.ts';
const movedCaller = 'src/core/nested/imports.ts';
const movedTarget = 'src/life/nested/words.ts';
const moveFile = 'move.json';
const moveArgs = ['--write-baseline', '--move', moveFile];
const paths = {[caller]: movedCaller, [target]: movedTarget};
const oldImport = '../life/words.js';
const newImport = '../../life/nested/words.js';
const callerSource = specifier => `
  import { words } from '${specifier}';
  export function load() {
    import('${specifier}');
    import('${specifier}');
    return ['active', 'idle', 'asleep'];
  }
`;

function moveFixture(t) {
  const work = workspace(t, {
    [caller]: callerSource(oldImport),
    [target]: "export const words = ['active', 'idle', 'asleep'];",
  });
  const baseline = saveBaseline(work);
  assert.equal(baseline.rules.length, 3);
  assert.equal(baseline.vocabulary.length, 2);

  for (const [oldPath, newPath] of Object.entries(paths)) {
    work.write(newPath, '');
    renameSync(join(work.root, oldPath), join(work.root, newPath));
  }
  work.write(movedCaller, callerSource(newImport));
  work.write(moveFile, JSON.stringify(paths));
  return work;
}

function baselines(work) {
  return ['rules', 'vocabulary'].map(name =>
    readFileSync(join(work.root, `arch/baseline/${name}.json`), 'utf8'));
}

function assertRejected(work, args, message) {
  const before = baselines(work);
  const result = check(work.root, args);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, message);
  assert.deepEqual(baselines(work), before);
}

test('纯搬家能改写引用方、R1 目标及相对路径和 R8 双向位置', t => {
  const work = moveFixture(t);
  const result = check(work.root, moveArgs);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(check(work.root).status, 0);
  const [rules, vocabulary] = baselines(work).map(json => JSON.parse(json).entries);
  const scan = work.scan();
  assert.deepEqual(rules, scan.rules);
  assert.deepEqual(vocabulary, scan.vocabulary);
});

test('引用方位置不变时，也按解析结果识别搬家后的相对导入', t => {
  const work = workspace(t, {
    [caller]: "export type Words = import('../life/words.js').Words;",
    [target]: 'export type Words = string[];',
  });
  assert.equal(saveBaseline(work).rules.length, 1);
  work.write(movedTarget, '');
  renameSync(join(work.root, target), join(work.root, movedTarget));
  work.write(caller, "export type Words = import('../life/./nested/words.js').Words;");
  work.write(moveFile, JSON.stringify({[target]: movedTarget}));
  const result = check(work.root, moveArgs);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(check(work.root).status, 0);
});

test('搬家时把违规挪进新的函数作用域会被拒绝', t => {
  const work = moveFixture(t);
  work.write(movedCaller, callerSource(newImport).replace(`    import('${newImport}');`,
    `    function nested() { import('${newImport}'); }`));
  assertRejected(work, moveArgs, /搬家改键.*一一对应/);
});

test('搬家时对照漏掉 R1 目标路径会被拒绝', t => {
  const work = moveFixture(t);
  work.write(moveFile, JSON.stringify({[caller]: movedCaller}));
  assertRejected(work, moveArgs, /搬家改键.*一一对应/);
});

test('搬家时同身份的重复项少一条或多一条均被拒绝', t => {
  const work = moveFixture(t);
  const line = `    import('${newImport}');\n`;
  for (const replacement of ['', line + line]) {
    work.write(movedCaller, callerSource(newImport).replace(line, replacement));
    assertRejected(work, moveArgs, /搬家改键.*一一对应/);
  }
});

test('搬家时修改 R1 的导入绑定会被拒绝', t => {
  const work = moveFixture(t);
  work.write(movedCaller, callerSource(newImport).replace('{ words }', '{ words as renamed }'));
  assertRejected(work, moveArgs, /搬家改键.*一一对应/);
});

test('--move 必须与 --write-baseline 一起使用', t => {
  const work = moveFixture(t);
  assertRejected(work, ['--move', moveFile], /--move 必须与 --write-baseline 一起使用/);
});
