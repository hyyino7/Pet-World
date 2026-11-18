import assert from 'node:assert/strict';
import test from 'node:test';
import type { CompanionToolSource } from '../../src/contracts/index.js';
import { historicalStateOverview } from '../../src/core/native/history-maintenance.js';
import { CompanionToolTable } from '../../src/core/tables/tools.js';
import { lifePlanReadToolDeclaration } from '../../src/life/plan-tools.js';

test('tool declarations are unique by name and validate their sources before registration', () => {
  const table = new CompanionToolTable();
  assert.throws(() => table.register({ name: 'fixture_read', sources: ['toString' as CompanionToolSource] }),
    /Unknown companion tool source/);

  const sources: CompanionToolSource[] = ['owner', 'life'];
  table.register({ name: 'fixture_read', sources });
  table.register({ name: 'fixture_guest', sources: ['guest'] });
  assert.throws(() => table.register({ name: 'fixture_read', sources: ['review'] }), /Duplicate registration/);
  sources.push('review');

  assert.deepEqual(table.list('owner').map(tool => tool.name), ['fixture_read']);
  assert.deepEqual(table.list('life').map(tool => tool.name), ['fixture_read']);
  assert.deepEqual(table.list('guest').map(tool => tool.name), ['fixture_guest']);
  assert.deepEqual(table.list('review'), []);
  assert.deepEqual(table.list('tv'), []);
});

test('named and source-filtered history projections expire with their registration', async () => {
  const table = new CompanionToolTable();
  const projections = new CompanionToolTable();
  projections.register(lifePlanReadToolDeclaration);
  const declaration = {
    name: 'life_plan_read',
    sources: ['life'] as const,
    historyOverview(args: unknown, value: unknown) {
      return historicalStateOverview(projections, this.name, args, value);
    },
  };
  const registration = table.register(declaration);
  const named = table.get(declaration.name)?.historyOverview;
  const listed = table.list('life')[0]?.historyOverview;
  assert.ok(named);
  assert.ok(listed);
  const result = { revision: 3, plan: { storageId: 'fixture', activities: ['read'] } };
  const expected = { revision: 3, plan: { activities: ['read'] }, view: 'overview',
    details: { tool: declaration.name, view: 'full' } };
  assert.deepEqual(named({}, result), expected);
  assert.deepEqual(listed({}, result), expected);
  assert.equal(listed({ view: 'full' }, result), undefined);

  await registration.revoke();
  assert.equal(table.get(declaration.name), undefined);
  assert.deepEqual(table.list('life'), []);
  table.register(declaration);
  assert.throws(() => named({}, result), /no longer current/);
  assert.throws(() => listed({}, result), /no longer current/);
  assert.deepEqual(table.get(declaration.name)?.historyOverview?.({}, result), expected);
});
