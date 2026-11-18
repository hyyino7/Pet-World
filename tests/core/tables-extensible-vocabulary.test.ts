import assert from 'node:assert/strict';
import test from 'node:test';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { COMPANION_TOOL_SOURCES, type SourceAdapter } from '../../src/contracts/tables.js';
import { CoreNative } from '../../src/core/native/conversation.js';
import type { CoreRuntime } from '../../src/core/runtime.js';

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'fixture-background': { kind: 'fixture-background' };
  }
}

declare module '../../src/contracts/tables.js' {
  interface CompanionToolSourceMap {
    'fixture-reminder': true;
  }
}

type AdapterSource<Kind extends SourceAdapter<unknown>['sources'][number]> = Kind;
// @ts-expect-error Only the kind declared by the producer is valid in the adapter.
type MisspelledSource = AdapterSource<'fixture-backgruond'>;

test('a module can register and revoke its native input and companion tool sources', async () => {
  const native = new CoreNative({} as CoreRuntime);
  const { sourceTable, toolTable } = native;
  const message = createUserMessage({ source: { kind: 'fixture-background' }, content: [] });
  const input = { sessionId: 'synthetic-home', message };
  assert.equal(sourceTable.admit(input).kind, 'unclaimed');

  toolTable.register({ name: 'fixture_builtin', sources: COMPANION_TOOL_SOURCES });
  const reminder = { name: 'fixture_alarm', sources: ['life', 'fixture-reminder'] } as const;
  assert.throws(() => toolTable.register(reminder), /Unknown companion tool source: fixture-reminder/);

  const source = toolTable.registerSource('fixture-reminder');
  assert.throws(() => toolTable.register({ name: 'fixture_typo',
    // @ts-expect-error Exercise runtime validation when declarations bypass TypeScript.
    sources: ['fixture-remidner'],
  }), /Unknown companion tool source: fixture-remidner/);
  toolTable.register(reminder);

  const ownerRow = sourceTable.policyRows().find(row => row.row === 1);
  assert.ok(ownerRow);
  const adapter = sourceTable.register({
    id: 'fixture-reminder', order: 0, sources: ['fixture-background'],
    branches: {
      reminder: {
        turnKind: 'background', toolSource: 'fixture-reminder', toolPolicy: null,
        memoryObservation: null, emotionUpdate: { footer: false, tool: false },
        policyRow: { ...ownerRow, row: 10, branch: 'reminder' },
      },
    },
    admit: () => ({ kind: 'accepted', branch: 'reminder', context: { policyKey: 'reminder' } }),
  });
  const admitted = sourceTable.admit(input);
  assert.equal(admitted.kind, 'accepted');
  assert.deepEqual(toolTable.list(admitted.branch.toolSource).map(tool => tool.name), [reminder.name]);
  assert.equal(native.acceptsInput(input.sessionId, createUserMessage({ source: { kind: 'user' }, content: [] })), true);

  await adapter.revoke();
  await source.revoke();
  assert.equal(sourceTable.admit(input).kind, 'unclaimed');
  assert.throws(() => toolTable.register(reminder), /Unknown companion tool source: fixture-reminder/);
  assert.deepEqual(toolTable.list('fixture-reminder'), []);
  assert.deepEqual(toolTable.get(reminder.name)?.sources, ['life']);
  for (const builtin of COMPANION_TOOL_SOURCES) {
    assert.ok(toolTable.list(builtin).some(tool => tool.name === 'fixture_builtin'));
  }
  const reloaded = toolTable.registerSource('fixture-reminder');
  assert.deepEqual(toolTable.list('fixture-reminder'), []);
  await reloaded.revoke();
});
