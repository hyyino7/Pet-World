import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOME_ACTIONS, HOME_LAYOUT, applyHomeAction, homeView, loadHomeState, normalizeHomeState, saveHomeState } from '#feiyu-home';
import { createGardenCaretaker } from '#feiyu-room/garden-autonomy';
import { actGarden, loadGarden, saveGarden } from '#feiyu-room/garden-store';
import { applyRoomAction, normalizeRoomState, roomView } from '#feiyu-room/room-state';
import type { CompanionEmotion } from '../emotion/plugin.js';
import { randomUUID } from 'node:crypto';

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

/** All callers enter through CompanionBehavior's serialized workspace binding.
 * The caretaker checkpoints motion and receipt-bearing garden jobs itself. */
export class CompanionRoom {
  state: any;
  private dirty = false;
  private readonly homeFile: string;
  private readonly gardenFile: string;
  private readonly caretaker: ReturnType<typeof createGardenCaretaker>;
  private autonomous = false;
  constructor(directory: string, private emotion: () => ReturnType<CompanionEmotion['roomSnapshot']>) {
    this.homeFile = join(directory, 'home.json');
    this.gardenFile = join(directory, 'garden.json');
    this.state = safeFile(this.homeFile)
      ? normalizeHomeState(record(JSON.parse(readFileSync(this.homeFile, 'utf8')))) : loadHomeState(this.homeFile);
    this.caretaker = createGardenCaretaker({
      homeFile: this.homeFile, gardenFile: this.gardenFile, getEnv: () => ({emotion: this.emotion(),
        autonomy: this.autonomous && !this.requestedActive(), passive: this.autonomous}),
      storage: {
        loadHomeState: (_file, now) => normalizeHomeState(this.state, now),
        saveHomeState: (_file, state, now) => this.checkpoint(state, now),
        loadGarden: (file, now = Date.now()) => {
          safeFile(file); const garden = loadGarden(file, now);
          if (!this.autonomous) garden.updatedAt = now;
          return garden;
        },
        saveGarden: (file, state) => { safeFile(file); return saveGarden(file, state); },
      },
    });
  }
  private requestedActive(now = Date.now()) {
    return this.state.companionAction && !this.state.companionAction.completedAt &&
      Boolean(this.state.route || this.state.dwell || this.state.sleepPending || this.state.freeTarget ||
        this.state.command || this.state.reactionUntil > now);
  }
  private stopAutomatic(now: number) {
    if (this.requestedActive(now) || this.state.route?.target?.gardenJobId || this.state.dwell?.target?.gardenJobId) return;
    if (this.state.route || this.state.dwell || this.state.sleepPending) {
      this.state.route = null; this.state.dwell = null; this.state.sleepPending = false; this.state.walking = false;
      if (!this.state.asleep) {this.state.kind = 'idle'; this.state.activity = '自主活动已暂停';}
      this.checkpoint(this.state, now);
    }
  }
  setAutonomy(enabled: boolean, now = Date.now()) {
    if (enabled === this.autonomous) return;
    if (!this.autonomous) this.tick(now);
    this.autonomous = enabled;
    if (!enabled) this.stopAutomatic(now);
    this.tick(now); this.flush();
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
    if (!this.autonomous) this.stopAutomatic(now);
    const result = this.caretaker.tick(now);
    if (result.state !== this.state && result.changed) this.dirty = true;
    this.state = result.state;
    const request = this.state.companionAction;
    if (request && !request.completedAt && !this.requestedActive(now)) {
      request.completedAt = now;
      if (!this.autonomous && ['eat','drink','play'].includes(this.state.kind)) {
        this.state.kind = 'idle'; this.state.activity = '安静地待着';
      }
      this.checkpoint(this.state, now);
    }
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
    this.stopAutomatic(now);
    const event = {action, text, room: data.room, spot: data.spot, pos: data.pos, free: data.free === true, on: data.on, at: now, by};
    const result = applyHomeAction(this.state, {...event, emotion: this.emotion()});
    if (result.changed) {
      // Additive host attribution survives the original normalizer. Native
      // route/dwell and garden receipts remain the actual execution authority.
      if ((!result.state.route && !result.state.dwell) || ['command','go','place','sleep','wake'].includes(action)) {
        result.state.companionAction = {id: randomUUID(), action, startedAt: now, completedAt: 0};
      }
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
  garden(operation: 'state' | 'act' | 'control', input: unknown, _legacyLifeEnabled = true, now = Date.now()) {
    if (operation === 'state') {
      return {ok: true, garden: this.tick(now)};
    }
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
