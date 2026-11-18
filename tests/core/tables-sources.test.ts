import assert from 'node:assert/strict';
import test from 'node:test';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import type { SessionPolicyRow, SourceAdapter, SourceBranch, SourceInput } from '../../src/contracts/index.js';
import { SourceAdapterTable } from '../../src/core/tables/sources.js';

function input(source: SourceInput['message']['source'] = { kind: 'user' }): SourceInput {
  return { sessionId: 'synthetic-home', message: createUserMessage({ source, content: [{ type: 'text', text: 'fixture' }] }) };
}

function guestInput(): SourceInput {
  const source = { kind: 'user', identity: { speakerId: 'guest' } } as const;
  return input(source);
}

function row(number: number, branch: string): SessionPolicyRow {
  const observed = { description: 'Fixture uses its own conversation', behaviorIds: ['M2A-01'] };
  return { row: number, branch, trustedActor: 'Verified sender', selectionKey: 'Session ID',
    historyScope: 'Current conversation', preset: 'Fixture preset', lifecycle: 'Native cancellation',
    bindingCheck: 'Fixture binding', tools: observed, memoryObservation: observed,
    emotionUpdate: { footer: observed, tool: observed } };
}

function adapter(overrides: Partial<SourceAdapter<string>> = {}): SourceAdapter<string> {
  return {
    id: 'owner', order: 10, sources: ['user'],
    branches: { owner: { turnKind: 'foreground', toolSource: 'owner', toolPolicy: null,
      emotionUpdate: { footer: true, tool: true }, policyRow: row(1, 'owner'),
      memoryObservation: { reply: sessionId => ({ channel: 'dsh', sessionId }) } } },
    admit: ({ sessionId }) => ({ kind: 'accepted', branch: 'owner', context: sessionId }),
    ...overrides,
  };
}

test('an unrelated source is unclaimed and an adapter may decline to claim its own source', () => {
  const table = new SourceAdapterTable<string>();
  table.register(adapter({ admit: ({ message }) => 'identity' in message.source
    ? { kind: 'unclaimed' } : { kind: 'accepted', branch: 'owner', context: 'native' } }));
  assert.deepEqual(table.admit(input({ kind: 'chatpet-room-tv', rpcId: 'fixture' })), { kind: 'unclaimed' });
  assert.deepEqual(table.admit(guestInput()), { kind: 'unclaimed' });
  assert.equal(table.admit(input()).kind, 'accepted');
});

test('overlapping adapters resolve by order and only unclaimed continues to a later adapter', () => {
  const table = new SourceAdapterTable<string>();
  table.register(adapter({ order: 20 }));
  const denied = input();
  table.register(adapter({ id: 'channel', order: 10, admit: ({ message }) => message.id === denied.message.id
    ? { kind: 'rejected', reason: 'No channel grant' } : { kind: 'unclaimed' } }));
  assert.throws(() => table.register(adapter({ id: 'ambiguous' })), /Duplicate registration order/);
  table.register(adapter({ id: 'tv', sources: ['chatpet-room-tv'], admit: () => ({ kind: 'unclaimed' }) }));
  assert.deepEqual(table.admit(denied), { kind: 'rejected', reason: 'No channel grant' });
  const result = table.admit(input());
  assert.equal(result.kind, 'accepted');
  assert.equal(result.context, 'synthetic-home');
});

test('a thrown adapter fails closed for its source while a different source still resolves', () => {
  const table = new SourceAdapterTable<string>();
  table.register(adapter({ id: 'broken', order: 1, admit: ({ message }) => { throw new Error(`Failed ${message.id}`); } }));
  table.register(adapter());
  table.register(adapter({ id: 'tv', sources: ['chatpet-room-tv'] }));
  const owner = input();
  const failure = table.admit(owner);
  assert.equal(failure.kind, 'failed');
  assert.match(String(failure.error), new RegExp(owner.message.id));
  assert.equal(table.admit(input({ kind: 'chatpet-room-tv', rpcId: 'fixture' })).kind, 'accepted');
});

test('an adapter selects the guest branch and owns consumption of a one-time grant', async () => {
  const table = new SourceAdapterTable<string>();
  const original = guestInput();
  const current = adapter();
  const guest: SourceBranch<string> = { turnKind: 'foreground', toolSource: 'guest',
    toolPolicy: { allows: () => false, denial: 'Guest cannot run owner tools' },
    emotionUpdate: { footer: true, tool: false }, policyRow: row(6, 'guest'),
    memoryObservation: { input: actorId => ({ origin: 'external_content', actorId,
      sourceKind: 'user_statement', attribution: { channel: 'qq' } }) } };
  const grants = new Set([original.message.id]);
  const accepted = new Set<typeof original.message.id>();
  const registration = table.register(adapter({ branches: { ...current.branches, guest }, admit: source => {
    if (!('identity' in source.message.source)) return current.admit(source);
    const { message } = source;
    if (grants.delete(message.id)) accepted.add(message.id);
    return accepted.has(message.id) ? { kind: 'accepted', branch: 'guest', context: 'channel-speaker' }
      : { kind: 'rejected', reason: 'Missing grant' };
  } }));
  const first = table.admit(original), retry = table.admit(original), owner = table.admit(input());
  assert.equal(first.kind, 'accepted');
  assert.equal(retry.kind, 'accepted');
  assert.equal(owner.kind, 'accepted');
  assert.equal(grants.size, 0);
  assert.equal(first.branch.memoryObservation?.input?.().actorId, 'channel-speaker');
  assert.equal(retry.branch.toolPolicy?.denial, 'Guest cannot run owner tools');
  assert.equal(owner.branch.toolPolicy, null);
  assert.equal(owner.branch.memoryObservation?.reply?.().channel, 'dsh');
  await registration.revoke();
  assert.throws(() => first.branch.memoryObservation?.input?.(), /no longer current/);
  assert.deepEqual(table.admit(original), { kind: 'unclaimed' });
});

test('declaration-only policy rows can be listed but never admit an input', async () => {
  const table = new SourceAdapterTable<string>();
  const alias = { ...row(7, 'desktop'), inherits: 1 };
  const standard = adapter(), owner = standard.branches.owner;
  const mistaken = input();
  const registration = table.register(adapter({ branches: { ...standard.branches, desktop: { ...owner, policyRow: alias } },
    policyRows: [row(2, 'home'), row(9, 'monologue')], admit: request => request.message.id === mistaken.message.id
      ? { kind: 'accepted', branch: 'home', context: request.sessionId } : standard.admit(request) }));
  assert.deepEqual(table.policyRows().map(entry => entry.row), [1, 2, 7, 9]);
  assert.equal(table.policyRows().find(entry => entry.row === 7)?.inherits, 1);
  const result = table.admit(input());
  assert.equal(result.kind, 'accepted');
  assert.equal(result.branch.policyRow.row, 1);
  assert.equal(table.admit(mistaken).kind, 'failed');
  await registration.revoke();
  assert.deepEqual(table.policyRows(), []);
});
