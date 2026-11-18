import assert from 'node:assert/strict';
import test from 'node:test';
import {createUserMessage} from '@deepseek-ai/dsh-llm';
import {CoreNative} from '../../src/core/native/conversation.js';
import type {CoreRuntime} from '../../src/core/runtime.js';

test('Core admits native owner input ahead of a failing channel adapter for the same kind', () => {
  const native = new CoreNative({} as CoreRuntime);
  const error = new Error('Channel admission failed');
  native.sourceTable.register({
    id: 'failing-channel', sources: ['user'], order: 10, branches: {},
    admit: () => { throw error; },
  });
  const owner = createUserMessage({source: {kind: 'user'}, content: []});
  const channel = createUserMessage({source: {kind: 'user', identity: {speakerId: 'guest'}}, content: []});
  assert.deepEqual(native.sourceTable.admit({sessionId: 'chat', message: channel}), {kind: 'failed', error});
  assert.equal(native.acceptsInput('chat', owner), true);
  const admitted = native.sourceTable.admit({sessionId: 'chat', message: owner});
  assert.equal(admitted.kind, 'accepted');
  assert.equal(admitted.branch.turnKind, 'foreground');
});
