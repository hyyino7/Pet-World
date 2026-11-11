import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {keepSelfCopy} from '#dsh-world/self';
import {createLifeStore} from '#dsh-world/life/lifeStore';
import {formatLocalTime} from '#dsh-world/timeContext';
import {readLifeWriting} from '../../dist/src/life/review-writing.js';
import {call, say} from '../native-conversation-scenarios.mjs';

export async function checkLifeReview({ctx, host, workspace, root, life, until, setProgram}) {
  const {id: workspaceId} = workspace;
  const shop = 'The lighthouse has a cherry-red door.';
  const privateText = 'Unenrolled chat about a melon.';
  const self = 'I draw lighthouses in my notebook.';
  const day = formatLocalTime(new Date(), life.timeZone).slice(0,10);
  const directory = join(root, '.chatpet/data/life');
  const scope = () => ({id: workspaceId, directory, sessionIds: workspace.sessionIds, isHome: id => life.isHome(id), timeZone: life.timeZone});
  const textOf = options => options.messages.flatMap(m => m.content.filter(b => b.type==='text').map(b => b.text)).join('\n');
  async function talk(input, existing) {
    const sessionId = existing ?? (await ctx.sessionController.create({workspaceId, agentPreset: 'standard'})).sessionId;
    const {agent} = await ctx.sessionController.resolveAgent(sessionId);
    const id = randomUUID();
    agent.followup({id, role:'user', source:{kind:'user'}, content:[{type:'text', text:input}]});
    await agent.whenIdle();
    const last = agent.session.snapshotEvents().filter(e => e.type === 'turn/end').at(-1);
    assert.equal(last?.data.reason.kind, 'completed', JSON.stringify(last?.data));
    return sessionId;
  }
  let remembered = false;
  setProgram(async function*() {
    if (!remembered) { remembered = true; yield* call('pet_memory_remember', {content: shop, evidence_quotes:[shop]}); }
    else yield* say('I noted the lighthouse.');
  });
  const archiveSession = await talk(shop);
  setProgram(async function*() { yield* say('Fixture response.'); });
  host.native.memoryEnabledForNewSessions = false;
  const privateSession = await talk(privateText);
  host.native.memoryEnabledForNewSessions = true;
  await life.control(workspaceId, true);
  const homeId = (await life.snapshot(workspaceId)).life.homeSessionId;
  await until(() => ctx.agents.get(homeId)?.status === 'idle' && ctx.agents.get(homeId).session.snapshotEvents().some(e=>e.type==='turn/end'), 'review home ready');
  await life.control(workspaceId, false);
  // Use the original pending job and original delivery, selecting the local
  // day containing this fixture's chats without waiting for the evening.
  const store = createLifeStore(directory, life.timeZone), state = store.read();
  delete state.greeting;
  state.review.day = day;
  state.alarm = {at: new Date(Date.now()+3*86400000).toISOString(), note:'fixture', source:'plan', setAt:new Date().toISOString()};
  store.write(state);
  let step = 0, reviewPage;
  setProgram(async function*(options) {
    if (step++ === 0) {
      assert.ok(textOf(options).includes('先用 read_review_dialogue 读 '+day), 'Original review directs the agent to the current eligible dialogue');
      yield* call('read_review_dialogue', {day});
      return;
    }
    const last = options.messages.filter(m=>m.role==='tool').at(-1);
    if (step===2) {
      assert.ok(last && !last.isError, JSON.stringify(last));
      reviewPage = JSON.parse(last.content.filter(b=>b.type==='text').map(b=>b.text).join(''));
      assert.ok(reviewPage.items.some(row=>row.role==='user' && row.text===shop && row.sessionId===archiveSession));
      assert.ok(!reviewPage.items.some(row=>row.sessionId===privateSession || row.role==='user' && row.text.includes('【我的时间】')));
      yield* call('write', {file_path: join(directory,'self.md'), content: self});
    } else if (step===3) {
      yield* call('write', {file_path: join(directory,'diary',day+'.md'), content: 'Today I noticed the lighthouse.'});
    } else yield* say('Review complete.');
  });
  await life.control(workspaceId, true);
  await life.runtime.deliver();
  await until(() => step>=4 && ctx.agents.get(homeId)?.status==='idle', 'native review with dialogue and writing');
  assert.ok(reviewPage?.items.length);
  assert.equal(readFileSync(join(directory,'self.md'),'utf8').trim(), self);
  assert.ok(await readLifeWriting(host,scope(),'diary/'+day+'.md'));
  assert.equal((await readLifeWriting(host,scope(),'self.md'))?.trim(), self);
  keepSelfCopy(join(directory,'self.md'),day);
  assert.equal((await readLifeWriting(host,scope(),'self.history/'+day+'.md'))?.trim(), self);
  setProgram(async function*(options) {
    assert.ok(textOf(options).includes('<我是谁.md>\n'+self), JSON.stringify({message:'A different native conversation sees the upstream self section', selfIncluded:textOf(options).includes(self), roles:options.messages.map(m=>m.role), first:textOf(options).match(/.{0,20}我是谁.{0,70}/g)}));
    yield* say('I have my notebook.');
  });
  const other = await talk('Which hobby is part of your self-description?');
  await talk('Continue our conversation.', other);
  const history = ctx.agents.get(other).session.snapshotEvents();
  assert.equal(history.filter(e=>e.type==='user/message' && e.data.source.kind==='chatpet-recall').length, 1, 'Warm continuation reuses the original recall block');
  const rows = await host.native.memory.connection.call('recall', {query:'lighthouse', limit:16});
  const fact = rows.records.find(r=>r.memory.content===shop && !r.memory.metadata?.pet_context);
  assert.ok(fact, 'Native remember produced a fact with evidence');
  const revision = 'The lighthouse now has a blue door.';
  setProgram(async function*() {yield* say('I heard the correction.');});
  const correction = await talk(revision);
  const inputId = host.workspace.runtime.store.get('native-session-sources',correction)
    .find(id => host.workspace.runtime.store.get('source',id)?.text===revision);
  const corrected = await host.native.memory.connection.call('correct', {memory_id:fact.memory.id, expected_version:fact.memory.version,
    content: revision, sources:[{id:inputId,revision:'1'}], evidence_quotes:[revision]});
  const revised = await host.native.memory.dialogueForDay(workspaceId, workspace.sessionIds, {day,timeZone:life.timeZone});
  assert.ok(!revised.items.some(row=>row.text===shop) && revised.items.some(row=>row.text===revision), 'Correction replaces readable evidence');
  assert.equal(await readLifeWriting(host,scope(),'self.md'), undefined);
  assert.equal(await readLifeWriting(host,scope(),'diary/'+day+'.md'), undefined);
  assert.equal(await readLifeWriting(host,scope(),'self.history/'+day+'.md'), undefined);
  await host.native.memory.connection.call('withdraw', {memory_id:fact.memory.id, expected_version:corrected.version});
  const withdrawn = await host.native.memory.dialogueForDay(workspaceId,workspace.sessionIds,{day,timeZone:life.timeZone});
  assert.ok(!withdrawn.items.some(row=>row.text===revision));
  setProgram(async function*(options) {
    assert.ok(!textOf(options).includes(self), 'A withdrawn source also retires derived self-description');
    yield* say('I can continue.');
  });
  await talk('Hello again.', other);
  await talk('Hello from a fresh chat.');
  assert.equal(existsSync(join(directory,'conversations',day+'.jsonl')),false);
  await life.control(workspaceId, false);
  console.log(JSON.stringify({ok:true, review:'native', dialogueLines:reviewPage.items.length, privateExcluded:true,
    ordinarySelf:true, withdrawalRetiredWriting:true, paidCalls:0}));
}
