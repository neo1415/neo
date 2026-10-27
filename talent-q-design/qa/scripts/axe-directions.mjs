// axe-core WCAG 2.2 AA scan of the direction prototypes, idle and after interaction, desktop and phone.
// Usage: node axe-directions.mjs <path to axe.min.js>
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { readFileSync } from 'node:fs';
const axe = readFileSync(process.argv[2], 'utf8');
const b = await pw.chromium.launch();
let total = 0;
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) for (const d of ['a', 'b', 'c']) for (const x of ['home', 'compare', 'career']) {
  const p = await (await b.newContext({ viewport: vp })).newPage();
  await p.goto(`http://localhost:4174/#/x/${d}/${x}`); await p.waitForTimeout(800);
  if (x === 'home') { await p.getByRole('button', { name: /Who should I talk to first/ }).first().click(); await p.waitForTimeout(8500); }
  if (x === 'career') { const o = p.getByRole('button', { name: /LAG\(started_at\)/ }).first(); await o.click(); await p.waitForTimeout(500); }
  await p.addScriptTag({ content: axe });
  const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => ({ id: v.id, n: v.nodes.length, t: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join('')) })));
  if (r.length) { total += r.length; console.log(vp.width, d, x, JSON.stringify(r, null, 1)); }
  await p.context().close();
}
console.log('TOTAL', total);
await b.close();
