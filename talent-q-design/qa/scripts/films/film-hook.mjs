// Film mode for the journey scripts. Loaded with `node --import ./film-hook.mjs <journey>.mjs …`, it wraps
// Playwright so a tested journey records itself instead of being re-scripted for film:
//   · every page is recorded through the CDP screencast (frames + timestamps);
//   · actions are paced like a person: visible typing, a pointer that travels to each click, a pause to
//     read Q's reply after each message;
//   · each verified step the script logs (`PASS …`) becomes the caption at that moment, so every caption
//     in the films is backed by a passing assertion;
//   · the script's own screenshots are skipped (the committed captures stay as they are).
// Output: <FILM_OUT>/<FILM_ID>-<desktop|phone>-<n>/ with frames, frames.json and captions.json.
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const OUT = process.env.FILM_OUT, ID = process.env.FILM_ID;
if (!OUT || !ID) throw new Error('FILM_OUT and FILM_ID are required');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PACE = { typeMax: 2600, typeDelay: 42, afterSend: 3400, beforeClick: 450, afterClick: 1000, afterGo: 1000 };

const POINTER = `(() => { const m = () => { if (!document.body || document.getElementById('__p')) return; const p = document.createElement('div'); p.id='__p';
  p.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid #d9a93f;background:rgba(217,169,63,.25);left:50%;top:70%;transition:left .4s cubic-bezier(.2,.7,.2,1),top .4s cubic-bezier(.2,.7,.2,1),transform .15s';
  document.body.appendChild(p); }; window.__ptr=(x,y,d)=>{ m(); const p=document.getElementById('__p'); if (!p) return; p.style.left=x+'px'; p.style.top=y+'px'; p.style.transform=d?'scale(.7)':'scale(1)'; };
  if (document.readyState!=='loading') m(); else document.addEventListener('DOMContentLoaded', m); })();`;

const recs = [];          // one recording per page
let current = null;       // the page most recently driven: captions attach to it
const count = { desktop: 0, phone: 0 };

