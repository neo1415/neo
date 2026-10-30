// SC-013 · The sample Q conversation, rendered on ink (Q's material). Used inline on the landing hero, in the
// "Ask Q" dock on other public pages, and full page at /site/ask. States: empty (opener + questions), thinking
// (labelled, 450 ms), ready, offline (the question is kept; Retry), refusal (permission denied), and the
// accessible alternative (every sample answer as a list, at /site/ask).
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QMark } from '../../ds/QMark';
import { arrive } from '../../ds/motion';
import { navigate, Link } from '../../ui/router';
import { ClassShape } from '../evidence/candidate/ProofClass';
import { PROOF_WORD } from '../evidence/model';
import type { ProofClass } from '../../state/domain';
import { ask, openerFor, retry, useSampleQ, type CardKind, type SChip, type SMsg } from './qsample';
import { OFFERS } from './content';

function Chips({ chips, onPick }: { chips?: SChip[]; onPick?: () => void }) {
  if (!chips?.length) return null;
  return (
    <div className="pq-chips">
      {chips.map((c) => (
        <button key={c.label} type="button" className={`ds-chip${c.go ? ' go' : ''}`} onClick={() => { if (c.to) { onPick?.(); navigate(c.to); } else if (c.say) ask(c.say); }}>{c.label}</button>
      ))}
    </div>
  );
}

const CRITERIA: Record<'criteria-backend' | 'criteria-data' | 'criteria-generic', { title: string; rows: { must: boolean; c: string; ev: string }[] }> = {
  'criteria-backend': { title: 'Backend engineer · sample criteria', rows: [
    { must: true, c: 'Finds why a PostgreSQL query is slow and fixes it', ev: 'A reviewed debugging sample, or a shared repository' },
    { must: true, c: 'Designs and debugs a REST API', ev: 'Code shared with permission, or a product walk-through' },
    { must: false, c: 'Explains a fix clearly to a teammate', ev: 'A short written or spoken explanation' },
  ] },
  'criteria-data': { title: 'Data analyst · sample criteria', rows: [
    { must: true, c: 'Writes SQL that answers a business question', ev: 'A reviewed query sample on a fictional dataset' },
    { must: true, c: 'Builds a dashboard people actually use', ev: 'A shared dashboard or a walk-through' },
    { must: false, c: 'Says what the numbers can’t tell you', ev: 'A short written explanation' },
  ] },
  'criteria-generic': { title: 'Any role · the same three questions', rows: [
    { must: true, c: 'What is the work, in plain words?', ev: 'You say it; Q drafts it' },
    { must: true, c: 'What could someone show for it?', ev: 'A sample, a project, a certificate or a reference' },
    { must: false, c: 'Who checks it?', ev: 'A named person in your team, or the issuer' },
  ] },
};

type Row = { req: string; tobi: ProofClass | null; seyi: ProofClass | null };
const CMP: Row[] = [
  { req: 'PostgreSQL troubleshooting', tobi: 'ASSESSED', seyi: 'CLAIM' },
  { req: 'API design and debugging', tobi: 'SELF_REPORTED', seyi: 'CLAIM' },
  { req: 'Explains work clearly', tobi: 'SELF_REPORTED', seyi: 'SELF_REPORTED' },
];

