// MEDIA · candidate-authorised video evidence (audit addendum §F, J11 steps 7–8), desktop 1440×900 and phone 390×844.
// Tobi adds a video by saying it to Q, consents (Kora only, 90 days, alternatives offered), pastes a shortened link
// (never fetched), a sign-in link (fetch failed), uploads, loses the connection at 40% (PAUSED), resumes from the same
// part, transcription (simulated), corrects a line by telling Q, shares only parts 1 and 3 with Kora, previews.
// Ada: notice of the new walkthrough, report without a rubric (maps to the brief), then with rubric v1 (findings,
// timestamps that seek, not shown, coverage, Q-proposed Rating records), segment 2 text never on her page, the
// prohibited-inference refusals, where/play/summarise, an override with a reason, mark reviewed. Tobi disputes a
// finding, stops sharing (Ada sees nothing), deletes it.
// Usage: BASE=http://localhost:5194/ node qa/scripts/features/media.mjs [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const ROOT = new URL('../../../captures/features/media/', import.meta.url).pathname; mkdirSync(ROOT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:5194/';
const ONLY = (process.argv[2] || 'd,m').split(',');
const SEG2 = ['I was on call that night', 'merchant clients', 'finance lead', 'backup file feed', 'Client dashboard', 'post-mortem the next morning'];
const RUBRIC = {
  id: 'rub_m_backend', mandateId: 'm_backend', orgId: 'org_kora',
  versions: [{ v: 1, state: 'APPROVED', at: '2026-10-29T10:00:00Z', by: 'q', approvedBy: 'u_ada', note: 'Approved by Ada (test fixture)', criteria: [
    { id: 'c_pay', label: 'Payments systems', kind: 'SKILL', weight: 1, requirementId: 'r1', anchors: ['Not shown', 'Mentions payments work', 'Describes a payments system they worked on', 'Shows how they built or ran a money-moving system, with trade-offs', 'Shows design, operation and measured results at scale'], evidenceToInspect: ['Project walkthrough'], questions: [], method: 'Work sample', why: 'Brief r1' },
    { id: 'c_go', label: 'Go in production', kind: 'SKILL', weight: 1, requirementId: 'r2', anchors: ['Not shown', 'Mentions Go', 'Shows Go code they wrote', 'Shows Go running under load with failure handling', 'Shows several Go services operated in production'], evidenceToInspect: [], questions: [], method: 'Code', why: 'Brief r2' },
    { id: 'c_pg', label: 'Postgres at scale', kind: 'PRACTICAL', weight: 1, requirementId: 'r3', anchors: ['Not shown', 'Mentions Postgres', 'Fixes a slow query', 'Diagnoses and fixes performance on a large table with trade-offs', 'Proven on production at scale'], evidenceToInspect: [], questions: [], method: 'Practical', why: 'Brief r3' },
    { id: 'c_inc', label: 'Incidents and on-call', kind: 'SKILL', weight: 2, requirementId: 'r4', anchors: ['Not shown', 'Has been on call', 'Handled an incident', 'Led an incident and wrote the post-mortem', 'Leads incident practice'], evidenceToInspect: [], questions: [], method: 'Interview', why: 'Brief r4' },
    { id: 'c_comm', label: 'Explains technical decisions', kind: 'INTERVIEW', weight: 1, anchors: ['Not shown', 'States what was done', 'Gives reasons for some steps', 'Gives reasons and trade-offs for each step', 'Adapts the explanation to the listener'], evidenceToInspect: [], questions: [], method: 'Structured answer (written alternative)', why: 'Explaining decisions' },
    { id: 'c_rtw', label: 'Right to work in Nigeria', kind: 'ELIGIBILITY', weight: 1, anchors: ['', '', '', '', ''], evidenceToInspect: [], questions: [], method: 'Document check', why: 'Eligibility' },
  ] }],
};

