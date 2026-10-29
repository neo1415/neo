// Candidate-authorised video and voice evidence (audit addendum §F). Only media the candidate explicitly selects
// is processed. Transcription happens once per content hash; reviews are cached by contentHash + rubric version
// (scoped to the parts the organisation was shown, so a review never rests on a part it can't see).
import type { World } from '../../mock/world';
import type { MediaEvidence, MediaReview } from '../domain';

export interface MediaState {
  items: MediaEvidence[]; reviews: MediaReview[];
  briefings: Record<string, { jobId: string; duration: number; chapters: { t: number; label: string }[]; transcript: { t: number; text: string }[] }>;
  // ---- MEDIA area additions (all optional so stored worlds from before stay valid) ----
  /** Transcripts by content hash: transcribed once, reused for any later copy of the same file. */
  transcripts?: Record<string, { at: string; lines: number }>;
  /** Why a link was refused or a fetch failed, per media item (shown to the candidate in plain words). */
  notes?: Record<string, { kind: 'UNSAFE_LINK' | 'FETCH_FAILED' | 'PAUSED'; text: string }>;
  /** Media items each recruiter has opened (for "new walkthrough shared" notices). */
  seen?: Record<string, string[]>;
  /** Demo: drop the connection at this percentage on the first upload attempt (J11 disruption 1). */
  dropAt?: number | null;
  /** Requests for a non-video alternative or an adjustment, per person. */
  alternatives?: { personId: string; kind: 'TEXT' | 'FORM' | 'ADJUSTMENT'; at: string; orgs: string[] }[];
  /** Demo: Kora offers an interview recording to this person (off by default). */
  interviewOffered?: Record<string, string[]>;
}
export const area = { id: 'media', init: (): MediaState => ({ items: [], reviews: [], briefings: {}, transcripts: {}, notes: {}, seen: {}, dropAt: 40, alternatives: [], interviewOffered: {} }) };
export const media = (w: World) => w.areas.media as MediaState;
/** Segments of a media item an organisation may see (consent not expired, segment shared, item not revoked). */
export const visibleSegments = (w: World, mediaId: string, orgId: string) => {
  const m = media(w).items.find((x) => x.id === mediaId);
  // Only a finished, candidate-reviewed item is ever shown (REVIEW is the candidate's own self-review).
  if (!m || m.state !== 'READY' || !m.consent?.orgs.includes(orgId)) return [];
  if (m.consent.expires && new Date(m.consent.expires) < new Date(w.session.now)) return [];
  if (w.consents[m.ownerId]?.withdrawnFrom.includes(orgId)) return [];
  return m.segments.filter((s) => s.sharedWith.includes(orgId));
};
