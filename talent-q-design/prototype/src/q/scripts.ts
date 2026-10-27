// Q behaviours for the prototype, written against the run contract. Each unit of progress corresponds to
// a unit of simulated work; nothing advances on a timer alone.
import type { ActionProposal, ContextUse, MessagePayload, RunId } from '@contracts';
import { FITS, MANDATE, PEOPLE, POLICIES, SOURCE_POOL, BUSY } from '../mock/fixtures';
import { getWorld, log, now, setSchedulingState, uid, update } from '../mock/world';
import { latency, nameRun, startRun, type ScriptContext } from '../mock/runtime';
import { calculateSlots } from './slots';

export async function sha256(text: string): Promise<`sha256:${string}`> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `sha256:${[...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

const pol = (id: string): ContextUse => { const p = POLICIES.find((x) => x.policyId === id)!; return { kind: 'POLICY', label: `${p.title} v${p.version}`, ref: `${p.policyId}@${p.version}` }; };
const memUse = (id: string, label: string): ContextUse => ({ kind: 'MEMORY', label, ref: id });

// ---------------- Sourcing (P4) ----------------
export function startSourcing(): RunId {
  const runId = nameRun('sourcing', startRun('talent.sourcing', 'Find people for Senior Backend', async (ctx) => {
    const w = getWorld();
    const resumeAt = w.sourcing.cursor;
    update((d) => { d.sourcing.runId = ctx.runId; d.mandate.status = 'SOURCING'; log(d, 'Q', resumeAt ? `Resumed sourcing at profile ${resumeAt + 1} of ${SOURCE_POOL.length}` : 'Started sourcing for Senior Backend'); });

    ctx.stage('APPLYING_POLICY', 'POLICY_CHECK');
    ctx.step({ stepId: 'policy', stage: 'APPLYING_POLICY', label: 'Applying Kora Pay’s rules', done: 0, total: 3, result: 'RUNNING' });
    for (let i = 1; i <= 3; i++) { await ctx.work(180); ctx.step({ stepId: 'policy', stage: 'APPLYING_POLICY', label: 'Applying Kora Pay’s rules', done: i, total: 3, result: i === 3 ? 'DONE' : 'RUNNING' }); }

    ctx.stage('SEARCHING_SOURCES', 'RETRIEVAL');
    const sources = ['Talent Q profiles (opted in)', 'Public code repositories', 'PeopleGraph (licensed directory)'];
    ctx.step({ stepId: 'sources', stage: 'SEARCHING_SOURCES', label: 'Searching 3 permitted sources', done: 0, total: 3, result: 'RUNNING' });
    for (let i = 0; i < 3; i++) {
      await ctx.work(320);
      ctx.find('source', sources[i], i === 2 ? 'Unavailable: rate limited' : 'Searched');
      ctx.step({ stepId: 'sources', stage: 'SEARCHING_SOURCES', label: 'Searching 3 permitted sources', done: i + 1, total: 3, result: i === 2 ? 'DONE' : 'RUNNING',
        failure: i === 2 ? { code: 'RATE_LIMITED', recoverable: true, message: 'PeopleGraph is rate-limiting us. 2 of 3 sources searched; I’ll retry it tonight.' } : undefined });
    }
    update((d) => { d.sourcing.failedSource = true; });

    ctx.stage('READING_PROFILES', 'SPECIALIST_EXECUTION');
    const total = SOURCE_POOL.length;
    const matching = new Set(['p_tobi', 'p_ife', 'p_kunle']);
    for (let i = resumeAt; i < total; i++) {
      ctx.step({ stepId: 'read', stage: 'READING_PROFILES', label: 'Reading profiles against 5 requirements', done: i, total, result: 'RUNNING' });
      await ctx.work(160);
      const pid = SOURCE_POOL[i];
      if (matching.has(pid)) {
        const p = PEOPLE.find((x) => x.personId === pid)!;
        ctx.find('candidate', pid, `${p.name}: ${p.headline}`);
        update((d) => { if (!d.sourcing.found.includes(pid)) d.sourcing.found.push(pid); });
      }
      update((d) => { d.sourcing.cursor = i + 1; });
    }
    ctx.step({ stepId: 'read', stage: 'READING_PROFILES', label: 'Reading profiles against 5 requirements', done: total, total, result: 'DONE' });

    ctx.stage('CHECKING_EVIDENCE');
    const found = getWorld().sourcing.found;
    ctx.step({ stepId: 'evidence', stage: 'CHECKING_EVIDENCE', label: 'Checking shared evidence', done: 0, total: found.length, result: 'RUNNING' });
    for (let i = 0; i < found.length; i++) { await ctx.work(380); ctx.step({ stepId: 'evidence', stage: 'CHECKING_EVIDENCE', label: 'Checking shared evidence', done: i + 1, total: found.length, result: i + 1 === found.length ? 'DONE' : 'RUNNING' }); }

    ctx.stage('COMPARING_CANDIDATES', 'SYNTHESIS');
    ctx.step({ stepId: 'compare', stage: 'COMPARING_CANDIDATES', label: 'Building the comparison', done: 0, total: null, result: 'RUNNING' });
    await ctx.work(500);
    ctx.step({ stepId: 'compare', stage: 'COMPARING_CANDIDATES', label: 'Building the comparison', done: 1, total: null, result: 'DONE' });
    update((d) => { d.sourcing.done = true; d.mandate.shortlist = [...found]; log(d, 'Q', `Shortlisted ${found.length} of ${total} profiles for Senior Backend`); });

    await ctx.say(`I read ${total} profiles. Three fit enough to compare. Tobi is the closest on the hardest requirement, payments reconciliation. Nobody has shown on-call leadership yet, so that belongs in the interview.`,
      [{ kind: 'AUTHORIZED_FACT', label: 'Mandate v1 (approved)' }, pol('pol_platform_consent'), { kind: 'KNOWLEDGE_SOURCE', label: '2 of 3 sources' }, { kind: 'INFERENCE', label: 'Fit per requirement' }]);
    return ['art_compare_backend'];
  }));
  return runId;
}

// ---------------- Mandate intake (P3) ----------------
export function startIntake(request: string): RunId {
  return nameRun('intake', startRun('mandate.intake', 'Shape the Senior Backend mandate', async (ctx) => {
    ctx.stage('UNDERSTANDING_REQUEST', 'CONTEXT_RESOLUTION');
    await ctx.work(400);
    await ctx.say(`I’ll draft this as you talk. You said: “${request}”. I’ve filled in what I could from Kora Pay’s last backend role.`, [{ kind: 'CURRENT_PROMPT', label: 'your message' }, { kind: 'KNOWLEDGE_SOURCE', label: 'Platform engineer mandate, Aug' }]);
    ctx.stage('READING_MANDATE', 'PLANNING');
    const mode = await ctx.ask('Is this role hybrid in Lagos, onsite, or open to remote?', ['Hybrid, Lagos', 'Onsite, Lagos', 'Remote in Africa']);
    update((d) => { d.mandate.workMode = mode.startsWith('Hybrid') ? 'HYBRID' : mode.startsWith('Onsite') ? 'ONSITE' : 'REMOTE'; d.mandate.location = mode.startsWith('Remote') ? 'Remote (Africa)' : 'Lagos'; });
    const hardest = await ctx.ask('What is the hardest part of the job, the thing they must already have done?', ['Payments reconciliation', 'Scaling Go services', 'Postgres performance']);
    update((d) => {
      const idx = hardest.startsWith('Payments') ? 0 : hardest.startsWith('Scaling') ? 1 : 2;
      const reqs = [...MANDATE.requirements]; const [h] = reqs.splice(idx, 1); d.mandate.requirements = [h, ...reqs];
    });
    ctx.stage('APPLYING_POLICY', 'POLICY_CHECK');
    await ctx.work(300);
    await ctx.say('Kora Pay’s handbook asks for the pay band in the first message, so I’ve added it to the mandate. Check the requirements on the right. Change anything, then approve it so I can start looking.', [pol('pol_kora_tone'), { kind: 'INFERENCE', label: 'Requirements from your answers' }]);
    ctx.stage('WAITING_FOR_APPROVAL', 'AWAITING_APPROVAL');
    const hash = await sha256(JSON.stringify(getWorld().mandate));
    const decision = await ctx.approval('prop_mandate_publish', hash);
    if (decision === 'APPROVED') {
      update((d) => { d.mandate.status = 'APPROVED'; d.mandate.approvedBy = 'Ada Okafor'; log(d, 'You', 'Approved the Senior Backend mandate v1'); });
      await ctx.say('Approved. I’m starting the search now. You can leave this page; I’ll keep going.');
    }
    return ['art_mandate_backend'];
  }));
}

// ---------------- Outreach (P6) ----------------
export async function draftOutreach(personId: string): Promise<ActionProposal<MessagePayload>> {
  const p = PEOPLE.find((x) => x.personId === personId)!;
  const fit = FITS.find((f) => f.personId === personId);
  const first = p.name.split(' ')[0];
  const strong = fit?.byRequirement.find((r) => r.state === 'VERIFIED_CAPABILITY');
  const tone = getWorld().memories.find((m) => m.memory_id === 'mem_ada_tone' && m.lifecycle_status === 'active');
  const sign = tone ? 'Ada, Kora Pay hiring' : 'Ada Okafor\nTalent team, Kora Pay';
  const body = `Hi ${first},\n\nYour ${strong ? strong.note.toLowerCase() : 'recent work'} is close to the hardest part of a role we’re hiring for: Senior Backend Engineer on Kora Pay’s payments platform team, hybrid in Lagos, ${MANDATE.payBand}.\n\nWould a 45-minute call next week suit you? If you’d rather not hear from us, reply “stop” and we won’t contact you again. You can see what we hold about you, and ask us to delete it, at any time.\n\n${sign}`;
  const payload: MessagePayload = { to: { personId, name: p.name }, channel: 'EMAIL', subject: 'Senior Backend at Kora Pay', body, attachments: [] };
  const proposal: ActionProposal<MessagePayload> = {
    proposalId: uid('prop'), runId: 'run_outreach', actionType: 'message.send', actionClass: 'CONFIRM_REQUIRED',
    summary: `Email ${p.name} about Senior Backend`, preview: body, payload, payloadHash: await sha256(JSON.stringify(payload)),
    delegation: getWorld().org.delegation,
    policies: ['pol_platform_consent', 'pol_ng_ndpa', 'pol_kora_tone'].map((id) => { const x = POLICIES.find((y) => y.policyId === id)!; return { policyId: x.policyId, version: x.version, layer: x.layer, text: x.text }; }),
    evidenceRefs: fit?.byRequirement.flatMap((r) => r.evidenceIds) ?? [], status: 'AWAITING_APPROVAL', simulated: true,
  };
  update((d) => { d.proposals = d.proposals.filter((x) => !(x.payload.to.personId === personId && x.status === 'AWAITING_APPROVAL')); d.proposals.unshift(proposal); log(d, 'Q', `Drafted outreach to ${p.name} for your approval`); });
  return proposal;
}

/** Approve exactly the reviewed payload. An edited body changes the hash, so the approval re-binds to the new text. */
export async function approveOutreach(proposalId: string, editedBody?: string) {
  const prop = getWorld().proposals.find((x) => x.proposalId === proposalId);
  if (!prop) return;
  const payload = { ...prop.payload, body: editedBody ?? prop.payload.body };
  const hash = await sha256(JSON.stringify(payload));
  update((d) => { const x = d.proposals.find((y) => y.proposalId === proposalId)!; x.payload = payload; x.preview = payload.body; x.payloadHash = hash; x.status = 'EXECUTING'; });
  await latency(600); // policy recheck + simulated send
  update((d) => {
    const x = d.proposals.find((y) => y.proposalId === proposalId)!;
    x.status = 'EXECUTED';
    d.receipts.unshift({ proposalId, outcome: 'EXECUTED', idempotencyKey: `idem_${hash.slice(7, 19)}`, provider: 'Email (simulated)', providerRef: `sim-${hash.slice(7, 15)}`, simulated: true, at: now(), approvedBy: 'Ada Okafor' });
    d.chat.candidate.push({ id: uid('m'), who: 'q', text: `New message from Kora Pay:\n\n${payload.body}`, at: now() });
    log(d, 'You', `Approved and sent outreach to ${payload.to.name} (simulated email)`);
  });
}

// ---------------- Scheduling (P7, P8) ----------------
export function earliestFromMemory(): string {
  const m = getWorld().memories.find((x) => x.memory_key === 'recruiter.meeting.window' && x.lifecycle_status === 'active');
  return (m?.structured_value.earliestLocal as string) || '09:00';
}

export function startScheduling(personId: string): RunId {
  const p = PEOPLE.find((x) => x.personId === personId)!;
  return nameRun('schedule', startRun('schedule.interview', `Schedule ${p.name}`, async (ctx: ScriptContext) => {
    update((d) => {
      d.scheduling = { requestId: uid('sch'), mandateId: 'm_backend', candidateId: personId, panel: [{ personId: 'p_ada', name: 'Ada Okafor', provider: 'GOOGLE', required: true }, { personId: 'p_seyi', name: 'Seyi Balogun', provider: 'MICROSOFT', required: true }],
        durationMinutes: d.prefs.defaultDurationMinutes, mode: 'VIDEO', state: 'DRAFT_REQUEST', history: [{ state: 'DRAFT_REQUEST', at: now() }], slots: [], delegation: d.org.delegation, channel: 'EMAIL' };
    });
    ctx.stage('APPLYING_POLICY', 'POLICY_CHECK');
    update((d) => setSchedulingState(d, 'POLICY_AND_CONSENT_CHECK', 'Interview hours 09:00–17:00 Lagos; candidate replied to outreach'));
    await ctx.work(400);
    ctx.stage('CHECKING_CALENDARS', 'RETRIEVAL');
    update((d) => setSchedulingState(d, 'CALENDAR_CONNECTION_CHECK'));
    await ctx.work(300);
    const ada = getWorld().calendars.find((c) => c.personId === 'p_ada');
    if (!ada || ada.health === 'NOT_CONNECTED' || ada.health === 'REVOKED' || ada.health === 'TOKEN_EXPIRED') {
      update((d) => setSchedulingState(d, 'FAILED', 'Your calendar is not connected'));
      throw new Error('Your Google calendar is not connected, so I can’t see when you’re free. Connect it (free/busy only), then try again.');
    }
    update((d) => setSchedulingState(d, 'AVAILABILITY_READ', 'Busy times only, for Ada (Google) and Seyi (Outlook)'));
    ctx.step({ stepId: 'fb', stage: 'CHECKING_CALENDARS', label: 'Reading busy times (no event details)', done: 0, total: 2, result: 'RUNNING' });
    await ctx.work(350); ctx.step({ stepId: 'fb', stage: 'CHECKING_CALENDARS', label: 'Reading busy times (no event details)', done: 1, total: 2, result: 'RUNNING' });
    await ctx.work(350); ctx.step({ stepId: 'fb', stage: 'CHECKING_CALENDARS', label: 'Reading busy times (no event details)', done: 2, total: 2, result: 'DONE' });

    ctx.stage('CALCULATING_SLOTS', 'SYNTHESIS');
    const earliest = earliestFromMemory();
    const w = getWorld();
    const slots = calculateSlots({ weekStartUtc: '2026-11-02T00:00:00Z', prefs: w.prefs, earliestLocal: earliest, busy: [BUSY.p_ada, BUSY.p_seyi], candidateTz: p.timezone, durationMin: w.prefs.defaultDurationMinutes, nowUtc: '2026-10-28T09:00:00Z' });
    update((d) => { d.scheduling!.slots = slots; setSchedulingState(d, 'SLOTS_CALCULATED', `${slots.length} options, earliest ${earliest} (from your remembered preference)`); });
    await ctx.say(`I found ${slots.length} times that suit you and Seyi. They start no earlier than ${earliest}, keep your Tuesday review clear, and come mornings first, as you asked on 20 Oct. Seyi’s calendar is Outlook; I only read when he’s busy.`,
      [memUse('mem_ada_hours', 'Your meeting hours (20 Oct)'), pol('pol_kora_hours'), { kind: 'KNOWLEDGE_SOURCE', label: 'Busy times: Google + Outlook' }]);
    update((d) => setSchedulingState(d, 'RECRUITER_CONFIRMATION'));
    const decision = await ctx.approval('prop_send_slots', await sha256(JSON.stringify(slots)));
    if (decision !== 'APPROVED') { update((d) => setSchedulingState(d, 'CANCELLED', 'You chose not to send')); return; }
    update((d) => {
      setSchedulingState(d, 'CANDIDATE_PROPOSAL_SENT', 'Email with a private link to choose a time (simulated)');
      setSchedulingState(d, 'AWAITING_CANDIDATE');
      d.chat.candidate.push({ id: uid('m'), who: 'q', text: 'Kora Pay offered interview times. Choose one, suggest another, or change how we contact you.', at: now(), link: { label: 'Choose a time', to: '/c/slots' } });
      log(d, 'You', `Sent ${slots.length} interview times to ${p.name}`);
    });
    ctx.stage('WAITING_FOR_REPLY', 'AWAITING_INPUT');
  }));
}

/** Runs when the candidate picks a time. Recheck → write → provider ack. A choice is not a booking until the ack. */
export async function commitBooking(slotId: string) {
  update((d) => { d.scheduling!.chosenSlotId = slotId; setSchedulingState(d, 'CANDIDATE_ACCEPTS'); setSchedulingState(d, 'AVAILABILITY_RECHECK', 'Rechecking busy times just before booking'); });
  await latency(900);
  const s = getWorld().scheduling!;
  const taken = getWorld().scenarios.slotTakenAfterProposal && slotId === s.slots[0]?.slotId;
  if (taken) {
    update((d) => {
      d.scheduling!.slots = d.scheduling!.slots.filter((x) => x.slotId !== slotId);
      d.scenarios.slotTakenAfterProposal = false;
      setSchedulingState(d, 'SLOTS_CALCULATED', 'Seyi’s calendar changed after we offered this time. It was removed; other times still stand.');
      setSchedulingState(d, 'AWAITING_CANDIDATE');
      log(d, 'Q', 'A proposed time became busy before booking; offered the remaining times');
    });
    return 'TAKEN' as const;
  }
  update((d) => setSchedulingState(d, 'EVENT_WRITE', 'Creating the event on Ada’s and Seyi’s calendars (simulated)'));
  await latency(900);
  update((d) => {
    setSchedulingState(d, 'PROVIDER_ACK');
    const key = `idem_${slotId}`;
    d.bookingReceipt = { provider: 'GOOGLE', eventId: `sim_evt_${slotId.slice(5)}`, etag: '"3381920112"', idempotencyKey: key, conferenceLink: 'meet.example/kora-backend', simulated: true, at: now() };
    setSchedulingState(d, 'BOOKED', 'Simulated provider receipt received');
    setSchedulingState(d, 'REMINDERS', 'Reminders 24h and 1h before, by email');
    d.chat.recruiter.push({ id: uid('m'), who: 'q', text: 'Tobi chose a time and it’s booked. The calendar receipt is simulated in this prototype.', at: now(), link: { label: 'See the booking', to: '/r/calendar' } });
    log(d, 'Candidate', 'Tobi chose an interview time; booked (simulated receipt)');
  });
  return 'BOOKED' as const;
}

export function counterpropose(text: string) {
  update((d) => {
    d.scheduling!.counterProposal = { text, windows: [] };
    setSchedulingState(d, 'CANDIDATE_COUNTERPROPOSES', text);
    d.chat.recruiter.push({ id: uid('m'), who: 'q', text: `Tobi suggested another time: “${text}”. I’ll check it against your calendar when you say so.`, at: now(), link: { label: 'Review', to: '/r/calendar' } });
    log(d, 'Candidate', 'Tobi suggested a different time');
  });
}
