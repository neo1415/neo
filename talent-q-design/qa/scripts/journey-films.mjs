// Journey films recorded from the running prototype (Direction D system). F2 candidate onboarding,
// F6 multi-agent planner, and the expanded J7 workspace. Usage: node journey-films.mjs <outDir> [ids]
import path from 'node:path';
import { makeFilm } from './lib/film.mjs';
const OUT = path.resolve(process.argv[2] || 'films');
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
const film = makeFilm(OUT, ONLY);
const fresh = async (d, route) => { await d.page.evaluate(() => { try { localStorage.clear(); } catch {} }); await d.page.reload(); await d.wait(600); await d.go(route); };
const chip = (d, re) => d.page.locator('.ds-chip').filter({ hasText: re }).last();
const back = async (d) => { const b = d.page.getByRole('button', { name: 'Back to the conversation with Q' }); if (await b.count()) { await d.click(b); await d.wait(300); } };

await film('f2-onboarding-desktop', 'F2 · Candidate onboarding', {}, async (d) => {
  await fresh(d, '/c/welcome');
  await d.cap('Candidate onboarding. Warmer surfaces, same rules: private by default, and a CV is claims, not proof.', 3000);
  await d.cap('Amaka picks where she’s starting from.');
  await d.click(chip(d, /just finished studying/));
  await d.cap('First, a failure path: a phone photo of a CV.');
  await d.click(chip(d, /phone photo/));
  await d.cap('Q reads truthfully and stops when it can’t: nothing from the unreadable file is saved.', 2600);
  await d.cap('She recovers with one tap.');
  await d.click(chip(d, /Upload Amaka_Eze_CV\.pdf instead/));
  await d.cap('Each finished unit moves its agent on Q’s mark. The canvas shows a skeleton until there is something to check.', 4200);
  await d.cap('What Q found: roles and claims in her words, with two flagged as vague. Then two quick questions.', 2600);
  await d.click(chip(d, /Sheets and some SQL/));
  await d.click(chip(d, /A product analyst role/));
  await d.cap('Her answer adds “SQL (basic)” as a claim, not as a skill she has proven.', 2400);
  await d.click(chip(d, /Check the basics/));
  await d.cap('About you: plain fields, private visibility by default.', 2000);
  await d.click(d.btn(/Save and continue/));
  await d.cap('Experience: Q asks for a number behind a vague claim. She edits it.');
  await d.click(d.page.getByRole('button', { name: /^Edit: Improved reporting/ }));
  await d.click(d.btn(/^Save$/));
  await d.cap('The claim is clearer; it is still a claim until she adds evidence.', 2200);
  await d.click(d.btn(/Continue to skills/));
  await d.cap('Skills: evidenced, claimed, and Q’s suggestions, which are never added without her yes.');
  await d.click(d.btn(/It’s true, add it/));
  await d.wait(1200);
  await d.click(d.page.locator('.ds-canvas').getByRole('button', { name: 'Finish' }));
  await d.cap('Done. Nothing is shared. The next step is the career atlas, or adding evidence.', 3200);
});

await film('f2-onboarding-phone', 'F2 · Candidate onboarding', { phone: true }, async (d) => {
  await fresh(d, '/c/welcome');
  await d.cap('On a phone the conversation is the page.', 1800);
  await d.click(chip(d, /changing careers/));
  await d.cap('Chidi, a career switcher, uploads his CV.');
  await d.click(chip(d, /Upload Chidi_Nwosu_CV\.pdf/));
  await d.cap('The artifact opens as a sheet, with Q’s latest line on top.', 3800);
  await back(d);
  await d.click(chip(d, /I like meeting targets/));
  await d.click(chip(d, /Within 2 months/));
  await d.cap('Two answers, then the basics.', 1600);
  await d.click(chip(d, /Check the basics/));
  await d.wait(1600);
  await back(d);
  await d.cap('He can stop anytime; Q keeps his place.', 2000);
});

