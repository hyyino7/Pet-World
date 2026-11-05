// Scripted model protocol fixtures only. These never classify production user text.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function* say(text) {
  yield { type: 'block-start', index: 0, blockType: 'text' };
  yield { type: 'text-delta', index: 0, text };
  yield { type: 'block-end', index: 0, block: { type: 'text', text } };
  yield { type: 'finish', reason: { kind: 'stop' } };
}
async function* call(name, args) {
  // Deliberate commentary must never be concatenated into the final delivered reply.
  yield { type: 'block-start', index: 0, blockType: 'text' };
  yield { type: 'text-delta', index: 0, text: 'INTERNAL_FIXTURE_COMMENTARY' };
  yield { type: 'block-end', index: 0, block: { type: 'text', text: 'INTERNAL_FIXTURE_COMMENTARY' } };
  const block = { type: 'tool-call', id: randomUUID(), name, arguments: JSON.stringify(args) };
  yield { type: 'block-start', index: 1, blockType: 'tool-call' };
  yield { type: 'tool-call-delta', index: 1, id: block.id, name, argumentsDelta: block.arguments };
  yield { type: 'block-end', index: 1, block };
  yield { type: 'finish', reason: { kind: 'tool-calls' } };
}
const lastTool = options => {
  const message = options.messages.filter(item => item.role === 'tool').at(-1);
  assert.ok(message && !message.isError, JSON.stringify(message));
  return JSON.parse(message.content.filter(block => block.type === 'text').map(block => block.text).join('\n'));
};
const plain = options => options.messages.flatMap(message => message.content.filter(block => block.type === 'text').map(block => block.text)).join('\n');
const unwrap = result => { if (!result.ok) assert.fail(JSON.stringify(result.error)); return result.value; };

