// T4 · Grace (care assistant, low confidence, low-bandwidth phone). Phone-first (390×844), desktop secondary.
// Drives the journey mostly by typing to Q in imperfect language and exercises every T4 curveball:
// doesn't understand terms, can't use voice, upload fails at 60%, leaves the app, loses connection mid-interview.
// Usage: node qa/scripts/journeys/T4.mjs [baseUrl]   (default http://localhost:5187/)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');

const BASE = process.argv[2] || 'http://localhost:5187/';
const OUT = new URL('../../../captures/cx/T4/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const results = []; const errors = [];
const step = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` · ${detail}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Voice is stubbed so the fallback paths are deterministic: 'none' = no speech API, otherwise the mic is denied.
const VOICE_STUB = () => {
  const mode = localStorage.getItem('tq.test.mic') || 'denied';
  if (mode === 'none') { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; return; }
  class FakeRec { start() { setTimeout(() => { this.onerror && this.onerror({ error: 'not-allowed' }); this.onend && this.onend(); }, 50); } stop() {} abort() {} }
  window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
};

const world = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4') || 'null'));
const grace = async (page) => (await world(page))?.areas?.['talent-c']?.people?.p_grace;
const lastQ = async (page) => { const w = await world(page); const t = (w?.q?.threads?.p_grace ?? []).filter((m) => m.who !== 'me'); return t[t.length - 1]?.text ?? ''; };
const qCount = async (page) => ((await world(page))?.q?.threads?.p_grace ?? []).length;

async function ask(page, text, wait = 700) {
  const narrow = (page.viewportSize()?.width ?? 1440) <= 860;
  if (narrow && !(await page.locator('#q-ask').isVisible().catch(() => false))) await page.locator('.ds-askbar button').click();
  const before = await qCount(page);
  await page.locator('#q-ask').fill(text);
  await page.locator('#q-ask').press('Enter');
  for (let i = 0; i < 20 && (await qCount(page)) < before + 2; i++) await sleep(100);
  await sleep(wait);
  // Q's reply to this message (not a later notice, e.g. one after a dev-server reload).
  const t = (await world(page))?.q?.threads?.p_grace ?? [];
  const mine = t.map((m) => m.who === 'me' && m.text === text).lastIndexOf(true);
  const after = t.slice(mine + 1).filter((m) => m.who !== 'me');
  const reply = (after.find((m) => m.kind !== 'notice' || !/^Welcome back/.test(m.text)) ?? after[0])?.text ?? '';
  if (narrow && (await page.locator('[aria-label="Close Q"]').isVisible().catch(() => false))) { await page.locator('[aria-label="Close Q"]').click(); await page.locator('#q-ask').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {}); }
  return reply;
}
const shot = (page, name) => page.screenshot({ path: `${OUT}${name}.png`, fullPage: false });
const route = (page) => page.evaluate(() => location.hash.replace(/^#/, '').split('?')[0]);
const waitFor = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(150); } return false; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript(VOICE_STUB);
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// ---------- 0. Fresh world, Grace signed out ----------
// Other builders share this dev server; wait for the app to boot (their work in progress can break it briefly).
for (let i = 0; i < 12; i++) {
  await page.goto(`${BASE}#/r/home`);
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await sleep(900);
  if (await world(page)) break;
  console.log('… app not booting yet, retrying'); await sleep(15000);
}
errors.length = 0;
await page.evaluate(() => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = 'p_grace'; localStorage.setItem('tq.world.v4', JSON.stringify(w)); localStorage.setItem('tq.test.mic', 'none'); });
await page.goto(`${BASE}#/signup`); await page.reload(); await sleep(500);

