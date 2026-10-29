// Live cards Q shows inside its replies for R3: a draft at a given version, the change between versions,
// the pre-send checks, and proposed interview times with everyone's local time.
import { useState } from 'react';
import { useWorld } from '../../mock/world';
import { hc } from '../../state/areas/hire-c';
import { registerRef } from '../../q/refs';
import { city, diffWords, findMsg, firstOf, LAGOS, msgStatusLabel, nameOf, tDay, tTime, tzOf } from './lib';

function DraftRef({ id }: { id: string }) {
  const [msgId, vs] = id.split('@');
  const d = useWorld((w) => hc(w).drafts[msgId]);
  const m = useWorld((w) => findMsg(w, msgId)?.m);
  const to = useWorld((w) => (d ? nameOf(w, d.personId) : m ? nameOf(w, m.to) : ''));
  const [all, setAll] = useState(false);
  if (!m) return null;
  const v = d?.versions.find((x) => x.v === Number(vs)) ?? d?.versions[d.versions.length - 1];
  const latest = d?.versions[d.versions.length - 1]?.v ?? 1;
  const body = v?.body ?? m.body;
  const long = body.split('\n').length > 7 || body.length > 420;
  return (
    <div className="hc-card" role="group" aria-label={`Draft version ${v?.v ?? 1} to ${to}`}>
      <div className="hc-card-head"><span className="lab">{v ? `v${v.v} · ` : ''}to {to}</span><span className="hc-status" data-s={m.status}>{msgStatusLabel[m.status]}</span></div>
      <p className="hc-subj">{v?.subject ?? m.subject}</p>
      <div className={`hc-body ${long && !all ? 'clamp' : ''}`}>{body}</div>
      {long && <button type="button" className="hc-more" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show less' : 'Show the whole message'}</button>}
      {v && v.v < latest && <p className="t14 hc-muted" style={{ margin: 0 }}>Revised since: now v{latest}.</p>}
      {m.status === 'SENT_SIMULATED' && <p className="t14" style={{ margin: 0 }}><span className="ds-sim">Simulated send</span> <span className="hc-muted num">receipt {m.receipt}</span></p>}
    </div>
  );
}

function DiffRef({ id }: { id: string }) {
  const [msgId, vs] = id.split('@');
  const d = useWorld((w) => hc(w).drafts[msgId]);
  if (!d) return null;
  const cur = d.versions.find((x) => x.v === Number(vs)); const prev = d.versions.find((x) => x.v === Number(vs) - 1);
  if (!cur || !prev) return null;
  const parts = diffWords(prev.body, cur.body);
  return (
    <div className="hc-card" role="group" aria-label={`Changes from version ${prev.v} to ${cur.v}`}>
      <div className="hc-card-head"><span className="lab">v{prev.v} → v{cur.v}</span><span className="t14 hc-muted">{cur.note}</span></div>
      <p className="t14 hc-muted" style={{ margin: 0 }}><del>struck through</del> = removed · <ins>underlined</ins> = added</p>
      <div className="hc-body hc-diff">{parts.map((p, i) => (p.t === 'same' ? <span key={i}>{p.s}</span> : p.t === 'add' ? <ins key={i}><span className="sr">added: </span>{p.s}</ins> : <del key={i}><span className="sr">removed: </span>{p.s}</del>))}</div>
    </div>
  );
}

export function ChecksList({ msgId, compact }: { msgId: string; compact?: boolean }) {
  const d = useWorld((w) => hc(w).drafts[msgId]);
  if (!d?.checks) return null;
  return (
    <ul className="hc-checks" aria-label="Checks before sending">
      {d.checks.map((c) => (
        <li key={c.id} data-ok={c.ok ? '1' : '0'}>
          <span className="hc-mark" aria-hidden="true">{c.ok ? '✓' : '✕'}</span>
          <span><b>{c.group}: {c.label}</b> <span className="sr">{c.ok ? 'passed' : 'needs fixing'}</span>{!compact && <span className="hc-detail">{c.detail}</span>}</span>
        </li>
      ))}
    </ul>
  );
}
function ChecksRef({ id }: { id: string }) {
  const [msgId, vs] = id.split('@');
  const n = useWorld((w) => hc(w).drafts[msgId]?.checks?.filter((c) => !c.ok).length ?? 0);
  return (
    <div className="hc-card" role="group" aria-label={`Checks for version ${vs}`}>
      <div className="hc-card-head"><span className="lab">Checks · v{vs}</span><span className="hc-status" data-s={n ? 'DRAFT' : 'AWAITING_APPROVAL'}>{n ? `${n} to fix` : 'Ready for your yes'}</span></div>
      <ChecksList msgId={msgId} />
    </div>
  );
}

function SlotsRef({ id }: { id: string }) {
  const w = useWorld((x) => x);
  const p = Object.values(hc(w).proposals).find((x) => x.id === id);
  if (!p) return <p className="t14 hc-muted" style={{ margin: 0 }}>These times were replaced by a newer search.</p>;
  const people = [...p.panel, p.personId].map((x) => ({ id: x, name: firstOf(w, x), tz: tzOf(w, x) }));
  return (
    <div className="hc-card" role="group" aria-label="Proposed interview times">
      <div className="hc-card-head"><span className="lab">Times that work · 45 min</span><span className="ds-sim">Simulated calendars</span></div>
      <table className="hc-slots">
        <thead><tr><th scope="col">Day</th>{people.map((x) => <th key={x.id} scope="col">{x.name}<span className="hc-tz">{city(x.tz)}</span></th>)}</tr></thead>
        <tbody>{p.slots.map((s, i) => <tr key={s.start}><th scope="row">{i + 1}. {tDay(s.start, LAGOS)}</th>{people.map((x) => <td key={x.id} className="num">{tTime(s.start, x.tz)}</td>)}</tr>)}</tbody>
      </table>
      <p className="t14 hc-muted" style={{ margin: 0 }}>Say “hold the first one” or “draft the invite for the second”.</p>
    </div>
  );
}

registerRef('hire-c.draft', DraftRef);
registerRef('hire-c.diff', DiffRef);
registerRef('hire-c.checks', ChecksRef);
registerRef('hire-c.slots', SlotsRef);
