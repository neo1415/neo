// Renders Direction D's three experiences through their full interaction paths, desktop and phone.
// Usage: node direction-d.mjs <outDir> [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const { chromium } = pw;
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const ONLY = (process.argv[3] || 'd,m').split(',');
const BASE = 'http://localhost:4174/';
const b = await chromium.launch();
const errors = [];
const VIEWS = [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([v]) => ONLY.includes(v));

for (const [v, vp, dpr] of VIEWS) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${v}: ${m.text()}`); });
  // Phone: the canvas is a fixed sheet, so long views are captured as a second, scrolled frame.
  const shot = async (n, full = false) => {
    await page.waitForTimeout(450);
    if (v === 'm') {
      await page.screenshot({ path: `${OUT}/d-${v}-${n}.png` });
      if (full && await page.locator('.dd-canvas.as-sheet').count()) { await page.locator('.dd-canvas.as-sheet').evaluate((el) => el.scrollBy(0, 640)); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/d-${v}-${n}-b.png` }); await page.locator('.dd-canvas.as-sheet').evaluate((el) => el.scrollTo(0, 0)); }
    } else await page.screenshot({ path: `${OUT}/d-${v}-${n}.png`, fullPage: full });
    console.log('shot', n);
  };
  const overflow = async (x) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errors.push(`${v}/${x}: horizontal overflow ${o}px`); };
  const chip = (re) => page.locator('.dd-chip').filter({ hasText: re }).last();
  const back = async () => { const bq = page.getByRole('button', { name: 'Back to the conversation with Q' }); if (await bq.count()) await bq.click(); };
  const go = async (x) => { await page.goto(`${BASE}#/x/d/${x}`); await page.waitForTimeout(900); };

  await go('home'); await overflow('home'); await shot('home-1-today');
  await chip(/Find backend engineers/).click(); await page.waitForTimeout(1500); await shot('home-2-sieve-building');
  await page.waitForTimeout(4200); await overflow('pool'); await shot('home-3-pool', true);
  await back();
  await chip(/Examine their technical evidence/).click(); await page.waitForTimeout(1700); await shot('home-4-evidence-checking');
  await page.waitForTimeout(3600); await shot('home-5-evidence', v === 'm');
  await back();
  await chip(/Compare the three/).click(); await page.waitForTimeout(4000); await overflow('ledger'); await shot('home-6-ledger');
  await back();
  await chip(/Arrange interviews/).click(); await page.waitForTimeout(5800); await overflow('plan'); await shot('home-7-plan', v === 'm');
  await back();
  await chip(/Approve all three/).click(); await page.waitForTimeout(1200); await shot('home-8-sent');

  await go('compare'); await overflow('compare'); await shot('compare-1-ledger');
  if (v === 'm') { await page.locator('[data-preview="2"]').last().click(); await page.waitForTimeout(600); await shot('compare-1b-ledger-sheet', true); await back(); }
  await chip(/Add the other three/).click(); await page.waitForTimeout(800);
  if (v === 'm') { await page.waitForTimeout(200); }
  await shot('compare-2-six', true);
  await page.getByRole('button', { name: /Zara, Payments systems/ }).click().catch((e) => errors.push(`${v}: cell ${e.message.split('\n')[0]}`)); await shot('compare-3-cell');
  await page.getByRole('button', { name: 'Map', exact: true }).click(); await page.waitForTimeout(900); await overflow('map'); await shot('compare-4-map');
  await page.getByRole('button', { name: /^Tobi Adeyemi:|^Tobi:/ }).first().click().catch(() => {}); await page.waitForTimeout(500); await shot('compare-5-map-focus');
  await page.getByRole('button', { name: 'Pair', exact: true }).click(); await page.waitForTimeout(700); await overflow('pair'); await shot('compare-6-pair', v === 'm');

  await go('career'); await overflow('career'); await shot('career-1-atlas', true);
  await chip(/Show 48 occupations/).click(); await page.waitForTimeout(800); await shot('career-2-48');
  await page.getByRole('button', { name: /^Data: / }).click(); await page.waitForTimeout(700); await shot('career-3-family-open');
  await back(); await chip(/Back to 14/).click(); await page.waitForTimeout(600); await back();
  await chip(/Open Product Analyst/).click(); await page.waitForTimeout(800); await shot('career-4-role', v === 'm');
  await back(); await chip(/Review my evidence/).click(); await page.waitForTimeout(800); await shot('career-5-evidence');
  await back(); await chip(/Practise SQL/).click(); await page.waitForTimeout(700);
  await page.getByRole('button', { name: /LAG\(started_at\)/ }).click(); await page.waitForTimeout(700); await shot('career-6-practised', true);
  await back(); await chip(/Submit a work sample/).click(); await page.waitForTimeout(2200); await shot('career-7-review');
  await page.waitForTimeout(2600); await shot('career-8-moved', true);
  await back(); await chip(/Show my record/).click(); await page.waitForTimeout(800); await shot('career-9-record', true);
  await ctx.close();
}
console.log('ERRORS', JSON.stringify(errors, null, 1));
await b.close();
