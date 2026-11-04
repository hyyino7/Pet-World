import type {
  ArtifactRef, MemoryUseLease, MemoryViewStamp, ModuleId, OperationReceipt,
  Revision, ServiceCall, Timestamp,
} from './common.js';

export interface ArtifactInfo {
  ref: ArtifactRef; revision: Revision; producer: ModuleId;
  companionId: string; scopeId: string;
  kind: 'asset' | 'content' | 'checkpoint' | 'export' | 'backup' | 'withdrawal_guard';
  byteLength: number; createdAt: Timestamp;
  state: 'available' | 'released' | 'purged'; memoryView: MemoryViewStamp | null;
  holders: readonly { module: ModuleId; recordId: string }[];
}
export type ArtifactReadAccess =
  | { kind: 'ordinary'; purpose: 'presentation' | 'execution' | 'export' | 'inspection';
      memoryUse: MemoryUseLease | null }
  | { kind: 'maintenance'; purpose: 'backup' | 'restore'; transactionId: string;
      authorizationRef: string };
/** Core-owned metadata, content and retention. No arbitrary filesystem paths. */
export interface ResourceService {
  beginUpload: ServiceCall<{
    producer: ModuleId; mediaType: string; kind: ArtifactInfo['kind'];
    byteLength: number; retentionPolicyRef: string;
  }, { uploadId: string; maxChunkBytes: number; expiresAt: Timestamp }>;
  writeChunk: ServiceCall<{
    uploadId: string; offset: number; dataBase64: string; chunkDigest: string;
  }, { nextOffset: number }>;
  commitUpload: ServiceCall<{
    uploadId: string; expectedContentDigest: string; memoryView: MemoryViewStamp | null;
    holder: { module: ModuleId; recordId: string };
  }, ArtifactInfo>;
  abortUpload: ServiceCall<{ uploadId: string }, { aborted: boolean }>;
  inspectArtifact: ServiceCall<{ artifact: ArtifactRef }, ArtifactInfo>;
  readArtifact: ServiceCall<{
    artifact: ArtifactRef; offset: number; maxBytes: number; access: ArtifactReadAccess;
  }, { dataBase64: string; nextOffset: number | null; contentDigest: string }>;
  retainArtifact: ServiceCall<{
    artifact: ArtifactRef; expectedRevision: Revision; holder: { module: ModuleId; recordId: string };
  }, ArtifactInfo>;
  releaseArtifact: ServiceCall<{
    artifact: ArtifactRef; expectedRevision: Revision; holder: { module: ModuleId; recordId: string };
  }, ArtifactInfo>;
  collectGarbage: ServiceCall<{ policyRef: string; before: Timestamp }, OperationReceipt>;
}
