import type {
  AdmissionRef, ArtifactRef, OperationReceipt, Revision, ServiceCall,
} from './common.js';

export interface BodyCommand {
  commandId: string; admission: AdmissionRef;
  action: string; targetId?: string; expectedWorldRevision: Revision;
}
export interface BodySnapshot {
  revision: Revision; sceneId: string;
  activityId: string | null; pose: string;
  provenance: 'decoration' | 'virtual_action' | 'external_activity_indicator';
}
export interface DesktopSnapshot {
  protocolVersion: '0.1'; bootId: string; eventCursor: string;
  connected: boolean; chatVisible: boolean; body: BodySnapshot;
  lastConversationMessageId: string | null;
}
export interface DesktopService {
  getSnapshot: ServiceCall<Record<string, never>, DesktopSnapshot>;
  setView: ServiceCall<{ view: 'pet' | 'chat' | 'recent_life' | 'room'; visible: boolean }, DesktopSnapshot>;
  executeBody: ServiceCall<BodyCommand, OperationReceipt>;
  inspectBodyAction: ServiceCall<{ commandId: string }, OperationReceipt>;
  cancelBodyAction: ServiceCall<{ commandId: string; reason: string }, OperationReceipt>;
  reconnect: ServiceCall<{ knownBootId?: string; afterCursor?: string }, DesktopSnapshot>;
}

/** Optional Desktop sub-capability. Desktop remains the sole body/world writer. */
export interface RoomViewService {
  getScene: ServiceCall<Record<string, never>, {
    sceneId: string; revision: Revision;
    entities: readonly {
      entityId: string; label: string; state: string; asset?: ArtifactRef;
      availableActions: readonly string[];
    }[];
    body: BodySnapshot; assets: readonly ArtifactRef[];
  }>;
  interact: ServiceCall<BodyCommand, OperationReceipt>;
}
