import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { CompanionSettings } from '../core/companion-settings.js';
import type { PlaybackReceipt, ReplyIntent } from './index.js';

export type Retention = Pick<CompanionSettings, 'recentActionCount' | 'recentActionMinutes' | 'recentMoodCount' | 'recentMoodHours'>;
interface Feedback { quote: string; at: number; sourceId: string; memories: string[] }
interface Action { id: string; name: string; at: number; status: PlaybackReceipt['status']; feedback: Feedback[] }
interface Mood { mood: string; reason: string; at: number; memories: string[]; action?: string }
export interface RecentExperience { actions: Action[]; moods: Mood[] }
interface Location { id: string; path: string }
type Receipt = Pick<PlaybackReceipt, 'id' | 'name' | 'status' | 'kind'>;
const ROUTINE = new Set(['work', 'idle']);

/** A single bounded row per workspace. No promotions or second copy of the durable Bank. */
export class RecentLedger {
  constructor(private readonly workspace: Location, private readonly retention: () => Retention, private readonly clock = Date.now) {}

  private access(update?: (state: RecentExperience, now: number) => void): RecentExperience {
    const now = this.clock();
    const settings = this.retention();
    const fresh: RecentExperience = { actions: [], moods: [] };
    const root = this.workspace.path;
    if (realpathSync(root) !== root) throw new Error('Workspace moved');
    let directory = root;
    for (const component of ['.chatpet', 'data', 'memory']) {
      directory = join(directory, component);
      if (!existsSync(directory)) {
        if (!update) return fresh;
        if (component === '.chatpet') throw new Error('Bound workspace has no companion directory');
        mkdirSync(directory, { mode: 0o700 });
      }
      if (!lstatSync(directory).isDirectory()) throw new Error('Recent memory directory is not local to workspace');
    }
    const path = join(directory, 'recent-interactions.sqlite');
    if (!existsSync(path) && !update) return fresh;
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      const stat = lstatSync(path + suffix, { throwIfNoEntry: false });
      if (stat && (!stat.isFile() || stat.nlink !== 1)) throw new Error('Unexpected recent memory file');
    }
    const db = new DatabaseSync(path);
    try {
      chmodSync(path, 0o600);
      db.exec('PRAGMA busy_timeout=2000; CREATE TABLE IF NOT EXISTS recent (workspace TEXT PRIMARY KEY, body TEXT NOT NULL); BEGIN IMMEDIATE');
      const row = db.prepare('SELECT body FROM recent WHERE workspace=?').get(this.workspace.id);
      const state: RecentExperience = row ? JSON.parse(row.body as string) : fresh;
      const trim = () => {
        const take = <T extends { at: number }>(items: T[], max: number, age: number) =>
          max && age ? items.filter(item => item.at > now - age).slice(-max) : [];
        state.actions = take(state.actions, settings.recentActionCount, settings.recentActionMinutes * 60_000);
        state.moods = take(state.moods, settings.recentMoodCount, settings.recentMoodHours * 3_600_000);
      };
      trim();
      if (update) { update(state, now); trim(); }
      const body = JSON.stringify(state);
      if (body !== row?.body)
        db.prepare('INSERT INTO recent VALUES (?,?) ON CONFLICT(workspace) DO UPDATE SET body=excluded.body').run(this.workspace.id, body);
      db.exec('COMMIT');
      return state;
    } finally { db.close(); }
  }

  read(): RecentExperience { return this.access(); }
  playback(receipt: Receipt): void {
    if (ROUTINE.has(receipt.kind) || !receipt.name || receipt.name.length > 160 || !receipt.id || receipt.id.length > 160) return;
    this.access((state, now) => {
      const existing = state.actions.find(action => action.id === receipt.id);
      if (existing) {
        if (existing.name === receipt.name && existing.status === 'playing') existing.status = receipt.status;
      } else if (receipt.status === 'playing') {
        state.actions.push({ id: receipt.id, name: receipt.name, at: now, status: 'playing', feedback: [] });
      }
    });
  }

  /** Match model-selected feedback to an observed action and to exact text in the current owner message. */
  reply(intent: ReplyIntent, user: { id: string; text: string } | undefined, memoryIds: string[]): void {
    if (!intent.mood && !intent.feedback) return;
    this.access((state, at) => {
      if (intent.mood) {
        const previous = state.moods.at(-1);
        const related = state.actions.find(a => a.id === intent.feedback?.playbackId);
        const change: Mood = { mood: intent.mood, reason: intent.reason ?? '', at, memories: memoryIds, action: related?.name };
        if (previous?.mood === intent.mood) state.moods[state.moods.length - 1] = change;
        else state.moods.push(change);
      }
      const feedback = intent.feedback;
      if (!feedback || !user || !user.text.includes(feedback.quote)) return;
      const action = state.actions.find(a => a.id === feedback.playbackId);
      if (!action || action.feedback.some(f => f.sourceId === user.id)) return;
      action.feedback = [...action.feedback, { quote: feedback.quote, sourceId: user.id, at, memories: memoryIds }].slice(-3);
    });
  }

  /** Connect earlier situational feedback on this exact action to the confirmed lasting preference. */
  associate(actionName: string, memoryId: string): void {
    this.access(state => {
      const attach = (item: { memories: string[] }) => {
        if (!item.memories.includes(memoryId)) item.memories.push(memoryId);
      };
      for (const action of state.actions) {
        if (action.name === actionName) action.feedback.forEach(attach);
      }
      for (const mood of state.moods) if (mood.action === actionName) attach(mood);
    });
  }

  /** Updating a durable preference also retires its old evidence from short-term use. */
  retire(memoryId: string): void {
    this.access(state => {
      state.moods = state.moods.filter(mood => !mood.memories.includes(memoryId));
      for (const action of state.actions) action.feedback = action.feedback.filter(f => !f.memories.includes(memoryId));
    });
  }
}
