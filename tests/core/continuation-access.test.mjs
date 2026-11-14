import test from 'node:test';
import assert from 'node:assert/strict';
import { guardContinuationReads } from '../../scripts/checks/lib/native-standard-preset.mjs';

test('live continuation allows observed file discovery and supplied files, while retaining its read-only scope', () => {
  const root = '/disposable/live-scene';
  assert.equal(guardContinuationReads(root, { name: 'glob', arguments: { pattern: '*.txt' } }), undefined);
  assert.equal(guardContinuationReads(root, { name: 'read', arguments: { file_path: root + '/cedar.txt' } }), undefined);
  assert.equal(guardContinuationReads(root, { name: 'read', arguments: { file_path: 'willow.txt' } }), undefined);
  assert.equal(guardContinuationReads(root, { name: 'pet_memory_recall', arguments: { query: 'prior comparison' } }), undefined);
  for (const exec of [
    { name: 'glob', arguments: { pattern: '*.txt', path: '..' } },
    { name: 'glob', arguments: { pattern: '**/*' } },
    { name: 'read', arguments: { file_path: '../private.txt' } },
    { name: 'write', arguments: { file_path: 'cedar.txt' } },
    { name: 'subagent', arguments: {} },
  ]) assert.equal(typeof guardContinuationReads(root, exec), 'string');
});
