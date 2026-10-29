// Keyboard review: shell shortcuts, Q reachable without a mouse, and a visible focus indicator on every
// Tab stop of key pages (desktop and phone). Usage: node keyboard.mjs [base]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const BASE = process.argv[2] || 'http://localhost:4174/';
const b = await pw.chromium.launch();
let fails = 0; const step = (ok, name, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` · ${extra}` : ''}`); };
const actorAs = (page, a) => page.evaluate((a) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = a; w.actors.find((x) => x.id === a).signedUp = true; localStorage.setItem('tq.world.v4', JSON.stringify(w)); }, a);
const focusInfo = (page) => page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const s = getComputedStyle(el.closest('.ds-compose') || el); const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none'); const r = el.getBoundingClientRect(); return { tag: el.tagName, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40), visible, inView: r.width > 0 && r.height > 0 }; });

// Desktop
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
  await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  await actorAs(page, 'u_ada'); await page.goto(`${BASE}#/r/home`); await page.reload(); await page.waitForTimeout(800);
  await page.keyboard.press('Tab'); const first = await focusInfo(page);
  step(/skip/i.test(first?.label ?? ''), 'desktop: first Tab reaches “Skip to content”', first?.label);
  await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  step(await page.evaluate(() => document.activeElement?.id === 'ds-content'), 'desktop: skip link moves focus to the page');
  await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('/'); await page.waitForTimeout(200);
  step(await page.evaluate(() => document.activeElement?.id === 'q-ask'), 'desktop: “/” focuses Q');
  await page.keyboard.type('show me the pipeline'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  step(/pipeline/.test(page.url()), 'desktop: Q navigates by keyboard alone', page.url());
  await page.keyboard.press('Control+k'); await page.waitForTimeout(300);
  step(await page.locator('[role="combobox"]').count() > 0, 'desktop: Ctrl+K opens the palette');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  step(await page.locator('[role="combobox"]').count() === 0, 'desktop: Escape closes the palette');
  for (const [a, r] of [['u_ada', '/r/messages'], ['u_ada', '/r/people/p_tobi'], ['u_dele', '/r/home'], ['p_tobi', '/c/passport'], ['p_chidi', '/c/career']]) {
    await actorAs(page, a); await page.goto(`${BASE}#${r}`); await page.reload(); await page.waitForTimeout(800);
    let bad = [], n = 0;
    for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); const f = await focusInfo(page); if (!f) continue; n++; if (!f.visible) bad.push(`${f.tag} “${f.label}”`); }
    step(bad.length === 0, `desktop ${r}: every Tab stop shows focus (${n} stops)`, bad.slice(0, 4).join('; '));
  }
  await ctx.close();
}
// Phone
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage();
  await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  await actorAs(page, 'p_grace'); await page.goto(`${BASE}#/c/home`); await page.reload(); await page.waitForTimeout(800);
  let found = false;
  for (let i = 0; i < 30 && !found; i++) { await page.keyboard.press('Tab'); const f = await focusInfo(page); if (f && /ask q|q/i.test(f.label) && (await page.evaluate(() => !!document.activeElement?.closest('.ds-askbar')))) found = true; }
  step(found, 'phone: the “Ask Q” bar is reachable with Tab');
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  step(await page.evaluate(() => !!document.querySelector('.ds-qsheet')), 'phone: Enter opens the Q sheet');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  step(await page.evaluate(() => !document.querySelector('.ds-qsheet')), 'phone: Escape closes the Q sheet');
  step(await page.evaluate(() => !!document.activeElement?.closest('.ds-askbar')), 'phone: focus returns to “Ask Q” after closing');
  await ctx.close();
}
await b.close();
console.log(fails ? `${fails} keyboard check(s) failed` : 'All keyboard checks passed');
