// Records captioned journey films from the running prototype (http://localhost:4174).
// Frames: DevTools screencast (JPEG) at true speed, stitched with ffmpeg. Captions, title cards, a visible
// pointer and a "simulated" watermark are an overlay added by this script, not part of the product UI.
// Usage: node films.mjs <outDir> [F1,F3,...]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const { chromium } = pw;
const OUT = path.resolve(process.argv[2] || 'films');
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
const BASE = 'http://localhost:4174/';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const OVERLAY = `(() => {
  const css = \`#__f{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:'Geist Variable',system-ui,sans-serif}
  #__f .cap{position:absolute;left:50%;bottom:44px;transform:translateX(-50%);max-width:min(1100px,88vw);background:rgba(11,10,8,.88);color:#ece6da;border:1px solid #3a3327;border-radius:14px;padding:14px 24px;font-size:22px;line-height:1.4;text-align:center;opacity:0;transition:opacity .35s}
  #__f.phone .cap{font-size:17px;bottom:28px;padding:12px 16px;max-width:92vw}
  #__f .cap.on{opacity:1}
  #__f .title{position:absolute;inset:0;background:#0b0a08;color:#ece6da;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;opacity:0;transition:opacity .6s;text-align:center;padding:24px}
  #__f .title.on{opacity:1}
  #__f .title .dot{width:44px;height:44px;border-radius:50%;background:#d9b56b;box-shadow:0 0 0 10px rgba(217,181,107,.08)}
  #__f .title h1{font-family:'Newsreader Variable',Georgia,serif;font-weight:400;font-size:56px;margin:0;letter-spacing:-.01em;max-width:18ch;line-height:1.1}
  #__f.phone .title h1{font-size:34px}
  #__f .title p{font-family:'Geist Mono Variable',monospace;font-size:16px;letter-spacing:.08em;text-transform:uppercase;color:#a8a194;margin:0}
  #__f .ptr{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid #f0d395;background:rgba(240,211,149,.25);transition:left .55s cubic-bezier(.2,.7,.2,1),top .55s cubic-bezier(.2,.7,.2,1),transform .15s;left:50%;top:60%}
  #__f .ptr.down{transform:scale(.7)}
  #__f .wm{position:absolute;left:16px;bottom:12px;font-family:'Geist Mono Variable',monospace;font-size:12px;letter-spacing:.08em;color:#c9c1b2;background:rgba(11,10,8,.75);border:1px dashed #5c5548;border-radius:4px;padding:3px 8px;text-transform:uppercase}\`;
  const mount = () => {
    if (document.getElementById('__f')) return;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const f = document.createElement('div'); f.id = '__f'; if (innerWidth < 600) f.className = 'phone';
    f.innerHTML = '<div class="wm">Talent Q prototype · simulated data</div><div class="ptr"></div><div class="cap"></div><div class="title"><div class="dot"></div><h1></h1><p></p></div>';
    document.body.appendChild(f);
  };
  window.__film = {
    caption(t) { mount(); const c = document.querySelector('#__f .cap'); if (!t) { c.classList.remove('on'); return; } c.textContent = t; c.classList.add('on'); },
    title(h, p) { mount(); const t = document.querySelector('#__f .title'); t.querySelector('h1').textContent = h; t.querySelector('p').textContent = p || ''; t.classList.add('on'); },
    untitle() { document.querySelector('#__f .title')?.classList.remove('on'); },
    ptr(x, y, down) { mount(); const p = document.querySelector('#__f .ptr'); p.style.left = x + 'px'; p.style.top = y + 'px'; p.classList.toggle('down', !!down); },
  };
  if (document.readyState !== 'loading') mount(); else document.addEventListener('DOMContentLoaded', mount);
})();`;

