import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Result } from '../src/contracts/common.js';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
import { createCore, type CoreConfig, type NativeDriver } from '../src/core/index.js';
import { id } from '../src/core/storage.js';

const unwrap = <T>(result: Result<T>): T => { if (!result.ok) assert.fail(JSON.stringify(result.error)); return result.value; };
const fixture = () => {
  const directory = mkdtempSync(join(tmpdir(), 'pet-dialogue-'));
  const config: CoreConfig = { dataDir: directory, companionId: id('companion'), scopeId: id('scope'), ownerActorId: id('owner'), displayName: 'Custom name', character: 'Custom character' };
  return { config, clean: () => rmSync(directory, { recursive: true, force: true }) };
};
async function channel(host: ReturnType<typeof createCore>) {
  const target = { channel: { kind: 'dsh' as const, sceneId: id('scene') }, transportAccountRef: id('connection'), transportAccountId: id('account'), ownerExternalId: id('owner') };
  const binding = unwrap(await host.services.core.bindChannel(host.operator.request(id('request')), { ...target, expectedRevision: null, pairingProofRef: host.operator.issuePairingProof(target) }));
  return (text: string) => ({ channel: target.channel, binding: { bindingId: binding.bindingId, revision: binding.revision },
    externalMessageId: id('external'), senderId: target.ownerExternalId, receivedAt: new Date().toISOString(), parts: [{ kind: 'text' as const, text }] });
}
const fixedDriver = (run: NativeDriver['run']): NativeDriver => ({ kind: 'test', run,
  inspect: async () => ({ state: 'unknown', text: '', hostTurnIds: [] }), close: async () => {} });
const done = (text = 'A generated response') => ({ state: 'completed' as const, text, hostTurnIds: ['1'] });

test('dialogue continuity survives Core restart with supplied identity and bounded Core-owned history', async () => {
  const f = fixture(), seen: Parameters<NativeDriver['run']>[0][] = [];
  const driver = fixedDriver(async input => { seen.push(input); return done(`reply-${seen.length}`); });
  let host = createCore(f.config, driver);
  try {
    const message = await channel(host);
    const first = unwrap(await host.chat(host.operator.request('one'), message('A rare supplied fact: 37 blue boxes.')));
    await host.close(); host = createCore(f.config, driver);
    const second = unwrap(await host.chat(host.operator.request('two'), message('Continue that earlier conversation.')));
    assert.ok(seen[1].context?.includes('37 blue boxes')); assert.ok(seen[1].context?.includes('reply-1'));
    assert.equal(seen[1].character, 'Custom name\nCustom character');
    assert.notEqual(seen[0].sessionId, seen[1].sessionId, 'Logical conversation is separate from disposable native execution');
    const result = unwrap(await host.services.core.getSource(host.operator.request('audit'), { sourceId: second.reply!.sourceId, purpose: 'owner_audit' }));
    assert.ok(result.rootSourceIds.includes(first.reply!.sourceId), 'Derived result must retain history lineage');
  } finally { await host.close(); f.clean(); }
});

test('withdrawal filters dependent dialogue, and provider loss cannot re-enable old material', async () => {
  const f = fixture(), seen: string[] = [];
  const driver = fixedDriver(async input => { seen.push(input.context ?? ''); return done(); });
  let host = createCore(f.config, driver);
  try {
    const message = await channel(host), secretInput = message('private-source-content');
    const first = unwrap(await host.chat(host.operator.request('first'), secretInput));
    const sourceId = first.activity.proposal.sourceIds[0];
    host.setHistoryGuard({ inspect: ids => ids.includes(sourceId) ? 'ineligible' : 'eligible' });
    const history = unwrap(await host.services.core.listConversation(host.operator.request('history'), { limit: 50 }));
    assert.ok(history.items.every(item => item.visibility === 'withheld' && item.parts.length === 0));
    const second = unwrap(await host.chat(host.operator.request('new'), message('A separate new conversation input.')));
    assert.equal(second.activity.receipt.state, 'completed'); assert.ok(!seen[1].includes('private-source-content'));
    host.setHistoryGuard(null);
    const blocked = await host.chat(host.operator.request('offline'), message('Another new input.'));
    assert.equal(blocked.ok, false); assert.equal(seen.length, 2);
    await host.close(); host = createCore(f.config, driver);
    assert.ok(unwrap(await host.services.core.listConversation(host.operator.request('after-restart'), { limit: 50 })).items.every(item => item.visibility === 'withheld'));
  } finally { await host.close(); f.clean(); }
});

