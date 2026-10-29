// R5 · Bayo, a sceptical hiring manager at Kora Pay. Driven by typing to the global Q in imperfect language.
// Curveballs: contradictory instructions ("only seniors" then "why are there no juniors"), senior-but-cheap
// trade-off, actions outside his role (send an offer, change policy, send to all now), inappropriate criteria
// and a proxy, a wrong memory corrected with its source, two sources disagreeing about Kunle, and audit
// questions ("who changed the panel", "what did you do yesterday"). Also checks that Kora's Senior Backend
// intake now runs in the one global conversation. Usage: node R5.mjs [port] [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const PORT = process.argv[2] || '5181';
const ONLY = (process.argv[3] || 'd,m').split(',');
const OUT = fileURLToPath(new URL('../../../captures/cx/R5/', import.meta.url)); mkdirSync(OUT, { recursive: true });
const BASE = `http://localhost:${PORT}/`;
const b = await pw.chromium.launch();
const errors = []; const results = []; let w;
const step = (v, name, ok, detail = '') => { results.push({ v, name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail && !ok ? ` · ${detail}` : ''}`); };

for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text()}`); });
  const phone = v === 'm';
  let n = 0;
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.count()) await x.click(); await page.waitForTimeout(250); };
  const openQ = async () => { if (!phone) return; const bar = page.locator('.ds-askbar button'); if (await bar.count()) await bar.click(); await page.waitForTimeout(300); };
  const shot = async (name, withQ = false) => { if (withQ) await openQ(); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${v}-${String(++n).padStart(2, '0')}-${name}.png` }); if (withQ) await closeQ(); };
  const overflow = async (x) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) errors.push(`${v}/${x}: horizontal overflow ${o}px`); };
  const world = () => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
  const lastQ = async (k = 1) => { const w = await world(); const t = (w.q.threads[w.session.actor] ?? []).filter((m) => m.who !== 'me'); return t.slice(-k).map((m) => m.text).join(' || '); };
  const lastKind = async () => { const w = await world(); const t = (w.q.threads[w.session.actor] ?? []).filter((m) => m.who !== 'me'); return t[t.length - 1]?.kind; };
  const route = () => page.evaluate(() => location.hash.replace(/^#/, ''));
  const ask = async (text, wait = 800) => { await openQ(); await page.locator('#q-ask').fill(text); await page.locator('#q-ask').press('Enter'); await page.waitForTimeout(wait); await closeQ(); };
  const chip = async (re) => { await openQ(); const c = page.locator('.ds-thread .ds-chip').filter({ hasText: re }).last(); await c.click(); await page.waitForTimeout(700); await closeQ(); };
  const go = async (r) => { await page.goto(`${BASE}#${r}`); await page.waitForTimeout(900); await overflow(r); };
  const canvas = () => page.locator('.ds-canvas').first().innerText().catch(() => '');
  const payouts = async () => (await world()).mandates.find((m) => m.id === 'm_payouts');

  // ---- Fresh world as Bayo ----
  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
  for (const r of ['/settings', '/r/plan', '/settings']) { await page.goto(`${BASE}#${r}`); await page.waitForTimeout(600); if (await page.evaluate(() => !!localStorage.getItem('tq.world.v4'))) break; }
  await page.evaluate(() => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = 'u_bayo'; localStorage.setItem('tq.world.v4', JSON.stringify(w)); });
  await page.reload(); await page.waitForTimeout(600); await page.goto(`${BASE}#/r/home`); await page.waitForTimeout(1100);
  step(v, 'home shows what is waiting on Bayo', /Waiting on you/i.test(await page.locator('#ds-content').innerText()) && /Backend Engineer, Payouts/.test(await page.locator('#ds-content').innerText()));
  await openQ();
  step(v, 'proactive: draft waiting on him for over a day', await page.locator('.ds-suggest').filter({ hasText: /Payouts.*has been a draft since/ }).count() > 0);
  await closeQ();
  await shot('home', true);

  // ---- Kora's Senior Backend intake now lives in the global Q (no embedded conversation) ----
  await ask('I need a senior backend engineer for payments', 900);
  step(v, 'Kora intake starts the Senior Backend brief from Q', (await route()) === '/r/mandate' && /hybrid in Lagos, onsite, or open to remote/.test(await lastQ()));
  step(v, 'no second conversation on the brief page', (await page.locator('.split-conv, .ds-canvas .ds-compose').count()) === 0);
  await ask('hybrid lagos');
  await ask('payments reconcilation');
  w = await world();
  step(v, 'answers applied to the brief', w.mandate.workMode === 'HYBRID' && w.mandate.requirements[0].label === 'Payments systems' && /Approve it and I’ll start searching/.test(await lastQ()));
  await shot('kora-brief', true);
  await chip(/Approve and start searching/);
  await page.waitForTimeout(9000);
  w = await world();
  step(v, 'approval starts the search; result arrives in Q', w.mandate.status !== 'DRAFT' && w.sourcing.done && /I read 24 profiles/.test(await lastQ(3)), await lastQ(2));
  await shot('kora-search');

  // ---- Approvals ----
  await ask('aprove the payouts brief');
  step(v, 'approval asked with the exact version', (await lastKind()) === 'approval' && /Approve “Backend Engineer, Payouts” v1/.test(await lastQ()));
  await chip(/^Approve v1$/);
  step(v, 'Bayo approves the brief (hiring manager may)', (await payouts()).status === 'APPROVED');
  await ask('ok find people for payouts', 900);
  w = await world();
  step(v, 'search for Payouts runs (Kora pool)', (w.areas['hire-a'].search.m_payouts?.found ?? []).length === 7 && (await route()) === '/r/roles/m_payouts');

  // ---- [mind] Contradictory instructions ----
  await ask('only seniors pls');
  let c = await canvas();
  step(v, 'only seniors applied and visible', !/Emeka Nnadi/.test(c) && /hidden by your “only seniors”/.test(c));
  await ask('why are there no juniors??');
  step(v, '[mind] Q points out the contradiction and asks which to keep', /contradicts that/.test(await lastQ()) && (await lastKind()) === 'question');
  await shot('contradiction', true);
  await ask('ok include them');
  c = await canvas();
  step(v, 'his choice is applied (juniors back, by level)', /Emeka Nnadi/.test(c) && /Junior/.test(c));
  await ask('i want someone really senior but cheap');
  step(v, '[mind] senior-but-cheap trade-off named', /pull against each other/.test(await lastQ()));
  await chip(/Senior, keep the pay band/);

  // ---- [recover] Actions outside his role ----
  await ask('send tobi an offer today');
  step(v, '[recover] offer refused, names who can', (await lastKind()) === 'refusal' && /Ada Okafor \(recruiter\)/.test(await lastQ()) && /Ngozi Eze \(admin\)/.test(await lastQ()), await lastQ());
  await shot('refusal-offer', true);
  await chip(/^Ask Ada$|^Ask Ngozi$/);
  w = await world();
  step(v, 'request reaches the colleague’s Q', w.areas['hire-a'].requests.length === 1 && (w.q.threads[w.areas['hire-a'].requests[0].to] ?? []).some((m) => /Bayo Ojo asked you/.test(m.text)));
  await ask('change the policy so we dont need a panel of two');
  step(v, 'policy change refused, admin named', (await lastKind()) === 'refusal' && /Ngozi Eze/.test(await lastQ()));
  await ask('just send it to all of them now');
  w = await world();
  step(v, '[recover] bulk send prepared as drafts, nothing sent', (await lastKind()) === 'refusal' && w.threads.flatMap((t) => t.messages).filter((m) => m.status === 'AWAITING_APPROVAL' && m.from === 'u_bayo').length >= 1 && !w.threads.flatMap((t) => t.messages).some((m) => m.from === 'u_bayo' && m.status === 'SENT_SIMULATED'));

  // ---- [info] Inappropriate criteria → job-related alternatives ----
  await ask('only men under 30 for this one');
  step(v, '[info] non-job criterion declined', (await lastKind()) === 'refusal');
  await chip(/Describe what the job needs/);
  step(v, 'Q offers job-related criteria instead', /job-related things I can use/.test(await lastQ()));
  await chip(/Has run payouts in production/);
  const p = await payouts();
  step(v, 'job-related criterion added as a new version', p.requirements.some((r) => r.label === 'Has run payouts in production') && p.versions.length === 2 && p.status === 'DRAFT');
  await ask('ok and nobody who graduated before 2015');
  step(v, 'age proxy declined too', (await lastKind()) === 'refusal' && /stands in for age/.test(await lastQ()));
  w = await world();
  step(v, 'declines are logged', w.events.filter((e) => e.type === 'q.policy.declined').length >= 2);

  // ---- [mind] Memory correction ----
  await ask('thats wrong, i never said remote is fine');
  step(v, 'Q shows what it remembered and its source', /Here’s what I had: “Bayo is fine with fully remote/.test(await lastQ()) && /Nairobi is fine for the first screen/.test(await lastQ()) && /my inference/.test(await lastQ()));
  await shot('memory-source', true);
  await ask('hybrid, lagos office 3 days a week. fully remote is not ok');
  w = await world();
  const old = w.memories.find((m) => m.memory_id === 'mem_bayo_remote');
  const nw = w.memories.find((m) => m.supersedes_id === 'mem_bayo_remote');
  step(v, 'memory corrected, old one superseded', old?.lifecycle_status === 'superseded' && nw?.lifecycle_status === 'active' && nw.truth_class === 'STATED_BY_USER');
  await go('/r/memory');
  c = await page.locator('#ds-content').innerText();
  step(v, 'memory page shows the new value and the replaced one', /hybrid, lagos office 3 days a week/i.test(c) && /Earlier versions/i.test(c));
  step(v, 'Bayo does not see Ada’s private preferences', !/Ada takes interview calls after 10:00/.test(c));
  await shot('memory-page');

  // ---- [info] Source conflict ----
  await ask('is kunle really 6 yrs experiance? his github looks way newer');
  step(v, '[info] both sources shown, none picked silently', /Two sources disagree/.test(await lastQ()) && /6 years/.test(await lastQ()) && /about 2 years/.test(await lastQ()) && /haven’t picked one/.test(await lastQ()), await lastQ());
  await shot('conflict', true);
  await chip(/Check it in the interview/);
  w = await world();
  step(v, 'his choice recorded; both sources kept', w.areas['hire-a'].conflicts.p_kunle === 'INTERVIEW' && w.evidence.some((e) => e.evidenceId === 'e_ha_kunle_cv') && w.evidence.some((e) => e.evidenceId === 'e_ha_kunle_gh'));
  await go('/r/roles/m_payouts');
  await shot('people');

  // ---- Audit ----
  await ask('who chnaged the pannel?');
  step(v, 'who changed the panel → Ngozi, with when', /Ngozi Eze did/.test(await lastQ()) && (await route()) === '/r/audit', await lastQ());
  c = await canvas();
  step(v, 'audit filtered to the panel change', /Seyi Balogun replaces Musa Danladi/.test(c) && !/Approved one outreach/.test(c));
  await shot('audit-panel', true);
  await ask('wat did u do yesterday');
  step(v, 'what did you do yesterday → Q’s own actions', /Yesterday I did 3 things/.test(await lastQ()), await lastQ());
  c = await canvas();
  step(v, 'audit filtered to Q, yesterday', /Q searched 2 of 3 sources/.test(c) && !/Ngozi Eze/.test(c.replace(/Person[\s\S]*?Words/, '')));
  await shot('audit-q', true);
  await go('/r/audit');
  await page.getByRole('button', { name: 'Clear filters' }).click().catch(() => {});
  c = await canvas();
  step(v, 'audit is Kora-only (no Crumb & Co)', /Bayo Ojo/.test(c) && !/Crumb/.test(c));
  await shot('audit-all');
  await ctx.close();
}
console.log('ERRORS', JSON.stringify(errors, null, 1));
const failed = results.filter((r) => !r.ok).length;
console.log(`${failed ? 'FAIL' : 'PASS'} R5: ${results.length - failed}/${results.length} steps passed`);
await b.close();
