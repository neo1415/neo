// One evidence-strength vocabulary for hiring and careers (carried over from Direction D).
// Strength is carried by SHAPE, never by shade: the dataviz validator put adjacent gold steps ~9 ΔE apart.
export type GlyphKind = 'verified' | 'full' | 'partial' | 'practice' | 'none' | 'unclear';
/** One evidence-strength vocabulary for hiring and careers. Strength is carried by SHAPE, never by shade. */
export const GLYPH_LABEL: Record<GlyphKind, string> = { verified: 'Verified', full: 'Evidenced', partial: 'Partial or outdated', practice: 'Practising (private)', none: 'Not shown yet', unclear: 'Unclear' };
export function Glyph({ k, size = 20, title }: { k: GlyphKind; size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} style={{ flex: 'none' }}>
      {k === 'verified' && <><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="5" fill="currentColor" /></>}
      {k === 'full' && <circle cx="10" cy="10" r="6.5" fill="currentColor" />}
      {k === 'partial' && <><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10 4 A6 6 0 0 0 10 16 Z" fill="currentColor" /></>}
      {k === 'none' && <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {k === 'unclear' && <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2.4" />}
      {k === 'practice' && <circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="0.1 3" strokeLinecap="round" />}
    </svg>
  );
}
export function GlyphKey({ kinds }: { kinds: GlyphKind[] }) {
  return (
    <ul aria-label="Key" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', listStyle: 'none', margin: 0, padding: 0 }}>
      {kinds.map((k) => <li key={k} className="t14" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}><Glyph k={k} size={16} />{GLYPH_LABEL[k]}</li>)}
    </ul>
  );
}

