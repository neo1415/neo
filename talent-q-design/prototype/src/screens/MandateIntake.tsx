// P3 · SC-027 Create mandate, SC-028 Hiring intake, SC-029 Structured editor.
// The brief is the canvas. Q's intake questions now live in the one global conversation (skill
// hire-a.kora.intake); this page shows and edits the same mandate. Approval binds to this exact version.
import { update, useWorld, actorOf, log, emit } from '../mock/world';
import { Canvas } from '../ds/Workspace';
import { Glyph } from '../ds/Glyph';
import { Field, Label, Segmented } from '../ui/kit';
import { SwitchRow } from '../ds/Switch';
import { Link } from '../ui/router';
import { runAction } from '../q/core/engine';
import { prefillQ } from '../q/QThread';
import { openQ } from '../journeys/hire-a/ui';
import type { Mandate } from '@contracts';

export function MandateIntake() {
  const m = useWorld((w) => w.mandate);
  const a = useWorld((w) => actorOf(w));
  const intake = useWorld((w) => (w.areas['hire-a'] as { koraIntake?: { step: string } } | undefined)?.koraIntake?.step);
  if (a.orgId !== 'org_kora') return (
    <Canvas title="Your role briefs live in Roles" kicker="Role brief" open onClose={openQ}>
      <section className="ds-sheet hire-a-empty"><p style={{ margin: 0 }}>This page holds another organisation’s brief, so it isn’t shown to you. Your own briefs are in Roles.</p><Link to="/r/roles" className="ds-btn primary">Open your roles</Link></section>
    </Canvas>
  );
  const approved = m.status !== 'DRAFT';
  const set = (patch: Partial<Mandate>) => update((d) => { Object.assign(d.mandate, patch); emit(d, a.id, 'mandate.revised', `ORG:${a.orgId}`, `${a.name} edited the Senior Backend brief: ${Object.keys(patch).join(', ')}.`); });
  const approve = () => void runAction({ label: 'Approve', act: { t: 'do', op: 'hire-a.kora.approve' } });
  return (
    <Canvas title={m.title} kicker={<>Role brief · {m.team}</>} aside={<span className="ds-tag" data-k={approved ? 'ok' : 'busy'}><span className="num">v{m.version}</span> · {approved ? 'Approved' : 'Draft'}</span>} open onClose={openQ}
      qLine={intake === 'mode' ? 'Is it hybrid in Lagos, onsite, or remote?' : intake === 'hardest' ? 'What’s the hardest part of the job?' : approved ? 'Approved. I’m searching.' : 'Check the brief, then approve it.'}>
      <form className="hire-a-legacy" onSubmit={(e) => { e.preventDefault(); approve(); }}>
        {approved ? (
          <div className="ds-banner hire-a-banner" role="status"><Glyph k="verified" /><span><b>Approved by {m.approvedBy ?? 'you'}.</b> Version {m.version}. Q is searching. Any edit creates version {m.version + 1} and needs approval again.</span><Link to="/r/sourcing" className="ds-btn">See the search</Link></div>
        ) : (
          <div className="ds-banner hire-a-banner" data-k="warn" role="status"><Glyph k="none" /><span>{intake && intake !== 'review' ? <>Q is asking you {intake === 'mode' ? 'how they’ll work' : 'about the hardest part of the job'} in the conversation. You can answer there or edit here.</> : <><b>Draft, not approved yet.</b> Edit it here or describe it to Q in your own words. Q searches only after you approve.</>}</span>
            {!intake && <button type="button" className="ds-btn" onClick={() => { prefillQ('I need a senior backend engineer for payments'); openQ(); }}>Describe it to Q</button>}</div>
        )}
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
            <Label as="h2">Requirements, hardest first</Label>
            <p className="t14 muted" style={{ margin: 0 }}>Switch on what someone must have. The rest are nice to have.</p>
            {/* On/off per requirement: a shared SwitchRow, so state reads as words (On = must have), not only colour. */}
            <div>
              {m.requirements.map((r, i) => (
                <SwitchRow key={r.reqId} on={r.mustHave} label={<><span className="t-mono subtle" style={{ marginRight: 8 }}>{i + 1}</span>{r.label} <span className="ds-tag" style={{ marginLeft: 6, fontWeight: 400 }}>{r.mustHave ? 'Must have' : 'Nice to have'}</span></>} help={r.plain}
                  onChange={(v) => { if (approved) return; update((d) => { d.mandate.requirements[i].mustHave = v; log(d, 'You', `Set ${r.label} to ${v ? 'must have' : 'nice to have'}`); }); }} />
              ))}
            </div>
          </div>
        </fieldset>
        {!approved && (
          <div className="ds-actions">
            <button type="submit" className="ds-btn primary">Approve and start searching</button>
            <span className="t14 muted">Q searches only after you approve. It will not contact anyone.</span>
          </div>
        )}
      </form>
    </Canvas>
  );
}
