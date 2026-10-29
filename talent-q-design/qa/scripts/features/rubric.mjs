// Feature test · RUBRIC (audit addendum §E, AD-E-01…14, AD-B-03, AD-B-05; J11 steps 5, 8 and 9).
// Ada builds the Senior Backend rubric with Q (propose → edit weights → refusal of a proxy → approve v1), the
// comparison takes its weights, Tobi gets Q-proposed ratings from video (written the way the MEDIA builder writes
// them) and Ifeoma from shared evidence, Ada overrides with a reason (asked for when missing), adds mentoring, and
// the change notice offers "notify and reassess" or "keep v1 for this round". Tobi sees his own ratings and asks
// for a correction. Tenant isolation, phone layout (switch, page index, no sideways scroll) are checked too.
// Usage: node qa/scripts/features/rubric.mjs [port=5193] [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const PORT = process.argv[2] || '5193';
const ONLY = (process.argv[3] || 'd,m').split(',');
const OUT = fileURLToPath(new URL('../../../captures/cx/rubric/', import.meta.url)); mkdirSync(OUT, { recursive: true });
const BASE = `http://localhost:${PORT}/`;
const b = await pw.chromium.launch();
const errors = []; const results = [];
const step = (v, name, ok, detail = '') => { results.push({ v, name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail ? ` · ${detail}` : ''}`); };

for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text()}`); });
  const phone = v === 'm';
  let n = 0;
  const shot = async (name, full = true) => { await page.waitForTimeout(350); const el = page.locator('.ds-canvas').first(); if (full && !phone && await el.count()) { await page.screenshot({ path: `${OUT}/${v}-${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true }); } else await page.screenshot({ path: `${OUT}/${v}-${String(++n).padStart(2, '0')}-${name}.png`, fullPage: full }); };
  const overflow = async (x) => { const o = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.ds-canvas')].map((e) => e.scrollWidth)) - innerWidth); if (o > 1) { errors.push(`${v}/${x}: horizontal overflow ${o}px`); return false; } return true; };
  const world = () => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
  const lastQ = async () => { const w = await world(); const t = w.q.threads[w.session.actor] ?? []; return [...t].reverse().find((m) => m.who !== 'me')?.text ?? ''; };
  const route = () => page.evaluate(() => location.hash.replace(/^#/, ''));
  const closeQ = async () => { const x = page.getByRole('button', { name: 'Close Q' }); if (await x.count()) await x.click(); await page.waitForTimeout(250); };
  const openQ = async () => { if (!phone) return; const bar = page.locator('.ds-askbar button'); if (await bar.count()) await bar.click(); await page.waitForTimeout(250); };
  const ask = async (text, wait = 700) => { await openQ(); await page.locator('#q-ask').fill(text); await page.locator('#q-ask').press('Enter'); await page.waitForTimeout(wait); if (phone) await closeQ(); };
  const go = async (r) => { await page.goto(`${BASE}?n=${Math.random()}#${r}`); await page.waitForTimeout(900); };
  const canvas = () => page.locator('.ds-canvas').first().innerText();
  const rub = (w) => w.areas.rubrics.list.find((x) => x.mandateId === 'm_backend');
  const asActor = async (id, r) => { await page.evaluate((id) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = id; localStorage.setItem('tq.world.v4', JSON.stringify(w)); }, id); await go(r); };

  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(900);

  // ---- J11 step 5: empty → Q_PROPOSED → edited → v1 APPROVED ----
  await go('/r/roles/m_backend/rubric');
  step(v, 'studio: designed empty state with a way forward', /Agree how to judge this role/.test(await canvas()) && /Ask Q to propose a rubric/.test(await canvas()));
  await overflow('studio-empty'); await shot('studio-empty');
  await ask('propose a rubric for the senior backend role', 900);
  let w = await world();
  step(v, 'Q proposes v1 (Q_PROPOSED) from brief, guidelines and ESCO', rub(w)?.versions[0]?.state === 'Q_PROPOSED' && /I drafted a rubric/.test(await lastQ()) && /ESCO/.test(await lastQ()));
  const c0 = rub(w).versions[0].criteria;
  step(v, 'criteria carry anchors 0–4, evidence, questions, method, weight, minimum, requirement, ESCO, why', c0.filter((c) => c.kind !== 'ELIGIBILITY' && c.kind !== 'COMPATIBILITY').every((c) => c.anchors.length === 5 && c.evidenceToInspect.length && c.questions.length && c.method && c.why && c.requirementId && /illustrative/.test(c.escoRef)));
  step(v, 'signals separate: eligibility gate and compatibility outside the index', c0.some((c) => c.kind === 'ELIGIBILITY' && c.weight === 0) && c0.some((c) => c.kind === 'COMPATIBILITY' && c.weight === 0));
  step(v, 'mentoring left out with a reason (brief does not define it)', !c0.some((c) => c.id === 'c_mentoring') && /left out mentoring/.test(await lastQ()));
  const txt = await canvas();
  step(v, 'side by side: Q proposed and your version', /Q proposed/i.test(txt) && /Your version/i.test(txt));
  step(v, 'not-validated statement is visible', /Not a validated test/.test(txt) && /job analysis/.test(txt));
  step(v, 'weights shown as share bars with %', (await page.locator('.ds-canvas .rb-shares .rb-share-bar').count()) >= 4 && /\d+%/.test(await page.locator('.ds-canvas .rb-shares').first().innerText()));
  await overflow('studio-proposed'); await shot('studio-proposed');

  await ask('make incidents and on-call weight 2');
  w = await world();
  step(v, 'weight edited by saying it (incidents and on-call 1 → 2)', rub(w).versions[0].criteria.find((c) => c.id === 'c_oncall')?.weight === 2 && /now weighs 2/.test(await lastQ()));
  step(v, 'edit log records who changed what', (w.areas.rubrics.meta.edits['rb_m_backend:v1'] ?? []).some((e) => e.by === 'u_ada' && /weight 1 → 2/.test(e.text)));
  step(v, 'Q proposal stays beside the edit ("Q proposed 1")', /Q proposed 1/.test(await canvas()));

  await ask('add a criterion for native english speakers to the rubric');
  w = await world();
  step(v, 'Q refuses a proxy criterion and says why, with an alternative', /I can’t put native speaker/.test(await lastQ()) && /instead/i.test(await lastQ()) && !rub(w).versions[0].criteria.some((c) => /native/i.test(c.label)) && w.events.some((e) => e.type === 'rubric.refused'));
  await ask('only candidates under 30 should score well on the rubric');
  step(v, 'Q refuses a protected characteristic (age)', /age/.test(await lastQ()) && (await world()).areas.rubrics.list[0].versions[0].criteria.length === c0.length);
  // The studio's own field screens as you type.
  if (!phone) {
    await page.locator('#rb-add').fill('good eye contact on video');
    step(v, 'studio field explains the refusal inline', /Q can’t add this/.test(await canvas()));
    await page.locator('#rb-add').fill('');
  }
  await ask('why is payments in the rubric');
  step(v, 'why: job-related reason with the source requirement', /From the brief: “Payments systems”/.test(await lastQ()));

  await ask('approve the rubric', 900);
  w = await world();
  const v1 = rub(w).versions[0];
  step(v, 'approved: v1 APPROVED by Ada, frozen', v1.state === 'APPROVED' && v1.approvedBy === 'u_ada' && w.events.some((e) => e.type === 'rubric.approved'));
  step(v, 'revisions list: who, when and the diff from Q’s proposal', /Revisions/.test(await canvas()) && /approved by Ada Okafor/.test(await canvas()) && /weight 1 → 2/.test(await canvas()));
  await overflow('studio-approved'); await shot('studio-approved');

  // ---- AD-B-05 / AD-E-09: the comparison uses the rubric's weights, explained in the margin ----
  await go('/r/compare');
  const cmp = await canvas();
  step(v, 'comparison: weights from rubric v1, approved by Ada', /Weights from rubric v1, approved by Ada/.test(cmp) && !/1\.5×/.test(cmp));
  step(v, 'comparison: mentoring not in the rubric, said so', /Mentoring isn’t in the rubric/.test(cmp));
  await overflow('/r/compare'); await shot('compare-rubric');

  // ---- J11 step 8: MEDIA writes Q-proposed ratings from video (simulated here the way MEDIA writes them) ----
  await page.evaluate(() => { const { update } = window.__tqQA; update((d) => { const r = d.areas.rubrics; const base = { rubricId: 'rb_m_backend', v: 1, personId: 'p_tobi', source: 'Q_PROPOSED', by: 'q', at: '2026-10-29T10:00:00+01:00', reviewed: false };
    r.ratings.push({ ...base, id: 'rt_media_pay', criterionId: 'c_payments', rating: 3, uncertainty: 'LOW', refs: [{ evidenceId: 'e_tobi_recon', t: 12, tEnd: 95, quote: 'we matched four million settlements a day' }], note: 'Walks through matching and the retry path, with numbers.' });
    r.ratings.push({ ...base, id: 'rt_media_pg', criterionId: 'c_postgres', rating: 3, uncertainty: 'MEDIUM', refs: [{ evidenceId: 'e_tobi_pg', t: 230, tEnd: 300 }], note: 'Shows a query going from 9s to 140ms.' }); }); });
  await ask('rate ifeoma against the rubric', 900);
  w = await world();
  step(v, 'Q proposes Ifeoma’s ratings from shared evidence (not reviewed)', w.areas.rubrics.ratings.filter((r) => r.personId === 'p_ife').length >= 2 && w.areas.rubrics.ratings.filter((r) => r.personId === 'p_ife').every((r) => r.source === 'Q_PROPOSED' && !r.reviewed));
  await go('/r/people/p_tobi');
  const prof = await canvas();
  step(v, 'scorecard: index only with coverage', /\b\d{1,3} at \d{1,3}% coverage/.test(prof) && /Observed index/i.test(prof));
  step(v, 'scorecard: unknown not counted as zero', /unknown and not counted as zero/.test(prof));
  step(v, 'scorecard: anchor text, Q-proposed and uncertainty per criterion', /Level 3:/.test(prof) && /Q proposed, not reviewed/.test(prof) && /uncertainty/i.test(prof));
  step(v, 'page index on the long profile (Fit, Scorecard, Evidence, Interview, History)', (await page.locator('.ds-pageindex a').allInnerTexts()).join(',') === 'Fit,Scorecard,Evidence,Interview,History');
  await page.locator('#pf-score').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Inspect evidence and uncertainty' }).first().click(); await page.waitForTimeout(300);
  const link = page.locator('.rb-inspect a[href*="/video?t="]').first();
  step(v, 'inspector: timestamp links to /r/people/p_tobi/video?t=…', (await link.count()) > 0 && /#\/r\/people\/p_tobi\/video\?t=12/.test(await link.getAttribute('href')));
  step(v, 'inspector: freshness and reliability', /Checked at the source|Not checked yet|Candidate’s own video/.test(await page.locator('.rb-inspect').first().innerText()) && /Evidence/.test(await page.locator('#pf-score').innerText()));
  await overflow('/r/people/p_tobi'); await shot('profile-scorecard');
  // Override in the inspector needs a reason.
  await page.locator('.rb-inspect .rb-seg button', { hasText: '2' }).first().click();
  await page.locator('.rb-inspect').getByRole('button', { name: 'Save the change' }).click(); await page.waitForTimeout(250);
  step(v, 'override without a reason is refused inline', /Add a reason/.test(await page.locator('.rb-inspect').first().innerText()) && (await world()).areas.rubrics.ratings.find((r) => r.id === 'rt_media_pay').rating === 3);
  await page.getByRole('button', { name: 'Close the inspector' }).first().click();

  // Q override path: missing reason → Q asks → reason recorded.
  await ask('lower postgres to 2');
  step(v, 'Q asks for the reason when it is missing', /What’s the reason/.test(await lastQ()) && (await world()).areas.rubrics.ratings.find((r) => r.id === 'rt_media_pg').rating === 3);
  await ask('the tuning was on synthetic data');
  w = await world();
  const pg = w.areas.rubrics.ratings.find((r) => r.id === 'rt_media_pg');
  step(v, 'override saved with reason, original kept, audited', pg.rating === 2 && pg.override?.from === 3 && /synthetic data/.test(pg.override?.reason) && pg.reviewed && w.events.some((e) => e.type === 'rating.overridden' && /synthetic/.test(e.text)));
  step(v, 'Q reports the new index with coverage', /at \d+% coverage now/.test(await lastQ()));
  await ask('show tobis scorecard');
  step(v, '“show Tobi’s scorecard” answers with index and coverage', /Tobi on rubric v1: \d+ at \d+% coverage/.test(await lastQ()));

  // ---- J11 step 9: add mentoring → change notice → keep v1 (desktop) / notify and reassess (phone) ----
  await go('/r/roles/m_backend/rubric');
  await ask('add mentoring to the rubric', 900);
  w = await world();
  step(v, 'v1 frozen: mentoring goes into draft v2', rub(w).versions.length === 2 && rub(w).versions[1].state === 'Q_PROPOSED' && rub(w).versions[1].criteria.some((c) => c.id === 'c_mentoring') && !rub(w).versions[0].criteria.some((c) => c.id === 'c_mentoring'));
  await ask('approve it', 900);
  w = await world();
  const note = await lastQ();
  step(v, 'change notice: Tobi and Ifeoma were assessed on v1', /Tobi/.test(note) && /Ifeoma/.test(note) && /v1/.test(note) && rub(w).versions[1].state === 'Q_PROPOSED' && /affects people already rated/.test(await canvas()));
  await overflow('studio-notice'); await shot('studio-notice');
  const v1Before = JSON.stringify(w.areas.rubrics.ratings.filter((r) => r.v === 1));
  if (!phone) {
    await ask('keep v1 for this round', 900);
    w = await world();
    step(v, 'keep v1 for this round: v2 approved for next round, v1 still in force', rub(w).versions[1].state === 'APPROVED' && rub(w).versions[1].changeNotice?.decision === 'KEEP_FOR_ROUND' && rub(w).versions[0].state === 'APPROVED');
    step(v, 'v1 ratings unchanged and still on v1', JSON.stringify(w.areas.rubrics.ratings.filter((r) => r.v === 1)) === v1Before && !w.areas.rubrics.ratings.some((r) => r.v === 2));
    await go('/r/people/p_tobi');
    step(v, 'scorecard still reads rubric v1 (in force this round)', /Rubric v1/.test(await canvas()));
  } else {
    await page.locator('.rb-choice', { hasText: 'Notify and reassess' }).click(); await page.waitForTimeout(600);
    w = await world();
    step(v, 'notify and reassess: v2 in force, v1 superseded', rub(w).versions[1].state === 'APPROVED' && rub(w).versions[0].state === 'SUPERSEDED');
    step(v, 'v1 ratings stay on v1; v2 carries unchanged criteria as Q proposals', JSON.stringify(w.areas.rubrics.ratings.filter((r) => r.v === 1)) === v1Before && w.areas.rubrics.ratings.filter((r) => r.v === 2).every((r) => r.source === 'Q_PROPOSED' && !r.reviewed));
    step(v, 'affected candidates notified (simulated, shared scope)', w.events.filter((e) => e.type === 'rubric.candidate_notified').length === 2);
    await go('/r/people/p_tobi');
    step(v, 'scorecard: v1 ratings still reachable beside v2', (await page.locator('#pf-score .rb-vers button').count()) === 2);
  }
  await shot('studio-after-decision');

  // ---- AD-E-14: Tobi's own view and a correction request ----
  await asActor('p_tobi', '/c/applications');
  const mine = await canvas();
  step(v, 'candidate sees own ratings with anchors and coverage', /How employers rated your evidence/.test(mine) && /Kora Pay · Senior Backend Engineer/.test(mine) && /coverage/.test(mine) && /synthetic data/.test(mine));
  await page.getByRole('button', { name: 'Ask for a correction' }).last().click();
  await page.locator('textarea[id^="fix-"]').fill('The tuning exercise used a copy of production data, not synthetic data.');
  await page.getByRole('button', { name: 'Send to Kora Pay' }).click(); await page.waitForTimeout(400);
  w = await world();
  step(v, 'correction request stored (dispute OPEN, shared scope event)', w.areas.rubrics.ratings.some((r) => r.dispute?.state === 'OPEN') && w.events.some((e) => e.type === 'rating.disputed' && e.scope === 'SHARED:org_kora:p_tobi'));
  await overflow('/c/applications'); await shot('candidate-ratings');
  await asActor('u_ada', '/r/home');
  await openQ();
  let found = false;
  for (let i = 0; i < 6 && !found; i++) { await page.locator('.ds-suggest-more[aria-expanded="false"]').first().click({ timeout: 500 }).catch(() => {}); await page.waitForTimeout(300); const t = await page.locator('.ds-suggest').allInnerTexts(); found = t.some((x) => /asked for a correction/.test(x)); if (!found && t.length) await page.locator('.ds-suggest').first().locator('.ds-chip', { hasText: 'Later' }).click().catch(() => {}); }
  step(v, 'proactive: Ada told about the correction request', found);
  if (phone) await closeQ();

  // ---- Tenant isolation ----
  await asActor('u_dele', '/r/roles/m_backend/rubric');
  step(v, 'tenant: an agency can’t open Kora’s rubric', /Not available to you/.test(await canvas()) && !/Payments and reconciliation/.test(await canvas()));

  // ---- Phone specifics ----
  if (phone) {
    await asActor('u_ada', '/r/roles/m_backend/rubric');
    const sw = page.locator('.rb-side button', { hasText: 'Q proposed' });
    step(v, 'phone: “Q proposed / Your version” switch', (await sw.count()) === 1);
    await sw.click(); await page.waitForTimeout(250);
    step(v, 'phone: switch shows Q’s column only', (await page.locator('.rb-col[data-side]').count()) === 0 && (await page.locator('.rb-col').count()) > 0);
    await overflow('studio-phone-q'); await shot('studio-phone-q');
    await go('/r/people/p_tobi');
    const pos = await page.evaluate(() => getComputedStyle(document.querySelector('.ds-pageindex')).position);
    step(v, 'phone: page index is sticky', pos === 'sticky');
  }
  step(v, 'no sideways scroll on any checked page', !errors.some((e) => e.startsWith(`${v}/`) && /overflow/.test(e)));
  await ctx.close();
}
console.log('ERRORS', JSON.stringify(errors, null, 1));
const fails = results.filter((r) => !r.ok).length;
console.log(`RUBRIC: ${results.length - fails}/${results.length} steps passed`);
await b.close();
process.exit(fails ? 1 : 0);
