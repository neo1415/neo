// axe-core WCAG 2.2 AA scan of Direction D in its key states, desktop and phone.
// Usage: node axe-direction-d.mjs <path to axe.min.js>
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { readFileSync } from 'node:fs';
const axe = readFileSync(process.argv[2], 'utf8');
const b = await pw.chromium.launch();
let total = 0, scans = 0;
const chip = (p, re) => p.locator('.dd-chip').filter({ hasText: re }).last();
const back = async (p) => { const x = p.getByRole('button', { name: 'Back to the conversation with Q' }); if (await x.count()) await x.click(); };
const STATES = {
  'home-today': async () => {},
  'home-pool': async (p) => { await chip(p, /Find backend/).click(); await p.waitForTimeout(5000); },
  'home-evidence': async (p) => { await chip(p, /Find backend/).click(); await p.waitForTimeout(5000); await back(p); await chip(p, /Examine/).click(); await p.waitForTimeout(5000); },
  'home-plan': async (p) => { for (const [re, t] of [[/Find backend/, 5000], [/Examine/, 5000], [/Compare the three/, 3800], [/Arrange/, 5600]]) { await back(p); await chip(p, re).click(); await p.waitForTimeout(t); } },
  'compare-ledger': async (p) => { await chip(p, /Add the other three/).click(); await p.waitForTimeout(600); await p.getByRole('button', { name: /Zara, Payments systems/ }).click(); await p.waitForTimeout(500); },
  'compare-map': async (p) => { if (await p.locator('[data-preview="2"]').count() && p.viewportSize().width < 800) { await p.locator('[data-preview="2"]').last().click(); } await p.getByRole('button', { name: 'Map', exact: true }).click(); await p.waitForTimeout(800); },
  'compare-pair': async (p) => { if (p.viewportSize().width < 800) await p.locator('[data-preview="2"]').last().click(); await p.getByRole('button', { name: 'Pair', exact: true }).click(); await p.waitForTimeout(600); },
  'career-atlas': async () => {},
  'career-48': async (p) => { await chip(p, /Show 48/).click(); await p.waitForTimeout(700); },
  'career-practice': async (p) => { await chip(p, /Open Product Analyst/).click(); await p.waitForTimeout(600); await back(p); await chip(p, /Practise SQL/).click(); await p.waitForTimeout(600); await p.getByRole('button', { name: /LAG\(started_at\)/ }).click(); await p.waitForTimeout(500); },
  'career-record': async (p) => { await chip(p, /Open Product Analyst/).click(); await p.waitForTimeout(600); await back(p); await chip(p, /Practise SQL/).click(); await p.waitForTimeout(600); await p.getByRole('button', { name: /LAG\(started_at\)/ }).click(); await p.waitForTimeout(500); await back(p); await chip(p, /Submit a work sample/).click(); await p.waitForTimeout(4600); await back(p); await chip(p, /Show my record/).click(); await p.waitForTimeout(700); },
};
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) for (const [k, run] of Object.entries(STATES)) {
  const p = await (await b.newContext({ viewport: vp })).newPage();
  await p.goto(`http://localhost:4174/#/x/d/${k.split('-')[0]}`); await p.waitForTimeout(800);
  await run(p);
  await p.addScriptTag({ content: axe });
  const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => ({ id: v.id, n: v.nodes.length, t: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join('')) })));
  scans++;
  if (r.length) { total += r.length; console.log(vp.width, k, JSON.stringify(r, null, 1)); }
  await p.context().close();
}
console.log('SCANS', scans, 'VIOLATIONS', total);
await b.close();
