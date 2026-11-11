import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../src/core/index.js';
import { emptyHomeState } from '#feiyu-home';
import { createGarden } from '#feiyu-garden';
import { DesktopFeatures } from '../src/desktop/features.js';
import { CompanionLife } from '../src/life/plugin.js';
import type { RoomMood } from '../src/emotion/index.js';

test('the desktop and room use one saved body through pending sleep, arrival, cancellation, restart and rebinding', async t => {
  const base = mkdtempSync(join(tmpdir(), 'companion-body-'));
  t.after(() => rmSync(base, {recursive: true, force: true}));
  const workspaces = ['a', 'b'].map(id => ({id, path: join(base, id), sessionIds: [] as string[]}));
  let target = workspaces[0];
  const now = new Date(2026, 10, 11, 12, 10).getTime();
  t.mock.timers.enable({apis: ['Date'], now});
  for (const workspace of workspaces) {
    const directory = join(workspace.path, '.chatpet/data/life');
    mkdirSync(directory, {recursive: true});
    writeFileSync(join(directory, 'control.json'), JSON.stringify({version: 1, enabled: true}));
    const body = emptyHomeState(now);
    body.lastInteractionAt = now;
    writeFileSync(join(directory, 'home.json'), JSON.stringify(body));
    const garden = createGarden(now);
    garden.care.autoEnabled = false;
    writeFileSync(join(directory, 'garden.json'), JSON.stringify(garden));
  }
  const registry = {get: (id: string) => workspaces.find(w => w.id === id)};
  const host = {native: {}, workspace: {status: () => ({state: 'ready', target})}} as unknown as PetCoreHost;
  const frames: {type: string; value: any}[] = [];
  let mood: RoomMood | undefined = {mood: 78, dims: {happy: 35}};
  let features: DesktopFeatures, life: CompanionLife;
  const context = {
    get(name: string) {
      if (name === 'petLife') return life;
      if (name === 'petDesktop') return {features};
      if (name === 'workspaceRegistry') return registry;
      if (name === 'petEmotion') return {roomSnapshot: () => mood && {...mood, label: 'current mood', updatedAt: now}};
    },
    tools: {register() {}}, on: () => () => {}, effect: () => () => {},
  } as unknown as Context;
  features = new DesktopFeatures(context, host, (type, value) => frames.push({type, value}), () => true, () => false);
  life = new CompanionLife(context, host, 'standard');
  t.after(async () => {await life.close(); await features.close();});
  const desktop = (path: string) => features.request({path, method: 'POST'});
  const rest = () => frames.filter(frame => frame.type === 'sleep').at(-1)?.value;
  const pet = await life.act(target.id, 'pet');
  assert.equal(pet.home.her.kind, 'react_happy');
  assert.equal(pet.home.emotion.source, 'chatpet-emotion');
  mood = {mood: 28, dims: {sad: 35}};
  assert.equal((await life.act(target.id, 'pet')).home.her.kind, 'idle_look');
  mood = undefined;
  assert.equal((await life.roomState(target.id)).emotion, null);

  await desktop('/sleep');
  assert.deepEqual(rest(), {sleeping: false, pending: true});
  assert.equal((await life.act(target.id, 'sleep')).changed, false);
  await desktop('/wake');
  assert.deepEqual(life.restState(target.id), {sleeping: false, pending: false});
  await life.act(target.id, 'sleep');
  t.mock.timers.tick(12_000); // The preceding wake reaction finishes before a new trip starts.
  await life.garden(target.id, 'state');
  const homeFile = join(target.path, '.chatpet/data/life/home.json');
  const arriving = JSON.parse(readFileSync(homeFile, 'utf8')).route.arriveAt;
  t.mock.timers.tick(Math.ceil(arriving - Date.now()) + 1);
  await life.garden(target.id, 'state');
  assert.ok(rest().sleeping);
  assert.equal((await life.roomState(target.id)).her.asleep, true);
  const sleepingLamp = await life.roomAction(target.id, {action:'lamp', on:true});
  assert.equal(sleepingLamp.home.env.lamp, false);
  assert.equal(sleepingLamp.home.room.lamp, false);
  assert.equal(sleepingLamp.home.room.events.at(-1).text, 'off');
  await assert.rejects(life.roomAction(target.id, {action: 'command', room: 'living', spot: 'sofa'}, '大肥鱼'), /睡着了/);
  await life.close();
  life = new CompanionLife(context, host, 'standard');
  await life.roomState(target.id); features.restore();
  assert.ok(rest().sleeping);
  await desktop('/wake');
  assert.equal(JSON.parse(readFileSync(homeFile, 'utf8')).asleep, false);
  assert.equal((await life.roomState(target.id)).room.lamp, true);
  await assert.rejects(life.roomAction(target.id, {action: 'sick'}, '大肥鱼'), /不能/);

  const note = {action: 'talk', text: 'Water the garden together'};
  const [first, second] = await Promise.all([life.roomAction(target.id, note), life.roomAction(target.id, {...note, text: 'Later'})]);
  assert.equal(first.home.room.notes.length, 1);
  assert.equal(second.home.room.notes.length, 2);
  const garden = await life.garden(target.id, 'state');
  assert.equal(garden.garden.plots.length, 8);
  const plotId = garden.garden.plots.find((p: {tilled: boolean}) => !p.tilled).id;
  assert.ok((await life.garden(target.id, 'act', {type: 'till', plotId})).ok);
  const control = {type: 'auto', enabled: false, requestId: 'once'};
  assert.ok((await life.garden(target.id, 'control', control)).ok);
  assert.equal((await life.garden(target.id, 'control', control)).garden.care.receipts.filter((r: {requestId: string}) => r.requestId === 'once').length, 1);
  target = workspaces[1];
  await assert.rejects(life.roomAction('a', note), /切换/);
  assert.equal((await life.roomState(target.id)).room.notes.length, 0);
  target = workspaces[0];
  assert.deepEqual((await life.roomState(target.id)).room.notes.map((n: {text: string}) => n.text), [note.text, 'Later']);
});
