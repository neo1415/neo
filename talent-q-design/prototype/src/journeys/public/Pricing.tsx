// SC-005 · Pricing. Four offers from 01_BUYER_EVIDENCE_AND_PRICING.md, each a labelled HYPOTHESIS.
// No payment is taken. "Ask about this" records interest in the store only (nothing is sent), so the tested
// signal is "quote requests", as the pricing source proposes. Compare: list on phones, table on desktop.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from '../../ui/router';
import { arrive } from '../../ds/motion';
import { now, uid, update, useWorld } from '../../mock/world';
import { useNarrow } from '../../ds/Workspace';
import { pub, type OfferId } from '../../state/areas/public';
import { AskAbout, PageHead, Site } from './Site';
import { COMPARE, OFFERS } from './content';

function Interest({ offer, onClose }: { offer: OfferId; onClose: () => void }) {
  const [f, setF] = useState({ name: '', email: '', org: '', roles: '' });
  const [err, setErr] = useState<{ name?: string; email?: string }>({});
  const o = OFFERS.find((x) => x.id === offer)!;
  const submit = () => {
    const e: typeof err = {};
    if (!f.name.trim()) e.name = 'Add your name so we know who asked.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Email needs an @ and a dot, like name@company.com.';
    setErr(e); if (e.name || e.email) return;
    update((w) => { pub(w).interest.push({ id: uid('int'), offer, name: f.name.trim(), email: f.email.trim(), org: f.org.trim() || undefined, roles: f.roles.trim() || undefined, at: now() }); });
  };
  const done = useWorld((w) => pub(w).interest.filter((x) => x.offer === offer).at(-1));
  const id = `pp-${offer}`;
  return (
    <motion.form {...arrive} className="pp-form" aria-labelledby={`${id}-h`} onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <h3 id={`${id}-h`} className="t19">Ask about the {o.name.toLowerCase()}</h3>
      {done ? (
        <div role="status" className="pp-done">
          <p><b>Interest noted, {done.name.split(' ')[0]}.</b> In this prototype nothing is sent and no payment is taken. In a real pilot, a person would reply by email.</p>
          <button type="button" className="ds-btn quiet" onClick={onClose}>Close</button>
        </div>
      ) : (
        <>
          <div className="ds-field"><label htmlFor={`${id}-n`}>Your name</label><input id={`${id}-n`} className="ds-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" aria-invalid={!!err.name} aria-describedby={err.name ? `${id}-ne` : undefined} />{err.name && <span id={`${id}-ne`} className="pp-err">{err.name}</span>}</div>
          <div className="ds-field"><label htmlFor={`${id}-e`}>Work email</label><input id={`${id}-e`} className="ds-input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" aria-invalid={!!err.email} aria-describedby={err.email ? `${id}-ee` : undefined} />{err.email && <span id={`${id}-ee`} className="pp-err">{err.email}</span>}</div>
          {offer !== 'candidate' && <div className="ds-field"><label htmlFor={`${id}-o`}>Company or agency <span className="muted">(optional)</span></label><input id={`${id}-o`} className="ds-input" value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} autoComplete="organization" /></div>}
          {offer !== 'candidate' && <div className="ds-field"><label htmlFor={`${id}-r`}>Roles you’re hiring for <span className="muted">(optional)</span></label><input id={`${id}-r`} className="ds-input" value={f.roles} onChange={(e) => setF({ ...f, roles: e.target.value })} placeholder="e.g. 2 backend engineers" /></div>}
          <p className="t14 muted">No payment, no card. Simulated: nothing leaves this prototype.</p>
          <div className="pl-ctas"><button type="submit" className="ds-btn primary">Send my question</button><button type="button" className="ds-btn quiet" onClick={onClose}>Cancel</button></div>
        </>
      )}
    </motion.form>
  );
}

