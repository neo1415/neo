// Short motion previews of the key interactions, recorded from the running prototype (Playwright video),
// for the founder's review gallery. Each clip drives the real UI the way a person would, mostly by typing
// to Q. Usage: node motion-clips.mjs <base> <outdir>   → <outdir>/<id>.webm (convert with ffmpeg after).
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdirSync, renameSync } from 'node:fs';
const [BASE = 'http://localhost:4174/', OUT = 'clips'] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clip(id, { phone = false, actor, start }, run) {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: phone ? 2 : 1, ...(phone ? { isMobile: true, hasTouch: true } : {}), recordVideo: { dir: `${OUT}/.raw-${id}`, size: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 } } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(500);
  await page.evaluate((a) => window.__tqQA.update((w) => { w.session.actor = a; w.actors.find((x) => x.id === a).signedUp = true; }), actor);
  await page.evaluate((r) => { location.hash = r; }, start); await wait(1200);
  const ask = async (t, hold = 2600) => {
    if (phone && !(await page.locator('#q-ask').isVisible().catch(() => false))) { await page.locator('.ds-askbar button').click(); await wait(500); }
    await page.locator('#q-ask').pressSequentially(t, { delay: 28 }); await page.keyboard.press('Enter'); await wait(hold);
  };
  const chip = async (re, hold = 2200) => { await page.locator('.ds-chip', { hasText: re }).last().click(); await wait(hold); };
  try { await run({ page, ask, chip, wait }); } catch (e) { console.log(`${id}: ${e.message.split('\n')[0]}`); }
  await wait(800);
  const v = page.video(); await ctx.close(); await b.close();
  const p = await v.path(); renameSync(p, `${OUT}/${id}.webm`); console.log(`${id} ✓`);
}

await clip('01-navigate-and-return', { actor: 'u_ada', start: '/r/compare' }, async ({ ask }) => {
  await ask('show me everything about tobi', 3200);
  await ask('ok go back to the comparison', 2800);
});
await clip('02-draft-revise-send', { actor: 'u_ada', start: '/r/people/p_tobi' }, async ({ ask, chip }) => {
  await ask('draft an interview invitation for him', 3000);
  await ask('Change it to Friday and make the tone more friendly', 3200);
  await ask('Send it', 2800);
  await chip(/Approve and send/, 2600);
});
await clip('03-proactive-card', { actor: 'u_ngozi', start: '/r/messages' }, async ({ page, wait }) => {
  await wait(1200);
  await page.locator('.ds-suggest .ds-linkbtn').first().click(); await wait(1600);
  await page.locator('.ds-suggest .ds-chip', { hasText: 'Later' }).first().click(); await wait(1800);
});
await clip('04-upload-drop-resume', { phone: true, actor: 'p_grace', start: '/c/start' }, async ({ ask, page, wait }) => {
  await ask('upload my care certificate', 2400);
  await page.evaluate(() => window.__tqQA.update((w) => { w.network = 'offline'; })); await wait(2400);
  await page.evaluate(() => window.__tqQA.update((w) => { w.network = 'online'; })); await wait(4200);
});
await clip('05-interview-follow-up', { actor: 'p_tobi', start: '/c/interview' }, async ({ page, wait }) => {
  await page.getByRole('button', { name: 'Start practising' }).click(); await wait(1200);
  await page.locator('#iv-draft').pressSequentially('We compare records.', { delay: 30 }); await page.getByRole('button', { name: /Save answer/ }).click(); await wait(2400);
  await page.locator('#iv-draft').pressSequentially('The on-call engineer is paged within a minute with the batch and amount.', { delay: 22 }); await page.getByRole('button', { name: /Save answer/ }).click(); await wait(2400);
});
await clip('06-agents-interrupt', { actor: 'u_dele', start: '/r/agency/agents' }, async ({ ask }) => {
  await ask('stop the medlink search, kora is urgent', 3600);
  await ask('resume medlink', 3200);
});
await clip('07-career-goal-change', { actor: 'p_chidi', start: '/c/career' }, async ({ ask }) => {
  await ask('i want to be a product manager', 3200);
  await ask('actually business analyst suits me better', 3600);
});
await clip('08-privacy-refusal', { actor: 'u_dele', start: '/r/home' }, async ({ ask }) => {
  await ask('show me everything about zara', 3400);
});
await clip('09-candidate-home-phone', { phone: true, actor: 'p_grace', start: '/c/home' }, async ({ page, wait }) => {
  await wait(1500); await page.mouse.wheel(0, 500); await wait(1500);
  await page.locator('.ds-askbar button').click(); await wait(2000);
});
console.log('done');