await film('f6-multi-agent-desktop', 'F6 · Plans and agents', {}, async (d) => {
  await fresh(d, '/r/plan');
  await d.cap('Plans and agents. A paused plan from Tuesday is still here: work continues across sessions.', 2600);
  await d.click(chip(d, /Resume the paused reference check/));
  await d.cap('Resumed from exactly where it stopped.', 2000);
  await d.click(d.page.getByRole('button', { name: /^Plan “Fill Senior Backend/ }));
  await d.cap('Q reads the goal against what it may use: the approved mandate, Ada’s hours, the handbook, the send policy.', 3000);
  await d.cap('It asks one question before planning, because the answer changes the search.', 1800);
  await d.click(chip(d, /Lagos and remote only/));
  await d.cap('The plan: dependencies decide what runs in parallel. Anything that leaves Talent Q is marked “needs your yes”.', 3200);
  await d.click(chip(d, /Start the plan/));
  await d.cap('Five agents. Each lane counts real units of work; the Q mark carries one point per running agent.', 3600);
  await d.cap('GitHub rate-limits the search: Q says so, retries with backoff, and other sources carry on.', 3200);
  await d.cap('LinkedIn isn’t connected. Q doesn’t guess: it asks.', 1600);
  await d.click(chip(d, /Skip LinkedIn for this plan/));
  await d.cap('Search continues on two sources.', 1200);
  await d.click(d.page.getByRole('button', { name: 'Pause plan' }));
  await d.cap('Pause keeps every finished step. Resume carries on from the same point.', 2200);
  await d.click(d.page.getByRole('button', { name: 'Resume' }).first());
  await d.cap('Evidence checks stream findings as each finishes; then outreach, scheduling and references run in parallel.', 7000);
  await d.cap('Finished. Seven actions wait for approval. Nothing has left Talent Q.', 2600);
  await d.click(chip(d, /Review 7 approvals|Review \d+ approvals/));
  await d.cap('The handoff approval centre: each card says exactly what will happen if approved.', 2400);
  await d.click(d.page.getByRole('button', { name: 'Approve', exact: true }).first());
  await d.cap('Approved, with a simulated receipt. Kora’s policy is approve each send, so there is no blind bulk send.', 3000);
});

await film('f6-multi-agent-phone', 'F6 · Plans and agents', { phone: true }, async (d) => {
  await fresh(d, '/r/plan');
  await d.click(chip(d, /Fill Senior Backend/));
  await d.wait(1200);
  await d.cap('On a phone: the same plan, from the thread.', 1600);
  await d.click(chip(d, /Lagos and remote only/));
  await d.click(chip(d, /Start the plan/));
  await d.cap('Agent lanes open as a sheet with Q’s current line on top.', 4200);
  await back(d);
  await d.cap('Q asks in the thread when it needs a decision.', 2400);
  await d.click(chip(d, /Skip LinkedIn/));
  await d.wait(9000);
  await d.cap('Done: approvals to review.', 1800);
  await d.click(chip(d, /Review \d+ approvals/));
  await d.wait(2400);
});

await film('j7-desktop', 'J7 · Career intelligence', {}, async (d) => {
  await fresh(d, '/c/career');
  await d.cap('J7 for Amaka, a graduate. Distance from her is the number of competencies an occupation needs that she hasn’t shown.', 3200);
  await d.click(chip(d, /Open Product Analyst/));
  await d.cap('The role sheet: each competency with its evidence state, and openings that fit (illustrative).', 2800);
  await d.click(chip(d, /Show my development plan/));
  await d.cap('Her development plan: private, reorderable, each step says why it matters.', 2600);
  await d.click(d.page.getByRole('button', { name: /Move “Submit a cohort-retention notebook for review” up/ }));
  await d.wait(800);
  await d.click(d.page.getByRole('button', { name: 'Product Analyst', exact: true }));
  await d.click(chip(d, /Practise sql/i));
  await d.click(d.btn(/LAG\(started_at\)/));
  await d.cap('Right answer: logged as private practice. Not proof, so the atlas doesn’t move.', 3000);
  await d.click(chip(d, /Submit a work sample/));
  await d.cap('A work sample is reviewed against a rubric (simulated reviewer).', 3400);
  await d.cap('Assessed: now it counts. Occupations move a ring closer, each with a trail from where it was.', 3600);
  await d.click(d.page.getByRole('button', { name: 'Progress', exact: true }));
  await d.cap('Progress joins assessed attempts only; practice is shown as hollow dots and never counted.', 3200);
  await d.click(d.page.getByRole('button', { name: /Tobi · experienced/ }));
  await d.cap('An experienced engineer gets a different atlas, plan and practice: incident leadership for a Staff role.', 3400);
  await d.click(d.page.getByRole('button', { name: /Chidi · switcher/ }));
  await d.cap('A career switcher: his retail record translated into sales competencies.', 3000);
});

await film('j7-phone', 'J7 · Career intelligence', { phone: true }, async (d) => {
  await fresh(d, '/c/career');
  await d.cap('On a phone, the atlas becomes distance bands: every role readable and tappable.', 1800);
  await d.click(d.page.locator('.ds-tabs').getByRole('link', { name: /Career/ }));
  await d.click(chip(d, /What’s within reach/));
  await d.cap('Bands from “ready now” outward, with a family filter.', 3000);
  await d.page.evaluate(() => document.querySelector('.ds-canvas.as-sheet')?.scrollTo({ top: 600, behavior: 'smooth' }));
  await d.wait(1600);
  await d.click(d.page.getByRole('button', { name: /^Junior Data Analyst/ }).first());
  await d.cap('Tap a role to open its sheet.', 2200);
  await back(d);
  await d.click(chip(d, /Practise sql/i));
  await d.click(d.btn(/LAG\(started_at\)/));
  await back(d);
  await d.click(chip(d, /Submit a work sample/));
  await d.cap('Reviewed, then the bands update: roles move closer.', 5200);
  await d.wait(1600);
});
