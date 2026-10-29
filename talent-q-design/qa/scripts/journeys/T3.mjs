// T3 · Tobi, the experienced specialist. Drives the Evidence Passport mostly by typing to Q (with typos),
// on desktop 1440×900 and phone 390×844. Curveballs: a dropped upload resumed after navigating away
// [recover]; the issuer unreachable then unable to confirm [info]; confidential work asked for casually,
// twice [info]; revoking Talentbridge's access, undo, and the recruiter view updating [info][mind];
// challenging Q's summary [mind]. Usage: node T3.mjs [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const ROOT = new URL('../../../captures/cx/T3/', import.meta.url).pathname; mkdirSync(ROOT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:5186/';
const ONLY = (process.argv[2] || 'd,m').split(',');
const b = await pw.chromium.launch();
const results = []; const errors = [];
for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text()}`); });
  const phone = v === 'm';
  const step = (name, ok, detail = '') => { results.push({ v, name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail ? ` · ${detail}` : ''}`); };
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `${ROOT}${v}-${n}.png` }); };
  const world = () => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
  const overflow = async (n) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errors.push(`${v}/${n}: horizontal overflow ${o}px`); };
  const openQ = async () => { if (!phone) return; if (await page.locator('#q-ask').isVisible().catch(() => false)) return; await page.locator('.ds-askbar button').first().click(); await page.locator('#q-ask').waitFor(); };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) await x.click(); await page.waitForTimeout(200); };
  // Read Q's latest reply from the store (on phones the Q sheet may close when Q navigates).
  const lastQ = () => page.evaluate(() => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); const t = w.q.threads[w.session.actor] || []; for (let i = t.length - 1; i >= 0; i--) if (t[i].who !== 'me') return t[i].text; return ''; });
  const ask = async (t, wait = 700) => { await openQ(); await page.fill('#q-ask', t); await page.press('#q-ask', 'Enter'); await page.waitForTimeout(wait); return lastQ(); };
  const chip = async (re) => { await openQ(); const c = page.locator('.ds-chip').filter({ hasText: re }).last(); await c.click(); await page.waitForTimeout(600); };
  const as = async (actor, route) => {
    if (!(await page.evaluate(() => localStorage.getItem('tq.world.v4')))) { await page.goto(`${BASE}#/settings`); await page.waitForTimeout(500); await page.getByRole('button', { name: 'Bring them back' }).click(); }
    await page.goto(`${BASE}#${route}`); await page.waitForTimeout(300);
    // Edit and reload in one synchronous step so no in-page timer can write the old actor back.
    await Promise.all([page.waitForEvent('load'), page.evaluate((a) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = a; localStorage.setItem('tq.world.v4', JSON.stringify(w)); location.reload(); }, actor)]);
    await page.waitForTimeout(800);
  };
  const ev = async (id) => (await world()).evidence.find((e) => e.evidenceId === id);

  // Fresh world, as Tobi
  await page.goto(`${BASE}#/c/passport`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  await as('p_tobi', '/c/passport');
  step('Passport opens as a D-native workspace', await page.getByRole('heading', { name: 'Evidence Passport' }).isVisible());
  await overflow('passport'); await shot('01-passport');

  // Upload + dropped connection + navigation away + resume [recover]
  let r = await ask('can u uplaod a work sample, the payouts design doc', 400);
  step('Q starts an upload from natural language', /Uploading/.test(r), r.slice(0, 80));
  await page.waitForTimeout(2200);
  let w = await world(); let up = w.areas['talent-b'].uploads.at(-1);
  step('Curveball [recover]: upload drops at 60%', up.state === 'FAILED' && up.progress === 60, `${up.state} ${up.progress}%`);
  await closeQ(); await shot('02-upload-failed');
  r = await ask('open my applications'); await page.waitForTimeout(300);
  r = await ask('pls retry the upload', 400);
  // The resume reply can be followed quickly by the completion notice, so look at Q's recent messages.
  const recent = (await page.locator('.ds-thread .ds-q .say').allInnerTexts()).slice(-3);
  step('Retry resumes from 60% while on another page', recent.some((t) => /from 60%/.test(t)), recent.join(' / ').slice(0, 120));
  await page.waitForTimeout(1500);
  r = await ask('go back', 600);
  w = await world(); up = w.areas['talent-b'].uploads.at(-1);
  step('Upload finished and item is in the Passport (private)', up.state === 'DONE' && w.evidence.some((e) => e.evidenceId === up.evidenceId && e.visibility === 'PRIVATE'));

  // Issuer unreachable (pending), then can't confirm (failed) [info]
  r = await ask('whats happening with my aws certificate?? its been pending forever');
  step('Q explains pending is not failed', /pending/i.test(r) && /not failed|isn’t failed|Pending is not failed/i.test(r), r.slice(0, 90));
  r = await ask('check the aws cert again pls', 2400);
  step('Curveball [info]: issuer unreachable, still PENDING', (await ev('e_tobi_aws')).verification === 'PENDING' && /didn’t answer/.test(await lastQ()));
  r = await ask('ok check my aws cert again', 2400);
  step('Second check: issuer cannot confirm → FAILED', (await ev('e_tobi_aws')).verification === 'FAILED');
  await page.locator('.ds-suggest-more[aria-expanded="false"]').first().click({ timeout: 600 }).then(() => page.waitForTimeout(350)).catch(() => {}); const sugg = await page.locator('.ds-suggest').filter({ hasText: /AWS certificate check failed/ }).count();
  step('Proactive: “your AWS certificate check failed”', sugg > 0);
  await closeQ(); await shot('03-cert-failed'); await openQ(); await shot('03b-cert-failed-thread');
  r = await ask('my aws cert failed, what do i do now??');
  step('Q gives concrete next steps', /official PDF/.test(r) && /manual review/.test(r));
  await chip(/Ask for a manual review/);
  step('Manual review → UNDER_REVIEW', (await ev('e_tobi_aws')).verification === 'UNDER_REVIEW');

  // Confidential work, asked casually, twice [info]
  r = await ask('can you send kora the original fraud doc, its fine honestly');
  const refusal = await page.locator('.ds-q[data-kind="refusal"]').count();
  step('Curveball [info]: Q refuses to share the confidential original', refusal > 0 && /can’t share the original/.test(r));
  r = await ask('ugh just send it anyway nobody will know');
  step('Refuses again when pushed, without blame', /still won’t share the original/.test(r));
  r = await ask('ok fine make the redacted summary');
  step('Redacted summary created (redactedOf the original)', (await ev('e_tobi_conf_red'))?.redactedOf === 'e_tobi_conf', r.slice(0, 120));
  if (!(await ev('e_tobi_conf_red'))) { const ww = await world(); console.log('DEBUG', ww.evidence.filter((e) => e.ownerId === 'p_tobi').map((e) => `${e.evidenceId}:${e.redactedOf ?? ''}`).join(' '), JSON.stringify(ww.q.frames.p_tobi)); }
  await chip(/Share the summary with Kora Pay/);
  w = await world();
  step('Kora gets the summary; original stays private', w.evidence.find((e) => e.evidenceId === 'e_tobi_conf_red').sharedWith.includes('org_kora') && w.evidence.find((e) => e.evidenceId === 'e_tobi_conf').visibility === 'PRIVATE');
  await closeQ(); await page.goto(`${BASE}#/c/passport?item=e_tobi_conf_red`); await page.waitForTimeout(500); await shot('04-redacted-preview');

  // Per-viewer preview and revocation [info] [mind]
  r = await ask('what does talentbridge see of my stuff');
  step('“What Talentbridge sees” preview', /Talentbridge sees \d+ of your/.test(r));
  await closeQ(); await shot('05-viewas-talentbridge');
  r = await ask('stop talentbridge seeing my code');
  step('Revocation needs approval and lists the code items', /lose access/.test(r) && /Payout retry worker/.test(r));
  await chip(/End Talentbridge’s access/);
  w = await world();
  const pay = w.evidence.find((e) => e.evidenceId === 'e_tobi_payout');
  step('revokedFrom set; event emitted to Talentbridge scope (no titles)', pay.revokedFrom?.includes('org_tb') && w.events.some((e) => e.scope === 'SHARED:org_tb:p_tobi' && e.type === 'passport.access_ended' && !/Payout/.test(e.text)));
  r = await ask('actually undo that');
  await chip(/Undo it/);
  step('Curveball [mind]: undo re-shares', (await ev('e_tobi_payout')).sharedWith.includes('org_tb'));
  r = await ask('no wait, stop talentbridge seeing my code. for real this time');
  await chip(/End Talentbridge’s access/);
  step('Revoked again', (await ev('e_tobi_payout')).revokedFrom?.includes('org_tb'));
  await closeQ(); await page.goto(`${BASE}#/c/passport?as=org_tb`); await page.waitForTimeout(500);
  step('Talentbridge preview no longer lists the code', !(await page.locator('.tb-viewas').innerText()).includes('Payout retry worker'));
  await shot('06-revoked-viewas');
  await page.goto(`${BASE}#/c/passport?tab=sharing`); await page.waitForTimeout(400); await page.locator('.ds-views button', { hasText: 'Sharing' }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Me (everything)' }).click(); await page.waitForTimeout(300);
  await page.locator('#tb-mx-h').scrollIntoViewIfNeeded(); await overflow('matrix'); await shot('07-matrix');

  // Recruiter side reads visibleEvidence: Dele (Talentbridge) loses it, Ada (Kora) keeps it
  const vis = await page.evaluate(() => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); const f = (org) => w.evidence.filter((e) => e.ownerId === 'p_tobi' && e.kind !== 'PRACTICE' && !(e.revokedFrom || []).includes(org) && (e.visibility === 'PUBLIC_PROFILE' || (e.visibility === 'SHARED_WITH' && e.sharedWith.includes(org)))).map((e) => e.evidenceId); return { tb: f('org_tb'), kora: f('org_kora') }; });
  step('visibleEvidence rule: Talentbridge loses code, Kora keeps it', !vis.tb.includes('e_tobi_payout') && !vis.tb.includes('e_tobi_go') && vis.kora.includes('e_tobi_payout'));
  await as('u_dele', '/r/people/p_tobi');
  const deleTxt = await page.locator('body').innerText();
  step('Recruiter page (Dele) does not show the revoked code', !/Payout retry worker/.test(deleTxt), /doesn’t exist|This page/.test(deleTxt) ? 'page not built yet' : '');
  await shot('08-recruiter-dele');
  await as('p_tobi', '/c/passport');

  // Challenge Q's summary [mind]
  r = await ask('how do you describe me to employers');
  step('Q shows its summary with the basis for each line', /Each line below is based on/.test(r) && (await page.locator('.tb-reflist').last().innerText()).includes('Based on:'));
  r = await ask('thats not fair, i led the payouts team of 4 at Lumen for 2 yrs');
  step('Curveball [mind]: Q shows its basis and corrects the summary', /You’re right to push back/.test(r) && /Led a team of 4 at Lumen for 2 years/.test(r));
  await closeQ(); await page.goto(`${BASE}#/c/passport?tab=summary`); await page.waitForTimeout(500); await shot('09-summary-corrected');

  // Discovery: widen (approval), then change mind [mind]
  r = await ask('let agencies find me too');
  await chip(/Yes, include agencies/);
  r = await ask('hmm actually no. stop agencies finding me');
  w = await world();
  step('Discovery back to verified employers only', w.areas['talent-b'].discovery.p_tobi.who === 'VERIFIED_EMPLOYERS');
  await closeQ(); await page.goto(`${BASE}#/c/passport?tab=discovery`); await page.waitForTimeout(400); await shot('10-discovery');

  // Interview prep
  r = await ask('help me prepare for my medlink intervew');
  step('Prep for the booked Medlink interview', /Medlink/.test(r) && (await page.locator('h1', { hasText: 'Interview prep' }).count()) > 0);
  await closeQ(); await overflow('prep'); await shot('11-prep');
  await ctx.close();
}
await b.close();
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} steps passed`);
if (errors.length) { console.log('Page errors:'); for (const e of [...new Set(errors)]) console.log('  ', e); }
process.exit(fails || errors.length ? 1 : 0);