async function film(id, name, { phone = false, seed = null }, script) {
  if (ONLY.length && !ONLY.includes(id)) return;
  const raw = path.join(OUT, `${id}-raw`);
  if (existsSync(raw)) rmSync(raw, { recursive: true });
  mkdirSync(raw, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone
    ? { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true }
    : { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate((s) => { localStorage.clear(); if (s) localStorage.setItem('tq.world.v3', s); localStorage.setItem('tq.theme', 'dark'); }, seed);
  await page.addInitScript(OVERLAY);
  await page.reload();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const f = path.join(raw, `f${String(frames.length).padStart(6, '0')}.jpg`);
    writeFileSync(f, Buffer.from(data, 'base64'));
    frames.push({ f, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const W = phone ? 975 : 1920, H = phone ? 1950 : 1080;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: W, maxHeight: H, everyNthFrame: 1 });

  const d = {
    page,
    wait,
    caption: async (t, hold = 0) => { await page.evaluate((x) => window.__film.caption(x), t); if (hold) await wait(hold); },
    title: async (h, p, hold = 3200) => { await page.evaluate(([a, b]) => window.__film.title(a, b), [h, p]); await wait(hold); await page.evaluate(() => window.__film.untitle()); await wait(700); },
    go: async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(900); },
    show: async (loc) => { await loc.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' })); await wait(800); },
    point: async (loc) => { await d.show(loc); const b = await loc.boundingBox(); await page.evaluate(([x, y]) => window.__film.ptr(x, y), [b.x + b.width / 2, b.y + b.height / 2]); await wait(650); return b; },
    click: async (loc) => { const b = await d.point(loc); await page.evaluate(([x, y]) => window.__film.ptr(x, y, true), [b.x + b.width / 2, b.y + b.height / 2]); await wait(120); await loc.click(); await page.evaluate(([x, y]) => window.__film.ptr(x, y, false), [b.x + b.width / 2, b.y + b.height / 2]); await wait(350); },
    type: async (loc, text, delay = 32) => { await d.click(loc); await loc.pressSequentially(text, { delay }); await wait(300); },
    btn: (name, exact = false) => page.getByRole('button', { name, exact }).first(),
    link: (name) => page.getByRole('link', { name }).first(),
  };
  await wait(500);
  try { await script(d); } catch (e) { await page.screenshot({ path: path.join(OUT, `${id}-FAILED.png`) }); await browser.close(); throw e; }
  await d.caption('');
  await wait(600);
  await cdp.send('Page.stopScreencast');
  const state = await page.evaluate(() => localStorage.getItem('tq.world.v3'));
  await browser.close();

  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const dur = i < frames.length - 1 ? Math.max(0.001, frames[i + 1].t - frames[i].t) : 1.5;
    list.push(`file '${frames[i].f}'`, `duration ${dur.toFixed(4)}`);
  }
  list.push(`file '${frames[frames.length - 1].f}'`);
  writeFileSync(path.join(raw, 'list.txt'), list.join('\n'));
  const outFile = path.join(OUT, `${id}-${name}.mp4`);
  const vf = phone ? 'scale=-2:1920:flags=lanczos,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0b0a08,fps=30,format=yuv420p' : 'scale=1920:1080:flags=lanczos,fps=30,format=yuv420p';
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(raw, 'list.txt'), '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', outFile]);
  rmSync(raw, { recursive: true });
  const secs = frames.length ? frames[frames.length - 1].t - frames[0].t : 0;
  console.log(`${id} → ${outFile} · ${frames.length} frames · ${secs.toFixed(1)}s · page errors: ${errors.length}`);
  return state;
}

// ---------- seed states, produced through the UI in a hidden browser ----------
async function prep(steps) {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.reload();
  const go = async (h) => { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(400); };
  const click = (n) => p.getByRole('button', { name: n }).first().click();
  for (const s of steps) {
    if (s === 'setup') { await go('/r/setup'); await click('Continue'); await click('Read this handbook'); await p.waitForTimeout(1700); await click('Approve rule'); await click('Continue'); await click('Finish setup'); }
    if (s === 'shortlist') { await go('/r/compare'); await click('Load the example shortlist'); }
    if (s === 'outreach') { await go('/r/compare'); await click('Draft outreach'); await p.waitForTimeout(500); await click('Approve and send'); await p.waitForTimeout(6300); }
    if (s === 'calendar') { await go('/r/calendar'); await click('Connect Google Calendar'); await click('Allow busy times'); }
  }
  const st = await p.evaluate(() => localStorage.getItem('tq.world.v3'));
  await b.close();
  return st;
}

const S_setup = await prep(['setup']);
const S_out = await prep(['setup', 'shortlist', 'outreach']);
const S_mem = await prep(['setup', 'shortlist', 'outreach', 'calendar']);
const S_short = await prep(['setup', 'shortlist']);

