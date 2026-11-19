import assert from 'node:assert/strict';
import { isAbsolute } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { checked, requireMigration } from './errors.mjs';
import { hash, readJournal } from './io.mjs';
import manifestStep from './steps/0001-storage-manifest.mjs';

const stepEvents = ['start','skip','done','failed'];
const otherEvents = ['lock-takeover','journal-repaired'];
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const versionMap = value => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length > 0 && Object.values(value).every(version => Number.isSafeInteger(version) && version > 0);

export function contractFor(steps) {
  const contract = steps.map(({id, from, to}) => ({id, from, to}));
  validateContract(contract);
  return contract;
}

function validateContract(contract) {
  assert.ok(Array.isArray(contract) && contract.length > 0);
  const ids = new Set(), targets = [];
  let previous = null;
  for (const step of contract) {
    assert.ok(step && typeof step.id === 'string' && step.id && !ids.has(step.id));
    assert.deepEqual(step.from, previous);
    assert.ok(versionMap(step.to) && !targets.some(to => isDeepStrictEqual(to, step.to)));
    ids.add(step.id);
    targets.push(step.to);
    previous = step.to;
  }
  return contract;
}

export const journalBinding = context => ({ storageId:context.plan.storageId, repoHash:hash(context.plan.repo) });
export const settled = segment => segment.header.steps.every(step => ['done','skip'].includes(segment.states.get(step.id)));

export function validateJournal(context) {
  return checked('journal-invalid', () => {
    const journal = readJournal(context.journalFile), ids = new Set();
    let last;
    for (const row of journal.rows) {
      assert.ok(row && typeof row === 'object');
      if (row.event === 'migration') {
        assert.ok(typeof row.id === 'string' && row.id && !ids.has(row.id) && typeof row.backup === 'string' && isAbsolute(row.backup));
        const legacy = row.schema === undefined && row.steps === undefined && row.binding === undefined && row.backupHash === undefined;
        let header;
        if (legacy) {
          // 0.2.0 only shipped the bootstrap step. The verified backup carries its binding.
          assert.ok(!last && digest(row.manifestHash));
          header = { ...row, steps:contractFor([manifestStep]), backupHash:row.manifestHash };
        } else {
          assert.ok(row.schema === 2 && digest(row.backupHash));
          validateContract(row.steps);
          requireMigration(isDeepStrictEqual(row.binding, journalBinding(context)), 'binding-changed');
          if (last) assert.ok(settled(last) && row.steps.length > last.header.steps.length
            && isDeepStrictEqual(row.steps.slice(0, last.header.steps.length), last.header.steps));
          header = row;
        }
        last = { header, states:new Map() };
        ids.add(row.id);
        continue;
      }
      assert.ok(last && row.migrationId === last.header.id);
      if (stepEvents.includes(row.event)) {
        assert.ok(last.header.steps.some(step => step.id === row.step));
        last.states.set(row.step, row.event);
      } else assert.ok(otherEvents.includes(row.event));
    }
    return { last, truncated:journal.truncated };
  });
}
