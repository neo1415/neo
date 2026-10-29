// R4 · Dele, high-volume agency (Talentbridge; clients Kora Pay and Medlink Health; Tunde is a Viewer).
// Drives the journey mostly by typing to Q, asserts visible outcomes and exercises all five curveballs:
//   [info] provider outage mid-run, [mind] interrupt Medlink for urgent Kora (pause/resume),
//   [info] consent withdrawn, [info] conflicting client requirements, [recover] permission denied + request access,
//   plus tenant isolation refusals and a change of mind on the submittal size.
// Usage: node R4.mjs [base=http://localhost:5184/] [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../../captures/cx/R4'); mkdirSync(OUT, { recursive: true });
const BASE = process.argv[2] || 'http://localhost:5184/';
const ONLY = (process.argv[3] || 'd,m').split(',');
const b = await pw.chromium.launch();
const results = []; const errors = [];
const MEDLINK_PEOPLE = ['Ruth Akpan', 'Bisi Coker', 'Nneka Okoro', 'Obinna Udeh', 'Chidi Nwosu', 'Amaka Eze'];
// Privacy (canSeeCandidate): these people never registered with Talentbridge and their discovery rules don't
// allow agencies, so no agency page or Q reply may name them, even though older pool records include them.
// Founder decision D1: the default discovery rule is ANYONE, so only people who chose stricter rules
// (Zara: verified employers only) are hidden from the agency.
const HIDDEN_FROM_AGENCY = ['Zara Mensah'];
const P = { pools: '/r/agency/pools', searches: '/r/agency/pools/searches', compare: '/r/agency/pools/compare', notes: '/r/agency/clients/notes', docs: '/r/agency/clients/docs', clients: '/r/agency/clients', submittals: '/r/agency/submittals', campaigns: '/r/agency/campaigns', agents: '/r/agency/agents', mandate: (id) => `/r/agency/clients/mandate/${id}` };

