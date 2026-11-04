import type { AdmissionRef, ArtifactRef, EvidenceSource, Page, PageRequest, ServiceCall } from './common.js';

export type ReadingModality = 'metadata' | 'transcript' | 'comments'
  | 'storyboard' | 'sampled_frames' | 'audio' | 'video' | 'browser_playback';
export interface ContentCandidate {
  contentId: string; url: string; title: string; discoverySource: string;
}
export interface ContentEvidence {
  content: ContentCandidate; sources: readonly EvidenceSource[];
  coverage: readonly {
    modality: ReadingModality; state: 'available' | 'inspected' | 'partial' | 'unavailable';
    timeRanges: readonly { fromSeconds: number; toSeconds: number }[];
    limitations: readonly string[];
  }[];
  artifacts: readonly ArtifactRef[];
}
/** Read-only capability. Schedulers, memory and sharing are owned elsewhere. */
export interface BilibiliService {
  describeAccess: ServiceCall<Record<string, never>, {
    authenticated: boolean; accountRef: string | null;
    supportedModalities: readonly ReadingModality[]; limitations: readonly string[];
  }>;
  discover: ServiceCall<PageRequest & {
    admission: AdmissionRef; query?: string; feedRef?: string;
  }, Page<ContentCandidate>>;
  inspect: ServiceCall<{
    admission: AdmissionRef; contentId: string; purpose: string;
    modalities: readonly ReadingModality[];
    maxItems: number; maxDurationMs: number;
  }, ContentEvidence>;
}
