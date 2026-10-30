// Feature test · HIRE-D (coverage build, 30 Oct): SC-033 search scope, SC-034 Explore Talent, SC-046 search empty state,
// SC-053 calendar booking, SC-056 candidate stage detail, SC-058 offer handoff, SC-060 placement outcome journal,
// SC-159 reminder queue; motions MO-013 (comparison morph) and MO-046 (invite delivery status). Desktop and phone.
// Candidate and provider events (Zara opening a message, a delivery receipt, a consent answer) are simulated through
// the page's labelled testing controls or the candidate's own page, never by injecting the recruiter's actions.
// Usage: BASE=http://localhost:5213/ node qa/scripts/features/hire-d.mjs   [ONLY=d|m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const BASE = (process.env.BASE || 'http://localhost:5213/').replace(/\/?$/, '/');
const ONLY = (process.env.ONLY || 'd,m').split(',');
const OUT = fileURLToPath(new URL('../../../captures/features/hire-d/', import.meta.url)); mkdirSync(OUT, { recursive: true });
const b = await pw.chromium.launch();
const errors = []; let pass = 0, fail = 0;
const step = (v, name, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail && !ok ? ` · ${String(detail).replace(/\s+/g, ' ').slice(0, 260)}` : ''}`); };
const BAD = /\b(reject\w*|liar|fake|dishonest|not a fit)\b/i;

for (const [v, vp] of [['d', { width: 1440, height: 900 }], ['m', { width: 390, height: 844 }]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text().slice(0, 200)}`); });
  const phone = v === 'm';
  let n = 0;
  const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${v}-${String(++n).padStart(2, '0')}-${name}.png`, fullPage: !phone }); };
  const overflow = async (x) => { const o = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.ds-canvas')].map((e) => e.scrollWidth)) - innerWidth); if (o > 1) errors.push(`${v}/${x}: horizontal overflow ${o}px`); return o <= 1; };
  const world = () => page.evaluate(() => window.__tqQA.getWorld());
  const lastQ = async () => { const w = await world(); const t = w.q.threads[w.session.actor] ?? []; return [...t].reverse().find((m) => m.who !== 'me')?.text ?? ''; };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.count()) await x.first().click().catch(() => {}); await page.waitForTimeout(250); };
  const openQ = async () => { if (!phone) return; const bar = page.locator('.ds-askbar button'); if (await bar.count() && await bar.first().isVisible()) await bar.first().click(); await page.waitForTimeout(300); };
  const ask = async (text, wait = 900) => { await openQ(); await page.locator('#q-ask').fill(text); await page.locator('#q-ask').press('Enter'); await page.waitForTimeout(wait); await closeQ(); };
  // The dev server is shared with other builders' hot reloads: retry a navigation once if the app didn't mount.
  const go = async (r, as) => { for (let i = 0; i < 3; i++) { await page.goto(`${BASE}?n=${Math.random()}#${r}${as ? `?as=${as}` : ''}`); if (await page.waitForSelector('.ds-app', { timeout: 20000 }).then(() => true).catch(() => false)) break; } await page.waitForTimeout(900); await closeQ(); };
  const canvas = () => page.locator('.ds-canvas').first().innerText();
  const btn = (name, scope = '.ds-canvas') => page.locator(scope).first().getByRole('button', { name, exact: false }).first();
  const click = async (name, scope) => { await btn(name, scope).click(); await page.waitForTimeout(500); };
  const sw = (label) => page.locator('.ds-canvas .ds-switchrow', { hasText: label }).first().getByRole('switch');

  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear());
  await go('/r/explore', 'u_ada');

  // ---- SC-034 Explore Talent landing ----
  let t = await canvas();
  step(v, 'SC-034 landing: curated roles with status and pipeline counts', /Your roles/.test(t) && /Senior Backend Engineer/.test(t) && /in the pipeline/.test(t), t.slice(0, 300));
  step(v, 'SC-034 landing: saved discovery with "new since last look", re-run against permissions', /Saved discovery/.test(t) && /Postgres in production/.test(t) && /new since last look/.test(t) && /today’s permissions/.test(t), t);
  step(v, 'SC-034 landing: says LinkedIn isn’t used and nobody is contacted', /LinkedIn isn’t used/.test(t) && /Nobody is contacted/.test(t));
  await overflow('explore'); await shot('explore-landing');
  await page.fill('#hd-q', 'go'); await page.locator('#hd-q').press('Enter');
  await page.waitForTimeout(200);
  const busy = await page.locator('.hd-loading[aria-busy="true"]').count();
  await page.waitForTimeout(600);
  t = await canvas();
  step(v, 'SC-034 loading state is shown and labelled as a local simulated read', busy === 1);
  step(v, 'SC-034 results: people with their source, matched on shared words, not a score', /people for “go”/.test(t) && /Tobi Adeyemi/.test(t) && /(Applied|Shared with you|Open to being found)/.test(t) && /not a score/.test(t), t.slice(0, 400));
  await click('Save this search');
  let w = await world();
  step(v, 'SC-034 save a discovery (store)', w.areas['hire-d'].saved.some((s) => s.query === 'go' && s.by === 'u_ada'));
  await shot('explore-results');

  // ---- SC-046 Search empty state ----
  await page.fill('#hd-q', 'rust in kano'); await page.locator('#hd-q').press('Enter'); await page.waitForTimeout(800);
  t = await canvas();
  step(v, 'SC-046 empty: reasons (no one mentions rust; privacy note without counts)', /No one found for “rust in kano”/.test(t) && /mentions “rust”/.test(t) && /chose not to be found aren’t shown or counted/.test(t), t.slice(0, 500));
  step(v, 'SC-046 empty: repair suggestions and alternate sourcing', /Try a related skill: Go/.test(t) && /Post the role/.test(t) && /referrals/.test(t) && /agency partner/.test(t), t);
  step(v, 'SC-046 empty: no blame language', !BAD.test(t));
  await overflow('empty'); await shot('search-empty');
  await click('Try a related skill: Go'); await page.waitForTimeout(800);
  t = await canvas();
  step(v, 'SC-046 repair runs: "go kano" → place reason and "search without kano"', /No one found for “go kano”/.test(t) && /match the skills, but not in Kano/.test(t), t.slice(0, 300));
  await click('Search without'); await page.waitForTimeout(800);
  step(v, 'SC-046 repair leads to results', /people for “go”/.test(await canvas()));

  // ---- SC-033 Search scope & sources ----
  await go('/r/sourcing/scope');
  t = await canvas();
  step(v, 'SC-033 permitted sources with why, licence, freshness and coverage', /Sources Q may use/.test(t) && /Their discovery consent/.test(t) && /under your retention policy/.test(t) && /Checked each time a result is shown/.test(t) && /Last refreshed Mon 12 Oct/.test(t), t.slice(0, 500));
  step(v, 'SC-033 states LinkedIn extraction is not used (pack decision)', /LinkedIn profiles/.test(t) && /never extracts or scrapes LinkedIn/.test(t) && /Decided 30 Oct/.test(t));
  step(v, 'SC-033 stale source flagged', /Stale/i.test(t));
  await overflow('scope'); await shot('scope');
  if (phone) await sw('Talent Q members open to being found').click(); else await page.getByRole('switch', { name: 'Use Talent Q members open to being found' }).click();
  await page.waitForTimeout(500);
  w = await world();
  step(v, 'SC-033 switch a source off (store, with undo)', !w.areas['hire-d'].scope.org_kora.on.includes('discoverable') && w.q.undo.u_ada?.length > 0);
  await go('/r/explore'); await page.fill('#hd-q', 'lending'); await page.locator('#hd-q').press('Enter'); await page.waitForTimeout(800);
  t = await canvas();
  step(v, 'SC-046 reason: people in a source you switched off, with "Include" repair', /in a source you switched off/.test(t) && /Include Talent Q members/.test(t), t.slice(0, 400));
  await click('Include Talent Q members'); await page.waitForTimeout(600);
  w = await world();
  step(v, 'SC-046 repair re-includes the source', w.areas['hire-d'].scope.org_kora.on.includes('discoverable'));
  await ask('do you use linkedin?');
  let r = await lastQ();
  step(v, 'SC-033 by Q: LinkedIn question answered from the decision', /never extracts or scrapes LinkedIn/.test(r) && /permitted sources/.test(r), r);
  await ask('stop using evidence links in searches');
  w = await world();
  step(v, 'SC-033 by Q: leave out a source by name', !w.areas['hire-d'].scope.org_kora.on.includes('evidence'), await lastQ());
  await ask('undo'); await openQ();
  await page.locator('.ds-log button', { hasText: 'Undo it' }).last().click(); await page.waitForTimeout(600); await closeQ();
  w = await world();
  step(v, 'SC-033 by Q: undo restores it', w.areas['hire-d'].scope.org_kora.on.includes('evidence'));
  await go('/r/sourcing/scope');
  await sw('The evidence-link check fails').click(); await page.waitForTimeout(400);
  t = await canvas();
  step(v, 'SC-033 error state: source not refreshed, shown honestly', /Evidence links couldn’t be refreshed/.test(t) && /Not refreshed/i.test(t), t.slice(0, 300));
  await shot('scope-error');
  await sw('The evidence-link check fails').click(); await page.waitForTimeout(300);
  await go('/r/sourcing/scope', 'u_musa');
  t = await canvas();
  step(v, 'SC-033 permission: an interviewer can see, not change, sources', /only an owner, admin or recruiter can change them/.test(t) && await page.locator('.ds-canvas [role="switch"]').count() <= 1, t.slice(0, 200));

  // ---- SC-053 Calendar booking (Zara in Accra, Musa in London) ----
  await go('/r/calendar/book/p_zara', 'u_ada');
  t = await canvas();
  step(v, 'SC-053 mutual slots: team-free times marked against what Zara said', /Times that work for both sides/.test(t) && /Mornings, Accra time; not Wednesdays/.test(t) && /fits what Zara said/.test(t), t.slice(0, 500));
  step(v, 'SC-053 time zones: Lagos, Accra and London shown per slot', /Lagos/.test(t) && /Accra/.test(t) && /London/.test(t));
  step(v, 'SC-053 collisions: times ruled out with who is busy', /Ruled out/.test(t) && /(Seyi|Musa) busy/.test(t));
  step(v, 'SC-053 week chart reused from the calendar (busy times only)', await page.locator('.ds-canvas .hc-wk').count() > 0 && /Busy times only/.test(t));
  await page.locator('.ds-canvas [role="radio"]', { hasText: 'Phone call' }).click(); await page.waitForTimeout(300);
  step(v, 'SC-053 interview format chosen (shown as selected)', await page.locator('.ds-canvas [role="radio"][aria-checked="true"]', { hasText: 'Phone call' }).count() === 1);
  await overflow('book'); await shot('booking');
  await page.locator('.hd-slot[data-fits="yes"]').first().getByRole('button').click(); await page.waitForTimeout(800); await closeQ();
  w = await world();
  const bk = w.areas['hire-d'].bookings.at(-1);
  const hold = w.calendar.find((e) => e.id === bk?.holdId);
  const draft = w.threads.flatMap((x) => x.messages).find((m) => m.id === bk?.msgId);
  step(v, 'SC-053 honest booking: a hold on the panel only, the invitation a draft (nothing sent)', hold?.status === 'HOLD' && draft?.status === 'DRAFT' && /Held for your team, not booked yet/.test(await canvas()), JSON.stringify({ h: hold?.status, d: draft?.status }));
  step(v, 'SC-053 the invitation carries the chosen format', /phone interview/.test(draft?.body ?? ''), draft?.body);
  await click('Check the invitation'); await page.waitForTimeout(500); await closeQ();
  const ap = btn('Approve and send');
  step(v, 'SC-053 checks pass and ask a person to approve (hire-c checks reused)', await ap.count() === 1, await lastQ());
  if (await ap.count()) { await ap.click(); await page.waitForTimeout(900); await closeQ(); }
  w = await world();
  const sent = w.threads.flatMap((x) => x.messages).find((m) => m.id === bk?.msgId);
  t = await canvas();
  step(v, 'SC-053 after approval: invited, "booked only when Zara confirms"', sent?.status === 'SENT_SIMULATED' && /Invited: waiting for Zara to confirm/.test(t) && w.calendar.find((e) => e.id === bk.holdId)?.status === 'INVITED', t.slice(0, 300));

  // ---- MO-046 Invite delivery status ----
  let rail = page.locator('.hd-rail').first();
  step(v, 'MO-046 accepted, not delivered or read (truthful)', await rail.getAttribute('data-last') === 'accepted' && /Not tracked for email/.test(await rail.innerText()), await rail.innerText());
  await shot('delivery-accepted');
  await click('Simulate the delivery receipt'); await page.waitForTimeout(400);
  rail = page.locator('.hd-rail').first();
  w = await world();
  step(v, 'MO-046 delivered only after a (simulated) receipt; shared state updated', await rail.getAttribute('data-last') === 'delivered' && w.threads.flatMap((x) => x.messages).find((m) => m.id === bk.msgId)?.delivery === 'DELIVERED');
  const tr = await page.evaluate(() => [getComputedStyle(document.querySelector('.hd-rail-dot')).transitionDuration, getComputedStyle(document.documentElement).getPropertyValue('--motion-base').trim()]);
  step(v, 'MO-046 CSS motion uses the motion token (--motion-base)', (() => { const sec = (x) => (x.trim().endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x)); return Math.abs(sec(tr[0].split(',')[0]) - sec(tr[1])) < 0.001; })(), tr.join(' / '));
  await ask('did zara get the invitation?');
  r = await lastQ();
  step(v, 'MO-046 by Q: accepted ≠ delivered ≠ read, said plainly', /accepted by the provider, delivered/.test(r) && /isn’t read|Not tracked/.test(r), r);
  await shot('delivery-delivered');

  // ---- SC-159 Reminder queue ----
  await go('/r/reminders');
  t = await canvas();
  step(v, 'SC-159 queue read from state: Grace (invited), Zara (promise late), new Zara invite', /Ask Grace to confirm/.test(t) && /Tell Zara where things stand/.test(t) && /\(late\)/.test(t), t.slice(0, 500));
  step(v, 'SC-159 delivery plan, candidate choices and time limits shown', /Plan/.test(t) && /Grace allows/.test(t) && /text message/.test(t) && /08:00 and 20:00 their time/.test(t) && /not within 2 hours/.test(t));
  await overflow('reminders'); await shot('reminders');
  await page.locator('[data-rem^="COMMITMENT_UPDATE:pc_zara"]').getByRole('button', { name: /^Approve/ }).first().click(); await page.waitForTimeout(600); await closeQ();
  w = await world();
  step(v, 'SC-159 approve → scheduled (nothing sent yet)', w.areas['hire-d'].reminders.find((x) => x.id === 'COMMITMENT_UPDATE:pc_zara')?.state === 'SCHEDULED');
  await page.locator('[data-rem="COMMITMENT_UPDATE:pc_zara"]').getByRole('button', { name: /Send now/ }).click(); await page.waitForTimeout(700); await closeQ();
  w = await world();
  const zr = w.areas['hire-d'].reminders.find((x) => x.id === 'COMMITMENT_UPDATE:pc_zara');
  step(v, 'SC-159 send re-checks then sends (simulated, in Talent Q, accepted)', zr?.state === 'SENT' && w.threads.flatMap((x) => x.messages).find((m) => m.id === zr.msgId)?.channel === 'IN_APP');
  const zrow = page.locator(`[data-rem="COMMITMENT_UPDATE:pc_zara"]`);
  await zrow.getByRole('button', { name: /Simulate the delivery receipt/ }).click(); await page.waitForTimeout(300);
  await zrow.getByRole('button', { name: /Simulate Zara opening it/ }).click(); await page.waitForTimeout(400);
  step(v, 'MO-046 read shown only after Zara opens it in Talent Q', await zrow.locator('.hd-rail').getAttribute('data-last') === 'read' && /opened in Talent Q/.test(await zrow.innerText()));
  await shot('reminder-read');
  // Approve Grace's follow-up, then Grace turns reminders off on her own page: the send is stopped.
  await page.locator('[data-rem^="CONFIRM_FOLLOWUP:c4"]').getByRole('button', { name: /^Approve/ }).first().click(); await page.waitForTimeout(500); await closeQ();
  await go('/c/reminders', 'p_grace');
  t = await canvas();
  step(v, 'SC-159 candidate side: Grace sees her own reminder choices', /How employers may remind you/.test(t) && /By text message/.test(t));
  await overflow('c-reminders'); await shot('candidate-reminders');
  await sw('Interview reminders from employers').click(); await page.waitForTimeout(400);
  await go('/r/reminders', 'u_ada');
  await page.locator('[data-rem^="CONFIRM_FOLLOWUP:c4"]').getByRole('button', { name: /Send now/ }).click(); await page.waitForTimeout(600); await closeQ();
  w = await world();
  const gr = w.areas['hire-d'].reminders.find((x) => x.id.startsWith('CONFIRM_FOLLOWUP:c4'));
  r = await lastQ();
  step(v, 'SC-159 opt-out respected at send time: stopped, nothing sent', gr?.state === 'CANCELLED' && /turned off interview reminders/.test(gr?.reason ?? '') && /didn’t send/.test(r), JSON.stringify(gr) + r);
  t = await canvas();
  step(v, 'SC-159 stopped item explains why', /Stopped: Grace turned off interview reminders/.test(t), t.slice(0, 400));
  await ask('which reminders need me?');
  r = await lastQ();
  step(v, 'SC-159 by Q: the queue in words', /waiting for your yes|Nothing is waiting/.test(r), r);
  await go('/r/reminders', 'u_musa');
  step(v, 'SC-159 permission: an interviewer sees the queue but can’t approve', /An admin or recruiter approves/.test(await canvas()) && await page.locator('.ds-canvas').getByRole('button', { name: /^Approve/ }).count() === 0);

  // ---- SC-056 Candidate stage detail ----
  await go('/r/pipeline/m_backend/p_tobi', 'u_ada');
  t = await canvas();
  step(v, 'SC-056 stage track, due date and approvals', /Where Tobi is/.test(t) && /Book the technical interview/.test(t) && /Due Wed 4 Nov/.test(t) && /Waiting for approval/.test(t), t.slice(0, 400));
  step(v, 'SC-056 recruiter notes are internal', /Recruiter notes/.test(t) && /never sent to Tobi/.test(t) && /on-call load at Lumen/.test(t));
  await page.fill('#st-note', 'Walked through the reconciliation design clearly.'); await click('Add note');
  w = await world();
  step(v, 'SC-056 add a note (store)', w.areas['hire-d'].notes['m_backend:p_tobi'].length === 2);
  await ask('note on tobi: he seems quite old for this');
  r = await lastQ();
  w = await world();
  step(v, 'SC-056 by Q: a non-job-related note is refused, nothing stored', /can’t record that|won’t judge/.test(r) && w.areas['hire-d'].notes['m_backend:p_tobi'].length === 2, r);
  await click('Change'); await page.fill('#st-dd', '2026-11-05'); await page.fill('#st-dw', 'Decide on the offer'); await click('Save due date');
  w = await world();
  step(v, 'SC-056 set a due date', w.areas['hire-d'].due['m_backend:p_tobi'].date === '2026-11-05');
  await click('Move to Contacted'); await page.waitForTimeout(500); await closeQ();
  w = await world();
  step(v, 'SC-056 move stage through the pipeline op (shared state)', w.pipeline.find((p) => p.personId === 'p_tobi' && p.mandateId === 'm_backend').stage === 'CONTACTED');
  await ask('what stage is tobi at?');
  step(v, 'SC-056 by Q: stage and due date', /Tobi is at Contacted/.test(await lastQ()) && /Decide on the offer/.test(await lastQ()), await lastQ());
  await overflow('stage'); await shot('stage');
  await go('/r/pipeline/m_backend/p_tobi', 'u_dele');
  step(v, 'SC-056 permission: another organisation gets a permission state, no data', /isn’t in your organisation’s pipeline/.test(await canvas()) && !/Tobi Adeyemi/.test(await canvas()));

  // ---- SC-058 Offer and negotiation handoff ----
  await go('/r/offer/m_backend/p_zara', 'u_ada');
  t = await canvas();
  step(v, 'SC-058 salary only within what the candidate shared: Zara shared nothing → unknown', /Not shared/.test(t) && /hasn’t shared pay expectations/.test(t) && !/From ₦/.test(t), t.slice(0, 600));
  await go('/r/offer/m_backend/p_tobi');
  t = await canvas();
  step(v, 'SC-058 a human decision; Q never sends', /A human decision/.test(t) && /Q never sends an offer/.test(t));
  step(v, 'SC-058 compatibility: band beside what Tobi shared', /₦2\.4m–₦3\.1m/.test(t) && /From ₦2\.5m/.test(t));
  await click('Ask Q to draft the terms'); await page.waitForTimeout(600); await closeQ();
  w = await world();
  let of = w.areas['hire-d'].offers.find((o) => o.personId === 'p_tobi');
  step(v, 'SC-058 Q drafts from the band and Tobi’s shared minimum only', of?.amount === 2500000 && of.state === 'DRAFT' && of.approvals.map((x) => x.who).join() === 'u_seyi,u_ngozi');
  await overflow('offer'); await shot('offer-draft');
  await click('Ask for approval'); await page.waitForTimeout(500);
  await go('/r/offer/m_backend/p_tobi', 'u_seyi'); await click('Approve v1'); await page.waitForTimeout(400); await closeQ();
  await go('/r/offer/m_backend/p_tobi', 'u_ngozi');
  await ask('approve the offer'); await openQ();
  const chip = page.locator('.ds-log button', { hasText: 'Approve v1' }).last(); if (await chip.count()) { await chip.click(); await page.waitForTimeout(600); } await closeQ();
  w = await world(); of = w.areas['hire-d'].offers.find((o) => o.personId === 'p_tobi');
  step(v, 'SC-058 two human approvals bound to v1 (one by Q chat)', of.state === 'APPROVED' && of.approvals.every((x) => x.v === 1), of.state);
  step(v, 'SC-058 nothing was sent to Tobi by approving', !w.threads.flatMap((x) => x.messages).some((m) => /offer/i.test(m.subject ?? '') && m.to === 'p_tobi'));
  await click('Record that a person sent it'); await page.waitForTimeout(500); await closeQ();
  w = await world(); of = w.areas['hire-d'].offers.find((o) => o.personId === 'p_tobi');
  step(v, 'SC-058 hand-off recorded by a named person; pipeline at Offer', of.state === 'HANDED_OFF' && of.handoff.by === 'u_ngozi' && w.pipeline.find((p) => p.personId === 'p_tobi' && p.mandateId === 'm_backend').stage === 'OFFER');
  await page.fill('#of-ct', 'Could you do ₦2.8m? I’d also like to start in January.'); await page.fill('#of-ca', '2800000'); await click('Record their response');
  await page.fill('#of-amt', '2800000'); await page.fill('#of-start', '2027-01-04'); await click('Save as v2'); await page.waitForTimeout(400); await closeQ();
  w = await world(); of = w.areas['hire-d'].offers.find((o) => o.personId === 'p_tobi');
  t = await canvas();
  step(v, 'SC-058 negotiation: a change voids earlier approvals', of.state === 'NEGOTIATING' && of.amount === 2800000 && of.approvals.every((x) => x.voided) && /no longer counts/.test(t), JSON.stringify(of.approvals));
  await shot('offer-negotiating');
  await click('Ask for approval of v2'); await page.waitForTimeout(400); await click('Approve v2'); await page.waitForTimeout(400);
  await go('/r/offer/m_backend/p_tobi', 'u_seyi'); await click('Approve v2'); await page.waitForTimeout(400);
  await go('/r/offer/m_backend/p_tobi', 'u_ngozi'); await click('Record that a person sent it'); await page.waitForTimeout(400); await click('accepted'); await page.waitForTimeout(500); await closeQ();
  w = await world(); of = w.areas['hire-d'].offers.find((o) => o.personId === 'p_tobi');
  const ho = w.areas['hire-d'].outcomes.find((o) => o.personId === 'p_tobi');
  step(v, 'SC-058 accepted (recorded by a person) → Hired; placement record started', of.state === 'ACCEPTED' && w.pipeline.find((p) => p.personId === 'p_tobi' && p.mandateId === 'm_backend').stage === 'HIRED' && !!ho, of.state);

  // ---- SC-060 Placement outcome journal ----
  await go('/r/outcomes');
  t = await canvas();
  step(v, 'SC-060 kept separately, consented, human-verified; never scores', /Kept separately/.test(t) && /Never used to score candidates/.test(t) && /verified by Ngozi Eze/.test(t) && /Consent: Agreed/.test(t));
  step(v, 'SC-060 actual hire milestone and post-hire follow-up due', /Bisi Lawal/.test(t) && /90-day check-in/.test(t) && /Due Sun 1 Nov/.test(t) && /Tobi Adeyemi/.test(t) && /Offer accepted/.test(t));
  const tobiRec = page.locator(`[data-outcome="${ho.id}"]`);
  step(v, 'SC-060 without consent, later milestones can’t be added', /Consent: Not asked yet/.test(await tobiRec.innerText()) && await tobiRec.getByRole('button', { name: /^Verify/ }).count() === 0);
  await overflow('outcomes'); await shot('outcomes');
  await tobiRec.getByRole('button', { name: /Ask Tobi/ }).click(); await page.waitForTimeout(500);
  await tobiRec.getByRole('button', { name: /Simulate: Tobi agrees/ }).click(); await page.waitForTimeout(400);
  await tobiRec.getByRole('button', { name: /^Verify/ }).click(); await page.fill(`#hn-${ho.id}`, 'First day confirmed by Seyi'); await tobiRec.getByRole('button', { name: /Verify started/ }).click(); await page.waitForTimeout(500);
  w = await world();
  const ho2 = w.areas['hire-d'].outcomes.find((o) => o.personId === 'p_tobi');
  step(v, 'SC-060 with consent, a person verifies "Started" (who and when recorded)', ho2.consent.state === 'GIVEN' && ho2.milestones.find((m) => m.kind === 'STARTED').verifiedBy === 'u_ngozi');
  step(v, 'SC-060 outcome never enters evidence or ratings', !w.evidence.some((e) => /placement|check-in/i.test(e.title)));
  await ask('which check-ins are due?');
  step(v, 'SC-060 by Q: check-ins due', /Bisi Lawal: 90-day check-in due/.test(await lastQ()), await lastQ());
  await go('/r/outcomes', 'u_musa');
  step(v, 'SC-060 permission: an interviewer can’t open placement records', /can’t open them/.test(await canvas()) && !/Bisi/.test(await canvas()));

  // ---- MO-013 Candidate comparison morph ----
  await page.evaluate(() => localStorage.clear()); await go('/r/compare', 'u_ada');
  step(v, 'MO-013 ledger view sits in the shared morph element', await page.locator('.hd-morph[data-morph="ledger"][data-motion="on"]').count() === 1);
  await page.locator('.ds-views button', { hasText: 'CV and proof' }).click(); await page.waitForTimeout(150);
  const mid = await page.locator('.hd-morph[data-morph="proof"]').evaluate((e) => getComputedStyle(e).opacity).catch(() => '1');
  await page.waitForTimeout(500);
  step(v, 'MO-013 lens change morphs to the CV-and-proof view (real content, no fake progress)', await page.locator('.hd-morph[data-morph="proof"]').count() === 1 && await page.locator('.evr-cvp-sec').count() === 1, mid);
  await shot('compare-morph');
  const rctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce' }); const rp = await rctx.newPage();
  await rp.goto(`${BASE}?n=1#/r/compare?as=u_ada`); await rp.waitForSelector('.ds-app'); await rp.waitForTimeout(900);
  step(v, 'MO-013 reduced motion: direct table redraw (no morph)', await rp.locator('.hd-morph[data-motion="off"]').count() === 1);
  await rctx.close();
  await ctx.close();
}
await b.close();
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\nhire-d: ${pass} passed, ${fail} failed, ${errors.length} page errors`);
process.exit(fail || errors.length ? 1 : 0);
