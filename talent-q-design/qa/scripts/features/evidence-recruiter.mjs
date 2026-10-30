// Feature test · EVIDENCE-FIRST, recruiter side (J12 steps 1–5, 8, 9, recruiter half of 13; build pack 05 P1).
// Ada finds people who can troubleshoot Postgres (Tobi present despite his CV; Seyi Okoro "strong claims, limited
// supporting evidence"; no reject language), asks why Tobi, opens the CV and proof view (list alternative, keyboard),
// opens Seyi Okoro's profile, accepts Tobi's evidence, asks Seyi Okoro for one bounded sample (draft → approval →
// send, never before), the candidate's submission is simulated through the store (as rubric.mjs injects ratings),
// Ada reviews it with a note, moves both to interview, asks whether Tobi is interested (approved message → pending
// check), then Tobi revokes the debugging sample and the card and comparison update. Dele (agency) is refused.
// Usage: node qa/scripts/features/evidence-recruiter.mjs [port=5196] [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const PORT = process.argv[2] || '5196';
const ONLY = (process.argv[3] || 'd,m').split(',');
const OUT = fileURLToPath(new URL('../../../captures/cx/evidence-recruiter/', import.meta.url)); mkdirSync(OUT, { recursive: true });
const BASE = `http://localhost:${PORT}/`;
const b = await pw.chromium.launch();
const errors = []; const results = [];
const step = (v, name, ok, detail = '') => { results.push({ v, name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail && !ok ? ` · ${String(detail).slice(0, 220)}` : ''}`); };
const BAD = /\breject\w*|\bliar\b|\blying\b|\bdishonest|\bfake\b|\bexaggerat\w*|\bnot (a )?fit\b/i;

for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 2], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text()}`); });
  const phone = v === 'm';
  let n = 0;
  const shot = async (name) => { await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${v}-${String(++n).padStart(2, '0')}-${name}.png`, fullPage: !phone }); };
  const overflow = async (x) => { const o = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.ds-canvas')].map((e) => e.scrollWidth)) - innerWidth); if (o > 1) { errors.push(`${v}/${x}: horizontal overflow ${o}px`); return false; } return true; };
  const world = () => page.evaluate(() => window.__tqQA.getWorld());
  const lastQ = async () => { const w = await world(); const t = w.q.threads[w.session.actor] ?? []; return [...t].reverse().find((m) => m.who !== 'me')?.text ?? ''; };
  const route = () => page.evaluate(() => location.hash.replace(/^#/, '').split('?')[0]);
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.count()) await x.click(); await page.waitForTimeout(250); };
  const openQ = async () => { if (!phone) return; const bar = page.locator('.ds-askbar button'); if (await bar.count() && await bar.first().isVisible()) await bar.first().click(); await page.waitForTimeout(250); };
  const ask = async (text, wait = 800) => { await openQ(); await page.locator('#q-ask').fill(text); await page.locator('#q-ask').press('Enter'); await page.waitForTimeout(wait); };
  const go = async (r) => { await page.goto(`${BASE}?n=${Math.random()}#${r}`); await page.waitForTimeout(900); };
  const canvas = () => page.locator('.ds-canvas').first().innerText();
  const threadText = async () => { await openQ(); const t = await page.locator('.ds-log').first().innerText().catch(() => ''); return t; };
  const asActor = async (id, r) => { await page.evaluate((id) => window.__tqQA.update((w) => { w.session.actor = id; }), id); await go(r); };
  const act = (op, args) => page.evaluate(([op, args]) => window.__tqQA.act(op, args), [op, args]);
  const chip = async (name) => { await openQ(); const c = page.locator('.ds-log button', { hasText: name }).last(); if (await c.count()) { await c.click(); await page.waitForTimeout(800); return true; } return false; };

  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await go('/r/home?as=u_ada'); await closeQ();

  // ---- Q Home: one-click task (pack UI item A) ----
  step(v, 'home: "Investigate surprising fits" task is offered', /Investigate surprising fits/.test(await canvas()));
  await overflow('home'); await shot('home');

  // ---- Step 1: the find ----
  await ask('find someone who can troubleshoot Postgres, not just list it on a CV');
  let r = await lastQ();
  step(v, 'find: Q answers from evidence, not CV wording', /not in CV wording/.test(r) && /Tobi/.test(r), r);
  step(v, 'find: Seyi Okoro reads "strong claims, limited supporting evidence"', /Seyi Okoro: strong claims, limited supporting evidence/.test(r), r);
  step(v, 'find: no one rejected for missing keywords', /No one is left out for missing keywords/.test(r) && !BAD.test(r), r);
  const card = page.locator('.evr-find').last();
  let ct = await card.innerText();
  step(v, 'card: truthful stages (planned, read, checked, done)', /PLANNED/i.test(ct) && /READ/i.test(ct) && /CHECKED/i.test(ct) && /DONE/i.test(ct), ct.slice(0, 200));
  step(v, 'card: Tobi present despite his CV, in reviewed work, with proof class and source', /Tobi Adeyemi/.test(ct) && /Shown in reviewed or checked work[\s\S]*Tobi Adeyemi/.test(ct) && /Assessed/.test(ct) && /reviewed by Musa Danladi/.test(ct) && /Doesn’t name it/.test(ct), ct.slice(0, 400));
  step(v, 'card: Seyi Okoro shown with his CV claim and limited support', /Seyi Okoro/.test(ct) && /Strong claims, limited supporting evidence/.test(ct) && /Self-reported/.test(ct), ct);
  step(v, 'card: unknown is never zero, no reject language', /Unknown|unknown/.test(ct + r) && !BAD.test(ct) && !/\bscore[sd]? (of )?0\b|0 points/i.test(ct));
  await shot('find');

  // ---- Step 3: CV and proof view ----
  await chip('Compare Tobi and Seyi Okoro');
  step(v, 'chip opens /r/compare in the CV and proof view for Tobi and Seyi Okoro', (await route()) === '/r/compare' && /What the CVs say, and what the evidence shows/.test(await canvas()));
  await closeQ();
  let cv = await canvas();
  step(v, 'lens: headline per person (Shows more than the CV says / Strong claims…)', /Shows more than the CV says/.test(cv) && /Strong claims, limited supporting evidence/.test(cv));
  step(v, 'lens: CV said vs evidence shown, with proof words', /Postgres performance/.test(cv) && /Doesn’t name it/.test(cv) && /Assessed/.test(cv) && /Self-reported/.test(cv));
  step(v, 'lens: a next step per person', /Accept the reviewed Postgres/.test(cv) && /Ask for one 40-minute Postgres sample/.test(cv), cv.match(/NEXT STEP[\s\S]{0,200}/i)?.[0]);
  step(v, 'lens: unknown shown as unknown, not zero', /Unknown, not zero/.test(cv) && !/\b0 ?(of|\/) ?\d/.test(cv));
  step(v, 'lens: interest apart, never scored', /never scored/i.test(cv) && /Not asked yet/.test(cv));
  if (phone) {
    step(v, 'phone: list alternative shown, grid hidden (no shrunk grid)', await page.locator('.evr-cvp-list').first().isVisible() && !(await page.locator('.evr-cvp-table').first().isVisible()));
  } else {
    step(v, 'desktop: rubric weights or equal must-haves stated', /must-haves count the same|weight \d/.test(cv));
    await page.getByRole('button', { name: 'List', exact: true }).click();
    step(v, 'desktop: list alternative available', await page.locator('.evr-cvp-list').first().isVisible());
    await page.getByRole('button', { name: 'Table', exact: true }).click();
  }
  const cell = page.locator('.evr-cvp-sec .evr-cell:visible').first();
  await cell.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  step(v, 'keyboard: a cell opens the evidence inspector', await page.locator('#cmp-ins').count() > 0);
  await overflow('compare-proof'); await shot('compare-proof');

  // ---- Step 2: why Tobi ----
  await ask('why is Tobi worth reviewing when his CV is weak?');
  r = await lastQ();
  const why = await page.locator('.evr-why').last().innerText();
  step(v, 'why: cites reviewed items with source, date and limits', /reviewed or checked/.test(r) && /Musa Danladi/.test(why) && /LIMITS/i.test(why), why.slice(0, 300));
  step(v, 'why: CV wording isn’t evidence either way (no inverted bias)', /isn’t evidence either way/.test(r + why) && /isn’t a point in his favour/.test(r), r);
  step(v, 'why: open items stated (on-call partial)', /Still open/.test(r) && /on-call \(partial\)/.test(r), r);
  step(v, 'why: Tobi is never declared better', !/\b(better|stronger|best) than\b/i.test(r + why));
  await shot('why');

  // ---- Step 4: Seyi Okoro's profile ----
  await go('/r/people/p_seyio'); await closeQ();
  let pf = await canvas();
  step(v, 'profile: the CV as a document with claims marked', await page.locator('#pf-cv mark').count() >= 3 && /A CV line is a claim/.test(pf));
  step(v, 'profile: evidence grouped by proof class, meaning on demand', /Self-reported/.test(await page.locator('#pf-ev').innerText()) && await (async () => { const btn = page.locator('#pf-ev .evr-means-btn').first(); await btn.click(); return /not yet checked or reviewed/.test(await page.locator('#pf-ev').innerText()); })());
  step(v, 'profile: mutual fit only what he shared, unknowns as unknown', /Remote or Hybrid/.test(await page.locator('#pf-mutual').innerText()) && (await page.locator('#pf-mutual .evr-unknown').count()) >= 2);
  step(v, 'profile: reuse actions (accept / verify / one bounded sample with minutes)', /Ask to verify/.test(await page.locator('#pf-reuse').innerText()) && /One sample · 40 min/.test(await page.locator('#pf-reuse').innerText()));
  step(v, 'profile: no liar language', !BAD.test(pf));
  await overflow('profile'); await shot('profile-seyio');

  // ---- Step 5: accept Tobi's evidence; one bounded sample for Seyi Okoro (approval before send) ----
  await ask('accept Tobi\'s Postgres evidence, no retest');
  let w = await world();
  step(v, 'accept: ACCEPT_PRIOR recorded and audited', w.areas.proof.reuse.some((d) => d.personId === 'p_tobi' && d.decision === 'ACCEPT_PRIOR' && d.reqId === 'r3') && w.events.some((e) => e.type === 'evidence.reuse.accept_prior'));
  await ask('ask Seyi Okoro for one short Postgres sample instead of the full assessment');
  w = await world();
  const dec = w.areas.proof.reuse.find((d) => d.personId === 'p_seyio' && d.decision === 'BOUNDED_SAMPLE');
  const msg = () => world().then((x) => x.threads.flatMap((t) => t.messages).find((m) => m.id === `msg_evs_${dec?.id}`));
  step(v, 'sample: BOUNDED_SAMPLE for Postgres, 40 minutes', dec?.reqId === 'r3' && dec?.effortMinutes === 40);
  step(v, 'sample: drafted in correspondence, not sent', (await msg())?.status === 'DRAFT' && dec?.state === 'PROPOSED' && (await msg())?.channel === 'IN_APP');
  step(v, 'sample: the draft is respectful (no CV-is-untrue language)', /Your CV describes/.test((await msg())?.body ?? '') && /recorded as declined, not as a failed result/.test((await msg())?.body ?? '') && !BAD.test((await msg())?.body ?? ''));
  await ask('send it');
  w = await world();
  step(v, 'approval asked before any send', /Approve this exact version/.test(await lastQ()) && (await msg())?.status === 'AWAITING_APPROVAL' && w.areas.proof.reuse.find((d) => d.id === dec.id).state === 'PROPOSED');
  await chip('Approve and send');
  w = await world();
  step(v, 'approved → simulated send → ev.reuse.sent', (await msg())?.status === 'SENT_SIMULATED' && w.areas.proof.reuse.find((d) => d.id === dec.id).state === 'SENT' && w.events.some((e) => e.type === 'evidence.reuse.sent') && /Simulated send/.test(await lastQ()));
  await closeQ();

  // ---- Step 8: the candidate submits (simulated through the store), Ada reviews ----
  await page.evaluate(() => window.__tqQA.update((w) => { w.session.actor = 'p_seyio'; }));
  await act('ev.sample.start', { id: dec.id });
  await act('ev.sample.submit', { id: dec.id, summary: 'Found the slow query with EXPLAIN ANALYZE: a sequential scan on payouts by merchant. Added a composite index; 2.1s → 90ms.' });
  await asActor('u_ada', '/r/home'); await closeQ();
  step(v, 'home: "needs you" lists the submitted sample (authoritative state)', /Seyi Okoro sent the Postgres sample/.test(await canvas()));
  await openQ();
  const sugg = await page.locator('.ds-thread, .ds-sheetq, .ds-log').first().innerText().catch(() => '');
  step(v, 'proactive card for Ada when the sample is submitted', /sent the 40-minute Postgres sample/.test(sugg) || /sent the 40-minute Postgres sample/.test(await page.locator('body').innerText()));
  await closeQ(); await shot('home-attention');
  await ask('review Seyi Okoro\'s sample');
  step(v, 'review: Q opens the review panel on the profile', (await route()) === '/r/people/p_seyio');
  await closeQ();
  await page.locator('#pf-review').scrollIntoViewIfNeeded();
  await page.locator('#pf-review').getByRole('button', { name: 'Record the review' }).click();
  step(v, 'review: needs an outcome and a note (inline)', /Choose what the sample shows/.test(await page.locator('#pf-review').innerText()));
  await page.locator('#pf-review label', { hasText: 'Shows part of it' }).click();
  await page.locator('#pf-review textarea').fill('Found the cause quickly; the index choice needs a conversation about write load.');
  await shot('review-panel');
  await page.locator('#pf-review').getByRole('button', { name: 'Record the review' }).click(); await page.waitForTimeout(600);
  w = await world();
  const e2 = w.evidence.find((e) => e.evidenceId === `e_sample_${dec.id}`);
  step(v, 'review: ev.sample.review → Assessed (partial) with reviewer and note', w.areas.proof.reuse.find((d) => d.id === dec.id).state === 'REVIEWED' && e2?.verification === 'VERIFIED' && /reviewed by Ada Okafor/.test(e2.source) && w.areas.proof.links.some((l) => l.evidenceId === e2.evidenceId && l.partial && l.state === 'REVIEWED') && w.events.some((e) => e.type === 'evidence.sample.reviewed' && /shows part of it/.test(e.text)));
  await ask('move both to interview');
  w = await world();
  step(v, 'move both: both at Interview, audited', ['p_tobi', 'p_seyio'].every((p) => w.pipeline.find((x) => x.personId === p && x.mandateId === 'm_backend')?.stage === 'INTERVIEW') && w.events.filter((e) => e.type === 'pipeline.moved').length >= 2, await lastQ());

  // ---- Step 9: is Tobi interested? ----
  await ask('is Tobi interested?');
  r = await lastQ();
  step(v, 'interest: unknown is said plainly, never guessed or scored', /I don’t know yet/.test(r) && /never guess it or score it/.test(r), r);
  await chip('Ask Tobi');
  w = await world();
  step(v, 'interest: drafted, not requested until sent', !w.areas.proof.interest.some((i) => i.personId === 'p_tobi') && w.threads.flatMap((t) => t.messages).some((m) => m.id === 'msg_evi_p_tobi' && m.status === 'DRAFT'));
  await ask('send it'); await chip('Approve and send');
  w = await world();
  step(v, 'interest: approved message → ev.interest.request (pending)', w.areas.proof.interest.some((i) => i.personId === 'p_tobi' && i.state === 'REQUESTED') && w.events.some((e) => e.type === 'candidate.interest_requested'));
  await closeQ();
  await page.evaluate(() => window.__tqQA.update((w) => { const k = `${w.session.actor}|/r/compare`; (w.q.ui[k] ??= {}).cmp = { ...(w.q.ui[k].cmp || {}), lens: 'proof', people: ['p_tobi', 'p_seyio'] }; }));
  await go('/r/compare'); await closeQ();
  cv = await canvas();
  step(v, 'compare: interest shows as a pending check, apart from suitability', /Pending check: asked/.test(cv));
  step(v, 'compare: Seyi Okoro’s Postgres now reads Assessed from the reviewed sample', /Bounded work sample|shows part|index choice/.test(cv) || /Assessed/.test(await page.locator('.evr-cvp-sec').innerText()));
  await overflow('compare-after'); await shot('compare-after');

  // ---- Step 13 (recruiter half): Tobi stops sharing the debugging sample ----
  await page.evaluate(() => window.__tqQA.update((w) => { const e = w.evidence.find((x) => x.evidenceId === 'e_tobi_incident'); e.revokedFrom = [...(e.revokedFrom ?? []), 'org_kora']; }));
  await go('/r/compare'); await closeQ();
  step(v, 'revocation: comparison no longer uses the debugging sample', !/lock contention|Debugging sample/.test(await canvas()));
  const t13 = await threadText();
  const card13 = await page.locator('.evr-find').first().innerText().catch(() => '');
  step(v, 'revocation: the Q card re-renders from state and says something was withdrawn', !/lock contention|Debugging sample/.test(t13) && /no longer shared with you/.test(card13), card13.slice(0, 300));
  await closeQ();
  await go('/r/people/p_tobi'); await closeQ();
  step(v, 'revocation: Tobi’s profile no longer shows it', !/lock contention|Debugging sample/.test(await canvas()));

  // ---- Names: Seyi Balogun (colleague) vs Seyi Okoro (candidate) ----
  const nm = await page.evaluate(() => { const w = window.__tqQA.getWorld(); return w.people.some((p) => p.personId === 'p_seyio'); });
  await go('/r/people/p_seyio'); await closeQ();
  const own = (await Promise.all(['#pf-cv', '#pf-reuse', '#pf-mutual', '.hire-b-lede'].map((sel) => page.locator(sel).first().innerText().catch(() => '')))).join('\n');
  step(v, 'names: the candidate is shown with his surname on the evidence panels', nm && /Seyi Okoro/.test(own) && !/\bSeyi(?! Okoro| Balogun)\b/.test(own), own.match(/.{0,40}\bSeyi\b(?! Okoro).{0,40}/)?.[0]);
  await go('/r/home'); await ask('find a time for Kunle with Seyi and Musa next week');
  step(v, 'names: "with Seyi and Musa" (panel) means Seyi Balogun, not the candidate', !/Seyi Okoro/.test(await lastQ()), await lastQ());
  await closeQ();

  // ---- Dele (agency): refused without revealing anything ----
  await asActor('u_dele', '/r/home'); await closeQ();
  await ask('find someone who can troubleshoot Postgres, not just list it on a CV');
  r = await lastQ();
  step(v, 'Dele: the find is refused without names or existence', /can’t search or act on another organisation’s hiring/.test(r) && !/Tobi|Seyi|Ifeoma/.test(r) && !(await page.locator('.ds-log .evr-find').count()), r);
  await ask('why is Tobi worth reviewing when his CV is weak?');
  r = await lastQ();
  step(v, 'Dele: "why Tobi" is refused the same way', !/reviewed|Musa|Postgres/.test(r), r);
  await closeQ(); await shot('dele');
  await ctx.close();
}
await b.close();
const fail = results.filter((x) => !x.ok);
console.log(`\n${results.length - fail.length}/${results.length} passed${errors.length ? `, ${errors.length} page errors` : ''}`);
for (const e of errors.slice(0, 12)) console.log('ERROR', e);
process.exit(fail.length || errors.length ? 1 : 0);
