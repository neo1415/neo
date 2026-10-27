// Motion previews of the three design directions, recorded from the running prototype.
// Captions are typeset with libass in a band BELOW the interface, so they never cover UI (founder feedback).
// The pointer is the only overlay on the UI itself. Usage: node direction-films.mjs <outDir> [a-d,a-m,...]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const { chromium } = pw;
const OUT = path.resolve(process.argv[2] || 'previews');
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
const BASE = 'http://localhost:4174/';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const POINTER = `(() => { const m = () => { if (document.getElementById('__p')) return; const p = document.createElement('div'); p.id='__p';
  p.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid #d9a93f;background:rgba(217,169,63,.25);left:50%;top:70%;transition:left .55s cubic-bezier(.2,.7,.2,1),top .55s cubic-bezier(.2,.7,.2,1),transform .15s';
  document.body.appendChild(p); }; window.__ptr=(x,y,d)=>{ m(); const p=document.getElementById('__p'); p.style.left=x+'px'; p.style.top=y+'px'; p.style.transform=d?'scale(.7)':'scale(1)'; };
  if (document.readyState!=='loading') m(); else document.addEventListener('DOMContentLoaded', m); })();`;

const ass = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = (t % 60).toFixed(2).padStart(5, '0'); return `${h}:${String(m).padStart(2, '0')}:${s}`; };

async function film(id, title, { phone = false }, script) {
  if (ONLY.length && !ONLY.includes(id)) return;
  const raw = path.join(OUT, `${id}-raw`);
  if (existsSync(raw)) rmSync(raw, { recursive: true });
  mkdirSync(raw, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 760 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true } : { viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1.2 });
  const page = await ctx.newPage();
  await page.addInitScript(POINTER);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '#/x');
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const f = path.join(raw, `f${String(frames.length).padStart(6, '0')}.jpg`);
    writeFileSync(f, Buffer.from(data, 'base64'));
    frames.push({ f, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: phone ? 975 : 1920, maxHeight: phone ? 1900 : 960 });
  const t0 = Date.now() / 1000;
  const caps = [];
  let open = null;
  const d = {
    page, wait,
    cap: (text, hold = 0) => { const now = Date.now() / 1000 - t0; if (open) { open.end = now; caps.push(open); } open = text ? { text, start: now } : null; return hold ? wait(hold) : Promise.resolve(); },
    go: async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await wait(1000); },
    point: async (loc) => { await loc.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' })); await wait(700); const b = await loc.boundingBox(); await page.evaluate(([x, y]) => window.__ptr(x, y), [b.x + b.width / 2, b.y + b.height / 2]); await wait(600); return b; },
    click: async (loc) => { const b = await d.point(loc); await page.evaluate(([x, y]) => window.__ptr(x, y, true), [b.x + b.width / 2, b.y + b.height / 2]); await wait(130); await loc.click(); await page.evaluate(([x, y]) => window.__ptr(x, y, false), [b.x + b.width / 2, b.y + b.height / 2]); await wait(350); },
    scroll: async (y) => { await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'smooth' }), y); await wait(900); },
    btn: (n) => page.getByRole('button', { name: n }).first(),
  };
  await wait(400);
  await script(d);
  d.cap(null);
  await wait(500);
  await cdp.send('Page.stopScreencast');
  await browser.close();

  // Encode: UI on top, caption band below. Title card is the first caption, shown in the band too.
  const first = frames[0].t;
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const dur = i < frames.length - 1 ? Math.max(0.001, frames[i + 1].t - frames[i].t) : 1;
    list.push(`file '${frames[i].f}'`, `duration ${dur.toFixed(4)}`);
  }
  list.push(`file '${frames[frames.length - 1].f}'`);
  writeFileSync(path.join(raw, 'list.txt'), list.join('\n'));
  const off = first - t0; // screencast starts slightly after t0
  const [W, H, UIH, BAND, FS] = phone ? [1080, 1920, 1660, 260, 44] : [1920, 1080, 960, 120, 34];
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Cap,Inter,${FS},&H00E6ECEC,&H00E6ECEC,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,60,60,${Math.round(BAND / 2 - FS / 2)},1\nStyle: Tag,Inter,${Math.round(FS * 0.55)},&H006BB5D9,&H006BB5D9,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,0,0,7,40,40,${UIH + 14},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const total = frames[frames.length - 1].t - first + 1;
  const events = [`Dialogue: 0,${ass(0)},${ass(total)},Tag,,0,0,0,,${title.toUpperCase()} · TALENT Q PROTOTYPE · SIMULATED DATA`]
    .concat(caps.map((c) => `Dialogue: 0,${ass(Math.max(0, c.start - off))},${ass(Math.max(0.1, c.end - off))},Cap,,0,0,0,,${c.text.replace(/\n/g, '\\N')}`));
  writeFileSync(path.join(raw, 'caps.ass'), header + events.join('\n') + '\n');
  const outFile = path.join(OUT, `${id}.mp4`);
  const vf = `scale=${phone ? '-2:' + UIH : W + ':' + UIH}:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:0:color=0x111111,fps=30,ass=${path.join(raw, 'caps.ass')},format=yuv420p`;
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(raw, 'list.txt'), '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', outFile]);
  rmSync(raw, { recursive: true });
  console.log(`${id} → ${outFile} · ${(total).toFixed(1)}s · page errors: ${errors.length}`);
}

