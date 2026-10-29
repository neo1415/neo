// Live cards Q shows inside its replies for R3: a draft at a given version (or its simulated-send receipt),
// what changed between versions, the pre-send checks, and proposed interview times with everyone's local time.
// Design pass: each card leads with the facts a person decides on (who, when, status), and keeps long text
// (message bodies, word-level changes, check details) one tap away, so the card reads in the phone Q sheet.
import { useState } from 'react';
import { motion } from 'motion/react';
import { useWorld } from '../../mock/world';
import { DUR, EASE } from '../../ds/motion';
import { hc } from '../../state/areas/hire-c';
import type { Check } from '../../state/areas/hire-c';
import { registerRef } from '../../q/refs';
import { CHANNEL_LABEL, city, diffWords, findMsg, firstOf, GUIDE_SHORT, guidesOf, problemOf, LAGOS, msgStatusLabel, nameOf, tDay, tTime, tzOf, versionChanges, whenText } from './lib';

const STATUS_SHORT: Record<string, string> = { DRAFT: 'Draft', AWAITING_APPROVAL: 'Ready for approval', QUEUED_OFFLINE: 'Queued: offline', SENT_SIMULATED: 'Sent (simulated)', RECEIVED: 'Received', DISCARDED: 'Discarded' };

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return <dl className="hc-facts">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

