// Small shared pieces for hire-a pages, and the live cards Q shows inside its messages (brief, memory,
// source conflict). Cards render from state, so they update when the brief or memory changes.
import { useWorld, visibleEvidence, actorOf } from '../../mock/world';
import { Link, useRoute } from '../../ui/router';
import { Glyph, type GlyphKind } from '../../ds/Glyph';
import { readA } from '../../state/areas/hire-a';
import { curV, payText, STATUS_PLAIN, dayLabel } from './model';
import { CONFLICTS } from '../../q/skills/hire-a';

/** On phones the canvas is a sheet; "back to the conversation" opens Q. */
export const openQ = () => { (document.querySelector('.ds-askbar button') as HTMLButtonElement | null)?.click(); };

export function evidenceGlyph(e: { kind: string; verification?: string; verified: boolean }): { k: GlyphKind; label: string } {
  if (e.verified || e.verification === 'VERIFIED') return { k: 'verified', label: 'Verified' };
  if (e.kind === 'CLAIM') return { k: 'unclear', label: 'Claim, not yet backed' };
  if (e.verification === 'PENDING') return { k: 'partial', label: 'Check pending' };
  return { k: 'full', label: 'Evidenced' };
}

export function BriefRef({ id }: { id: string }) {
  const m = useWorld((w) => w.mandates.find((x) => x.id === id) ?? readA(w).discarded[id]);
  const gone = useWorld((w) => !w.mandates.some((x) => x.id === id));
  const here = useRoute().path;
  if (!m) return null;
  return (
    <div className="hire-a-ref" aria-label={`Role brief: ${m.title}`}>
      <span className="lab">Role brief · v{curV(m)} · {gone ? 'discarded' : STATUS_PLAIN[m.status]}</span>
      <b className="voice" style={{ fontSize: 18 }}>{m.title}</b>
      <span className="t14">{m.location} · {payText(m)}</span>
      <ul>{m.requirements.slice(0, 3).map((r) => <li key={r.reqId} className="t14">{r.label}{r.mustHave ? '' : ' (nice to have)'}</li>)}</ul>
      {!gone && here !== `/r/roles/${m.id}` && <Link to={`/r/roles/${m.id}`} className="ds-chip" style={{ justifySelf: 'start', textDecoration: 'none' }}>Open the brief</Link>}
    </div>
  );
}

export function MemoryRef({ id }: { id: string }) {
  const m = useWorld((w) => w.memories.find((x) => x.memory_id === id));
  if (!m) return null;
  const src = m.source_refs[0];
  return (
    <div className="hire-a-ref" aria-label="Remembered item">
      <span className="lab">What Q remembers · {m.lifecycle_status === 'superseded' ? 'replaced' : m.lifecycle_status === 'forgotten' ? 'forgotten' : 'in use'}</span>
      <p style={{ margin: 0, textDecoration: m.lifecycle_status === 'active' ? undefined : 'line-through' }}>{m.content}</p>
      <span className="t14">Source: {src.label}{src.quote ? <> · “{src.quote}”</> : null}</span>
      <span className="t14">{m.truth_class === 'INFERENCE' ? 'Q’s inference' : m.truth_class === 'STATED_BY_USER' ? 'Stated by you' : m.truth_class.toLowerCase().replace(/_/g, ' ')}</span>
    </div>
  );
}

export function ConflictRef({ id }: { id: string }) {
  const cf = CONFLICTS[id];
  const ev = useWorld((w) => { const a = actorOf(w); return a.orgId ? visibleEvidence(w, id, a.orgId).filter((e) => e.evidenceId === cf?.a || e.evidenceId === cf?.b) : []; });
  const how = useWorld((w) => readA(w).conflicts[id]);
  if (!cf || ev.length < 2) return null;
  return (
    <div className="hire-a-ref" aria-label="Two sources that disagree">
      <span className="lab">{cf.topic} · sources disagree · {how ? (how === 'INTERVIEW' ? 'checking in interview' : 'asked the candidate') : 'not resolved'}</span>
      <div className="hire-a-two">
        {ev.map((e) => { const g = evidenceGlyph(e); return (
          <div key={e.evidenceId}>
            <span className="t14" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Glyph k={g.k} size={14} />{g.label}</span>
            <b>{e.title}</b>
            <span className="t14">{e.source} · {dayLabel(e.observedAt)}</span>
            <span className="t14">Limit: {e.limits}</span>
          </div>); })}
      </div>
    </div>
  );
}