// ---------- 1. Signup with plain words ----------
await page.getByRole('button', { name: 'Continue', exact: true }).click();
await page.locator('#su-code').fill('123456');
await page.getByRole('button', { name: 'Verify' }).click();
await page.getByRole('button', { name: 'Continue', exact: true }).click();
const plainPressed = await page.getByRole('switch', { name: /Use plain, simple words/ }).getAttribute('aria-checked');
await shot(page, 'phone-01-signup-plain');
await page.getByRole('button', { name: 'Start' }).click(); await sleep(500);
let w = await world(page);
step('Signup sets plain words for Grace', plainPressed === 'true' && w.q.prefs.p_grace.plain === true && w.actors.find((a) => a.id === 'p_grace').signedUp, await route(page));
await page.getByText('First steps', { exact: false }).first().waitFor({ timeout: 4000 }).catch(() => {});
step('Home offers first steps', await page.locator('.talent-c-home').isVisible());
await shot(page, 'phone-02-home');

// ---------- 2. Getting started by talking to Q ----------
let r = await ask(page, 'where do i start pls');
step('Q: "where do i start pls" opens first steps', (await route(page)) === '/c/start' && /three small steps/i.test(r), r.slice(0, 80));

// ---------- 3. Curveball: doesn't understand terms ----------
r = await ask(page, 'what is a passport here?');
step('Explains "passport" in plain words', /private folder of proof/i.test(r) && r.split(/[.!?](\s|$)/).filter((s) => s && s.trim().length > 2).length <= 2, r);
r = await ask(page, 'still dont get it');
step('Rephrases when still unclear', /^Put simply/i.test(r), r);
r = await ask(page, 'wat does evidence mean');
step('Explains "evidence" as proof of what you did', /proof of what you did/i.test(r), r);
r = await ask(page, 'whats safeguarding??');
step('Explains a care-sector term (safeguarding)', /safe/i.test(r) && /harm/i.test(r), r);
r = await ask(page, 'ok got it');
step('Q closes the explanation when she understands', /Good/.test(r), r);
r = await ask(page, 'dont understand');
step('“dont understand” on a step explains the step simply', /one line is enough/i.test(r), r);

// ---------- 4. Voice / text / form, switching keeps words; curveball: can't use voice ----------
await page.getByRole('button', { name: 'Form', exact: true }).click();
await page.locator('#ws-job').fill('Care assistant');
await page.locator('#ws-years').fill('4');
await page.getByRole('button', { name: 'Type', exact: true }).click();
await page.locator('#ws-text').fill('I look after older people at home');
await page.getByRole('button', { name: 'Form', exact: true }).click();
const kept = (await page.locator('#ws-job').inputValue()) === 'Care assistant';
step('Switching type ↔ form keeps both answers', kept);
await page.getByRole('button', { name: 'Speak', exact: true }).click();
const off = await page.getByText('Voice is turned off for you').isVisible();
await page.getByRole('button', { name: 'Turn voice on' }).click();
await page.getByRole('button', { name: /Speak your answer/ }).click(); await sleep(300);
const fellBack = await page.getByText('Voice isn’t available on this phone').isVisible();
const backToType = (await page.getByRole('button', { name: 'Type', exact: true }).getAttribute('aria-pressed')) === 'true';
await shot(page, 'phone-03-voice-unavailable');
step('Voice unavailable falls back to typing, words kept', off && fellBack && backToType && (await page.locator('#ws-text').inputValue()).includes('older people'));
r = await ask(page, 'my mic not working');
step('Q: "my mic not working" switches to typing', /switched this step to typing/i.test(r), r);
r = await ask(page, 'can i use the form instead');
step('Q switches to the simple form on request', /simple form/i.test(r) && (await page.getByRole('button', { name: 'Form', exact: true }).getAttribute('aria-pressed')) === 'true', r);
await page.getByRole('button', { name: 'Save and go to step 2' }).click(); await sleep(200);
w = await world(page);
step('Step 1 saved as a private claim (not proof)', !!w.evidence.find((e) => e.evidenceId === 'e_p_grace_work_claim' && e.kind === 'CLAIM' && e.visibility === 'PRIVATE'));

