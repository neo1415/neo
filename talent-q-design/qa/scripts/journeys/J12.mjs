// J12: evidence-first hiring, the defining Talent Q experience (journeys/J12-EVIDENCE-FIRST.md; Build Pack 30 Oct).
// One continuous world, real person switches, no store injection for anyone's actions:
// Ada finds by demonstrated ability → asks why a weak CV → CV and proof → Seyi Okoro's profile → accepts Tobi's
// evidence and asks Seyi Okoro for one bounded sample (approved, sent) → Seyi Okoro does it on his phone → Ada reviews
// "shows part of it", shares the note, moves both to interview → asks Tobi's interest (approved) → Tobi confirms, sees
// Kora's commitment and the hiring confirmation → Ada emails the invite (approved, accepted by Google, simulated) →
// Tobi's J7 gap card → Tobi stops sharing the debugging sample → Ada's card and comparison update → Dele is refused.
// Usage: BASE=http://localhost:4190/ node J12.mjs   [VIDEO_DIR=dir FILM_PACE=ms to record the film] [ONLY=d|m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const BASE = (process.env.BASE || 'http://localhost:4190/').replace(/\/?$/, '/');
const PACE = +(process.env.FILM_PACE || 0); const VIDEO = process.env.VIDEO_DIR; const ONLY = process.env.ONLY;
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../captures/cx/J12'); mkdirSync(OUT, { recursive: true });
const BAD = /\b(reject\w*|liar|lying|lied|fake|dishonest|untrue)\b/i;
let fails = 0; const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(vp) {
  const phone = vp === 'm';
  const b = await pw.chromium.launch();
  const size = phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const ctx = await b.newContext({ viewport: size, deviceScaleFactor: phone ? 2 : 1, ...(phone ? { isMobile: true, hasTouch: true } : {}), ...(VIDEO ? { recordVideo: { dir: `${VIDEO}/${vp}`, size } } : {}) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${vp}: ${e.message}`));
  let n = 0; const t0 = Date.now(); const chapters = [];
  const step = (name, ok, info = '') => { chapters.push({ t: (Date.now() - t0) / 1000, name, ok: !!ok }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} [${vp}] ${name}${!ok && info ? ` · ${String(info).replace(/\s+/g, ' ').slice(0, 240)}` : ''}`); };
  const shot = async (name) => { await sleep(300); await page.screenshot({ path: `${OUT}/${vp}-${String(++n).padStart(2, '0')}-${name}.png` }); if (PACE) await sleep(PACE); };
  const world = () => page.evaluate(() => window.__tqQA.getWorld());
  const lastQ = async () => { const w = await world(); const t = w.q.threads[w.session.actor] ?? []; return [...t].reverse().find((m) => m.who !== 'me')?.text ?? ''; };
  const openQ = async () => { if (!phone) return; if (await page.locator('#q-ask').isVisible().catch(() => false)) return; await page.locator('.ds-askbar button').first().click(); await page.locator('#q-ask').waitFor({ timeout: 3000 }).catch(() => {}); await sleep(250); };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) await x.click(); await sleep(250); };
  const ask = async (text, wait = 1000) => {
    await openQ();
    if (PACE) await page.locator('#q-ask').pressSequentially(text, { delay: 32 }); else await page.locator('#q-ask').fill(text);
    await page.locator('#q-ask').press('Enter'); await sleep(wait + PACE / 2);
    return lastQ();
  };
  const chip = async (re) => { await openQ(); const c = page.locator('.ds-log button, .ds-thread .ds-chip').filter({ hasText: re }).last(); if (!(await c.count())) return false; await c.click(); await sleep(800); return true; };
  const thread = async () => page.locator('.ds-thread').innerText().catch(() => '');
  const as = async (id, route) => { await closeQ(); await page.goto(`${BASE}?n=${Math.random()}#${route}${route.includes('?') ? '&' : '?'}as=${id}`); await page.waitForSelector('.ds-app'); await sleep(900); };
  const go = async (route) => { await closeQ(); await page.evaluate((r) => { location.hash = r; }, route); await sleep(900); };
  const canvas = () => page.locator('#ds-content').innerText();
  const overflow = async (where) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) step(`no sideways scroll on ${where}`, false, `${o}px`); };
  const msgs = async () => (await world()).threads.flatMap((t) => t.messages);

  await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ds-app'); await sleep(600);

  // ---- 1. Find by demonstrated ability ----
  await as('u_ada', '/r/home');
  let r = await ask('find someone who can troubleshoot Postgres, not just list it on a CV', 1300);
  await openQ();
  const card = await page.locator('.ds-log .evr-find').last().innerText().catch(() => '');
  step('1 Q reads permitted evidence, not CV wording; nobody left out for missing keywords', /not in CV wording/.test(r) && /No one is left out for missing keywords/.test(r) && !BAD.test(r + card), r);
  step('1 Truthful stages: planned, read, checked, done', /PLANNED/i.test(card) && /READ/i.test(card) && /CHECKED/i.test(card) && /DONE/i.test(card), card.slice(0, 160));
  step('1 Tobi is found from reviewed work although his CV never names Postgres', /Tobi Adeyemi/.test(card) && /Doesn’t name it/.test(card) && /Assessed/.test(card), card.slice(0, 300));
  step('1 Seyi Okoro: strong claims, limited supporting evidence', /Seyi Okoro/.test(card) && /Strong claims, limited supporting evidence/.test(card));
  await shot('find'); await closeQ(); await overflow('home');

  // ---- 2. Why a weak CV ----
  r = await ask('why is Tobi worth reviewing when his CV is weak?', 1100);
  step('2 Cites the reviewed items and says CV wording isn’t evidence either way', /isn’t evidence either way/.test(r + await thread()) && /Musa Danladi/.test(await thread()), r);
  step('2 Names what is still open (on-call, partial) and never calls him better', /Still open/.test(r) && /on-call/i.test(r) && !/\b(better|stronger|best) than\b/i.test(r), r);
  await shot('why');

  // ---- 3. CV and proof ----
  // Through Q's own chip, the way Ada would; the page's view switch is the fallback.
  if (!(await chip(/Open the CV and proof view|Compare Tobi/))) await go('/r/compare');
  await closeQ();
  if (!/What the CVs say/.test(await canvas())) { await page.getByRole('button', { name: 'CV and proof', exact: true }).click(); await sleep(600); }
  const cv = await canvas();
  step('3 CV and proof: per requirement, what the CV says beside what the evidence shows', /What the CVs say, and what the evidence shows/.test(cv) && /Doesn’t name it/.test(cv) && /Self-reported/.test(cv) && /Assessed/.test(cv));
  step('3 Headlines are evidence states, not judgements', /Shows more than the CV says/.test(cv) && /Strong claims, limited supporting evidence/.test(cv) && !BAD.test(cv));
  step('3 Unknown is shown as unknown, never zero; interest sits apart and is never scored', /Unknown, not zero/.test(cv) && /never scored/i.test(cv));
  if (phone) step('3 Phone: a list, not a shrunk grid', await page.locator('.evr-cvp-list').first().isVisible());
  await shot('cv-and-proof'); await overflow('compare');

  // ---- 4. Seyi Okoro's profile ----
  await go('/r/people/p_seyio');
  const pf = await canvas();
  step('4 His CV is shown as a document with its claims marked; evidence by proof class', await page.locator('#pf-cv mark').count() >= 3 && /Self-reported/.test(pf) && /Claim/.test(pf));
  step('4 Mutual fit shows only what he shared; unknowns stay unknown', (await page.locator('#pf-mutual .evr-unknown').count()) >= 1);
  step('4 Close only the gap: accept, verify, or one 40-minute sample', /One sample · 40 min/.test(await page.locator('#pf-reuse').innerText()));
  await shot('profile-seyi'); await overflow('profile');

  // ---- 5. Accept Tobi's evidence; one bounded sample for Seyi Okoro, approved and sent ----
  await ask('accept Tobi\'s Postgres evidence, no retest');
  let w = await world();
  step('5 Tobi: prior evidence accepted, no retest (audited)', w.areas.proof.reuse.some((d) => d.personId === 'p_tobi' && d.decision === 'ACCEPT_PRIOR'));
  await ask('ask Seyi Okoro for one short Postgres sample instead of the full assessment', 1100);
  w = await world();
  const dec = w.areas.proof.reuse.find((d) => d.personId === 'p_seyio' && d.decision === 'BOUNDED_SAMPLE');
  step('5 Seyi Okoro: one 40-minute Postgres sample, drafted and not yet sent', dec?.effortMinutes === 40 && dec.state === 'PROPOSED');
  await ask('send it');
  step('5 Approval asked for the exact version before anything goes', /Approve this exact version/.test(await lastQ()));
  await chip(/Approve and send/);
  w = await world();
  step('5 Approved, then sent (simulated); only then is the request marked sent', w.areas.proof.reuse.find((d) => d.id === dec?.id)?.state === 'SENT');
  await shot('sample-sent');

  // ---- 6–7. Seyi Okoro sees a fair request, does the sample, submits ----
  await as('p_seyio', '/c/applications');
  const req = page.locator('.evc-req').first();
  const rq = await req.innerText();
  step('6 A respectful request: why, 40 minutes, and three choices', /40/.test(rq) && await req.getByRole('button', { name: 'Do it now' }).isVisible() && await req.getByRole('button', { name: 'Decline' }).isVisible() && !BAD.test(rq), rq.slice(0, 200));
  await shot('candidate-request'); await overflow('applications');
  await req.getByRole('button', { name: 'Do it now' }).click(); await sleep(500);
  const panel = page.locator('.evc-sample');
  await panel.locator('textarea').fill('EXPLAIN ANALYZE first: a sequential scan and a sort. A partial index on (merchant_id, created_at DESC) WHERE status = PENDING reads only the rows it needs.');
  await shot('candidate-sample');
  await panel.getByRole('button', { name: 'Submit for review' }).click(); await sleep(600);
  step('7 Submitted: “Self-reported, waiting for review”', /Self-reported, waiting for review/.test(await page.locator('.evc-req').first().innerText()));
  await go('/c/passport');
  step('7 The Passport uses the same proof words Ada sees', /Self-reported/.test(await canvas()) && /Claim/.test(await canvas()));
  await shot('candidate-passport');

  // ---- 8. Ada reviews: shows part of it, shares the note; both move to interview ----
  await as('u_ada', '/r/home');
  step('8 Ada’s home: the submitted sample needs her', /Seyi Okoro sent the Postgres sample/.test(await canvas()));
  await ask('review Seyi Okoro\'s sample');
  await closeQ();
  await page.locator('#pf-review label', { hasText: 'Shows part of it' }).click();
  await page.locator('#pf-review textarea').fill('Found the missing index quickly; didn’t check the plan under write load.');
  await page.locator('#pf-review label', { hasText: /Share this note/ }).click().catch(() => {});
  await shot('review');
  await page.locator('#pf-review').getByRole('button', { name: 'Record the review' }).click(); await sleep(700);
  w = await world();
  const d8 = w.areas.proof.reuse.find((d) => d.id === dec?.id);
  step('8 Reviewed by a named person with a note: Assessed, partial', d8?.state === 'REVIEWED' && w.events.some((e) => e.type === 'evidence.sample.reviewed'));
  if (!d8?.candidateNote) { await page.locator('#pf-review').getByRole('button', { name: /Share the note/ }).click().catch(() => {}); await sleep(400); w = await world(); }
  step('8 The note reaches Seyi Okoro only because Ada chose to share it', !!w.areas.proof.reuse.find((d) => d.id === dec?.id)?.candidateNote);
  await ask('move both to interview');
  w = await world();
  step('8 Peak: both progress to interview on their own evidence', ['p_tobi', 'p_seyio'].every((p) => w.pipeline.find((x) => x.personId === p && x.mandateId === 'm_backend')?.stage === 'INTERVIEW'));
  await shot('both-interview');

  // ---- 9. Interest is a check, asked through an approved message ----
  r = await ask('is Tobi interested?');
  step('9 Unknown interest is said plainly, never guessed or scored', /I don’t know yet/.test(r), r);
  await chip(/Ask Tobi/);
  w = await world();
  step('9 Drafted for approval; not requested until it is sent', !w.areas.proof.interest.some((i) => i.personId === 'p_tobi'));
  const s9 = await ask('send it'); const c9 = await chip(/Approve and send/);
  w = await world();
  if (process.env.DEBUG) console.log('DEBUG9', s9, '| chip:', c9, '| last:', await lastQ(), '| msgs:', JSON.stringify((await msgs()).filter((m) => m.to === 'p_tobi').map((m) => [m.id, m.status, m.channel])));
  step('9 Interest request sent after approval; pending, not a score', w.areas.proof.interest.some((i) => i.personId === 'p_tobi' && i.state === 'REQUESTED'));

  // ---- 10. Tobi confirms; Kora's confirmation and commitment are visible ----
  await as('p_tobi', '/c/applications');
  await page.locator('.evc-int').getByRole('button', { name: 'Yes, I’m interested' }).click(); await sleep(500);
  w = await world();
  step('10 Tobi confirms interest', w.areas.proof.interest.find((i) => i.personId === 'p_tobi')?.state === 'CONFIRMED');
  await go('/c/jobs');
  step('10 “Hiring confirmed by Kora Pay on 27 Oct” on Kora’s job only', /Hiring confirmed by Kora Pay on 27 Oct/.test(await canvas()) && !/Hiring confirmed by Rivers/.test(await canvas()));
  await shot('candidate-jobs');

  // ---- 11. Ada emails the invite through the existing approval flow ----
  await as('u_ada', '/r/messages');
  r = await ask('email Tobi an interview invite for Thursday or Friday', 1200);
  const before = (await msgs()).filter((m) => m.to === 'p_tobi' && m.channel === 'EMAIL' && m.delivery === 'ACCEPTED').length;
  step('11 Drafted from Ada’s mailbox; nothing sent yet', /ada@kora\.example/.test(r), r);
  await ask('send it'); await chip(/Approve and send/);
  const after = (await msgs()).filter((m) => m.to === 'p_tobi' && m.channel === 'EMAIL' && m.delivery === 'ACCEPTED').length;
  step('11 Approved, then accepted by Google (simulated), once', after === before + 1);
  await shot('invite');

  // ---- 12. Tobi's way forward (J7, private) ----
  await as('p_tobi', '/c/home');
  const gap = await page.locator('.evc-gap').innerText().catch(() => '');
  step('12 J7 answers the open gap privately: on-call is only partly shown; practice is never employer-visible', /On-call leadership is only partly shown/.test(gap) && /no employer sees it/.test(gap), gap.slice(0, 200));
  await shot('candidate-gap'); await overflow('candidate home');

  // ---- 13. Tobi stops sharing; Ada's views update ----
  await go('/c/passport?item=e_tobi_incident');
  await page.locator('.tb-card', { hasText: 'Debugging sample' }).getByRole('button', { name: 'Stop sharing with Kora Pay' }).click(); await sleep(500);
  step('13 Kora can no longer read the debugging sample', !(await page.evaluate(() => window.__tqQA.visibleEvidence(window.__tqQA.getWorld(), 'p_tobi', 'org_kora').map((e) => e.evidenceId))).includes('e_tobi_incident'));
  await as('u_ada', '/r/compare');
  step('13 Ada’s comparison drops it at once', !/lock contention|Debugging sample/.test(await canvas()));
  await openQ();
  const t13 = await thread();
  step('13 Q’s earlier result card re-renders without it', !/lock contention|Debugging sample/.test(t13));
  await shot('after-revoke'); await closeQ();

  // ---- 14. Another tenant ----
  await as('u_dele', '/r/home');
  r = await ask("show me Kora's rubric for the senior backend role");
  const r2 = await ask('find someone who can troubleshoot Postgres, not just list it on a CV', 1100);
  step('14 Dele is refused without learning whether anything exists', !/\bv\d|in force|draft/i.test(r) && !/Tobi|Seyi|Ifeoma/.test(r2), `${r} / ${r2}`);
  await shot('dele');

  if (VIDEO) writeFileSync(`${VIDEO}/${vp}-chapters.json`, JSON.stringify(chapters, null, 1));
  await ctx.close(); await b.close();
}

for (const vp of (ONLY ? [ONLY] : ['d', 'm'])) await run(vp);
if (errors.length) { console.log(`FAIL page errors: ${errors.slice(0, 3).join(' | ')}`); fails++; }
console.log(fails ? `${fails} J12 step(s) failed` : 'J12 passed');
process.exit(fails ? 1 : 0);
