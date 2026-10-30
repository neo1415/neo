// Small shared pieces for R2 pages: verification and evidence-level marks that never rely on colour alone.
import type { Evidence } from '@contracts';
import { Glyph } from '../../ds/Glyph';
import type { Level } from '../../state/areas/hire-b';
import { GLYPH_OF, LEVEL_WORD } from './model';
import { useWorld } from '../../mock/world';
import { proofClass } from '../evidence/model';
import { ProofTag } from '../evidence/recruiter/ui';

export type Ver = NonNullable<Evidence['verification']>;
export const verOf = (e: Evidence): Ver => e.verification ?? (e.verified ? 'VERIFIED' : 'UNVERIFIED');
const VER: Record<Ver, { word: string; k: 'ok' | 'warn' | 'risk' | undefined; g: 'verified' | 'unclear' | 'none' | 'partial' }> = {
  VERIFIED: { word: 'Verified', k: 'ok', g: 'verified' },
  PENDING: { word: 'Check pending', k: undefined, g: 'unclear' },
  UNVERIFIED: { word: 'Not checked yet', k: undefined, g: 'none' },
  FAILED: { word: 'Check failed', k: 'risk', g: 'none' },
  UNDER_REVIEW: { word: 'Under review', k: 'warn', g: 'partial' },
};
export function VerTag({ v }: { v: Ver }) {
  const x = VER[v];
  return <span className="ds-tag" data-k={x.k}><Glyph k={x.g} size={14} />{x.word}</span>;
}
export function LevelMark({ level, small }: { level: Level; small?: boolean }) {
  return <span className="hire-b-level"><Glyph k={GLYPH_OF[level]} size={small ? 16 : 18} />{LEVEL_WORD[level]}</span>;
}
export const ORIGIN: Record<string, string> = { ONBOARDING: 'From their profile set-up', J7: 'From Talent Q practice they chose to share', UPLOAD: 'Uploaded by them', REVIEW: 'From a reviewer', SEED: 'Imported' };
export const KIND: Record<Evidence['kind'], string> = { PROJECT: 'Project', CREDENTIAL: 'Certificate', ASSESSMENT: 'Assessment', WORK_SAMPLE: 'Work sample', REFERENCE: 'Reference', EMPLOYMENT: 'Employment', CLAIM: 'CV claim', PRACTICE: 'Practice' };
export const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtTime = (s: string) => new Date(s).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });

/** The item's proof class in the words both sides share (Claim, Self-reported, Assessed, Issuer-verified, Disputed). */
export function ClassTag({ e }: { e: Evidence }) {
  const c = useWorld((w) => proofClass(w, e));
  return <ProofTag c={c} small />;
}
