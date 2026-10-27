import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { readFileSync } from 'node:fs';
const { chromium } = pw;
const axe = readFileSync(process.argv[2], 'utf8');
const state = readFileSync(process.argv[3], 'utf8');
const routes = ['/', '/r/home', '/r/setup', '/r/mandate', '/r/sourcing', '/r/compare', '/r/outreach', '/r/calendar', '/r/memory', '/c/career', '/c/passport', '/c/slots', '/c/interview', '/c/interview?practice=c_sql_window', '/c/memory', '/gallery'];
const b = await chromium.launch();
let total = 0;
for (const theme of ['dark', 'light']) for (const vp of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  const p = await (await b.newContext({ viewport: vp })).newPage();
  await p.goto('http://localhost:4174/');
  await p.evaluate(([s, t]) => { localStorage.setItem('tq.world.v3', s); localStorage.setItem('tq.theme', t); }, [state, theme]);
  await p.reload();
  for (const r of routes) {
    await p.evaluate((x) => { location.hash = x; }, r); await p.waitForTimeout(450);
    await p.addScriptTag({ content: axe });
    const res = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n')[1]) })));
    if (res.length) { total += res.length; console.log(theme, vp.width, r, JSON.stringify(res)); }
  }
}
console.log('TOTAL violations', total);
await b.close();
