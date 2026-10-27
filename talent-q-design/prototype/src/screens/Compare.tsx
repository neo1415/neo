// P5 · SC-041 Compare candidates, SC-039 Evidence inspector, SC-040 Role-fit explanation.
// Requirement by requirement, never one score. Each cell opens the evidence behind it, with its limits.
import { useState } from 'react';
import type { Evidence, EvidenceState } from '@contracts';
import { FITS, PEOPLE } from '../mock/fixtures';
import { update, useWorld } from '../mock/world';
import { draftOutreach } from '../q/scripts';
import { Button, EvidenceBadge, Label, QSays, Sheet, Sim, Switch } from '../ui/kit';
import { Link, navigate } from '../ui/router';

export function Compare() {
  const w = useWorld((x) => x);
  const [mustOnly, setMustOnly] = useState(false);
  const [open, setOpen] = useState<{ personId: string; reqId: string } | null>(null);
  const shortlist = w.mandate.shortlist;
  const people = shortlist.map((id) => PEOPLE.find((p) => p.personId === id)!).filter(Boolean);
  const reqs = w.mandate.requirements.filter((r) => !mustOnly || r.mustHave);
  const cell = (pid: string, reqId: string) => FITS.find((f) => f.personId === pid)?.byRequirement.find((r) => r.reqId === reqId);
  const sel = open ? cell(open.personId, open.reqId) : null;
  const all: Evidence[] = sel ? sel.evidenceIds.map((id) => w.evidence.find((e) => e.evidenceId === id)!).filter(Boolean) : [];
  // Revocation is immediate: anything the candidate made private disappears from the employer's view.
  const selEvidence = all.filter((e) => e.visibility === 'PUBLIC_PROFILE' || (e.visibility === 'SHARED_WITH' && e.sharedWith.includes('org_kora')));
  const withdrawn = all.length - selEvidence.length;

  if (!people.length) return (
    <main className="main stack gap-6">
      <h1 className="t-display">No shortlist yet</h1>
      <p className="muted measure">Q builds the comparison once a search has found people. Approve a mandate and start a search, or load the example shortlist to explore this screen.</p>
      <div className="row gap-3 wrap"><Link to="/r/mandate" className="btn btn-primary">Start a role</Link>
        <Button onClick={() => update((d) => { d.mandate.status = 'SOURCING'; d.mandate.shortlist = ['p_tobi', 'p_ife', 'p_kunle']; d.sourcing.found = d.mandate.shortlist; d.sourcing.done = true; d.sourcing.cursor = 24; })}>Load the example shortlist</Button></div>
    </main>
  );

  const outreach = async (pid: string) => { await draftOutreach(pid); navigate('/r/outreach'); };

  return (
    <main className="split">
      <section className="split-conv" aria-label="Q’s summary">
        <span className="t-label q-text">Senior Backend · comparison</span>
        <QSays text={'Tobi is the strongest on the hardest requirement: he has run reconciliation for 4 million settlements a day, and I checked the code.\n\nIfeoma has the most complete record, but her payments work is routing, not reconciliation.\n\nNobody has shown on-call leadership yet. I’d ask about it in the interview rather than rule anyone out.'}
          used={[{ kind: 'AUTHORIZED_FACT', label: 'Mandate v1' }, { kind: 'KNOWLEDGE_SOURCE', label: '7 evidence items' }, { kind: 'INFERENCE', label: 'Ranking of hardest requirement' }]} />
        <p className="t-caption">Missing evidence is not missing ability. “Not evidenced yet” means nobody has shown it, so it’s a question for the interview.</p>
      </section>

      <section className="split-art paper" aria-labelledby="cmp-h">
        <div className="stack gap-6">
          <div className="row between wrap gap-4">
            <div className="stack gap-1"><span className="t-label">Artifact · comparison · v1</span><h1 id="cmp-h" className="t-display">Senior Backend shortlist</h1></div>
            <Switch label="Must-haves only" checked={mustOnly} onChange={setMustOnly} />
          </div>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 720 }}>
              <caption className="sr-only">Evidence state for each requirement and person. Select a cell to see the evidence.</caption>
              <thead><tr><th scope="col">Requirement</th>{people.map((p) => <th key={p.personId} scope="col">{p.name}</th>)}</tr></thead>
              <tbody>
                {reqs.map((r) => (
                  <tr key={r.reqId}>
                    <th scope="row"><span className="stack"><span>{r.label}</span><span className="t-caption">{r.mustHave ? 'Must have' : 'Nice to have'}</span></span></th>
                    {people.map((p) => { const c = cell(p.personId, r.reqId); return (
                      <td key={p.personId}>
                        {c ? <button type="button" className="stack gap-1" onClick={() => setOpen({ personId: p.personId, reqId: r.reqId })}
                          style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 44 }} aria-label={`${p.name}, ${r.label}: open evidence`}>
                          <EvidenceBadge state={c.state as EvidenceState} /><span className="t-caption">{c.note}</span></button> : '—'}
                      </td>); })}
                  </tr>
                ))}
                <tr><th scope="row">Mutual fit</th>{people.map((p) => { const f = FITS.find((x) => x.personId === p.personId)!; return <td key={p.personId} className="t-caption">Work mode {f.mutual.workMode.toLowerCase()} · pay {f.mutual.pay.toLowerCase()} · location {f.mutual.location.toLowerCase()}</td>; })}</tr>
                <tr><th scope="row">Unknowns</th>{people.map((p) => { const f = FITS.find((x) => x.personId === p.personId)!; return <td key={p.personId} className="t-caption">{f.unknowns.join('; ') || 'None noted'}</td>; })}</tr>
                <tr><th scope="row"><span className="sr-only">Actions</span></th>{people.map((p) => <td key={p.personId}><Button compact variant={p.personId === 'p_tobi' ? 'primary' : 'secondary'} onClick={() => outreach(p.personId)}>Draft outreach</Button></td>)}</tr>
              </tbody>
            </table>
          </div>
          <p className="t-caption">People and evidence are fictional. <Sim /></p>
        </div>
      </section>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `${PEOPLE.find((p) => p.personId === open.personId)?.name} · ${w.mandate.requirements.find((r) => r.reqId === open.reqId)?.label}` : ''} side="center">
        {sel && (
          <div className="stack gap-6">
            <EvidenceBadge state={sel.state as EvidenceState} />
            {withdrawn > 0 && <p className="muted" role="status">The candidate has stopped sharing {withdrawn === 1 ? 'one item' : `${withdrawn} items`} here. Q no longer uses {withdrawn === 1 ? 'it' : 'them'}.</p>}
            {all.length === 0 && <p className="muted">Nothing has been shared for this requirement. Q suggests asking about it in the interview.</p>}
            {selEvidence.map((e) => (
              <article key={e.evidenceId} className="stack gap-3" style={{ borderTop: '1px solid var(--color-line)', paddingTop: 16 }}>
                <div className="row between gap-3 wrap"><h3 className="t-title" style={{ fontSize: 18 }}>{e.title}</h3><span className="tag">{e.verified ? 'Verified' : 'Not verified'}</span></div>
                <dl className="stack gap-2">
                  <div><dt className="t-label">What it shows</dt><dd>{e.shows}</dd></div>
                  <div><dt className="t-label">Limits</dt><dd className="muted">{e.limits}</dd></div>
                  <div className="row gap-6 wrap"><div><dt className="t-label">Source</dt><dd>{e.source}</dd></div><div><dt className="t-label">Observed</dt><dd>{e.observedAt}</dd></div></div>
                </dl>
              </article>
            ))}
            <Label>Shared with Kora Pay by the candidate. Q only shows evidence the candidate allowed.</Label>
          </div>
        )}
      </Sheet>
    </main>
  );
}
