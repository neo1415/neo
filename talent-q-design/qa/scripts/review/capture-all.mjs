// Design review captures: every route as the person who uses it, desktop (1440×900) and phone (390×844),
// full page. Used for the visual audit and before/after comparison. Usage: node capture-all.mjs <base> <outdir>
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const [BASE = 'http://localhost:4174/', OUT = 'review', ONLY = ''] = process.argv.slice(2);
export const PAGES = {
  u_funmi: ['/r/home', '/r/roles'],
  u_ada: ['/r/explore', '/r/sourcing/scope', '/r/outcomes', '/r/reminders', '/r/assess', '/r/questions', '/r/coaching', '/r/admin', '/r/admin/billing', '/r/admin/models', '/r/admin/quality', '/q/artifacts', '/q/sources', '/q/downloads', '/r/home', '/r/plan', '/r/compare', '/r/people/p_tobi', '/r/people/p_seyio', '/r/interviews', '/r/pipeline', '/r/messages', '/r/calendar', '/r/team', '/r/setup', '/r/roles', '/r/audit', '/r/memory', '/r/mandate', '/r/sourcing', '/settings', '/settings/email', '/r/campaigns', '/r/campaigns/c_q4_eng', '/r/roles/m_backend/rubric'],
  u_bayo: ['/r/home', '/r/roles', '/r/audit', '/r/memory'],
  u_dele: ['/r/admin/placements', '/r/home', '/r/agency/agents', '/r/agency/campaigns', '/r/agency/clients', '/r/agency/client/org_kora', '/r/agency/compare', '/r/agency/docs', '/r/agency/mandate/m_ops', '/r/agency/notes', '/r/agency/pools', '/r/agency/reports', '/r/agency/searches', '/r/agency/submittals'],
  p_amaka: ['/c/work/critique', '/c/work/versions', '/c/home', '/c/welcome', '/c/jobs'],
  p_chidi: ['/c/career/improve', '/c/career', '/c/growth'],
  p_tobi: ['/c/assess', '/c/messages', '/c/passport', '/c/jobs/j_kora_backend', '/c/prep', '/c/memory', '/c/interview'],
  p_seyio: ['/c/home', '/c/applications', '/c/passport'],
  p_grace: ['/c/reminders', '/c/home', '/c/start', '/c/interview', '/c/slots'],
  p_zara: ['/c/work-permit', '/c/jobs', '/c/applications', '/c/messages', '/settings'],
  public: ['/site', '/site/how', '/site/employers', '/site/talent', '/site/pricing', '/site/trust', '/sign-in', '/signup', '/gallery/states'],
};
const b = await pw.chromium.launch();
for (const [vp, size] of [['d', { width: 1440, height: 900 }], ['m', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: size, deviceScaleFactor: vp === 'm' ? 2 : 1, reducedMotion: 'reduce', ...(vp === 'm' ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  for (const [actor, routes] of Object.entries(PAGES)) {
    if (actor !== 'public') { await page.evaluate((a) => { const w = JSON.parse(localStorage.getItem('tq.world.v4')); w.session.actor = a; w.actors.find((x) => x.id === a).signedUp = true; localStorage.setItem('tq.world.v4', JSON.stringify(w)); }, actor); await page.reload(); await page.waitForTimeout(400); }
    for (const r of routes) {
      if (ONLY && !ONLY.split(',').some((o) => `${actor}${r}`.includes(o))) continue;
      await page.goto(`${BASE}#${r}`); await page.waitForTimeout(900);
      const dir = `${OUT}/${vp === 'd' ? 'desktop' : 'phone'}`; mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: `${dir}/${actor}${r.replace(/\//g, '_')}.png`, fullPage: true });
    }
  }
  await ctx.close();
}
await b.close();
console.log('captured', Object.values(PAGES).flat().length * 2, 'pages to', OUT);
