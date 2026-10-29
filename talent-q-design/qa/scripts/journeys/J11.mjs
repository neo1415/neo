// J11: the connected journey for the 29 Oct addenda (journeys/J11-CONNECTED-JOURNEY.md). One continuous world:
// Tobi watches the role briefing and contacts Kora → Ada files it in the Q4 Engineering campaign → Q proposes a rubric,
// Ada edits and approves it → Ada asks for a walkthrough → Tobi consents, hits an unsafe link and a dropped upload,
// shares 2 of 3 parts → Ada reviews Q's timestamped report, overrides with a reason, marks it reviewed → the rubric
// changes mid-campaign (change notice) → Ada emails an invitation, the Google token expires, she reconnects, it sends
// once → "send it from the CEO's Gmail" is refused → Tobi replies by email with a new subject → Ada confirms and books.
// Usage: BASE=http://localhost:4180/ node J11.mjs   [VIDEO_DIR=dir FILM_PACE=ms to record the film]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const BASE = (process.env.BASE || 'http://localhost:4180/').replace(/\/?$/, '/');
const PACE = +(process.env.FILM_PACE || 0); const VIDEO = process.env.VIDEO_DIR; const ONLY = process.env.ONLY;
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../captures/cx/J11'); mkdirSync(OUT, { recursive: true });
const SEG2 = ['I was on call that night', 'client dashboard'];
let fails = 0; const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(vp) {
  const phone = vp === 'm';
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: phone ? 2 : 1, ...(phone ? { isMobile: true, hasTouch: true } : {}), ...(VIDEO ? { recordVideo: { dir: `${VIDEO}/${vp}`, size: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 } } } : {}) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${vp}: ${e.message}`));
  let n = 0;
  const step = (name, ok, info = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} [${vp}] ${name}${!ok && info ? ` · ${String(info).replace(/\s+/g, ' ').slice(0, 220)}` : ''}`); };
  const shot = async (name) => { await sleep(300); await page.screenshot({ path: `${OUT}/${vp}-${String(++n).padStart(2, '0')}-${name}.png` }); if (PACE) await sleep(PACE); };
  const world = () => page.evaluate(() => window.__tqQA.getWorld());
  const lastQ = async () => { const w = await world(); const t = w.q.threads[w.session.actor] ?? []; return [...t].reverse().find((m) => m.who !== 'me')?.text ?? ''; };
  const openQ = async () => { if (!phone) return; if (await page.locator('#q-ask').isVisible().catch(() => false)) return; await page.locator('.ds-askbar button').first().click(); await page.locator('#q-ask').waitFor({ timeout: 3000 }).catch(() => {}); await sleep(250); };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) await x.click(); await sleep(250); };
  const ask = async (text, wait = 900) => {
    await openQ();
    if (PACE) await page.locator('#q-ask').pressSequentially(text, { delay: 18 }); else await page.locator('#q-ask').fill(text);
    await page.locator('#q-ask').press('Enter'); await sleep(wait + PACE / 2);
    const r = await lastQ(); return r;
  };
  const chip = async (re) => { await openQ(); await page.locator('.ds-thread .ds-chip, .ds-sheet .ds-chip').filter({ hasText: re }).last().click(); await sleep(800); };
  const as = async (id, route) => { await closeQ(); await page.evaluate((id) => window.__tqQA.update((w) => { w.session.actor = id; w.actors.find((a) => a.id === id).signedUp = true; }), id); await page.goto(`${BASE}?n=${Math.random()}#${route}`); await page.waitForSelector('.ds-app'); await sleep(900); };
  const go = async (route) => { await closeQ(); await page.evaluate((r) => { location.hash = r; }, route); await sleep(900); };
  const body = () => page.locator('body').innerText();
  // On phones the hub shows one conversation at a time; go back to the list first if one is open.
  const thread = async (who) => { await closeQ(); const back = page.locator('.hc-back'); if (await back.isVisible().catch(() => false)) { await back.click(); await sleep(300); } await page.locator('.hc-row', { hasText: who }).first().click(); await sleep(500); };
  const until = async (fn, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(200); } return false; };
  const tobiKora = (w) => w.threads.find((t) => t.orgId === 'org_kora' && t.personId === 'p_tobi' && t.initiatedBy === 'CANDIDATE');
  const video = async () => (await world()).areas.media.items.find((m) => m.ownerId === 'p_tobi');
  const rub = (w) => w.areas.rubrics.list.find((x) => x.mandateId === 'm_backend');
  const overflow = async (where) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) step(`no sideways scroll on ${where}`, false, `${o}px`); };

  await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.ds-app'); await sleep(600);

  // ---- 1. Discover: the role briefing, answered with a timestamp ----
  await as('p_tobi', '/c/jobs/j_kora_backend');
  step('1 Briefing on the job page, labelled simulated', /Simulated video/i.test(await page.locator('.cr-brief').innerText()));
  await shot('briefing');
  let r = await ask('is the on-call real?');
  step('1 Q answers from the briefing and quotes 1:12', /1:12/.test(r), r);
  await overflow('job page');

  // ---- 2. Reach out: policy before drafting, then sent in-app ----
  r = await ask('can I contact someone about this role?');
  step('2 Q states Kora’s contact policy before drafting', /before you apply/.test(r) && /personal addresses aren’t shared/.test(r), r);
  await shot('contact-policy');
  r = await ask('send it');
  let w = await world();
  step('2 Candidate-initiated thread sent in Talent Q', tobiKora(w)?.state === 'OPEN' && tobiKora(w).messages.some((m) => m.from === 'p_tobi' && m.channel === 'IN_APP'), r);

  // ---- 3. Route into the campaign ----
  await as('u_ada', '/r/messages');
  await thread('Tobi');
  step('3 Ada sees it as started by the candidate, not filed', /Started by Tobi/.test(await body()) && /Not filed yet/.test(await body()));
  r = await ask('put this in the Q4 Engineering campaign');
  w = await world();
  step('3 Filed under Q4 Engineering → Senior Backend, audited', tobiKora(w).campaignId === 'c_q4_eng' && tobiKora(w).mandateId === 'm_backend' && w.events.some((e) => e.type === 'thread.routed'), r);
  await shot('filed');

  // ---- 4. The campaign shows it ----
  await go('/r/campaigns/c_q4_eng');
  const camp = await body();
  step('4 Campaign overview lists Senior Backend with Tobi’s message', /Q4 Engineering Expansion/.test(camp) && /Senior Backend Engineer/.test(camp) && /Tobi/.test(camp), camp.slice(0, 200));
  await shot('campaign'); await overflow('campaign');

  // ---- 5. Agree how to judge: Q proposes, Ada edits, approves v1 ----
  await go('/r/roles/m_backend/rubric');
  await ask('propose a rubric for the senior backend role', 1200);
  w = await world();
  step('5 Q proposes a rubric (Q_PROPOSED) with ESCO references', rub(w)?.versions[0]?.state === 'Q_PROPOSED' && /ESCO/.test(await lastQ()));
  await shot('rubric-proposed');
  await ask('make incidents and on-call weight 2');
  await ask('approve the rubric', 1200);
  w = await world();
  step('5 Ada’s edit kept and v1 approved (frozen)', rub(w).versions[0].state === 'APPROVED' && rub(w).versions[0].criteria.find((c) => /on-call/i.test(c.label))?.weight === 2);
  await shot('rubric-approved'); await overflow('rubric studio');

  // ---- 6. Ask Tobi for a walkthrough, in the same thread ----
  await go('/r/messages'); await thread('Tobi');
  await ask('ask Tobi for a walkthrough video of his reconciliation work');
  await ask('send it'); await chip(/Approve and send/);
  w = await world();
  step('6 Walkthrough request approved and sent (simulated)', tobiKora(w).messages.some((m) => /walkthrough/i.test(m.subject ?? m.body) && m.status === 'SENT_SIMULATED'));

  // ---- 7. Tobi shows the work: consent, unsafe link, dropped upload, transcript, 2 of 3 parts ----
  await as('p_tobi', '/c/passport');
  r = await ask('can i add a video of my reconciliation work'); await closeQ();
  step('7 Consent first: nothing processed yet', (await video())?.state === 'CONSENT', r);
  await shot('consent');
  await page.getByRole('button', { name: 'Agree and choose the recording' }).click(); await sleep(500);
  await page.getByRole('button', { name: /Paste a link you’re allowed to share/ }).click();
  await page.fill('#mv-link', 'https://bit.ly/3xRecon'); await page.getByRole('button', { name: 'Check the link' }).click(); await sleep(500);
  step('7 Disruption: shortened link refused, never fetched', (await video()).state === 'UNSAFE_LINK');
  await shot('unsafe-link');
  await page.getByRole('button', { name: /Upload a file/ }).click();
  step('7 Disruption: connection drops at 40%, upload pauses', await until(async () => (await video()).state === 'PAUSED'));
  await shot('upload-paused');
  await page.getByRole('button', { name: 'Reconnect' }).first().click();
  step('7 Resumes from the same part and transcribes once', await until(async () => (await video()).state === 'REVIEW', 15000));
  await ask('fix the transcript at 1:40 to Here’s the exceptions report. Before this, finance found mismatches about three days later.');
  step('7 Transcript line corrected and marked edited', (await video()).transcript.some((l) => l.edited));
  r = await ask('share only the payments and postgres parts with kora');
  step('7 Consent restriction: Q confirms Kora won’t see the client part', /not client dashboard/i.test(r), r);
  await chip(/Share these 2 parts with Kora Pay/); await closeQ();
  const vd = await video();
  step('7 Ready: parts 1 and 3 shared, part 2 not', vd.state === 'READY' && vd.segments[1].sharedWith.length === 0 && vd.segments[0].sharedWith.includes('org_kora'));
  await shot('shared'); await overflow('passport');

  // ---- 8. Ada reviews Q's evidence report ----
  await as('u_ada', '/r/people/p_tobi/video');
  let rep = await body();
  step('8 Report on rubric v1 with timestamps; part 2 never visible', /rubric v1/.test(rep) && !SEG2.some((s) => rep.includes(s)), rep.slice(0, 200));
  step('8 Uncertainty: index shown only with coverage; unknown never zero', /\d+ at \d+% coverage/.test(rep) && /never counted as zero/.test(rep));
  step('8 States no inferences from face, voice, accent or appearance', /No inferences from face, voice, accent or appearance/.test(rep));
  await shot('evidence-report'); await overflow('evidence report');
  await ask('lower postgres to 2, the tuning was on synthetic data');
  w = await world();
  const pg = w.areas.rubrics.ratings.find((x) => x.personId === 'p_tobi' && /postgres|pg/.test(x.criterionId) && x.override);
  step('8 Human review: override saved with the reason, audited', !!pg && pg.rating === 2 && /synthetic/.test(pg.override.reason), await lastQ());
  r = await ask('mark the report reviewed');
  w = await world();
  step('8 Report marked human-reviewed', w.areas.media.reviews.some((x) => x.personId === 'p_tobi' && x.state === 'HUMAN_REVIEWED'), r);
  await shot('reviewed');

  // ---- 9. Mid-campaign rubric change: notice, then keep v1 for this round ----
  await go('/r/roles/m_backend/rubric');
  await ask('add mentoring to the rubric', 1100);
  r = await ask('approve it', 1100);
  w = await world();
  step('9 Disruption: change notice names Tobi, v2 not yet in force', /Tobi/.test(r) && rub(w).versions[1]?.state === 'Q_PROPOSED', r);
  await shot('change-notice');
  await ask('keep v1 for this round', 1100);
  w = await world();
  step('9 v1 stays in force for this round; v1 ratings untouched', rub(w).versions[1].changeNotice?.decision === 'KEEP_FOR_ROUND' && !w.areas.rubrics.ratings.some((x) => x.personId === 'p_tobi' && x.v === 2));

  // ---- 10. Email invitation: token expires, reconnect, sent once ----
  await go('/r/messages'); await thread('Tobi');
  r = await ask('email Tobi an interview invite for Thursday or Friday', 1100);
  step('10 Draft from Ada’s Google Workspace, in the Q4 campaign', /ada@kora\.example/.test(r) && /Q4 Engineering/.test(r), r);
  await ask('send it');
  await thread('Tobi');
  await page.locator('.em-compose .em-demo', { hasText: 'Simulate token expiry' }).click(); await sleep(400);
  await shot('approval');
  await chip(/Approve and send/);
  w = await world();
  const inv = w.threads.flatMap((t) => t.messages).find((m) => m.to === 'p_tobi' && m.channel === 'EMAIL' && /interview/i.test(m.subject ?? ''));
  step('10 Disruption: Google sign-in expired → approved, not sent', inv?.delivery === 'FAILED' && inv.failReason === 'AUTH_EXPIRED');
  await thread('Tobi');
  await shot('auth-expired');
  await page.locator('.em-alert .ds-btn', { hasText: 'Reconnect' }).click(); await sleep(700);
  await shot('reconnect-consent');
  await page.locator('.es-consent .ds-btn', { hasText: 'Allow (simulated)' }).click(); await sleep(800);
  r = await ask('send it');
  w = await world();
  const inv2 = w.threads.flatMap((t) => t.messages).find((m) => m.id === inv.id);
  step('10 Sent once with the same key: accepted by Google (simulated)', inv2.delivery === 'ACCEPTED' && inv2.idempotencyKey === inv.idempotencyKey, r);
  r = await ask('send it again');
  step('10 “send it again” → already sent, no duplicate', /Already sent at/.test(r), r);

  // ---- 11. Someone else's identity ----
  r = await ask("send it from the CEO's gmail");
  step('11 Refused: names the access needed, offers a draft for the owner', /can’t send it from the CEO’s Gmail/.test(r), r);

  // ---- 12. Tobi replies by email (new subject); Ada confirms and books ----
  await as('p_tobi', '/c/messages');
  await thread('Kora Pay');
  await page.locator('.hc-creply .em-seg button', { hasText: 'By email' }).click();
  await page.fill('#c-subj', 'Thursday works for me'); await page.fill('#c-reply', 'Thursday 14:00 works');
  await shot('candidate-reply');
  await page.locator('.hc-creply button[type="submit"]').click(); await sleep(700);
  await as('u_ada', '/r/messages'); await thread('Tobi');
  step('12 Disruption: changed subject waits for Ada to confirm the match', /Waiting for you to confirm/.test(await body()));
  await shot('reply-intelligence');
  await page.locator('.ds-canvas .em-intel .ds-btn', { hasText: 'Yes, it belongs here' }).first().click(); await sleep(700);
  await chip(/Book Thu 5 Nov 14:00/);
  w = await world();
  step('12 Interview booked Thursday 14:00 (simulated calendar)', w.calendar.some((e) => e.personId === 'p_tobi' && e.orgId === 'org_kora' && e.status === 'CONFIRMED'));
  await chip(/Approve and send/);
  w = await world();
  step('12 Confirmation accepted by Google (simulated)', w.threads.flatMap((t) => t.messages).some((m) => /Confirmed:/.test(m.subject ?? '') && m.delivery === 'ACCEPTED'));
  await shot('booked'); await overflow('messages');

  await ctx.close(); await b.close();
}

for (const vp of (ONLY ? [ONLY] : ['d', 'm'])) await run(vp);
if (errors.length) { console.log(`FAIL page errors: ${errors.slice(0, 3).join(' | ')}`); fails++; }
console.log(fails ? `${fails} J11 step(s) failed` : 'J11 passed');
process.exit(fails ? 1 : 0);