// F1 · Recruiter discovers and compares talent
await film('F1', 'recruiter-discovers-and-compares', { seed: S_setup }, async (d) => {
  await d.go('/r/home');
  await d.title('Hire by talking', 'Film 1 · Recruiter discovers and compares talent');
  await d.caption('Ada runs hiring at Kora Pay. She tells Q who she needs, in her own words.', 1800);
  await d.type(d.page.getByLabel('Message Q'), 'I need a senior backend engineer for payments');
  await d.click(d.btn('Send', true));
  await d.page.waitForURL(/r\/mandate/);
  await d.caption('Q drafts the mandate on the right as she talks, and asks only what it can’t work out.');
  await d.btn('Hybrid, Lagos').waitFor({ timeout: 15000 }); await d.wait(1600);
  await d.click(d.btn('Hybrid, Lagos'));
  await d.btn('Payments reconciliation').waitFor({ timeout: 15000 }); await d.wait(1200);
  await d.click(d.btn('Payments reconciliation'));
  await d.caption('It cites the company rule it applied. Nothing starts until Ada approves this exact version.');
  await d.btn('Approve and start searching').waitFor({ timeout: 15000 }); await d.wait(2600);
  await d.click(d.btn('Approve and start searching'));
  await d.page.waitForURL(/r\/sourcing/);
  await d.caption('Q searches permitted sources. Every number on screen comes from a finished step.', 2600);
  await d.caption('One source is rate-limited. Q says so, and carries on with the other two.', 2400);
  await d.caption('If the connection drops, nothing is lost.');
  await d.click(d.btn('Simulate going offline')); await d.wait(2200);
  await d.caption('Back online, Q replays only what was missed since the last step Ada saw.');
  await d.click(d.page.getByRole('button', { name: 'Reconnect' }).first()); await d.wait(2600);
  await d.btn('Compare the').waitFor({ timeout: 30000 });
  await d.caption('Three people fit. They appeared as soon as Q found them; Ada didn’t have to wait.', 2600);
  await d.click(d.btn('Compare the'));
  await d.page.waitForURL(/r\/compare/);
  await d.caption('No single score. Each requirement shows its own evidence state.', 3200);
  await d.click(d.page.getByRole('button', { name: /Tobi Adeyemi, Payments systems/ }));
  await d.caption('Every claim opens the evidence behind it, including what it doesn’t prove.', 3800);
  await d.page.keyboard.press('Escape'); await d.wait(500);
  await d.point(d.page.getByRole('button', { name: /Tobi Adeyemi, On-call leadership/ }));
  await d.caption('Missing evidence becomes a question for the interview, not a rejection.', 3200);
  await d.title('From a sentence to an evidence-backed shortlist.', 'Talent Q', 3000);
});

// F3 · Scheduling
await film('F3', 'scheduling', { seed: S_out }, async (d) => {
  await d.go('/r/calendar');
  await d.title('Times that work, without exposing anyone’s calendar', 'Film 3 · Scheduling and correspondence');
  await d.caption('To find interview times, Q needs Ada’s busy times. It asks for exactly that.');
  await d.click(d.btn('Connect Google Calendar')); await d.wait(2200);
  await d.caption('Creating events is a separate permission, asked for only when a time is chosen.', 2600);
  await d.click(d.btn('Allow busy times'));
  await d.point(d.page.getByText('When you take interviews'));
  await d.caption('Q remembers Ada’s hours from something she said on 20 October, and shows where it came from.', 3400);
  await d.click(d.btn('Find times with Tobi'));
  await d.caption('It reads busy times for Ada on Google and Seyi on Outlook. No titles, no attendees.');
  await d.btn('Send these times to Tobi').waitFor({ timeout: 20000 }); await d.wait(1500);
  await d.click(d.page.locator('details summary').filter({ hasText: 'Why this time' }).first());
  await d.caption('Each time comes with its reasons, not a black box.', 3000);
  await d.caption('For this demo, one offered time will become busy before it’s booked.');
  await d.click(d.page.getByRole('switch', { name: /make the first offered time busy/ })); await d.wait(800);
  await d.caption('Ada approves before anything reaches Tobi.');
  await d.click(d.btn('Send these times to Tobi')); await d.wait(1600);
  await d.click(d.link('candidate')); await d.wait(600);
  await d.click(d.link('Interviews'));
  await d.caption('Tobi sees the times in his own zone. He can choose one, suggest another, or ask for a text interview.', 3200);
  await d.click(d.page.locator('label.choice').first());
  await d.click(d.btn('Choose this time'));
  await d.caption('Choosing isn’t booking. Q rechecks everyone’s calendar first.');
  await d.page.getByText('That time was just taken').waitFor({ timeout: 10000 });
  await d.caption('That time became busy. It was never booked, and Tobi is told plainly.', 3400);
  await d.click(d.page.locator('label.choice').first());
  await d.click(d.btn('Choose this time'));
  await d.caption('Recheck, write to the calendars, and wait for them to confirm.');
  await d.page.getByText('You’re booked.').waitFor({ timeout: 15000 }); await d.wait(600);
  await d.caption('Only after the calendar confirms does anyone see “booked”. This receipt is simulated.', 3400);
  await d.click(d.link('hiring')); await d.wait(500);
  await d.click(d.link('Calendar'));
  await d.point(d.page.getByText(/Booked:/));
  await d.caption('Ada sees the same record: the confirmed time, the receipt, and every step that led to it.');
  await d.click(d.page.locator('summary').filter({ hasText: 'Scheduling record' })); await d.wait(3600);
  await d.title('Proposed, rechecked, confirmed. Never assumed.', 'Talent Q', 3000);
});

