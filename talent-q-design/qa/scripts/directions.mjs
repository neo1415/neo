// Renders the design directions: each experience at desktop and phone width, in key states.
// Usage: node directions.mjs <outDir> [a,b,c]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const { chromium } = pw;
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const DIRS = (process.argv[3] || 'a,b,c').split(',');
const BASE = 'http://localhost:4174/';
const b = await chromium.launch();
const errors = [];
const VIEWS = [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]];

async function shoot(page, name) { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); console.log('shot', name); }

for (const d of DIRS) for (const [v, vp, dpr] of VIEWS) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${d}/${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${d}/${v}: ${m.text()}`); });
  const go = async (x) => { await page.goto(`${BASE}#/x/${d}/${x}`); await page.waitForTimeout(900); };
  const overflow = async (x) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errors.push(`${d}/${v}/${x}: horizontal overflow ${o}px`); };
  // 1 Q home: idle, working, done
  await go('home'); await overflow('home'); await shoot(page, `${d}-${v}-home-1-idle`);
  await page.getByRole('button', { name: /Who should I talk to first/ }).first().click();
  await page.waitForTimeout(2200); await shoot(page, `${d}-${v}-home-2-working`);
  await page.waitForTimeout(6500); await overflow('home-done'); await shoot(page, `${d}-${v}-home-3-artifact`);
  // 2 Compare
  await go('compare'); await overflow('compare'); await shoot(page, `${d}-${v}-compare-1`);
  const cell = page.getByRole('button', { name: /Kunle Bakare|Ifeoma Obi/ }).filter({ hasText: /.+/ }).first();
  if (await cell.count()) { await cell.click().catch(() => {}); await shoot(page, `${d}-${v}-compare-2-evidence`); }
  const off = page.getByRole('button', { name: 'Face-off', exact: true });
  if (await off.count()) { await off.click(); await page.waitForTimeout(900); await shoot(page, `${d}-${v}-compare-2-faceoff`); }
  // 3 Career
  await go('career'); await overflow('career'); await shoot(page, `${d}-${v}-career-1`);
  const opt = page.getByRole('button', { name: /LAG\(started_at\)/ }).first();
  if (await opt.count()) { await opt.scrollIntoViewIfNeeded(); await opt.click(); await page.waitForTimeout(600); const add = page.getByRole('button', { name: /Add to my Evidence Passport|Add to passport/ }).first(); if (await add.count()) await add.click(); await shoot(page, `${d}-${v}-career-2-coached`); }
  await ctx.close();
}
console.log('ERRORS', JSON.stringify(errors, null, 1));
await b.close();
