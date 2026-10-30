// Feature test · ASSESS (coverage build, 30 Oct). Screens SC-095, SC-102, SC-103, SC-106, SC-107, SC-109, SC-111,
// SC-112, SC-113 · motions MO-018, MO-023, MO-026 · vision V14, V20. Desktop 1440×900 and phone 390×844 (dpr 2).
// Every step drives the real pages or registered ops (window.__tqQA.act) and Q by typing, then reads the one store.
// Usage: BASE=http://localhost:5214/ node qa/scripts/features/assess.mjs [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const BASE = (process.env.BASE || 'http://localhost:5214/').replace(/\/?$/, '/');
const ONLY = (process.argv[2] || 'd,m').split(',');
const OUT = fileURLToPath(new URL('../../../captures/features/assess/', import.meta.url)); mkdirSync(OUT, { recursive: true });
const b = await pw.chromium.launch();
const errors = []; const results = [];
const step = (v, name, ok, detail = '') => { results.push({ v, name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail ? ` · ${detail}` : ''}`); };

for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text()}`); });
  const phone = v === 'm';
  let n = 0;
  const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${v}-${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true }); };
  const overflow = async () => page.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.ds-canvas')].map((e) => e.scrollWidth)) - innerWidth);
  const small = async () => page.evaluate(() => [...document.querySelectorAll('.ds-canvas p, .ds-canvas li, .ds-canvas span, .ds-canvas label, .ds-canvas button')].filter((e) => e.offsetParent && e.textContent.trim() && !e.closest('.sr') && parseFloat(getComputedStyle(e).fontSize) < 12).length);
  const world = () => page.evaluate(() => window.__tqQA.getWorld());
  const A = (w) => w.areas.assess;
  const act = (op, args = {}) => page.evaluate(([op, args]) => window.__tqQA.act(op, args), [op, args]);
  const lastQ = async () => { const w = await world(); const t = w.q.threads[w.session.actor] ?? []; return [...t].reverse().find((m) => m.who !== 'me')?.text ?? ''; };
  const lastQMsg = async () => { const w = await world(); const t = w.q.threads[w.session.actor] ?? []; return [...t].reverse().find((m) => m.who !== 'me'); };
  const closeQ = async () => { const x = page.getByRole('button', { name: 'Close Q' }); if (await x.count()) await x.click(); await page.waitForTimeout(250); };
  const openQ = async () => { if (!phone) return; const bar = page.locator('.ds-askbar button'); if (await bar.count()) await bar.first().click(); await page.waitForTimeout(300); };
  const ask = async (text, wait = 800) => { await openQ(); await page.locator('#q-ask').fill(text); await page.locator('#q-ask').press('Enter'); await page.waitForTimeout(wait); if (phone) await closeQ(); };
  const go = async (r, as) => { await page.goto(`${BASE}?n=${Math.random()}#${r}${as ? `?as=${as}` : ''}`); await page.waitForTimeout(900); };
  const canvas = () => page.locator('.ds-canvas').first().innerText();
  const layout = async (id, name) => { const o = await overflow(); const s = await small(); step(v, `${id} ${name}: no sideways scroll, body text ≥ 12px`, o <= 1 && s === 0, `overflow ${o}px, small ${s}`); };

  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(900);

  // ================= SC-095 · V14: question bank, upload, lock, versions, editors =================
  await go('/r/questions', 'u_ada');
  let t = await canvas();
  step(v, 'SC-095 ready: locked v1 with 5 questions, stamp and who locked it', /v1 is locked: 5 questions/.test(t) && /Locked v1/i.test(t) && /Locked by Ngozi Eze/.test(t));
  step(v, 'V14 Q never rewords locked questions (stated) and agreed follow-ups shown', /Q never rewords a locked question/.test(t) && /Agreed follow-up/.test(t));
  await page.getByRole('button', { name: /Upload kora-backend-round2\.csv/ }).click();
  step(v, 'SC-095 loading: reading the file shows a status', /Reading kora-backend-round2\.csv/.test(await canvas()));
  await page.waitForTimeout(1200);
  let w = await world(); let bank = A(w).banks[0];
  step(v, 'SC-095 upload (simulated): 3 added to draft v2, 2 refused with reasons', bank.versions[1]?.state === 'DRAFT' && bank.upload.accepted.length === 3 && bank.upload.rejected.length === 2 && bank.upload.rejected.some((r) => /protected characteristic/.test(r.why)) && bank.upload.rejected.some((r) => /Leading/.test(r.why)));
  t = await canvas();
  step(v, 'SC-095 draft shows what is new and that nothing is used until locked', /Draft v2 is waiting to be locked/.test(t) && /New in v2/i.test(t) && /Nothing in a draft is used/.test(t));
  await page.getByRole('button', { name: /Try a file that isn’t CSV/ }).click(); await page.waitForTimeout(1200);
  step(v, 'SC-095 error: a non-CSV file explains how to recover', /Couldn’t read “questions\.pages”.*Export it as CSV/.test(await canvas()));
  await layout('SC-095', 'bank'); await shot('bank-draft');
  await ask('add "How old are you, and when do you plan to retire?" to the question bank');
  step(v, 'V14 Q refuses a protected-characteristic question with an alternative', /I can’t add that/.test(await lastQ()) && /age/.test(await lastQ()) && /Instead/.test(await lastQ()));
  await ask('lock the question bank');
  const lockMsg = await lastQMsg();
  step(v, 'V14 locking by Q asks for approval first', lockMsg?.kind === 'approval' && lockMsg.actions?.some((a) => a.act.op === 'as.bank.lock'));
  await act('as.bank.lock', { bankId: 'qb_kora_backend' });
  w = await world(); bank = A(w).banks[0];
  step(v, 'V14 lock: v2 LOCKED (8 questions), v1 kept as SUPERSEDED, audited', bank.versions[1].state === 'LOCKED' && bank.versions[1].questions.length === 8 && bank.versions[0].state === 'SUPERSEDED' && w.events.some((e) => e.type === 'questions.locked' && e.scope === 'ORG:org_kora'));
  await go('/r/questions', 'u_musa');
  t = await canvas();
  step(v, 'SC-095 permission denied: Musa reads but cannot edit (banner, no upload)', /You can read and use these questions, not change them/.test(t) && !(await page.getByRole('button', { name: /Upload kora-backend/ }).count()));
  await act('as.bank.upload', { bankId: 'qb_kora_backend' });
  step(v, 'V14 who may edit is enforced in the op, not just the page', /Only .* can change this bank/.test(await lastQ()) && !A(await world()).banks[0].versions[2]);
  await shot('bank-readonly');
  await go('/r/questions', 'u_ngozi');
  await act('as.bank.editor', { bankId: 'qb_kora_backend', actorId: 'u_musa', on: true });
  w = await world();
  step(v, 'V14 the owner gives edit rights; change is logged and audited', A(w).banks[0].editors.includes('u_musa') && A(w).banks[0].log[0].text.includes('Musa') && w.events.some((e) => e.type === 'questions.editors'));
  step(v, 'SC-102 employer: avatar option, cost marked as hypothesis, device fallback', /Offer a simulated avatar/.test(await canvas()) && /Hypothesis, not a quote/.test(await canvas()) && /still image with captions/.test(await canvas()));

  // ================= MO-018: question plan appears =================
  await go('/r/interviews/i_hb_tobi/live', 'u_ada');
  step(v, 'SC-103 empty plan state with a way forward', /Build the question plan/.test(await canvas()));
  await page.getByRole('button', { name: 'Build the question plan' }).click(); await page.waitForTimeout(900);
  w = await world();
  step(v, 'MO-018 plan built from locked bank v2, must-haves first', A(w).plans.i_hb_tobi?.v === 2 && A(w).plans.i_hb_tobi.cards.slice(0, 3).every((c) => c.mustHave) && w.events.some((e) => e.type === 'interview.plan_ready'));
  step(v, 'MO-018 competency cards render, readable, with locked stamps', (await page.locator('.as-plan .as-card').count()) === 5 && (await page.locator('.as-plan .as-stamp').count()) >= 5);
  await shot('plan');
  { // Reduced-motion fallback: a plain question list, fully visible at once.
    const rc = await b.newContext({ viewport: vp, deviceScaleFactor: dpr, reducedMotion: 'reduce' }); const rp = await rc.newPage();
    await rp.goto(`${BASE}#/r/home`); await rp.evaluate((s) => localStorage.setItem('tq.world.v4', s), JSON.stringify(await world()));
    await rp.goto(`${BASE}?n=1#/r/interviews/i_hb_tobi/live`); await rp.waitForTimeout(250);
    const op = await rp.evaluate(() => [...document.querySelectorAll('.as-plan .as-card')].map((e) => getComputedStyle(e).opacity));
    step(v, 'MO-018 reduced motion: question list fully visible without animation', op.length === 5 && op.every((o) => o === '1'));
    await rc.close();
  }

  // ================= SC-103: human live room, consent, Q presence; MO-023 =================
  await act('as.live', { id: 'i_hb_tobi', kind: 'record', on: true });
  step(v, 'SC-103 recording cannot start before the candidate says yes', /needs the candidate’s yes/.test(await lastQ()) && A(await world()).rooms.i_hb_tobi.recording === 'OFF');
  await page.getByRole('button', { name: /Ask Tobi to agree to recording/ }).click(); await page.waitForTimeout(300);
  await go('/c/assess/live/i_hb_tobi', 'p_tobi');
  t = await canvas();
  step(v, 'SC-103 candidate is told Q is present before joining, and that it doesn’t score them', /Q is here for the interviewers/.test(t) && /doesn’t score you/.test(t) && /Join the interview/.test(t));
  await page.getByRole('button', { name: 'Join the interview' }).click(); await page.waitForTimeout(400);
  step(v, 'SC-103 consent: recording request shown to the candidate with a no that carries on', /May Kora Pay record this interview\?/.test(await canvas()) && /Saying no is fine/.test(await canvas()));
  await page.getByRole('button', { name: 'Yes, record it' }).click(); await page.waitForTimeout(300);
  w = await world();
  step(v, 'SC-103 consent recorded (shared scope) and candidate joined', A(w).rooms.i_hb_tobi.consent.recording === 'YES' && A(w).rooms.i_hb_tobi.candidateJoined && w.events.some((e) => e.type === 'interview.recording.consented' && e.scope === 'SHARED:org_kora:p_tobi'));
  await layout('SC-103', 'candidate room'); await shot('cand-room');
  await go('/r/interviews/i_hb_tobi/live', 'u_ada');
  await page.getByRole('button', { name: 'Start the interview' }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Start recording' }).click(); await page.waitForTimeout(300);
  const plan = A(await world()).plans.i_hb_tobi;
  for (const r of ['r1', 'r3', 'r4']) { const c = plan.cards.find((x) => x.reqId === r); await act('as.live', { id: 'i_hb_tobi', kind: 'ask', text: c.qs[0].text, reqId: r, qid: c.qs[0].id }); await act('as.live', { id: 'i_hb_tobi', kind: 'answer' }); }
  await page.waitForTimeout(400);
  w = await world(); const room = A(w).rooms.i_hb_tobi;
  step(v, 'MO-023 a general answer (on-call) brings Q follow-ups into the side panel', room.suggestions.some((s) => s.state === 'NEW' && s.reqId === 'r4') && !room.suggestions.some((s) => s.reqId === 'r1'));
  t = await canvas();
  step(v, 'MO-023 panel is labelled interviewer-only and user controlled (Hide)', /Only interviewers see this/.test(t) && (await page.locator('.as-qpanel').getByRole('button', { name: /^Hide$/ }).count()) === 1);
  await layout('SC-103', 'recruiter room'); await shot('live-suggestion');
  await ask('suggest a follow-up');
  step(v, 'MO-023 Q offers the follow-up by text, for the interviewer only', /For you only/.test(await lastQ()));
  await page.locator('.as-qpanel').getByRole('button', { name: /^Hide$/ }).click(); await page.waitForTimeout(300);
  step(v, 'MO-023 hiding the panel keeps it hidden (reduced: suggestion card)', A(await world()).rooms.i_hb_tobi.panel === 'HIDDEN' && !(await page.locator('.as-sug').count()));
  await page.locator('.as-qpanel').getByRole('button', { name: /^Show/ }).click(); await page.waitForTimeout(300);
  await page.locator('.as-sug').first().getByRole('button', { name: 'Ask it' }).click(); await page.waitForTimeout(300);
  await act('as.live', { id: 'i_hb_tobi', kind: 'answer' });
  w = await world();
  step(v, 'MO-023 using a suggestion asks it and the follow-up answer is specific', A(w).rooms.i_hb_tobi.suggestions.some((s) => s.state === 'USED') && /I was on call/.test(A(w).rooms.i_hb_tobi.turns.filter((x) => x.who === 'CAND').at(-1).text));
  await go('/c/assess/live/i_hb_tobi', 'p_tobi');
  t = await canvas();
  const unused = A(await world()).rooms.i_hb_tobi.suggestions.filter((s) => s.state !== 'USED').map((s) => s.text);
  step(v, 'SC-103 privacy: the candidate never sees Q’s suggestions (only questions the interviewer chose to ask)', unused.length > 0 && unused.every((x) => !t.includes(x)) && !(await page.locator('.as-qpanel').count()) && !/follow-ups/i.test(t));
  await go('/r/interviews/i_hb_tobi/live', 'u_ada');
  await page.getByRole('button', { name: 'Simulate: connection drops' }).click(); await page.waitForTimeout(300);
  step(v, 'SC-103 interrupted: connection lost, record kept, recording paused', /Connection lost/.test(await canvas()) && A(await world()).rooms.i_hb_tobi.recording === 'PAUSED');
  await page.getByRole('button', { name: 'Reconnect' }).click(); await page.waitForTimeout(300);
  step(v, 'SC-103 resume: back to live, recording stays paused until turned on', A(await world()).rooms.i_hb_tobi.state === 'LIVE' && A(await world()).rooms.i_hb_tobi.recording === 'PAUSED');
  await act('as.live', { id: 'i_hb_tobi', kind: 'ask', text: 'Thanks. You’d agree that on-call is the hardest part of the job, right?', reqId: 'r4' });
  await act('as.live', { id: 'i_hb_tobi', kind: 'answer' });
  await act('as.live', { id: 'i_hb_tobi', kind: 'record', on: true });
  await act('as.live', { id: 'i_hb_tobi', kind: 'ask', text: 'Are you married?' });
  step(v, 'SC-103 Q stops a protected-characteristic question in the room', /Don’t ask that/.test(await lastQ()));
  await act('as.live', { id: 'i_hb_tobi', kind: 'end' });
  await go('/r/interviews/i_hb_tobi/live', 'u_dele');
  step(v, 'SC-103 tenant isolation: the agency cannot open Kora’s room', /isn’t available/.test(await canvas()));

  // ================= SC-106: transcript and evidence (consent-scoped) =================
  await go('/r/interviews/i_hb_tobi/transcript', 'u_ada');
  w = await world();
  const recTurns = A(w).rooms.i_hb_tobi.turns.filter((x) => x.recorded && x.who !== 'SYS').length;
  t = await canvas();
  step(v, 'SC-106 only recorded turns are shown, and the gap is stated', (await page.locator('.as-turns .as-turn').count()) === recTurns && /weren’t recorded/.test(t));
  const cands = A(w).rooms.i_hb_tobi.turns.filter((x) => x.who === 'CAND' && x.recorded);
  for (const c of cands) await act('as.live', { id: 'i_hb_tobi', kind: 'excerpt', turnId: c.id, reqId: c.reqId });
  const unrec = A(w).rooms.i_hb_tobi.turns.find((x) => x.who === 'CAND' && !x.recorded);
  if (unrec) await act('as.live', { id: 'i_hb_tobi', kind: 'excerpt', turnId: unrec.id, reqId: 'r4' });
  w = await world();
  step(v, 'SC-106 excerpts: recorded answers marked as evidence; unrecorded ones refused', A(w).rooms.i_hb_tobi.excerpts.length === cands.length && (!unrec || /Only recorded answers/.test(await lastQ())));
  await page.waitForTimeout(300); await layout('SC-106', 'transcript'); await shot('transcript');
  await go('/r/interviews/i_hb_tobi/transcript', 'u_ngozi');
  step(v, 'SC-106 permission denied: not on the panel and not the recruiter', /Only the panel can read this transcript/.test(await canvas()));
  await go('/r/interviews/i_hb_kunle/transcript', 'u_musa');
  step(v, 'SC-106 consent declined: no transcript, and it isn’t held against them', /said no to recording/.test(await canvas()) && /isn’t held against them/.test(await canvas()));
  await go('/r/interviews/i_hb_tobi/transcript', 'u_dele');
  step(v, 'SC-106 tenant isolation: agency sees nothing', /isn’t available/.test(await canvas()));

  // ================= MO-026: candidate score review (rubric model, unknown ≠ 0) =================
  await go('/r/interviews/i_hb_tobi/review', 'u_ada');
  step(v, 'MO-026 empty: no approved rubric, no numbers', /Nothing can be rated until a rubric is approved/.test(await canvas()));
  await act('rb.propose', { mandateId: 'm_backend' }); await act('rb.approve', { mandateId: 'm_backend' });
  await go('/r/interviews/i_hb_tobi/review');
  await ask('review the scores for tobi from the interview');
  step(v, 'MO-026 Q opens the review and offers to propose', /what’s uncertain/.test(await lastQ()));
  await page.locator('.as-unc').getByRole('button', { name: /Ask Q to propose ratings/ }).click(); await page.waitForTimeout(600);
  w = await world();
  const ivR = w.areas.rubrics.ratings.filter((r) => r.refs.some((x) => x.evidenceId === 'iv_i_hb_tobi'));
  step(v, 'MO-026 ratings proposed through the rubric model (Q_PROPOSED, not reviewed)', ivR.length >= 2 && ivR.every((r) => r.source === 'Q_PROPOSED' && !r.reviewed && r.v === 1));
  t = await canvas();
  step(v, 'MO-026 uncertainty first: unknown-not-zero listed, ratings hidden until read', /Read this first: what’s uncertain/.test(t) && /Unknown, not zero/.test(t) && !(await page.locator('.as-meter').count()));
  await shot('review-uncertainty');
  await page.getByRole('button', { name: /I’ve read this: show the ratings/ }).click(); await page.waitForTimeout(800);
  t = await canvas();
  step(v, 'MO-026 index is never shown without coverage', /at \d+% coverage/.test(t) && (await page.locator('.as-meter').count()) === ivR.length);
  await page.locator('.as-li').getByRole('button', { name: /^Confirm/ }).first().click(); await page.waitForTimeout(300);
  w = await world();
  step(v, 'MO-026 a person confirms a rating (reviewed, audited)', w.areas.rubrics.ratings.some((r) => r.refs.some((x) => x.evidenceId === 'iv_i_hb_tobi') && r.reviewed && r.by === 'u_ada') && w.events.some((e) => e.type === 'rubric.rating.reviewed'));
  await layout('MO-026', 'review'); await shot('review-ratings');
  { const rc = await b.newContext({ viewport: vp, deviceScaleFactor: dpr, reducedMotion: 'reduce' }); const rp = await rc.newPage();
    await rp.goto(`${BASE}#/r/home`); await rp.evaluate((s) => localStorage.setItem('tq.world.v4', s), JSON.stringify(await world()));
    await rp.goto(`${BASE}?n=2#/r/interviews/i_hb_tobi/review`); await rp.waitForTimeout(500);
    step(v, 'MO-026 reduced motion: static scorecard, uncertainty still on top', (await rp.locator('.as-meter').count()) > 0 && (await rp.locator('.as-unc').count()) === 1);
    await rc.close(); }

  // ================= SC-107: candidate interview feedback (shared only by the employer) =================
  await go('/c/assess/record/i_hb_tobi', 'p_tobi');
  t = await canvas();
  step(v, 'SC-107 before sharing: nothing reaches the candidate', /hasn’t shared feedback yet/.test(t) && !/What came across well/.test(t));
  step(v, 'SC-106 candidate reads their own recorded transcript', (await page.locator('.as-turns .as-turn').count()) === recTurns);
  await ask('my transcript has a mistake');
  step(v, 'SC-106 candidate can ask for a correction (approval first)', (await lastQMsg())?.kind === 'approval');
  await go('/r/interviews/i_hb_tobi/review', 'u_ada');
  await page.locator('input[type=checkbox]').last().check(); await page.waitForTimeout(200);
  w = await world(); const fbd = A(w).feedback.i_hb_tobi;
  const offItem = [...fbd.strengths, ...fbd.routes].find((x) => !x.on);
  await page.locator('#fb-note').fill('Thanks for walking us through the March incident so clearly.');
  await page.getByRole('button', { name: /^Share with Tobi$/ }).click(); await page.waitForTimeout(200);
  await page.locator('.ds-confirm').getByRole('button', { name: 'Share' }).click(); await page.waitForTimeout(400);
  w = await world();
  step(v, 'SC-107 the employer shares chosen points (SHARED, audited in shared scope)', A(w).feedback.i_hb_tobi.state === 'SHARED' && w.events.some((e) => e.type === 'interview.feedback.shared' && e.scope === 'SHARED:org_kora:p_tobi'));
  await go('/c/assess/record/i_hb_tobi', 'p_tobi');
  t = await canvas();
  step(v, 'SC-107 candidate sees approved strengths, improvement routes and the note only', /Kora Pay shared feedback with you/.test(t) && /What came across well/.test(t) && /What would help next time/.test(t) && /March incident/.test(t) && (!offItem || !t.includes(offItem.text)));
  await layout('SC-107', 'candidate record'); await shot('cand-feedback');

  // ================= SC-109 · V20: interviewer coaching =================
  await go('/r/coaching', 'u_ada');
  t = await canvas();
  step(v, 'SC-109 talk-time with a text alternative and must-haves not asked', /Who did the talking/.test(t) && /You · \d+%/.test(t) && /Must-have not asked: Go in production/.test(t));
  step(v, 'V20 leading question flagged with an open rewrite', /A leading question/.test(t) && /Ask it open/.test(t));
  step(v, 'V20 never about the candidate’s face or voice; private to the interviewer', /never about the candidate’s face, voice, accent or manner/.test(t) && /Only you see this/.test(t));
  await page.getByRole('button', { name: 'Got it' }).first().click(); await page.waitForTimeout(300);
  step(v, 'SC-109 acknowledging an item marks it noted', /Noted/.test(await canvas()));
  await ask('coach me: was tobi nervous in that interview?');
  step(v, 'V20 Q refuses to coach on the candidate’s nerves, face or voice', /won’t judge|never the candidate’s face|isn’t reliable|I don’t read those/.test(await lastQ()));
  await layout('SC-109', 'coaching'); await shot('coaching');
  await go('/r/coaching?i=i_hb_kunle', 'u_ada');
  step(v, 'SC-109 permission: a colleague’s coaching is private', /Coaching is private to each interviewer|no coaching for you there/.test(await canvas()));
  await go('/r/coaching', 'u_musa');
  t = await canvas();
  step(v, 'SC-109 Musa’s own past interview: leading question and talk share over half', /A leading question/.test(t) && /You did \d+% of the talking/.test(t));

  // ================= SC-102: avatar interview room =================
  await go('/c/assess/avatar', 'p_tobi');
  t = await canvas();
  step(v, 'SC-102 never mandatory: avatar, text, voice or a person, all count the same', /Simulated avatar/.test(t) && /Text only/.test(t) && /Voice/.test(t) && /With a person/.test(t) && /All of them count the same/.test(t));
  await ask('can I do the first round with a person instead?');
  step(v, 'SC-102 Q offers the human route with approval', (await lastQMsg())?.actions?.some((a) => a.act.args?.mode === 'HUMAN'));
  await page.getByRole('button', { name: /Simulated avatar/ }).click(); await page.waitForTimeout(300);
  step(v, 'SC-102 consent: what the avatar is and isn’t (no camera, no face or voice judging)', /not a person and not Q/.test(await canvas()) && /doesn’t use your camera/.test(await canvas()));
  await page.getByRole('button', { name: 'Agree and continue' }).click(); await page.waitForTimeout(100);
  step(v, 'SC-102 loading: connection check shows a status', /Checking your connection/.test(await canvas()) || (await world()).areas.assess.avatar['p_tobi:org_kora'].step === 'DEVICE');
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Simulate: slow connection/ }).click(); await page.waitForTimeout(200);
  await page.getByRole('button', { name: /^Start$/ }).click(); await page.waitForTimeout(400);
  t = await canvas();
  step(v, 'SC-102 device fallback: still image with captions on a slow connection', /Still image \(slow connection\) · captions on/i.test(t));
  step(v, 'SC-102 labelled simulated avatar with the employer’s locked question as captions', /Simulated avatar · not a person/i.test(t) && /Kora Pay’s own question · v2/i.test(t));
  await page.locator('#av-in').fill('I re-ran the single day from the processor and checked the idempotency keys.'); await page.waitForTimeout(200);
  await page.getByRole('button', { name: /Save, next question/ }).click(); await page.waitForTimeout(300);
  await page.locator('#av-in').fill('Half-written answer');
  await page.getByRole('button', { name: /Simulate: connection drops/ }).click(); await page.waitForTimeout(300);
  step(v, 'SC-102 interrupted: paused with answers and draft saved', /Paused at question 2/.test(await canvas()) && /what you were writing/.test(await canvas()));
  await page.getByRole('button', { name: 'Carry on' }).click(); await page.waitForTimeout(300);
  step(v, 'SC-102 resume carries on at the same question with the draft', (await page.locator('#av-in').inputValue()) === 'Half-written answer');
  await page.getByRole('button', { name: 'Switch to text' }).click(); await page.waitForTimeout(300);
  step(v, 'SC-102 accessible alternative: switch to text at any time, answers kept', A(await world()).avatar['p_tobi:org_kora'].mode === 'TEXT' && A(await world()).avatar['p_tobi:org_kora'].answers.length === 1);
  await layout('SC-102', 'avatar'); await shot('avatar');
  for (let i = 0; i < 3; i++) { if (!(await page.locator('#av-in').count())) break; await page.locator('#av-in').fill('A specific answer with what I did myself and the result.'); await page.getByRole('button', { name: /Save/ }).first().click(); await page.waitForTimeout(250); }
  await page.getByRole('button', { name: /Send my answers to Kora Pay/ }).click(); await page.waitForTimeout(300);
  w = await world();
  step(v, 'SC-102 answers sent (simulated) with a receipt; a person reads them', !!A(w).avatar['p_tobi:org_kora'].receipt && w.events.some((e) => e.type === 'interview.avatar.submitted') && /A person at Kora Pay reads your answers/.test(await canvas()));
  await go('/r/questions', 'u_ada'); await act('as.avatar.setting', { on: false });
  await go('/c/assess/avatar', 'p_seyio');
  step(v, 'SC-102 permission: avatar off by the employer, other routes still open', /hasn’t turned this option on/.test(await canvas()));

  // ================= SC-111: code sandbox (fake run, test evidence) + J12 bounded sample =================
  await go('/r/people/p_seyio', 'u_ada');
  await act('ev.reuse', { personId: 'p_seyio', reqId: 'r3', decision: 'BOUNDED_SAMPLE', reason: 'One short Postgres sample instead of the full take-home.' });
  w = await world(); const rd = w.areas.proof.reuse.find((d) => d.personId === 'p_seyio' && d.reqId === 'r3');
  await act('ev.reuse.sent', { id: rd.id });
  await go('/c/assess/ex/ex_code_seyio', 'p_seyio');
  step(v, 'SC-111 ready: brief, effort and how it counts (self-reported until reviewed)', /Self-reported when you send it/.test(await canvas()) && /answers Kora Pay’s request for one short sample/.test(await canvas()));
  await page.getByRole('button', { name: 'Start the exercise' }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Run the tests' }).click(); await page.waitForTimeout(300);
  t = await canvas();
  step(v, 'SC-111 fake run: test results shown, labelled simulated, starter fails', /NOT YET/.test(t) && /Planner estimate 9,100 ms \(simulated plan/.test(t) && /nothing is executed/.test(t));
  await page.locator('#ex-sql').fill(`ALTER TABLE exceptions ADD COLUMN settled_on date;\nCREATE INDEX ON exceptions (processor, settled_on);\nSELECT processor, count(*)\nFROM exceptions\nWHERE settled_on = DATE '2026-10-01'\nGROUP BY processor;`);
  await page.getByRole('button', { name: 'Run the tests' }).click(); await page.waitForTimeout(300);
  w = await world();
  step(v, 'SC-111 fixed query passes all four checks (140 ms, simulated)', A(w).exercises.find((e) => e.id === 'ex_code_seyio').runs.at(-1).results.every((r) => r.pass));
  await layout('SC-111', 'code'); await shot('code');
  await page.getByRole('button', { name: 'Send to Kora Pay' }).click(); await page.locator('.ds-confirm').getByRole('button', { name: 'Send' }).click(); await page.waitForTimeout(400);
  w = await world(); const exC = A(w).exercises.find((e) => e.id === 'ex_code_seyio'); const rd2 = w.areas.proof.reuse.find((d) => d.id === rd.id);
  const pcC = await page.evaluate((id) => { const w = window.__tqQA.getWorld(); return window.__tqQA.proofClass(w, w.evidence.find((e) => e.evidenceId === id)); }, exC.evidenceId);
  step(v, 'SC-111 → J12 bounded sample: submission goes through the shared sample (SUBMITTED), SELF_REPORTED', exC.state === 'SUBMITTED' && rd2.state === 'SUBMITTED' && exC.evidenceId === rd2.resultEvidenceId && pcC === 'SELF_REPORTED');
  await go('/r/exercises', 'u_ada');
  step(v, 'SC-111 recruiter sees it waiting with the simulated checks', /waiting for your review/.test(await canvas()) && /Simulated checks/.test(await canvas()));
  await ask('review seyi okoro exercise: shows part of it because the index is right but the column backfill is not shown');
  step(v, 'SC-111 Q reviews by text with approval and a required note', (await lastQMsg())?.kind === 'approval');
  const row = page.locator('#ex-ex_code_seyio');
  await row.locator('textarea').fill('Right index and filter; the backfill of the new column isn’t shown.');
  await row.getByRole('button', { name: 'Shows part of it' }).click(); await page.waitForTimeout(400);
  w = await world();
  const pcR = await page.evaluate((id) => { const w = window.__tqQA.getWorld(); return window.__tqQA.proofClass(w, w.evidence.find((e) => e.evidenceId === id)); }, exC.evidenceId);
  step(v, 'SC-111 reviewed by a person → ASSESSED (partial), the J12 decision REVIEWED', pcR === 'ASSESSED' && w.areas.proof.reuse.find((d) => d.id === rd.id).state === 'REVIEWED' && w.areas.proof.links.some((l) => l.evidenceId === exC.evidenceId && l.state === 'REVIEWED' && l.partial));
  await go('/c/assess/ex/ex_code_seyio', 'p_seyio');
  step(v, 'SC-111 the reviewer’s note isn’t shown to the candidate unless shared', /hasn’t shared the reviewer’s note/.test(await canvas()));

  // ================= SC-112: cyber incident exercise (log timeline) =================
  await go('/c/assess/ex/ex_cyber_tobi', 'p_tobi');
  await page.getByRole('button', { name: 'Start the exercise' }).click(); await page.waitForTimeout(300);
  step(v, 'SC-112 synthetic SIEM-style log timeline as a keyboard-operable list', (await page.locator('.as-log input[type=checkbox]').count()) === 10 && /synthetic, SIEM-style/.test(await canvas()));
  for (const id of ['l2', 'l6', 'l7', 'l8']) { await page.locator(`#lg-${id}`).focus(); await page.keyboard.press('Space'); await page.waitForTimeout(80); }
  await page.locator('#ex-cause').fill('The Interswitch file never arrived and the job marked the day complete with zero lines.');
  await page.locator('#ex-act').fill('Page the processor, re-run the day from the backup feed, add a missing-file alert.');
  await page.waitForTimeout(200);
  w = await world();
  step(v, 'SC-112 checks: key events found, noise left out, cause and action written', A(w).exercises.find((e) => e.id === 'ex_cyber_tobi').marked.length === 4 && /5 of 5 in place/.test(await canvas()));
  await layout('SC-112', 'cyber'); await shot('cyber');
  await ask('submit my exercise');
  step(v, 'SC-112 Q sends only after approval', (await lastQMsg())?.kind === 'approval');
  await act('as.ex', { id: 'ex_cyber_tobi', kind: 'submit' });
  w = await world(); const exY = A(w).exercises.find((e) => e.id === 'ex_cyber_tobi');
  step(v, 'SC-112 produces SELF_REPORTED evidence shared only with Kora, linked to on-call (proposed)', exY.state === 'SUBMITTED' && w.evidence.find((e) => e.evidenceId === exY.evidenceId)?.verification === 'PENDING' && w.evidence.find((e) => e.evidenceId === exY.evidenceId).sharedWith.join() === 'org_kora' && w.areas.proof.links.some((l) => l.evidenceId === exY.evidenceId && l.state === 'PROPOSED'));
  await go('/r/exercises', 'u_ada');
  await page.locator('#ex-ex_cyber_tobi textarea').fill('Found the silent failure and the missing alert.');
  await page.locator('#ex-ex_cyber_tobi input[type=checkbox]').check();
  await page.locator('#ex-ex_cyber_tobi').getByRole('button', { name: 'Shows it' }).click(); await page.waitForTimeout(300);
  await go('/c/assess/ex/ex_cyber_tobi', 'p_tobi');
  step(v, 'SC-112 reviewed and shared: the candidate sees Assessed and the shared note', /Now: Assessed/.test(await canvas()) && /Found the silent failure/.test(await canvas()));

  // ================= SC-113: sales/customer service simulation =================
  await go('/c/assess/ex/ex_sales_grace', 'p_grace');
  await page.getByRole('button', { name: 'Start the exercise' }).click(); await page.waitForTimeout(300);
  step(v, 'SC-113 scripted customer opens the roleplay (labelled scripted)', /hasn’t arrived/.test(await canvas()) && /scripted \(simulated\)/.test(await canvas()));
  for (const s of ['I’m so sorry, that’s worrying with suppliers waiting. Can you tell me your business name and phone number?', 'Thank you. I can see it. I’ll check with the payments team and message you by 11am today.', 'I can’t promise the bank’s timing, but I’ll call you before noon either way.']) { await page.locator('#ex-say').fill(s); await page.locator('#ex-say').press('Enter'); await page.waitForTimeout(200); }
  w = await world(); const exS = A(w).exercises.find((e) => e.id === 'ex_sales_grace');
  step(v, 'SC-113 the customer answers turn by turn (script advances)', exS.chat.filter((m) => m.who === 'CUST').length === 4);
  await page.getByText('The conversation rubric').click(); await page.waitForTimeout(200);
  step(v, 'SC-113 conversation rubric: all four points found in the words', (await page.locator('.as-tests .as-pf[data-pass]').count()) === 4);
  await layout('SC-113', 'sales'); await shot('sales');
  await ask('i don’t want to do the exercise, decline it');
  await act('as.ex', { id: 'ex_sales_grace', kind: 'decline', why: 'Short on time this week' });
  w = await world();
  step(v, 'SC-113 declining is recorded as declined, not failed (no evidence created)', A(w).exercises.find((e) => e.id === 'ex_sales_grace').state === 'DECLINED' && !w.evidence.some((e) => e.evidenceId === 'e_ex_ex_sales_grace') && /not a failed result/.test(await canvas()));

  // ================= Privacy and hubs =================
  await go('/r/exercises', 'u_dele');
  step(v, 'privacy: the agency sees no Kora exercises', /No exercises sent yet/.test(await canvas()));
  await go('/r/assess', 'u_ada');
  step(v, 'hub: recruiter assessments list rooms, exercises and coaching', /Interviews in the live room/.test(await canvas()) && /Your coaching/i.test(await canvas()));
  await layout('hub', 'recruiter'); await shot('hub');
  await go('/c/assess', 'p_tobi');
  step(v, 'hub: candidate sees their own exercises, live interviews and first round', /Live interviews/.test(await canvas()) && /Exercises/.test(await canvas()) && /first round/.test(await canvas()));
  await layout('hub', 'candidate');
  if (!phone) {
    await go('/r/questions', 'u_bayo');
    step(v, 'Q opener on the question bank names the locked version (empty thread)', /v2 is locked: 8 questions/.test(await page.locator('body').innerText()));
    await go('/r/interviews/i_hb_tobi/review', 'u_bayo');
    step(v, 'Q opener on the score review: uncertainty before numbers', /Read what’s uncertain before the numbers/.test(await page.locator('body').innerText()));
  }
  await ctx.close();
}
await b.close();
const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length}/${results.length} passed${errors.length ? `\nErrors:\n${errors.join('\n')}` : ''}`);
process.exit(fail.length || errors.length ? 1 : 0);
