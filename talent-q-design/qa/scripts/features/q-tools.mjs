// Q-TOOLS · Q's artifacts and tools, desktop 1440×900 and phone 390×844 (atlas SC-124, 126, 127, 128, 130, 136;
// vision V06, V07, V26; motions MO-004, 005, 031, 032, 034, 038, 056). Everything is driven by talking to Q in the
// global thread, then checked against the store and the page:
// Ada charts and maps Kora's pipeline (privacy filter: a withdrawn consent drops out at once), draws the hiring process,
// makes a narrated explainer (simulated storyboard: play, pause, resume, transcript, provenance), has Q read it out and
// interrupts it by typing, looks up Kora's engineering blog (sandbox, untrusted fence, injected instruction ignored, link
// previews, blocked domain), downloads files (receipt only after the scan; clean / blocked / quarantined with reasons),
// asks what sources Q used, researches pay (two sources disagree; Q shows both and never picks), hands the artifact to
// her phone (same thread, same frame). Dele and Tobi are refused Kora's pipeline; Dele can't open Ada's artifact.
// Usage: BASE=http://localhost:5215/ node qa/scripts/features/q-tools.mjs [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const ROOT = new URL('../../../captures/features/q-tools/', import.meta.url).pathname; mkdirSync(ROOT, { recursive: true });
const BASE = (process.env.BASE || 'http://localhost:5215/').replace(/\/?$/, '/');
const ONLY = (process.argv[2] || 'd,m').split(',');
const b = await pw.chromium.launch();
const results = []; const errors = [];