for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${v}: ${m.text()}`); });
  page.on('dialog', (d) => d.accept());
  const phone = v === 'm';
  const step = async (name, fn) => {
    try { await fn(); results.push(`PASS ${v} ${name}`); console.log(`PASS ${v} ${name}`); }
    catch (e) { results.push(`FAIL ${v} ${name}: ${String(e.message).split('\n')[0]}`); console.log(`FAIL ${v} ${name}: ${String(e.message).split('\n')[0]}`); await shot(`fail-${name.replace(/\W+/g, '-').slice(0, 40)}`); }
  };
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}/${v}-${n}.png` }); };
  const overflow = async (x) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errors.push(`${v}/${x}: horizontal overflow ${o}px`); };
  const go = async (r) => { await page.goto(`${BASE}#${r}`); await page.waitForTimeout(700); await overflow(r); };
  const openQ = async () => { if (phone && !(await page.locator('#q-ask').isVisible().catch(() => false))) { await page.locator('.ds-askbar button').click(); await page.waitForTimeout(300); } };
  const closeQ = async () => { if (phone) { const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) { await x.click(); await page.waitForTimeout(250); } } };
  const thread = () => page.locator('.ds-thread').first();
  // Q's reply to the person's latest message (background notices from agents may arrive after it).
  const lastQ = async () => { await openQ(); return page.evaluate(() => {
    const kids = [...(document.querySelector('.ds-thread .ds-log')?.children ?? [])];
    const i = kids.map((k) => k.classList.contains('ds-me')).lastIndexOf(true);
    const after = kids.slice(i + 1).filter((k) => k.classList.contains('ds-q') && k.dataset.kind !== 'notice');
    const el = after[after.length - 1] ?? kids.filter((k) => k.classList.contains('ds-q')).pop();
    return (el?.querySelector('.say')?.textContent ?? '').trim();
  }); };
  const qText = async (n = 4) => { await openQ(); const all = await thread().locator('.ds-q .say').allInnerTexts(); return all.slice(-n).join('\n'); };
  const ask = async (text, wait = 900) => { await openQ(); await page.locator('#q-ask').fill(text); await page.locator('#q-ask').press('Enter'); await page.waitForTimeout(wait); };
  const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
  const canvas = () => page.locator('.ds-canvas').first();
  const chip = (re) => thread().locator('.ds-chip').filter({ hasText: re }).last();
  const noHidden = (t, where) => { const leak = HIDDEN_FROM_AGENCY.filter((n) => t.includes(n)); if (leak.length) throw new Error(`${where} names ${leak.join(', ')}, hidden by their privacy settings`); };
  // The rail marks the top destination for nested pages (one navigation system, no duplicate in-page bar).
  const railCurrent = async () => (await page.locator('.ds-rail [aria-current="page"]').first().innerText().catch(() => '')).trim();
  const setActor = async (id) => { await page.evaluate((a) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = a; localStorage.setItem('tq.world.v4', JSON.stringify(w)); }, id); await page.reload(); await page.waitForTimeout(700); };

  // Fresh world, signed in as Dele.
  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  await setActor('u_dele'); await go('/r/home');

  await step('1 agency home shows clients, mandates, agents and what needs Dele', async () => {
    const t = await canvas().innerText();
    expect(/agents working/.test(t), 'home title'); expect(/Kora Pay/.test(t) && /Medlink Health/.test(t), 'both client cards');
    expect(/Payments Platform Engineer/.test(t) && /Backend Engineer, Claims API/.test(t), 'mandates per client');
    expect(/Needs you/.test(t), 'needs you');
    await shot('01-home');
  });

  await step('2 curveball [info] provider outage: agent fails, retries once, Q explains', async () => {
    await page.waitForTimeout(9000);
    await go(P.agents);
    const t = await canvas().innerText();
    expect(/JobBoard NG isn’t responding/.test(t), 'failed banner on agents page');
    expect(/Failed/.test(t), 'failed tag');
    await openQ(); const q = await qText(6); expect(/JobBoard NG/.test(q) && /retr/i.test(q), 'Q notice about outage and retry'); await closeQ();
    await shot('02-agents-failed');
    await ask('what happened to the ops search?');
    const r = await lastQ(); expect(/stopped responding/.test(r) && /Only this agent is affected/.test(r), `explanation: ${r.slice(0, 80)}`);
    await shot('03-q-explains-outage');
  });

  await step('3 curveball [mind] interrupt: "stop the medlink search, kora is urgent"', async () => {
    await ask('stop the medlink search, kora is urgent', 1200);
    const r = await lastQ(); expect(/Paused Medlink/.test(r) && /Kora is now urgent/.test(r), `interrupt reply: ${r.slice(0, 120)}`);
    await closeQ();
    const t = await canvas().innerText();
    expect(/Paused/.test(t) && /Urgent/.test(t), 'paused and urgent shown');
    expect(/Kora is urgent; resumes from here/.test(t), 'resumable paused reason');
    await shot('04-agents-interrupted');
  });

  await step('4 retry the failed provider; run recovers without losing work', async () => {
    await ask('retry it');
    let r = await lastQ(); expect(/Retrying JobBoard NG/.test(r), `retry reply ${r.slice(0, 80)}`);
    await page.waitForTimeout(2600); await closeQ();
    const t = await canvas().innerText(); expect(/recovered/.test(t), 'provider recovered');
    await shot('05-agents-recovered');
  });

  await step('5 saved search re-run by typing, diff shows what is new (Kora only)', async () => {
    await ask('run the kora backend search again and tell me whats new', 1100);
    const r = await lastQ();
    expect(/Kemi Bassey/.test(r) && /Segun Ilori/.test(r), `new names: ${r.slice(0, 160)}`);
    expect(!MEDLINK_PEOPLE.some((n) => r.includes(n)), 'no Medlink names in a Kora reply');
    await closeQ();
    const t = await canvas().innerText(); expect(/New since last run/.test(t), 'diff on page'); expect(/Showing Kora Pay only/.test(t), 'client focus label');
    await shot('06-search-diff');
  });

  await step('6 isolation: Q refuses "show medlink\'s candidates on the kora report"', async () => {
    await ask('show medlinks candidates on the kora report');
    const r = await lastQ();
    expect(/can’t/.test(r) && /stay inside Medlink/.test(r), `refusal: ${r.slice(0, 120)}`);
    expect(!MEDLINK_PEOPLE.some((n) => r.includes(n)), 'refusal names no candidates');
    await shot('07-isolation-refusal');
    await ask('put the top 3 from the ops pool in front of kora');
    const r2 = await lastQ(); expect(/belongs to Medlink Health/.test(r2), `pool isolation: ${r2.slice(0, 100)}`);
    await closeQ();
  });

  await step('7 submittal by typing: top 5 from the payments pool, consent checked per person', async () => {
    await ask('put the top 5 from the payments pool in front of kora', 1100);
    const r = await lastQ();
    expect(/Ready to send 4/.test(r) && /Segun Ilori \(hasn’t agreed/.test(r), `draft: ${r.slice(0, 200)}`);
    await closeQ();
    const t = await canvas().innerText(); expect(/Draft · needs your yes/.test(t), 'draft on submittals page');
    await shot('08-submittal-draft');
  });

  await step('8 curveball [info] consent withdrawn: Halima drops out with a visible reason; Q tells Dele', async () => {
    await ask('simulate halima withdrawing consent', 1000);
    const q = await qText(3); expect(/Halima Musa withdrew consent/.test(q) && /draft Kora submittal/.test(q), `notice: ${q.slice(-200)}`);
    await closeQ();
    let t = await canvas().innerText(); expect(/Halima Musa · not included: Withdrew consent/.test(t), 'excluded in draft with reason');
    await shot('09-submittal-withdrawn');
    await go(P.pools); t = await canvas().innerText();
    expect(/Removed from this pool/.test(t) && /Halima Musa: withdrew consent/.test(t), 'removed from pool with reason');
    await shot('10-pool-removed');
  });

  await step('8b privacy: pools, searches and pipelines count hidden people without naming them', async () => {
    await go(P.pools); let t = await canvas().innerText();
    noHidden(t, 'Kora pools'); expect(/1 more person in this pool isn’t shown/.test(t) && /privacy settings don’t allow agencies/.test(t) && /Talent Q doesn’t say who/.test(t), 'Kora pool: anonymous hidden note');
    await canvas().getByRole('button', { name: 'Medlink Health', exact: true }).click(); await page.waitForTimeout(300);
    t = await canvas().innerText(); noHidden(t, 'Medlink pools');
    expect(/Operations analysts/.test(t) && /Chidi Nwosu/.test(t) && !/aren’t shown|isn’t shown/.test(t), 'Medlink ops pool: Chidi and Amaka visible under the default rule; nobody hidden');
    expect(/Ruth Akpan/.test(t) && /Bisi Coker/.test(t), 'registered Medlink candidates still shown');
    await shot('10b-pool-hidden-medlink');
    await go(P.searches); t = await canvas().innerText(); noHidden(t, 'Medlink saved searches');
    await go(P.mandate('m_ops')); t = await canvas().innerText(); noHidden(t, 'Medlink ops mandate'); expect(!/aren’t shown|isn’t shown/.test(t), 'ops pipeline: nobody hidden under the default rule');
    await ask('who is in the medlink pipeline', 900); const r = await lastQ(); noHidden(r, 'Q pipeline reply'); expect(/Ruth Akpan/.test(r), `pipeline reply: ${r.slice(0, 120)}`);
    await closeQ(); await go(P.pools); await canvas().getByRole('button', { name: 'Kora Pay', exact: true }).click(); await page.waitForTimeout(300);
  });

  await step('9 change of mind: "actually only the top 3", then yes sends (simulated)', async () => {
    await ask('actually only the top 3', 1000);
    let r = await lastQ(); expect(/Changed it/.test(r) && /Halima Musa isn’t considered: withdrew consent/.test(r), `revised: ${r.slice(0, 220)}`);
    await ask('yes send it', 900);
    r = await lastQ(); expect(/Sent to Kora Pay/.test(r) && /simulated/.test(r), `sent: ${r.slice(0, 120)}`);
    await closeQ(); await go(P.submittals);
    const t = await canvas().innerText(); expect(/\(simulated\)/.test(t) && /Receipt sub_sim/.test(t), 'sent with receipt');
    await shot('11-submittal-sent');
  });

  await step('10 campaign under approved-campaign delegation with limits; withdrawn excluded', async () => {
    await ask('launch the kora payments campaign', 1000);
    let r = await lastQ(); expect(/approved-campaign setting/.test(r) && /4 messages per run/.test(r) && /Halima Musa \(withdrew consent\)/.test(r), `campaign approval: ${r.slice(0, 160)}`);
    noHidden(r, 'campaign approval'); expect(/One more person in the pool won’t be contacted: their privacy settings/.test(r), `privacy-hidden member counted, not named: ${r.slice(-260)}`);
    await ask('yes', 900);
    r = await lastQ(); expect(/Campaign approved/.test(r), `launched: ${r.slice(0, 100)}`);
    await closeQ(); await page.waitForTimeout(3500); await go(P.campaigns);
    const t = await canvas().innerText(); expect(/Sent \(simulated\)/.test(t) && /Excluded/.test(t) && /Held/.test(t), 'messages sent/held/excluded');
    noHidden(t, 'campaign page'); expect(/1 more person in this pool isn’t shown/.test(t), 'campaign counts the privacy-hidden member without naming her');
    await shot('12-campaign');
    await go(P.campaigns); await page.getByRole('button', { name: 'Medlink Health' }).click(); await page.waitForTimeout(300);
    const t2 = await canvas().innerText(); expect(/isn’t signed/.test(t2), 'medlink campaign blocked without signed brief');
    await ask('launch the medlink campaign', 900);
    const r3 = await lastQ(); expect(/brief for this role isn’t signed/.test(r3), `blocked by guideline: ${r3.slice(0, 100)}`);
    await ask('upload the signed medlink brief', 900); await closeQ(); await page.waitForTimeout(4500);
    const t3 = await canvas().innerText(); expect(/Backend Engineer, Claims API brief \(signed\)/.test(t3) && /Signed brief/.test(t3), 'signed brief uploaded (simulated)');
    await shot('12b-docs-uploaded');
    await go(P.campaigns); const t4 = await canvas().innerText(); expect(/Review and launch with Q/.test(t4), 'medlink campaign now launchable');
  });

  await step('11 resume the paused Medlink work from where it stopped', async () => {
    await ask('resume medlink', 900);
    const r = await lastQ(); expect(/Resumed Medlink/.test(r) && /from \d+ of 36/.test(r), `resume: ${r.slice(0, 120)}`);
    await closeQ(); await shot('13-agents-resumed');
  });

  await step('12 curveball [info] conflicting requirements: Kora on-site vs Medlink remote', async () => {
    await ask('any conflicts between the clients?', 900);
    const r = await lastQ(); expect(/Femi Ogun/.test(r) && /on-site/.test(r) && /remote only/.test(r) && /keep the two records separate/.test(r), `conflict: ${r.slice(0, 140)}`);
    await shot('14-conflict');
  });

  await step('13 collaboration note @mentioning Tunde', async () => {
    await ask('tell tunde to check femis references before friday', 900);
    const r = await lastQ(); expect(/mentioning Tunde/.test(r), `note: ${r.slice(0, 100)}`);
    await closeQ(); await go(P.notes);
    const t = await canvas().innerText(); expect(/@Tunde check femis references/i.test(t), 'note on page');
    await shot('15-notes');
  });

  await step('14 client report: Q drafts from Kora only, Dele edits, isolation check, share (simulated)', async () => {
    await ask('draft the kora report', 900);
    await closeQ();
    let t = await canvas().innerText(); expect(/Isolation check passed/.test(t), 'isolation check');
    const rep = await canvas().locator('.agency-report').innerText(); expect(!MEDLINK_PEOPLE.some((n) => rep.includes(n)) && !/Medlink/.test(rep), 'no Medlink data in Kora report');
    await canvas().getByRole('button', { name: 'Edit', exact: true }).click();
    const box = canvas().locator('textarea').first(); await box.fill(`${await box.inputValue()} Also see Ruth Akpan.`);
    t = await canvas().innerText(); expect(/Can’t be shared as written/.test(t), 'live isolation check flags a Medlink candidate');
    await shot('16-report-flagged');
    await box.fill('Status for Kora Pay this week. Three shortlisted for Payments Platform Engineer; interviews next.');
    await canvas().getByRole('button', { name: /Save as version/ }).click(); await page.waitForTimeout(400);
    await ask('share the kora report', 900);
    let r = await lastQ(); expect(/Share version 2/.test(r) && /with your edits/.test(r), `share approval: ${r.slice(0, 120)}`);
    await chip(/Share with Kora/).click(); await page.waitForTimeout(500);
    r = await lastQ(); expect(/Shared version 2 with Kora Pay \(simulated/.test(r), `shared: ${r.slice(0, 100)}`);
    await closeQ(); await shot('17-report-shared');
  });

  await step('15 curveball [recover] Tunde (Viewer) is denied the confidential Kora record and requests access', async () => {
    await canvas().getByRole('button', { name: /Tunde · Viewer/ }).click(); await page.waitForTimeout(400);
    await ask('open the confidential kora backend role', 900);
    const r = await lastQ(); expect(/You don’t have access/.test(r) && /Viewer/.test(r), `denied: ${r.slice(0, 100)}`);
    await closeQ(); await go(P.mandate('m_kora_agency'));
    let t = await canvas().innerText(); expect(/Permission denied/.test(t) && /marked this mandate confidential/.test(t), 'denied page with reason');
    await shot('18-tunde-denied');
    await canvas().getByRole('button', { name: 'Request access from Dele' }).click(); await page.waitForTimeout(400);
    t = await canvas().innerText(); expect(/waiting for Dele/.test(t), 'pending request');
    await ask('put the top 3 from the payments pool in front of kora', 800);
    const r2 = await lastQ(); expect(/Viewer/.test(r2) && /can’t send submittals/.test(r2), 'viewer cannot submit');
    await closeQ();
  });

  await step('16 Dele grants access; Tunde can now open the record', async () => {
    await canvas().getByRole('button', { name: /Dele · Owner/ }).click(); await page.waitForTimeout(400);
    await ask('let tunde see it', 900);
    await chip(/Let Tunde see it/).click(); await page.waitForTimeout(400);
    const r = await lastQ(); expect(/Granted/.test(r), `granted: ${r.slice(0, 80)}`);
    await closeQ();
    await canvas().getByRole('button', { name: /Tunde · Viewer/ }).click(); await page.waitForTimeout(400);
    await go(P.mandate('m_kora_agency'));
    const t = await canvas().innerText(); expect(/Backend Engineer \(Kora Pay, via agency\)/.test(t) && /Confidential\./.test(t), 'mandate visible after grant');
    await shot('19-tunde-granted');
    await canvas().getByRole('button', { name: /Dele · Owner/ }).click(); await page.waitForTimeout(300);
  });

  await step('17 pages render for each client (compare, docs, clients) without mixing', async () => {
    for (const r of [P.compare, P.docs, P.clients, P.searches, P.pools, P.submittals]) {
      await go(r);
      for (const c of ['Kora Pay', 'Medlink Health']) {
        await canvas().getByRole('button', { name: c, exact: true }).click(); await page.waitForTimeout(250);
        const t = await canvas().innerText();
        if (c === 'Kora Pay') expect(!MEDLINK_PEOPLE.slice(0, 4).some((n) => t.includes(n)), `${r}: Medlink person on Kora view`);
        else expect(!['Halima Musa', 'Kemi Bassey', 'Segun Ilori', 'Yemi Adeola'].some((n) => t.includes(n)), `${r}: Kora person on Medlink view`);
        noHidden(t, `${r} (${c})`);
      }
      await shot(`20${r.replace(/\//g, '-')}`);
    }
    // Information architecture: nested pages keep their top destination marked in the rail; no duplicate section bar.
    if (!phone) for (const [r, label] of [[P.searches, 'Talent pools'], [P.compare, 'Talent pools'], [P.notes, 'Clients'], [P.mandate('m_tb_kora_pay'), 'Clients'], [P.agents, 'Agents']]) {
      await go(r); const cur = await railCurrent(); expect(cur.includes(label), `${r}: rail marks "${cur}", expected ${label}`);
    }
    expect(!(await page.locator('.agency-subnav').count()), 'no duplicate in-page section bar');
    // Old flat paths still land on the nested page.
    await page.goto(`${BASE}#/r/agency/compare`); await page.waitForTimeout(700); expect(page.url().endsWith('#/r/agency/pools/compare'), `old path redirect: ${page.url()}`);
    await go('/r/home'); await shot('21-home-end');
  });

  await ctx.close();
}
await b.close();
console.log('\n' + results.join('\n'));
console.log(errors.length ? `\nERRORS (${errors.length}):\n${[...new Set(errors)].join('\n')}` : '\nNo page errors.');
console.log(results.some((r) => r.startsWith('FAIL')) ? 'R4: FAIL' : 'R4: PASS');
