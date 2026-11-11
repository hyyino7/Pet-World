import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOME_ACTIONS, HOME_LAYOUT, applyHomeAction, homeView, loadHomeState, normalizeHomeState, saveHomeState } from '#feiyu-home';
import { createGardenCaretaker } from '#feiyu-room/garden-autonomy';
import { actGarden, loadGarden, saveGarden } from '#feiyu-room/garden-store';
import { applyRoomAction, normalizeRoomState, roomView } from '#feiyu-room/room-state';
import { createGarden, gardenView } from '#feiyu-garden';
import type { CompanionEmotion } from '../emotion/plugin.js';

function safeFile(file: string) {
  const stat = lstatSync(file, {throwIfNoEntry: false});
  if (stat && (!stat.isFile() || stat.nlink !== 1)) throw Error('生活数据文件无效，已保留原文件');
  return Boolean(stat);
}

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('动作格式无效');
  return input as Record<string, unknown>;
}
const companionActions = new Set(['command', 'pet', 'poke', 'feed', 'water', 'play', 'talk', 'sleep', 'wake', 'lamp']);

/** All callers enter through CompanionLife's serialized workspace binding.
 * The caretaker checkpoints motion and receipt-bearing garden jobs itself. */
export class CompanionRoom {
  state: any;
  private dirty = false;
  private readonly homeFile: string;
  private readonly gardenFile: string;
  private readonly caretaker: ReturnType<typeof createGardenCaretaker>;
  constructor(directory: string, private emotion: () => ReturnType<CompanionEmotion['roomSnapshot']>) {
    this.homeFile = join(directory, 'home.json');
    this.gardenFile = join(directory, 'garden.json');
    this.state = safeFile(this.homeFile)
      ? normalizeHomeState(record(JSON.parse(readFileSync(this.homeFile, 'utf8')))) : loadHomeState(this.homeFile);
    this.caretaker = createGardenCaretaker({
      homeFile: this.homeFile, gardenFile: this.gardenFile, getEnv: () => ({emotion: this.emotion()}),
      storage: {
        loadHomeState: (_file, now) => normalizeHomeState(this.state, now),
        saveHomeState: (_file, state, now) => this.checkpoint(state, now),
        loadGarden: (file, now) => { safeFile(file); return loadGarden(file, now); },
        saveGarden: (file, state) => { safeFile(file); return saveGarden(file, state); },
      },
    });
  }
  private checkpoint(state: any, now?: number) {
    safeFile(this.homeFile);
    if (state.visitors) state.visitors.lamp = state.lamp && !state.asleep;
    this.state = saveHomeState(this.homeFile, state, now);
    this.dirty = false;
    return this.state;
  }
  flush() { if (this.dirty) this.checkpoint(this.state); }
  tick(now = Date.now()) {
    const result = this.caretaker.tick(now);
    if (result.state !== this.state && result.changed) this.dirty = true;
    this.state = result.state;
    return result.garden;
  }
  view(now = Date.now()) {
    const view = homeView(this.state, now, {emotion: this.emotion()});
    if (view.emotion) view.emotion.source = 'chatpet-emotion';
    const room = roomView(this.state.visitors, now);
    return {...view, room: {...room, lamp: view.env.lamp}};
  }
  act(input: unknown, by = '伙伴', now = Date.now()) {
    const data = record(input), action = data.action;
    if (typeof action !== 'string' || !HOME_ACTIONS.includes(action)) throw Error('未知的房间动作');
    if (by === '大肥鱼' && !companionActions.has(action)) throw Error('角色不能执行这项房间操作');
    if (action === 'command') {
      if (typeof data.room !== 'string' || typeof data.spot !== 'string' || !Object.hasOwn(HOME_LAYOUT.spots, data.room)
          || !Object.hasOwn(HOME_LAYOUT.spots[data.room], data.spot)) throw Error('没有这个房间位置');
      if (by === '大肥鱼' && this.state.asleep) throw Error('她睡着了，先叫醒再去其他地方');
      if (by === '大肥鱼' && this.state.needs.pain >= 0.7) throw Error('她身体不舒服，暂时不能走动');
    }
    if (action === 'talk' && (typeof data.text !== 'string' || !data.text.trim())) throw Error('留言不能为空');
    const text = typeof data.text === 'string' ? data.text.trim().slice(0, 120) : '';
    if (action === 'sleep' && (this.state.asleep || this.state.sleepPending)) {
      return {ok: true, changed: false, event: null, home: this.view(now)};
    }
    const event = {action, text, room: data.room, spot: data.spot, pos: data.pos, free: data.free === true, on: data.on, at: now, by};
    const result = applyHomeAction(this.state, {...event, emotion: this.emotion()});
    if (result.changed) {
      // Keep the original visitors/notes record in the same atomic checkpoint as
      // the corresponding body event. A retry cannot see one without the other.
      if (['visit', 'pet', 'feed', 'play', 'talk', 'lamp'].includes(action)) {
        const roomEvent = action === 'lamp' ? {...event, on: result.state.lamp} : event;
        const visitors = applyRoomAction(normalizeRoomState(this.state.visitors, now), roomEvent);
        result.state.visitors = visitors.state;
      }
      this.checkpoint(result.state, now);
      this.tick(now);
    }
    const home = this.view(now);
    return {ok: true, changed: result.changed, event: result.event, home, room: home.room};
  }
  garden(operation: 'state' | 'act' | 'control', input: unknown, enabled: boolean, now = Date.now()) {
    if (operation === 'state') {
      if (enabled) return {ok: true, garden: this.tick(now)};
      const state = safeFile(this.gardenFile) ? loadGarden(this.gardenFile, now) : createGarden(now);
      return {ok: true, garden: gardenView(state, state.updatedAt)};
    }
    if (!enabled) throw Error('请先开启当前工作区的生活');
    const action = record(input);
    if (operation === 'control') {
      const result = this.caretaker.control(action, now);
      if (result.home?.emotion) result.home.emotion.source = 'chatpet-emotion';
      return result;
    }
    if (operation !== 'act') throw Error('未知的菜园操作');
    safeFile(this.gardenFile);
    this.tick(now);
    const result = actGarden(this.gardenFile, action, now);
    return {...result, garden: this.tick(now)};
  }
}
