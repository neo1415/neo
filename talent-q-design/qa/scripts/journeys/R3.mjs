// R3 · The busy HR team (Ngozi, Kora Pay) — driven mostly by typing to Q, with curveballs.
// Usage: node qa/scripts/journeys/R3.mjs [baseUrl]   (default http://localhost:5183)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');

const BASE = process.argv[2] || 'http://localhost:5183';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../captures/cx/R3');
mkdirSync(OUT, { recursive: true });
const results = []; const errors = [];
const step = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ` — ${info}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setup(page) {
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Download the React DevTools/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
}
let nav = 0;
async function asActor(page, id, route) {
  // Write the actor, then do a full navigation at once (a hash change first would let the page overwrite it).
  await page.evaluate((id) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = id; localStorage.setItem('tq.world.v4', JSON.stringify(w)); }, id);
  await page.goto(`${BASE}/?n=${++nav}#${route}`); await page.waitForSelector('.ds-app'); await sleep(400);
}
async function go(page, route) { await page.evaluate((r) => { location.hash = r; }, route); await sleep(400); }
const qCount = (page) => page.locator('.ds-thread .ds-log > .ds-q').count();
async function ask(page, text, { phone = false } = {}) {
  if (phone && !(await page.locator('#q-ask').isVisible().catch(() => false))) { await page.locator('.ds-askbar button').click(); await page.waitForSelector('#q-ask'); }
  const before = await page.locator('.ds-thread .ds-log > *').count();
  await page.fill('#q-ask', text); await page.press('#q-ask', 'Enter');
  for (let i = 0; i < 40; i++) { await sleep(100); if ((await page.locator('.ds-thread .ds-log > *').count()) > before + 1) break; }
  await sleep(350);
  return lastQ(page);
}
async function lastQ(page) { const qs = page.locator('.ds-thread .ds-log > .ds-q'); const n = await qs.count(); return n ? (await qs.nth(n - 1).innerText()) : ''; }
async function chip(page, label) { const b = page.locator('.ds-thread .ds-chip', { hasText: label }).last(); await b.click(); await sleep(500); }
async function shot(page, name, top = false) { if (top) await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); }
// The thread shows two suggestions at a time; other areas' cards are dismissed until ours show (if any).
const MINE = /hasn’t been approved|hasn’t replied|interview panel|asked to move|queued while|wrote to Kora/;
async function suggestions(page, re) {
  for (let i = 0; i < 8; i++) {
    const t = await page.locator('.ds-suggest').allInnerTexts();
    if (t.some((x) => re.test(x))) return t.join(' | ');
    if (!t.length) return '';
    const k = t.findIndex((x) => !MINE.test(x));
    // Other areas' cards are dismissed; our own unrelated ones are only put off until later.
    if (k >= 0) await page.locator('.ds-suggest').nth(k).locator('.ds-chip', { hasText: 'Dismiss' }).click();
    else await page.locator('.ds-suggest').nth(0).locator('.ds-chip', { hasText: 'Later' }).click();
    await sleep(250);
  }
  return (await page.locator('.ds-suggest').allInnerTexts()).join(' | ');
}
const world = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
const msgsTo = (w, pid) => w.threads.filter((t) => t.personId === pid && t.orgId === 'org_kora').flatMap((t) => t.messages);

