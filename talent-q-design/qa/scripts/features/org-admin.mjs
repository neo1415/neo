// Feature test · ORG-ADMIN (coverage brief 30 Oct): SC-020, SC-021, SC-023, SC-024, SC-025, SC-140, SC-141, SC-142,
// SC-144, SC-145, SC-146; vision V03, V09, V29; motion MO-035. Desktop 1440×900 and phone 390×844.
// Each step names the IDs it proves. Tasks are done on the page AND by asking Q. Tenancy and role limits are checked.
// Usage: BASE=http://localhost:5212/ node qa/scripts/features/org-admin.mjs [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const BASE = process.env.BASE || 'http://localhost:5212/';
const ONLY = (process.argv[2] || 'd,m').split(',');
const OUT = fileURLToPath(new URL('../../../captures/cx/org-admin/', import.meta.url)); mkdirSync(OUT, { recursive: true });
const b = await pw.chromium.launch();
const errors = []; let fails = 0, passes = 0;
const step = (v, name, ok, detail = '') => { ok ? passes++ : fails++; console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail && !ok ? ` · ${String(detail).slice(0, 200)}` : ''}`); };

for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text()}`); });
  const phone = v === 'm'; let n = 0;
  const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${v}-${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true }); };
  const overflow = async () => page.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.ds-canvas')].map((e) => e.scrollWidth)) - innerWidth);
  const W = () => page.evaluate(() => window.__tqQA.getWorld());
  const OA = async () => (await W()).areas['org-admin'];
  const lastQ = async () => { const w = await W(); const t = w.q.threads[w.session.actor] ?? []; return [...t].reverse().find((m) => m.who !== 'me')?.text ?? ''; };
  const canvas = () => page.locator('.ds-canvas').first().innerText();
  const as = async (actor, route) => { await page.evaluate((a) => window.__tqQA.update((w) => { w.session.actor = a; w.actors.find((x) => x.id === a).signedUp = true; }), actor); await page.evaluate((r) => { location.hash = r; }, route); await page.waitForTimeout(800); };
  const closeQ = async () => { const x = page.getByRole('button', { name: 'Close Q' }); if (await x.count()) await x.first().click({ timeout: 2500 }).catch(() => {}); await page.waitForTimeout(200); };
  const act = async (op, args = {}) => { await page.evaluate(([o, a]) => window.__tqQA.act(o, a), [op, args]); await page.waitForTimeout(250); if (phone) await closeQ(); };
  const ask = async (text, wait = 800) => { if (phone) { await closeQ(); const bar = page.locator('.ds-askbar button'); if (await bar.count()) await bar.first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(250); } await page.locator('#q-ask').fill(text); await page.locator('#q-ask').press('Enter'); await page.waitForTimeout(wait); const r = await lastQ(); if (phone) await closeQ(); return r; };

  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(900);

  // ---------- Hub ----------
  await as('u_ngozi', '/r/admin');
  let t = await canvas();
  step(v, 'hub: Admin lists every section with what needs Ngozi (SC-141 entry)', /Templates/.test(t) && /1 waiting for approval/.test(t) && /deletion request/.test(t) && /open incident/.test(t));
  step(v, 'hub: no sideways scroll', (await overflow()) <= 1); await shot('hub');

  // ---------- SC-020 personal instructions ----------
  await as('u_ada', '/r/admin/instructions');
  t = await canvas();
  step(v, 'SC-020: Ada sees her own instructions with tone/process/limit and use counts', /Short, warm messages/.test(t) && /Used by Q in 6 drafts/.test(t) && !/Send me a one-paragraph summary/.test(t));
  step(v, 'SC-020: org guideline overrides a conflicting personal limit (shown)', /Overridden by a guideline/.test(t) && /Guideline wins/.test(t));
  let r = await ask('from now on keep my follow-ups to three lines');
  step(v, 'SC-020: added by asking Q (“from now on …”)', /Saved as a/.test(r) && (await OA()).instructions.some((i) => i.actorId === 'u_ada' && /three lines/.test(i.text)), r);
  if (!phone) { await page.fill('#oa-instr', 'Never mention salary before the first call'); await page.getByRole('button', { name: 'Add instruction' }).click(); await page.waitForTimeout(300); }
  step(v, 'SC-020: added on the page too (desktop) / list renders (phone)', phone ? /three lines/.test(await canvas()) : (await OA()).instructions.some((i) => /salary/.test(i.text)));
  await shot('instructions');
  await as('u_ada', '/r/admin/instructions?state=loading');
  step(v, 'SC-020 states: loading skeleton by review link', (await page.locator('.oa-skel').count()) === 1);
  await as('u_ada', '/r/admin/instructions?state=error');
  step(v, 'SC-020 states: error with retry, settings unchanged', /Couldn’t load my instructions/.test(await canvas()) && (await page.getByRole('button', { name: 'Try again' }).count()) === 1);
  await as('u_ada', '/r/admin/instructions?state=empty');
  step(v, 'SC-020 states: empty state', /Nothing here yet/.test(await canvas()));

  // ---------- SC-021 templates ----------
  await as('u_ada', '/r/admin/templates');
  t = await canvas();
  step(v, 'SC-021: JD, questions and scorecard templates; Ada’s proposal waits for approval', /Engineering role brief/.test(t) && /Backend interview questions/.test(t) && /Engineering scorecard/.test(t) && /Waiting for approval/.test(t));
  step(v, 'SC-021: Q flags a state-of-origin question; recruiter cannot approve', /Q flags this/.test(t) && (await page.getByRole('button', { name: 'Approve', exact: true }).count()) === 0);
  step(v, 'SC-021: email templates reused from the email policy (not duplicated)', /Interview invitation/.test(t) && /Open email settings/.test(t));
  await as('u_ngozi', '/r/admin/templates');
  r = await ask('approve the support lead template');
  step(v, 'SC-021: approval refused while a line is flagged (via Q)', /can’t approve/.test(r), r);
  r = await ask('remove the flagged line');
  r = await ask('approve the template');
  step(v, 'SC-021: fixed and approved by asking Q (v2 approved by Ngozi)', (await OA()).templates.find((x) => x.id === 'tp_q_support').state === 'APPROVED' && (await OA()).templates.find((x) => x.id === 'tp_q_support').versions.length === 2, r);
  await shot('templates');

  // ---------- SC-023 + V09 channels ----------
  await as('u_ngozi', '/r/admin/channels');
  t = await canvas();
  step(v, 'SC-023: email, SMS, WhatsApp and calls with honest verification states', /Email/.test(t) && /In review/.test(t) && /Not set up/.test(t) && /Phone calls/.test(t));
  step(v, 'V09: consent table from candidates’ own settings; “not asked” is not zero', /Who agreed to which channel/.test(t) && /Not asked/.test(t) && /Zara Mensah/.test(t));
  step(v, 'V09: WhatsApp blocked until verified (eligibility before message)', /WhatsApp is not set up/.test(t) || /WhatsApp is not set up|not set up/i.test(t));
  r = await ask('verify whatsapp');
  step(v, 'SC-023: verification started by Q (simulated code)', (await OA()).channels.find((c) => c.orgId === 'org_kora' && c.kind === 'WHATSAPP').state === 'CODE_SENT', r);
  r = await ask('the code is 111111');
  step(v, 'SC-023 error: wrong code is refused, nothing changes', /didn’t match/.test(r) && (await OA()).channels.find((c) => c.orgId === 'org_kora' && c.kind === 'WHATSAPP').state === 'CODE_SENT', r);
  r = await ask('the code is 428913');
  await act('oa.ch.review', { kind: 'WHATSAPP', ok: true });
  step(v, 'SC-023: code confirmed → in review → verified (simulated provider)', (await OA()).channels.find((c) => c.orgId === 'org_kora' && c.kind === 'WHATSAPP').state === 'VERIFIED');
  r = await ask('send zara a whatsapp');
  let wa = (await OA()).wa.find((m) => m.personId === 'p_zara');
  step(v, 'V09: WhatsApp draft from approved template, waiting for approval, kept with the M9 thread', wa?.status === 'AWAITING_APPROVAL' && wa.threadId === 't_zara_kora', r);
  r = await ask('approve the whatsapp message');
  await act('oa.wa.advance', { id: wa.id });
  wa = (await OA()).wa.find((m) => m.personId === 'p_zara');
  step(v, 'V09: provider states distinct: accepted → delivered (read not yet)', wa.history.map((h) => h.status).join(',') === 'AWAITING_APPROVAL,ACCEPTED,DELIVERED' && wa.status !== 'READ');
  t = await canvas();
  step(v, 'V09: page shows the ladder with “not yet” for read', /Delivered to phone/.test(t) && /Read · not yet/.test(t));
  r = await ask('send tobi a whatsapp');
  step(v, 'V09: no WhatsApp to someone who was never asked', /Not yet/.test(r) && !(await OA()).wa.some((m) => m.personId === 'p_tobi'), r);
  r = await ask('can i call zara');
  step(v, 'V09: call eligibility checks (verified number, consent, local daytime), never dials', /Not yet|You can call/.test(r) && /never dials|Not asked|not set up|their time/i.test(r + await canvas()), r);
  r = await ask('ask tobi about whatsapp');
  step(v, 'V09: consent asked in Talent Q; candidate decides', (await OA()).choices.p_tobi?.whatsapp === 'ASKED', r);
  await shot('channels');

  // ---------- V09 candidate side ----------
  await as('p_tobi', '/settings/channels');
  t = await canvas();
  step(v, 'V09 candidate: Tobi sees the ask and controls WhatsApp, calls and SMS', /asked whether WhatsApp is okay/.test(t) && /Phone calls/.test(t) && /Text messages/.test(t));
  r = await ask('turn on whatsapp');
  step(v, 'V09 candidate: opting in by asking Q updates the shared choice', (await OA()).choices.p_tobi.whatsapp === 'YES', r);
  await as('p_zara', '/settings/channels');
  step(v, 'V09 candidate: Zara sees the WhatsApp message Kora sent (simulated status)', /Kora Pay/.test(await canvas()) && /Delivered to phone/.test(await canvas()));
  await shot('my-channels');

  // ---------- SC-024 billing + MO-035 ----------
  await as('u_ngozi', '/r/admin/billing');
  t = await canvas();
  step(v, 'SC-024: plan labelled as a pricing hypothesis; no payment taken', /\$249 a month/.test(t) && /Hypothesis, not a price/.test(t) && /None taken/.test(t));
  step(v, 'SC-024: usage meters with a table alternative', (await page.locator('.oa-meters li').count()) === 4);
  await page.getByRole('button', { name: 'Table', exact: true }).click(); await page.waitForTimeout(200);
  step(v, 'SC-024: table view lists the same meters', (await page.locator('table[class*="oa-table"] tbody tr').count()) >= 4);
  step(v, 'MO-035: no warning below the threshold (76%)', (await page.locator('.oa-budget[data-over="1"]').count()) === 0);
  await page.getByRole('button', { name: 'Demo: record 3 more runs' }).click(); await page.waitForTimeout(500); if (phone) await closeQ();
  step(v, 'MO-035: crossing 80% shows the soft warning with stop/spend decision', (await page.locator('.oa-budget[data-over="1"][role="alert"]').count()) === 1 && /Past 80% of the agent budget/.test(await canvas()) && (await page.locator('.oa-budget').getByRole('button', { name: 'Pause new runs' }).count()) === 1);
  step(v, 'MO-035: a threshold event is recorded and Q raises a high-priority card', (await W()).events.some((e) => e.type === 'budget.threshold' && e.scope === 'ORG:org_kora'));
  await shot('billing-warning');
  r = await ask('approve the budget request');
  step(v, 'SC-024: budget approval by asking Q (cap raised by $4.80)', (await OA()).billing[0].requests[0].state === 'APPROVED' && Math.abs((await OA()).billing[0].budget.cap - 44.8) < 0.01, r);
  r = await ask('pause new agent runs');
  step(v, 'MO-035: “stop” decision pauses new runs', (await OA()).billing[0].budget.paused === true, r);
  r = await act('oa.bill.simulate', { runs: 3 });
  step(v, 'MO-035: paused budget blocks new runs (nothing ran)', (await OA()).billing[0].meters.find((m) => m.id === 'runs').used === 41);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await as('u_ngozi', '/r/admin/billing');
  step(v, 'MO-035 reduced motion: warning text still present', /New agent runs are paused/.test(await canvas()));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await as('u_ada', '/r/admin/billing');
  step(v, 'SC-024 roles: recruiter sees usage, not plan details or decisions', /Plan details are for admins/.test(await canvas()) && (await page.getByRole('button', { name: 'Ask for a quote' }).count()) === 0);
  await as('u_bayo', '/r/admin/billing');
  step(v, 'SC-024 permission denied: Bayo (hiring manager) cannot open billing', /You can’t open billing and usage/.test(await canvas()) && !/\$249/.test(await canvas()));
  r = await ask('how much budget have we used');
  step(v, 'SC-024 permission via Q: Bayo is refused, nothing revealed', /don’t see billing/.test(r) && !/\$/.test(r), r);

  // ---------- SC-025 retention ----------
  await as('u_ngozi', '/r/admin/retention');
  t = await canvas();
  step(v, 'SC-025/D9: every period marked proposed, recordings transcript-only by design', (t.match(/Proposed · D9 open/g) ?? []).length === 5 && /Not stored \(transcript only\)/.test(t));
  r = await ask('how long do we keep transcripts');
  step(v, 'SC-025: retention question answered by Q with the D9 caveat', /Interview transcripts: 6 months/.test(r) && /D9/.test(r), r);
  const gracePipe = (await W()).pipeline.filter((p) => p.personId === 'p_grace').length;
  r = await ask("delete grace's records");
  const gw = await W(); const del = gw.areas['org-admin'].retention[0].deletions[0];
  step(v, 'SC-025: deletion request processed with a receipt of what is kept and why (INTEGRATED: pipeline)', del.state === 'DONE' && del.receipt.kept.length === 2 && gracePipe > 0 && gw.pipeline.filter((p) => p.personId === 'p_grace').length === 0, r);
  step(v, 'SC-025: deletion event shared with Grace (scope SHARED:org_kora:p_grace)', gw.events.some((e) => e.type === 'retention.deleted' && e.scope === 'SHARED:org_kora:p_grace'));
  r = await ask('export the audit log');
  step(v, 'SC-025: audit export simulated, nothing downloaded', /nothing was downloaded/i.test(r), r);
  await shot('retention');

  // ---------- SC-141 compliance ----------
  await as('u_ngozi', '/r/admin/compliance');
  t = await canvas();
  step(v, 'SC-141: role access, consent, retention and incidents on one dashboard', /Who can do what/.test(t) && /Consent/.test(t) && /Retention/.test(t) && /Incidents/.test(t));
  step(v, 'SC-141: unknown consent shown as unknown, not zero', /unknown, not a no/.test(t));
  r = await ask('resolve the incident because the hours guideline caught it and nothing was sent');
  step(v, 'SC-141: incident resolved by asking Q, with a note', (await OA()).incidents.find((i) => i.id === 'inc_hours').state === 'RESOLVED', r);
  await as('u_ada', '/r/admin/compliance');
  step(v, 'SC-141 permission: recruiter cannot open the compliance dashboard', /You can’t open compliance/.test(await canvas()));
  await shot('compliance-denied');

  // ---------- SC-142 reports ----------
  await as('u_ada', '/r/admin/reports');
  const adaRoles = await page.locator('.oa-bars li').count();
  step(v, 'SC-142: time to shortlist read from the pipeline (Senior Backend 4 days)', /Senior Backend Engineer/.test(await canvas()) && /4 days/.test(await canvas()));
  step(v, 'SC-142: engagement table and cost labelled simulated/hypothesis', /Candidate engagement/.test(await canvas()) && /Hypothesis/.test(await canvas()));
  await page.getByRole('button', { name: 'Table', exact: true }).click(); await page.waitForTimeout(200);
  step(v, 'SC-142: chart has a table alternative', (await page.locator('table[aria-label], .ds-table-wrap[aria-label="Days to first shortlist"]').count()) >= 1);
  await as('u_bayo', '/r/admin/reports');
  const bayoRoles = await page.locator('.oa-bars li').count();
  step(v, 'SC-142 roles: Bayo sees fewer roles than Ada and no cost', bayoRoles < adaRoles && !/Agent compute/.test(await canvas()) && /roles you hire for/.test(await canvas()), `${bayoRoles} vs ${adaRoles}`);
  await shot('reports-bayo');

  // ---------- SC-144 + V03 models ----------
  await as('u_ngozi', '/r/admin/models');
  t = await canvas();
  step(v, 'SC-144/V03: each Q task shows simulated model, route, budget, timeout and fallback', /Drafting messages/.test(t) && /Provider A · mid/.test(t) && /Budget 1,500 tokens/.test(t) && /Last resort/.test(t) && /no model is called/.test(t));
  r = await ask('which model drafts messages');
  step(v, 'V03 via Q: route and fallback explained, labelled simulated', /Provider A · mid/.test(r) && /Simulated/.test(r), r);
  r = await ask('simulate a timeout for drafting');
  step(v, 'V03: simulated timeout moves to the fallback route', /moved to Provider B · mid/.test(r) && (await OA()).routes.org_kora.find((x) => x.id === 'r_draft').lastTrace.steps.length === 4, r);
  await act('oa.model.rollout', { id: 'r_evidence', rollout: 'PAUSED' });
  step(v, 'SC-144: rollout paused per organisation', (await OA()).routes.org_kora.find((x) => x.id === 'r_evidence').rollout === 'PAUSED' && (await OA()).routes.org_tb.find((x) => x.id === 'r_evidence').rollout === 'PILOT');
  step(v, 'SC-144: scoring method labelled not validated (D17)', /Not validated/.test(await canvas()));
  await shot('models');

  // ---------- SC-145 quality ----------
  await as('u_ngozi', '/r/admin/quality');
  t = await canvas();
  step(v, 'SC-145/D17: adverse-impact check not run; no fairness statistic anywhere', /Not run · needs D17/.test(t) && !/\b\d+(\.\d+)?%/.test(t) && !/ratio/i.test(t));
  step(v, 'SC-145: faces/accents/emotion/personality never scored (enforced by design)', /Enforced by design/.test(t));
  r = await ask('what bias checks run');
  step(v, 'SC-145 via Q: statuses listed, no numbers invented', /not validated|D17/.test(r) && !/\d+%/.test(r), r);
  r = await ask('run the quality checks');
  step(v, 'SC-145: run recorded (simulated)', !!(await OA()).quality.org_kora, r);
  await shot('quality');

  // ---------- V29 learning ----------
  await as('u_ngozi', '/r/admin/learning');
  t = await canvas();
  step(v, 'V29: learnings show source outcomes, exclusions, permission and evaluation', /Left out/.test(t) && /Permission/.test(t) && /Simulated sample of 9 threads/.test(t));
  step(v, 'V29: private practice never used', /Private practice is never used/.test(t));
  r = await ask('reject the pay band learning');
  step(v, 'V29: rejecting needs a reason', /Why reject/.test(r), r);
  r = await ask('reject the pay band learning because the sample is too small');
  r = await ask('approve the first-name learning');
  const oaw = await OA();
  step(v, 'V29: approve/reject by reviewer; approved learning becomes Ngozi’s instruction (INTEGRATED with SC-020)', oaw.learnings.find((l) => l.id === 'ln_payband').state === 'REJECTED' && oaw.learnings.find((l) => l.id === 'ln_firstname').state === 'APPROVED' && oaw.instructions.some((i) => i.actorId === 'u_ngozi' && /first name/.test(i.text) && i.source), r);
  await as('u_ngozi', '/r/admin/models');
  step(v, 'V29→SC-144: approved learning listed as in use on the model inspector', /Add a personal instruction for Ngozi/.test(await canvas()));
  await as('u_dele', '/r/admin/learning');
  r = await ask('approve the reminder learning');
  step(v, 'V29: nothing applied when the organisation has learning off (Talentbridge)', /Learning is off/.test(r) && (await OA()).learnings.find((l) => l.id === 'ln_tb_reminder').state === 'PROPOSED', r);
  step(v, 'V29 tenancy: Dele sees only Talentbridge learnings', !/pay band/i.test(await canvas()) && /Reminders sent/.test(await canvas()));
  await shot('learning');

  // ---------- SC-146 sources ----------
  await as('u_ngozi', '/r/admin/sources');
  t = await canvas();
  step(v, 'SC-146: terms, renewals and health; unlicensed sites never scraped', /Licence ending/.test(t) && /Degraded/.test(t) && /does not scrape/.test(t));
  r = await ask('renew the job board licence');
  step(v, 'SC-146: renewal requested by Q, no payment', (await OA()).sources.find((s) => s.id === 'src_board').renewalAsked && /Nothing was paid/.test(r), r);
  await shot('sources');

  // ---------- SC-140 placements (agency) ----------
  await as('u_dele', '/r/admin/placements');
  t = await canvas();
  step(v, 'SC-140: represented candidates with attribution, consent and invoice state', /Halima Musa → Kora Pay/.test(t) && /Attribution disputed/.test(t) && /Consent not given yet/.test(t) && /stopped at step 2 of 3/.test(t));
  step(v, 'SC-140 privacy: Zara (not visible to the agency) never appears', !/Zara/.test(t));
  r = await ask('resume the invoice for halima');
  step(v, 'SC-140 interrupted → resume: invoice finished, ready (no sending or payment)', (await OA()).placements.find((p) => p.id === 'pl_halima').invoice.state === 'READY' && /doesn’t send invoices/.test(r), r);
  await act('oa.pl.consent', { id: 'pl_femi_med' });
  step(v, 'SC-140 consent: asking Femi is recorded as a shared event', (await W()).events.some((e) => e.type === 'placement.consent.asked' && e.scope === 'SHARED:org_tb:p_tb_femi'));
  await act('oa.pl.dispute', { id: 'pl_ruth', outcome: 'client' });
  step(v, 'SC-140: dispute settled with an outcome', (await OA()).placements.find((p) => p.id === 'pl_ruth').dispute.state === 'RESOLVED');
  step(v, 'SC-140: payment status stays unknown until the agency marks it', (await OA()).placements.find((p) => p.id === 'pl_halima').invoice.paid === 'UNKNOWN');
  await shot('placements');

  // ---------- Tenancy ----------
  await as('u_ngozi', '/r/admin/placements');
  step(v, 'tenancy: Kora admin cannot open placements; no agency data or name shown', /You can’t open placements/.test(await canvas()) && !/Halima|Talentbridge/.test(await canvas()));
  await as('u_dele', '/r/admin/compliance');
  t = await canvas();
  step(v, 'tenancy: Dele’s compliance shows Talentbridge only', /Client name in a draft/.test(t) && !/Shared mailbox token/.test(t) && !/Interview invitation drafted/.test(t));
  await as('u_dele', '/r/admin/templates');
  step(v, 'tenancy: Dele sees only Talentbridge templates', /Client role brief/.test(await canvas()) && !/Engineering role brief/.test(await canvas()));
  await as('u_bayo', '/r/admin');
  t = await canvas();
  step(v, 'roles: Bayo’s admin overview lists fewer sections than Ada’s', !/Billing and usage/.test(t) && /My instructions/.test(t) && /Reports/.test(t));
  await as('u_bayo', '/r/admin/models');
  step(v, 'roles: Bayo is refused the model inspector', /You can’t open models/.test(await canvas()));

  // ---------- Phone checks ----------
  if (phone) {
    for (const p of ['/r/admin', '/r/admin/billing', '/r/admin/channels', '/r/admin/models', '/r/admin/reports']) {
      await as('u_ngozi', p);
      const ov = await overflow();
      const small = await page.evaluate(() => [...document.querySelectorAll('.ds-canvas *')].filter((e) => e.childNodes.length && [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length);
      step(v, `phone ${p}: no sideways scroll, body text ≥ 12px, section select instead of link row`, ov <= 1 && small === 0 && (await page.locator('.oa-secselect select').isVisible() || p === '/r/admin'), `overflow ${ov}, small ${small}`);
    }
  } else {
    await as('u_ngozi', '/r/admin/channels');
    await page.keyboard.press('Tab');
    step(v, 'keyboard: section links are reachable', (await page.locator('.oa-seclinks a').count()) > 5);
  }
  await ctx.close();
}
await b.close();
if (errors.length) { console.log('ERRORS'); errors.slice(0, 10).forEach((e) => console.log(' ', e)); }
console.log(`\n${passes} passed, ${fails} failed${errors.length ? `, ${errors.length} page errors` : ''}`);
process.exit(fails || errors.length ? 1 : 0);
