import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {until} from './fixture.mjs';

export function interactionFacts(events) {
  return events.flatMap(event => {
    if (event.type !== 'user/message') return [];
    const {source} = event.data;
    if (source?.kind !== 'runtime-context' || source.form !== 'snapshot') return [];
    return source.sections
      .filter(section => section.name === 'chatpet.interactions')
      .flatMap(section => JSON.parse(section.text).facts);
  });
}

export async function confirmBodyFact(f, fact) {
  await f.end(await f.begin());
  const events = JSON.parse(readFileSync(f.logFile('home'), 'utf8'));
  assert.ok(interactionFacts(events).some(row => row.id === fact.id), '原生日志包含被确认的原事实');
  await until(async () => !(await f.body.pendingFacts('world')).length);
}

export async function recallBodyFactAcrossRestart(f, fact) {
  const ownerB = await f.begin('owner-b', {
    id:'recall-question', role:'user', source:{kind:'user'}, content:[{type:'text', text:'What just happened?'}],
  });
  assert.ok(f.service('petMemory').context('owner-b').includes(fact.result.summary), 'B 召回 A 已确认送达的事实');
  const events = f.agent('owner-b').session.snapshotEvents();
  const question = events.find(event => event.type === 'user/message' && event.data.id === 'recall-question');
  assert.ok(!question.data.content[0].text.includes(fact.id));
  assert.ok(!interactionFacts(events).some(row => row.id === fact.id), 'B 不从待送达事实重复读取');
  await f.end(ownerB);
  await f.restart();
  assert.deepEqual(await f.body.pendingFacts('world'), []);
  assert.deepEqual(await f.body.readFacts('world', [fact.id]), [fact]);
  const afterRestart = await f.begin('owner-b', {
    id:'recall-after-restart', role:'user', source:{kind:'user'}, content:[{type:'text', text:'What just happened?'}],
  });
  assert.ok(f.service('petMemory').context('owner-b').includes(fact.result.summary));
  await f.end(afterRestart);
}
