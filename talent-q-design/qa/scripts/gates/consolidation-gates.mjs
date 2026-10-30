// Consolidation quality gates (Build Pack 03 §Output and quality gate; ledger CL-30; CQ-19).
// Each gate drives real state through the app's own store and registered ops, then checks the invariant in
// both the data and the rendered page:
//   QG-01  agency visibility: Dele (Talentbridge) can't reach Kora's rubric, Kora-only evidence, Tobi or Seyi Okoro
//   QG-02  revocation and caches: Tobi stops sharing a reviewed sample with Kora; data, comparison, profile and
//          Q's live result card all drop it
//   QG-03  unknown is never zero: the role index averages only observed criteria; no rating gives "no index"
//   QG-04  rubric version consistency: an approved version is frozen; edits open a new draft; ratings stay bound
//   QG-05  no outbound without approval: no message reaches a sent state without an approver and approved content
// Usage: node qa/scripts/gates/consolidation-gates.mjs [base=http://localhost:4174/]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const BASE = process.argv[2] || 'http://localhost:4174/';
let fails = 0; const step = (ok, gate, n, x = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${gate} ${n}${x ? ` · ${String(x).slice(0, 160)}` : ''}`); };
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);

const qa = (fn, ...args) => page.evaluate(([f, a]) => { const q = window.__tqQA; return q[f](q.getWorld(), ...a); }, [fn, args]);
const W = (fn) => page.evaluate(`(${fn})(window.__tqQA.getWorld())`);
const act = (op, args) => page.evaluate(([o, a]) => window.__tqQA.act(o, a), [op, args]);
const as = async (actor, route) => {
  await page.evaluate((a) => window.__tqQA.update((w) => { w.session.actor = a; w.actors.find((x) => x.id === a).signedUp = true; }), actor);
  await page.evaluate((r) => { location.hash = r; }, route); await page.waitForTimeout(900);
};
const ask = async (t) => { await page.fill('#q-ask', t); await page.keyboard.press('Enter'); await page.waitForTimeout(1400); return (await page.locator('.ds-thread .ds-q').allInnerTexts()).slice(-2).join(' / '); };
const canvas = () => page.locator('#ds-content').innerText();
const allBefore = await W((w) => w.threads.flatMap((t) => t.messages).map((m) => m.id));
const sentBefore = await W((w) => w.threads.flatMap((t) => t.messages).filter((m) => m.status === 'SENT_SIMULATED' || m.status === 'RECEIVED').map((m) => m.id));

// ---------- QG-03 / QG-04 need an approved rubric: Ada drafts with Q's proposal and approves v1 ----------
await as('u_ada', '/r/home');
await act('rb.propose', { mandateId: 'm_backend' });
await act('rb.approve', { mandateId: 'm_backend' });
const v1 = await W((w) => { const r = w.areas.rubrics.list.find((x) => x.mandateId === 'm_backend'); return r && JSON.parse(JSON.stringify(r.versions.find((v) => v.v === 1))); });
step(v1?.state === 'APPROVED', 'QG-04', 'rubric v1 approved through the real op', v1?.state);

// ---------- QG-01 agency visibility ----------
// Seyi Okoro (verified employers only, no relationship with the agency) is invisible to Talentbridge.
step(!(await qa('canSeeCandidate', 'p_seyio', 'org_tb')), 'QG-01', "Talentbridge can't find Seyi Okoro");
step((await qa('visibleEvidence', 'p_seyio', 'org_tb')).length === 0, 'QG-01', "Talentbridge reads none of Seyi Okoro's evidence");
// Tobi shared one item with Talentbridge himself; the agency may read exactly that, never what he shared with Kora.
const tbTobi = (await qa('visibleEvidence', 'p_tobi', 'org_tb')).map((e) => e.evidenceId);
const koraOnly = await W((w) => w.evidence.filter((e) => e.ownerId === 'p_tobi' && e.sharedWith?.includes('org_kora') && !e.sharedWith.includes('org_tb')).map((e) => e.evidenceId));
step(koraOnly.length > 0 && !tbTobi.some((id) => koraOnly.includes(id)), 'QG-01', "Talentbridge reads only what Tobi shared with it, none of his Kora-only items", `agency sees ${tbTobi.join(',') || 'nothing'}`);
await as('u_dele', '/r/home');
const critLabels = (v1?.criteria ?? []).map((c) => c.label).filter(Boolean);
const rRub = await ask("show me Kora's rubric for the senior backend role");
step(!critLabels.some((l) => rRub.includes(l)) && !/\bv\d|in force|draft/i.test(rRub), 'QG-01', "Q gives Dele nothing of Kora's rubric, not even whether one exists", rRub);
const rTobi = await ask('show me everything about Tobi');
await page.waitForTimeout(400);
const tobiPage = await canvas();
const koraTitles = await W((w) => w.evidence.filter((e) => e.ownerId === 'p_tobi' && e.sharedWith?.includes('org_kora') && !e.sharedWith.includes('org_tb')).map((e) => e.title.slice(0, 28)));
step(!koraTitles.some((x) => (rTobi + tobiPage).includes(x)), 'QG-01', "Q and the profile give Dele none of Tobi's Kora-only evidence", rTobi);
await as('u_dele', '/r/people/p_seyio');
step(!/PostgreSQL Associate|Checkout API reliability/.test(await canvas()), 'QG-01', "Dele opening Seyi Okoro's profile by URL sees no evidence");

// ---------- QG-02 revocation reaches data, pages and Q's live card ----------
await as('u_ada', '/r/home');
const before = await qa('proofReading', 'p_tobi');
step((await qa('visibleEvidence', 'p_tobi', 'org_kora')).some((e) => e.evidenceId === 'e_tobi_incident'), 'QG-02', 'before: Kora sees the reviewed debugging sample');
await ask('find someone who can troubleshoot Postgres, not just list it on a CV');
await page.evaluate(() => window.__tqQA.update((w) => { const e = w.evidence.find((x) => x.evidenceId === 'e_tobi_incident'); e.revokedFrom = [...new Set([...(e.revokedFrom ?? []), 'org_kora'])]; }));
await page.waitForTimeout(500);
step(!(await qa('visibleEvidence', 'p_tobi', 'org_kora')).some((e) => e.evidenceId === 'e_tobi_incident'), 'QG-02', 'after: Kora no longer reads it');
const after = await qa('proofReading', 'p_tobi');
const r4 = (r) => r.rows.find((x) => x.reqId === 'r4')?.level;
step(r4(before) !== r4(after), 'QG-02', 'the CV-and-proof reading drops what only that sample supported (on-call)', `${r4(before)} → ${r4(after)}`);
const thread = await page.locator('.ds-thread').innerText();
step(!/lock contention/i.test(thread), "QG-02", "Q's live result card no longer cites the sample");
for (const r of ['/r/compare', '/r/people/p_tobi']) { await as('u_ada', r); step(!/lock contention|Debugging sample/.test(await canvas()), 'QG-02', `${r} no longer shows it`); }

// ---------- QG-03 unknown is never zero ----------
await page.evaluate(() => window.__tqQA.update((w) => {
  const r = w.areas.rubrics.list.find((x) => x.mandateId === 'm_backend'); const v = r.versions.find((x) => x.v === 1);
  const c = v.criteria.filter((k) => k.kind !== 'COMPATIBILITY')[0];
  w.areas.rubrics.ratings.push({ id: 'qg_r1', rubricId: r.id, v: 1, personId: 'p_seyio', criterionId: c.id, rating: 4, uncertainty: 'LOW', refs: [], source: 'REVIEWER', reviewed: true, by: 'u_ada', at: new Date().toISOString(), note: 'gate' });
}));
const idx = await page.evaluate(() => ({ s: JSON.parse(JSON.stringify(window.__tqQA.getWorld().areas.rubrics)) }));
const ver = idx.s.list.find((x) => x.mandateId === 'm_backend').versions.find((x) => x.v === 1);
const crit = ver.criteria.filter((k) => k.kind !== 'COMPATIBILITY');
const total = crit.reduce((s, c) => s + c.weight, 0); const w0 = crit[0].weight;
// Recompute by the documented formula; with unknown counted as zero the index would be 100·w0/total instead.
const expected = 100; const zeroFilled = Math.round((100 * w0) / total);
const shown = await page.evaluate(() => import('/src/state/areas/rubrics.ts').then((m) => m.roleIndex(window.__tqQA.getWorld(), 'm_backend', 'p_seyio')).catch(() => null));
if (shown) {
  step(shown.index === expected && shown.coverage < 100, 'QG-03', 'one observed criterion: index over observed only, coverage shown', `index ${shown.index} (zero-filled would be ${zeroFilled}), coverage ${shown.coverage}%`);
  const none = await page.evaluate(() => import('/src/state/areas/rubrics.ts').then((m) => m.roleIndex(window.__tqQA.getWorld(), 'm_backend', 'p_kunle')));
  step(none.index === null, 'QG-03', 'no ratings: no index (not 0)', JSON.stringify(none));
} else {
  // Built bundle: no module URLs. Check the arithmetic through what the comparison renders instead.
  await as('u_ada', '/r/compare');
  step(!/(^|[^\d.])0 ?(%|\/100)(?!\d)/.test(await canvas()), 'QG-03', 'the comparison shows no 0% or 0/100 for unknowns');
}
const zeros = await qa('proofReading', 'p_seyio');
step(zeros.rows.every((r) => r.level !== 0 && r.level !== '0'), 'QG-03', 'proof reading uses levels (none/claim/…), never a numeric zero', zeros.rows.map((r) => r.level).join(','));
await as('u_ada', '/r/compare');
const cmp = await canvas();
step(!/\breject/i.test(cmp), 'QG-03', 'no reject language on the comparison');

// ---------- QG-04 rubric version consistency ----------
await act('rb.weight', { mandateId: 'm_backend', cid: v1.criteria[0].id, weight: v1.criteria[0].weight + 5 });
const vs = await W((w) => JSON.parse(JSON.stringify(w.areas.rubrics.list.find((x) => x.mandateId === 'm_backend').versions)));
const v1now = vs.find((v) => v.v === 1);
step(JSON.stringify(v1now.criteria) === JSON.stringify(v1.criteria), 'QG-04', 'editing after approval leaves v1 unchanged (frozen)');
step(vs.some((v) => v.v === 2 && v.state === 'Q_PROPOSED'), 'QG-04', 'the edit opened draft v2', vs.map((v) => `v${v.v}:${v.state}`).join(' '));
const ratingsOk = await W((w) => { const r = w.areas.rubrics; return r.ratings.every((x) => r.list.some((k) => k.id === x.rubricId && k.versions.some((v) => v.v === x.v))); });
step(ratingsOk, 'QG-04', 'every rating is bound to a version that exists');
step(await W((w) => w.areas.rubrics.ratings.filter((x) => x.v === 2).length === 0), 'QG-04', 'no ratings were moved to the unapproved draft');

// ---------- QG-05 no outbound without approval ----------
await act('ev.reuse', { personId: 'p_seyio', reqId: 'r3', decision: 'BOUNDED_SAMPLE', reason: 'gate', evidenceIds: ['e_seyio_cert'] });
const reuse = await W((w) => w.areas.proof.reuse.filter((r) => r.personId === 'p_seyio').map((r) => r.state));
step(!reuse.includes('SENT'), 'QG-05', 'a sample request is not marked sent until a message is approved', reuse.join(','));
await as('u_ada', '/r/messages');
await ask('email Tobi an interview invite for Thursday or Friday');
const sentNow = await W((w) => w.threads.flatMap((t) => t.messages).filter((m) => m.status === 'SENT_SIMULATED' || m.status === 'RECEIVED').map((m) => ({ id: m.id, by: m.approvedBy, h: m.approvedHash })));
const newSent = sentNow.filter((m) => !sentBefore.includes(m.id));
step(newSent.every((m) => m.by), 'QG-05', 'every message sent during the gates has an approver', `${newSent.length} new sent`);
const toTobi = (await W((w) => w.threads.flatMap((t) => t.messages).filter((m) => m.to === 'p_tobi').map((m) => ({ id: m.id, s: m.status })))).filter((m) => !allBefore.includes(m.id));
step(toTobi.length > 0 && toTobi.every((m) => m.s === 'DRAFT' || m.s === 'AWAITING_APPROVAL'), 'QG-05', "Q's invite to Tobi exists and waits for approval, not sent", toTobi.map((m) => m.s).join(','));
// An interviewer (Musa) can't send.
await as('u_musa', '/r/messages');
const hm = await ask('send the interview invite to Tobi now');
const sentHm = await W((w) => w.threads.flatMap((t) => t.messages).filter((m) => (m.status === 'SENT_SIMULATED') && m.approvedBy === 'u_musa').length);
step(sentHm === 0, 'QG-05', 'an interviewer cannot send', hm);

step(errors.length === 0, 'ALL', 'no page errors', errors.join(' | '));
console.log(fails ? `\n${fails} gate check(s) failed` : '\nAll gate checks passed');
await b.close(); process.exit(fails ? 1 : 0);