test('admitted model tools create, report and finish a matter without owner privileges or fabricated evidence', async () => {
  const f = fixture();
  const driver = fixedDriver(async input => {
    const tools = input.tools!;
    assert.ok(!tools.some(tool => /identity|policy|binding|source|shell/.test(tool.name)));
    const invoke = async (name: string, args: unknown, callId: string, sessionId = input.sessionId) => {
      const exec = { callId, agent: { id: sessionId }, signal: input.signal } as unknown as ToolRunContext;
      return JSON.parse(await tools.find(tool => tool.name === name)!.execute(args, exec) as string);
    };
    await assert.rejects(invoke('pet_matter_create', { requestedOutcome: 'Unauthorized', nextAction: 'No action' }, 'foreign', 'another-session'));
    const args = { requestedOutcome: 'A dynamically supplied analytical outcome', nextAction: 'Compare supplied material' };
    const created = await invoke('pet_matter_create', args, 'create');
    assert.equal((await invoke('pet_matter_create', args, 'create')).progress.progressId, created.progress.progressId, 'Replay must not duplicate a matter/progress');
    const progressed = await invoke('pet_matter_progress', { commitmentId: created.commitment.commitmentId, expectedRevision: created.commitment.revision, summary: 'Computed a comparison from supplied values', nextAction: 'Store the result' }, 'progress');
    await assert.rejects(invoke('pet_matter_finish', { commitmentId: progressed.commitment.commitmentId, expectedRevision: progressed.commitment.revision, result: 'Invented provenance', evidenceSourceIds: ['not-an-admitted-source'] }, 'forged'));
    const finished = await invoke('pet_matter_finish', { commitmentId: progressed.commitment.commitmentId, expectedRevision: progressed.commitment.revision, result: 'An actual generated analysis result', evidenceSourceIds: created.commitment.sourceIds }, 'finish');
    assert.equal(finished.resultSource.origin, 'model_interpretation'); return done(finished.resultSource.text);
  });
  const host = createCore(f.config, driver);
  try {
    const message = await channel(host), turn = unwrap(await host.chat(host.operator.request('request'), message('Please do this analytical work.')));
    assert.equal(turn.commitments.length, 1); assert.equal(turn.commitments[0].state, 'completed');
    assert.deepEqual(turn.progress.map(p => p.kind), ['created', 'progress', 'result']);
    assert.equal(turn.reply!.visibility, 'available'); assert.equal(turn.contact!.intent.parts[0].kind, 'text');
  } finally { await host.close(); f.clean(); }
});

test('a source read through a matter tool joins the next-step and final-publication eligibility checks', async () => {
  const f = fixture(); f.config.conversation = { maxHistoryMessages: 0 };
  let revoked = false, matterId = '', oldSourceId = '';
  const driver = fixedDriver(async input => {
    assert.ok(!input.context!.includes('old material outside the projected window'));
    const tool = input.tools!.find(t => t.name === 'pet_matter_read')!;
    await tool.execute({ commitmentId: matterId }, { callId: 'read', agent: { id: input.sessionId }, signal: input.signal } as unknown as ToolRunContext);
    revoked = true;
    assert.throws(() => input.validate!(), /eligible/, 'Tool reads must expand the live execution dependency set');
    return done('This old material must not be published');
  });
  const host = createCore(f.config, driver);
  try {
    oldSourceId = id('source');
    unwrap(await host.services.core.recordSource(host.operator.request('source'), { sourceId: oldSourceId, origin: 'owner_statement',
      actorId: f.config.ownerActorId, recordedAt: new Date().toISOString(), rootSourceIds: [], text: 'old material outside the projected window' }));
    matterId = unwrap(await host.services.core.createCommitment(host.operator.request('matter'), { requestedOutcome: 'Read the old supplied material', sourceIds: [oldSourceId] })).commitmentId;
    host.setHistoryGuard({ inspect: ids => revoked && ids.includes(oldSourceId) ? 'ineligible' : 'eligible' });
    const message = await channel(host), turn = unwrap(await host.chat(host.operator.request('run'), message('Look up the earlier matter.')));
    assert.equal(turn.activity.receipt.state, 'failed'); assert.equal(turn.reply, null); assert.equal(turn.contact, null);
  } finally { await host.close(); f.clean(); }
});

test('ordinary chat has no keyword-based matter creation', async () => {
  const f = fixture(), host = createCore(f.config, fixedDriver(async () => done('Ordinary conversation.')));
  try {
    const message = await channel(host);
    for (const text of ['任务 完成 取消', 'create a task, finish, cancel — these are quoted terms', '建立事项只是这段材料的标题']) {
      const turn = unwrap(await host.chat(host.operator.request(id('request')), message(text)));
      assert.equal(turn.commitments.length, 0);
    }
    assert.equal(unwrap(await host.services.core.listCommitments(host.operator.request('list'), { limit: 100 })).items.length, 0);
  } finally { await host.close(); f.clean(); }
});
