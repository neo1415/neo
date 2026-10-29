// T1 · Amaka, a new graduate with no work history who starts signed out. Driven mostly by typing to Q, in
// imperfect language, desktop 1440×900 and phone 390×844. Flow: sign up → guided profile (chat, CV, form)
// → skills and career discovery (J7) → entry-level matches, explained → interview rehearsal → CV help → apply.
// Curveballs: her CV is a photo Q can't read [info]; "I don't know what to write" [info]; no job history [info];
// she skips a question and Q remembers without nagging [mind]; she switches to the form and makes a mistake,
// Q helps fix it [recover]; she asks Q to add things she never did, Q refuses [info]; she goes back [recover].
// Usage: node T1.mjs [d,m]   (BASE defaults to the talent-a dev server on :5185)
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const ROOT = new URL('../../../captures/cx/T1/', import.meta.url).pathname; mkdirSync(ROOT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:5185/';
const ONLY = (process.argv[2] || 'd,m').split(',');
const b = await pw.chromium.launch();
const results = []; const errors = [];
for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr, acceptDownloads: true });
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
  const qMsgs = async () => { const w = await world(); return (w.q.threads.p_amaka ?? []).filter((m) => m.who !== 'me'); };
  const lastQ = async (n = 1) => (await qMsgs()).slice(-n).map((m) => m.text).join(' ¶ ');
  // Type to Q, then wait until Q has answered this turn (reads the persisted thread, so it works on phones too).
  const ask = async (t, wait = 450) => {
    await openQ(); await page.fill('#q-ask', t); await page.press('#q-ask', 'Enter');
    for (let i = 0; i < 40; i++) { const th = (await world()).q.threads.p_amaka ?? []; const k = th.map((m) => m.text).lastIndexOf(t); if (k >= 0 && th.slice(k + 1).some((m) => m.who !== 'me')) break; await page.waitForTimeout(100); }
    await page.waitForTimeout(wait);
    const th = (await world()).q.threads.p_amaka ?? []; const k = th.map((m) => m.text).lastIndexOf(t);
    return th.slice(k + 1).filter((m) => m.who !== 'me').map((m) => m.text).join(' ¶ ');
  };
  const chip = async (re, wait = 650) => { await openQ(); const c = page.locator('.ds-chip').filter({ hasText: re }).last(); await c.click(); await page.waitForTimeout(wait); };
  const canvas = () => page.locator('.ds-canvas').first().innerText();
  const profile = async () => (await world()).profiles.p_amaka;

  // ---- Signed out → sign up ----
  await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  await page.evaluate(() => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = 'p_amaka'; localStorage.setItem('tq.world.v4', JSON.stringify(w)); });
  await page.goto(`${BASE}#/signup`); await page.reload(); await page.waitForTimeout(600);
  step('Starts signed out on sign-up', /Create your account/.test(await page.locator('body').innerText()));
  await shot('01-signup');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.fill('#su-code', '123456'); await page.getByRole('button', { name: 'Verify' }).click();
  await page.getByRole('button', { name: /looking for work/ }).click(); await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Start' }).click(); await page.waitForTimeout(700);
  let w = await world();
  step('Signed up and welcomed by Q', w.actors.find((a) => a.id === 'p_amaka').signedUp && /Welcome, Amaka/.test(await lastQ()));

  // ---- Guided profile, by talking to Q ----
  let r = await ask('hi, i just finished uni and i dont really know how to make a profile');
  step('Q starts a guided profile and asks one small question', /What did you study/.test(r) && (await page.evaluate(() => location.hash)).includes('/c/welcome'), r);
  await closeQ(); await overflow('welcome'); await shot('02-profile-start');

  // Curveball [info]: her CV is a phone photo
  r = await ask('can i upload my cv instead? i only have a photo of it on my phone');
  step('Q offers sample files to upload', /Choose your CV/.test(r), r);
  await chip(/CV_photo_from_phone/, 2100);
  r = await lastQ();
  step('Curveball [info]: unreadable scan is named, nothing saved, alternatives offered', /couldn’t read that one/.test(r) && /photo of a page/.test(r) && (await profile()).answered.length === 0, r);
  await closeQ(); await shot('03-cv-unreadable');
  await chip(/Tell Q instead/);
  r = await lastQ();
  step('Switches back to chatting; Q resumes at the same question', /What did you study/.test(r), r);

  // Curveball [info]: "I don't know what to write"
  r = await ask('i dont know what to write tbh');
  step('Curveball [info]: Q asks a smaller, concrete question', /smaller/.test(r) && /course/.test(r), r);
  r = await ask('economics at UNN, i finished this year 2026');
  step('Study saved in her words', /(Economics at UNN|economics at UNN)/i.test((await profile()).study) && /project/.test(r), r);
  r = await ask('i dont know what to write, i only did school stuff');
  step('Small questions about school projects', /final-year project|big assignment|topic/.test(r), r);
  r = await ask('my final year project was on food prices in ogbete market, i did a survey of traders and analysed it in excel');
  step('Project kept as a claim, Q asks for a rough number', /Saved as a claim/.test(r) && /Roughly how many/.test(r), r);
  r = await ask('about 120 traders');
  const proj = (await profile()).experience.find((e) => e.kind === 'project');
  step('Detail added to the project, in her words', /120 traders/.test(proj?.claims[0]?.text ?? '') && /volunteered/.test(r), proj?.claims[0]?.text);

  // Curveball [info]: no job history
  r = await ask('i have never had a job tho, is that a problem??');
  step('Curveball [info]: no work history is fine; Q never invents a job', /never invent a job/.test(r) && /volunteered/.test(r) && (await profile()).noJobs, r);
  r = await ask('i was treasurer for the economics students association, kept the budget of 350k and the monthly accounts');
  step('Volunteering saved as a claim', (await profile()).experience.some((e) => e.kind === 'volunteer' && /Treasurer/.test(e.title)) && /tools/.test(r), r);

  // Curveball [mind]: skip
  r = await ask('can i skip this one');
  step('Curveball [mind]: skipping allowed; Q remembers without nagging', /skipped/.test(r) && /won’t keep asking/.test(r) && (await profile()).skipped.includes('tools'), r);

  // Curveball [mind]+[recover]: switches to the form and makes a mistake
  r = await ask('actually can i just fill a form instead, typing is easier');
  await closeQ();
  step('Switches to the short form', /short form/.test(r) && /The short form/.test(await canvas()), r);
  await page.fill('#ta-f-location', 'Enugu');
  await page.fill('#ta-f-year', '20226');
  await page.fill('#ta-f-tools', 'excel and google sheets');
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(700);
  r = await lastQ();
  step('Curveball [recover]: form mistake explained, with a suggested fix', /20226/.test(r) && /Did you mean 2026/.test(r) && /aria-invalid="true"/.test(await page.locator('#ta-f-year').evaluate((e) => e.outerHTML)), r);
  await shot('04-form-mistake');
  r = await ask('oh yes 2026 sorry');
  const pf = await profile();
  step('Q fixes it, saves the form and carries on', pf.form.year === '2026' && /Enugu/.test(pf.location) && pf.skills.some((s) => s.label === 'Excel') && /kind of work/.test(r), r);
  r = await ask('not sure yet, maybe something with numbers');
  w = await world();
  step('Profile complete; claims sync to her private Passport', w.profiles.p_amaka.done && w.evidence.filter((e) => e.ownerId === 'p_amaka' && e.kind === 'CLAIM').every((e) => e.visibility === 'PRIVATE') && /0|Nothing is shared/.test(r), r);
  await openQ(); const sg = await page.locator('.ds-suggest').allInnerTexts();
  step('Proactive from real state: a new entry-level job matches, with a reason', sg.some((t) => /new entry-level job matches/.test(t)), sg.join(' | '));
  await page.locator('.ds-suggest').first().scrollIntoViewIfNeeded().catch(() => {}); await shot('05b-proactive');
  await closeQ(); await page.getByRole('button', { name: 'Profile', exact: true }).click().catch(() => {});
  await page.waitForTimeout(300); await overflow('profile'); await shot('05-profile-built');

  // ---- Skills exploration and career discovery (J7) ----
  r = await ask('what jobs could i do with economics and what i have');
  step('Career atlas opens; claims shown as mentioned, not proven', /career atlas/.test(r) && /claims/.test(r) && (await page.evaluate(() => location.hash)).includes('/c/career'), r);
  await closeQ(); await shot('06-atlas');
  r = await ask('what skills do i actually have');
  step('Skills exploration: mentioned vs shown', /mentioned/.test(r) && /spreadsheet modelling/.test(r), r);
  await closeQ(); await shot('07-skills');
  r = await ask('quiz me on spreadsheets');
  step('Practice question (private)', /practice question/.test(r) && /pivot/.test(r), r);
  r = await ask('b');
  step('Practice is not proof; map unchanged', /not proof/.test(r) && /unchanged/.test(r), r);

  // ---- Entry-level matching, explained ----
  r = await ask('ok show me entry level jobs that fit me');
  w = await world();
  step('Matches from real listings, as claims not promises', /Graduate Data Assistant|Operations Trainee/.test(r) && /can’t promise/.test(r), r);
  await closeQ(); await shot('08-matches');
  r = await ask('why does the tinda graduate data assistant job fit me');
  step('Need-by-need explanation with her own words', /Spreadsheets: mentioned/.test(r) && /Survey analysis: mentioned/.test(r) && /Clear writing: not shown/.test(r), r);

  // ---- Interview rehearsal (practice, never proof) ----
  r = await ask('can i practise for an intervew pls');
  step('Rehearsal question from her own project; practice is private', /practice: private/.test(r) && /final-year project/.test(r), r);
  r = await ask('we did a survey of the traders and saw that prices went up a lot');
  step('Feedback without scoring; not evidence', /use “I”/.test(r) && /isn’t evidence/.test(r), r);
  const hasLink = await (async () => { await openQ(); return page.locator('.ds-chip').filter({ hasText: /Open full interview practice/ }).count(); })();
  step('Links to the full interview room (/c/interview)', hasLink > 0);
  await shot('09-rehearsal');

  // ---- CV help, never invented ----
  r = await ask('can u help me write my cv');
  step('CV draft only from her words', /built only from what you told me/.test(r) && /haven’t added anything/.test(r), r);
  await closeQ(); await shot('10-cv-draft');
  r = await ask('can you add that i did an internship at a bank and i know python, so it looks better');
  w = await world();
  step('Curveball [info]: Q refuses to fabricate an internship or Python', /I can’t add an internship and Python/.test(r) && !JSON.stringify(w.areas['talent-a'].cv.p_amaka).match(/python|intern/i), r);
  r = await ask('ok fair. but i actually did a free python course on coursera last year');
  step('Her own statement is added as a claim', /Added to your profile, in your words/.test(r) && (await profile()).skills.some((s) => s.label === 'Python'), r);
  r = await ask('ok redo my cv with that pls');
  step('CV redrafted with her new claim', /built only from what you told me/.test(r), r);
  await chip(/Use these lines/);
  w = await world();
  step('CV lines approved (private)', w.areas['talent-a'].cv.p_amaka.status === 'APPROVED' && w.areas['talent-a'].cv.p_amaka.lines.some((l) => /Python course/i.test(l.text)));

  // ---- Applying (approval first) ----
  r = await ask('ok apply for the tinda graduate data assistant job');
  step('Apply asks for approval and says what is shared', /Shall I submit it/.test(r) && /can’t promise a reply/.test(r), r);
  await chip(/Submit application/);
  w = await world();
  const app = w.applications.find((a) => a.personId === 'p_amaka' && a.jobId === 'j_ta_grad_data');
  step('Application created (simulated), links to /c/applications', !!app && app.status === 'SUBMITTED' && /simulated/.test(await lastQ()));
  await openQ();
  step('Applications link offered', (await page.locator('.ds-chip').filter({ hasText: /Open my applications/ }).count()) > 0);
  await shot('11-applied');

  // ---- Recovery: go back; proactive notes from real state ----
  r = await ask('go back');
  step('Curveball [recover]: “go back” returns to the previous page', /Back to/.test(r), r);
  await closeQ();
  await page.goto(`${BASE}#/c/welcome`); await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Jobs that fit', exact: true }).click(); await page.waitForTimeout(400);
  step('Profile page shows the application on the match', /Applied · submitted/.test(await canvas()));
  await overflow('jobs'); await shot('12-jobs-applied');
  await page.getByRole('button', { name: 'CV', exact: true }).click(); await page.waitForTimeout(400); await shot('13-cv-saved');
  await openQ(); await shot('14-thread');
  await closeQ();
  await ctx.close();
}
await b.close();
console.log(`\n${results.filter((x) => x.ok).length}/${results.length} steps passed`);
if (errors.length) { console.log('Page errors:'); for (const e of [...new Set(errors)]) console.log(' -', e); }
process.exit(results.every((x) => x.ok) && !errors.length ? 0 : 1);
