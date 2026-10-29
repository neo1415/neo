// Candidate-initiated recruiter correspondence (audit addendum §C, AD-C-01..09) and the role briefing (J11 steps 1–2).
// Usage: BASE=http://localhost:5191 node qa/scripts/features/contact.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');
const BASE = (process.env.BASE || 'http://localhost:5191').replace(/\/$/, '');
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../captures/cx/contact'); mkdirSync(OUT, { recursive: true });
const results = []; const errors = [];
const step = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ` — ${String(info).slice(0, 200)}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nav = 0;
async function asActor(page, id, route) {
  await page.evaluate((id) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = id; localStorage.setItem('tq.world.v4', JSON.stringify(w)); }, id);
  await page.goto(`${BASE}/?n=${++nav}#${route}`); await page.waitForSelector('.ds-app'); await sleep(500);
}
const go = (page, r) => page.evaluate((r) => { location.hash = r; }, r).then(() => sleep(500));
async function lastQ(page) { const qs = page.locator('.ds-thread .ds-log > .ds-q'); const n = await qs.count(); return n ? qs.nth(n - 1).innerText() : ''; }
async function ask(page, text, phone = false) {
  if (phone && !(await page.locator('#q-ask').isVisible().catch(() => false))) { await page.locator('.ds-askbar button').click(); await page.waitForSelector('#q-ask'); }
  const before = await page.locator('.ds-thread .ds-log > *').count();
  await page.fill('#q-ask', text); await page.press('#q-ask', 'Enter');
  for (let i = 0; i < 40; i++) { await sleep(100); if ((await page.locator('.ds-thread .ds-log > *').count()) > before + 1) break; }
  await sleep(400); return lastQ(page);
}
async function chip(page, label) { await page.locator('.ds-thread .ds-chip', { hasText: label }).last().click(); await sleep(600); }
const world = (page) => page.evaluate(() => window.__tqQA.getWorld());
const kora = (w) => w.threads.find((t) => t.orgId === 'org_kora' && t.personId === 'p_tobi' && t.initiatedBy === 'CANDIDATE');
const canvas = (page) => page.locator('#ds-content, .ds-canvas').first().innerText();

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ds-app');
  await asActor(page, 'p_tobi', '/c/jobs/j_kora_backend');

  // ---- J11 step 1: the role briefing ----
  step('Briefing: player, 5 chapters and a transcript on the job page', (await page.locator('.cr-brief').count()) === 1 && (await page.locator('.cr-chapters button').count()) === 5 && (await page.locator('.cr-transcript li').count()) >= 3);
  step('Briefing is labelled as a simulated video', /Simulated video/i.test(await page.locator('.cr-brief').innerText()));
  await page.locator('.cr-play').click(); await sleep(2300); await page.locator('.cr-play').click();
  step('Play advances the time', !/0:00 \//.test(await page.locator('.cr-time').innerText()), await page.locator('.cr-time').innerText());
  await page.locator('.cr-chapters button', { hasText: 'On-call' }).click(); await sleep(200);
  step('Chapter jump marks the chapter current', (await page.locator('.cr-chapters button[aria-current="true"]').innerText()).includes('On-call'));
  let r = await ask(page, 'is the on-call real?');
  step('Q answers from the transcript and quotes the time (1:12)', /1:12/.test(r) && /on-call is real/.test(r), r);
  await chip(page, 'Play from 1:12');
  step('"Play from 1:12" seeks the player to that line', /on-call is real/.test(await page.locator('.cr-transcript li[data-now="1"]').innerText()) && /1:12/.test(await page.locator('.cr-time').innerText()));
  await page.screenshot({ path: `${OUT}/01-briefing-desktop.png` });

  // ---- J11 step 2: policy before drafting, editable 3-line question, sent in-app ----
  const card = await page.locator('.cr-contact').innerText();
  step('Contact card shows Kora’s policy before any draft', /Before or after you apply/.test(card) && /careers@kora\.example/.test(card) && /2 left/.test(card) && (await page.locator('.cr-contact textarea').count()) === 0, card);
  step('No personal recruiter address is shown', !/ada@kora|ngozi\.eze|seyi@/.test(await canvas(page)));
  r = await ask(page, 'can I contact someone about this role?');
  step('Q states the policy first, then a short question to edit', /welcomes questions before you apply/.test(r) && /2 new conversations a week/.test(r) && /personal addresses aren’t shared/.test(r) && /Send it in Talent Q\?/.test(r), r);
  const draft = await page.locator('.cr-contact textarea').inputValue().catch(() => '');
  step('The draft is on the page, editable, 3 lines', draft.split('\n').length === 3 && /Senior Backend Engineer/.test(draft), draft);
  r = await ask(page, 'send it');
  let w = await world(page); const t = kora(w);
  step('Sent in-app: thread initiatedBy CANDIDATE, state OPEN, role m_backend', !!t && t.state === 'OPEN' && t.mandateId === 'm_backend' && t.messages[0].channel === 'IN_APP' && /Simulated|simulated/.test(r), r);
  step('Rate limit recorded (1 of 2 this week)', w.areas.mail.contactLog.filter((c) => c.personId === 'p_tobi' && c.orgId === 'org_kora').length === 1);
  await go(page, '/c/messages');
  await page.locator('.hc-row', { hasText: 'Kora Pay' }).click(); await sleep(300);
  let cm = await canvas(page);
  step('Candidate messages: status “Sent”, and what Tobi can still do', /Sent/.test(cm) && /You started this conversation/.test(cm), cm.slice(0, 200));
  await page.locator('.hc-row', { hasText: 'Medlink' }).click(); await sleep(300);
  cm = await canvas(page);
  step('Timeout shown honestly (Medlink: no reply yet, not a rejection)', /No reply yet/.test(cm) && /isn’t a rejection/.test(cm), cm.slice(0, 300));
  await page.screenshot({ path: `${OUT}/02-timeout-desktop.png` });

  // ---- Seen (when known) ----
  await asActor(page, 'u_ada', '/r/messages');
  await page.locator('.hc-row', { hasText: 'Tobi' }).click(); await sleep(700);
  step('Recruiter: thread marked as started by the candidate', /Started by Tobi/.test(await canvas(page)) && /They started it/.test(await page.locator('.hc-list').innerText()));
  await asActor(page, 'p_tobi', '/c/messages');
  await page.locator('.hc-row', { hasText: 'Kora Pay' }).click(); await sleep(300);
  step('Candidate sees “Seen by Kora Pay” once someone opened it', /Seen by Kora Pay/.test(await canvas(page)));

  // ---- Rate limit and anti-abuse ----
  await page.evaluate(() => window.__tqQA.update((w) => { w.areas.mail.contactLog.push({ personId: 'p_tobi', orgId: 'org_kora', at: new Date().toISOString() }); }));
  await go(page, '/c/jobs/j_kora_data');
  r = await ask(page, 'can I contact someone about this role?');
  step('Weekly limit enforced: third new conversation refused, with when and why', /their limit/.test(r) || /already have a conversation/.test(r), r);

  // ---- Rivers: off, published route, never an address ----
  await go(page, '/c/jobs/j_rivers_backend');
  const rc = await page.locator('.cr-contact').innerText();
  step('Rivers: contact off, published route shown', /Not taken/.test(rc) && /application form only/.test(rc), rc);
  r = await ask(page, 'can I contact someone about this role?');
  step('Rivers: Q refuses, offers the route, never an invented address', /application form only/.test(r) && !/@/.test(r) && /won’t look up or guess/.test(r), r);
  step('Rivers: no address anywhere on the page', !/@[a-z]/.test(await canvas(page)));

  // ---- Medlink: after applying (Tobi applied) ----
  await go(page, '/c/jobs/j_medlink_ba');
  step('Medlink (not applied to this listing): after applying only', /After you apply/.test(await page.locator('.cr-contact').innerText()) && (await page.locator('.cr-contact textarea').count()) === 0);

  // ---- Mute and consent revoked ----
  await go(page, '/c/messages'); await page.locator('.hc-row', { hasText: 'Kora Pay' }).click(); await sleep(300);
  await page.locator('.em-tactions button', { hasText: 'Mute' }).click(); await sleep(400);
  w = await world(page);
  step('Candidate mutes the conversation', kora(w).state === 'MUTED' && /Muted/.test(await canvas(page)));
  await page.locator('.em-tactions button', { hasText: 'Unmute' }).click(); await sleep(300);
  await page.locator('.em-tactions button', { hasText: 'Stop Kora Pay contacting me' }).click(); await sleep(200);
  await page.locator('.ds-confirm .ds-btn', { hasText: 'Stop contact' }).click(); await sleep(500);
  w = await world(page);
  step('Consent revoked: state, consent record, and “can’t be unsent” said plainly', kora(w).state === 'CONSENT_REVOKED' && w.consents.p_tobi.withdrawnFrom.includes('org_kora') && /can’t be unsent/.test(await lastQ(page) + await canvas(page)));
  await page.screenshot({ path: `${OUT}/03-consent-desktop.png` });
  await asActor(page, 'u_ada', '/r/messages');
  r = await ask(page, 'email Tobi an interview invite for Thursday or Friday');
  step('Recruiter can’t draft to someone who withdrew consent', /withdrew consent/.test(r), r);
  await ctx.close();

  // ======================= Phone =======================
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pp = await pctx.newPage(); pp.on('pageerror', (e) => errors.push(e.message));
  await pp.goto(`${BASE}/#/r/home`); await pp.evaluate(() => localStorage.clear()); await pp.reload(); await pp.waitForSelector('.ds-app');
  await asActor(pp, 'p_tobi', '/c/jobs/j_kora_backend');
  step('Phone: briefing and contact card render', (await pp.locator('.cr-brief').count()) === 1 && (await pp.locator('.cr-contact').count()) === 1);
  r = await ask(pp, 'is the on-call real', true);
  step('Phone: on-call answer quotes 1:12', /1:12/.test(r), r);
  r = await ask(pp, 'can i message someone at kora about this job', true);
  step('Phone: policy first, then the draft', /welcomes questions/.test(r), r);
  r = await ask(pp, 'yes send it', true);
  step('Phone: sent in-app', !!kora(await world(pp)), r);
  for (const route of ['/c/jobs/j_kora_backend', '/c/messages', '/c/jobs/j_rivers_backend']) {
    await go(pp, route); await sleep(300);
    const over = await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    step(`Phone: ${route} has no horizontal page scroll`, over <= 1, `overflow ${over}px`);
  }
  await go(pp, '/c/jobs/j_kora_backend'); await pp.screenshot({ path: `${OUT}/04-job-phone.png`, fullPage: true });
  await pctx.close();
} catch (e) { step('Script crashed', false, String(e).slice(0, 300)); }
await browser.close();
const uniq = [...new Set(errors)];
step('No page errors', uniq.length === 0, uniq.slice(0, 5).join(' || '));
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);