export function Pricing() {
  const [open, setOpen] = useState<OfferId | null>(null);
  const narrow = useNarrow(860);
  return (
    <Site>
      <PageHead kicker="Pricing" title="Prices we’re testing" lede="These are hypotheses from desk research, not proven prices. We’re testing them with early users, and they will change if they don’t work for you." />
      <div className="ds-banner pp-banner" role="note">
        <span className="ds-sim">Hypothesis</span>
        <p style={{ margin: 0 }}>Nothing on this page takes payment. We won’t collect money until Talent Q can really deliver; the first paid pilots will have a person checking Q’s results.</p>
      </div>

      <section aria-label="Offers" className="pp-offers">
        {OFFERS.map((o) => (
          <article key={o.id} className="pp-offer" data-free={o.free || undefined} aria-labelledby={`pp-${o.id}-name`}>
            <div className="pp-offer-h"><h2 id={`pp-${o.id}-name`} className="voice t24">{o.name}</h2><span className="pp-stamp">{o.free ? 'Free' : 'Being tested'}</span></div>
            <p className="t14 muted">{o.who}</p>
            <p className="pp-price"><b className="num">{o.price}</b><span>{o.unit}</span></p>
            <ul className="pp-incl">{o.includes.map((i) => <li key={i}>{i}</li>)}</ul>
            <p className="pp-testing"><span className="lab">What we’re testing</span>{o.testing}</p>
            <AnimatePresence mode="wait">
              {open === o.id ? <Interest key="f" offer={o.id} onClose={() => setOpen(null)} />
                : o.free ? <Link key="b" to="/signup" className="ds-btn primary">Create your free profile</Link>
                : <button key="b" type="button" className="ds-btn" onClick={() => setOpen(o.id)}>Ask about this</button>}
            </AnimatePresence>
          </article>
        ))}
      </section>

      <section className="ps-band" aria-labelledby="pp-cmp">
        <h2 id="pp-cmp" className="voice t30">Compare the options</h2>
        <p className="muted">“Not decided” means exactly that. We’ll say when it is.</p>
        {narrow ? (
          <div className="pp-cmp-list">
            {OFFERS.map((o) => (
              <section key={o.id} aria-labelledby={`ppl-${o.id}`} className="pp-cmp-item">
                <h3 id={`ppl-${o.id}`} className="t19">{o.name}</h3>
                <dl>{COMPARE.map((r) => <div key={r.row}><dt>{r.row}</dt><dd>{r.cells[o.id]}</dd></div>)}</dl>
              </section>
            ))}
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table pp-table">
              <caption className="sr">How each offer is priced and what it includes. All are hypotheses.</caption>
              <thead><tr><th scope="col"><span className="sr">Question</span></th>{OFFERS.map((o) => <th key={o.id} scope="col">{o.name}</th>)}</tr></thead>
              <tbody>{COMPARE.map((r) => <tr key={r.row}><th scope="row">{r.row}</th>{OFFERS.map((o) => <td key={o.id} data-undecided={/not decided/i.test(r.cells[o.id]) || undefined}>{r.cells[o.id]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ps-band" aria-labelledby="pp-model">
        <h2 id="pp-model" className="voice t30">How we think about value</h2>
        <div className="pp-model">
          <p className="pp-sum"><span className="num">8 hours</span> saved on a live role <span aria-hidden="true">×</span> <span className="num">$45</span> an hour <span aria-hidden="true">=</span> <b className="num">$360</b></p>
          <p>If that saving is real, a team plan around $249 a month could make sense. This is a model, not a customer quote, and the saving isn’t proven. If the extra checks cost more time than Q saves, the price is wrong.</p>
        </div>
        <h3 className="t19">What would change these prices</h3>
        <ul className="pp-measures">
          <li>Whether people ask for a pilot, and whether pilots turn into paid plans</li>
          <li>How many interested, evidence-backed candidates a role really gets</li>
          <li>Whether teams keep paying after the first months</li>
          <li>What Q’s work and the checks actually cost to run</li>
        </ul>
        <AskAbout q="What does it cost?" label="Ask Q to summarise the prices" />
      </section>
    </Site>
  );
}