/** Message body, clamped when long, with an explicit "show all" (never a silent cut). */
export function Body({ text, lines = 7 }: { text: string; lines?: number }) {
  const [all, setAll] = useState(false);
  const long = text.split('\n').length > lines || text.length > 380;
  return (
    <>
      <div className={`hc-body ${long && !all ? 'clamp' : ''}`}>{text}</div>
      {long && <button type="button" className="hc-more" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show less' : 'Show the whole message'}</button>}
    </>
  );
}

function DraftRef({ id }: { id: string }) {
  const [msgId, vs] = id.split('@');
  const w = useWorld((x) => x);
  const d = hc(w).drafts[msgId];
  const m = findMsg(w, msgId)?.m;
  if (!m) return null;
  const to = d ? nameOf(w, d.personId) : nameOf(w, m.to);
  const v = d?.versions.find((x) => x.v === Number(vs)) ?? d?.versions[d.versions.length - 1];
  const latest = d?.versions[d.versions.length - 1]?.v ?? 1;
  const body = v?.body ?? m.body;
  const ids = d ? [...d.panel, d.personId] : [m.to];
  const slot = v?.slot ?? d?.slot;
  // A sent message reads as a receipt: what went, to whom, how, who said yes. The text is one tap away.
  if (m.status === 'SENT_SIMULATED' || m.status === 'QUEUED_OFFLINE') {
    const sent = m.status === 'SENT_SIMULATED';
    return (
      <div className="hc-card hc-receipt" data-s={m.status} role="group" aria-label={sent ? `Receipt: sent to ${to}` : `Queued for ${to}`}>
        <div className="hc-card-head">
          <span className="hc-receipt-title"><span className="hc-tick" aria-hidden="true">{sent ? '✓' : '◷'}</span>{sent ? `Sent to ${to.split(' ')[0]}` : `Waiting to send to ${to.split(' ')[0]}`}</span>
          <span className="ds-sim">{sent ? 'Simulated send' : 'Not sent yet'}</span>
        </div>
        <Facts rows={[
          ['What', `${v?.subject ?? m.subject ?? 'Message'}${v ? ` (v${v.v})` : ''}`],
          ...(slot ? [['When', whenText(w, slot.start, ids)] as [string, string]] : []),
          ['How', CHANNEL_LABEL[m.channel]],
          ['Approved by', m.approvedBy ? firstOf(w, m.approvedBy) : '—'],
          ...(sent ? [['Receipt', <span key="r" className="num hc-mono">{m.receipt}</span>] as [string, React.ReactNode]] : []),
        ]} />
        <details className="hc-disclose"><summary>Show the message</summary><p className="hc-subj">{v?.subject ?? m.subject}</p><div className="hc-body">{body}</div></details>
      </div>
    );
  }
  return (
    <div className="hc-card" role="group" aria-label={`Draft version ${v?.v ?? 1} to ${to}`}>
      <div className="hc-card-head"><span className="lab">Draft{v ? ` · v${v.v}` : ''}</span><span className="hc-status" data-s={m.status}>{STATUS_SHORT[m.status] ?? msgStatusLabel[m.status]}</span></div>
      <Facts rows={[
        ['To', `${to} · ${CHANNEL_LABEL[m.channel]}`],
        ...(slot ? [['When', whenText(w, slot.start, ids)] as [string, string]] : []),
        ...(d && d.panel.length && d.kind !== 'REPLY' && d.kind !== 'REJECTION' ? [['Panel', d.panel.map((x) => firstOf(w, x)).join(', ')] as [string, string]] : []),
      ]} />
      <div className="hc-letter">
        <p className="hc-subj">{v?.subject ?? m.subject}</p>
        <Body text={body} />
      </div>
      {v && v.v < latest && <p className="t14 hc-muted" style={{ margin: 0 }}>Revised since: the latest is v{latest}.</p>}
    </div>
  );
}

function DiffRef({ id }: { id: string }) {
  const [msgId, vs] = id.split('@');
  const w = useWorld((x) => x);
  const d = hc(w).drafts[msgId];
  const [removed, setRemoved] = useState(false);
  const [all, setAll] = useState(false);
  if (!d) return null;
  const cur = d.versions.find((x) => x.v === Number(vs)); const prev = d.versions.find((x) => x.v === Number(vs) - 1);
  if (!cur || !prev) return null;
  const rows = versionChanges(w, d, prev, cur);
  const parts = diffWords(prev.body, cur.body);
  const changed = parts.filter((p) => p.t !== 'same' && p.s.trim()).length;
  const shown = removed ? parts : parts.filter((p) => p.t !== 'del');
  // A tone change rewrites most sentences; highlighting everything says nothing, so say it once instead.
  const addLen = parts.filter((p) => p.t === 'add').reduce((n, p) => n + p.s.length, 0);
  const reworded = !removed && addLen > cur.body.length * 0.6;
  return (
    <div className="hc-card" role="group" aria-label={`Changes from version ${prev.v} to ${cur.v}`}>
      <div className="hc-card-head"><span className="lab">What changed · v{prev.v} → v{cur.v}</span><span className="hc-status" data-s="DRAFT">Draft</span></div>
      {rows.length > 0 && (
        <ul className="hc-changes">
          {rows.map((r) => (
            <li key={r.k}><span className="hc-k">{r.k}</span>
              <span className="hc-v">{r.from && <><del><span className="sr">was </span>{r.from}</del><span aria-hidden="true" className="hc-arrow">→</span></>}<b><span className="sr">{r.from ? 'now ' : ''}</span>{r.to}</b></span></li>
          ))}
        </ul>
      )}
      <div className="hc-letter">
        <p className="hc-subj">{cur.subject}</p>
        <div className={`hc-body hc-diff ${!all ? 'clamp tall' : ''}`}>
          {shown.map((p, i) => (p.t === 'same' ? <span key={i}>{p.s}</span>
            : p.t === 'add' ? (reworded ? <span key={i}>{p.s}</span> : <Added key={i} s={p.s} />)
              : <del key={i}><span className="sr">removed: </span>{p.s}</del>))}
        </div>
        <div className="hc-toggles">
          <button type="button" className="hc-more" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show less' : 'Show the whole message'}</button>
          {changed > 0 && <button type="button" className="hc-more" aria-pressed={removed} onClick={() => { setRemoved(!removed); setAll(true); }}>{removed ? 'Hide removed wording' : 'Show removed wording'}</button>}
        </div>
      </div>
      <p className="t14 hc-muted hc-key" style={{ margin: 0 }}>{reworded ? <>Most of the wording is new in v{cur.v}. “Show removed wording” compares it with v{prev.v}.</> : <><ins>Highlighted</ins> = new in v{cur.v}{removed ? <> · <del>struck through</del> = taken out</> : ''}</>}</p>
    </div>
  );
}
/** New wording settles from a brighter gold into the wash, so the eye finds what changed (MO-015, orientation). */
function Added({ s }: { s: string }) {
  return <motion.ins initial={{ backgroundColor: 'rgba(231, 191, 96, 0.75)' }} animate={{ backgroundColor: 'rgba(241, 227, 191, 1)', transition: { duration: DUR.slow, ease: EASE.standard, delay: DUR.normal } }}><span className="sr">added: </span>{s}</motion.ins>;
}

/** The pre-send checks: problems first and in full; passes grouped into one line each, details on request. */
export function ChecksList({ msgId, compact }: { msgId: string; compact?: boolean }) {
  const w = useWorld((x) => x);
  const d = hc(w).drafts[msgId];
  const [open, setOpen] = useState(false);
  if (!d?.checks) return null;
  const gs = guidesOf(w, d.orgId);
  const short = (c: Check) => (c.group === 'Guidelines' ? GUIDE_SHORT[gs.find((g) => g.id === c.id)?.check ?? 'NONE'] : c.label);
  const bad = d.checks.filter((c) => !c.ok); const good = d.checks.filter((c) => c.ok);
  const groups = [...new Set(good.map((c) => c.group))];
  return (
    <div className="hc-checkwrap">
      {bad.length > 0 && (
        <ul className="hc-checks" aria-label="Needs sorting before sending">
          {bad.map((c, i) => (
            <motion.li key={c.id} data-ok="0" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: { duration: DUR.fast, ease: EASE.enter, delay: i * 0.04 } }}>
              <span className="hc-mark" aria-hidden="true">!</span>
              <span><b>{problemOf(w, d.orgId, c, nameOf(w, d.personId).split(' ')[0]).replace(/^\w/, (x) => x.toUpperCase())}</b> <span className="sr">needs fixing.</span><span className="hc-detail">{c.detail}</span></span>
            </motion.li>
          ))}
        </ul>
      )}
      {!open ? (
        <ul className="hc-checks hc-pass" aria-label={`${good.length} checks passed`}>
          {groups.map((g, i) => { const cs = good.filter((c) => c.group === g); return (
            // Passing checks tick in quickly in sequence (MO-027 approval feedback; total under 300 ms).
            <motion.li key={g} data-ok="1" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DUR.fast, ease: EASE.enter, delay: (bad.length + i) * 0.04 } }}>
              <span className="hc-mark" aria-hidden="true">✓</span>
              <span><b>{g}</b> <span className="hc-inline">{cs.map(short).join(' · ')}</span><span className="sr"> passed</span></span>
            </motion.li>); })}
        </ul>
      ) : (
        <ul className="hc-checks hc-pass" aria-label={`${good.length} checks passed`}>
          {good.map((c) => <li key={c.id} data-ok="1"><span className="hc-mark" aria-hidden="true">✓</span><span><b>{c.group}: {short(c)}</b><span className="sr"> passed</span><span className="hc-detail">{c.detail}</span></span></li>)}
        </ul>
      )}
      {!compact && good.length > 0 && <button type="button" className="hc-more" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Show what Q checked'}</button>}
    </div>
  );
}
function ChecksRef({ id }: { id: string }) {
  const [msgId, vs] = id.split('@');
  const cs = useWorld((w) => hc(w).drafts[msgId]?.checks);
  const n = cs?.filter((c) => !c.ok).length ?? 0; const total = cs?.length ?? 0;
  return (
    <div className="hc-card" role="group" aria-label={`Checks for version ${vs}`}>
      <div className="hc-card-head"><span className="lab">Checks before sending · v{vs}</span>
        <span className="hc-status" data-s={n ? 'FIX' : 'PASS'}>{n ? `${n} of ${total} to fix` : `All ${total} passed`}</span></div>
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
        <thead><tr><th scope="col"><span className="sr">Option</span></th>{people.map((x) => <th key={x.id} scope="col">{x.name}<span className="hc-tz">{city(x.tz)}</span></th>)}</tr></thead>
        <tbody>{p.slots.map((s, i) => (
          <tr key={s.start}><th scope="row"><span className="hc-opt">{i + 1}</span>{tDay(s.start, LAGOS)}</th>
            {people.map((x) => { const t = tTime(s.start, x.tz); const h = Number(t.slice(0, 2)); return <td key={x.id} className="num">{t}{x.tz !== LAGOS && (h < 10 || h >= 17) && <span className="hc-tz">{h < 10 ? 'early start' : 'late'}</span>}</td>; })}</tr>
        ))}</tbody>
      </table>
      <p className="t14 hc-muted" style={{ margin: 0 }}>Say “hold the first one” or “draft the invite for the second”.</p>
    </div>
  );
}

registerRef('hire-c.draft', DraftRef);
registerRef('hire-c.diff', DiffRef);
registerRef('hire-c.checks', ChecksRef);
registerRef('hire-c.slots', SlotsRef);