function Card({ k }: { k: CardKind }) {
  if (k === 'criteria-backend' || k === 'criteria-data' || k === 'criteria-generic') {
    const d = CRITERIA[k];
    return (
      <div className="pq-card" role="group" aria-label={d.title}>
        <div className="pq-card-h"><b>{d.title}</b><span className="ds-sim">Sample</span></div>
        <ol className="pq-crit">{d.rows.map((r) => <li key={r.c}><span className="pq-must">{r.must ? 'Must' : 'Helps'}</span><div><b>{r.c}</b><span>Could be shown by: {r.ev}</span></div></li>)}</ol>
        <p className="pq-foot">Keyword misses aren’t rejections. A recruiter approves the criteria.</p>
      </div>
    );
  }
  if (k === 'compare') return (
    <div className="pq-card" role="group" aria-label="Fictional comparison: Tobi and Seyi">
      <div className="pq-card-h"><b>Tobi and Seyi · fictional people</b><span className="ds-sim">Sample</span></div>
      <table className="pq-cmp">
        <caption className="sr">Evidence class for each criterion. Not a score.</caption>
        <thead><tr><th scope="col">Criterion</th><th scope="col">Tobi</th><th scope="col">Seyi</th></tr></thead>
        <tbody>{CMP.map((r) => <tr key={r.req}><th scope="row">{r.req}</th>{[r.tobi, r.seyi].map((c, i) => <td key={i}>{c ? <span className="pq-cls"><ClassShape k={c} />{PROOF_WORD[c]}</span> : 'Not shown'}</td>)}</tr>)}</tbody>
      </table>
      <dl className="pq-read">
        <div><dt>Tobi</dt><dd>Shows more than his CV says. A reviewed debugging sample backs the main criterion.</dd></div>
        <div><dt>Seyi</dt><dd>Strong claims, limited supporting evidence. That isn’t a sign the claims are false: one short sample could settle it.</dd></div>
      </dl>
      <p className="pq-foot">Unverified isn’t incompetent, and a good sample isn’t a guarantee. A person decides.</p>
    </div>
  );
  if (k === 'prices') return (
    <div className="pq-card" role="group" aria-label="Prices being tested">
      <div className="pq-card-h"><b>Prices being tested</b><span className="ds-sim">Hypothesis</span></div>
      <ul className="pq-prices">{OFFERS.map((o) => <li key={o.id}><span>{o.name}</span><b className="num">{o.price}</b><span className="pq-unit">{o.unit}</span></li>)}</ul>
      <p className="pq-foot">Not proven prices. No payment is taken here.</p>
    </div>
  );
  return (
    <div className="pq-card" role="group" aria-label="What Q does and does not decide">
      <div className="pq-card-h"><b>Who decides</b></div>
      <dl className="pq-read">
        <div><dt>Q does</dt><dd>Drafts criteria, gathers shared evidence, explains it with sources, drafts messages, proposes times.</dd></div>
        <div><dt>People do</dt><dd>Approve criteria, decide who moves forward, approve every message, make every hiring decision.</dd></div>
      </dl>
    </div>
  );
}

function Msg({ m, onPick }: { m: SMsg; onPick?: () => void }) {
  if (m.who === 'me') return <motion.p {...arrive} className="pq-me"><span className="sr">You said: </span>{m.text}</motion.p>;
  return (
    <motion.div {...arrive} className="pq-q" data-kind={m.kind}>
      <span className="pq-label">{m.kind === 'refusal' ? 'Sample answer · not allowed here' : 'Sample answer'}</span>
      <p className="voice">{m.text}</p>
      {m.card && <Card k={m.card} />}
      <Chips chips={m.chips} onPick={onPick} />
    </motion.div>
  );
}

export function SampleQ({ path, variant = 'inline', onNavigate, headingId = 'pq-h' }: { path: string; variant?: 'inline' | 'dock' | 'page'; onNavigate?: () => void; headingId?: string }) {
  const { msgs, state, pendingText } = useSampleQ();
  const [text, setText] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const opener = openerFor(path);
  useEffect(() => { const el = log.current; if (el && msgs.length) el.scrollTop = el.scrollHeight; }, [msgs.length, state]);
  const send = () => { if (!text.trim()) return; ask(text); setText(''); };
  const mood = state === 'thinking' ? 'thinking' : state === 'offline' ? 'offline' : 'idle';
  return (
    <section className="pq ds ink" data-variant={variant} aria-labelledby={headingId}>
      <header className="pq-head">
        <QMark mood={mood} size={32} title={state === 'thinking' ? 'Q is reading' : state === 'offline' ? 'Q is offline' : 'Q'} />
        <div><h2 id={headingId} className="pq-title">Ask Q <span className="pq-titlesub">· sample conversation</span></h2>
          <p className="pq-sub">Fictional people. Written answers, not a live model.</p></div>
      </header>
      <div className="pq-log" ref={log} role="log" aria-live="polite" aria-relevant="additions">
        <Msg m={opener} onPick={onNavigate} />
        <AnimatePresence initial={false}>{msgs.map((m) => <Msg key={m.id} m={m} onPick={onNavigate} />)}</AnimatePresence>
        {state === 'thinking' && <p className="pq-status" role="status"><QMark mood="thinking" size={18} /> Q is reading your question (sample)…</p>}
        {state === 'offline' && (
          <div className="pq-offline" role="alert">
            <p><b>Couldn’t reach Q.</b> The connection dropped before an answer came back. Your question is kept: “{pendingText}”.</p>
            <button type="button" className="ds-chip go" onClick={retry}>Try again</button>
          </div>
        )}
      </div>
      <form className="pq-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label htmlFor={`${headingId}-in`} className="sr">Ask the sample Q</label>
        <input id={`${headingId}-in`} className="pq-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about hiring, proof, privacy or price" autoComplete="off" disabled={state === 'thinking'} />
        <button type="submit" className="pq-send" disabled={!text.trim() || state === 'thinking'} aria-label="Send question">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
      {variant !== 'page' && <p className="pq-alt"><Link to="/site/ask" onClick={onNavigate}>Read every sample answer as a list</Link></p>}
    </section>
  );
}
