// T5 · Zara, the sceptical job seeker. Driven mostly by typing to Q (with typos), desktop 1440×900 and
// phone 390×844. Curveballs: a saved listing closes while she applies, and she navigates away and back
// [info][recover]; the recruiter never replies [info]; she challenges a match [mind]; she rejects Q's advice
// and Q remembers [mind]; she changes notifications [mind]; she asks Q to forget something [info].
// Also checks another candidate's applications render. Usage: node T5.mjs [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const ROOT = new URL('../../../captures/cx/T5/', import.meta.url).pathname; mkdirSync(ROOT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:5186/';
const ONLY = (process.argv[2] || 'd,m').split(',');
const b = await pw.chromium.launch();
const results = []; const errors = [];
for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text()}`); });
  const phone = v === 'm';
  const step = (name, ok, detail = '') => { results.push({ v, name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail ? ` · ${detail}` : ''}`); };
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `${ROOT}${v}-${n}.png` }); };
  const world = () => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
  const overflow = async (n) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errors.push(`${v}/${n}: horizontal overflow ${o}px`); };
  const openQ = async () => { if (!phone) return; if (await page.locator('#q-ask').isVisible().catch(() => false)) return; await page.locator('.ds-askbar button').first().click(); await page.locator('#q-ask').waitFor(); };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) await x.click(); await page.waitForTimeout(200); };
  // Read Q's latest reply from the store (on phones the Q sheet may close when Q navigates).
  const lastQ = () => page.evaluate(() => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); const t = w.q.threads[w.session.actor] || []; for (let i = t.length - 1; i >= 0; i--) if (t[i].who !== 'me') return t[i].text; return ''; });
  const ask = async (t, wait = 700) => { await openQ(); await page.fill('#q-ask', t); await page.press('#q-ask', 'Enter'); await page.waitForTimeout(wait); return lastQ(); };
  const chip = async (re) => { await openQ(); const c = page.locator('.ds-chip').filter({ hasText: re }).last(); await c.click(); await page.waitForTimeout(600); };
  const as = async (actor, route) => {
    if (!(await page.evaluate(() => localStorage.getItem('tq.world.v4')))) { await page.goto(`${BASE}#/settings`); await page.waitForTimeout(500); await page.getByRole('button', { name: 'Bring them back' }).click(); }
    await page.goto(`${BASE}#${route}`); await page.waitForTimeout(300);
    // Edit and reload in one synchronous step so no in-page timer can write the old actor back.
    await Promise.all([page.waitForEvent('load'), page.evaluate((a) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = a; localStorage.setItem('tq.world.v4', JSON.stringify(w)); location.reload(); }, actor)]);
    await page.waitForTimeout(800);
  };
  const tb = async () => (await world()).areas['talent-b'];

  await page.goto(`${BASE}#/c/jobs`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  await as('p_zara', '/c/jobs');
  const list = await page.locator('main, .ds-canvas').first().innerText();
  step('Jobs list shows employer signals', /Verified employer/.test(list) && /Not verified/.test(list));
  await overflow('jobs'); await shot('01-jobs');

  // Signals, and what they don't mean
  let r = await ask('is rivers logistics even legit? feels dodgy');
  step('Q explains signals and their limits', /Not verified doesn’t mean a scam/.test(r) && /Registered business: no/.test(r));
  r = await ask('ok show me only verified jobs');
  await closeQ();
  const vlist = await page.locator('.tb-jobs').innerText();
  step('Verified filter hides the unverified employer', !/rivers/i.test(vlist) && /kora/i.test(vlist));
  await page.goto(`${BASE}#/c/jobs/j_rivers_backend`); await page.waitForTimeout(500); await shot('02-rivers-signals');

  // Match explanation and challenge [mind]
  r = await ask('why is kora a match for me tho');
  step('Match explained with the evidence used', /Fleet tracking API/.test(r) && /Payments systems: not shown/.test(r));
  r = await ask('thats wrong, i built mobile money payouts at fleetline for 2 years');
  step('Curveball [mind]: challenge recorded as “you told me”, not proof', /Fair challenge/.test(r) && /you told me/.test(r));
  await closeQ(); await page.goto(`${BASE}#/c/jobs/j_kora_backend`); await page.waitForTimeout(500);
  step('Job page shows the corrected need', /You told me: “/.test(await page.locator('#tb-why-h').locator('..').locator('..').innerText()));
  await shot('03-kora-match-corrected');

  // Advice rejected and remembered [mind]
  r = await ask('any tips for my kora aplication?');
  step('Advice offered (includes a cover note)', /cover note/.test(r));
  r = await ask('no. im not writing a cover letter, they are pointless. stop suggesting that');
  step('Curveball [mind]: Q accepts and remembers', /won’t suggest cover letters/.test(r) && (await tb()).declined.p_zara?.includes('cover_note'));
  r = await ask('ok any other tips for kora');
  step('Declined advice is not repeated', !/cover note/.test(r.split('I’ve left out')[0]) && /left out cover letters/.test(r));

  // Applying while the listing closes; navigate away and back [info][recover]
  r = await ask('apply to the harbour freight job pls');
  step('Application started, nothing sent until confirmed', /Nothing is sent until you confirm/.test(r));
  await closeQ(); await shot('04-applying');
  await page.waitForTimeout(3000);
  let w = await world();
  step('Curveball [info]: listing closes mid-application', w.jobs.find((j) => j.id === 'j_harbour_backend').status === 'CLOSED' && /closed “Backend Engineer \(Go\)” while you were applying/.test(await lastQ()));
  r = await ask('open my applications'); await page.waitForTimeout(300);
  r = await ask('go back');
  await closeQ();
  step('Curveball [recover]: back on the job, closed banner and choices kept', /This listing has closed/.test(await page.locator('body').innerText()) && !!(await tb()).applying.p_zara);
  r = await ask('send it anyway');
  w = await world();
  step('Nothing is submitted to a closed listing', !w.applications.some((a) => a.jobId === 'j_harbour_backend') && /closed/.test(r));
  step('Proactive: “a job you saved closed”', (await page.locator('.ds-suggest').filter({ hasText: /A job you saved closed/ }).count()) > 0);
  await closeQ(); await shot('05-closed-mid-apply'); await openQ(); await shot('05b-closed-thread');
  r = await ask('show me similar jobs that are still open');
  step('Similar open jobs offered', /Still open/.test(r));

  // Recruiter doesn't respond [info]
  r = await ask('has rivers replied to me?? its been ages');
  step('Curveball [info]: honest status, no blame', /hasn’t replied in \d+ days/.test(r) && /says nothing about you/.test(r));
  const sg = await page.locator('.ds-suggest').allInnerTexts();
  step('Proactive: “Rivers hasn’t replied in N days”', sg.some((t) => /Rivers Logistics hasn’t replied in \d+ days/.test(t)), sg.map((t) => t.slice(10, 60)).join(' / '));
  await chip(/Draft a follow-up to Rivers/);
  r = await lastQ();
  step('Polite follow-up drafted for approval', /won’t send it without your yes/.test(r));
  await chip(/Send \(simulated\)/);
  w = await world();
  step('Follow-up is SENT_SIMULATED in w.threads', w.threads.some((t) => t.orgId === 'org_rivers' && t.personId === 'p_zara' && t.messages.some((m) => m.status === 'SENT_SIMULATED')));
  r = await ask('did kora reply yet');
  step('“Viewed” means only that', /That’s all “viewed” means/.test(r));
  await closeQ(); await page.goto(`${BASE}#/c/applications`); await page.waitForTimeout(500); await overflow('apps'); await shot('06-applications');

  // Notifications [mind]
  r = await ask('too many emails. only email me weekly and stop texting me');
  w = await world(); const n = w.consents.p_zara.notifications;
  step('Curveball [mind]: notifications changed through Q', n.email && !n.sms && !n.inApp && n.digest === 'WEEKLY');
  await closeQ(); await page.goto(`${BASE}#/settings`); await page.waitForTimeout(400);
  step('Settings page reflects it', (await page.getByRole('switch', { name: 'Text message (SMS)' }).getAttribute('aria-checked')) === 'false');
  await shot('07-settings');

  // Forget [info]
  r = await ask('pls forget that im looking to leave my job');
  step('Deletion plan: what goes and what can’t', /Deleted:/.test(r) && /Can’t be deleted:/.test(r) && /0 disclosures/.test(r));
  await chip(/Delete it/);
  w = await world();
  const m = w.areas['talent-b'].memories.find((x) => x.id === 'cm_zara_leave');
  step('Memory deleted, content not kept, receipt shown', m.state === 'DELETED' && m.text === '' && /Deletion receipts/.test(await page.locator('body').innerText()));
  await closeQ(); await shot('08-memory-receipt');

  // Prep with no interview booked
  r = await ask('can u help me prep for interviews');
  step('Prep without promising an interview', /isn’t a sign either way/.test(r));
  await closeQ(); await shot('09-prep');

  // Another candidate's applications render (Chidi)
  await as('p_chidi', '/c/applications');
  step('Applications page renders any candidate’s applications', /Associate Product Manager/.test(await page.locator('body').innerText()));
  await shot('10-chidi-applications');
  await ctx.close();
}
await b.close();
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} steps passed`);
if (errors.length) { console.log('Page errors:'); for (const e of [...new Set(errors)]) console.log('  ', e); }
process.exit(fails || errors.length ? 1 : 0);
