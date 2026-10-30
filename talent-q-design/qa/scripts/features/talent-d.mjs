// TALENT-D (coverage build, 30 Oct), desktop 1440×900 and phone 390×844 (phone runs with prefers-reduced-motion:
// reduce, so every motion's fallback is checked there). Screens SC-071, SC-076, SC-077, SC-087, SC-092, SC-172,
// SC-175; motions MO-014, MO-029, MO-030, MO-040, MO-041, MO-052. Step names cite the IDs.
// Usage: BASE=http://localhost:5216/ node qa/scripts/features/talent-d.mjs [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const ROOT = new URL('../../../captures/features/talent-d/', import.meta.url).pathname; mkdirSync(ROOT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:5216/';
const ONLY = (process.argv[2] || 'd,m').split(',');
const GUESS = /\b(probably because|likely because|maybe because|might be because|they (probably|likely)|the reason (was|is) (that|your))\b/i;
const HARSH = /\b(bad|poor|terrible|weak|wrong|fail(ed|ure)?|lazy|sloppy)\b/i;

const b = await pw.chromium.launch();
const results = []; const errors = [];
for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr, reducedMotion: v === 'm' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text().slice(0, 200)}`); });
  const phone = v === 'm';
  const step = (name, ok, detail = '') => { results.push({ v, name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${detail && !ok ? ` · ${String(detail).slice(0, 220)}` : ''}`); };
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: `${ROOT}${v}-${n}.png`, fullPage: true }); };
  const W = () => page.evaluate(() => window.__tqQA.getWorld());
  const TD = async () => (await W()).areas['talent-d'];
  const upd = (src, arg) => page.evaluate(([s, a]) => window.__tqQA.update((w) => new Function('w', 'a', s)(w, a)), [src, arg]);
  const act = (op, args = {}) => page.evaluate(([o, a]) => window.__tqQA.act(o, a), [op, args]);
  const go = async (route) => { await page.goto(`${BASE}#${route}`); await page.waitForTimeout(650); };
  const as = async (actor, route) => { await upd('w.session.actor = a; w.actors.find((x) => x.id === a).signedUp = true;', actor); await page.waitForTimeout(150); await go(route); };
  const canvas = () => page.locator('.ds-canvas').last();
  const ctext = () => canvas().innerText();
  const overflow = async (n) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); step(`no sideways scroll at ${vp.width}px: ${n}`, o <= 0, `${o}px`); };
  const openQ = async () => { if (!phone) return; if (await page.locator('#q-ask').isVisible().catch(() => false)) return; await page.locator('.ds-askbar button').first().click(); await page.locator('#q-ask').waitFor(); };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) await x.click(); await page.waitForTimeout(250); };
  const lastQ = () => page.evaluate(() => { const w = window.__tqQA.getWorld(); const t = w.q.threads[w.session.actor] || []; for (let i = t.length - 1; i >= 0; i--) if (t[i].who !== 'me') return t[i]; return null; });
  const ask = async (t, wait = 900) => { await openQ(); await page.fill('#q-ask', t); await page.press('#q-ask', 'Enter'); await page.waitForTimeout(wait); let r; try { r = await lastQ(); } catch { await page.waitForTimeout(800); r = await lastQ(); } await closeQ(); return r ?? { text: '' }; };
  const click = async (name, exact = false) => { await canvas().getByRole('button', { name, exact }).first().click(); await page.waitForTimeout(350); };
  const confirm = async (label, yes) => { await click(label); await canvas().getByRole('button', { name: yes, exact: true }).first().click(); await page.waitForTimeout(400); };

  await page.goto(`${BASE}#/c/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(900);

  // ================= SC-071 · Work authorisation (Zara) + MO-041 =================
  await as('p_zara', '/c/jobs');
  const jobsBefore = await page.locator('.tb-jobcard').count();
  await go('/c/work-permit');
  let t = await ctext();
  step('SC-071 empty state: nothing stated, private, never hides jobs', /Nothing yet/.test(t) && /never hides a job/.test(t), t.slice(0, 200));
  step('SC-071 sharing is disabled until something is stated', await canvas().getByRole('button', { name: 'Share with Kora Pay' }).isDisabled());
  await canvas().locator('select').first().selectOption('Nigeria');
  await canvas().getByRole('radio', { name: 'I would need a permit or visa' }).click(); await page.waitForTimeout(200);
  step('SC-071 regional constraint shown as general information, not advice', /General information, not advice\./.test(await ctext()) && /ECOWAS/.test(await ctext()));
  await canvas().getByRole('button', { name: 'Save Nigeria' }).click(); await page.waitForTimeout(400);
  const r1 = await ask('I am a Ghanaian citizen');
  step('SC-071 Q understands a stated right to work and offers to save it (private)', /Ghana/.test(r1.text) && /private/.test(r1.text), r1.text);
  await act('td.auth.set', { country: 'Ghana', status: 'CITIZEN' });
  let td = await TD();
  step('SC-071 the candidate states it: two countries saved, as her statement', td.auth.p_zara.entries.length === 2 && /not checked by anyone/i.test(await ctext()));
  step('SC-071 private by default: no organisation has access', Object.keys(td.auth.p_zara.shares).length === 0);
  await go('/c/jobs');
  step('SC-071 never a hidden filter: the same jobs show after stating it', (await page.locator('.tb-jobcard').count()) === jobsBefore, `${jobsBefore}`);
  await go('/c/work-permit');
  await confirm('Share with Kora Pay', 'Share');
  td = await TD();
  const rc = td.auth.p_zara.shares.org_kora;
    step('SC-071 shared only with the chosen employer, with a consent receipt', !!rc && !rc.endedAt && !td.auth.p_zara.shares.org_rivers && /Consent receipt/i.test(await ctext()) && (await ctext()).includes(rc.id));
  const view = canvas().locator('.td-view').first();
  step('SC-071 “what Kora Pay sees” shows only her statement', /Nigeria: would need a permit/.test(await view.innerText()));
  const ev = (await W()).events.filter((e) => e.scope === 'SHARED:org_kora:p_zara' && /workauth/.test(e.type));
  step('SC-071 the employer’s event carries no details of the statement', ev.length >= 1 && ev.every((e) => !/Nigeria|Ghana|permit/.test(e.text)), ev.map((e) => e.text).join(' | '));
  await click('Attach a document (simulated)');
  t = await ctext();
  step('SC-071 checking is a separate step: an attached document reads “not checked”, never verified', /Attached · not checked/.test(t) && !/document[^.]*verified\b(?! by)/i.test(t.replace(/never marked verified/g, '')));
  await canvas().getByLabel('Let Kora Pay open it for their own check').check(); await page.waitForTimeout(300);
  step('SC-071 the document goes to Kora only by a second, explicit choice', (await TD()).auth.p_zara.doc.sharedWith.includes('org_kora'));
  await overflow('work authorisation'); await shot('01-work-permit-shared');
  const rq = await ask('stop kora seeing my work permit');
  step('SC-071 Q can end an employer’s access (approval first)', rq.kind === 'approval' && /End Kora Pay/.test(JSON.stringify(rq.actions)), rq.text);
  await confirm('End Kora Pay’s access', 'End access');
  td = await TD();
  const v2 = canvas().locator('.td-view').first();
  step('MO-041 consent change: access ended, receipt kept with its end time', !!td.auth.p_zara.shares.org_kora.endedAt && /Access ended/.test(await canvas().locator('.td-receipt').first().innerText()));
  step('MO-041 the preview loses its content and controls at once', (await v2.getAttribute('data-access')) === 'ended' && !(await v2.locator('.td-view-body').isVisible()) && await canvas().getByRole('button', { name: 'End Kora Pay’s access' }).count() === 0);
  step('MO-041 access update stated in text (reduced-motion fallback)', /Access ended\. Kora Pay sees nothing/.test(await v2.innerText()) && td.auth.p_zara.doc.sharedWith.length === 0);
  await shot('02-work-permit-ended');
  for (const s of ['loading', 'error', 'denied']) {
    await go(`/c/work-permit?state=${s}`);
    const ok = s === 'loading' ? await canvas().locator('[aria-busy="true"]').count() > 0 : await canvas().locator('[role="alert"]').count() > 0;
    step(`SC-071 ${s} variant renders`, ok);
  }

  // ================= SC-076 · Critique (Amaka) =================
  await as('p_amaka', '/c/work/critique');
  t = await ctext();
  step('SC-076 her own work shown, private, with a request to read it', /Why food prices rose/.test(t) && /Ask Q to read version 2/.test(t));
  await click('Ask Q to read version 2');
  td = await TD();
  const crit = td.works.w_amaka_prices.critique;
  t = await ctext();
  step('SC-076 Q critiques kindly: strengths first, then concrete points', crit.strengths.length === 2 && crit.points.length === 3 && /Already working/i.test(t) && /12 traders/.test(t));
  step('SC-076 every point is anchored to a paragraph with why and what to try', (await canvas().locator('.td-point').count()) === 3 && /Paragraph 1/.test(t) && /Try:/.test(t));
  step('SC-076 no harsh or scoring words', !HARSH.test(crit.points.map((p) => `${p.title} ${p.why} ${p.tryThis}`).join(' ') + crit.strengths.join(' ')));
  const cause = canvas().locator('.td-point').nth(1);
  await cause.getByRole('button', { name: 'Show Q’s wording' }).click(); await page.waitForTimeout(250);
  step('SC-076 where the fix needs her own facts, Q won’t write it', /Q won’t write this one/.test(await cause.innerText()));
  const lead = canvas().locator('.td-point').first();
  await lead.getByRole('button', { name: 'Show Q’s wording' }).click(); await page.waitForTimeout(250);
  step('SC-076 Q’s wording uses only her facts (21%, 9%, 12 traders)', /21%/.test(await lead.innerText()) && /using only your own facts/.test(await lead.innerText()));
  await lead.getByRole('button', { name: 'Use this wording' }).click(); await page.waitForTimeout(400);
  await canvas().locator('.td-point').nth(1).getByRole('button', { name: 'Rewrite it myself' }).click(); await page.waitForTimeout(200);
  await canvas().locator('.td-point textarea').fill('My weekly data shows tomato prices jumped in the weeks after fuel prices rose, so transport looks like the main cause I can test.');
  await canvas().getByRole('button', { name: /^Save as version/ }).click(); await page.waitForTimeout(400);
  await canvas().locator('.td-point').nth(2).getByRole('button', { name: 'Not for me' }).click(); await page.waitForTimeout(300);
  td = await TD();
  const W1 = td.works.w_amaka_prices;
  step('SC-076 she chooses: Q’s wording, her own rewrite, or not for me', W1.versions.length === 4 && W1.versions[2].by === 'YOU_WITH_Q' && W1.versions[3].by === 'YOU' && W1.critique.points.map((p) => p.state).join(',') === 'DONE,DONE,NOT_FOR_ME');
  await overflow('critique'); await shot('03-critique');
  const rcq = await ask('can you critique my write up');
  step('SC-076 the same task works by asking Q', /version 4/.test(rcq.text) && /private/.test(rcq.text), rcq.text);
  await go('/c/work/critique?state=loading'); step('SC-076 loading variant renders', await canvas().locator('[aria-busy="true"]').count() > 0);
  await go('/c/work/critique?w=w_chidi_brief'); step('SC-076 permission denied: someone else’s work isn’t shown', /This isn’t yours to open/.test(await ctext()) && !/reorder/i.test(await ctext()));

  // ================= SC-077 · Revision history + MO-029 =================
  await go('/c/work/versions');
  t = await ctext();
  step('SC-077 every version kept, with who, when and what changed', (await canvas().locator('.td-timeline > li').count()) === 4 && /Version 4/.test(t) && /You, using Q’s wording/.test(t));
  step('SC-077 the correction shows its original source', /Correction/i.test(t) && /12% → 21%/.test(t) && /Your weekly price sheet/.test(t));
  step('SC-077 new versions are private: Medlink still has version 1', /Has version 1/.test(t) && /misses a correction you made/.test(t) && (await TD()).works.w_amaka_prices.sharedV.org_medlink === 1);
  const cmp = await canvas().locator('[aria-label^="Changes from version"]').innerText();
  step('SC-077 compare two versions shows Was and Now', /\bWas\b/i.test(cmp) && /\bNow\b/i.test(cmp), cmp.slice(0, 120));
  await canvas().locator('.td-timeline > li').filter({ hasText: 'Version 2' }).getByRole('button', { name: 'Restore' }).click(); await page.waitForTimeout(200);
  await canvas().getByRole('group', { name: /Bring back version 2/ }).getByRole('button', { name: 'Restore', exact: true }).click(); await page.waitForTimeout(400);
  td = await TD();
  step('SC-077 restoring adds a version; nothing is deleted', td.works.w_amaka_prices.versions.length === 5 && td.works.w_amaka_prices.versions[4].changes[0].kind === 'RESTORED');
  await click('Give them version 5');
  step('SC-077 sharing a newer version is her explicit choice', (await TD()).works.w_amaka_prices.sharedV.org_medlink === 5);
  await overflow('versions'); await shot('04-versions');
  const pv = canvas().locator('.td-preview').first();
  await pv.getByRole('button', { name: 'End access' }).click(); await page.waitForTimeout(150);
  await pv.getByRole('button', { name: 'End access', exact: true }).last().click(); await page.waitForTimeout(350);
  const vis = await page.evaluate(() => window.__tqQA.visibleEvidence(window.__tqQA.getWorld(), 'p_amaka', 'org_medlink').map((e) => e.evidenceId));
  step('MO-029 share revoked: access invalidated in the store (visibleEvidence)', !vis.includes('e_amaka_prices'));
  step('MO-029 the preview hides content at once and shows the revoked label', (await pv.getAttribute('data-revoked')) === 'yes' && (await pv.locator('.td-preview-body').count()) === 0 && /can no longer open any version/.test(await pv.innerText()));
  await shot('05-versions-revoked');
  const rv = await ask('what changed in my versions');
  step('SC-077 versions reachable by asking Q', /versions/.test(rv.text), rv.text);

  // ================= SC-087 · Cover note (Grace) =================
  await as('p_grace', '/c/jobs/j_care_coord');
  step('SC-087 the job page offers a note from her own facts', /cover note with Q, from your own facts/.test(await ctext()));
  await go('/c/jobs/j_care_coord/letter');
  t = await ctext();
  step('SC-087 Q lists exactly the facts it will use, with sources; the pending certificate is caveated', /What Q will use/.test(t) && /Your profile/.test(t) && /Pending, so Q says “completed a course”, not “certified”/.test(t));
  await canvas().getByRole('radio', { name: 'Cover letter' }).click(); await click('Draft it from my facts');
  td = await TD();
  const L = td.letters['p_grace:j_care_coord'];
  step('SC-087 every Q line is grounded (the P6 guard finds nothing new) and none says “certified”', L && L.lines.length >= 6 && !L.lines.some((l) => /\bcertified\b/i.test(l.text)) && /Every line from me comes from your own sources/.test(await ctext()));
  step('SC-087 each line shows its source on the page', (await canvas().locator('.td-letter .td-src').count()) >= 5);
  await canvas().getByRole('button', { name: 'Add a line of your own' }).click(); await page.waitForTimeout(150);
  await canvas().locator('#td-l-new').fill('I am a certified nurse with 10 years of experience.');
  await click('Add line');
  t = await ctext();
  step('SC-087 her own words are labelled hers, and new facts are pointed out (not invented by Q)', /Your words/.test(t) && /Not in your Passport: .*“certified”/.test(t) && /“10”/.test(t));
  const threadsBefore = (await W()).threads.reduce((n, x) => n + x.messages.length, 0);
  await click('Approve this note');
  td = await TD();
  step('SC-087 the candidate approves; nothing is sent', td.letters['p_grace:j_care_coord'].state === 'APPROVED' && (await W()).threads.reduce((n, x) => n + x.messages.length, 0) === threadsBefore && /Nothing was sent/.test(await ctext()));
  await overflow('cover note'); await shot('06-letter');
  const ra = await ask('add certified nurse to my cover letter');
  step('SC-087 Q refuses to add a credential that isn’t in her sources', ra.kind === 'refusal' && /won’t write that/.test(ra.text), ra.text);
  await go('/c/jobs/nope/letter'); step('SC-087 error variant for a missing job', await canvas().locator('[role="alert"]').count() > 0);

  // ================= SC-092 · Learning player (Tobi) =================
  await as('p_tobi', '/c/learn/incident-first-10');
  t = await ctext();
  step('SC-092 the lesson is tied to a gap in his own record', /Incident leadership isn’t shown/.test(t) && /Finishing this lesson won’t change that/.test(t));
  step('SC-092 video is labelled simulated, with captions on by default', /Simulated video · no media plays/i.test(t) && await canvas().locator('.td-cap').isVisible());
  await canvas().locator('input[type="range"]').fill('30'); await page.waitForTimeout(250);
  step('SC-092 scrubbing moves captions to the matching line', /Step two: assign roles/.test(await canvas().locator('.td-cap').innerText()));
  await canvas().getByRole('button', { name: 'Play' }).click(); await page.waitForTimeout(2300);
  const tm = await canvas().locator('.td-time').first().innerText();
  step('SC-092 play advances the simulated timeline', /0:3[2-4]/.test(tm), tm);
  await canvas().getByRole('button', { name: 'Pause' }).click();
  await canvas().getByRole('button', { name: 'Transcript' }).click(); await page.waitForTimeout(250);
  step('SC-092 full transcript, every cue', (await canvas().locator('.td-transcript li').count()) === 7);
  await canvas().locator('.td-transcript button').nth(4).click(); await page.waitForTimeout(250);
  step('SC-092 selecting a transcript line jumps there', /Stabilise|stabilise/.test(await canvas().locator('.td-cap').innerText()));
  await canvas().getByRole('button', { name: 'Captions' }).click(); await page.waitForTimeout(200);
  step('SC-092 captions can be turned off', !(await canvas().locator('.td-cap').count()));
  await canvas().locator('.td-screen').focus(); await page.keyboard.press('c'); await page.waitForTimeout(200);
  step('SC-092 keyboard: C toggles captions on the focused player', await canvas().locator('.td-cap').count() === 1);
  await overflow('learning player'); await shot('07-learn');
  await page.getByRole('button', { name: 'Article', exact: true }).first().click(); await page.waitForTimeout(300);
  step('SC-092 the same lesson as an article', /Why the lead doesn’t debug/.test(await ctext()));
  await canvas().locator('#td-ex').fill('Declaring an incident. Ada leads, Musa does comms. Roll back the last deploy.');
  await click('Check my answer');
  step('SC-092 practical exercise with kind feedback', /That covers what the lesson asks for/.test(await ctext()));
  const evBefore = (await W()).evidence.filter((e) => e.ownerId === 'p_tobi').length;
  await click('Mark as finished');
  step('SC-092 finishing is private and isn’t proof (no evidence added)', (await W()).evidence.filter((e) => e.ownerId === 'p_tobi').length === evBefore && /Finished · private/.test(await ctext()));
  const rl = await ask('show the transcript');
  step('SC-092 Q drives the player (transcript)', /Transcript shown/.test(rl.text), rl.text);
  await go('/c/learn/nope'); step('SC-092 empty variant lists his lessons', /No lesson here/.test(await ctext()) && /Leading an incident/.test(await ctext()));

  // ================= SC-172 · Improvement wizard (Chidi) + MO-052 =================
  await as('p_chidi', '/c/career/improve');
  step('SC-172 needs a reviewer’s first read before improving', /hasn’t been reviewed yet/.test(await ctext()));
  await click('Send the original for review');
  const evId = 'e_j7_p_chidi_assess_writing';
  step('SC-172 the reviewer’s notes and advice are shown', /level 2 of 4/i.test(await ctext()) || /Level 2 of 4/.test(await ctext()));
  await click('See suggested changes');
  t = await ctext();
  step('SC-172 suggested edits carry their sources; his own facts are his to write', /Bole Distributors employer letter \(verified\)/.test(t) && /Q won’t write facts for you/.test(t));
  await canvas().locator('.td-point').nth(1).getByRole('button', { name: /Not included/ }).click(); await page.waitForTimeout(250);
  await click('Preview');
  step('SC-172 preview warns that without his facts the result may not change', /likely to stay the same/.test(await ctext()));
  await click('Send for review (simulated)');
  step('SC-172 an unchanged result can’t replace evidence', await canvas().getByRole('button', { name: 'Use the improved result' }).isDisabled());
  await click('Keep my earlier result');
  await click('Start again'); await click('See suggested changes');
  await canvas().locator('#td-wf').fill('Owners told me most weeks they ran out of the two fastest-selling drinks two or three days before my visit.');
  await canvas().locator('#td-wf').blur(); await page.waitForTimeout(300);
  await click('Preview'); await click('Send for review (simulated)');
  let e1 = (await W()).evidence.find((e) => e.evidenceId === evId);
  step('SC-172 reviewed improved version is NOT evidence until he chooses', /level 3 of 4/i.test(await ctext()) && /isn’t evidence yet/.test(await ctext()) && /level 2/.test(e1.title));
  await click('Use the improved result');
  e1 = (await W()).evidence.find((e) => e.evidenceId === evId);
  step('SC-172 after review and his choice it becomes evidence, private', /level 3/.test(e1.title) && e1.visibility === 'PRIVATE');
  step('SC-172 the improved brief is a version in his work history', (await TD()).works.w_chidi_brief.versions.length >= 2);
  await overflow('improvement wizard'); await shot('08-improve-private');
  step('MO-052 before consent the status reads Private', /Private/.test(await canvas().locator('.td-sharestate').first().innerText()));
  await confirm('Share with Tinda', 'Yes, share it');
  td = await TD(); e1 = (await W()).evidence.find((e) => e.evidenceId === evId);
  const WE = (await W()).events; const shareI = WE.findIndex((x) => x.type === 'passport.shared' && x.scope === 'SHARED:org_tinda:p_chidi'); const recI = WE.findIndex((x) => x.type === 'consent.receipt');
  step('MO-052 shared only after a consent receipt (receipt event precedes the share)', !!td.wizard.p_chidi.receipt && e1.sharedWith.includes('org_tinda') && recI >= 0 && shareI > recI);
  step('MO-052 sharing status text (reduced-motion fallback)', /Shared with Tinda/.test(await canvas().locator('.td-sharestate').first().innerText()) && (await canvas().locator('.td-sharestate[data-s="shared"]').count()) === 1);
  await shot('09-improve-shared');
  await go(`/c/passport?item=${evId}`);
  step('MO-052 the Evidence Passport card states the receipt', new RegExp(`Shared with Tinda.*receipt ${td.wizard.p_chidi.receipt.id}`, 's').test(await ctext()));
  const ri = await ask('help me improve my product brief');
  step('SC-172 reachable by asking Q', /wizard/.test(ri.text), ri.text);
  await as('p_amaka', '/c/career/improve'); step('SC-172 empty variant for someone with no reviewed sample', /No sample to improve yet/.test(await ctext()));

  // ================= SC-175 · Rejection recovery (Chidi) =================
  await as('p_chidi', '/c/applications');
  step('SC-175 the not-progressing application offers recovery', await canvas().getByRole('link', { name: 'Talk it through with Q' }).count() === 1);
  const rr = await ask('why was I rejected by tinda');
  step('SC-175 Q is warm and never guesses the reason', /sorry/i.test(rr.text) && /won’t guess/.test(rr.text) && !GUESS.test(rr.text), rr.text);
  await go('/c/applications/a_chidi_tinda/recovery');
  t = await ctext();
  step('SC-175 without shared feedback it says so and doesn’t guess', /didn’t say why, and I won’t guess/.test(t) && /No reason was shared/.test(t) && !GUESS.test(t));
  await click('Ask Tinda for feedback');
  step('SC-175 the request is a draft until he approves', /Draft · not sent/.test(await ctext()));
  await click('Send it');
  const W2 = await W(); const m = W2.threads.flatMap((x) => x.messages).find((x) => x.id === W2.areas['talent-d'].recovery.a_chidi_tinda.asked.msgId);
  step('SC-175 sent is simulated and labelled “not read yet”', m.status === 'SENT_SIMULATED' && /Sent \(simulated\) · not read yet/.test(await ctext()));
  await canvas().getByText('Reviewer control (simulated employer)').click(); await click('Simulate Tinda replying with feedback');
  t = await ctext(); td = await TD();
  step('SC-175 uses only feedback the employer shared, quoted exactly', t.includes(`“${td.recovery.a_chidi_tinda.feedback.text}”`) && /Quoted exactly/.test(t));
  step('SC-175 a useful next step and new practice, mapped from their words', /Improve your product brief/.test(t) && /lesson on briefs/.test(t) && /New practice, private/.test(t));
  await overflow('recovery'); await shot('10-recovery');
  const rf = await ask('what did tinda say about my rejection');
  step('SC-175 Q repeats only the employer’s words', rf.text.includes('We went with candidates who could show product writing') && /won’t add reasons/.test(rf.text), rf.text);
  await as('p_zara', '/c/applications/a_chidi_tinda/recovery'); step('SC-175 permission denied for someone else’s application', /This isn’t yours to open/.test(await ctext()));

  // ================= MO-040 · Application status (Zara) =================
  await as('p_zara', '/c/applications');
  const tag = canvas().locator('.tb-app').filter({ hasText: 'Rivers' }).locator('.td-stage');
  step('MO-040 stage before the employer event', /Sent/.test(await tag.innerText()));
  await upd("const ap = w.applications.find((x) => x.id === 'a_zara_rivers'); ap.status = 'VIEWED'; ap.lastEmployerActivity = '2026-10-30'; ap.timeline.push({ at: '2026-10-30', text: 'Rivers Logistics viewed your application', by: 'EMPLOYER' });");
  await page.waitForTimeout(600);
  step('MO-040 stage changes after the authoritative employer event', (await tag.locator('[data-stage]').getAttribute('data-stage')) === 'VIEWED' && /Viewed/.test(await tag.innerText()));
  step('MO-040 stage text announced (reduced-motion fallback)', /Status changed from Sent to Viewed/.test(await tag.locator('[aria-live]').innerText()));

  // ================= MO-014 · Job filter =================
  await go('/c/jobs');
  const all = await page.locator('.tb-jobcard').count();
  step('MO-014 job list carries the filter motion hook', await page.locator('[data-motion="MO-014"]').count() > 0);
  await page.getByRole('button', { name: 'Remote', exact: true }).click(); await page.waitForTimeout(500);
  const rem = await page.locator('.tb-jobcard').count();
  step('MO-014 filter:changed reorders the list (redraws directly with reduced motion)', rem > 0 && rem < all && (await page.locator('[data-motion="MO-014"]').first().getAttribute('data-filter')) === 'remote', `${all}→${rem}`);
  await page.getByRole('button', { name: 'All', exact: true }).click(); await page.waitForTimeout(400);

  // ================= MO-030 · CV draft generated (Tobi) =================
  await as('p_tobi', '/c/passport');
  await page.getByRole('button', { name: 'Make my CV clearer' }).click(); await page.waitForTimeout(150);
  step('MO-030 a just-generated draft grows in line by line', await page.locator('[data-motion="MO-030"]').count() >= 4);
  await page.waitForTimeout(700);
  step('MO-030 the document ends fully loaded and the editor works', await page.locator('.evc-diff > li').last().isVisible() && await page.getByRole('button', { name: 'Approve this version' }).isEnabled());
  await page.waitForTimeout(3000); await page.reload(); await page.waitForTimeout(800);
  step('MO-030 opened later, it is simply the loaded document', await page.locator('[data-motion="MO-030"]').count() === 0 && await page.locator('.evc-diff > li').count() >= 4);

  await ctx.close();
}
await b.close();
const fails = results.filter((r) => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} passed${errors.length ? `; ${errors.length} page errors` : ''}`);
for (const e of [...new Set(errors)].slice(0, 10)) console.log('ERROR', e);
process.exit(fails.length || errors.length ? 1 : 0);
