// Drives the connected golden path through the 12 priority screens and screenshots each at desktop + mobile.
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
const OUT = process.argv[2];
const BASE = 'http://localhost:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); console.log('shot', name); };
const go = async (hash) => { await page.goto(BASE + '#' + hash); await page.waitForTimeout(300); };
const click = (text, opts = {}) => page.getByRole('button', { name: text, exact: false, ...opts }).first().click();

await go('/'); await page.evaluate(() => localStorage.clear()); await go('/'); await shot('00-entry');
// P2 org setup
await go('/r/setup'); await shot('p02-setup-1');
await click('Continue'); await click('Read this handbook'); await page.waitForTimeout(1800); await shot('p02-setup-2-policies');
await click('Approve rule'); await click('Continue'); await click('Finish setup'); await shot('p02-setup-3-done');
// P1 home empty
await go('/r/home'); await shot('p01-home-empty');
// P3 intake via home composer
await page.getByLabel('Message Q').fill('I need a senior backend engineer for payments');
await page.getByRole('button', { name: 'Send' }).click();
await page.waitForURL(/r\/mandate/); await page.waitForTimeout(2500);
await shot('p03-intake-q1');
await click('Hybrid, Lagos'); await page.waitForTimeout(800);
await click('Payments reconciliation'); await page.waitForTimeout(2500);
await shot('p03-intake-ready');
await click('Approve and start searching');
// P4 sourcing
await page.waitForURL(/r\/sourcing/); await page.waitForTimeout(2200); await shot('p04-sourcing-running');
// offline/reconnect mid-run
await page.getByRole('button', { name: 'Simulate going offline' }).click(); await page.waitForTimeout(1500); await shot('p04-sourcing-offline');
await page.getByRole('button', { name: 'Reconnect' }).first().click(); await page.waitForTimeout(800); await shot('p04-sourcing-reconnected');
await page.getByRole('button', { name: /Compare the/ }).waitFor({ timeout: 20000 }); await shot('p04-sourcing-done');
// P1 home during waiting
await go('/r/home'); await shot('p01-home-after-search');
// P5 compare
await go('/r/compare'); await shot('p05-compare');
await page.getByRole('button', { name: /Tobi Adeyemi, Payments systems/ }).click(); await shot('p05-evidence-sheet');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Draft outreach' }).first().click();
// P6 outreach
await page.waitForURL(/r\/outreach/); await shot('p06-outreach');
await click('Approve and send'); await page.waitForTimeout(6500); await shot('p06-outreach-sent');
// P7 calendar
await go('/r/calendar'); await shot('p07-calendar-disconnected');
await click('Connect Google Calendar'); await shot('p07-consent'); await click('Allow busy times');
await click('Find times with Tobi'); await page.waitForTimeout(4500); await shot('p07-slots');
await click('Send these times to Tobi'); await page.waitForTimeout(800); await shot('p07-sent');
// P8 candidate slot picker
await go('/c/slots'); await shot('p08-slots');
await page.locator('input[name=slot]').first().check(); await click('Choose this time'); await page.waitForTimeout(600); await shot('p08-booking-progress');
await page.waitForTimeout(2600); await shot('p08-booked');
await go('/r/calendar'); await shot('p07-booked-recruiter');
// P9 passport + revocation
await go('/c/passport'); await shot('p09-passport');
await page.getByRole('button', { name: 'Make private' }).first().click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'What Kora Pay sees' }).click(); await shot('p09-passport-kora-view');
await go('/r/compare'); await page.getByRole('button', { name: /Tobi Adeyemi, Payments systems/ }).click(); await shot('p05-evidence-after-revoke'); await page.keyboard.press('Escape');
// P10 career (3 personas)
await go('/c/career'); await shot('p10-career-amaka');
await page.getByRole('button', { name: 'Chidi · career switcher' }).click(); await shot('p10-career-chidi');
await page.getByRole('button', { name: 'Amaka · graduate' }).click();
// P11 interview text + follow-up + form + voice
await go('/c/interview'); await shot('p11-interview-start');
await page.getByLabel('Your answer').fill('It compares things.'); await page.getByRole('button', { name: 'Send' }).click(); await shot('p11-interview-followup');
await page.getByRole('button', { name: 'Form' }).click(); await shot('p11-interview-form');
await page.getByRole('button', { name: 'Voice' }).click(); await page.getByRole('button', { name: 'Speak to Q' }).click(); await page.waitForTimeout(2500); await shot('p11-interview-voice');
// practice + promote
await go('/c/interview?practice=c_sql_window');
await page.getByLabel('Your answer').fill('I would use LAG over a partition by user_id ordered by started_at, then take the difference between the first and second session dates for each user and filter row number two.');
await page.getByRole('button', { name: 'Send' }).click(); await page.waitForTimeout(400); await shot('p11-practice-feedback');
// P12 memory
await go('/r/memory'); await shot('p12-memory');
await page.getByRole('button', { name: 'Don’t use this' }).click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Draft outreach to Tobi' }).click(); await shot('p12-context-pack-outreach');
await page.getByRole('button', { name: 'Correct' }).first().click(); await page.getByLabel('What should Q remember instead?').fill('Ada takes interview calls after 11:00 Lagos time, mornings first, never in the Tuesday review.'); await click('Save correction'); await shot('p12-corrected');
await go('/c/memory'); await shot('p12-candidate-memory');
await go('/gallery'); await shot('gallery');

// Mobile pass
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await m.newPage();
mp.on('pageerror', (e) => errors.push('mobile: ' + e));
await mp.goto(BASE); await mp.evaluate((s) => localStorage.setItem('tq.world.v3', s), await page.evaluate(() => localStorage.getItem('tq.world.v3'))); await mp.reload();
for (const [h, n] of [['/r/home', 'm-p01-home'], ['/r/mandate', 'm-p03-mandate'], ['/r/compare', 'm-p05-compare'], ['/r/outreach', 'm-p06-outreach'], ['/r/calendar', 'm-p07-calendar'], ['/c/slots', 'm-p08-slots'], ['/c/passport', 'm-p09-passport'], ['/c/career', 'm-p10-career'], ['/c/interview', 'm-p11-interview'], ['/r/memory', 'm-p12-memory'], ['/r/setup', 'm-p02-setup'], ['/r/sourcing', 'm-p04-sourcing']]) {
  await mp.evaluate((x) => { location.hash = x; }, h); await mp.waitForTimeout(500);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) errors.push(`horizontal overflow ${overflow}px on ${h}`);
  await mp.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); console.log('shot', n);
}
const st = await page.evaluate(() => localStorage.getItem('tq.world.v3'));
(await import('node:fs')).writeFileSync(OUT + '/state.json', st);
console.log('ERRORS', JSON.stringify(errors, null, 1));
await browser.close();
