import test from 'node:test';
import assert from 'node:assert/strict';
import {factDomainOf} from '../../dist/src/contracts/interaction.js';
import {fixture} from '../behavior-list/fixture.mjs';

test('World 事实编号只从起始前缀识别领域', async t => {
  const f = await fixture(t, {life:false});
  const {fact} = await f.body.act('world', 'water', 'fact-prefix');
  const world = f.body.worldFacts;
  assert.equal(factDomainOf(fact.id), 'body');
  assert.deepEqual(await world.readFacts('world', [fact.id]), [fact]);

  for (const id of ['body', 'synthetic-fact', `old-${fact.id}`]) {
    assert.equal(factDomainOf(id), undefined);
    await assert.rejects(world.readFacts('world', [id]), {
      detail:{code:'INVALID_ARGUMENT',message:'未知互动事实所属区',effect:'none',retry:'never'},
    });
  }
});
