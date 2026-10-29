// R2 · Ada, a non-technical recruiter hiring a Senior Backend Engineer at Kora Pay.
// Driven mostly by typing to the global Q in imperfect language. Curveballs: changes criteria mid-comparison,
// challenges Q's ranking and corrects it, GitHub outage + retry, impressive CV with weak evidence, a disputed
// assessment, consent withdrawn, and the founder's cross-page sequence (profile → back → draft invitation).
// Usage: node R2.mjs [port] [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const PORT = process.argv[2] || '5182';
const ONLY = (process.argv[3] || 'd,m').split(',');
const OUT = fileURLToPath(new URL('../../../captures/cx/R2/', import.meta.url)); mkdirSync(OUT, { recursive: true });
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
  // Another tab (the candidate's) changes the shared store: apply it before the app boots, as the store's own sync would.
  await page.addInitScript(() => { let patch = null; try { patch = sessionStorage.getItem('r2.patch'); } catch { return; } if (!patch) return; sessionStorage.removeItem('r2.patch'); const w = JSON.parse(localStorage.getItem('tq.world.v4')); new Function('w', patch)(w); localStorage.setItem('tq.world.v4', JSON.stringify(w)); });
  const otherTab = async (code, to) => { await page.evaluate(([c, t]) => { sessionStorage.setItem('r2.patch', c); location.hash = t; location.reload(); }, [code, to]); await page.waitForTimeout(1500); };
  let n = 0;
  const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}/${v}-${String(++n).padStart(2, '0')}-${name}.png` }); };
  const overflow = async (x) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) errors.push(`${v}/${x}: horizontal overflow ${o}px`); };
  const world = () => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
  const lastQ = async () => { const w = await world(); const t = w.q.threads[w.session.actor] ?? []; return [...t].reverse().find((m) => m.who !== 'me')?.text ?? ''; };
  const route = () => page.evaluate(() => location.hash.replace(/^#/, ''));
  const closeQ = async () => { const x = page.getByRole('button', { name: 'Close Q' }); if (await x.count()) await x.click(); await page.waitForTimeout(250); };
  const openQ = async () => { if (!phone) return; const bar = page.locator('.ds-askbar button'); if (await bar.count()) await bar.click(); await page.waitForTimeout(250); };
  const ask = async (text, wait = 700) => {
    await openQ();
    await page.locator('#q-ask').fill(text); await page.locator('#q-ask').press('Enter');
    await page.waitForTimeout(wait);
    if (phone) await closeQ();
  };
  const chip = async (re) => { await openQ(); const c = page.locator('.ds-chip').filter({ hasText: re }).last(); await c.click(); await page.waitForTimeout(500); if (phone) await closeQ(); };
  const go = async (r) => { await page.goto(`${BASE}#${r}`); await page.waitForTimeout(800); await overflow(r); };
  const pressed = (name) => page.locator('.ds-canvas button.ds-filter', { hasText: name }).first().getAttribute('aria-pressed');
  const canvasText = () => page.locator('.ds-canvas').first().innerText();

  // Fresh world as Ada.
  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(900);
  const actor = (await world())?.session?.actor; step(v, 'starts as Ada', actor === 'u_ada' || actor === undefined);

  // 1. Role research in plain words.
  await ask('wat does a senior backend enginer actually do');
  step(v, 'role research in plain words', /In plain words/.test(await lastQ()));

  // 2. Compare by chosen criteria (typed).
  await ask('compare tobi and zara on payments and Go');
  await page.waitForTimeout(400);
  step(v, 'compare by criteria navigates', (await route()) === '/r/compare');
  step(v, 'only Tobi and Zara, payments and Go', (await pressed('Tobi Adeyemi')) === 'true' && (await pressed('Ifeoma Obi')) === 'false' && (await pressed('Payments systems')) === 'true' && (await pressed('Postgres at scale')) === 'false');
  await overflow('/r/compare'); await shot('compare-payments-go');

  // 3. [mind] Changes criteria mid-comparison.
  await ask('actualy add postgres too');
  step(v, '[mind] criteria changed mid-comparison', (await pressed('Postgres at scale')) === 'true' && /Postgres/.test(await lastQ()));

  // 4. [mind] Ada challenges Q; Q shows its reasoning, then accepts a correction.
  await ask('why do you say tobi is stronger?? thats not fair');
  const why = await lastQ();
  step(v, '[mind] challenge: Q shows reasoning and evidence', /exactly what I used/.test(why) && /1\.5×/.test(why));
  await shot('challenge');
  await ask('tobis go library doesnt count as production go');
  step(v, '[mind] Q accepts the correction', /Accepted/.test(await lastQ()) && /your correction/.test(await canvasText()));
  await ask('weigh them equaly');
  step(v, 'weighting changed by typing', (await pressed('Weigh must-haves equally')) === 'true');
  await shot('corrected-equal');

  // 5. Founder's sequence: profile → go back → draft invitation (hire-c's skill).
  await ask('Show me everything about Tobi', 900);
  step(v, 'profile opens from Q', (await route()) === '/r/people/p_tobi');
  const prof = await canvasText();
  step(v, 'profile: only shared evidence with provenance', /Shared with Kora Pay/.test(prof) && /source/i.test(prof) && /Verified/.test(prof) && !/BSc Computer Science/.test(prof));
  step(v, 'profile: confidential exists, contents hidden', /contents are confidential/.test(prof) && !/fraudulent payouts/.test(prof));
  step(v, 'profile: pipeline position', /Where Tobi is/.test(prof) && /Shortlisted/.test(prof));
  step(v, '[info] GitHub outage shown honestly with cache date', /GitHub isn’t responding/.test(prof) && /cached on/.test(prof));
  step(v, 'safe viewer: sandboxed, read-only', (await page.locator('iframe.hire-b-iframe').count()) === 0 ? (await page.locator('pre.hire-b-code').count()) > 0 : (await page.locator('iframe.hire-b-iframe').getAttribute('sandbox')) === '');
  await shot('profile-tobi');
  await page.locator('.hire-b-viewer').scrollIntoViewIfNeeded(); await shot('profile-viewer-outage');
  // [info] retry: the first retry honestly fails, the second recovers.
  await ask('github seems down, try again pls', 1700);
  step(v, '[info] retry #1 still down, said honestly', /still isn’t responding/.test(await lastQ()));
  await page.getByRole('button', { name: 'Retry', exact: true }).click(); await page.waitForTimeout(1700);
  step(v, '[info] retry #2 recovers', /GitHub answered/.test(await lastQ()));
  // Site preview + external link domain.
  const site = page.locator('.ds-canvas button.ds-filter', { hasText: 'Settlement status page' });
  if (await site.count()) { await site.click(); await page.waitForTimeout(300); }
  step(v, 'page preview sandboxed (scripts off)', (await page.locator('iframe.hire-b-iframe').getAttribute('sandbox')) === '');
  await page.getByRole('button', { name: 'Open…' }).first().click();
  step(v, 'external link shows domain before opening', /would leave Talent Q and open/.test(await canvasText()));
  await page.locator('.hire-b-viewer').scrollIntoViewIfNeeded(); await shot('profile-viewer-site');
  await ask('go back to the comparison', 900);
  step(v, 'go back restores the comparison exactly', (await route()) === '/r/compare' && (await pressed('Postgres at scale')) === 'true' && (await pressed('Ifeoma Obi')) === 'false' && (await pressed('Weigh must-haves equally')) === 'true');
  await ask('draft an interview invitation for him', 900);
  const inv = await lastQ();
  step(v, 'draft invitation handled (hire-c skill) without breaking R2', !/compar/i.test(inv.slice(0, 30)) && inv.length > 0, inv.slice(0, 90));
  await shot('after-invitation');

  // 6. [info] Impressive CV, weak evidence.
  await go('/r/compare');
  await ask('add kunle');
  await ask('kunle has an amazing cv tho, why is he ranked low');
  const cv = await lastQ();
  step(v, '[info] CV vs evidence: unknown separated from weak', /Unknown/.test(cv) && /Weak/.test(cv) && /What would prove it/.test(cv));

  // 7. [mind] Evidence from the last year only.
  await ask('compare on evidence from the last year only');
  step(v, '[mind] last-year filter on, notes rewritten', (await pressed('Evidence from the last year only')) === 'true' && /last year only/.test(await canvasText()));
  await shot('compare-last-year');

  // 8. [info] A candidate disputes an assessment.
  await go('/r/interviews');
  await page.getByRole('button', { name: /Simulate: Kunle disputes/ }).click(); await page.waitForTimeout(600);
  if (phone) await openQ();
  const card = await page.locator('.ds-suggest').filter({ hasText: 'disputed' }).count();
  if (phone) await closeQ();
  step(v, '[info] proactive: dispute raised from real state', card > 0);
  await ask('whats going on with kunles dispute');
  step(v, '[info] Q explains the dispute', /under review/.test(await lastQ()));
  await ask("open a review for kunle's assessment");
  step(v, 'review needs approval', /Open a review request for Kunle/.test(await lastQ()));
  await chip(/Open the review/);
  await go('/r/compare');
  await ask('compare kunle and tobi on go');
  const cmpTxt = await canvasText();
  step(v, '[info] disputed result excluded from comparison', /under review/.test(cmpTxt));
  await shot('compare-dispute');

  // 9. Assessment selection and questions from gaps.
  await ask('how should i test postgres for zara');
  step(v, 'assessment recommended with reasons', /query-tuning/.test(await lastQ()) && /Why:/.test(await lastQ()));
  await ask('what should i ask ife in the intervew');
  step(v, 'interview questions from evidence gaps', /Questions for Ifeoma/.test(await lastQ()));

  // 10. Live interview copilot, adaptive follow-ups, feedback.
  await ask('start the interview with ife', 900);
  step(v, 'copilot started', /\/r\/interviews\/i_hb_ife/.test(await route()) && /Live rubric/.test(await canvasText()));
  await ask('note: she helped with incidents, kind of handled the on call stuff');
  step(v, 'vague answer flagged with follow-ups', /sounds general/.test(await lastQ()) && /That answer sounds general/.test(await canvasText()));
  await shot('copilot-vague');
  await ask('note: she led the march outage, rolled back after 12 minutes and wrote the postmortem herself');
  step(v, 'specific answer accepted', /That’s specific/.test(await lastQ()));
  await ask('mark on-call strong');
  await ask('mark payments some');
  await ask('draft my feedback', 900);
  const fb = await page.locator('#iv-fbt').inputValue().catch(() => '');
  step(v, 'Q drafts feedback from notes', /march outage/.test(fb));
  await page.locator('#iv-fbt').fill(fb + '\nAda: would like Musa to probe Postgres in round two.'); await page.locator('#iv-fbt').blur();
  await shot('feedback-draft');
  await ask('submit my feedback');
  step(v, 'submit needs approval', /Submit your feedback on Ifeoma/.test(await lastQ()));
  await chip(/^Submit feedback$/);
  const w2 = await world();
  const iv = w2.interviews.find((i) => i.id === 'i_hb_ife');
  const pipe = w2.pipeline.find((p) => p.personId === 'p_ife' && p.mandateId === 'm_backend');
  step(v, 'feedback stored in interviews (human edit kept)', iv.feedback.some((f) => f.by === 'u_ada' && /round two/.test(f.notes)));
  step(v, 'pipeline reflects interview + feedback', pipe.stage === 'INTERVIEW' && /Feedback from Ada/.test(pipe.note ?? ''));
  await shot('feedback-submitted');

  // 11. Proactive: Tobi shares a newly verified certificate since Ada last looked (other tab, same store).
  await otherTab("const e = w.evidence.find((x) => x.evidenceId === 'e_tobi_aws'); e.visibility = 'SHARED_WITH'; e.sharedWith = ['org_kora']; e.verification = 'VERIFIED'; e.verified = true;", '#/r/home');
  if (phone) await openQ();
  const cert = await page.locator('.ds-suggest').filter({ hasText: 'new verified certificate' }).count();
  if (phone) { await shot('proactive-cert'); await closeQ(); } else await shot('proactive-cert');
  step(v, 'proactive: new verified certificate since last look', cert > 0);

  // 12. [info] Consent withdrawn: Zara stops sharing with Kora.
  await otherTab("w.consents.p_zara.withdrawnFrom.push('org_kora');", '#/r/people/p_zara');
  step(v, '[info] withdrawn consent: permission state with reason', /stopped sharing/.test(await canvasText()));
  await shot('zara-withdrawn');
  await go('/r/interviews'); await shot('interviews-list');
  await ctx.close();
}
console.log('ERRORS', JSON.stringify(errors, null, 1));
const fails = results.filter((r) => !r.ok).length;
console.log(`R2: ${results.length - fails}/${results.length} steps passed`);
await b.close();