// F4 · J7 Career Intelligence (phone)
await film('F4', 'j7-career-intelligence', { phone: true }, async (d) => {
  await d.go('/c/career');
  await d.title('Career Q', 'Film 4 · J7 Career Intelligence');
  await d.caption('Amaka just graduated in economics. She wants to become a product analyst.', 3000);
  await d.point(d.page.getByText('You are here'));
  await d.caption('Q shows the route from where she is to where she wants to be.', 3000);
  await d.point(d.page.getByRole('heading', { name: 'SQL window functions' }));
  await d.caption('Gaps are explained, not scored. “Not evidenced yet” is not “can’t do it”.', 3600);
  await d.click(d.link('Start practice'));
  await d.caption('A short practice on the first gap. Private by default.', 2600);
  await d.type(d.page.getByLabel('Your answer'), 'I would sort the sessions by date.', 45);
  await d.click(d.btn('Send', true));
  await d.caption('The answer lacks the concrete step, so Q asks a follow-up.', 3000);
  await d.type(d.page.getByLabel('Your answer'), 'Use LAG over a partition by user_id ordered by started_at, then subtract the dates.', 28);
  await d.click(d.btn('Send', true));
  await d.point(d.page.getByRole('heading', { name: 'Feedback' }));
  await d.caption('Feedback names the criterion, what Q saw, and what to try next.', 3600);
  await d.click(d.btn('Add to my Evidence Passport'));
  await d.caption('Only Amaka decides if practice becomes evidence. Employers never see the attempt itself.', 3600);
  await d.go('/c/career');
  await d.click(d.btn('Chidi · career switcher'));
  await d.caption('A career switcher gets a different, realistic path: store lead to sales development.', 3400);
  await d.point(d.page.getByText('Six separate measures'));
  await d.caption('Six separate measures, each with its basis. There is no overall talent score.', 3800);
  await d.point(d.btn('Download my plan'));
  await d.caption('On a slow connection, the plan travels as a 2 KB text file.', 3000);
  await d.title('Understand the gap. Practise. Show it, if you choose.', 'Talent Q', 3000);
});

// F5 · Adaptive interview
await film('F5', 'adaptive-interview', {}, async (d) => {
  await d.go('/c/interview');
  await d.title('Interview in your own way', 'Film 5 · Adaptive interview');
  await d.caption('Q interviews Tobi for Kora Pay. A person reviews the answers; Q does not decide.', 3200);
  await d.type(d.page.getByLabel('Your answer'), 'It compares the records and flags differences.');
  await d.click(d.btn('Send', true));
  await d.caption('The answer is vague, so Q asks for the concrete step.', 3000);
  await d.caption('Tobi switches to a form. He keeps his place.');
  await d.click(d.btn('Form', true));
  await d.type(d.page.getByLabel('The situation'), 'Settlement files arrive overnight from three processors.', 22);
  await d.type(d.page.getByLabel('What you did, step by step'), 'First the job compares each settlement to the ledger, then mismatches are queued and on-call is paged within a minute.', 18);
  await d.type(d.page.getByLabel('The result'), 'Mismatches found in minutes instead of days.', 22);
  await d.click(d.btn('Send answer'));
  await d.point(d.page.getByText('Required by Kora Pay'));
  await d.caption('Some questions are set by the employer, and say so.', 3000);
  await d.click(d.btn('Pause'));
  await d.caption('He can pause and come back on any device.', 2600);
  await d.click(d.btn('Resume'));
  await d.caption('Voice works too, with captions. It’s never the only way. Speech is simulated here.');
  await d.click(d.btn('Voice', true));
  await d.click(d.btn('Speak to Q')); await d.wait(3200);
  await d.click(d.btn('Send', true)); await d.wait(1200);
  await d.click(d.btn('Typing', true));
  await d.type(d.page.getByLabel('Your answer'), 'I declared the incident, paused payouts and opened a channel. Afterwards we added a circuit breaker and wrote a blameless post-mortem so it would not happen again.', 14);
  await d.click(d.btn('Send', true));
  await d.page.getByText('Done. Thank you, Tobi.').waitFor();
  await d.caption('Finished. Tobi will get feedback, but never the panel’s private notes.', 3600);
  await d.title('Text, form or voice. The same fair interview.', 'Talent Q', 3000);
});