const browser = await chromium.launch();
try {
  // ======================= Desktop =======================
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); await setup(page);
  await page.goto(`${BASE}/#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ds-app'); await sleep(400);

  // ---- 1. Founder sequence as Ada (R2's recruiter): "for him" after viewing Tobi ----
  await asActor(page, 'u_ada', '/r/people/p_tobi'); await sleep(500);
  await go(page, '/r/home');
  let r = await ask(page, 'can u draft an intervew invitation for him');
  step('Ada: "draft ... for him" after Tobi’s profile drafts to Tobi', /draft interview invitation to Tobi/i.test(r) && /Tobi/.test(r), r.slice(0, 140));
  step('Draft names the pay band (guideline used chip)', /pay band/i.test(r) && /₦2\.4m/.test(r));
  r = await ask(page, 'Change it to Friday and make the tone more friendly');
  step('Edit in place: Friday + friendlier, shows v1 → v2 diff', /v2/.test(r) && /Fri/.test(r) && /friendl/i.test(r) && (await page.locator('.ds-thread .hc-diff').count()) > 0, r.slice(0, 160));
  await shot(page, '01-ada-diff-desktop');
  r = await ask(page, 'Send it');
  step('"Send it" runs checks and asks for explicit approval (not sent yet)', /Approve this exact version/i.test(r) && msgsTo(await world(page), 'p_tobi').some((m) => m.status === 'AWAITING_APPROVAL'), r.slice(0, 120));
  await shot(page, '02-ada-approval-desktop');
  await chip(page, 'Approve and send');
  r = await lastQ(page);
  step('After approval: SENT_SIMULATED with a "Simulated send" label', /Simulated send/.test(r) && msgsTo(await world(page), 'p_tobi').some((m) => m.status === 'SENT_SIMULATED'), r.slice(0, 120));

  // ---- 2. Ngozi: inbox, the unapproved draft from Seyi (curveball: unapproved; guideline; calendar conflict) ----
  await asActor(page, 'u_ngozi', '/r/messages');
  const sugg = await suggestions(page, /Seyi.*Zara/s);
  step('Proactive: Seyi’s unapproved draft to Zara is flagged, not sent', /Seyi.*Zara.*hasn’t been approved, so it hasn’t been sent/s.test(sugg), sugg.slice(0, 200));
  const sg = await suggestions(page, /Grace hasn’t replied/);
  step('Proactive: reminder that Grace hasn’t replied (from real state)', /Grace hasn’t replied/.test(sg), sg.slice(0, 200));
  await shot(page, '03-ngozi-messages-desktop');
  r = await ask(page, 'just send zaras invite pls');
  step('Curveball [recover]: sending an unapproved draft → checks first, nothing sent', /haven’t sent it/i.test(r) && /pay band/i.test(r) && /busy/i.test(r) && !msgsTo(await world(page), 'p_zara').some((m) => m.status === 'SENT_SIMULATED'), r.slice(0, 200));
  await chip(page, 'Add the pay band');
  r = await lastQ(page);
  step('Fix pay band → re-check still flags the calendar clash', /Seyi/i.test(r) && /busy/i.test(r), r.slice(0, 160));
  await chip(page, 'Use ');
  r = await lastQ(page);
  step('Fix time → all clear, approval requested', /Approve this exact version/.test(r), r.slice(0, 120));

  // ---- 3. Offline mid-send (curveball: interruption) ----
  await page.locator('.ds-railbtn', { hasText: 'Simulate offline' }).click(); await sleep(300);
  await chip(page, 'Approve and send');
  r = await lastQ(page);
  let w = await world(page);
  step('Curveball [recover]: offline approve → QUEUED_OFFLINE, not claimed as sent', /offline/i.test(r) && msgsTo(w, 'p_zara').some((m) => m.status === 'QUEUED_OFFLINE'), r.slice(0, 120));
  await shot(page, '04-ngozi-offline-queued-desktop');
  await page.locator('.ds-railbtn', { hasText: 'Reconnect' }).click(); await sleep(1800);
  w = await world(page); r = await lastQ(page);
  step('Reconnect flushes the outbox after a calendar re-check', msgsTo(w, 'p_zara').some((m) => m.status === 'SENT_SIMULATED') && /Back online/.test(r), r.slice(0, 120));

  // ---- 4. Find a time across time zones; slot taken after proposing (curveball) ----
  r = await ask(page, 'find a time for Kunle with Seyi and Musa next week');
  step('Find a time with Seyi (Lagos) and Musa (London): overlap with both zones', /Musa is in London/.test(r) && (await page.locator('.ds-thread .hc-slots').count()) > 0, r.slice(0, 160));
  await shot(page, '05-ngozi-overlap-desktop');
  r = await ask(page, 'hold the first one');
  step('Hold the first slot', /Held/.test(r), r.slice(0, 100));
  await go(page, '/r/calendar');
  // Design pass: the test toggle is a switch now (role="switch"); same behaviour.
  await page.getByRole('switch', { name: /Someone takes the proposed time/ }).click(); await sleep(200);
  r = await ask(page, 'draft the invite for kunle');
  step('Draft uses the held time', /draft interview invitation to Kunle/i.test(r), r.slice(0, 140));
  r = await ask(page, 'send it');
  step('Curveball [info]: slot taken after proposing → noticed, nothing sent, new time offered', /haven’t sent it/.test(r) && /changed after I proposed/.test(r), r.slice(0, 200));
  await chip(page, 'Use ');
  await chip(page, 'Approve and send');
  w = await world(page);
  step('Kunle invite sent after moving to a free time', msgsTo(w, 'p_kunle').some((m) => m.status === 'SENT_SIMULATED'));
  await go(page, '/r/calendar'); await shot(page, '06-ngozi-calendar-desktop', true);

  // ---- 5. Pipeline: move with undo; rejection needs a reason ----
  await go(page, '/r/pipeline');
  r = await ask(page, 'move Ife to interveiw');
  w = await world(page);
  step('Move Ife to Interview by typing', /Moved Ifeoma/.test(r) && w.pipeline.find((p) => p.personId === 'p_ife').stage === 'INTERVIEW', r.slice(0, 100));
  r = await ask(page, 'oops undo that');
  await chip(page, 'Undo it');
  w = await world(page);
  step('Curveball [mind]: undo the move', w.pipeline.find((p) => p.personId === 'p_ife').stage === 'SHORTLISTED');
  r = await ask(page, 'reject ife');
  step('Rejection asks for a job-related reason', /reason/i.test(r), r.slice(0, 100));
  r = await ask(page, 'she is too old for us');
  step('Curveball [info]: non-job-related reason refused', /can’t record that/.test(r), r.slice(0, 100));
  r = await ask(page, 'Another candidate was a closer fit for the role');
  w = await world(page);
  step('Rejected with internal reason + kind draft for approval (reason not in message)', w.pipeline.find((p) => p.personId === 'p_ife').stage === 'REJECTED' && msgsTo(w, 'p_ife').some((m) => m.status === 'DRAFT' && !/closer fit/.test(m.body)), r.slice(0, 120));
  await shot(page, '07-ngozi-pipeline-desktop', true);

  // ---- 6. Panel change by Seyi; Q tells Ngozi on her next visit ----
  await asActor(page, 'u_seyi', '/r/calendar');
  r = await ask(page, 'swap musa for bayo on tobis panel');
  step('Seyi swaps the panel; holds re-validated', /panel is now/.test(r) && /Re-checked|busy/.test(r), r.slice(0, 160));
  r = await ask(page, 'send ifes message');
  step('Seyi (hiring manager) can’t send: routed to approval queue', /can’t send this one yourself|approval/i.test(r), r.slice(0, 140));
  await asActor(page, 'u_ngozi', '/r/home');
  const s2 = await suggestions(page, /changed Tobi’s interview panel/);
  step('Proactive: Ngozi is told Seyi changed Tobi’s panel', /Seyi changed Tobi’s interview panel/.test(s2), s2.slice(0, 200));
  await shot(page, '08-ngozi-panel-notice-desktop');

  // ---- 7. Zara (candidate) reads the invite and asks to reschedule; Ngozi handles the counterproposal ----
  await asActor(page, 'p_zara', '/c/messages');
  const cm = await page.locator('.hc-thread').innerText();
  step('Zara sees only the sent invite (no drafts), with pay band and her own time zone', /Accra time/.test(cm) && /pay band/i.test(cm) && !/Tuesday 3 November at 14:00/.test(cm), cm.slice(0, 120));
  await shot(page, '09-zara-messages-desktop');
  r = await ask(page, 'sorry cant make that time, can we move it to thursday afternoon?');
  step('Zara: Q prepares a reschedule request and asks before sending', /Send it\?/.test(r), r.slice(0, 120));
  await chip(page, 'Send the request');
  w = await world(page);
  step('Curveball [mind]: reschedule requested (event RESCHEDULE_REQUESTED)', w.calendar.some((e) => e.personId === 'p_zara' && e.status === 'RESCHEDULE_REQUESTED'));
  await asActor(page, 'u_ngozi', '/r/messages');
  const s3 = await suggestions(page, /Zara asked to move/);
  step('Proactive: Ngozi sees Zara’s request', /Zara asked to move/.test(s3), s3.slice(0, 160));
  r = await ask(page, 'find a new time for zara');
  step('New time respects Zara’s Thursday afternoon', /Thu/.test(r) || (await page.locator('.ds-thread .hc-slots').last().innerText()).includes('Thu'), r.slice(0, 160));
  await chip(page, 'Draft the new time');
  r = await ask(page, 'ok send it');
  await chip(page, 'Approve and send');
  w = await world(page);
  step('Reschedule sent; event back to invited at the new time', w.calendar.some((e) => e.personId === 'p_zara' && e.status === 'INVITED' && new Date(e.start).getUTCDay() === 4));
  await asActor(page, 'p_zara', '/c/slots');
  await page.locator('.ds-btn', { hasText: 'Confirm this time' }).first().click(); await sleep(400);
  w = await world(page);
  step('Zara confirms on the slot picker → CONFIRMED', w.calendar.some((e) => e.personId === 'p_zara' && e.status === 'CONFIRMED'));
  await shot(page, '10-zara-slots-desktop');

  // ---- 8. Team and guidelines ----
  await asActor(page, 'u_ngozi', '/r/team');
  r = await ask(page, 'make musa a recruiter');
  w = await world(page);
  step('Admin changes a role by typing', w.actors.find((a) => a.id === 'u_musa').role === 'RECRUITER', r.slice(0, 100));
  await ask(page, 'undo'); await chip(page, 'Undo it');
  w = await world(page);
  step('Role change undone', w.actors.find((a) => a.id === 'u_musa').role === 'INTERVIEWER');
  await shot(page, '11-ngozi-team-desktop');
  r = await ask(page, 'draft an interview invite for ife');
  step('Won’t invite someone marked not progressing', /not progressing/.test(r), r.slice(0, 100));
  await go(page, '/r/setup');
  const setupTxt = await page.locator('.hc-guides').innerText();
  step('Setup shows guidelines with how often Q used them', /Used by Q \d+ time/.test(setupTxt));
  await shot(page, '12-ngozi-setup-desktop');
  r = await ask(page, 'seyi make me a viewer'); // nonsense-ish: should not break
  await asActor(page, 'u_seyi', '/r/team');
  r = await ask(page, 'make bayo an admin');
  step('Permission: hiring manager can’t change roles', /Only an admin/.test(r), r.slice(0, 100));
  await ctx.close();

  // ======================= Phone =======================
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const ph = await pctx.newPage(); await setup(ph);
  await ph.goto(`${BASE}/#/r/home`); await ph.evaluate(() => localStorage.clear()); await ph.reload(); await ph.waitForSelector('.ds-app'); await sleep(400);
  await asActor(ph, 'u_ngozi', '/r/people/p_tobi'); await sleep(400);
  r = await ask(ph, 'turn off the pay band rule pls', { phone: true });
  step('Admin turns a guideline off by typing', /Turned off/.test(r), r.slice(0, 80));
  r = await ask(ph, 'draft an interview invitation for Tobi', { phone: true });
  step('Phone: draft by typing', /draft interview invitation to Tobi/i.test(r), r.slice(0, 80));
  let pw = await world(ph);
  step('Guideline off changes what Q writes: no pay band in a first message', !msgsTo(pw, 'p_tobi').some((m) => m.status === 'DRAFT' && /pay band/i.test(m.body)) && !/Kora guideline v\d: Name the pay band/.test(r));
  r = await ask(ph, 'turn it back on, the pay band rule', { phone: true });
  r = await ask(ph, 'Change it to Friday and make the tone more friendly', { phone: true });
  pw = await world(ph);
  step('Guideline back on: the revised draft names the pay band', msgsTo(pw, 'p_tobi').some((m) => m.status === 'DRAFT' && /pay band/i.test(m.body)), r.slice(0, 80));
  await shot(ph, '13-phone-diff');
  r = await ask(ph, 'Send it', { phone: true });
  step('Phone: approval requested', /Approve this exact version/.test(r));
  await shot(ph, '14-phone-approval');
  await ph.locator('.ds-iconbtn[aria-label="Close Q"]').click().catch(() => {});
  for (const [route, name] of [['/r/messages', '15-phone-messages'], ['/r/pipeline', '16-phone-pipeline'], ['/r/calendar', '17-phone-calendar'], ['/r/team', '18-phone-team'], ['/r/setup', '19-phone-setup']]) {
    await go(ph, route); await sleep(300);
    const over = await ph.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    step(`Phone: ${route} has no horizontal page scroll`, over <= 1, `overflow ${over}px`);
    await shot(ph, name);
  }
  await asActor(ph, 'p_zara', '/c/messages');
  await shot(ph, '20-phone-zara-messages');
  await pctx.close();
} catch (e) { step('Script crashed', false, String(e).slice(0, 300)); }
finally { await browser.close(); }

const uniq = [...new Set(errors)];
step('No page errors', uniq.length === 0, uniq.slice(0, 5).join(' || '));
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