export async function exerciseConversation({ ctx, getHost, restart, setProgram, target, binding, request, events }) {
  const inputs = []; let sequence = 0;
  const send = async text => {
    const input = { channel: target.channel, binding: { bindingId: binding.bindingId, revision: binding.revision },
      externalMessageId: `chain-${++sequence}`, senderId: target.ownerExternalId, receivedAt: new Date().toISOString(), parts: [{ kind: 'text', text }] };
    inputs.push(input);
    return unwrap(await getHost().chat(request(), input));
  };
  const label = `project-${randomUUID()}`, priceA = 7 + Math.floor(Math.random() * 5), priceB = priceA + 3;
  const data = `${label}: Cedar costs ${priceA} per unit and needs 5 days; Willow costs ${priceB} and needs 2 days.`;
  setProgram(async function* () { yield* say(`I have the supplied facts for ${label}.`); });
  const introduced = await send(data);
  const progressEvents = [];
  const detach = ctx.on('pet/matter.progress', progress => progressEvents.push(progress));
  let stage = 0;
  setProgram(async function* (options) {
    assert.ok(plain(options).includes(data), 'Second turn must include earlier supplied facts');
    if (stage++ === 0) return yield* call('pet_matter_create', { requestedOutcome: `Compare the two offers for ${label}`, nextAction: 'Check constraints and compute totals' });
    const last = lastTool(options), matter = last.commitment;
    if (stage === 2) return yield* call('pet_matter_progress', { commitmentId: matter.commitmentId, expectedRevision: matter.revision,
      summary: `The unit-price difference is ${priceB - priceA}; delivery differs by 3 days.`, nextAction: 'Obtain the maximum delivery time' });
    if (stage === 3) return yield* call('pet_matter_update', { commitmentId: matter.commitmentId, expectedRevision: matter.revision,
      state: 'waiting', waitingReason: 'Maximum acceptable delivery time is missing', nextAction: 'Ask the owner for the delivery limit', summary: 'Comparison is waiting for the owner’s delivery constraint' });
    yield* say('What is the maximum acceptable delivery time?');
  });
  const waiting = await send('Please compare the offers and retain the work as a matter.');
  assert.equal(waiting.activity.receipt.state, 'completed'); assert.equal(waiting.commitments.length, 1);
  assert.equal(waiting.commitments[0].state, 'waiting'); assert.equal(waiting.progress.length, 3);
  assert.deepEqual(progressEvents.slice(-3).map(p => p.kind), ['created', 'progress', 'updated']);
  const matterId = waiting.commitments[0].commitmentId;
  assert.ok(waiting.reply.parts[0].text.includes('delivery time'));

  // Dispose/recreate the production Core plugin, retaining its SQLite state and native logs.
  await restart(); stage = 0;
  const quantity = 4 + Math.floor(Math.random() * 4);
  const expected = `${quantity} units: Willow costs ${quantity * priceB}; Cedar costs ${quantity * priceA} but misses the 3-day limit. Choose Willow from the supplied facts.`;
  setProgram(async function* (options) {
    assert.ok(plain(options).includes(label), 'Restarted context must retain the same conversation');
    if (stage++ === 0) return yield* call('pet_matter_list', {});
    const last = lastTool(options);
    if (stage === 2) {
      assert.ok(last.commitments.some(m => m.commitmentId === matterId));
      return yield* call('pet_matter_read', { commitmentId: matterId });
    }
    const matter = last.commitment;
    if (stage === 3) return yield* call('pet_matter_progress', { commitmentId: matter.commitmentId, expectedRevision: matter.revision,
      summary: `Applied the 3-day limit and computed both totals for ${quantity} units.`, nextAction: 'Store the comparison and explain the choice' });
    if (stage === 4) return yield* call('pet_matter_finish', { commitmentId: matter.commitmentId, expectedRevision: matter.revision,
      result: expected, evidenceSourceIds: matter.sourceIds });
    assert.equal(matter.state, 'completed'); assert.equal(last.resultSource.text, expected);
    yield* say(last.resultSource.text);
  });
  const completed = await send(`Delivery must be within 3 days. Compare ${quantity} units and finish the earlier comparison.`);
  assert.equal(completed.activity.receipt.state, 'completed'); assert.equal(completed.commitments[0].commitmentId, matterId);
  assert.equal(completed.commitments[0].state, 'completed'); assert.equal(completed.reply.parts[0].text, expected);
  assert.equal(completed.contact.intent.parts[0].text, expected); assert.equal(completed.contact.target.recipientExternalId, target.ownerExternalId);
  assert.ok(!completed.reply.parts[0].text.includes('INTERNAL_FIXTURE_COMMENTARY'));
  assert.ok(events.some(event => event.type === 'tool/result'));
  const rows = unwrap(await getHost().services.core.listCommitmentProgress(request(), { commitmentId: matterId, limit: 50 }));
  assert.deepEqual(rows.items.map(p => p.kind), ['created', 'progress', 'updated', 'progress', 'result']);
  const countBefore = unwrap(await getHost().services.core.listCommitments(request(), { limit: 100 })).items.length;
  setProgram(async function* () { yield* say('That is ordinary conversation, so no matter was created.'); });
  await send('“任务、完成、取消”只是我正在讨论的三个词，不是在给你布置事项。');
  assert.equal(unwrap(await getHost().services.core.listCommitments(request(), { limit: 100 })).items.length, countBefore);
  detach();

  // Production native guard: one tool is admitted, the next is denied, then step admission stops.
  await restart({ maxSteps: 2, maxToolCalls: 1 }); stage = 0;
  setProgram(async function* (options) {
    if (stage++ === 0) return yield* call('pet_matter_create', { requestedOutcome: 'Work bounded by the test allowance', nextAction: 'Perform one further step' });
    const matter = lastTool(options).commitment;
    yield* call('pet_matter_progress', { commitmentId: matter.commitmentId, expectedRevision: matter.revision, summary: 'This mutation must be denied', nextAction: 'No further allowed tools' });
  });
  const limited = await send('Start this bounded analytical work and honor the configured execution limits.');
  assert.equal(limited.activity.receipt.state, 'failed'); assert.equal(limited.reply, null);
  assert.equal(limited.commitments[0].state, 'waiting');
  assert.deepEqual(limited.progress.map(p => p.kind), ['created', 'interrupted']);

  // Withdraw a historical dependency after the first tool. No next model step or reply may use it.
  await restart(); let revoked = false; stage = 0;
  const oldSource = introduced.activity.proposal.sourceIds[0];
  getHost().setHistoryGuard({ inspect: ids => revoked && ids.includes(oldSource) ? 'ineligible' : 'eligible' });
  const revoke = ctx.on('pet/matter.progress', progress => { if (progress.kind === 'created') revoked = true; });
  setProgram(async function* () {
    assert.equal(stage++, 0, 'No second model call is permitted after source withdrawal');
    yield* call('pet_matter_create', { requestedOutcome: 'An analysis depending on prior supplied material', nextAction: 'Check a later step' });
  });
  const withdrawn = await send('Continue an analysis of the previously supplied offers.');
  assert.equal(withdrawn.activity.receipt.state, 'failed'); assert.equal(withdrawn.reply, null); assert.equal(stage, 1);
  const history = unwrap(await getHost().services.core.listConversation(request(), { limit: 100 }));
  assert.equal(history.items.find(message => message.sourceId === oldSource).visibility, 'withheld');
  revoke(); getHost().setHistoryGuard(null); setProgram(null);
  return { scenario: 'conversation-matter-progress-reply', status: 'passed', restarted: true,
    progressRecords: rows.items.length, result: expected, checkedDenials: ['native tool/step budgets', 'mid-turn source withdrawal'], semanticModelAcceptance: false };
}