// F7 · Memory correction
await film('F7', 'memory-correction', { seed: S_mem }, async (d) => {
  await d.go('/r/home');
  await d.title('Q remembers. You stay in charge.', 'Film 7 · Memory, correction and revocation');
  await d.type(d.page.getByLabel('Message Q'), 'What do you remember about my interview hours?');
  await d.click(d.btn('Send', true));
  await d.page.getByRole('link', { name: 'What Q remembers' }).nth(1).waitFor(); await d.wait(1200);
  await d.click(d.page.getByRole('link', { name: 'What Q remembers' }).nth(1));
  await d.caption('Every memory says what it is, who can see it, and where it came from.');
  await d.click(d.page.locator('summary').filter({ hasText: 'Why Q keeps this' }).first()); await d.wait(3000);
  await d.caption('Ada’s hours have changed. She corrects the memory.');
  await d.click(d.btn('Correct', true));
  const ta = d.page.getByLabel('What should Q remember instead?');
  await ta.fill(''); await d.type(ta, 'Ada takes interview calls after 11:00 Lagos time, mornings first, never in the Tuesday review.', 18);
  await d.click(d.btn('Save correction'));
  await d.caption('The old version stays in history. Q uses the new one from now on.', 3000);
  await d.point(d.page.getByText('Tobi expects about'));
  await d.caption('This salary figure came from a third-party website. Ada tells Q not to use it.');
  await d.click(d.btn('Don’t use this')); await d.wait(1500);
  await d.click(d.btn('Draft outreach to Tobi'));
  await d.caption('It’s left out of every task, and its content is no longer shown.', 3400);
  await d.click(d.link('Calendar'));
  await d.click(d.btn('Find times with Tobi'));
  await d.caption('The next time Q schedules, it uses the corrected hours: nothing before 11:00.');
  await d.btn('Send these times to Tobi').waitFor({ timeout: 20000 });
  await d.point(d.page.getByText(/They start no earlier than 11:00/));
  await d.wait(3600);
  await d.go('/c/memory');
  await d.point(d.page.getByText('What employers can’t see'));
  await d.caption('On Tobi’s side: his private practice never reaches Kora Pay’s Q.', 3600);
  await d.title('Remembered with sources. Corrected in a sentence. Revoked immediately.', 'Talent Q', 3200);
});

// F8 · Evidence portfolios
await film('F8', 'evidence-portfolios', { seed: S_short }, async (d) => {
  await d.go('/c/passport');
  await d.title('What you’ve done travels with you', 'Film 8 · Evidence portfolios');
  await d.caption('Tobi’s Evidence Passport. Each item says what it shows, and what it doesn’t.', 3400);
  await d.click(d.btn('What Kora Pay sees'));
  await d.caption('He can see exactly what an employer sees, and nothing else is visible to them.', 3200);
  await d.click(d.btn('Everything (only you)'));
  await d.caption('He shares his degree with one employer.');
  await d.click(d.page.locator('li', { hasText: 'BSc Computer Science' }).getByRole('button', { name: 'Share with Kora Pay' })); await d.wait(1800);
  await d.caption('And stops sharing a project. That takes effect immediately.');
  await d.click(d.page.locator('li', { hasText: 'Ledger reconciliation service' }).getByRole('button', { name: 'Make private' })); await d.wait(2200);
  await d.click(d.link('hiring')); await d.wait(400);
  await d.click(d.link('People'));
  await d.click(d.page.getByRole('button', { name: /Tobi Adeyemi, Payments systems/ }));
  await d.caption('On Ada’s side, the withdrawn project is gone, and Q says so instead of guessing.', 3800);
  await d.page.keyboard.press('Escape');
  await d.title('Your evidence, your call.', 'Talent Q', 3000);
});
