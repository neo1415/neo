// R1 · Funmi, a confused first-time employer (Crumb & Co bakery). Starts signed out, signs up, and works out
// who to hire entirely by typing to the global Q in imperfect language. Curveballs: changes the role midway
// (shop assistant → part-time bookkeeper), doesn't know "mandate", budget below market, clicks "Discard draft"
// by mistake then says "undo that", leaves and comes back the next day ("where was I?"), and checks that
// Kora Pay's pipeline stays invisible. Usage: node R1.mjs [port] [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const PORT = process.argv[2] || '5181';
const ONLY = (process.argv[3] || 'd,m').split(',');
const OUT = fileURLToPath(new URL('../../../captures/cx/R1/', import.meta.url)); mkdirSync(OUT, { recursive: true });
const BASE = `http://localhost:${PORT}/`;
const b = await pw.chromium.launch();
const errors = []; const results = [];
const step = (v, name, ok, detail = '') => { results.push({ v, name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail && !ok ? ` · ${detail}` : ''}`); };

for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text()}`); });
  const phone = v === 'm';
  let n = 0;
  const shot = async (name, withQ = false) => { if (withQ) await openQ(); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${v}-${String(++n).padStart(2, '0')}-${name}.png` }); if (withQ) await closeQ(); };
  const overflow = async (x) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) errors.push(`${v}/${x}: horizontal overflow ${o}px`); };
  const world = () => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
  const setWorld = (fn) => page.evaluate((src) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); new Function('w', src)(w); localStorage.setItem('tq.world.v4', JSON.stringify(w)); }, fn);
  const lastQ = async (k = 1) => { const w = await world(); const t = (w.q.threads[w.session.actor] ?? []).filter((m) => m.who !== 'me'); return t.slice(-k).map((m) => m.text).join(' || '); };
  const route = () => page.evaluate(() => location.hash.replace(/^#/, ''));
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.count()) await x.click(); await page.waitForTimeout(250); };
  const openQ = async () => { if (!phone) return; const bar = page.locator('.ds-askbar button'); if (await bar.count()) await bar.click(); await page.waitForTimeout(300); };
  const ask = async (text, wait = 800) => { await openQ(); await page.locator('#q-ask').fill(text); await page.locator('#q-ask').press('Enter'); await page.waitForTimeout(wait); await closeQ(); };
  const chip = async (re) => { await openQ(); const c = page.locator('.ds-thread .ds-chip').filter({ hasText: re }).last(); await c.click(); await page.waitForTimeout(700); await closeQ(); };
  const go = async (r) => { await page.goto(`${BASE}#${r}`); await page.waitForTimeout(900); await overflow(r); };
  const canvas = () => page.locator('.ds-canvas').first().innerText().catch(() => '');
  const mandate = async () => { const w = await world(); const id = w.areas['hire-a']?.intake?.u_funmi?.mandateId; return w.mandates.find((m) => m.id === id) ?? null; };

  // ---- Start signed out, as Funmi ----
  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
  for (const r of ['/settings', '/r/plan', '/settings']) { await page.goto(`${BASE}#${r}`); await page.waitForTimeout(600); if (await page.evaluate(() => !!localStorage.getItem('tq.world.v4'))) break; }
  await setWorld("w.session.actor = 'u_funmi';");
  await page.goto(`${BASE}#/signup`); await page.reload(); await page.waitForTimeout(900);
  step(v, 'starts signed out at signup', /Create your account/.test(await page.locator('main').innerText()));
  await shot('signup');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('#su-code').fill('123456'); await page.getByRole('button', { name: 'Verify' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Start' }).click(); await page.waitForTimeout(900);
  step(v, 'lands on founder home', (await route()) === '/r/home' && /Where you are/i.test(await canvas()));
  await shot('home-welcome', true);

  // ---- Vague need: the signup's own first action ----
  await chip(/not sure who/);
  step(v, 'Q asks plain question about the business', /what’s your business called/.test(await lastQ()), await lastQ());
  await ask('its called Crumb & Co, a bakery in Ikeja');
  let w = await world();
  step(v, 'Q creates the org in conversation', w.orgs.some((o) => o.id === 'org_crumb') && w.actors.find((a) => a.id === 'u_funmi').orgId === 'org_crumb', await lastQ(2));
  await ask('honestly the queue gets so long, i cant serve custmers and bake at the same time');
  step(v, 'Q hears two jobs and asks which matters more', /two different jobs/.test(await lastQ()), await lastQ());
  await ask('the serving one, i can do the baking myself');
  step(v, 'Q proposes a role from vague talk (shop assistant)', /a shop assistant sounds right/.test(await lastQ(2)), await lastQ(2));
  await ask('full time pls');
  step(v, 'Q asks about pay in plain words', /how much could you pay/.test(await lastQ()), await lastQ());
  await ask('maybe 80k');
  let m = await mandate();
  step(v, 'draft brief created as a DRAFT mandate', m?.status === 'DRAFT' && /Shop assistant/i.test(m?.title ?? '') && (await route()).startsWith('/r/roles/'), JSON.stringify(m?.title));
  await shot('draft-v1', true); await shot('draft-v1-canvas');

  // ---- [info] Doesn't know a term ----
  await ask('sorry whats a mandate?');
  step(v, '[info] explains “mandate” in plain words', /Role brief \(mandate\): A short description/.test(await lastQ()), await lastQ());

  // ---- [mind] Changes the role midway ----
  await ask('actually what i really need is someone to do my books, part time. the money side is a mess', 1000);
  m = await mandate();
  step(v, '[mind] role re-planned to part-time bookkeeper as v2', /bookkeeper/i.test(m?.title ?? '') && m?.versions.length === 2 && /Part-time/.test(m.title), m?.title);
  step(v, '[mind] shared answers kept (budget ₦80k, Ikeja)', m?.pay.max === 80000 && /Ikeja/.test(m?.location ?? ''));
  step(v, '[info] budget below market is raised with options', /below what part-time, 3 days a week bookkeepers usually earn/.test(await lastQ(2)), await lastQ(2));
  await shot('budget-below', true);
  await chip(/2 days a week/);
  m = await mandate();
  step(v, 'budget option applied as v3 (2 days a week)', m?.versions.length === 3 && /2 days/.test(m?.title ?? ''), m?.title);
  await go(`/r/roles/${m.id}`);
  await page.getByRole('button', { name: /^Versions/ }).click(); await page.waitForTimeout(300);
  step(v, 'versions view lists v1–v3', /v1/.test(await canvas()) && /Changed from shop assistant to bookkeeper/.test(await canvas()));
  await page.getByRole('button', { name: 'Read v1' }).click(); await page.waitForTimeout(300);
  step(v, 'old version stays readable', /You’re reading v1/.test(await canvas()) && /Serves customers/.test(await canvas()));
  await shot('version-v1');
  await page.getByRole('button', { name: /Back to v3/ }).click();

  // ---- [recover] Clicks the wrong button, then "undo that" ----
  await page.getByRole('button', { name: 'Discard draft' }).click(); await page.waitForTimeout(700);
  w = await world();
  step(v, '[recover] wrong click discards the draft', !w.mandates.some((x) => x.id === m.id) && (await route()) === '/r/roles');
  await ask('oh no undo that');
  step(v, 'Q confirms what will be undone', /Undo “Discard the Part-time bookkeeper/.test(await lastQ()), await lastQ());
  await chip(/^Undo it$/);
  w = await world();
  step(v, '[recover] undo restores the draft exactly', w.mandates.some((x) => x.id === m.id && x.versions.length === 3));

  // ---- [recover] Leaves and comes back the next day ----
  await go('/settings');
  await setWorld('w.session.offsetDays = (w.session.offsetDays || 0) + 1;');
  await page.reload(); await page.waitForTimeout(600); await go('/r/home');
  step(v, 'home shows where she is', /Approve the role brief/.test(await canvas()) && /Part-time bookkeeper/.test(await canvas()));
  await ask('hi im back, where was i?');
  step(v, '[recover] Q resumes from where she stopped', /Welcome back/.test(await lastQ()) && /still a draft/.test(await lastQ()), await lastQ());
  await openQ();
  step(v, 'proactive: draft unapproved for over a day', await page.locator('.ds-suggest').filter({ hasText: /has been a draft since/ }).count() > 0);
  await shot('back-next-day');
  await closeQ();

  // ---- Approve, search, shortlist ----
  await chip(/^Approve v3$/);
  m = await mandate();
  step(v, 'approved after explicit approval', m?.status === 'APPROVED', m?.status);
  await ask('yes go ahead and look for people', 900);
  w = await world();
  const found = w.areas['hire-a'].search[m.id]?.found ?? [];
  step(v, 'simulated search finds bookkeepers only', found.length === 4 && found.every((p) => p.startsWith('p_ha_')), found.join());
  step(v, 'Kora pipeline invisible to Crumb & Co', !/Tobi|Ifeoma|Zara|Kunle/.test(await canvas()));
  await shot('people', true); await shot('people-canvas');
  await ask('shortlist kemi and yusuf');
  w = await world();
  step(v, 'shortlist by name', w.pipeline.filter((e) => e.mandateId === m.id && e.stage === 'SHORTLISTED').length === 2);

  // ---- Hand-off to interview scheduling (minimal, simulated) ----
  await ask('can i meet them next week?');
  step(v, 'Q proposes times and asks for approval', /Here’s a plan/.test(await lastQ()) && /Nothing is sent or booked/.test(await lastQ()), await lastQ());
  await shot('propose', true);
  await chip(/Hold the times/);
  w = await world();
  const holds = w.calendar.filter((e) => e.mandateId === m.id && e.status === 'HOLD');
  const drafts = w.threads.filter((t) => t.mandateId === m.id).flatMap((t) => t.messages).filter((x) => x.status === 'DRAFT');
  step(v, 'CalEvent HOLDs written (simulated)', holds.length === 2 && holds.every((h) => h.simulated));
  step(v, 'DRAFT invitations written, nothing sent', drafts.length === 2 && !w.threads.flatMap((t) => t.messages).some((x) => x.status === 'SENT_SIMULATED' && x.from === 'u_funmi'));
  await shot('handoff', true);

  // ---- Isolation and audit ----
  await go('/r/roles');
  step(v, 'roles page scoped to Crumb & Co', /Part-time bookkeeper/.test(await canvas()) && !/Payouts|Support Lead/.test(await canvas()));
  await shot('roles');
  await go('/r/audit');
  step(v, 'audit log shows only Crumb & Co events', /Crumb & Co/.test(await canvas()) && !/Ngozi|Kora/.test(await canvas()));
  await shot('audit');
  await go('/r/mandate');
  step(v, 'Kora’s legacy brief is not shown to Funmi', !/Senior Backend/.test(await canvas()));
  await ctx.close();
}
console.log('ERRORS', JSON.stringify(errors, null, 1));
const failed = results.filter((r) => !r.ok).length;
console.log(`${failed ? 'FAIL' : 'PASS'} R1: ${results.length - failed}/${results.length} steps passed`);
await b.close();