async function record(page, phone) {
  const kind = phone ? 'phone' : 'desktop';
  const dir = path.join(OUT, `${ID}-${kind}-${++count[kind]}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const rec = { page, dir, kind, frames: [], caps: [], closed: false };
  recs.push(rec); current = rec;
  // A new page can still be swapping documents; retry attaching a few times before giving up on it.
  let cdp = null;
  for (let i = 0; i < 5 && !cdp; i++) {
    try {
      const c = await page.context().newCDPSession(page);
      c.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
        const f = `f${String(rec.frames.length).padStart(6, '0')}.jpg`;
        writeFileSync(path.join(dir, f), Buffer.from(data, 'base64'));
        rec.frames.push({ f, t: metadata.timestamp });
        c.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      });
      const vp = page.viewportSize() ?? { width: 1440, height: 900 };
      await c.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: phone ? vp.width * 2 : 1920, maxHeight: phone ? vp.height * 2 : 1200 });
      cdp = c;
    } catch { if (page.isClosed()) break; await wait(400); }
  }
  if (!cdp) { rec.closed = true; rmSync(dir, { recursive: true, force: true }); recs.splice(recs.indexOf(rec), 1); return; }
  const stop = async () => { if (rec.closed) return; rec.closed = true; await cdp.send('Page.stopScreencast').catch(() => {}); save(rec); };
  page.on('close', () => { void stop(); });
  rec.stop = stop;
}

function save(rec) {
  writeFileSync(path.join(rec.dir, 'frames.json'), JSON.stringify(rec.frames));
  writeFileSync(path.join(rec.dir, 'captions.json'), JSON.stringify(rec.caps));
}

// Captions: every PASS/FAIL line the journey script prints, stamped at the moment it is logged.
const log = console.log.bind(console);
console.log = (...a) => {
  const line = a.map(String).join(' ');
  const m = line.match(/^(PASS|FAIL)\b\s*(?:\[[a-z]+\]\s*)?(.*)$/);
  if (m && current) current.caps.push({ ok: m[1] === 'PASS', text: m[2].trim(), t: Date.now() / 1000 });
  log(...a);
};

let patched = false;
function patch(page) {
  if (patched) return; patched = true;
  const P = Object.getPrototypeOf(page), L = Object.getPrototypeOf(page.locator('body')), K = Object.getPrototypeOf(page.keyboard);
  const recOf = (pg) => recs.find((r) => r.page === pg);
  const pointAt = async (loc) => {
    try {
      const b = await loc.boundingBox({ timeout: 1500 }); if (!b) return null;
      const pg = loc.page(); await pg.evaluate(([x, y]) => window.__ptr?.(x, y), [b.x + b.width / 2, b.y + b.height / 2]); return { b, pg };
    } catch { return null; }
  };
  const oClick = L.click;
  L.click = async function (opts) {
    const r = recOf(this.page()); if (r) current = r;
    const at = await pointAt(this); if (at) { await wait(PACE.beforeClick); await at.pg.evaluate(([x, y]) => window.__ptr?.(x, y, true), [at.b.x + at.b.width / 2, at.b.y + at.b.height / 2]).catch(() => {}); }
    const res = await oClick.call(this, opts);
    if (at) await at.pg.evaluate(([x, y]) => window.__ptr?.(x, y, false), [at.b.x + at.b.width / 2, at.b.y + at.b.height / 2]).catch(() => {});
    await wait(PACE.afterClick); return res;
  };
  const oFill = L.fill;
  L.fill = async function (value, opts) {
    const r = recOf(this.page()); if (r) current = r;
    if (!value) return oFill.call(this, value, opts);
    let typed = false;
    try {
      const tag = await this.evaluate((el) => el.tagName, undefined, { timeout: 3000 });
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        await pointAt(this);
        await oFill.call(this, '', opts);
        await this.pressSequentially(value, { delay: Math.min(PACE.typeDelay, PACE.typeMax / value.length) });
        typed = true;
      }
    } catch { /* fall back to an instant fill */ }
    if (!typed) return oFill.call(this, value, opts);
  };
  P.fill = function (sel, value, opts) { return this.locator(sel).first().fill(value, opts); };
  P.click = function (sel, opts) { return this.locator(sel).first().click(opts); };
  const oPress = K.press;
  K.press = async function (key, opts) { const res = await oPress.call(this, key, opts); await wait(key === 'Enter' ? PACE.afterSend : 200); return res; };
  const enterPause = (key) => wait(key === 'Enter' ? PACE.afterSend : 200);
  const oLPress = L.press;
  L.press = async function (key, opts) { const res = await oLPress.call(this, key, opts); await enterPause(key); return res; };
  P.press = function (sel, key, opts) { return this.locator(sel).first().press(key, opts); };
  const oType = L.type;
  L.type = function (value, opts) { return value ? this.fill(value, opts) : oType.call(this, value, opts); };
  const oGoto = P.goto;
  P.goto = async function (url, opts) { const r = recOf(this); if (r) current = r; const res = await oGoto.call(this, url, opts); await wait(PACE.afterGo); return res; };
  P.screenshot = async function () { return Buffer.alloc(0); };
  L.screenshot = async function () { return Buffer.alloc(0); };
}

const oLaunch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (opts) => {
  const browser = await oLaunch(opts);
  const oNew = browser.newContext.bind(browser);
  browser.newContext = async (o = {}) => {
    const ctx = await oNew(o);
    const phone = (o.viewport?.width ?? 1440) < 700;
    await ctx.addInitScript(POINTER);
    ctx.on('page', (pg) => { patch(pg); void record(pg, phone); });
    return ctx;
  };
  browser.newPage = async (o = {}) => { const ctx = await browser.newContext(o); return ctx.newPage(); };
  const oClose = browser.close.bind(browser);
  browser.close = async () => { for (const r of recs) await r.stop?.(); return oClose(); };
  return browser;
};
process.on('exit', () => { for (const r of recs) if (!r.closed) { r.closed = true; save(r); } });
