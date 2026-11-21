import type { CompanionFactActor } from './interaction.js';

interface ActionMembership {
  care?: {order: number; label: string};
  role?: number;
  plan?: number;
  feedback?: true;
}

export const BODY_ACTIONS = {
  command: {role: 1},
  pet: {role: 2, care: {order: 3, label: '摸摸头'}, feedback: true},
  poke: {role: 3, feedback: true},
  feed: {role: 4, care: {order: 1, label: '免费基础餐食'}, plan: 4, feedback: true},
  water: {role: 5, care: {order: 2, label: '倒杯水'}, plan: 3, feedback: true},
  play: {role: 6, care: {order: 4, label: '一起玩'}, plan: 5, feedback: true},
  talk: {role: 7, feedback: true},
  sleep: {role: 8, care: {order: 5, label: '去睡觉'}, plan: 1},
  wake: {role: 9, care: {order: 6, label: '叫醒'}, plan: 2},
  lamp: {role: 10},
} as const satisfies Record<string, ActionMembership>;

export type BodyAction = keyof typeof BODY_ACTIONS;
type ActionIn<Group extends keyof ActionMembership> = {
  [Action in BodyAction]: Group extends keyof (typeof BODY_ACTIONS)[Action] ? Action : never;
}[BodyAction];

export type CareAction = ActionIn<'care'>;
export type RoleAction = ActionIn<'role'>;
export type PlanBodyAction = ActionIn<'plan'>;
export type FeedbackAction = ActionIn<'feedback'>;

export const BODY_ACTION_NAMES: readonly BodyAction[] = Object.keys(BODY_ACTIONS) as BodyAction[];
const memberships: Readonly<Record<BodyAction, ActionMembership>> = BODY_ACTIONS;

function actionsIn<Group extends keyof ActionMembership>(group: Group,
  orderOf: (membership: NonNullable<ActionMembership[Group]>) => number): readonly ActionIn<Group>[] {
  return BODY_ACTION_NAMES.flatMap(action => {
    const membership = memberships[action][group];
    return membership === undefined ? [] : [{action: action as ActionIn<Group>, order: orderOf(membership)}];
  }).sort((a, b) => a.order - b.order).map(({action}) => action);
}

export const CARE_ACTIONS = actionsIn('care', care => care.order);
export const ROLE_ACTIONS = actionsIn('role', order => order);
export const PLAN_BODY_ACTIONS = actionsIn('plan', order => order);
export const FEEDBACK_ACTIONS = actionsIn('feedback', () => 0);

export function isCareAction(action: unknown): action is CareAction {
  return typeof action === 'string' && (CARE_ACTIONS as readonly string[]).includes(action);
}

export function isPlanBodyAction(action: unknown): action is PlanBodyAction {
  return typeof action === 'string' && (PLAN_BODY_ACTIONS as readonly string[]).includes(action);
}

/** Read-only media hints grounded in the current accepted operation and facts. */
export interface BehaviorAnimationContext {
  slotId?: string;
  /** Real execution/phase onset when known; never a snapshot/window timestamp. */
  startedAt?: number;
  /** Frozen duration of this exact, known media cue in its original execution. */
  presentationFreeze?: {onsetAt: number; pausedMs: number};
  itemId?: string;
  foodSlot?: string;
  interaction?: {
    id: string;
    action: string;
    at: number;
    until: number;
    text: string;
    actor: CompanionFactActor;
  };
}

/** Actual semantic activity is distinct from a surface's animation receipt. */
export interface BehaviorActivity {
  activityId: string | null;
  kind: string;
  /** Persisted phase onset when known; zero never claims a historical start. */
  startedAt?: number;
  phase: 'idle' | 'pending' | 'moving' | 'working' | 'sleeping' | 'completed';
  /** Derived from accepted execution and real content receipts, never activity prose. */
  presentationKind?: 'read' | 'reading-wait' | 'rest';
  readingState?: 'unread' | 'offered' | 'confirmed';
  animationContext?: BehaviorAnimationContext;
}
export interface BehaviorChange { workspaceId: string; bootId: string; revision: number; reason?:'observation'|'transition' }
export interface CompanionExpression { sessionId: string; turn: number; action?: string; actionLabel?: string; sticker?: string; feelings?: string[] }
export interface BehaviorPresentation {
  action: string; activity: string; exclusive: boolean; fallback?: boolean;
  feelings: string[]; emotionLabel: string; expression?: CompanionExpression;
}
export interface BehaviorSnapshot extends BehaviorChange {
  storageId: string; autonomyEnabled: boolean; behavior: BehaviorActivity;
  home: any; presentation: BehaviorPresentation; fault: string | null;
  planned?: PlannedExecution;
  /** Unrounded authoritative metrics for deterministic plan conditions. */
  needs:Record<'hunger'|'thirst'|'energy'|'bladder'|'pain',number>;
}

/** A durable program execution receipt; it is not a visual animation receipt. */
export interface PlannedActivity {
  operationId: string;
  kind: 'hold' | 'room' | 'move' | 'garden' | 'body' | 'economy' | 'read';
  activity: string;
  /** Optional registered portrayal; never grants an operation, object or effect. */
  presentationSlot?: string;
  room?: string;
  spot?: string;
  garden?: Record<string, unknown>;
  action?: PlanBodyAction;
  economy?: {type: 'buy' | 'sell' | 'consume'; itemId: string; quantity: number};
  reading?: {itemId: string; segment: number};
  until?: string;
  /** Durations freeze while paused; explicit calendar deadlines do not. */
  freezeOnPause?: boolean;
}
/** Body's synchronous admission guard ran before the durable execution intent
 * or any effect was submitted. Only this proof permits admission to be retried. */
export interface PlannedAdmissionWait {
  version: 1;
  kind: 'owner-activity';
  operationId: string;
  requestId: string;
  observedAt: string;
}
export class PlannedAdmissionWaitError extends Error {
  constructor(readonly wait: PlannedAdmissionWait) {
    super('身体仍在完成主人已安排的活动，完成后继续原计划');
    this.name = 'PlannedAdmissionWaitError';
  }
}
export interface PlannedExecution {
  operationId: string;
  kind: PlannedActivity['kind'];
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'interrupted' | 'failed';
  phase: 'pending' | 'moving' | 'working' | 'waiting' | 'completed';
  activity: string;
  startedAt: string;
  updatedAt: string;
  until?: string;
  /** Completion contract, derived from the accepted operation. */
  completion?: 'arrival' | 'deadline' | 'explicit-control' | 'receipt';
  reason?: string;
  /** A real program handoff that requires a native model turn, not animation. */
  awaitingInput?: 'reading-content';
  /** A temporary owner interaction retains this accepted operation for safe return. */
  resumeAfterInteraction?: boolean;
}