// ---------- 5. Curveball: upload fails at 60%, then resumes from 60% ----------
await page.locator('.talent-c-demo summary').click();
await page.getByRole('button', { name: 'Simulate a slow connection' }).click();
await page.getByRole('button', { name: 'Make the upload fail at 60%' }).click();
await page.getByRole('button', { name: /Use the sample photo/ }).click();
await sleep(1200);
await shot(page, 'phone-04-uploading');
await waitFor(async () => (await grace(page))?.upload?.status === 'FAILED', 25000);
let g = await grace(page);
const failText = await page.locator('.talent-c-progress p').innerText();
step('Upload fails at 60% with an honest message', g.upload.done === 6 && /Stopped at 60%/.test(failText) && /first 6 parts are safe/.test(failText), failText);
const sugg = await page.locator('.ds-askbar button').getAttribute('aria-label');
await shot(page, 'phone-05-upload-failed');
r = await ask(page, 'try again pls', 300);
step('Q: "try again pls" resumes from 60%, not from the start', /Carrying on from 60%/.test(r), r);
await waitFor(async () => (await grace(page))?.upload?.done >= 7, 4000);
g = await grace(page);
step('Upload continues past part 6 (nothing re-sent)', g.upload.done >= 7 && g.upload.attempts === 2, `${g.upload.done}/10`);
void sugg;

// ---------- 6. Upload survives the connection dropping ----------
await page.getByRole('button', { name: 'Simulate losing connection' }).click(); await sleep(900);
g = await grace(page);
const offTxt = await page.locator('.talent-c-progress p').innerText();
await shot(page, 'phone-06-upload-offline');
step('Connection drop pauses the upload at the last safe part', g.upload.status === 'PAUSED' && g.upload.reason === 'OFFLINE' && /no connection/.test(offTxt), offTxt);
const atDrop = g.upload.done;
await page.locator('.talent-c-demo').getByRole('button', { name: 'Reconnect' }).click(); await sleep(1000);
g = await grace(page);
step('Reconnect carries on by itself from the same part', g.upload.status === 'UPLOADING' || g.upload.done > atDrop, `${atDrop} → ${g.upload.done}`);

// ---------- 7. Curveball: she leaves the app (page closes mid-upload) ----------
await page.reload(); await sleep(900);
g = await grace(page);
const closedTxt = await page.locator('.talent-c-progress p').innerText().catch(() => '');
r = await lastQ(page);
step('Closing the app pauses the upload honestly', g.upload.status === 'PAUSED' && g.upload.reason === 'CLOSED' && /app was closed/.test(closedTxt), closedTxt);
step('On return, Q says where she was and offers to continue', /Welcome back, Grace/.test(r) && /step 2 of 3/.test(r), r);
await shot(page, 'phone-07-returned');
const pausedAt = g.upload.done;
await page.getByRole('button', { name: /Carry on from \d+%/ }).click();
await waitFor(async () => (await grace(page))?.upload?.status === 'DONE', 25000);
g = await grace(page);
w = await world(page);
step('Upload resumes from the last part and finishes', g.upload.status === 'DONE' && g.upload.done === 10 && pausedAt > 0 && w.evidence.find((e) => e.evidenceId === 'e_grace_cert').verification === 'PENDING');
await shot(page, 'phone-08-upload-done');

// ---------- 8. Slow connection → lite mode ----------
step('Slow connection: the page offers lite mode', await page.getByText('Your connection seems slow.').isVisible());
r = await ask(page, 'internet is so slow here');
const lite = await page.locator('.ds-app').getAttribute('data-lite');
const h = await page.getByRole('button', { name: 'Go to step 3' }).boundingBox();
await shot(page, 'phone-09-lite');
step('Q turns on lite mode; bigger targets, no picture', lite === 'on' && /lite mode/i.test(r) && h && h.height >= 55, `button ${h?.height}px`);

// ---------- 9. Interview: proactive practice, practice is never proof ----------
await page.getByRole('button', { name: 'Go to step 3' }).click();
r = await ask(page, 'when is my intervew');
step('Q knows when the interview is', /Friday/.test(r) && /11:00/.test(r), r);
r = await ask(page, 'can i practise for it first');
step('Q opens private practice', (await route(page)) === '/c/interview' && /never counts as proof/.test(r), r);
await shot(page, 'phone-10-practice-q1');
r = await ask(page, 'pls repeat');
step('“pls repeat” repeats the question', /Here it is again, question 1/.test(r), r);
r = await ask(page, 'dont understand the question');
const simplerShown = await page.locator('#iv-q').innerText();
step('“dont understand” gives simpler words on the canvas', /Think of a time someone was upset/.test(simplerShown) && /simpler words/i.test(await page.locator('.talent-c-question .lab').innerText()), simplerShown);
await page.locator('#iv-draft').fill('A lady at the home was crying because her son did not visit');

