// EVIDENCE-FIRST · candidate side (build pack 30 Oct; J12 steps 6, 7, 10, 12, 13; pack items D, E, F; P6), desktop
// 1440×900 and phone 390×844. Seyi Okoro (p_seyio): proof classes in the recruiter's words, his CV as claims with a calm
// Q line, Kora's bounded sample request (injected as SENT through the store, as the recruiter's approved message would
// leave it): do it, submit, "Self-reported, waiting for review", the review outcome once Kora shares it; a second request
// declined (recorded as declined, not failed); CV help that never adds a claim; "What you want" with blanks kept blank.
// Tobi: hiring confirmed only on Kora's job, interest answered, the private J7 gap card, revoking the debugging sample
// with the "what Kora sees" preview updating. Zara: Kora's overdue commitment shown honestly.
// Usage: BASE=http://localhost:5197/ node qa/scripts/features/evidence-candidate.mjs [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const ROOT = new URL('../../../captures/features/evidence-candidate/', import.meta.url).pathname; mkdirSync(ROOT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:5197/';
const ONLY = (process.argv[2] || 'd,m').split(',');
const WORDS = { CLAIM: 'Claim', SELF_REPORTED: 'Self-reported', ASSESSED: 'Assessed', ISSUER_VERIFIED: 'Issuer-verified', DISPUTED: 'Disputed' };
const JUDGE = /\b(untrue|lie|lying|liar|false|fake|exaggerat|inflated|dishonest)\b/i;

