// Feature: hiring campaigns and requisition organisation (audit addendum §D, AD-D-01…08; J11 step 4).
// Usage: node qa/scripts/features/campaigns.mjs [baseUrl]   (default http://localhost:5192/)
// PASS/FAIL lines, like the journey scripts. Desktop 1440×900 and phone 390×844.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');

const BASE = (process.argv[2] || 'http://localhost:5192/').replace(/\/?$/, '/');
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../captures/cx/campaigns');
mkdirSync(OUT, { recursive: true });
const results = []; const errors = [];
const step = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info && !ok ? ` — ${String(info).slice(0, 220)}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nav = 0;

function setup(page) {
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', async (m) => { if (m.type() === 'error' && !/favicon|DevTools/.test(m.text())) { const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => ''))); errors.push(`console: ${m.text().slice(0, 120)} ${args.slice(1).map(String).join(' ').slice(0, 400)} @${page.url().split('#')[1]}`); } });
}
async function asActor(page, id, route) {
  await page.evaluate((id) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = id; localStorage.setItem('tq.world.v4', JSON.stringify(w)); }, id);
  await page.goto(`${BASE}?n=${++nav}#${route}`); await page.waitForSelector('.ds-app'); await sleep(500);
  // A pending write from the previous page can win the race; set the actor through the store if so.
  for (let i = 0; i < 3; i++) {
    try { if ((await page.evaluate(() => window.__tqQA.getWorld().session.actor)) !== id) { await page.evaluate((id) => window.__tqQA.update((w) => { w.session.actor = id; }), id); await sleep(500); } break; }
    catch { await page.waitForSelector('.ds-app'); await sleep(500); }
  }
}
async function go(page, route) { await page.evaluate((r) => { location.hash = r; }, route); await sleep(500); }
const route = (page) => page.evaluate(() => location.hash.slice(1).split('?')[0]);
const canvas = (page) => page.locator('.ds-canvas').first().innerText();
async function ask(page, text, { phone = false } = {}) {
  if (phone && !(await page.locator('#q-ask').isVisible().catch(() => false))) { await page.locator('.ds-askbar button').click(); await page.waitForSelector('#q-ask'); }
  const before = await page.locator('.ds-thread .ds-log > *').count();
  const qBefore = await page.locator('.ds-thread .ds-log > .ds-q').count();
  await page.fill('#q-ask', text); await page.press('#q-ask', 'Enter');
  for (let i = 0; i < 40; i++) { await sleep(100); if ((await page.locator('.ds-thread .ds-log > *').count()) > before + 1) break; }
  await sleep(400);
  // Background agents (agency runs) can post into the thread at the same moment: read every new Q message.
  const qs = page.locator('.ds-thread .ds-log > .ds-q'); const n = await qs.count();
  const out = []; for (let i = qBefore; i < n; i++) out.push(await qs.nth(i).innerText().catch(() => ''));
  return out.join('\n') || lastQ(page);
}
async function lastQ(page) { const qs = page.locator('.ds-thread .ds-log > .ds-q'); const n = await qs.count(); return n ? qs.nth(n - 1).innerText() : ''; }
async function chip(page, label) { await page.locator('.ds-thread .ds-chip', { hasText: label }).last().click(); await sleep(600); }
const world = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
const camp = (w, id) => w.areas.campaigns.list.find((c) => c.id === id);
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const browser = await chromium.launch();
try {
  // =============================== Desktop: Ada (Kora Pay) ===============================
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); setup(page);
  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ds-app');

  await asActor(page, 'u_ada', '/r/home');
  step('Rail: "Campaigns" sits in the Hiring group', await page.locator('.ds-rail .ds-navlink', { hasText: 'Campaigns' }).count() === 1);
  await page.locator('.ds-rail .ds-navlink', { hasText: 'Campaigns' }).click(); await sleep(500);
  let t = await canvas(page);
  step('List: Kora’s two campaigns, never Talentbridge’s client campaigns', /Q4 Engineering Expansion/.test(t) && /Merchant Success 2026/.test(t) && !/agency|Medlink|Talentbridge/i.test(t), t.slice(0, 200));
  step('List: lede says what needs Ada', /needs? you|nothing needs you/.test(t));
  await shot(page, 'd-01-list');

  // J11 step 3's result (routed by the email area), then step 4: the message shows under Senior Backend.
  await page.evaluate(() => window.__tqQA.update((w) => { w.threads.push({ id: 't_j11_tobi', orgId: 'org_kora', personId: 'p_tobi', mandateId: 'm_backend', campaignId: 'c_q4_eng', initiatedBy: 'CANDIDATE', state: 'OPEN', messages: [{ id: 'mj11', from: 'p_tobi', to: 'org_kora', body: 'Hello, is the on-call rota real for this role, and how often would I be on call?', at: '2026-10-29T08:40:00+01:00', status: 'RECEIVED', channel: 'IN_APP' }] }); }));
  await go(page, '/r/campaigns/c_q4_eng');
  t = await canvas(page);
  step('J11-4 overview: both roles with stage strips (count + stage name)', /Senior Backend Engineer/.test(t) && /Backend Engineer, Payouts/.test(t) && (await page.locator('.cp-strip li').count()) >= 3 && /3\s*Shortlisted/.test(t), t.slice(0, 300));
  step('J11-4 overview: owners, deadlines and next actions', /Owner Ada/.test(t) && /due 5 Dec/.test(t) && /NEXT|Next/.test(t));
  step('J11-4 overview: approvals waiting (Payouts brief waits for Bayo)', /waiting for Bayo/.test(t) && /approvals? waiting/.test(t));
  const msgs = await page.locator('#cp-msgs').innerText();
  step('J11-4 Tobi’s message is under Senior Backend, marked "they wrote first"', /Senior Backend Engineer[\s\S]*Tobi Adeyemi/.test(msgs) && /They wrote first/.test(msgs), msgs.slice(0, 300));
  step('J11-4 next action: reply to Tobi', /Tobi wrote about Senior Backend Engineer/.test(t));
  step('Messages grouped by person (Zara once per role)', (msgs.match(/Zara Mensah/g) ?? []).length === 1, msgs);
  const boardT = await page.locator('#cp-board').innerText();
  step('Cross-role board: Ifeoma on both roles', /Ifeoma Obi[\s\S]*Shortlisted[\s\S]*Found/.test(boardT) && /On two roles/.test(boardT), boardT.slice(0, 300));
  await page.locator('#cp-board .ds-filter', { hasText: 'In more than one role' }).click(); await sleep(300);
  step('Saved filter "In more than one role" shows only Ifeoma', (await page.locator('#cp-board tbody tr').count()) === 1);
  await page.locator('#cp-board .ds-filter', { hasText: 'Waiting for a reply' }).click(); await sleep(300);
  await page.locator('#cp-board .ds-linkbtn', { hasText: 'Save this filter' }).click(); await page.fill('#cp-fname', 'Reply today'); await page.locator('.cp-save button[type=submit]').click(); await sleep(400);
  let w = await world(page);
  step('Save a filter: stored on the campaign and audited', camp(w, 'c_q4_eng').savedFilters.some((f) => f.label === 'Reply today' && f.query === 'reply') && w.events.some((e) => e.type === 'campaign.filter.saved'));
  const sc0 = await page.locator('#cp-scores').innerText();
  step('Scorecards: no approved rubric → nobody assessed, no index', /No approved rubric/.test(sc0) && !/coverage\b(?!,)/.test(sc0.replace(/shown only with its coverage/, '')), sc0.slice(0, 200));
  await shot(page, 'd-02-overview');

  // A rubric approved by the rubric area, with ratings for Tobi on two of four criteria → index with coverage.
  await page.evaluate(() => window.__tqQA.update((w) => {
    const crit = (id, weight) => ({ id, label: id, kind: 'SKILL', weight, anchors: ['0', '1', '2', '3', '4'], evidenceToInspect: [], questions: [], method: '', why: '' });
    w.areas.rubrics.list = w.areas.rubrics.list.filter((r) => r.mandateId !== 'm_backend');
    w.areas.rubrics.list.push({ id: 'rb_test', mandateId: 'm_backend', orgId: 'org_kora', versions: [{ v: 1, state: 'APPROVED', criteria: [crit('pay', 2), crit('go', 1), crit('pg', 1), crit('inc', 2)], at: '2026-10-29', by: 'u_ada', approvedBy: 'u_ada', note: 'test' }] });
    const r = (c, rating) => ({ id: `rt_${c}`, rubricId: 'rb_test', v: 1, personId: 'p_tobi', criterionId: c, rating, uncertainty: 'LOW', refs: [], note: '', source: 'REVIEWER', by: 'u_ada', at: '2026-10-29', reviewed: true });
    w.areas.rubrics.ratings = [...w.areas.rubrics.ratings.filter((x) => x.rubricId !== 'rb_test'), r('pay', 4), r('pg', 2)];
  }));
  await sleep(400);
  const sc1 = await page.locator('#cp-scores').innerText();
  step('Scorecard: rubric v1 in force, 1 assessed, index shown WITH coverage (83 at 50%)', /Rubric v1 in force/.test(sc1) && /1 of 4 people\s*assessed/.test(sc1) && /83 at 50% coverage/.test(sc1), sc1.slice(0, 300));
  const idxOnly = await page.evaluate(() => [...document.querySelectorAll('#cp-scores .cp-cov')].every((el) => /coverage/.test(el.textContent)));
  step('Never an index without coverage', idxOnly);

  // ---------------- Q skills ----------------
  let r = await ask(page, 'create a campaign called Data Team 2027');
  w = await world(page);
  const dt = w.areas.campaigns.list.find((c) => c.name === 'Data Team 2027');
  step('Q: "create a campaign called …" creates it, owned by Ada, audited', !!dt && dt.owner === 'u_ada' && w.events.some((e) => e.type === 'campaign.created' && e.data?.campaignId === dt?.id), r);
  step('Q: navigates to the new campaign and shows the empty state', (await route(page)) === `/r/campaigns/${dt?.id}` && /No roles yet/.test(await canvas(page)));
  await shot(page, 'd-03-empty');
  r = await ask(page, 'add the payouts role to it');
  step('Conflict: Payouts is in Q4 → Q asks to move, nothing changed yet', /already in “Q4 Engineering Expansion”/.test(r) && camp(await world(page), 'c_q4_eng').roles.includes('m_payouts'), r);
  await chip(page, 'Move it to Data Team 2027');
  w = await world(page);
  step('Move: role leaves Q4 and joins Data Team (never in two campaigns)', !camp(w, 'c_q4_eng').roles.includes('m_payouts') && camp(w, dt.id).roles.includes('m_payouts'));
  step('Move audited on both campaigns', w.events.some((e) => e.type === 'campaign.role.removed' && e.data?.campaignId === 'c_q4_eng') && w.events.some((e) => e.type === 'campaign.role.added' && e.data?.campaignId === dt.id));
  await ask(page, 'undo that'); await chip(page, 'Undo it');
  w = await world(page);
  step('Undo restores Payouts to Q4', camp(w, 'c_q4_eng').roles.includes('m_payouts') && !camp(w, dt.id).roles.includes('m_payouts'), JSON.stringify(camp(w, dt.id).roles));
  r = await ask(page, 'add the iOS role to Data Team 2027');
  step('Closed role refused with the way back (re-open the role first)', /closed, so it can’t join a campaign/.test(r) && !camp(await world(page), dt.id).roles.includes('m_kora_ios'), r);
  r = await ask(page, 'take the payouts role out of Q4 engineering');
  step('Q: take a role out (role itself unchanged)', !camp(await world(page), 'c_q4_eng').roles.includes('m_payouts') && /unchanged/.test(r), r);
  r = await ask(page, 'add the payouts role to Q4 engineering');
  step('Q: "add the payouts role to Q4 engineering"', camp(await world(page), 'c_q4_eng').roles.includes('m_payouts') && /now in “Q4 Engineering Expansion”/.test(r), r);
  r = await ask(page, 'summarise the Q4 engineering campaign');
  step('Q: summary from live state, with a campaign card', /Senior Backend Engineer: \d+ in play/.test(r) && /Payouts: [^.]*brief is still a draft/.test(r) && (await page.locator('.ds-thread .cp-ref').count()) > 0, r);
  await go(page, '/r/home');
  r = await ask(page, 'show me the Q4 campaign');
  step('Q: "show me the Q4 campaign" opens it', (await route(page)) === '/r/campaigns/c_q4_eng', r);
  r = await ask(page, 'what needs me in this campaign');
  step('Q: "what needs me in this campaign" lists Ada’s actions', /need/.test(r) && /Tobi wrote about Senior Backend/.test(r), r);
  r = await ask(page, 'archive it');
  w = await world(page);
  step('Q: "archive it" (context kept) archives Q4; roles untouched; audited', camp(w, 'c_q4_eng').status === 'ARCHIVED' && /nothing was closed/.test(r) && w.events.some((e) => e.type === 'campaign.archived' && e.data?.campaignId === 'c_q4_eng') && w.mandates.find((m) => m.id === 'm_payouts').status === 'DRAFT', r);
  t = await canvas(page);
  step('Archived banner with Re-open, history shows the archive', /This campaign is archived/.test(t) && /archived “Q4 Engineering Expansion”/.test(await page.locator('#cp-hist').innerText()));
  await shot(page, 'd-04-archived');
  await page.locator('.ds-banner .ds-btn', { hasText: 'Re-open' }).click(); await sleep(500);
  w = await world(page);
  step('Re-open from the page; audited', camp(w, 'c_q4_eng').status === 'ACTIVE' && w.events.some((e) => e.type === 'campaign.reopened'));
  await page.locator('#cp-hist .ds-btn', { hasText: 'Archive campaign' }).click(); await sleep(400);
  r = await ask(page, 'undo that'); await chip(page, 'Undo it');
  step('Archive from the page is undoable', camp(await world(page), 'c_q4_eng').status === 'ACTIVE');
  r = await ask(page, 'whats the difference between a hiring campaign and an outreach campaign');
  step('Q explains hiring vs outreach campaigns', /outreach campaign is narrower/.test(r), r);

  // Proactive: only within 10 days of the deadline (a deadline 7 weeks away is not news).
  const cards = async () => { await page.locator('.ds-suggest-more[aria-expanded="false"]').first().click({ timeout: 600 }).catch(() => {}); await sleep(300); return (await page.locator('.ds-suggest').allInnerTexts()).join(' | '); };
  await go(page, '/r/campaigns');
  step('Proactive: no deadline card 7 weeks out', !/is due in \d+ days/.test(await cards()));
  await page.evaluate(() => window.__tqQA.update((w) => { w.session.offsetDays = 45; })); await sleep(500);
  let cs = await cards();
  step('Proactive: within 10 days of the deadline, the draft Payouts brief is flagged with a reason', /Q4 Engineering Expansion” is due in \d+ days, and the Backend Engineer, Payouts brief is still a draft waiting for Bayo/.test(cs), cs.slice(0, 300));
  await page.evaluate(() => window.__tqQA.update((w) => { w.session.offsetDays = 0; })); await sleep(300);

  // Roles page grouped by campaign; legacy Senior Backend reachable
  await go(page, '/r/roles');
  t = await canvas(page);
  step('Roles page groups roles by campaign', /Campaign · Q4 Engineering Expansion[\s\S]*Senior Backend Engineer[\s\S]*Backend Engineer, Payouts/i.test(t) && /Campaign · Merchant Success 2026[\s\S]*Customer Support Lead/i.test(t) && /Not in a campaign[\s\S]*Mobile Engineer/i.test(t), t.slice(0, 400));
  await shot(page, 'd-05-roles');
  await go(page, '/r/roles/m_backend');
  t = await canvas(page);
  step('Role page shows its campaign (legacy Senior Backend too)', /Part of the Q4 Engineering Expansion campaign/.test(t) && /Open the full brief/.test(t));
  step('Role page links to the rubric with the version in force', /Rubric v1 in force/.test(t) && /\/r\/roles\/m_backend\/rubric$/.test(await page.getByRole('link', { name: /Rubric v1 in force/ }).first().getAttribute('href')), await page.evaluate(() => [...document.querySelectorAll('a')].filter((a) => /Rubric/.test(a.textContent)).map((a) => a.getAttribute('href') + ' ' + a.textContent).join(' | ')));
  await go(page, '/r/roles/m_payouts');
  step('Role page (MandateX) shows its campaign', /Part of the Q4 Engineering Expansion campaign/.test(await canvas(page)));

  // Tenant isolation: Ada can't open Talentbridge's client campaign for Kora
  await go(page, '/r/campaigns/c_tb_kora');
  t = await canvas(page);
  step('Tenant: Ada can’t see Talentbridge’s campaign about Kora (no names leak)', /don’t have access/.test(t) && !/Dayo|Payments Platform/.test(t), t.slice(0, 200));

  // Viewer can't reorganise (Tunde at Talentbridge)
  await asActor(page, 'u_tunde', '/r/campaigns');
  r = await ask(page, 'archive the kora pay backend agency hiring campaign');
  step('Viewer: archive refused with the reason', /viewer/i.test(r) && camp(await world(page), 'c_tb_kora').status === 'ACTIVE', r);

  // =============================== Agency: Dele ===============================
  await asActor(page, 'u_dele', '/r/campaigns');
  await page.locator('.agency-lens-opt', { hasText: 'Kora Pay' }).click(); await sleep(300);
  t = await canvas(page);
  step('Agency list: Kora’s client campaign only, with the client lens', /Kora Pay · Backend \(agency\)/.test(t) && !/Medlink Health · Claims/.test(t) && /Showing Kora Pay only/.test(t), t.slice(0, 300));
  await page.locator('.agency-lens-opt', { hasText: 'Medlink' }).click(); await sleep(400);
  t = await canvas(page);
  step('Agency list: switching the lens shows Medlink’s, never mixed', /Medlink Health · Claims and operations/.test(t) && !/Kora Pay · Backend/.test(t));
  await shot(page, 'd-06-dele-list');
  await go(page, '/r/campaigns/c_tb_kora');
  t = await canvas(page);
  step('Agency overview: lens follows the campaign’s client', /Showing Kora Pay only/.test(t));
  step('Outreach runs listed as children of a role', /Outreach runs[\s\S]*Payments engineers: first contact[\s\S]*for Payments Platform Engineer/.test(t), t.slice(-600));
  step('Agency: hidden people are counted, not named', /more person isn’t shown|more people aren’t shown/.test(t));
  await shot(page, 'd-07-dele-overview');
  r = await ask(page, 'add the claims API role to this campaign');
  step('Agency: a Medlink role can’t join Kora’s campaign (client isolation)', /client campaign only holds that client’s roles/.test(r) && !camp(await world(page), 'c_tb_kora').roles.includes('m_tb_med_api'), r);
  r = await ask(page, 'create a hiring campaign called Kora Data 2027');
  w = await world(page);
  const kd = w.areas.campaigns.list.find((c) => c.name === 'Kora Data 2027');
  step('Agency: new hiring campaign is scoped to the client in focus', kd?.orgId === 'org_tb' && kd?.clientOrgId === 'org_kora', JSON.stringify(kd));
  await go(page, '/r/agency/campaigns');
  t = await canvas(page);
  step('Outreach page links each run to its parent hiring campaign', /Part of the hiring campaign\s*Kora Pay · Backend \(agency\)/.test(t), t.slice(0, 500));
  r = await ask(page, 'launch the kora campaign');
  step('Outreach skill still owns "launch the kora campaign"', /Payments engineers: first contact|brief isn’t signed|launch/i.test(r) && !/hiring campaign/.test(r), r);
  await shot(page, 'd-08-outreach');
  await ctx.close();

  // =============================== Phone ===============================
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const ph = await pctx.newPage(); setup(ph);
  await ph.goto(`${BASE}#/r/home`); await ph.evaluate(() => localStorage.clear()); await ph.reload(); await ph.waitForSelector('.ds-app');
  await asActor(ph, 'u_ada', '/r/campaigns');
  step('Phone list: no sideways scroll', await noSideways(ph));
  step('Phone list: "New campaign" reachable', await ph.locator('.ds-canvas .ds-btn', { hasText: 'New campaign' }).isVisible());
  await shot(ph, 'p-01-list');
  await go(ph, '/r/campaigns/c_q4_eng');
  step('Phone overview: no sideways scroll', await noSideways(ph));
  step('Phone overview: in-page index present', (await ph.locator('.ds-pageindex a').count()) >= 5);
  step('Phone board: one card per person (no table)', (await ph.locator('.cp-board-cards > li').count()) >= 4 && (await ph.locator('table.cp-board').count()) === 0);
  step('Phone: primary action in "Needs you" ≥ 44px', ((await ph.locator('#cp-needs .ds-btn').first().boundingBox())?.height ?? 0) >= 44);
  await shot(ph, 'p-02-overview');
  r = await ask(ph, 'summarise this campaign', { phone: true });
  step('Phone Q: summary works', /Senior Backend Engineer/.test(r), r);
  await asActor(ph, 'u_dele', '/r/campaigns/c_tb_kora');
  step('Phone agency overview: no sideways scroll', await noSideways(ph));
  await shot(ph, 'p-03-dele');
  await pctx.close();
} catch (e) {
  step('script error', false, e.stack);
} finally {
  await browser.close();
  const bad = errors.filter((e) => !/Failed to load resource/.test(e));
  step('No page errors', bad.length === 0, bad.slice(0, 3).join(' | '));
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail ? 1 : 0);
}