// ---------- 10. Curveball: connection drops mid-interview ----------
await page.locator('.talent-c-demo summary').click();
await page.getByRole('button', { name: 'Simulate losing connection' }).click(); await sleep(700);
const banner = await page.getByRole('alert').filter({ hasText: 'We lost connection at question 1' }).innerText().catch(() => '');
await page.locator('#iv-draft').fill('A lady at the home was crying because her son did not visit. I sat with her');
const sendDisabled = await page.getByRole('button', { name: 'Waiting for connection' }).isDisabled();
await shot(page, 'phone-11-interview-offline');
g = await grace(page);
step('Interview pauses honestly; answer kept on this phone', /answer so far is saved on this phone/.test(banner) && sendDisabled && g.rooms.PRACTICE.paused?.reason === 'OFFLINE' && g.rooms.PRACTICE.draft.includes('I sat with her'), banner.slice(0, 90));
await page.locator('.talent-c-demo').getByRole('button', { name: 'Reconnect' }).click(); await sleep(900);
g = await grace(page);
r = await lastQ(page);
step('Reconnect resumes at the same question with the answer', !g.rooms.PRACTICE.paused && /carries on at question 1/.test(r) && (await page.locator('#iv-draft').inputValue()).includes('I sat with her'), r);
// Curveball: the microphone is blocked on her phone (permission denied) → honest fallback to typing.
await page.getByRole('button', { name: /Save answer/ }).click(); await sleep(150);
await page.evaluate(() => localStorage.setItem('tq.test.mic', 'denied'));
await page.reload(); await sleep(800);
await page.getByRole('button', { name: 'Carry on', exact: true }).first().click().catch(() => {});
await page.locator('#iv-draft').fill('I showed her');
await page.getByRole('button', { name: 'Speak', exact: true }).click();
await page.getByRole('button', { name: /Speak your answer/ }).click(); await sleep(400);
const denied = await page.getByRole('alert').filter({ hasText: 'microphone isn’t allowed' }).isVisible().catch(() => false);
await shot(page, 'phone-11b-mic-denied');
step('Mic denied in the interview: falls back to typing, answer kept', denied && (await page.getByRole('button', { name: 'Type', exact: true }).getAttribute('aria-pressed')) === 'true' && (await page.locator('#iv-draft').inputValue()) === 'I showed her');
for (let i = 1; i < 4; i++) {
  if (i > 0) await page.locator('#iv-draft').fill(i === 3 ? 'Hello, sorry for the wait. We need 2 more days to fix it. I will call you on Friday.' : 'I showed her each task and then watched her do it');
  await page.getByRole('button', { name: /Save answer/ }).click(); await sleep(150);
}
w = await world(page);
step('Practice finishes privately and is never counted as proof', await page.getByText('it never counts as proof').first().isVisible() && !w.evidence.some((e) => e.ownerId === 'p_grace' && e.kind === 'PRACTICE') && w.events.every((e) => !(e.type === 'practice.done' && e.scope !== 'PERSON:p_grace')));
await shot(page, 'phone-12-practice-done');

