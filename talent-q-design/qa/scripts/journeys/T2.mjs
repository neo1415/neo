// T2 · Chidi, a sales executive moving into product or business analysis. The career atlas (J7) in depth,
// driven by typing to Q, desktop 1440×900 and phone 390×844: discovery → transferable skills from his verified
// sales evidence → evidence vs gaps → plan (practice, work sample, learning, progress) → assessment →
// three weeks later → reassessment → openings → an explicit, approved share.
// Curveballs: he switches goal from PM to BA and shared progress carries over [mind]; he disagrees with a step
// and Q explains, then adjusts [mind]; he passes a quiz but has no practical evidence, and his
// recruiter-visible profile stays unchanged [info]; he returns three weeks later (simulated) [recover];
// he says "undo" after a change [recover]. Usage: node T2.mjs [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const ROOT = new URL('../../../captures/cx/T2/', import.meta.url).pathname; mkdirSync(ROOT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:5185/';
const ONLY = (process.argv[2] || 'd,m').split(',');
const b = await pw.chromium.launch();
const results = []; const errors = [];
for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text()}`); });
  const phone = v === 'm';
  const step = (name, ok, detail = '') => { results.push({ v, name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${ok || !detail ? '' : ` · ${String(detail).slice(0, 300)}`}`); };
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `${ROOT}${v}-${n}.png` }); };
  const world = () => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
  const overflow = async (n) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errors.push(`${v}/${n}: horizontal overflow ${o}px`); };
  const openQ = async () => { if (!phone) return; if (await page.locator('#q-ask').isVisible().catch(() => false)) return; await page.locator('.ds-askbar button').first().click(); await page.locator('#q-ask').waitFor(); };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) await x.click(); await page.waitForTimeout(250); };
  const ask = async (t, wait = 450) => {
    await openQ(); await page.fill('#q-ask', t); await page.press('#q-ask', 'Enter');
    for (let i = 0; i < 40; i++) { const th = (await world()).q.threads.p_chidi ?? []; const k = th.map((m) => m.text).lastIndexOf(t); if (k >= 0 && th.slice(k + 1).some((m) => m.who !== 'me')) break; await page.waitForTimeout(100); }
    await page.waitForTimeout(wait);
    const th = (await world()).q.threads.p_chidi ?? []; const k = th.map((m) => m.text).lastIndexOf(t);
    return th.slice(k + 1).filter((m) => m.who !== 'me').map((m) => m.text).join(' ¶ ');
  };
  const chip = async (re, wait = 650) => { await openQ(); await page.locator('.ds-chip').filter({ hasText: re }).last().click(); await page.waitForTimeout(wait); };
  const lastQ = async () => { const th = (await world()).q.threads.p_chidi ?? []; return th.filter((m) => m.who !== 'me').slice(-1)[0]?.text ?? ''; };
  const canvas = () => page.locator('.ds-canvas').first().innerText();
  const J = async () => (await world()).j7.p_chidi;
  // What any employer could see of Chidi (mirrors visibleEvidence in the store).
  const visible = async (org) => { const w = await world(); return w.evidence.filter((e) => e.ownerId === 'p_chidi' && e.kind !== 'PRACTICE' && !(e.revokedFrom ?? []).includes(org) && (e.visibility === 'PUBLIC_PROFILE' || (e.visibility === 'SHARED_WITH' && e.sharedWith.includes(org)))).map((e) => e.evidenceId); };

  await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  await page.evaluate(() => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = 'p_chidi'; localStorage.setItem('tq.world.v4', JSON.stringify(w)); });
  await page.goto(`${BASE}#/c/home`); await page.reload(); await page.waitForTimeout(700);
  const before = { medlink: await visible('org_medlink'), tinda: await visible('org_tinda') };

  // ---- Discovery ----
  let r = await ask("hey, ive been in sales 4 yrs and i want to get out of sales into product, like product manager. where could i go");
  step('Discovery: atlas opens from sales, goal is Associate PM', /From sales, the closest roles/.test(r) && /Associate Product Manager/.test(r) && (await page.evaluate(() => location.hash)).includes('/c/career'), r);
  await closeQ(); await overflow('atlas'); await shot('01-atlas');

  // ---- Transferable skills from verified sales evidence ----
  r = await ask('what from my sales job actualy transfers');
  step('Transferable skills come from the verified sales evidence', /verified sales work/.test(r) && /stakeholder conversations/.test(r) && /working with numbers and targets, verified/.test(r), r);
  await closeQ(); await shot('02-transferable');
  step('Skills view shows the verified source and evidence vs gaps', /Bole Distributors/.test(await canvas()) && /Transferable, partial/.test(await canvas()));

  // ---- Evidence vs gaps ----
  r = await ask('show me evidence vs gaps for product manager');
  step('Evidence vs gaps, competency by competency', /Partly shown \(transferable, not the same thing\): Stakeholder conversations/.test(r) && /Not shown yet: Product writing and User research/.test(r) && /not that you can’t do it/.test(r), r);

  // ---- Plan with practice, work samples and learning; progress ----
  r = await ask('ok make me a plan');
  step('Plan with practice, work sample and learning steps', /practice/.test(r) && /work sample/.test(r) && /learning/.test(r), r);
  r = await ask('i finished the discovery notes thing');
  step('Progress: a practice step is marked done (private)', (await J()).plan.find((s) => s.id === 'c1')?.done === true && /Marked done/.test(r), r);
  r = await ask('im halfway through the spreadsheet course btw');
  step('Progress: the learning step is half done', (await J()).plan.find((s) => s.id === 'c2')?.progress === 50, r);
  await closeQ(); await shot('03-plan-pm');

  // ---- Curveball [mind]: PM → BA; plan re-points, shared progress kept ----
  r = await ask('actually i think business analyst suits me better than PM, can we switch');
  let j = await J();
  step('Curveball [mind]: goal changes to BA, PM archived', j.goal === 'ba' && j.archived[0]?.occ === 'apm' && /Business Analyst is your goal now/.test(r), r);
  step('Shared progress carried over (discovery notes done, course 50%)', j.plan.find((s) => s.id === 'c1')?.done && j.plan.find((s) => s.id === 'c2')?.progress === 50 && j.plan.some((s) => s.id === 'c6') && !j.plan.some((s) => s.id === 'c3'), j.plan.map((s) => s.id).join(','));
  await closeQ(); await shot('04-plan-ba');
  r = await ask('undo');
  await chip(/Undo it/);
  step('Curveball [recover]: undo restores the PM goal', (await J()).goal === 'apm', await lastQ());
  r = await ask('no wait, BA is right. make business analyst my goal again');
  step('Goal back to BA, with the same carried-over progress', (await J()).goal === 'ba' && (await J()).plan.find((s) => s.id === 'c1')?.done, r);

  // ---- Curveball [mind]: disagrees with the path ----
  r = await ask('i dont agree i need the spreadsheet course, i build excel trackers every week at work');
  step('Curveball [mind]: Q shows its reasoning before changing anything', /Here’s my reasoning/.test(r) && /BA|Business analyst|Analysts build models/i.test(r) && /I believe you/.test(r), r);
  r = await ask('swap it for a work sample');
  j = await J();
  step('Q adjusts on request: course swapped for a tracker work sample', j.plan.some((s) => /tracker you built/.test(s.title)) && !j.plan.some((s) => s.id === 'c2') && /swapped/.test(r), r);
  await closeQ(); await shot('05-adjusted');

  // ---- Curveball [info]: quiz passed, no practical evidence ----
  r = await ask('quiz me on process mapping');
  step('Practice question (private)', /practice question on process mapping/.test(r), r);
  r = await ask('b, map the steps first');
  step('Correct, but practice is not proof; employers see the same as before', /not proof/.test(r) && /Medlink would see 0 items, exactly as before/.test(r), r);
  r = await ask('nice so add that to my profile so medlink can see i can do it');
  step('Curveball [info]: Q refuses to treat practice as proof', /No, and I want to be straight/.test(r) && /won’t put it on your profile/.test(r), r);
  step('Recruiter-visible profile unchanged after practice', JSON.stringify(await visible('org_medlink')) === JSON.stringify(before.medlink) && JSON.stringify(await visible('org_tinda')) === JSON.stringify(before.tinda));
  await closeQ(); await shot('06-practice-not-proof');

  // ---- Assessment (work sample) ----
  r = await ask('ok i did the process map of our order to delivery flow at bole, submit it for review');
  j = await J();
  step('Work sample assessed (simulated reviewer): level 2, map moves', j.assessments.length === 1 && j.assessments[0].level === 2 && /level 2 of 4/.test(r) && /came a ring closer/.test(r), r);
  step('Assessment is private: still invisible to employers', JSON.stringify(await visible('org_medlink')) === JSON.stringify(before.medlink));
  await closeQ(); await shot('07-assessed');
  r = await ask("i'll improve the map by saturday");
  step('Q notes his commitment, once', /Noted/.test(r) && (await world()).areas['talent-a'].commitments.some((k) => k.personId === 'p_chidi' && k.state === 'OPEN'), r);

  // ---- Curveball [recover]: returns three weeks later ----
  r = await ask('simulate 3 weeks later');
  step('Demo clock moves three weeks (simulated)', (await world()).session.offsetDays === 21 && /Simulated/.test(r), r);
  await closeQ(); await page.goto(`${BASE}#/c/home`); await page.waitForTimeout(600); await openQ();
  const notes = await page.locator('.ds-suggest').allInnerTexts();
  step('Proactive notes from real state (commitment due, overdue step)', notes.some((t) => /You said/.test(t)) && notes.some((t) => /plan step|past their dates/.test(t)), notes.join(' | '));
  await page.locator('.ds-suggest').first().scrollIntoViewIfNeeded().catch(() => {}); await shot('08-three-weeks-later');
  r = await ask('hi im back, what changed since i was last here');
  step('Q summarises what changed and what is stale', /It’s been 21 days/.test(r) && /Past the date you planned/.test(r) && /Stale: your practice/.test(r) && /You said you’d/.test(r) && /may be close to filled|still open/.test(r), r);
  await closeQ(); await shot('09-what-changed');

  // ---- Reassessment ----
  r = await ask('i improved the process map, reassess it');
  j = await J();
  step('Reassessment on the same rubric: level 2 → 3', j.assessments.length === 2 && j.assessments[1].level === 3 && /level 2 → 3/.test(r), r);
  r = await ask('how am i progressing');
  step('Progress view shows the comparable rise', /level 2 → 3/.test(r) && /Progress over time/.test(await canvas()), r);
  await closeQ(); await shot('10-progress');

  // ---- Opportunities from real listings ----
  r = await ask('any jobs for me now?');
  step('Openings: Medlink BA and Tinda APM, with gaps and history', /Business Analyst \(Operations\) at Medlink Health/.test(r) && /Associate Product Manager at Tinda/.test(r) && /didn’t progress it/.test(r), r);
  await closeQ(); await shot('11-openings');

  // ---- Explicit, approved share ----
  r = await ask('what can employers see about me');
  step('Privacy: J7 is private; nothing visible by default', /Medlink Health sees nothing/.test(r) && /private to you/.test(r), r);
  r = await ask('share my process map with medlink');
  step('Share needs his approval', /Share “Process map/.test(r), r);
  step('Nothing shared before approval', JSON.stringify(await visible('org_medlink')) === JSON.stringify(before.medlink));
  await chip(/Share with Medlink/);
  const vis = await visible('org_medlink');
  step('After approval, Medlink sees only the assessed map', vis.length === before.medlink.length + 1 && vis.some((id) => /assess_process/.test(id)) && JSON.stringify(await visible('org_tinda')) === JSON.stringify(before.tinda));
  await closeQ();
  await page.goto(`${BASE}#/c/career`); await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Record', exact: true }).click(); await page.waitForTimeout(400); await overflow('record'); await shot('12-record');
  await page.getByRole('button', { name: 'Plan', exact: true }).click(); await page.waitForTimeout(400); await shot('13-plan-final');
  await page.goto(`${BASE}#/c/growth`); await page.waitForTimeout(500); await overflow('growth'); await shot('14-readiness');
  step('Readiness page reads the same J7 state', /Business Analyst/.test(await canvas()) && /level 3 of 4/.test(await canvas()));
  await ctx.close();
}
await b.close();
console.log(`\n${results.filter((x) => x.ok).length}/${results.length} steps passed`);
if (errors.length) { console.log('Page errors:'); for (const e of [...new Set(errors)]) console.log(' -', e); }
process.exit(results.every((x) => x.ok) && !errors.length ? 0 : 1);