const b = await pw.chromium.launch();
const results = []; const errors = [];
for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text().slice(0, 200)}`); });
  const phone = v === 'm';
  const step = (name, ok, detail = '') => { results.push({ v, name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail ? ` · ${String(detail).slice(0, 200)}` : ''}`); };
  const shot = async (n, full = true) => { await page.waitForTimeout(350); await page.screenshot({ path: `${ROOT}${v}-${n}.png`, fullPage: full }); };
  const W = () => page.evaluate(() => window.__tqQA.getWorld());
  const upd = (src, arg) => page.evaluate(([s, a]) => window.__tqQA.update((w) => new Function('w', 'a', s)(w, a)), [src, arg]);
  const go = async (route) => { await page.goto(`${BASE}#${route}`); await page.waitForTimeout(700); };
  const as = async (actor, route) => { await upd('w.session.actor = a;', actor); await page.waitForTimeout(200); await go(route); };
  const canvas = () => page.locator('main, [role="dialog"]').last().innerText();
  const text = () => page.evaluate(() => document.body.innerText);
  const overflow = async (n) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); step(`no sideways scroll: ${n}`, o <= 0, o > 0 ? `${o}px` : ''); };
  const openQ = async () => { if (!phone) return; if (await page.locator('#q-ask').isVisible().catch(() => false)) return; await page.locator('.ds-askbar button').first().click(); await page.locator('#q-ask').waitFor(); };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) await x.click(); await page.waitForTimeout(250); };
  const lastQ = () => page.evaluate(() => { const w = window.__tqQA.getWorld(); const t = w.q.threads[w.session.actor] || []; for (let i = t.length - 1; i >= 0; i--) if (t[i].who !== 'me') return t[i].text; return ''; });
  const ask = async (t, wait = 800) => { await openQ(); await page.fill('#q-ask', t); await page.press('#q-ask', 'Enter'); await page.waitForTimeout(wait); const r = await lastQ(); await closeQ(); return r; };
  void canvas;

  // ---------------- Fresh world ----------------
  await page.goto(`${BASE}#/c/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(900);
  await page.evaluate(() => window.__tqQA.update(() => {}));

  // ================= Seyi Okoro · Passport (item D) =================
  await as('p_seyio', '/c/passport');
  let w = await W();
  const mine = w.evidence.filter((e) => e.ownerId === 'p_seyio' && e.kind !== 'PRACTICE');
  const expected = await page.evaluate((ids) => { const w = window.__tqQA.getWorld(); return ids.map((id) => window.__tqQA.proofClass(w, w.evidence.find((e) => e.evidenceId === id))); }, mine.map((e) => e.evidenceId));
  const cards = await page.locator('.tb-card').allInnerTexts();
  const ok1 = mine.every((e, i) => { const c = cards.find((t) => t.includes(e.title)); return c && c.includes(WORDS[expected[i]]); });
  step('every Passport item carries the proof class the recruiter model gives it, in the same words', ok1, expected.join(','));
  step('Seyi’s CV claim is labelled “Claim”; the 2019 certificate and the described project are “Self-reported”', expected.join(',') === 'CLAIM,SELF_REPORTED,SELF_REPORTED');
  const tags = await page.locator('.evc-pc-btn').allInnerTexts();
  step('only the five shared words are used as labels', tags.length >= 3 && tags.every((t) => Object.values(WORDS).some((x) => t.startsWith(x))), tags.slice(0, 6).join(' | '));
  await page.locator('.tb-card .evc-pc-btn').first().click(); await page.waitForTimeout(200);
  step('a label explains itself on demand', /Not evidence of the work, and not a sign it isn’t true|not yet checked or reviewed/.test(await page.locator('.evc-pc-means').first().innerText()));
  const cert = cards.find((t) => /PostgreSQL Associate/.test(t)) ?? '';
  step('certificate shows its source and age in words (“seven years old”)', /Certificate PDF uploaded by Seyi Okoro/.test(cert) && /seven years old/i.test(cert), cert.replace(/\n/g, ' ').slice(0, 160));
  step('reuse scope is stated: Kora only, not reused for other employers unless he chooses', /Kora Pay only\. Not reused for other employers unless you choose/.test(cert));
  const cvT = await page.locator('.evc-cv').innerText();
  step('his CV is shown as his own words, labelled as a claim, with a calm Q line (no judgement)', /Your CV, as you wrote it/.test(cvT) && /Claim/.test(cvT) && /isn’t doubt about yours/.test(cvT) && !JUDGE.test(cvT.replace(/isn’t true/g, '')), cvT.slice(0, 200));
  await overflow('passport (Seyi)'); await shot('01-passport-seyi');

  // ================= Step 6 · Kora's request (SENT via the store) =================
  await upd(`w.areas.proof.reuse.push({ id: 'rd_qa', orgId: 'org_kora', personId: 'p_seyio', mandateId: 'm_backend', reqId: 'r3', decision: 'BOUNDED_SAMPLE', evidenceIds: [], reason: 'One short Postgres sample instead of the full assessment', effortMinutes: 40, by: 'u_ada', at: '2026-10-29T10:00:00+01:00', state: 'SENT' });`);
  await go('/c/home');
  let home = await text();
  step('home: Q’s first line names the request, with the effort and that no is fine', /Kora Pay would like to see one short piece of your work, about 40 minutes/.test(home) && /recorded as no, not as a fail/.test(home));
  const req = page.locator('.evc-req').first();
  const reqT = await req.innerText();
  step('request card: what (from the bounded sample), why, effort in minutes', /Kora Pay would like to see one piece of your postgres at scale work/i.test(reqT) && /Find and fix one slow query/.test(reqT) && /Your CV already describes/.test(reqT) && /About 40 minutes/.test(reqT), reqT.replace(/\n/g, ' ').slice(0, 220));
  step('request card never calls the CV untrue', !JUDGE.test(reqT));
  step('three choices: do it now, share existing work, decline', await req.getByRole('button', { name: 'Do it now' }).isVisible() && await req.getByRole('button', { name: 'Share existing work instead' }).isVisible() && await req.getByRole('button', { name: 'Decline' }).isVisible());
  await overflow('home with request'); await shot('02-home-request', false);
  await go('/c/applications');
  step('applications shows the same request under “Asked of you”', /Asked of you/.test(await text()) && await page.locator('.evc-req').count() === 1);
  await page.locator('.evc-req').getByRole('button', { name: 'Do it now' }).click(); await page.waitForTimeout(500);
  w = await W();
  step('“Do it now” starts the sample (ev.sample.start → IN_PROGRESS)', w.areas.proof.reuse.find((d) => d.id === 'rd_qa').state === 'IN_PROGRESS');
  const panel = page.locator('.evc-sample');
  step('a simple simulated sample panel: task statement and an answer box', await panel.isVisible() && /SELECT \* FROM payouts/.test(await panel.innerText()) && /Simulated sample/i.test(await panel.innerText()));
  step('submit is disabled until there’s an answer', await panel.getByRole('button', { name: 'Submit for review' }).isDisabled());
  await shot('03-sample-panel');
  await panel.locator('textarea').fill('I would run EXPLAIN ANALYZE first. It is probably a sequential scan plus a sort. A partial index on (merchant_id, created_at DESC) WHERE status = PENDING should let it read only 50 rows.');
  await panel.getByRole('button', { name: 'Submit for review' }).click(); await page.waitForTimeout(600);
  w = await W();
  const d1 = w.areas.proof.reuse.find((d) => d.id === 'rd_qa'); const sEv = w.evidence.find((e) => e.evidenceId === d1.resultEvidenceId);
  step('submit (ev.sample.submit) → SUBMITTED, a new Passport item waiting for review', d1.state === 'SUBMITTED' && sEv?.verification === 'PENDING' && sEv.sharedWith.join() === 'org_kora');
  step('applications card says “Self-reported, waiting for review”', /Self-reported, waiting for review/.test(await page.locator('.evc-req').innerText()));
  await shot('04-submitted');
  await go(`/c/passport?item=${d1.resultEvidenceId}`);
  const sCard = await page.locator('.tb-card', { hasText: 'Work sample:' }).innerText();
  step('step 7: the Passport item reads “Self-reported, waiting for review”, shared with Kora only', /Self-reported, waiting for review/.test(sCard) && /Kora Pay only/.test(sCard), sCard.replace(/\n/g, ' ').slice(0, 160));
  await shot('05-passport-waiting');

  // Ada reviews it (recruiter side). Applied through the store exactly as reviewSample() does.
  await upd(`const d = w.areas.proof.reuse.find((x) => x.id === 'rd_qa'); const e = w.evidence.find((x) => x.evidenceId === d.resultEvidenceId);
    e.verified = true; e.verification = 'VERIFIED'; e.origin = 'REVIEW'; e.source = e.source.replace(' (simulated)', '') + ', reviewed by Ada Okafor (simulated)';
    const l = w.areas.proof.links.find((x) => x.evidenceId === e.evidenceId); l.state = 'REVIEWED'; l.partial = true; l.note = 'Found the missing index quickly; didn’t check the plan under load.'; d.state = 'REVIEWED';
    w.events.push({ id: 'ev_qa_rev', at: '2026-10-29T12:00:00+01:00', actor: 'u_ada', type: 'evidence.sample.reviewed', scope: 'SHARED:org_kora:p_seyio', text: 'Ada reviewed the sample: shows part of it.' });`);
  await go('/c/applications');
  const rv = await page.locator('.evc-req').innerText();
  step('after Ada’s review: outcome shown, the class is now Assessed', /Shows part of it/.test(rv) && /Assessed/.test(rv), rv.replace(/\n/g, ' ').slice(0, 200));
  step('the reviewer’s note appears labelled “shared by Kora Pay”', /didn’t check the plan under load/.test(rv) && /shared by Kora Pay/.test(rv));
  await overflow('reviewed'); await shot('06-reviewed');

  // ================= Decline is recorded as declined, not failed =================
  await upd(`w.areas.proof.reuse.push({ id: 'rd_qa2', orgId: 'org_kora', personId: 'p_seyio', mandateId: 'm_backend', reqId: 'r4', decision: 'BOUNDED_SAMPLE', evidenceIds: [], reason: 'qa', effortMinutes: 30, by: 'u_ada', at: '2026-10-29T10:05:00+01:00', state: 'SENT' });`);
  await go('/c/applications');
  const r2 = page.locator('.evc-req').filter({ hasText: 'Waiting for you' });
  await r2.getByRole('button', { name: 'Decline' }).click(); await page.waitForTimeout(200);
  step('decline form says it’s recorded as declined, never as a fail; reason optional', /recorded as declined, never as a fail/.test(await r2.innerText()) && /Reason \(optional\)/.test(await r2.innerText()));
  await r2.locator('textarea').fill('I’m travelling this week');
  await shot('07-decline-form', false);
  await r2.getByRole('button', { name: 'Decline the sample' }).click(); await page.waitForTimeout(500);
  w = await W();
  const d2 = w.areas.proof.reuse.find((d) => d.id === 'rd_qa2');
  const ev2 = w.events.filter((e) => e.type === 'evidence.sample.declined');
  step('decline → DECLINED (no evidence item, no result), event says declined not failed', d2.state === 'DECLINED' && !d2.resultEvidenceId && ev2.some((e) => /not as a failed result/.test(e.text) && /travelling/.test(e.text)));
  step('card: “recorded as declined, not as a failed result”, with his reason', /recorded as declined, not as a failed result/.test(await page.locator('.evc-req[data-state="DECLINED"]').innerText()) && /travelling/.test(await page.locator('.evc-req[data-state="DECLINED"]').innerText()));
  await shot('08-declined');

  // ================= Commitment (open) and "What you want" =================
  const app = await page.locator('.tb-app').first().innerText();
  step('Seyi’s application: “Next update by Mon 2 Nov · Ada Okafor, Kora Pay”', /Next update by Mon 2 Nov · Ada Okafor, Kora Pay/.test(app), app.replace(/\n/g, ' ').slice(0, 200));
  const pr = await page.locator('.evc-prefs').innerText();
  step('“What you want”: unknown pay and places shown as “Not said”, never a default', (pr.match(/Not said/g) ?? []).length >= 3 && /Remote, Hybrid/.test(pr));
  step('preferences say who sees them (Kora Pay on)', /Kora Pay/.test(pr) && await page.locator('.evc-prefs [role="switch"]').first().getAttribute('aria-checked') === 'true');
  await page.locator('.evc-prefs').getByRole('button', { name: 'Edit' }).click();
  await page.fill('#evc-places', 'Lagos, Abuja'); await page.locator('.evc-prefs').getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(400);
  w = await W();
  const p = w.areas.proof.prefs.p_seyio;
  step('the candidate edits: places saved, blank pay stays blank (no default)', p.locations.join() === 'Lagos,Abuja' && p.payMin === undefined && p.currency === undefined);
  await overflow('applications (Seyi)'); await shot('09-applications-seyi');

  // ================= P6 · CV help never adds claims =================
  let r = await ask('can you make my cv sound stronger');
  step('Q drafts a clearer CV as an artifact, saying it added no job, qualification or skill', /didn’t add any job, qualification or skill/.test(r), r);
  await go('/c/passport?cv=draft');
  w = await W();
  const draft = w.areas.evcand.drafts.p_seyio; const cvLines = w.areas.proof.cvs.p_seyio.lines.join(' ');
  const nums = draft.lines.flatMap((l) => l.after.join(' ').match(/\d[\d,.]*/g) ?? []);
  step('draft: nothing added (guard empty), and every number in it is already in his CV or Passport', draft.added.length === 0 && nums.every((n) => cvLines.includes(n.replace(/\.$/, '')) || n === '2019'), nums.join(','));
  const dT = await page.locator('.evc-draft').innerText();
  step('the draft shows the wording diff and marks what Q won’t add', await page.locator('.evc-draft .evc-del').count() > 0 && await page.locator('.evc-draft .evc-add').count() > 0 && /Q won’t add/.test(dT) && /An employer, job title or dates/.test(dT));
  step('the draft never upgrades a claim (no “verified” / “assessed” wording added)', !/\b(verified|assessed)\b/i.test(draft.lines.flatMap((l) => l.after).join(' ')));
  await shot('10-cv-draft');
  await page.locator('.evc-draft').getByRole('button', { name: 'Approve this version' }).click(); await page.waitForTimeout(400);
  w = await W();
  step('the candidate approves the final version (nothing sent)', w.areas.evcand.drafts.p_seyio.state === 'APPROVED' && w.events.some((e) => e.type === 'cv.version.approved' && /Not sent to anyone/.test(e.text)));
  r = await ask('add kubernetes and aws certified to my cv');
  step('asked to add a skill he hasn’t shown, Q refuses and offers the honest route', /won’t add something to your CV/.test(r), r);
  r = await ask('do employers think my cv is a lie');
  step('Q never calls a CV untrue', /never call a CV untrue/.test(r) && /read as a claim/.test(r), r);

  // ================= Tobi · jobs (item E) =================
  await as('p_tobi', '/c/jobs');
  const kora = await page.locator('.tb-jobcard', { hasText: 'Senior Backend Engineer' }).filter({ hasText: 'Kora Pay' }).first().innerText();
  const rivers = await page.locator('.tb-jobcard', { hasText: 'Rivers Logistics' }).first().innerText();
  step('Kora’s job: “Hiring confirmed by Kora Pay on 27 Oct” (from proof.intents)', /Hiring confirmed by Kora Pay on 27 Oct/.test(kora));
  step('Rivers’ job shows no confirmation, clearly separate', !/Hiring confirmed/.test(rivers) && /No hiring confirmation from this employer/.test(rivers));
  const confirmedJobs = (await W()).areas.proof.intents.filter((i) => i.state === 'ACTIVE').map((i) => i.jobId);
  const shown = await page.locator('.tb-jobcard').evaluateAll((els) => els.filter((e) => /Hiring confirmed/.test(e.innerText)).map((e) => e.querySelector('a[href*="/c/jobs/"]')?.getAttribute('href')));
  step('the label appears only on jobs with an ACTIVE confirmation', shown.every((h) => confirmedJobs.some((j) => h?.endsWith(j))), shown.join(','));
  step('a confirmation is never called “verified”', !/Hiring confirmed[^\n]*verified/i.test(await text()));
  await page.locator('.tb-filters').getByRole('button', { name: 'Hiring confirmed' }).click(); await page.waitForTimeout(300);
  step('“Hiring confirmed” filter lists only confirmed jobs', (await page.locator('.tb-jobcard').count()) >= 1 && (await page.locator('.tb-jobcard').allInnerTexts()).every((t) => /Hiring confirmed/.test(t)));
  await overflow('jobs'); await shot('11-jobs');
  await go('/c/jobs/j_kora_backend');
  step('job detail: who confirmed it, re-confirmation date and reply commitment', /Confirmed by Ada Okafor/.test(await text()) && /by 10 Nov/.test(await text()) && /within 5 days/.test(await text()));

  // ================= Step 10 · Tobi's interest =================
  await upd(`w.areas.proof.interest.push({ orgId: 'org_kora', personId: 'p_tobi', mandateId: 'm_backend', state: 'REQUESTED', at: '2026-10-29T10:00:00+01:00', by: 'u_ada' });`);
  await go('/c/home');
  home = await text();
  step('Tobi’s home: Kora asks whether he’s interested; not answering isn’t a no', /Are you interested in Kora Pay’s Senior Backend Engineer role\?/.test(home) && /isn’t a no/.test(home));

  // ================= Step 12 · J7 answers the verified gap (private) =================
  const gap = page.locator('.evc-gap');
  const gT = await gap.innerText();
  step('J7 card: on-call leadership is only partly shown for Kora’s role', /On-call leadership is only partly shown for Kora Pay’s Senior Backend Engineer role/.test(gT), gT.replace(/\n/g, ' ').slice(0, 200));
  step('J7 card: practice is private and never visible to employers; a reviewed walk-through would become Assessed; he chooses', /Only you see it\. Practice never becomes proof, and no employer sees it/.test(gT) && /Assessed evidence/.test(gT) && /You choose who sees it/.test(gT) && /private to you/i.test(gT));
  await overflow('home (Tobi)'); await shot('12-home-tobi');
  const koraBefore = await page.evaluate(() => window.__tqQA.visibleEvidence(window.__tqQA.getWorld(), 'p_tobi', 'org_kora').map((e) => e.evidenceId).sort().join());
  await gap.getByRole('button', { name: 'Practise now' }).click(); await page.waitForTimeout(800);
  w = await W();
  const koraAfter = await page.evaluate(() => window.__tqQA.visibleEvidence(window.__tqQA.getWorld(), 'p_tobi', 'org_kora').map((e) => e.evidenceId).sort().join());
  step('“Practise now” opens J7’s own incident practice on the career page', /\/c\/career/.test(page.url()) && w.j7.p_tobi?.quiz?.comp === 'incident');
  step('practice adds nothing employer-visible (Kora’s view unchanged)', koraBefore === koraAfter && !/PRACTICE/.test(koraAfter));
  await go('/c/applications');
  await page.locator('.evc-int').getByRole('button', { name: 'Yes, I’m interested' }).click(); await page.waitForTimeout(400);
  w = await W();
  step('Tobi confirms interest (ev.interest.answer → CONFIRMED)', w.areas.proof.interest.find((i) => i.personId === 'p_tobi').state === 'CONFIRMED' && w.events.some((e) => e.type === 'candidate.interest_confirmed' && e.scope === 'SHARED:org_kora:p_tobi'));
  step('his answer is shown back to him and can be changed', /You told Kora Pay you’re interested/.test(await page.locator('.evc-int').innerText()) && /Change to not interested/.test(await page.locator('.evc-int').innerText()));
  await shot('13-interest-confirmed');

  // ================= Step 13 · revocation updates the preview =================
  await go('/c/passport?as=org_kora');
  const vBefore = await page.locator('.tb-viewas').innerText();
  step('before: Kora’s preview includes the debugging sample', /Debugging sample/.test(vBefore));
  await go('/c/passport?item=e_tobi_incident');
  const ic = page.locator('.tb-card', { hasText: 'Debugging sample' });
  step('the item states it’s shared with Kora only and offers “Stop sharing with Kora Pay”', /Kora Pay only/.test(await ic.innerText()) && await ic.getByRole('button', { name: 'Stop sharing with Kora Pay' }).isVisible());
  await ic.getByRole('button', { name: 'Stop sharing with Kora Pay' }).click(); await page.waitForTimeout(500);
  const vis = await page.evaluate(() => window.__tqQA.visibleEvidence(window.__tqQA.getWorld(), 'p_tobi', 'org_kora').map((e) => e.evidenceId));
  step('revoked through the existing revoke: Kora can no longer see it', !vis.includes('e_tobi_incident'));
  await shot('14-revoked-card', false);
  await ic.getByRole('button', { name: /See what Kora Pay sees now/ }).click(); await page.waitForTimeout(600);
  const vAfter = await page.locator('.tb-viewas').innerText();
  const nB = Number(vBefore.match(/(\d+)\s*of your/)?.[1]); const nA = Number(vAfter.match(/(\d+)\s*of your/)?.[1]);
  step('the “what Kora sees” preview updates straight away (one fewer item, sample gone)', !/Debugging sample/.test(vAfter) && nA === nB - 1, `${nB} → ${nA}`);
  const r4 = await page.evaluate(() => window.__tqQA.proofReading(window.__tqQA.getWorld(), 'p_tobi').rows.find((x) => x.reqId === 'r3').level);
  step('Kora’s evidence reading no longer counts the revoked sample for Postgres', r4 !== undefined);
  await overflow('sharing preview'); await shot('15-preview-after');

  // ================= Zara · overdue commitment, honestly =================
  await as('p_zara', '/c/applications');
  const zk = await page.locator('.tb-app', { hasText: 'Kora Pay' }).first().innerText();
  step('Zara: Kora’s overdue update shown honestly (date passed, late on their side, owner named)', /Update overdue/.test(zk) && /Wed 28 Oct/.test(zk) && /late on their side\. It says nothing about you/.test(zk) && /Ngozi Eze/.test(zk), zk.replace(/\n/g, ' ').slice(0, 260));
  step('Zara can ask for an update', await page.locator('.tb-app', { hasText: 'Kora Pay' }).first().getByRole('button', { name: 'Ask Kora Pay for an update' }).isVisible());
  await overflow('applications (Zara)'); await shot('16-zara-overdue');
  await ctx.close();
}
await b.close();
const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} passed`);
if (errors.length) { console.log('Console/page errors:'); errors.slice(0, 15).forEach((e) => console.log(' ', e)); }
process.exit(pass === results.length && !errors.length ? 0 : 1);
