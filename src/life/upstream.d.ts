declare module '#feiyu-home' {
  export const HOME_ACTIONS: readonly string[];
  export const HOME_LAYOUT: {spots: Record<string, Record<string, unknown>>};
  export function emptyHomeState(now?: number): any;
  export function loadHomeState(file: string, now?: number): any;
  export function normalizeHomeState(raw: unknown, now?: number): any;
  export function advanceHomeState(state: any, now?: number, env?: object): {state: any; changed: boolean};
  export function applyHomeAction(state: any, input: object): {state: any; changed: boolean; event: any};
  export function saveHomeState(file: string, state: any, now?: number): any;
  export function homeView(state: any, now?: number, env?: object): any;
  export function buildHomePromptLine(state: any, options?: object): string;
}
declare module '#feiyu-room/room-state' {
  export function normalizeRoomState(input: unknown, now?: number): any;
  export function saveRoomState(file: string, state: any, now?: number): any;
  export function applyRoomAction(state: any, input: object): {state: any; changed: boolean; event: any};
  export function roomView(state: any, now?: number): any;
}
declare module '#feiyu-room/garden-store' {
  export function loadGarden(file: string, now?: number): any;
  export function saveGarden(file: string, state: any): any;
  export function actGarden(file: string, input: object, now?: number): {ok: boolean; message: string; garden: any};
}
declare module '#feiyu-room/garden-autonomy' {
  export function createGardenCaretaker(options: {
    homeFile: string; gardenFile: string; getEnv: () => object;
    storage: {loadGarden: (file: string, now?: number) => any; saveGarden: (file: string, state: any) => any;
      loadHomeState: (file: string, now?: number) => any; saveHomeState: (file: string, state: any, now?: number) => any};
  }): {tick: (now: number) => {state: any; env: any; garden: any; changed: boolean};
    control: (input: object, now: number) => {ok: boolean; status?: string; message: string; garden?: any; home?: any}};
}
declare module '#feiyu-garden' {
  export function createGarden(now?: number): any;
  export function gardenView(state: any, now?: number): any;
}