const NAMES = { a: 'Direction A · Atelier', b: 'Direction B · Constellation', c: 'Direction C · Studio' };
for (const dir of ['a', 'b', 'c']) {
  // Desktop: all three experiences in one take.
  await film(`${dir}-desktop`, NAMES[dir], {}, async (d) => {
    await d.go(`/x/${dir}/home`);
    await d.cap('Q home. Ada asks one question in her own words.', 1600);
    await d.click(d.btn(/Who should I talk to first/));
    await d.cap('Q works in view: each agent’s progress is a real count, not a spinner.', 3600);
    await d.cap('The answer arrives with an artifact Q made for this question.', 3800);
    const people = d.page.getByRole('button', { name: /Ifeoma|Focus Ifeoma|IO/ }).first();
    if (await people.count()) { await d.click(people); await d.cap('The artifact is interactive: focus a person to read their evidence.', 2600); }
    await d.go(`/x/${dir}/compare`);
    await d.cap('Recruiter discovery: three people, five requirements, every claim sourced.', 2800);
    const cell = dir === 'a' ? d.page.getByRole('button', { name: /Kunle Bakare, Payments systems/ }) : dir === 'b' ? d.page.getByRole('button', { name: /Compare everyone on Go in production/ }) : d.page.getByRole('button', { name: 'Face-off', exact: true });
    if (await cell.count()) { await d.click(cell.first()); await d.cap(dir === 'c' ? 'Face-off: two people, requirement by requirement, with who’s ahead.' : 'Every mark opens the evidence behind it, and what it doesn’t prove.', 3600); }
    await d.go(`/x/${dir}/career`);
    await d.cap('J7 for Amaka, a graduate: her route, what the role is made of, and her gaps.', 3200);
    await d.scroll(dir === 'c' ? 700 : 1000);
    const opt = d.btn(/LAG\(started_at\)/);
    await d.cap('A two-minute practice. Private by default.');
    await d.click(opt);
    await d.cap('Feedback names the level and what to try next.', 2400);
    const add = d.btn(/Add to my Evidence Passport/);
    if (await add.count()) { await d.click(add); await d.cap('She chooses to add it: coverage moves from 6 to 7 of 9. Six measures stay separate.', 3800); }
  });
  // Phone: the same story, condensed.
  await film(`${dir}-phone`, NAMES[dir], { phone: true }, async (d) => {
    await d.go(`/x/${dir}/home`);
    await d.cap('The same direction on a phone.', 1400);
    await d.click(d.btn(/Who should I talk to first/));
    await d.cap('Q at work, then its answer and artifact.', 6000);
    await d.scroll(900);
    await d.wait(1600);
    await d.go(`/x/${dir}/compare`);
    await d.cap('Evidence comparison, adapted to one hand.', 3000);
    await d.scroll(700); await d.wait(1200);
    await d.go(`/x/${dir}/career`);
    await d.cap('J7: route, gaps and practice.', 2600);
    await d.scroll(1400); await d.wait(1600);
  });
}
