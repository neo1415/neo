// Proactive rules for evidence-first hiring (J12 step 8 and 9, recruiter side). Each reads authoritative state (the
// reuse decisions and interest checks in the proof slice), only for the viewer's organisation, and only for people
// the organisation may still see. Suggestions prepare; nothing here acts on its own.
import { registerRule } from '../core/proactive';
import { canSeeCandidate } from '../../mock/world';
import { proof } from '../../state/areas/proof';
import { firstName, shortLabel } from '../../journeys/hire-b/model';

// "Seyi Okoro sent the Postgres sample. It counts once a person reviews it."
registerRule({
  id: 'ev.sample-submitted', side: 'recruiter', priority: 'high',
  evaluate: (w, actor) => proof(w).reuse.filter((d) => d.orgId === actor.orgId && d.state === 'SUBMITTED' && canSeeCandidate(w, d.personId, d.orgId)).map((d) => {
    const f = firstName(w, d.personId);
    return {
      subject: `sample:${d.id}`,
      text: `${f} sent the ${d.effortMinutes}-minute ${shortLabel(w, d.reqId)} sample (simulated). It counts once a person reviews it.`,
      why: `Kora asked for one short sample instead of the full assessment. Until someone reviews it, it reads as Self-reported, and the comparison doesn’t count it.`,
      actions: [{ label: `Review ${f}’s sample`, primary: true, act: { t: 'say' as const, text: `review ${f.toLowerCase()}'s sample` } }, { label: 'Open the profile', act: { t: 'nav' as const, to: `/r/people/${d.personId}` } }],
    };
  }),
});

// "Tobi answered: interested." Interest is shown apart from suitability and never scored.
registerRule({
  id: 'ev.interest-answered', side: 'recruiter', priority: 'normal',
  evaluate: (w, actor) => proof(w).interest.filter((i) => i.orgId === actor.orgId && i.state !== 'REQUESTED' && canSeeCandidate(w, i.personId, i.orgId)).map((i) => {
    const f = firstName(w, i.personId);
    return {
      subject: `interest:${i.personId}:${i.state}`,
      text: i.state === 'CONFIRMED' ? `${f} said yes: interested in the Senior Backend role.` : `${f} said no, thanks, to the Senior Backend role.`,
      why: 'You asked through an approved message. Interest is kept apart from the evidence and isn’t scored either way.',
      actions: [{ label: `Open ${f}’s profile`, primary: true, act: { t: 'nav' as const, to: `/r/people/${i.personId}` } }],
    };
  }),
});
