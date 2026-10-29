// axe-core WCAG 2.2 AA scan of batch 1 (Direction D shell, onboarding, planner, J7, original screens in the shell).
// Usage: node axe-batch1.mjs <path to axe.min.js>
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { readFileSync } from 'node:fs';
const axe = readFileSync(process.argv[2], 'utf8');
const b = await pw.chromium.launch();
let total = 0, scans = 0;
const chip = (p, re) => p.locator('.ds-chip').filter({ hasText: re }).last();
const back = async (p) => { const x = p.getByRole('button', { name: 'Back to the conversation with Q' }); if (await x.count()) await x.click(); };
const S = {
  '/c/welcome': [async () => {}, async (p) => { await chip(p, /just finished/).click(); await chip(p, /phone photo/).click(); await p.waitForTimeout(1500); },
    async (p) => { await chip(p, /just finished/).click(); await chip(p, /Upload Amaka/).click(); await p.waitForTimeout(3800); await back(p); await chip(p, /Sheets only/).click(); await chip(p, /product analyst/).click(); await chip(p, /Check the basics/).click(); await p.waitForTimeout(400); }],
  '/r/plan': [async () => {}, async (p) => { await chip(p, /Fill Senior/).click(); await p.waitForTimeout(1300); await chip(p, /Lagos/).click(); await p.waitForTimeout(400); },
    async (p) => { await chip(p, /Fill Senior/).click(); await p.waitForTimeout(1300); await chip(p, /Lagos/).click(); await back(p); await chip(p, /Start the plan/).click(); await p.waitForTimeout(4200); }],
  '/c/career': [async () => {}, async (p) => { await chip(p, /Open Product Analyst/).click(); await p.waitForTimeout(500); }, async (p) => { await p.getByRole('button', { name: 'Plan', exact: true }).click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400); }],
  '/r/home': [async () => {}], '/r/mandate': [async () => {}], '/r/compare': [async () => {}], '/r/outreach': [async () => {}], '/r/calendar': [async () => {}], '/r/memory': [async () => {}], '/r/setup': [async () => {}],
  '/c/passport': [async () => {}], '/c/interview': [async () => {}], '/c/growth': [async () => {}], '/c/slots': [async () => {}], '/c/memory': [async () => {}],
};
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) for (const [route, states] of Object.entries(S)) for (const [i, run] of states.entries()) {
  const p = await (await b.newContext({ viewport: vp })).newPage();
  await p.goto(`http://localhost:4174/#${route}`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
  try { await run(p); } catch (e) { console.log('state failed', vp.width, route, i, String(e).split('\n')[0]); }
  await p.addScriptTag({ content: axe });
  const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => ({ id: v.id, n: v.nodes.length, t: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join('')) })));
  scans++;
  if (r.length) { total += r.length; console.log(vp.width, route, i, JSON.stringify(r, null, 1)); }
  await p.context().close();
}
console.log('SCANS', scans, 'VIOLATIONS', total);
await b.close();
