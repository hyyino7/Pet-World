import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import Tools from '@deepseek-ai/dsh-tools';
import { GUEST_PRESET } from '../../src/channels/guest.js';
import { CONTRACT_VERSION, type CapabilityRegistration } from '../../src/contracts/index.js';
import { CapabilityTable } from '../../src/core/tables/capabilities.js';
import { RegistrationTable } from '../../src/core/tables/registry.js';

test('an ordered registration table sorts explicitly and rejects a conflicting order', () => {
  const table = new RegistrationTable<number>({ order: value => value });
  table.register('later', 20);
  table.register('earlier', 10);
  assert.throws(() => table.register('conflict', 10), /Duplicate registration order/);
  assert.deepEqual(table.entries().map(entry => entry.value), [10, 20]);
});

test('duplicate registration preserves the original entry and its lease', () => {
  const table = new RegistrationTable<string>();
  const original = table.register('same', 'original');
  assert.throws(() => table.register('same', 'replacement'), /Duplicate registration/);
  assert.equal(table.entries()[0]?.value, 'original');
  assert.ok(original.lease.isCurrent());
});

test('repeating an old revoke preserves a new registration under the same key', async () => {
  const table = new RegistrationTable<string>();
  const first = table.register('same', 'first');
  await first.revoke();
  const second = table.register('same', 'second');
  await first.revoke();
  assert.notEqual(first.lease.generation, second.lease.generation);
  assert.equal(table.entries()[0]?.value, 'second');
  assert.ok(second.lease.isCurrent());
});

test('a callback already handed to a reader becomes unusable on revocation', async () => {
  const table = new RegistrationTable<() => number>();
  const registration = table.register('counter', () => ++calls);
  const [{ value, lease }] = table.entries();
  let calls = 0;
  const read = lease.guard(value);
  assert.equal(read(), 1);
  await registration.revoke();
  assert.throws(read, /no longer current/);
  assert.equal(calls, 1);
});

test('a late continuation cannot write after its registration has been replaced', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'her-world-table-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'projected.json');
  let resume!: () => void;
  const ready = new Promise<void>(resolve => { resume = resolve; });
  const table = new RegistrationTable<string>();
  const original = table.register('projection', 'old contents');
  const [{ value, lease }] = table.entries();
  const project = lease.guard(async () => {
    await ready;
    lease.assertCurrent();
    writeFileSync(file, value);
  });
  const inFlight = project();
  await original.revoke();
  table.register('projection', 'new contents');
  resume();
  await assert.rejects(inFlight, /no longer current/);
  assert.equal(existsSync(file), false);
});

test('one registration attaches once to each native preset and revokes its actual tool masks', async () => {
  const require = createRequire(import.meta.url);
  const toolRequire = createRequire(require.resolve('@deepseek-ai/dsh-tools'));
  const { createScope } = await import(pathToFileURL(toolRequire.resolve('@deepseek-ai/dsh-scope')).href);
  const root = new Context();
  const prompt = await root.plugin(SystemPrompt), tools = await root.plugin(Tools);
  try {
    const component = await root.plugin({ inject: ['tools'], async apply(owner: Context) {
      owner.tools.register({ name: 'fixture_read', description: 'Fixture read', parameters: { type: 'object' },
        output: { schema: { type: 'string' }, render: () => [] }, execute: async () => 'fixture' });
      const standard = { id: 'standard' }, guest = { id: GUEST_PRESET };
      const standardScope = createScope(owner, standard), guestScope = createScope(owner, guest);
      const scopes = [standardScope, guestScope];
      const table = new RegistrationTable<string>();
      const registration = table.register('mask', 'fixture_read');
      const visible = (scope?: object) => owner.tools.schemas(scope).some(tool => tool.name === 'fixture_read');
      const install = (scope: Context) => scope.tools.restrict({ deny: [table.entries()[0].value] });
      try {
        assert.ok(visible(guest));
        await registration.attach(standardScope.ctx, install);
        assert.equal(visible(standard), false);
        assert.ok(visible(guest));
        await registration.attach(guestScope.ctx, install);
        await registration.attach(guestScope.ctx, () => assert.fail('guest mask installed twice'));
        assert.equal(visible(guest), false);
        assert.ok(visible());
        await registration.revoke();
        assert.ok(visible(standard));
        assert.ok(visible(guest));
      } finally {
        await registration.revoke();
        for (const scope of scopes) await scope.dispose();
      }
    } });
    await component.dispose();
  } finally {
    await tools.dispose();
    await prompt.dispose();
  }
});

test('capability rows validate both public identifiers before reserving a slot', () => {
  const table = new CapabilityTable();
  const row: CapabilityRegistration = { id: 'desktop.room', owner: 'desktop', order: 5,
    contractVersion: CONTRACT_VERSION, status: () => ({ state: 'ready', reason: null, supportedOperations: ['view'] }) };
  assert.throws(() => table.register({ ...row, id: 'toString' as typeof row.id }), /Unknown capability id/);
  assert.throws(() => table.register({ ...row, owner: 'room' as typeof row.owner }), /Unknown capability owner/);
  table.register(row);
  assert.equal(table.list()[0]?.status().state, 'ready');
});

test('capability rows compute live status and disappear on revocation', async () => {
  const table = new CapabilityTable();
  let open = false;
  const registration = table.register({ id: 'desktop.room', owner: 'desktop', order: 5,
    contractVersion: CONTRACT_VERSION, service: 'petRoom', page: 'room',
    status: () => open ? { state: 'ready', reason: null, supportedOperations: ['view'] }
      : { state: 'unavailable', reason: 'Room is closed', supportedOperations: [] } });
  const [row] = table.list();
  assert.equal(row.status().state, 'unavailable');
  open = true;
  assert.deepEqual(row.status().supportedOperations, ['view']);
  assert.equal(row.service, 'petRoom');
  assert.equal(row.page, 'room');
  await registration.revoke();
  assert.deepEqual(table.list(), []);
  assert.throws(() => row.status(), /no longer current/);
});
