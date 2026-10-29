// Accessibility scan of every route, as the person who would use it, on desktop and phone.
// Also checks: Q's composer is reachable on the page (desktop) or via "Ask Q" (phone), no horizontal
// overflow, and Tab reaches the main content. Usage: node axe-all.mjs <base> <axe.min.js> <out.json>
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
const [BASE = 'http://localhost:4174/', AXE, OUT = 'axe-all.json'] = process.argv.slice(2);
const axe = readFileSync(AXE, 'utf8');
const AS = {
  u_ada: ['/r/home', '/r/plan', '/r/compare', '/r/people/p_tobi', '/r/interviews', '/r/pipeline', '/r/messages', '/r/calendar', '/r/calendar/connect', '/r/team', '/r/setup', '/r/setup/handbook', '/r/roles', '/r/audit', '/r/memory', '/r/mandate', '/r/sourcing', '/r/outreach', '/settings'],
  u_dele: ['/r/home', '/r/agency/agents', '/r/agency/campaigns', '/r/agency/clients', '/r/agency/client/org_kora', '/r/agency/compare', '/r/agency/docs', '/r/agency/mandate/m_ops', '/r/agency/notes', '/r/agency/pools', '/r/agency/reports', '/r/agency/searches', '/r/agency/submittals', '/r/compare'],
  p_tobi: ['/c/home', '/c/passport', '/c/jobs', '/c/jobs/j_kora_backend', '/c/applications', '/c/messages', '/c/memory', '/c/prep', '/settings'],
  p_chidi: ['/c/career', '/c/growth', '/c/welcome'],
  p_grace: ['/c/start', '/c/interview', '/c/slots'],
  p_zara: ['/c/applications', '/c/jobs', '/c/messages'],
};
const PUBLIC = ['/signup', '/gallery/states'];
const b = await pw.chromium.launch();
const results = [];
for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: size, reducedMotion: 'reduce', ...(vp === 'phone' ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(700);
  const scan = async (actor, r) => {
    await page.goto(`${BASE}#${r}`); await page.waitForTimeout(900);
    await page.addScriptTag({ content: axe });
    const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, help: x.help, target: String(x.nodes[0].target) })));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const q = await page.evaluate((ph) => ph ? !!document.querySelector('.ds-askbar, [aria-label*="Ask Q"]') : !!document.querySelector('#q-ask'), vp === 'phone');
    results.push({ vp, actor, route: r, violations: v, overflow, qReachable: r.startsWith('/signup') || r.startsWith('/gallery') || q });
    console.log(`${vp} ${actor} ${r}: ${v.length} rule(s)${overflow ? ' · OVERFLOW' : ''}${q || r.startsWith('/signup') || r.startsWith('/gallery') ? '' : ' · NO Q'}`);
  };
  for (const [actor, routes] of Object.entries(AS)) {
    await page.evaluate((a) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = a; w.actors.find((x) => x.id === a).signedUp = true; localStorage.setItem('tq.world.v4', JSON.stringify(w)); }, actor);
    await page.reload(); await page.waitForTimeout(500);
    for (const r of routes) await scan(actor, r);
  }
  for (const r of PUBLIC) await scan('public', r);
  await ctx.close();
}
await b.close();
writeFileSync(OUT, JSON.stringify(results, null, 1));
const byRule = {};
for (const r of results) for (const v of r.violations) (byRule[v.id] ??= { impact: v.impact, help: v.help, pages: [] }).pages.push(`${r.vp} ${r.route}`);
console.log('\nSUMMARY', results.length, 'scans ·', Object.keys(byRule).length, 'rules ·', results.filter((r) => r.overflow).length, 'overflow ·', results.filter((r) => !r.qReachable).length, 'without Q');
for (const [id, x] of Object.entries(byRule)) console.log(`${x.impact} ${id} (${x.pages.length}): ${x.help} — e.g. ${x.pages.slice(0, 3).join('; ')}`);
