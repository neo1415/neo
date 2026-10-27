// P3 · SC-027 Create mandate, SC-028 Hiring intake interview, SC-029 Structured editor.
// Talk to Q or fill the form: both edit the same mandate. Approval binds to this exact version.
import { respond, useNamedRun, useRun } from '../mock/runtime';
import { update, useWorld, log } from '../mock/world';
import { RunConversation } from '../q/RunConversation';
import { startIntake, startSourcing } from '../q/scripts';
import { QPresence } from '../q/QPresence';
import { Banner, Button, Composer, Field, Label, Segmented } from '../ui/kit';
import { navigate } from '../ui/router';
import type { Mandate } from '@contracts';

export function MandateIntake() {
  const m = useWorld((w) => w.mandate);
  const network = useWorld((w) => w.network);
  const runId = useNamedRun('intake');
  const view = useRun(runId, network);
  const awaitingApproval = view.pendingApproval === 'prop_mandate_publish';
  const approved = m.status !== 'DRAFT';

  const approve = () => {
    if (runId && awaitingApproval) respond(runId, 'prop_mandate_publish', 'APPROVED');
    else update((d) => { d.mandate.status = 'APPROVED'; d.mandate.approvedBy = 'Ada Okafor'; log(d, 'You', 'Approved the Senior Backend mandate v1 (form)'); });
    startSourcing();
    setTimeout(() => navigate('/r/sourcing'), 700);
  };
  const set = (patch: Partial<Mandate>) => update((d) => { Object.assign(d.mandate, patch); });

  return (
    <main className="split">
      <section className="split-conv" aria-labelledby="mi-h">
        <div className="row gap-4"><QPresence state={view.status === 'IDLE' ? 'idle' : view.pendingInput || awaitingApproval ? 'waiting' : view.completed ? 'done' : 'thinking'} size={48} />
          <div className="stack"><span className="t-label q-text">New role</span><h1 id="mi-h" className="t-heading">Who do you need?</h1></div></div>
        {!runId && !approved && (
          <div className="stack gap-4">
            <p className="muted measure">Describe the role in your own words. Q drafts the mandate on the right and asks only what it can’t work out. You can also fill in the form yourself.</p>
            <Composer onSend={(t) => startIntake(t)} suggestion="I need a senior backend engineer for payments" label="Describe the role" />
          </div>
        )}
        <div className="grow"><RunConversation runId={runId} view={view} onRetry={() => startIntake('Senior backend engineer for payments')} /></div>
        {approved && <Banner tone="ok" title={`Approved by ${m.approvedBy ?? 'you'}`} action={<Button compact onClick={() => navigate('/r/sourcing')}>See the search</Button>}>Version {m.version}. Q is searching. Any edit creates version {m.version + 1} and needs approval again.</Banner>}
      </section>

      <section className="split-art paper" aria-labelledby="mandate-h">
        <form className="stack gap-8" style={{ maxWidth: 760 }} onSubmit={(e) => { e.preventDefault(); approve(); }}>
          <div className="stack gap-2">
            <span className="t-label">Mandate · version {m.version} · {m.status === 'DRAFT' ? 'draft' : m.status.toLowerCase()}</span>
            <h2 id="mandate-h" className="t-display">{m.title}</h2>
            <p className="muted">{m.team} · Kora Pay</p>
          </div>
          <fieldset disabled={approved} className="stack gap-6" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">Role details</legend>
            <div className="grid-2">
              <Field label="Role title" value={m.title} onChange={(e) => set({ title: e.target.value })} />
              <Field label="Pay band" value={m.payBand} onChange={(e) => set({ payBand: e.target.value })} help="Kora Pay’s handbook asks for this in the first message." />
            </div>
            <div className="stack gap-2">
              <span className="field-label" id="wm">How they’ll work</span>
              <Segmented label="How they’ll work" value={m.workMode} onChange={(v) => set({ workMode: v })} options={[{ value: 'HYBRID', label: 'Hybrid' }, { value: 'ONSITE', label: 'Onsite' }, { value: 'REMOTE', label: 'Remote' }]} />
            </div>
            <div className="stack gap-3">
              <Label as="h3">Requirements, hardest first</Label>
              <ol className="stack">
                {m.requirements.map((r, i) => (
                  <li key={r.reqId} className="row gap-4 wrap" style={{ padding: '14px 0', borderTop: '1px solid var(--color-line)' }}>
                    <span className="t-mono subtle" style={{ width: 20 }}>{i + 1}</span>
                    <div className="stack grow"><span style={{ fontWeight: 500 }}>{r.label}</span><span className="t-caption">{r.plain}</span></div>
                    <label className="switch"><input type="checkbox" role="switch" checked={r.mustHave} onChange={(e) => update((d) => { d.mandate.requirements[i].mustHave = e.target.checked; })} /><span>Must have</span></label>
                  </li>
                ))}
              </ol>
            </div>
          </fieldset>
          {!approved && (
            <div className="row wrap gap-3">
              <Button type="submit" variant="primary">{awaitingApproval ? 'Approve and start searching' : 'Approve this mandate'}</Button>
              <span className="t-caption">Q searches only after you approve. It will not contact anyone.</span>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
