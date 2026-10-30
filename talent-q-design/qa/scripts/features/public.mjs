// Public site: SC-001 landing, SC-002 how it works, SC-003 employers, SC-004 talent, SC-005 pricing (hypotheses),
// SC-006 trust, SC-008 sign in (simulated), SC-013 sample Q. Desktop 1440×900 and phone 390×844.
// Usage: BASE=http://localhost:5211 node qa/scripts/features/public.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');
const BASE = (process.env.BASE || 'http://localhost:5211').replace(/\/$/, '');
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../captures/features/public'); mkdirSync(OUT, { recursive: true });
const results = []; const errors = [];
let V = 'd';
const step = (name, ok, info = '') => { results.push({ name: `[${V}] ${name}`, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${V}] ${name}${info && !ok ? ` — ${String(info).replace(/\s+/g, ' ').slice(0, 240)}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nav = 0;
const open = async (page, route) => { await page.goto(`${BASE}/?n=${++nav}#${route}`); await page.waitForSelector('.ps'); await sleep(450); };
const go = (page, r) => page.evaluate((r) => { location.hash = r; }, r).then(() => sleep(450));
const route = (page) => page.evaluate(() => location.hash.slice(1));
const world = (page) => page.evaluate(() => window.__tqQA.getWorld());
const text = (page, sel = '#ps-main') => page.locator(sel).first().innerText();
const shot = (page, name) => page.screenshot({ path: `${OUT}/${V}-${name}.png`, fullPage: true });
async function fresh(page) { await page.goto(`${BASE}/#/site`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ps'); await sleep(300); }
async function noSideways(page) { return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth); }
async function minFont(page) {
  return page.evaluate(() => { let m = 99; for (const el of document.querySelectorAll('#ps-main *, .ps-header *, .ps-foot *')) { if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const r = el.getBoundingClientRect(); if (!r.width || el.closest('.sr')) continue; m = Math.min(m, parseFloat(getComputedStyle(el).fontSize)); } return m; });
}
/** The sample Q panel on this page: inline (landing, ask page) or the dock/sheet (others). */
async function qPanel(page) {
  if (await page.locator('#ps-main .pq').count()) return page.locator('#ps-main .pq').first();
  await page.locator('.ps-askpill, .ps-askbar button').first().click(); await page.waitForSelector('[role="dialog"] .pq'); await sleep(350);
  return page.locator('[role="dialog"] .pq');
}
async function askQ(page, panel, q) {
  const before = await panel.locator('.pq-q').count();
  await panel.locator('.pq-input').fill(q); await panel.locator('.pq-input').press('Enter');
  for (let i = 0; i < 30; i++) { await sleep(100); if ((await panel.locator('.pq-q').count()) > before || (await panel.locator('.pq-offline').count())) break; }
  await sleep(250); const qs = panel.locator('.pq-q'); return qs.nth((await qs.count()) - 1).innerText();
}

async function run(viewport, v) {
  V = v; const phone = v === 'm';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: phone ? 2 : 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${v}] ${e.message}`));
  try {
    await fresh(page);

    // ---- Route "/" is untouched and links to the site ----
    await page.goto(`${BASE}/?n=${++nav}#/`); await sleep(400);
    step('Route: / still renders the founder’s prototype start, with a link to /site', /Hire by talking/.test(await page.locator('body').innerText()) && (await page.locator('a[href="#/site"]').count()) === 1);

    // ---- SC-001 landing ----
    await open(page, '/site');
    let t = await text(page);
    step('SC-001: the commercial line is the title', (await page.locator('h1').innerText()).includes('Evidence-first hiring, with Q doing the work.'));
    step('SC-001: an entry for each side (hiring, looking for work) with the candidate line', (await page.locator('.pl-door').count()) === 2 && /Show what you can do, even if your CV doesn’t\./.test(t));
    step('SC-001: both promises appear verbatim', /Tell Q what needs doing\. See candidates who demonstrate the skills/.test(t) && /Show your real capabilities once, choose who sees them/.test(t));
    step('SC-001: Q is present (gold mark) as a labelled sample conversation', (await page.locator('#ps-main .pq svg').count()) > 0 && /sample conversation/i.test(await page.locator('#ps-main .pq').innerText()));
    step('SC-001: the page says plainly there are no results to claim yet', /no customer results to show yet/.test(t));
    step('SC-001: "Get started" leads to /signup', phone ? (await page.locator('a[href="#/signup"]').count()) > 0 : (await page.locator('.ps-header a[href="#/signup"]').count()) === 1);
    step('SC-001: no sideways scroll; body text ≥ 12px', (await noSideways(page)) && (await minFont(page)) >= 12, await minFont(page));
    await shot(page, '01-landing');

    // ---- SC-013 sample Q ----
    let panel = await qPanel(page);
    step('SC-013: empty state is the page opener with suggested questions', /Try me on a role/.test(await panel.innerText()) && (await panel.locator('.ds-chip').count()) >= 3);
    let r = await askQ(page, panel, 'Compare two sample candidates');
    step('SC-013: comparison is labelled fictional and sample, with no overall score', /fictional/i.test(r) && /Sample/.test(r) && /Strong claims, limited supporting evidence/.test(r) && /never turns it into one score/.test(r), r);
    r = await askQ(page, panel, 'show me real candidates in Lagos');
    step('SC-013: permission denied: it refuses to show or search real people', /can’t search or show real people/.test(r) && /not allowed here/i.test(r), r);
    r = await askQ(page, panel, 'is it accurate? better than linkedin?');
    step('SC-013: no unproven claims: accuracy is "not proven yet"', /isn’t proven yet/.test(r) && /don’t claim it finds better people than LinkedIn/.test(r), r);
    r = await askQ(page, panel, 'what does it cost');
    step('SC-013: prices are given as hypotheses, no payment', /Hypothesis/.test(r) && /not proven prices/i.test(r) && /\$149–\$399/.test(r), r);
    r = await askQ(page, panel, 'a backend engineer who can fix slow postgres queries');
    step('SC-013: a described role becomes sample criteria the recruiter approves', /PostgreSQL/.test(r) && /you approve or change every line/.test(r), r);
    r = await askQ(page, panel, 'what is the weather like');
    step('SC-013: unknown questions get an honest fallback, not an invented answer', /only have a few sample answers/.test(r), r);
    await shot(page, '02-sample-q');
    await panel.locator('.ds-chip', { hasText: 'Create an account' }).first().click().catch(async () => { await askQ(page, panel, 'sign up'); await panel.locator('.ds-chip', { hasText: 'Create an account' }).last().click(); });
    await sleep(400);
    step('SC-013: the sample leads into /signup', (await route(page)) === '/signup', await route(page));

    // Error state + retry, and the accessible list (ask page)
    await open(page, '/site/ask');
    panel = page.locator('#ps-main .pq');
    step('SC-013: the conversation persists across public pages in this tab', (await panel.locator('.pq-me').count()) >= 5);
    await page.locator('button', { hasText: 'Start over' }).click(); await sleep(200);
    step('SC-013: "Start over" empties the conversation', (await panel.locator('.pq-me').count()) === 0);
    await page.locator('button', { hasText: 'Simulate a dropped connection' }).click();
    await panel.locator('.pq-input').fill('Who sees my data?'); await panel.locator('.pq-input').press('Enter'); await sleep(800);
    step('SC-013: error state: connection dropped, question kept, Retry offered', /Couldn’t reach Q/.test(await panel.innerText()) && /Who sees my data\?/.test(await panel.locator('.pq-offline').innerText()));
    await panel.locator('.pq-offline button').click(); await sleep(800);
    step('SC-013: Retry answers the kept question', /You choose\. Your profile stays private/.test(await panel.innerText()) && (await panel.locator('.pq-offline').count()) === 0);
    step('SC-013: accessible alternative lists every sample answer', (await page.locator('.pa-list dt').count()) >= 10);
    await shot(page, '03-ask');

    // Dock on another page, page-aware opener, Escape closes and returns focus
    await open(page, '/site/pricing');
    panel = await qPanel(page);
    step('SC-013: dock opens as a dialog with the pricing opener', /being tested/.test(await panel.innerText()) && (await page.locator('[role="dialog"][aria-modal="true"]').count()) === 1);
    await shot(page, '04-dock');
    await page.keyboard.press('Escape'); await sleep(400);
    step('SC-013: Escape closes the dock and focus returns to "Ask Q"', (await page.locator('[role="dialog"]').count()) === 0 && (await page.evaluate(() => !!document.activeElement?.closest('.ps-askpill, .ps-askbar'))));

    // ---- SC-002 how it works ----
    await open(page, '/site/how');
    step('SC-002: hiring view by default, 4 steps', (await page.locator('[role="radio"][aria-checked="true"]').innerText()).includes('hiring') && (await page.locator('.ph-step').count()) === 4);
    await page.locator('.ph-approve button').first().click(); await sleep(150);
    step('SC-002: criteria demo works ("1 of 3 approved", nobody searched until approved)', /1 of 3 approved\. Nobody is searched until you approve\./.test(await text(page)));
    const before = await page.locator('.ph-status li[data-on]').count();
    await page.locator('button', { hasText: 'Next receipt arrives' }).click(); await sleep(150);
    step('SC-002: status demo shows accepted ≠ delivered ≠ read, one receipt at a time', (await page.locator('.ph-status li[data-on]').count()) === before + 1 && /Accepted isn’t delivered, and delivered isn’t read/.test(await text(page)));
    await shot(page, '05-how');
    await page.locator('[role="radio"]', { hasText: 'looking for work' }).click(); await sleep(450);
    step('SC-002: audience switch updates the address and steps (talent, warm paper)', (await route(page)) === '/site/how?for=talent' && /Choose who sees it/.test(await text(page)) && (await page.locator('.ps[data-audience="candidate"]').count()) === 1);
    await page.locator('.ds-switch').first().click(); await sleep(150);
    step('SC-002: sharing demo: stopping sharing says access has ended', /Sharing stopped\. Their access has ended\./.test(await text(page)));
    await shot(page, '06-how-talent');

    // ---- SC-003 employers ----
    await open(page, '/site/employers');
    t = await text(page);
    step('SC-003: outcomes are stated without promising results', /What you get/.test(t) && /something we’re measuring, not promising/.test(t));
    for (let i = 0; i < 2; i++) { await page.locator('.pe-jnav button', { hasText: 'Next step' }).click(); await sleep(200); }
    t = await text(page);
    step('SC-003: sample journey reaches the fictional Tobi/Seyi comparison with sources', /fictional people/.test(t) && /Shows more than his CV says/.test(t) && /Strong claims, limited supporting evidence/.test(t) && /Debugging sample, reviewed by a named engineer/.test(t));
    await shot(page, '07-employers');
    await page.locator('.pe-jnav button', { hasText: 'Next step' }).click(); await sleep(200);
    step('SC-003: one bounded follow-up; declining is never a failed result', /never as a failed result/.test(await text(page)));
    step('SC-003: trust block: no rejection, no send without a yes, no face scoring', /never rejects anyone, never sends a message without your yes, and never scores faces/.test(await text(page)));

    // ---- SC-004 talent ----
    await open(page, '/site/talent');
    t = await text(page);
    step('SC-004: candidate line, warm paper and the four evidence classes', (await page.locator('h1').innerText()).includes('even if your CV doesn’t') && (await page.locator('.ps[data-audience="candidate"]').count()) === 1 && (await page.locator('.pt-ladder li').count()) === 4);
    step('SC-004: free to apply and to be found; practice is private, never proof', /Free to apply and to be found/.test(t) && /Practice is private and never counted as proof/.test(t));
    await shot(page, '08-talent');

    // ---- SC-005 pricing ----
    await open(page, '/site/pricing');
    t = await text(page);
    step('SC-005: four offers: role pilot, team, agency, candidate core free', ['Role pilot', 'Team plan', 'Agency plan', 'Candidate core'].every((n) => t.includes(n)) && (await page.locator('.pp-offer').count()) === 4);
    step('SC-005: every paid offer is stamped "Being tested"; prices stated as hypotheses', (await page.locator('.pp-stamp', { hasText: 'Being tested' }).count()) === 3 && /hypotheses from desk research, not proven prices/.test(t) && /Nothing on this page takes payment/.test(t));
    step('SC-005: no payment fields anywhere', (await page.locator('input[autocomplete^="cc-"], input[name*="card" i]').count()) === 0 && !/card number/i.test(t));
    step('SC-005: compare (mandate/seat/agent/assessment) shows "not decided" rather than a number', /Per role \(a mandate\)/.test(t) && /not per seat/.test(t) && /Q’s work \(agents\)/.test(t) && /Work samples \(assessment\)/.test(t) && /not decided/.test(t) && (phone ? (await page.locator('.pp-cmp-list').count()) === 1 : (await page.locator('table.pp-table').count()) === 1));
    step('SC-005: the value check is labelled a model, not a quote', /This is a model, not a customer quote/.test(t));
    await page.locator('.pp-offer', { hasText: 'Team plan' }).locator('button', { hasText: 'Ask about this' }).click(); await sleep(350);
    await page.locator('.pp-form button[type="submit"]').click(); await sleep(150);
    step('SC-005: interest form validates name and email inline', (await page.locator('.pp-err').count()) === 2 && /Email needs an @/.test(await page.locator('.pp-form').innerText()));
    await page.locator('.pp-form input').nth(0).fill('Ada Okafor'); await page.locator('.pp-form input').nth(1).fill('ada@kora.example');
    await page.locator('.pp-form button[type="submit"]').click(); await sleep(300);
    let w = await world(page);
    step('SC-005: interest is recorded, nothing sent, no payment taken', /Interest noted, Ada\./.test(await page.locator('.pp-form').innerText()) && /nothing is sent and no payment is taken/.test(await page.locator('.pp-form').innerText()) && w.areas.public.interest.length === 1 && w.areas.public.interest[0].offer === 'team');
    await shot(page, '09-pricing');

    // ---- SC-006 trust ----
    await open(page, '/site/trust');
    t = await text(page);
    step('SC-006: what Q does / doesn’t decide', /Q doesn’t/.test(t) && /Decide who is hired, moved forward or turned down/.test(t) && /Treat “unknown” as “weak”/.test(t));
    step('SC-006: human review, evidence classes (5), privacy and revocation', /Every hiring decision is made by a person/.test(t) && (await page.locator('.tr-classes > div').count()) === 5 && /Their access ends when you stop/.test(t));
    step('SC-006: simulated vs real, with accepted ≠ delivered ≠ read', /Simulated vs real/.test(t) && /accepted by a provider isn’t delivered, and delivered isn’t read/.test(t));
    step('SC-006: no face, accent, emotion or personality scoring', /Q never scores faces, accents, emotion or personality/.test(t));
    step('SC-006: the six unproven claims are listed as claims we don’t make', (await page.locator('#tr-claims li').count()) === 6 && /statistically validated/.test(t));
    step('SC-006: in-page index present', (await page.locator('.ds-pageindex a').count()) === 7);
    await shot(page, '10-trust');

    // ---- SC-008 sign in ----
    await open(page, '/sign-in');
    step('SC-008: email code, Google and Microsoft, each labelled simulated', /Email me a code/.test(await text(page)) && (await page.locator('.si-providers .ds-sim').count()) === 2 && /Simulated sign-in/.test(await text(page)));
    await page.fill('#si-email', 'ada@kora'); await page.locator('button[type="submit"]').click(); await sleep(150);
    step('SC-008: error: incomplete email', /doesn’t look complete/.test(await page.locator('#si-err').innerText()));
    await page.fill('#si-email', 'nobody@example.com'); await page.locator('button[type="submit"]').click(); await sleep(150);
    step('SC-008: error: unknown email offers to create an account', /No Talent Q account uses that email/.test(await page.locator('#si-err').innerText()) && (await page.locator('#si-err a[href="#/signup"]').count()) === 1);
    await page.fill('#si-email', 'dele@talentbridge.example'); await page.locator('button[type="submit"]').click(); await sleep(150);
    step('SC-008: permission denied: Talentbridge requires Microsoft (simulated rule)', /asks its team to sign in with Microsoft/.test(await page.locator('#si-err').innerText()));
    await shot(page, '11-signin-denied');
    await page.fill('#si-email', 'ada@kora.example'); await page.locator('button[type="submit"]').click(); await sleep(150);
    step('SC-008: loading: "Sending code…"', /Sending code/.test(await text(page)));
    await page.waitForSelector('#si-code'); await sleep(250);
    await page.fill('#si-code', '000000'); await page.locator('button[type="submit"]').click(); await sleep(150);
    step('SC-008: error: wrong code', /doesn’t match/.test(await page.locator('#si-err').innerText()));
    await page.fill('#si-code', '123456'); await page.locator('button[type="submit"]').click(); await page.waitForSelector('.ds-app'); await sleep(400);
    w = await world(page);
    step('SC-008: email code signs Ada in and lands on the recruiter home', (await route(page)) === '/r/home' && w.session.actor === 'u_ada' && w.events.some((e) => e.type === 'auth.signed_in' && e.actor === 'u_ada' && e.scope === 'ORG:org_kora'));
    await open(page, '/sign-in');
    await page.locator('.si-providers button', { hasText: 'Google' }).click(); await sleep(350);
    step('SC-008: Google chooser lists cast accounts, not Talentbridge (Microsoft only)', (await page.locator('.si-accounts li').count()) > 5 && !/talentbridge/.test(await page.locator('.si-accounts').innerText()));
    await shot(page, '12-signin-google');
    await page.locator('.si-accounts button', { hasText: 'Tobi' }).click(); await page.waitForSelector('.ds-app', { timeout: 4000 }); await sleep(400);
    w = await world(page);
    step('SC-008: Google signs Tobi in and lands on the candidate home', (await route(page)) === '/c/home' && w.session.actor === 'p_tobi' && w.areas.public.signIns.at(-1).method === 'GOOGLE');
    await open(page, '/sign-in');
    await page.locator('.si-providers button', { hasText: 'Microsoft' }).click(); await sleep(350);
    await page.locator('button', { hasText: 'Cancel' }).click(); await sleep(350);
    step('SC-008: cancelling a provider says nothing changed', /Microsoft sign-in was cancelled\. Nothing changed\./.test(await text(page)));
    await page.locator('.si-providers button', { hasText: 'Microsoft' }).click(); await sleep(350);
    await page.locator('.si-accounts button', { hasText: 'Dele' }).click(); await page.waitForSelector('.ds-app', { timeout: 4000 }); await sleep(400);
    w = await world(page);
    step('SC-008: Microsoft signs Dele (agency) in, to the recruiter home', (await route(page)) === '/r/home' && w.session.actor === 'u_dele');
    await open(page, '/sign-in');
    await page.fill('#si-email', 'funmi@crumbandco.example'); await page.locator('button[type="submit"]').click(); await sleep(150);
    step('SC-008: an unfinished account is told to finish sign-up', /didn’t finish/.test(await page.locator('#si-err').innerText()));
    await page.locator('#si-err button').click(); await sleep(500);
    w = await world(page);
    step('SC-008: …and continues at /signup as Funmi', (await route(page)) === '/signup' && w.session.actor === 'u_funmi');

    // Phone-only: the menu sheet
    if (phone) {
      await open(page, '/site/trust');
      await page.locator('.ps-menubtn').click(); await sleep(400);
      step('Mobile: Menu opens as a sheet with every page and focus inside', (await page.locator('.ps-menu li').count()) === 6 && (await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))));
      await shot(page, '13-menu');
      await page.locator('.ps-menu a', { hasText: 'Pricing' }).click(); await sleep(450);
      step('Mobile: choosing a page navigates and closes the menu', (await route(page)) === '/site/pricing' && (await page.locator('[role="dialog"]').count()) === 0);
    }

    // No sideways scroll anywhere; body text ≥ 12px
    const bad = [];
    for (const r2 of ['/site', '/site/how', '/site/how?for=talent', '/site/employers', '/site/talent', '/site/pricing', '/site/trust', '/site/ask', '/sign-in']) {
      await open(page, r2); if (!(await noSideways(page)) || (await minFont(page)) < 12) bad.push(r2);
    }
    step('All public pages: no sideways scroll and text ≥ 12px', !bad.length, bad.join(', '));
  } finally { await browser.close(); }
}

await run({ width: 1440, height: 900 }, 'd');
await run({ width: 390, height: 844 }, 'm');
const pass = results.filter((r) => r.ok).length;
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
console.log(`\n${pass}/${results.length} passed${errors.length ? `, ${errors.length} page errors` : ''}`);
process.exit(pass === results.length && !errors.length ? 0 : 1);
