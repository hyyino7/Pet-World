import type { ActivityProposal } from './core.js';
import type { ArtifactRef, MemoryViewStamp, Page, PageRequest, Revision, ServiceCall, Timestamp } from './common.js';

export interface Pursuit {
  pursuitId: string; revision: Revision; purpose: string; interestSourceIds: readonly string[];
  state: 'proposed' | 'active' | 'resting' | 'waiting' | 'closed';
  nextAction: string | null; activityIds: readonly string[];
}
export interface CheckIn {
  checkInId: string; pursuitId: string; revision: Revision; dueAt: Timestamp;
  state: 'scheduled' | 'queued' | 'started' | 'completed' | 'cancelled';
  admittedActivityId?: string;
}
/** Life proposes; Core owns dispatch and user contact admission. */
export interface LifeService {
  proposePursuit: ServiceCall<{
    purpose: string; sourceIds: readonly string[]; nextAction: string | null;
  }, Pursuit>;
  revisePursuit: ServiceCall<{
    pursuitId: string; expectedRevision: Revision;
    state: Pursuit['state']; nextAction: string | null;
  }, Pursuit>;
  listPursuits: ServiceCall<PageRequest, Page<Pursuit>>;
  proposeActivity: ServiceCall<{ pursuitId: string; expectedRevision: Revision }, ActivityProposal>;
  scheduleCheckIn: ServiceCall<{
    pursuitId: string; expectedRevision: Revision; dueAt: Timestamp;
  }, CheckIn>;
  cancelCheckIn: ServiceCall<{ checkInId: string; expectedRevision: Revision }, CheckIn>;
  getCheckIn: ServiceCall<{ pursuitId: string }, CheckIn | null>;
  reportCheckIn: ServiceCall<{
    checkInId: string; expectedRevision: Revision; admittedActivityId: string;
    state: 'queued' | 'started' | 'completed' | 'cancelled';
  }, CheckIn>;
  proposeReview: ServiceCall<{ sourceIds: readonly string[] }, {
    reviewId: string; activityProposal: ActivityProposal;
  }>;
  getRecentLife: ServiceCall<PageRequest, Page<{
    entryId: string; sourceIds: readonly string[]; summary: string;
    kind: 'external_experience' | 'virtual_experience' | 'rest' | 'intention';
    freshness: 'current' | 'stale'; artifact: ArtifactRef | null; memoryView: MemoryViewStamp;
  }>>;
}