const b = await pw.chromium.launch();
const results = []; const errors = [];
for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text().slice(0, 200)}`); });
  const phone = v === 'm';
  const step = (name, ok, detail = '') => { results.push({ v, name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail ? ` · ${String(detail).slice(0, 180)}` : ''}`); };
  const shot = async (n, full = true) => { await page.waitForTimeout(350); await page.screenshot({ path: `${ROOT}${v}-${n}.png`, fullPage: full }); };
  const world = () => page.evaluate(() => JSON.parse(localStorage.getItem('tq.world.v4')));
  const item = async () => (await world()).areas.media.items.find((m) => m.ownerId === 'p_tobi');
  const overflow = async (n) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); step(`no sideways scroll: ${n}`, o <= 0, o > 0 ? `${o}px` : ''); };
  const openQ = async () => { if (!phone) return; if (await page.locator('#q-ask').isVisible().catch(() => false)) return; await page.locator('.ds-askbar button').first().click(); await page.locator('#q-ask').waitFor(); };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) await x.click(); await page.waitForTimeout(250); };
  const lastQ = () => page.evaluate(() => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); const t = w.q.threads[w.session.actor] || []; for (let i = t.length - 1; i >= 0; i--) if (t[i].who !== 'me') return t[i].text; return ''; });
  const ask = async (t, wait = 800) => { await openQ(); await page.fill('#q-ask', t); await page.press('#q-ask', 'Enter'); await page.waitForTimeout(wait); return lastQ(); };
  const chip = async (re) => { await openQ(); const c = page.locator('.ds-chip').filter({ hasText: re }).last(); await c.click(); await page.waitForTimeout(700); };
  const as = async (actor, route) => {
    await page.goto(`${BASE}#${route}`); await page.waitForTimeout(300);
    await page.evaluate(() => { if (!localStorage.getItem('tq.world.v4')) window.__tqQA.update(() => {}); });
    await Promise.all([page.waitForEvent('load'), page.evaluate((a) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = a; localStorage.setItem('tq.world.v4', JSON.stringify(w)); location.reload(); }, actor)]);
    await page.waitForTimeout(900);
  };
  const patch = async (fn, arg) => { await Promise.all([page.waitForEvent('load'), page.evaluate(([src, a]) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); new Function('w', 'a', src)(w, a); localStorage.setItem('tq.world.v4', JSON.stringify(w)); location.reload(); }, [fn, arg])]); await page.waitForTimeout(900); };
  const until = async (pred, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await pred()) return true; await page.waitForTimeout(200); } return false; };
  const suggestions = async (re) => {
    await openQ();
    for (let i = 0; i < 8; i++) {
      await page.locator('.ds-suggest-more[aria-expanded="false"]').first().click({ timeout: 600 }).then(() => page.waitForTimeout(300)).catch(() => {});
      const t = await page.locator('.ds-suggest').allInnerTexts();
      if (t.some((x) => re.test(x))) return t.join(' | ');
      if (!t.length) return '';
      const k = t.findIndex((x) => !re.test(x));
      await page.locator('.ds-suggest').nth(k).locator('.ds-chip', { hasText: 'Dismiss' }).click().catch(() => {});
      await page.waitForTimeout(250);
    }
    return (await page.locator('.ds-suggest').allInnerTexts()).join(' | ');
  };

  // ---------------- Fresh world, Tobi ----------------
  await page.goto(`${BASE}#/c/passport`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
  await as('p_tobi', '/c/passport');
  let r = await ask('can i add a video of my reconcilation work');
  await closeQ();
  let m = await item();
  step('"add a video" opens consent; nothing processed yet', m?.state === 'CONSENT' && !m.consent && !(await world()).evidence.some((e) => e.evidenceId === 'e_tobi_video') && /Nothing is uploaded or transcribed until you agree/.test(r), r);
  const consentTxt = await page.locator('.mv-panel').first().innerText();
  step('Consent shows who, purpose, expiry (90 days) and what Q won’t do', /Who can see it/i.test(consentTxt) && /What it’s for/i.test(consentTxt) && /90 days/.test(consentTxt) && /Judge your face, voice, accent or appearance/.test(consentTxt) && /confident, honest/.test(consentTxt));
  step('Text, form and adjustment alternatives are always visible', await page.locator('.mv-alt').getByRole('button', { name: 'Write it instead' }).isVisible() && await page.locator('.mv-alt').getByRole('button', { name: 'Ask for a short form' }).isVisible() && await page.locator('.mv-alt').getByRole('button', { name: 'Ask for an adjustment' }).isVisible());
  await overflow('consent'); await shot('01-consent');
  await page.getByRole('button', { name: 'Agree and choose the recording' }).click(); await page.waitForTimeout(500);
  m = await item();
  const days = m?.consent ? Math.round((new Date(m.consent.expires) - new Date(m.consent.at)) / 864e5) : 0;
  step('Consent recorded: Kora only, purpose, 90-day expiry, alternative offered', m?.consent && m.consent.orgs.join() === 'org_kora' && days === 90 && m.consent.alternativeOffered && /Kora/.test(m.consent.purpose), JSON.stringify(m?.consent));

  // Unsafe link: never fetched
  await page.getByRole('button', { name: /Paste a link you’re allowed to share/ }).click();
  await page.fill('#mv-link', 'https://bit.ly/3xRecon'); await page.getByRole('button', { name: 'Check the link' }).click(); await page.waitForTimeout(400);
  m = await item();
  const ban = await page.locator('.ds-banner[role="alert"]').innerText().catch(() => '');
  step('Shortened link → UNSAFE_LINK, never fetched, Q explains why', m.state === 'UNSAFE_LINK' && !m.progress && /shortened link/i.test(ban) && /never open/i.test(ban), ban);
  await overflow('unsafe'); await shot('02-unsafe-link');
  // Fetch failed
  await page.getByRole('button', { name: /Paste a link you’re allowed to share/ }).click();
  await page.fill('#mv-link', 'https://drive.google.com/file/d/1AbCrecon/view'); await page.getByRole('button', { name: 'Check the link' }).click(); await page.waitForTimeout(400);
  m = await item();
  step('Sign-in link → FETCH_FAILED, never signs in as Tobi', m.state === 'FETCH_FAILED' && /never sign in as you/i.test(await page.locator('.ds-banner[role="alert"]').innerText().catch(() => '')));
  await shot('03-fetch-failed');

  // Upload, offline at 40% → PAUSED → resume from the same part
  await page.getByRole('button', { name: /Upload a file/ }).click();
  const paused = await until(async () => (await item()).state === 'PAUSED');
  m = await item(); let w = await world();
  step('Upload pauses at 40% when the connection drops', paused && m.progress.done === 4 && w.network === 'offline', `${m.state} ${m.progress?.done}/${m.progress?.total} ${w.network}`);
  step('Paused state says it carries on from the same part', /carries on from the same part|carries on from part 5/.test(await page.locator('.mv-panel').first().innerText()));
  await overflow('paused'); await shot('04-paused');
  await page.waitForTimeout(800);
  step('Stays paused while offline (no progress)', (await item()).progress.done === 4);
  await page.getByRole('button', { name: 'Reconnect' }).first().click();
  await until(async () => (await item()).state !== 'PAUSED', 3000);
  m = await item();
  step('Reconnect resumes from part 5, not from zero', ['UPLOADING', 'TRANSCRIBING'].includes(m.state) && (m.state === 'TRANSCRIBING' || m.progress.done >= 4), `${m.state} ${m.progress?.done}`);
  await until(async () => (await item()).state === 'TRANSCRIBING', 6000);
  await shot('05-transcribing');
  step('Transcribing (simulated)', (await item()).state === 'TRANSCRIBING' || (await item()).state === 'REVIEW');
  await until(async () => (await item()).state === 'REVIEW', 8000);
  m = await item(); w = await world();
  step('REVIEW: 25-line transcript, 3 parts, transcribed once and cached by content hash', m.state === 'REVIEW' && m.transcript.length === 25 && m.segments.length === 3 && !!w.areas.media.transcripts['sha256:9f2c…demo']);
  const ev = w.evidence.find((e) => e.evidenceId === 'e_tobi_video');
  step('Passport item: WORK_SAMPLE, origin UPLOAD, private until shared', ev?.kind === 'WORK_SAMPLE' && ev.origin === 'UPLOAD' && ev.visibility === 'PRIVATE' && !ev.sharedWith.length);
  const sg = await suggestions(/transcript .* ready to check/);
  step('Proactive (candidate): transcript ready to check', /ready to check/.test(sg), sg);
  await closeQ();

  // Correct a line by telling Q
  r = await ask('fix the transcript at 1:40 to Here’s the exceptions report. Before this, finance found mismatches about three days later.');
  m = await item();
  const fixed = m.transcript.find((l) => l.t === 90);
  step('“fix the transcript at 1:40 to …” corrects the line and marks it edited', fixed?.edited && /Before this, finance/.test(fixed.text) && /Corrected the line at 1:30/.test(r), r);
  await closeQ(); await page.waitForTimeout(300);
  step('Edited line is marked on the page', (await page.locator('.mv-tgroup li[data-edited]').count()) === 1);
  await overflow('review'); await shot('06-review');

  // Share only parts 1 and 3 with Kora
  r = await ask('share only the payments and postgres parts with kora');
  step('Q confirms which parts Kora will and won’t see before sharing', /not client dashboard/i.test(r) && (await item()).state === 'REVIEW', r);
  await chip(/Share these 2 parts with Kora Pay/);
  m = await item(); w = await world();
  step('READY: parts 1 and 3 shared with Kora, part 2 not', m.state === 'READY' && m.segments[0].sharedWith.includes('org_kora') && m.segments[2].sharedWith.includes('org_kora') && !m.segments[1].sharedWith.length);
  const ev2 = w.evidence.find((e) => e.evidenceId === 'e_tobi_video');
  step('Passport item now SHARED_WITH Kora (consistent with its parts)', ev2.visibility === 'SHARED_WITH' && ev2.sharedWith.join() === 'org_kora');
  step('visibleSegments(Kora) = parts 1 and 3', (await page.evaluate(() => window.__tqMedia.visibleSegments('m_tobi_recon', 'org_kora').map((s) => s.id).join())) === 's1,s3');
  r = await ask('what will kora see');
  step('“what will kora see” lists 2 of 3 parts, not the client part', /2 of 3 parts/.test(r) && /Not client dashboard/i.test(r), r);
  await closeQ(); await page.goto(`${BASE}#/c/passport?media=preview`); await page.waitForTimeout(600);
  const pv = await page.locator('#mv-preview-m_tobi_recon').innerText();
  step('Preview as Kora (same filter as the recruiter page) shows no text from part 2', /What Kora Pay sees/.test(pv) && !SEG2.some((s) => pv.includes(s)), pv.slice(0, 120));
  await overflow('ready'); await shot('07-ready');

  // ---------------- Ada ----------------
  await as('u_ada', '/r/home');
  const sa = await suggestions(/shared a walkthrough video/);
  step('Proactive (recruiter): Tobi shared a new walkthrough for Senior Backend', /Tobi shared a walkthrough video for Senior Backend Engineer/.test(sa), sa);
  await closeQ();
  await page.goto(`${BASE}#/r/people/p_tobi/video`); await page.waitForTimeout(1200);
  let body = await page.locator('body').innerText();
  step('Without an approved rubric: maps to the brief and says no rubric is approved', /hasn’t approved a rubric/.test(body) && /Findings against the role brief/.test(body));
  step('Ada’s page never contains part 2’s transcript or title', !SEG2.some((s) => body.includes(s)) && !(await page.content()).includes('I was on call that night'));
  step('"No inferences from face, voice, accent or appearance" is stated', /No inferences from face, voice, accent or appearance/.test(body));
  step('Player is labelled “Simulated video” and shows the unshared gap', /Simulated video/i.test(body) && (await page.locator('.mv-seg:not([data-on])').innerText()) === 'Not shared');
  // Approve rubric v1 (stands in for the RUBRIC builder's step 5)
  await patch(`w.areas.rubrics.list = w.areas.rubrics.list.filter(r => r.mandateId !== 'm_backend'); w.areas.rubrics.list.push(a);`, RUBRIC);
  await page.waitForTimeout(800);
  body = await page.locator('body').innerText(); w = await world();
  const rev = w.areas.media.reviews.find((x) => x.rubricId === 'rub_m_backend');
  step('Report on rubric v1, cached by contentHash + version', /Findings against rubric v1/.test(body) && rev?.cacheKey.startsWith('sha256:9f2c…demo|rub_m_backend@v1'), rev?.cacheKey);
  step('Findings: payments, Go, Postgres, explaining decisions, with timestamps and uncertainty', ['c_pay', 'c_go', 'c_pg', 'c_comm'].every((c) => rev.findings.some((f) => f.criterionId === c && f.moments.length)) && /Some uncertainty|Low uncertainty/.test(body));
  step('Not shown: incidents (only part 2 could show it), not scored, never zero', rev.notShown.includes('c_inc') && /Incidents and on-call/.test(await page.locator('#mv-notshown').innerText()) && /never counted as zero/.test(body) && !w.areas.rubrics.ratings.some((x) => x.criterionId === 'c_inc'));
  step('Eligibility listed as not assessed from a video', /Not assessed from a video at all: Right to work/.test(body));
  const qr = w.areas.rubrics.ratings.filter((x) => x.personId === 'p_tobi' && x.rubricId === 'rub_m_backend');
  step('Q-proposed Rating records written (unreviewed, refs with evidenceId and t/tEnd)', qr.length === 4 && qr.every((x) => x.source === 'Q_PROPOSED' && !x.reviewed && x.refs.every((f) => f.evidenceId === 'e_tobi_video' && typeof f.t === 'number' && typeof f.tEnd === 'number')));
  step('Coverage stated with the index (index never alone)', /criteria shown in the video/.test(body) && /% of the role’s weight/.test(body) && /index \d+ at \d+% coverage/.test(body));
  await page.locator('.mv-finding', { hasText: 'Postgres at scale' }).locator('.mv-tbtn').first().click(); await page.waitForTimeout(400);
  step('A finding’s timestamp seeks the player', /^3:4\d \/ 6:00/.test(await page.locator('.mv-clock').innerText()), await page.locator('.mv-clock').innerText());
  await page.locator('.mv-play').click(); await page.waitForTimeout(400);
  await overflow('report'); await shot('08-report');
  // Prohibited inferences
  r = await ask('is he confident?');
  step('“is he confident?” → refusal with reason and an alternative', /I won’t judge that/.test(r) && /face, voice, accent/.test(r) && /What I can do/.test(r), r);
  r = await ask('does he seem honest?');
  step('“does he seem honest?” → refusal', /I won’t judge that/.test(r), r);
  r = await ask('where does he show reconciliation');
  step('“where does he show reconciliation” → timed moments', /0:12/.test(r) && /reconciliation/.test(r), r);
  r = await ask('where does he talk about incidents in the video');
  step('Asking about the unshared part reveals nothing', /doesn’t show incident handling in the parts shared/.test(r) && !SEG2.some((s) => r.includes(s)), r);
  await ask('play the postgres part', 1000); await closeQ();
  step('“play the postgres part” seeks to 3:40 and plays', /t=220/.test(page.url()) && /^3:4\d/.test(await page.locator('.mv-clock').innerText()), page.url());
  r = await ask("summarise Tobi's video");
  step('“summarise Tobi’s video” → parts, findings, not shown', /2 of 3 parts/.test(r) && /Not shown: incidents and on-call/.test(r), r);
  await closeQ();
  // Override with a reason (via Q; same Rating record the scorecard reads)
  r = await ask('lower postgres to 2, the tuning was on synthetic data');
  w = await world();
  const pg = w.areas.rubrics.ratings.find((x) => x.criterionId === 'c_pg' && x.personId === 'p_tobi');
  step('Override audited with reason (Q proposal kept as “from”)', pg?.rating === 2 && pg.override?.from === 3 && /synthetic/.test(pg.override.reason) && w.events.some((e) => /rating.overrid/.test(e.type)), r);
  r = await ask('mark the report reviewed');
  w = await world();
  step('“mark the report reviewed” → HUMAN_REVIEWED, ratings reviewed', w.areas.media.reviews.find((x) => x.rubricId === 'rub_m_backend')?.state === 'HUMAN_REVIEWED' && w.areas.rubrics.ratings.filter((x) => x.personId === 'p_tobi').every((x) => x.reviewed), r);
  await closeQ(); await page.waitForTimeout(300); await shot('09-reviewed');

  // ---------------- Tobi: dispute, stop sharing, delete ----------------
  await as('p_tobi', '/c/passport?media=ready');
  const their = page.locator('.mv-sub', { hasText: 'What Q told Kora Pay' });
  step('Tobi sees what Q told Kora (reviewed by a person)', /Checked by a person/.test(await their.innerText()));
  await their.locator('.mv-their li', { hasText: 'Go in production' }).getByRole('button', { name: 'This is wrong' }).click();
  await page.fill('textarea[id^="mv-d-"]', 'The worker is one of four Go services I run; the others are in my repo.');
  await page.getByRole('button', { name: 'Ask for a correction' }).click(); await page.waitForTimeout(400);
  w = await world();
  step('Candidate dispute → report DISPUTED, rating carries the dispute', w.areas.media.reviews.some((x) => x.state === 'DISPUTED') && w.areas.rubrics.ratings.some((x) => x.criterionId === 'c_go' && x.dispute?.state === 'OPEN'));
  await shot('10-dispute');
  await as('u_ada', '/r/people/p_tobi/video');
  step('Ada sees the correction request on the report', /Tobi asked for a correction/.test(await page.locator('body').innerText()));
  await as('p_tobi', '/c/passport?media=ready');
  r = await ask('stop sharing the video');
  step('“stop sharing the video” explains what Kora keeps (D9 open)', /keeps a record/.test(r) && /D9/.test(r), r);
  await chip(/Stop sharing with Kora Pay/);
  m = await item(); w = await world();
  step('REVOKED: no visible segments for Kora; Passport item revoked from Kora', m.state === 'REVOKED' && (await page.evaluate(() => window.__tqMedia.visibleSegments('m_tobi_recon', 'org_kora').length)) === 0 && w.evidence.find((e) => e.evidenceId === 'e_tobi_video').revokedFrom.includes('org_kora'));
  await closeQ(); await shot('11-revoked');
  await as('u_ada', '/r/people/p_tobi/video');
  body = await page.locator('body').innerText();
  step('Ada: nothing shared any more, no transcript on the page', /No video or voice recording is shared with you/.test(body) && !/Reconciliation service walkthrough/.test(body));
  await as('p_tobi', '/c/passport?media=ready');
  r = await ask('delete it');
  step('“delete it” asks for confirmation with what Kora keeps', /can’t be undone/.test(r) && /keeps a record/.test(r), r);
  await chip(/Delete for good/);
  w = await world();
  step('Deleted: item, Passport entry and transcript cache gone', !w.areas.media.items.length && !w.evidence.some((e) => e.evidenceId === 'e_tobi_video') && !w.areas.media.transcripts['sha256:9f2c…demo']);
  await closeQ(); await overflow('after-delete');
  await ctx.close();
}
await b.close();
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} steps passed`);
if (errors.length) { console.log('Page errors:'); for (const e of [...new Set(errors)]) console.log('  ', e); }
process.exit(fails || errors.length ? 1 : 0);
