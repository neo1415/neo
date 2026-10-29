// Privacy: candidates' discovery rules hold everywhere a recruiter can reach them — search and pools,
// profiles, Q's tools, cached views and downstream artifacts (campaigns). Usage: node privacy.mjs [base]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const BASE = process.argv[2] || 'http://localhost:4174/';
let fails = 0; const step = (ok, n, x = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${x ? ` · ${String(x).slice(0, 140)}` : ''}`); };
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}#/settings`); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(700);
const qa = (fn, ...args) => page.evaluate(([f, a]) => { const q = window.__tqQA; return q[f](q.getWorld(), ...a); }, [fn, args]);
// Switch person through the app's own store (writing localStorage directly races with the app's own saves).
const as = async (actor, route) => { await page.evaluate((a) => window.__tqQA.update((w) => { w.session.actor = a; w.actors.find((x) => x.id === a).signedUp = true; }), actor); await page.evaluate((r) => { location.hash = r; }, route); await page.waitForTimeout(900); const now = await page.evaluate(() => window.__tqQA.getWorld().session.actor); if (now !== actor) throw new Error(`actor is ${now}, expected ${actor}`); };
const setDiscovery = (pid, rule) => page.evaluate(([p, r]) => { const q = window.__tqQA; q.update((w) => { w.areas['talent-b'].discovery[p] = { showSalary: false, ...r }; w.consents[p].discoverable = r.who !== 'NOBODY'; }); }, [pid, rule]);
// Q's recent replies (background agents can post an update right after Q answers).
const ask = async (t) => { await page.fill('#q-ask', t); await page.keyboard.press('Enter'); await page.waitForTimeout(1200); return (await page.locator('.ds-thread .ds-q .say').allInnerTexts()).slice(-3).join(' / '); };
const canvas = () => page.locator('#ds-content').innerText();

// 1. Default rule (verified employers only): an agency can't find Zara, who never registered with it.
step(!(await qa('canSeeCandidate', 'p_zara', 'org_tb')), 'Zara (verified employers only) is invisible to Talentbridge');
step(await qa('canSeeCandidate', 'p_tb_femi', 'org_tb'), 'Femi, registered with Talentbridge, is visible to it');
step(!(await qa('canDiscover', 'p_zara', 'org_rivers')), 'unverified employer (Rivers) cannot discover Zara');
await as('u_dele', '/r/agency/pools');
const pools = await canvas();
step(!/Zara Mensah/.test(pools) && /privacy settings don’t allow agencies/.test(pools), 'agency pool hides Zara and says, without naming, that people are hidden', pools.match(/[^.]*privacy settings[^.]*\./)?.[0]);
await as('u_dele', '/r/people/p_zara');
step(/can’t see Zara’s profile/.test(await canvas()) && !/Shared with/.test(await canvas()), 'agency opening Zara’s profile by URL gets a permission state, no data');
await as('u_dele', '/r/home');
const r1 = await ask('show me everything about zara');
step(/can’t show you Zara’s profile/.test(r1) && !/Here’s Zara’s profile/.test(r1) && !/\/r\/people\/p_zara/.test(page.url()), 'Q tool refuses for the agency, reveals nothing', r1);
// Downstream artifact: a campaign over a pool that once contained Zara excludes her.
const camp = await page.evaluate(() => { const w = window.__tqQA.getWorld(); return (w.areas.agency.campaigns ?? []).flatMap((c) => c.messages ?? []).filter((m) => m.personId === 'p_zara' && m.status !== 'EXCLUDED').length; });
step(camp === 0, 'no campaign message to Zara is queued or sent');

// Tenant isolation: an employer can't open the agency's workspace by URL.
await as('u_ada', '/r/agency/pools');
const leak = await canvas();
step(/belongs to Talentbridge/.test(leak) && !/Payments engineers/.test(leak), 'Kora opening Talentbridge’s pools by URL sees a permission page, no pools');

// 2. Hiding from one employer: Amaka (no relationship with Kora) hides from Kora Pay.
step(await qa('canSeeCandidate', 'p_amaka', 'org_kora'), 'before: Kora (verified) may find Amaka');
await setDiscovery('p_amaka', { who: 'VERIFIED_EMPLOYERS', hideFrom: ['org_kora'] });
step(!(await qa('canSeeCandidate', 'p_amaka', 'org_kora')), 'after hiding from Kora: Kora can’t see Amaka');
step((await qa('visibleEvidence', 'p_amaka', 'org_kora')).length === 0, 'Kora reads none of Amaka’s evidence, public items included');
await as('u_ada', '/r/people/p_amaka');
step(/can’t see Amaka’s profile/.test(await canvas()), 'Kora profile by URL: permission state');
const r2 = await ask('show me everything about amaka');
step(/can’t show you Amaka’s profile/.test(r2), 'Q tool refuses for Kora', r2);
step(await qa('canSeeCandidate', 'p_amaka', 'org_medlink'), 'other employers are unaffected (Medlink can still find Amaka)');

// 3. Nobody may find Tobi; an explicit share still works, and nothing else leaks.
await setDiscovery('p_tobi', { who: 'NOBODY', hideFrom: [] });
step(await qa('relationshipWith', 'p_tobi', 'org_kora') && (await qa('visibleEvidence', 'p_tobi', 'org_kora')).length > 0, 'Kora keeps what Tobi explicitly shared with it');
const medTobi = await qa('visibleEvidence', 'p_tobi', 'org_rivers');
step(medTobi.length === 0, 'an employer Tobi never shared with sees nothing, not even public items', medTobi.map((e) => e.evidenceId).join(','));

// 4. Cached results: Ada's saved comparison and the search cache drop someone who becomes hidden.
await setDiscovery('p_dayo', { who: 'VERIFIED_EMPLOYERS', hideFrom: ['org_kora'] });
step(!(await qa('canSeeCandidate', 'p_dayo', 'org_kora')), 'Dayo hidden from Kora');
await page.evaluate(() => window.__tqQA.update((w) => { w.sourcing.found = [...new Set([...w.sourcing.found, 'p_dayo'])]; }));
await as('u_ada', '/r/sourcing');
step(!/Dayo Lawal/.test(await canvas()), 'search results cache no longer shows Dayo');
await as('u_ada', '/r/compare');
step(!/Dayo Lawal/.test(await canvas()), 'saved comparison no longer shows Dayo');

// 5. Withdrawn consent always wins, even with a relationship.
await page.evaluate(() => window.__tqQA.update((w) => { w.consents.p_zara.withdrawnFrom.push('org_kora'); }));
step(!(await qa('canSeeCandidate', 'p_zara', 'org_kora')) && (await qa('visibleEvidence', 'p_zara', 'org_kora')).length === 0, 'Zara withdrew from Kora: nothing visible despite her application');

step(errors.length === 0, 'no page errors', errors.join(' | '));
await b.close();
console.log(fails ? `${fails} privacy check(s) failed` : 'All privacy checks passed');
process.exit(fails ? 1 : 0);
