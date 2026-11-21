declare module '#feiyu-home' {
  export const HOME_ACTIONS: readonly string[];
  export const HOME_TOUCH_REACTION_MS: Readonly<{pet: number; poke: number}>;
  export const HOME_LAYOUT: {spots: Record<string, Record<string, unknown>>};
  export function emptyHomeState(now?: number): any;
  export function loadHomeState(file: string, now?: number): any;
  export function normalizeHomeState(raw: unknown, now?: number): any;
  export function advanceHomeState(state: any, now?: number, env?: object): {state: any; changed: boolean};
  export function nextHomeBoundary(state:any,now?:number,conditions?:readonly {metric:string;comparison:string;value:number}[],passive?:boolean):number|null;
  export function applyCatalogFood(state: any, input: {effects: Partial<Record<import('../../contracts/behavior.js').BodyMetric, number>>; label: string; source: string; at: number}): {state: any; changed: boolean; event: any};
  export function applyHomeAction(state: any, input: object): {state: any; changed: boolean; event: any};
  export function saveHomeState(file: string, state: any, now?: number): any;
  export function homeView(state: any, now?: number, env?: object): any;
  export function positionOnRoute(route: {points: number[][]; departAt: number; speed: number}, now: number): number[] | null;
  export function currentPosition(state: any, now: number): number[];
  export function buildHomePromptLine(state: any, options?: object): string;
  export function beginPlannedHomeActivity(state:any, input:any, now?:number): any;
  export function pausePlannedHomeActivity(state:any, operationId:string, now?:number): any;
  export function resumePlannedHomeActivity(state:any, input:any, now?:number): any;
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
  export function nextGardenCareBoundary(garden:any,home:any,now?:number,env?:object):number|null;
  export function createGardenCaretaker(options: {
    homeFile: string; gardenFile: string; getEnv: () => object;
    storage: {loadGarden: (file: string, now?: number) => any; saveGarden: (file: string, state: any) => any;
      loadHomeState: (file: string, now?: number) => any; saveHomeState: (file: string, state: any, now?: number) => any};
  }): {tick: (now: number) => {state: any; env: any; garden: any; changed: boolean};
    control: (input: object, now: number) => {ok: boolean; accepted?: boolean; status?: string; message: string; garden?: any; home?: any}};
}
declare module '#feiyu-garden' {
  export const CROPS: readonly any[];
  export const GARDEN_RULES: Record<string, any>;
  export function normalizeGarden(state: any, now?: number, configuration?: any): any;
  export function advanceGarden(state: any, now?: number, configuration?: any): any;
  export function applyGardenAction(state: any, input: any, now?: number, configuration?: any): {ok: boolean; message: string; state: any};
  export function createGarden(now?: number): any;
  export function gardenView(state: any, now?: number): any;
}
