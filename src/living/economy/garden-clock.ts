export interface GardenPause {
  readonly from: number;
  readonly to: number | null;
}

export interface GardenClock {
  readonly enabled: boolean;
  readonly pauses?: readonly GardenPause[];
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function parseGardenPauses(value: unknown, enabled?: boolean): readonly GardenPause[] | undefined {
  if (value === undefined) return;
  const invalid = () => { throw Error('生活开关文件无效：暂停区间无效，已保留原文件'); };
  if (!Array.isArray(value)) return invalid();
  let previousEnd: number | null = 0;
  const pauses: GardenPause[] = [];
  for (const pause of value) {
    if (!pause || typeof pause !== 'object' || Array.isArray(pause)) return invalid();
    const {from, to} = pause;
    if (!isTimestamp(from) || previousEnd === null || from < previousEnd
      || (to !== null && (!isTimestamp(to) || to < from))) return invalid();
    pauses.push({from, to});
    previousEnd = to;
  }
  if (enabled !== undefined && enabled !== (previousEnd !== null)) return invalid();
  return pauses;
}

export function recordGardenPause(pauses: readonly GardenPause[] | undefined, enabled: boolean, now: number): readonly GardenPause[] | undefined {
  const last = pauses?.at(-1);
  if (!enabled) return [...(pauses ?? []), {from: Math.max(now, last?.to ?? 0), to: null}];
  if (!pauses || last?.to !== null) return pauses;
  const closed = pauses.slice(0, -1);
  return now <= last.from ? closed : [...closed, {from: last.from, to: now}];
}

export function advanceGardenClock<T extends {updatedAt: number}>(
  state: T, now: number, clock: GardenClock, advance: (state: T, now: number) => T,
): T {
  if (clock.pauses === undefined && !clock.enabled)
    return advance({...state, updatedAt: Math.max(state.updatedAt, now)}, now);

  for (const {from, to} of clock.pauses ?? []) {
    if (from >= now) break;
    const end = Math.min(to ?? now, now);
    if (end <= state.updatedAt || end <= from) continue;
    if (from > state.updatedAt) state = advance(state, from);
    state = {...state, updatedAt: end};
  }
  return advance(state, now);
}
