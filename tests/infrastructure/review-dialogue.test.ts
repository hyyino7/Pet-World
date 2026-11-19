import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, realpathSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCore} from '../../src/core/index.js';
import {readReviewDialogue} from '../../src/core/review-dialogue.js';

test('daily review selects observed turns after re-enabling an old Memory-off session, without backfilling originals', async () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'pet-review-enrollment-')));
  const host = createCore({dataDir: directory, companionId: 'fish', scopeId: 'owner', ownerActorId: 'owner', displayName: 'Fish', character: 'Fixture'});
  try {
    const runtime = host.workspace.runtime, store = runtime.store;
    store.put('memory-session', 'retained-session', {workspaceId: 'bank'});
    store.put('native-memory-enabled', 'retained-session', false); // Retired session-frozen policy.
    store.put('native-session-sources', 'retained-session', ['off', 'observed', 'withdrawn', 'foreign']);
    for (const id of ['off', 'observed', 'withdrawn', 'foreign']) {
      store.put('source', id, {sourceId: id, origin: 'owner_statement', actorId: 'owner', text: id,
        recordedAt: '2026-11-12T04:00:00.000Z', rootSourceIds: []});
      if (id !== 'off') {
        store.put('memory-source-work', id, {workspaceId: id === 'foreign' ? 'another-bank' : 'bank', state: 'acknowledged'});
        store.put('memory-ack', id, {observationId: id});
      }
    }
    const page = await readReviewDialogue(runtime, 'bank', ['retained-session'], {day: '2026-11-12', timeZone: 'Asia/Ho_Chi_Minh'},
      async ids => ids.includes('withdrawn') ? 'ineligible' : 'eligible',
      async () => {assert.fail('Already observed records need no recapture');});
    assert.deepEqual(page.items.map(item => item.text), ['observed']);
    assert.equal(store.get('memory-source-work', 'off'), undefined, 'The off-period original remains outside Bank');
  } finally {await host.close(); rmSync(directory, {recursive: true, force: true});}
});