for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const phone = v === 'm';
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${v}: ${m.text().slice(0, 200)}`); });
  const step = (name, ok, detail = '') => { results.push({ v, name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} [${v}] ${name}${!ok && detail ? ` · ${String(detail).replace(/\s+/g, ' ').slice(0, 220)}` : ''}`); };
  const shot = async (n, full = false) => { await page.waitForTimeout(350); await page.screenshot({ path: `${ROOT}${v}-${n}.png`, fullPage: full }); };
  const world = () => page.evaluate(() => window.__tqQA.getWorld());
  const qt = async () => (await world()).areas['q-tools'];
  const route = () => page.evaluate(() => location.hash.slice(1).split('?')[0]);
  const overflow = async (n) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); step(`no sideways scroll at ${phone ? 390 : 1440}px: ${n}`, o <= 0, `${o}px`); };
  const minFont = async (n) => { const f = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.ds-canvas p, .ds-canvas li, .ds-canvas td, .ds-canvas dd, .ds-canvas span, .ds-canvas text')].filter((e) => e.offsetParent !== null || e instanceof SVGElement).filter((e) => (e.textContent || '').trim().length > 2 && e.children.length === 0).map((e) => parseFloat(getComputedStyle(e).fontSize) * (e instanceof SVGElement && e.ownerSVGElement ? (e.ownerSVGElement.getBoundingClientRect().width / (e.ownerSVGElement.viewBox.baseVal?.width || e.ownerSVGElement.getBoundingClientRect().width)) : 1)))); step(`body text ≥ 12px: ${n}`, f >= 11.9, `${f}px`); };
  const openQ = async () => { if (!phone) return; if (await page.locator('#q-ask').isVisible().catch(() => false)) return; await page.locator('.ds-askbar button').first().click(); await page.locator('#q-ask').waitFor(); };
  const closeQ = async () => { if (!phone) return; const x = page.getByRole('button', { name: 'Close Q' }); if (await x.isVisible().catch(() => false)) await x.click(); await page.waitForTimeout(250); };
  const lastQ = () => page.evaluate(() => { const w = window.__tqQA.getWorld(); const t = w.q.threads[w.session.actor] || []; for (let i = t.length - 1; i >= 0; i--) if (t[i].who !== 'me') return t[i]; return {}; });
  const ask = async (t, wait = 900) => { await openQ(); await page.fill('#q-ask', t); await page.press('#q-ask', 'Enter'); await page.waitForTimeout(wait); const m = await lastQ(); return m; };
  const until = async (pred, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await pred()) return true; await page.waitForTimeout(150); } return false; };
  const as = async (actor, r) => { await page.goto(`${BASE}#${r}?as=${actor}`); await page.waitForTimeout(700); };
  const latest = async (kind) => (await qt()).artifacts.filter((x) => x.kind === kind).at(-1);

  // ---------------- Fresh world, Ada ----------------
  await page.goto(`${BASE}#/r/home`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  await as('u_ada', '/q/artifacts');
  let body = await page.locator('.ds-canvas').innerText();
  step('SC-124/126/127 empty state: Q’s work invites a request in words', /Nothing yet/.test(body) && /chart our pipeline by stage/.test(body), body);
  await openQ();
  const opener = await page.locator('.ds-log .ds-q .say').first().innerText().catch(() => '');
  step('Page opener names what to do on Q’s work', /chart, map or draw/i.test(opener), opener);
  await closeQ(); await overflow('library-empty'); await shot('01-library-empty');

  // ---------------- SC-124 chart, MO-031 ----------------
  let m = await ask('chart our pipeline by stage', 1300);
  let art = await latest('CHART');
  const expect = await page.evaluate(() => { const w = window.__tqQA.getWorld(); const ids = new Set(['m_backend', ...w.mandates.filter((x) => x.orgId === 'org_kora').map((x) => x.id)]); const st = ['SOURCED', 'SHORTLISTED', 'CONTACTED', 'REPLIED', 'INTERVIEW', 'OFFER', 'HIRED']; const e = w.pipeline.filter((p) => ids.has(p.mandateId) && st.includes(p.stage)); return { total: e.filter((p) => window.__tqQA.canSeeCandidate(w, p.personId, 'org_kora')).length, all: e.length }; });
  step('SC-124 “chart our pipeline by stage” makes a CHART artifact and opens it on the canvas', art && !art.denied && (await route()) === `/q/artifacts/${art.id}` && m.ref?.type === 'qt.art', `${await route()} ${JSON.stringify(m).slice(0, 160)}`);
  step('SC-124 Q states the finding from live, privacy-filtered data', new RegExp(`${expect.total} people`).test(m.text), `${expect.total} · ${m.text}`);
  await page.waitForTimeout(500);
  const bars = await page.locator('.ds-canvas .qt-chart svg rect[rx="4"]').count();
  const vals = await page.locator('.ds-canvas .qt-chart .qt-val').evaluateAll((e) => e.map((x) => x.textContent));
  step('MO-031 chart renders from numeric data (bars sum to the store’s count)', bars > 0 && vals.reduce((s, x) => s + Number(x), 0) === expect.total, `${bars} bars ${vals}`);
  await page.locator('.qt-chart rect.qt-hit').nth(1).focus(); await page.waitForTimeout(150);
  step('SC-124 each bar is keyboard-reachable with a detail line naming who', /Shortlisted: \d+ · /.test(await page.locator('.qt-detail').innerText()));
  await overflow('chart'); await minFont('chart'); await shot('02-chart');
  await page.getByRole('button', { name: 'Table' }).click();
  step('SC-124 accessible alternative: a table of stage, count and who', (await page.locator('.qt-table tbody tr').count()) === 7);
  await page.getByRole('button', { name: 'Chart' }).click();
  // Privacy: a candidate withdraws consent from Kora → the chart drops them at once (never named, counted).
  await page.evaluate(() => window.__tqQA.update((w) => { w.consents.p_kunle.withdrawnFrom.push('org_kora'); }));
  await page.waitForTimeout(400);
  body = await page.locator('.ds-canvas').innerText();
  const v2 = (await page.locator('.ds-canvas .qt-chart .qt-val').evaluateAll((e) => e.map((x) => x.textContent))).reduce((s, x) => s + Number(x), 0);
  step('SC-124 privacy: withdrawn consent removes Kunle at once; counted as hidden, never named', v2 === expect.total - 1 && /1 more isn’t shown because of their privacy settings/.test(body) && !/Kunle/.test(await page.locator('.ds-canvas .qt-chart').innerText()), `${v2} ${body.slice(-200)}`);
  await shot('03-chart-privacy');
  await page.evaluate(() => window.__tqQA.update((w) => { w.consents.p_kunle.withdrawnFrom = w.consents.p_kunle.withdrawnFrom.filter((x) => x !== 'org_kora'); }));

  // ---------------- SC-124 map ----------------
  m = await ask('map where Kora’s candidates are', 1300);
  art = await latest('MAP');
  step('SC-124 “map where Kora’s candidates are” makes a MAP artifact', art && !art.denied && (await route()) === `/q/artifacts/${art.id}`, m.text);
  await page.waitForTimeout(500);
  body = await page.locator('.ds-canvas').innerText();
  step('SC-124 map: city dots with direct labels; cities outside the view listed, not squeezed in', (await page.locator('.qt-dot').count()) >= 2 && /Lagos/.test(body) && /outside this view/.test(body), body.slice(0, 300));
  step('SC-124 map says city only, approximate, no basemap', /City only/.test(body) && /no basemap/.test(body));
  await overflow('map'); await minFont('map'); await shot('04-map');
  await page.getByRole('button', { name: 'List' }).click();
  step('SC-124 map has a list alternative (city, count, who)', (await page.locator('.qt-table tbody tr').count()) >= 3);
  await shot('05-map-list');

  // ---------------- SC-126 diagram ----------------
  m = await ask('draw the hiring process', 1300);
  art = await latest('DIAGRAM');
  step('SC-126 “draw the hiring process” makes a vector DIAGRAM', art && (await page.locator('#qt-figure rect').count()) === 7, m.text);
  body = await page.locator('.ds-canvas').innerText();
  step('SC-126 figure marks the checks where a person decides (from Kora’s approval setting)', /A person approves each message/.test(body), body.slice(0, 300));
  await overflow('diagram'); await shot('06-diagram');
  await page.getByRole('button', { name: 'Outline' }).click();
  step('SC-126 accessible alternative: the same steps as an outline', (await page.locator('.qt-outline li').count()) === 7);

  // ---------------- SC-127 narrated video, MO-032 ----------------
  m = await ask('make a short narrated explainer of this role', 600);
  art = await latest('VIDEO');
  step('SC-127 “make a short narrated explainer of this role” starts a storyboard, labelled simulated', art && /simulated: a storyboard with captions and a transcript, no video file/.test(m.text), m.text);
  const building = await until(async () => (await page.locator('.ds-canvas .qt-video[aria-busy="true"]').count()) === 1, 2000);
  step('SC-127 loading state: frames are drawn one by one (real steps, no fake spinner)', building && /Drawing frame \d of 5/.test(await page.locator('.ds-canvas .qt-video').innerText()));
  await shot('07-video-building');
  await until(async () => (await page.locator('.ds-canvas .qt-screen .qt-frame').count()) > 0, 6000);
  body = await page.locator('.ds-canvas').innerText();
  step('MO-032 video available: still frame with caption, optional play, “Simulated video” label', /Simulated video/i.test(body) && (await page.locator('.ds-canvas .qt-caption').innerText()).length > 20 && await page.getByRole('button', { name: 'Play', exact: true }).isVisible(), body.slice(0, 200));
  step('SC-127 provenance: made from the brief, synthetic voice, no people, no file', /Made by/i.test(body) && /synthetic voice/.test(body) && /No candidate data/.test(body) && /No video file was made/.test(body));
  await overflow('video'); await shot('08-video-ready');
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForTimeout(1200);
  step('SC-127 play narrates with captions (Q speaking mark, no audio)', /Q is narrating/.test(await page.locator('.qt-controls').innerText()));
  await page.getByRole('button', { name: 'Pause' }).click();
  step('SC-127 interrupted: pausing says where it stopped and how to resume', /Paused at frame 1 of 5/.test(await page.locator('.qt-controls').innerText()));
  await page.getByRole('button', { name: 'Resume' }).click(); await page.waitForTimeout(3400);
  step('SC-127 resume: playback carries on to the next frame', /2 \/ 5|3 \/ 5/.test(await page.locator('.ds-canvas .qt-frame .lab').innerText()), await page.locator('.ds-canvas .qt-frame .lab').innerText());
  await page.getByRole('button', { name: 'Pause' }).click().catch(() => {});
  await page.getByRole('button', { name: 'Read the transcript' }).click();
  step('SC-127 accessible alternative: full transcript', (await page.locator('.qt-transcript').innerText()).length > 200);
  await shot('09-video-transcript');
  m = await ask('make a video about tobi', 900);
  step('SC-127 permission/consent: a video about a person is refused, role offered instead', /needs that person’s consent/.test(m.text) && m.kind === 'refusal', m.text);
  await closeQ();

  // ---------------- MO-004 Q speaks, MO-005 Q interrupted (global thread) ----------------
  await page.goto(`${BASE}#/q/artifacts/${art.id}`); await page.waitForTimeout(800);
  m = await ask('read it out loud', 1200);
  const voiceId = m.ref?.id;
  let card = page.locator('.qt-voice').last();
  step('MO-004 “read it out loud”: Q speaks in the global thread, captions following (simulated, no audio)', m.ref?.type === 'qt.voice' && (await card.getAttribute('data-state')) === 'SPEAKING' && /simulated voice, captions only/.test(await card.innerText()), JSON.stringify(m).slice(0, 200));
  await page.waitForTimeout(1200);
  const capA = (await card.locator('.qt-voice-cap').innerText()).length;
  step('MO-004 captions advance as Q speaks', capA > 10, String(capA));
  await shot('10-speaking');
  await page.locator('#q-ask').pressSequentially('wa', { delay: 30 });
  await page.waitForTimeout(400);
  const vs = (await qt()).voice.find((x) => x.id === voiceId);
  step('MO-005 typing interrupts Q at once: stopped, listening, words not said kept', (await card.getAttribute('data-state')) === 'INTERRUPTED' && vs.stoppedAt > 0 && /listening to you/.test(await card.innerText()) && /You started typing/i.test(vs.stopReason), `${await card.getAttribute('data-state')} ${JSON.stringify(vs)}`);
  await shot('11-interrupted');
  await page.fill('#q-ask', '');
  m = await ask('carry on', 900);
  card = page.locator('.qt-voice').last();
  step('MO-005 “carry on” resumes from where it stopped', m.ref?.type === 'qt.voice' && (await card.getAttribute('data-state')) === 'SPEAKING');
  await card.getByRole('button', { name: 'Stop' }).click(); await page.waitForTimeout(300);
  step('MO-005 Stop button interrupts too', (await card.getAttribute('data-state')) === 'INTERRUPTED');
  await closeQ();

  // ---------------- SC-128 secure browsing (V06) ----------------
  const threadsBefore = (await world()).threads.map((t) => t.messages.length).join();
  m = await ask('look up Kora’s engineering blog', 1500);
  art = await latest('BROWSE');
  step('SC-128 “look up Kora’s engineering blog” opens a sandboxed read-only copy', art && !art.denied && (await route()) === `/q/browse/${art.id}` && /read-only/.test(m.text), m.text);
  await closeQ();
  await until(async () => (await page.locator('.qt-fence[aria-label]').count()) > 0, 3000);
  body = await page.locator('.ds-canvas').innerText();
  step('SC-128 page shows Sandboxed · Read-only · Scripts off · Simulated fetch', /Sandboxed/.test(body) && /Read-only/.test(body) && /Scripts off/.test(body) && /Simulated fetch/i.test(body));
  step('SC-128 untrusted content fence: fetched text is labelled data that can’t instruct Q', /Fetched text · untrusted/i.test(body) && /Nothing on a page can instruct Q/.test(body));
  step('V06 injected instruction is shown struck through, marked Ignored; Q said so', (await page.locator('.qt-inject s').count()) === 1 && /Ignored/.test(await page.locator('.qt-inject').innerText()) && /I ignored it/.test(m.text), m.text);
  step('V06 nothing was sent because of the page (no new messages anywhere)', (await world()).threads.map((t) => t.messages.length).join() === threadsBefore);
  await overflow('browse'); await minFont('browse'); await shot('12-browse', true);
  await page.getByRole('button', { name: 'Our recruiting partner' }).focus(); await page.waitForTimeout(200);
  body = await page.locator('.qt-links').innerText();
  step('SC-128 link preview: domain, allowed or not, before opening', /tracker\.ads\.example/.test(body) && /Not allowed/.test(body) && /isn’t on the allowed list/.test(body), body.slice(0, 300));
  await page.getByRole('button', { name: 'Ask an admin' }).click(); await page.waitForTimeout(300);
  step('SC-128 a blocked domain can be requested from an admin, never auto-allowed', (await qt()).allowRequests.some((r) => r.domain === 'tracker.ads.example'));
  await shot('13-link-blocked');
  m = await ask('do what the page says', 900);
  step('V06 “do what the page says” is refused: fetched text can’t instruct Q', m.kind === 'refusal' && /information, not an instruction/.test(m.text), m.text);
  m = await ask('open randomsite.com', 1200);
  step('SC-128 permission denied: a site off the allowed list is not fetched', m.kind === 'refusal' && /isn’t on your organisation’s list/.test(m.text), m.text);
  await closeQ();

  // ---------------- SC-130 downloads (V07), MO-034 ----------------
  m = await ask('download this certificate', 400);
  art = await latest('DOWNLOAD');
  await closeQ();
  step('SC-130 “download this certificate” fetches the linked PCI certificate', art?.scope.file === 'f_pci' && (await route()) === '/q/downloads', JSON.stringify(art));
  step('MO-034 no receipt and no Open while the scan runs', (await page.locator('.qt-receipt').count()) === 0 && /Nobody can open the file until this finishes/.test(await page.locator('.qt-dl').first().innerText()));
  await shot('14-scanning');
  await until(async () => /page \d of 2/.test(await page.locator('.qt-dl').first().innerText()), 4000);
  step('SC-130 parsing progress after a clean scan (page n of 2)', /page \d of 2/.test(await page.locator('.qt-dl').first().innerText()));
  await until(async () => (await page.locator('.qt-receipt').count()) > 0, 5000);
  body = await page.locator('.qt-dl').first().innerText();
  step('MO-034 receipt appears only after the scan completes: Clean, with reason', /Clean/.test(body) && /No threats found/.test(body) && /Scan receipt/.test(body), body);
  await page.getByRole('button', { name: 'Open read-only' }).click(); await page.waitForTimeout(300);
  step('SC-130 a clean file opens read-only with its extracted text', /Extracted text · 2 pages/.test(await page.locator('.qt-dl').first().innerText()) && (await qt()).opened.includes(art.id));
  await shot('15-clean');
  await page.evaluate(() => window.__tqQA.act('qt.download', { file: 'f_exe' }));
  await page.evaluate(() => window.__tqQA.act('qt.download', { file: 'f_kit' }));
  await page.evaluate(() => window.__tqQA.act('qt.download', { file: 'f_talk' }));
  await page.waitForTimeout(3200);
  body = await page.locator('.qt-dls').innerText();
  step('V07 blocked: a program disguised as a PDF, with the reason', /pci-guide\.pdf\.exe[\s\S]*Blocked[\s\S]*Windows program/.test(body), body.slice(0, 400));
  step('V07 quarantined: a password-protected archive, with what an admin must do', /kora-press-kit\.zip[\s\S]*Quarantined[\s\S]*password-protected/.test(body));
  step('SC-130 file limit: 182 MB video blocked over the 25 MB limit', /reconciliation-talk\.mp4[\s\S]*over the 25 MB limit/.test(body));
  step('V07 only clean files can be opened (one Open button at most)', (await page.getByRole('button', { name: 'Open read-only' }).count()) === 0 && (await page.locator('.qt-dl').count()) === 4);
  await overflow('downloads'); await minFont('downloads'); await shot('16-downloads', true);
  await page.evaluate(() => window.__tqQA.act('qt.open', { id: window.__tqQA.getWorld().areas['q-tools'].artifacts.find((x) => x.scope.file === 'f_kit').id }));
  step('V07 a quarantined file can’t be opened, even by asking', (await qt()).opened.length === 1);

  // ---------------- SC-136 sources ----------------
  m = await ask('what sources did you use', 900);
  step('SC-136 “what sources did you use” lists the sources for the latest artifact', m.ref?.type === 'qt.sources' && /Web pages count as untrusted/.test(m.text), m.text);
  await closeQ();
  await page.goto(`${BASE}#/q/sources`); await page.waitForTimeout(700);
  body = await page.locator('.ds-canvas').innerText();
  const nsrc = await page.locator('.qt-source').count();
  step('SC-136 source manager: each source has freshness, licence and who can see it', nsrc >= 5 && (await page.locator('.qt-source dt', { hasText: 'Freshness' }).count()) === nsrc && (await page.locator('.qt-source dt', { hasText: 'Licence' }).count()) === nsrc && (await page.locator('.qt-source dt', { hasText: 'Who can see it' }).count()) === nsrc, String(nsrc));
  step('SC-136 Talent Q records are live and shared with Kora; web pages are untrusted with a licence', /Live/.test(body) && /Everyone at Kora Pay/.test(body) && /Web page · untrusted/i.test(body) && /All rights reserved/.test(body));
  await page.getByRole('button', { name: 'Web', exact: true }).click();
  step('SC-136 filter by kind (Web)', (await page.locator('.qt-source').count()) < nsrc);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await overflow('sources'); await minFont('sources'); await shot('17-sources', true);

  // ---------------- MO-056 conflicting evidence ----------------
  m = await ask('what’s the market pay for a senior backend engineer in lagos', 900);
  step('MO-056 research: Q shows both disagreeing sources side by side and doesn’t pick', m.ref?.type === 'qt.conflict' && /disagree/.test(m.text) && /haven’t picked one/.test(m.text), m.text);
  await openQ();
  const cf = await page.locator('.ds-log .qt-conflict').last().innerText();
  step('MO-056 each claim shows source, basis and date', /₦2\.2m–₦2\.8m/.test(cf) && /₦3\.0m–₦3\.6m/.test(cf) && /140/.test(cf) && /38 job ads/.test(cf), cf);
  await shot('18-conflict');
  m = await ask('which one is right', 900);
  step('MO-056 “which one is right?” explains the difference and still won’t choose silently', /won’t pick for you/.test(m.text), m.text);
  await closeQ();
  await page.goto(`${BASE}#/q/sources`); await page.waitForTimeout(700);
  await page.locator('#qt-src-conf').getByRole('button', { name: 'Keep both side by side' }).click(); await page.waitForTimeout(300);
  const st = await qt();
  step('MO-056 the choice is recorded with who and when; both sources are kept', Object.values(st.conflicts)[0]?.decision === 'KEEP_BOTH' && st.sources.filter((s) => /paysurvey|jobsboard/.test(s.key)).length === 2 && /Decided by Ada/.test(await page.locator('#qt-src-conf').innerText()));
  await shot('19-conflict-decided');

  // ---------------- SC-136 change visibility and remove ----------------
  const blog = page.locator('.qt-source', { hasText: 'How we reconcile four million' });
  await blog.getByRole('button', { name: 'Share with Kora Pay' }).click(); await page.waitForTimeout(200);
  step('SC-136 a source can be shared with the team', /Everyone at Kora Pay/.test(await blog.innerText()));

  // ---------------- MO-038 desktop → phone (desktop run only, a second phone-sized device) ----------------
  if (!phone) {
    const vid = await latest('VIDEO');
    await page.goto(`${BASE}#/q/artifacts/${vid.id}`); await page.waitForTimeout(900);
    await page.getByRole('button', { name: '3. What counts as evidence' }).click();
    await page.getByRole('button', { name: 'Continue on phone' }).click(); await page.waitForTimeout(300);
    const h = (await qt()).handoffs.at(-1);
    step('MO-038 “Continue on phone” records a handoff at the current frame', h?.artifactId === vid.id && h.position === 2, JSON.stringify(h));
    const dump = await page.evaluate(() => localStorage.getItem('tq.world.v4'));
    const pctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const pp = await pctx.newPage();
    await pp.goto(`${BASE}#/r/home`); await pp.evaluate((d) => localStorage.setItem('tq.world.v4', d), dump);
    await pp.goto(`${BASE}#/q/artifacts/${vid.id}`); await pp.reload(); await pp.waitForTimeout(1200);
    const pb = await pp.locator('.ds-canvas').innerText();
    step('MO-038 phone shows the same artifact at the same frame, “Continued from your desktop”', /Continued from your desktop/.test(pb) && /3 \/ 5/.test(pb), pb.slice(0, 300));
    const tl = await pp.evaluate(() => { const w = window.__tqQA.getWorld(); return (w.q.threads[w.session.actor] || []).length; });
    const dl = await page.evaluate(() => { const w = window.__tqQA.getWorld(); return (w.q.threads[w.session.actor] || []).length; });
    step('MO-038 same Q thread on the phone (same messages)', tl === dl && tl > 10, `${tl} vs ${dl}`);
    await pp.screenshot({ path: `${ROOT}d-20-phone-continued.png` });
    const o = await pp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    step('MO-038 phone view has no sideways scroll', o <= 0, `${o}`);
    await pctx.close();
  }

  // ---------------- Library and permissions ----------------
  await page.goto(`${BASE}#/q/artifacts`); await page.waitForTimeout(600);
  step('Q’s work lists what Q made (chart, map, diagram, video)', (await page.locator('.qt-card').count()) >= 4);
  await overflow('library'); await shot('21-library');
  const adaArt = (await latest('CHART')).id;
  await as('u_dele', '/r/home');
  m = await ask('chart kora’s pipeline by stage', 1000);
  step('SC-124 permission denied: Dele (agency) can’t chart Kora’s pipeline', m.kind === 'refusal' && /belongs to Kora Pay/.test(m.text), m.text);
  await closeQ();
  await page.goto(`${BASE}#/q/artifacts/${adaArt}`); await page.waitForTimeout(700);
  body = await page.locator('.ds-canvas').innerText();
  step('Permission denied: Dele can’t open Ada’s artifact; no data shown', /Not available to you/.test(body) && !/Shortlisted/.test(body), body.slice(0, 200));
  await shot('22-denied');
  await as('p_tobi', '/q/artifacts');
  m = await ask('chart our pipeline by stage', 900);
  step('SC-124 a candidate gets an honest refusal, not someone else’s pipeline', m.kind === 'refusal' && /organisation doing the hiring/.test(m.text), m.text);
  m = await ask('draw the hiring process', 1200);
  step('SC-126 a candidate’s diagram is their own application path', /Your path with|How applying works/.test(m.text) && (await page.locator('#qt-figure rect').count()) >= 4, m.text);
  await closeQ(); await overflow('candidate-diagram'); await shot('23-candidate-diagram');
  await ctx.close();
}
await b.close();
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} steps passed`);
if (errors.length) { console.log('Page errors:'); for (const e of [...new Set(errors)]) console.log('  ', e); }
process.exit(fails || errors.length ? 1 : 0);
