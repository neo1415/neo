// Batch 1 captures: Direction D shell, onboarding, multi-agent planner, J7, and the original screens in the
// D shell. Desktop 1440×900 and phone 390×844. Usage: node batch1.mjs <outDir> [d,m]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const ONLY = (process.argv[3] || 'd,m').split(',');
const BASE = 'http://localhost:4174/';
const b = await pw.chromium.launch();
const errors = [];
for (const [v, vp, dpr] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]].filter(([x]) => ONLY.includes(x))) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${v}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${v}: ${m.text()}`); });
  const shot = async (n) => { await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/b1-${v}-${n}.png` }); console.log('shot', v, n); };
  const chip = (re) => page.locator('.ds-chip').filter({ hasText: re }).last();
  const back = async () => { const x = page.getByRole('button', { name: 'Back to the conversation with Q' }); if (await x.count()) await x.click(); await page.waitForTimeout(250); };
  const overflow = async (x) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errors.push(`${v}/${x}: horizontal overflow ${o}px`); };
  const go = async (r, clear = false) => { await page.goto(`${BASE}#${r}`); if (clear) { await page.evaluate(() => localStorage.clear()); await page.reload(); } await page.waitForTimeout(900); await overflow(r); };

  // Onboarding
  await go('/c/welcome', true); await shot('onb-1-welcome');
  await chip(/just finished studying/).click(); await chip(/phone photo/).click(); await page.waitForTimeout(1600); await shot('onb-2-unreadable');
  await back(); await chip(/Upload Amaka_Eze_CV\.pdf instead/).click(); await page.waitForTimeout(900); await shot('onb-3-reading');
  await page.waitForTimeout(2800); await shot('onb-4-found'); await back();
  await chip(/Sheets and some SQL/).click(); await chip(/A product analyst role/).click(); await chip(/Check the basics/).click(); await page.waitForTimeout(400); await shot('onb-5-about');
  await page.getByRole('button', { name: 'Save and continue' }).click(); await page.waitForTimeout(400); await shot('onb-6-experience');
  await page.getByRole('button', { name: /^Edit: Improved reporting/ }).click(); await shot('onb-7-edit');
  await page.getByRole('button', { name: /^Save$/ }).click(); await page.locator('.ds-canvas').getByRole('button', { name: 'Continue to skills' }).click(); await page.waitForTimeout(400); await shot('onb-8-skills');
  await page.locator('.ds-canvas').getByRole('button', { name: 'Finish' }).click(); await page.waitForTimeout(400); await shot('onb-9-done');

  // Planner
  await go('/r/plan', true); await shot('plan-1-plans');
  await chip(/Fill Senior Backend/).click(); await page.waitForTimeout(1300); await shot('plan-2-clarify');
  await chip(/Lagos and remote only/).click(); await page.waitForTimeout(400); await shot('plan-3-graph');
  if (v === 'm') await back();
  await chip(/Start the plan/).click(); await page.waitForTimeout(2200); await shot('plan-4-lanes');
  await page.waitForTimeout(1800); if (v === 'm') await back(); await shot('plan-5-ask');
  await chip(/Skip LinkedIn/).click(); await page.waitForTimeout(9500); await shot('plan-6-findings');
  await page.waitForTimeout(4000); if (v === 'm') await back(); await chip(/Review \d+ approvals/).click(); await page.waitForTimeout(500); await shot('plan-7-approvals');
  await page.getByRole('button', { name: 'Approve', exact: true }).first().click(); await page.waitForTimeout(400); await shot('plan-8-approved');

  // J7
  await go('/c/career', true); if (v === 'm') { await page.locator('.ds-chip').first().waitFor(); } await shot('j7-1-atlas');
  await chip(/Open Product Analyst/).click(); await page.waitForTimeout(500); await shot('j7-2-role');
  await back(); await chip(/Show my development plan/).click(); await page.waitForTimeout(500); await shot('j7-3-plan');
  await back(); await page.reload(); await page.waitForTimeout(900);
  await chip(/Open Product Analyst/).click(); await back(); await chip(/Practise sql/i).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: /LAG\(started_at\)/ }).click(); await page.waitForTimeout(400); await shot('j7-4-practised');
  await back(); await chip(/Submit a work sample/).click(); await page.waitForTimeout(2000); await shot('j7-5-review');
  await page.waitForTimeout(2400); await shot('j7-6-moved');
  await page.getByRole('button', { name: 'Progress', exact: true }).click(); await page.waitForTimeout(500); await shot('j7-7-progress');
  await page.getByRole('button', { name: 'Record', exact: true }).click(); await page.waitForTimeout(500); await shot('j7-8-record');
  await page.getByRole('button', { name: /Tobi · experienced/ }).click(); await page.waitForTimeout(700); await shot('j7-9-tobi');
  if (v === 'm') await back();
  await chip(/Open Staff Backend Engineer/).click(); await page.waitForTimeout(500); await shot('j7-10-tobi-role');

  // Original screens in the D shell
  for (const r of ['/r/home', '/r/mandate', '/r/compare', '/r/outreach', '/r/calendar', '/r/memory', '/r/setup', '/c/passport', '/c/interview', '/c/growth', '/c/slots']) { await go(r); await shot(`legacy${r.replace(/\//g, '-')}`); }
  // Navigation: command palette (desktop), More sheet (phone)
  if (v === 'd') { await page.keyboard.press('Control+k'); await page.keyboard.type('cal'); await shot('nav-palette'); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Collapse navigation' }).click(); await page.getByRole('button', { name: 'Collapse the conversation' }).click().catch(() => {}); await shot('nav-collapsed'); await page.getByRole('button', { name: 'Expand navigation' }).click(); }
  else { await page.getByRole('button', { name: 'More' }).click(); await shot('nav-more'); }
  await ctx.close();
}
console.log('ERRORS', JSON.stringify(errors, null, 1));
await b.close();