// ---------- 11. Real interview: leave mid-answer, return, send with approval ----------
r = await ask(page, 'ok start the real interview now');
step('Q opens the real interview and says what the employer sees', /exactly what Kora Pay will see/.test(r) && await page.getByText('What Kora Pay will see').first().isVisible(), r.slice(0, 80));
await shot(page, 'phone-13-real-q1');
await page.locator('#iv-draft').fill('When Mrs Bassey was upset I');
await page.goto(`${BASE}#/c/home`); await sleep(500);
g = await grace(page);
step('Leaving mid-question pauses and remembers the place', g.rooms.REAL.paused?.reason === 'LEFT' && g.place.left === true);
r = await ask(page, 'where was i');
step('Q: "where was i" says where she was', /interview, at question 1, with an answer half written/.test(r), r);
await page.locator('.ds-askbar button').click();
await page.locator('.ds-qsheet').getByRole('button', { name: 'Carry on' }).last().click(); await sleep(600);
step('Carry on returns to the question with the answer kept', (await route(page)) === '/c/interview' && (await page.locator('#iv-draft').inputValue()) === 'When Mrs Bassey was upset I');
const answers = ['When Mrs Bassey was upset I sat with her and listened, then called her son.', 'I showed a new carer how to do the morning round and checked each step with her.', 'I would check the payment record first, then tell the shop and the customer what I found.', 'Hello, sorry for the wait. We need 2 more days to fix this. I will call you on Friday.'];
for (let i = 0; i < 4; i++) { await page.locator('#iv-draft').fill(answers[i]); await page.getByRole('button', { name: /Save answer/ }).click(); await sleep(150); }
const review = await page.locator('.talent-c-review').innerText();
await shot(page, 'phone-14-real-review');
step('Review shows exactly what the employer will see', /Mrs Bassey/.test(review) && /Typed/.test(review));
r = await ask(page, 'submit my answers');
w = await world(page);
const appr = w.q.threads.p_grace.filter((m) => m.kind === 'approval').pop();
step('Sending needs explicit approval', !!appr && /can’t be undone/.test(appr.text) && !(await grace(page)).rooms.REAL.submitted, appr?.text?.slice(0, 80));
await page.locator('.ds-askbar button').click();
await page.locator('.ds-qsheet').getByRole('button', { name: 'Yes, send them' }).last().click(); await sleep(500);
g = await grace(page); r = await lastQ(page);
step('Sent (simulated) with a receipt, no decision promised', g.rooms.REAL.submitted?.status === 'SENT_SIMULATED' && /can’t tell you the result/.test(r) && !/you will get|you got the job|you passed/i.test(r), r.slice(0, 90));
await shot(page, 'phone-15-sent');

// ---------- 12. Accessibility basics on the interview room ----------
await page.goto(`${BASE}#/c/start`); await sleep(400);
const small = await page.evaluate(() => [...document.querySelectorAll('.talent-c-page button, .talent-c-page a.ds-btn, .talent-c-page summary')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30)));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
step('Phone: all targets ≥ 44px, no sideways scroll', small.length === 0 && !overflow, small.join(' | '));

// ---------- 13. Desktop (secondary) ----------
const state = await ctx.storageState();
const d = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: state });
await d.addInitScript(VOICE_STUB);
const dp = await d.newPage(); dp.on('pageerror', (e) => errors.push(String(e)));
await dp.goto(`${BASE}#/c/interview`); await sleep(700);
await shot(dp, 'desktop-01-interview-sent');
r = await ask(dp, 'turn off lite mode');
await dp.goto(`${BASE}#/c/start`); await sleep(500);
await dp.evaluate(() => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.areas['talent-c'].people.p_grace.step = 0; localStorage.setItem('tq.world.v4', JSON.stringify(w)); });
await dp.reload(); await sleep(600);
await shot(dp, 'desktop-02-first-steps');
await dp.goto(`${BASE}#/c/interview`); await sleep(300);
await dp.getByRole('button', { name: 'Practise', exact: true }).click(); await sleep(200);
await dp.getByRole('button', { name: 'Practise again' }).click().catch(() => {});
await sleep(200);
r = await ask(dp, 'simpler pls');
await shot(dp, 'desktop-03-practice-simpler');
step('Desktop: interview room works beside the global Q', /In simpler words/.test(r), r.slice(0, 60));
const odd = await dp.locator('.ds-legacy').count();
step('Interview room is Direction D (no legacy bridge, no embedded conversation)', odd === 0 && (await dp.locator('.ds-canvas [role="log"]').count()) === 0);

// ---------- Errors ----------
const errs = errors.filter((e) => !/favicon|Download the React DevTools/.test(e));
step('No page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((x) => !x.ok).length;
console.log(`\nT4: ${results.length - failed}/${results.length} passed. Screenshots: ${OUT}`);
process.exit(failed ? 1 : 0);
