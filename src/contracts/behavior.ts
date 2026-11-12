/** Actual semantic activity is distinct from a surface's animation receipt. */
export interface BehaviorActivity {
  activityId: string | null;
  kind: string;
  phase: 'idle' | 'pending' | 'moving' | 'working' | 'sleeping' | 'completed';
}
export interface BehaviorChange { workspaceId: string; bootId: string; revision: number }
export interface CompanionExpression { sessionId: string; turn: number; action?: string; actionLabel?: string; sticker?: string; feelings?: string[] }
export interface BehaviorPresentation {
  action: string; activity: string; exclusive: boolean; fallback?: boolean;
  feelings: string[]; emotionLabel: string; expression?: CompanionExpression;
}
export interface BehaviorSnapshot extends BehaviorChange {
  storageId: string; autonomyEnabled: boolean; behavior: BehaviorActivity;
  home: any; presentation: BehaviorPresentation; fault: string | null;
}
