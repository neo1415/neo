// Q-TOOLS area: Q's artifacts and tools (atlas SC-124, 126, 127, 128, 130, 136; vision V06, V07, V26).
// Charts, maps and diagrams store only what was asked (kind + scope), never a copy of the data: the viewer reads the
// live store through the privacy filters every time it renders, so a withdrawn consent changes the chart at once.
// Web pages, downloads and voice are simulated: nothing is fetched, downloaded, rendered as video or played as audio.
import type { World } from '../../mock/world';

export type ArtKind = 'CHART' | 'MAP' | 'DIAGRAM' | 'VIDEO' | 'BROWSE' | 'DOWNLOAD';
export interface QArtifact {
  id: string; kind: ArtKind; owner: string; tenant: string; title: string; at: string;
  /** What was asked: e.g. { mandate: 'm_backend' } for a chart, { url } for a page, { file } for a download. */
  scope: Record<string, string>;
  /** Simulated build time in ms (video storyboard, download scan); progress is derived from `at`, never faked by a timer. */
  buildMs: number;
  /** The person's own outcome when the request could not be met (shown honestly, no data). */
  denied?: string;
  sources: string[];
  /** TEAM: everyone in the organisation may open it; ME: only the person who asked. */
  visibility: 'ME' | 'TEAM';
}
export interface QSource {
  id: string; tenant: string; key: string; kind: 'TALENTQ' | 'WEB' | 'FILE'; title: string; domain?: string; url?: string;
  /** When Q (simulated) fetched it, and when its author published or last updated it. */
  fetchedAt: string; publishedAt?: string; licence: string;
  visibility: 'ME' | 'TEAM'; addedBy: string; usedIn: string[];
}
export interface VoiceSession { id: string; owner: string; text: string; startedAt: string; stoppedAt?: number; stopReason?: string; resumedFrom?: number; resumedAt?: string; artifactId?: string }
export interface Handoff { id: string; owner: string; artifactId: string; at: string; from: 'desktop'; position: number; pickedUpAt?: string }
export interface ConflictDecision { decision: 'RANGE' | 'KEEP_BOTH' | 'ASK_COLLEAGUE'; by: string; at: string }

export interface QToolsState {
  artifacts: QArtifact[];
  sources: QSource[];
  voice: VoiceSession[];
  handoffs: Handoff[];
  conflicts: Record<string, ConflictDecision>;
  /** Extra domains a tenant asked to allow (simulated request to an admin; never auto-approved). */
  allowRequests: { tenant: string; domain: string; by: string; at: string }[];
  /** Files opened after a clean scan (download artifact ids). */
  opened: string[];
}
export const area = { id: 'q-tools', init: (): QToolsState => ({ artifacts: [], sources: [], voice: [], handoffs: [], conflicts: {}, allowRequests: [], opened: [] }) };
export const qt = (w: World) => {
  const s = (w.areas['q-tools'] ?? area.init()) as QToolsState;
  return s;
};
/** Writable slice (creates it on older stored worlds). */
export const qtw = (w: World) => (w.areas['q-tools'] ??= area.init()) as QToolsState;
