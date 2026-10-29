// Shared film harness: records the running prototype via CDP screencast and typesets captions with libass
// in a band BELOW the interface (captions never cover UI). Used by journey-films.mjs.
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const { chromium } = pw;
const BASE = 'http://localhost:4174/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export function makeFilm(OUT, ONLY) {
  mkdirSync(OUT, { recursive: true });
const POINTER = `(() => { const m = () => { if (document.getElementById('__p')) return; const p = document.createElement('div'); p.id='__p';
  p.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid #d9a93f;background:rgba(217,169,63,.25);left:50%;top:70%;transition:left .55s cubic-bezier(.2,.7,.2,1),top .55s cubic-bezier(.2,.7,.2,1),transform .15s';
  document.body.appendChild(p); }; window.__ptr=(x,y,d)=>{ m(); const p=document.getElementById('__p'); p.style.left=x+'px'; p.style.top=y+'px'; p.style.transform=d?'scale(.7)':'scale(1)'; };
  if (document.readyState!=='loading') m(); else document.addEventListener('DOMContentLoaded', m); })();`;

const ass = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = (t % 60).toFixed(2).padStart(5, '0'); return `${h}:${String(m).padStart(2, '0')}:${s}`; };

return async function film(id, title, opts, script) {
  const phone = !!opts.phone;
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
  await page.goto(BASE + (opts.start || '#/x'));
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

}
