# Batch 1 review: Direction D becomes the system

Date: 29 Oct 2026. Scope:
- the design system;
- the original screens moved into the D shell;
- candidate onboarding (F2);
- the multi-agent planner (F6);
- the expanded J7 workspace.

## Gate 1: function

| Check | Result | Evidence |
|---|---|---|
| Typecheck and build | Pass (the token contrast gate passes 44 pairs) | `npm run build` |
| Scripted journeys, desktop 1440 and phone 390 | Pass, 0 page errors, no horizontal overflow | `qa/scripts/batch1.mjs` → `captures/batch1/` |
| axe-core WCAG 2.2 AA | **0 violations in 42 scans** (21 per viewport, including interaction states) | `qa/scripts/axe-batch1.mjs` |
| Films from the running prototype | F2, F6 and J7, each on desktop and phone | `qa/scripts/journey-films.mjs` → `captures/journeys/` |

The first axe run found 31 violations, all from two root causes in the shell:
- rail group labels had a 2.5:1 contrast ratio on ink;
- the resize separator sat outside any landmark.

Both were fixed at the source and the re-run was clean.

## Gate 2: design review

Two skills were invoked on the actual outputs (logged in `DESIGN-SKILL-AUDIT.md`): `design-skills:design-critique` and `dataviz`.

| # | Finding | Principle | Severity | Fix |
|---|---|---|---|---|
| 1 | Approval copy promised "an undo window" that the product does not offer | H9 / responsible content | 3 | Removed the claim. Cards say exactly what approval does |
| 2 | A plan could be paused but not cancelled or closed | H3 user control | 2 | "Cancel plan" or "Close plan", with a consequence-stating confirmation |
| 3 | J7's persona switcher looked like product UI | H2 / H4 | 2 | Labelled "Demo persona" |
| 4 | "Readiness and measures" overlapped "Career atlas" | IA: mutual exclusivity | 2 | Renamed "Readiness to apply" |
| 5 | Phone thread didn't scroll to new choices, which landed under the composer | H1 visibility | 3 | The page scrolls to the newest message; the composer is sticky above the tabs |
| 6 | Planner lanes were cramped at 390 px | Fitts / readability | 2 | Lanes stack on phones |
| 7 | Failed CV read showed "Q is working" | H1 | 2 | The composer is idle and the Q mark shows the blocked shape |
| 8 | Dark legacy buttons had invisible labels in the shell (CSS specificity) | Contrast | 4 | Zero-specificity button reset |
| 9 | Every atlas node drew the goal ring (variable shadowing) | Data integrity | 3 | Fixed; only the goal is marked |
| 10 | Progress chart had no key, end label, table or focusable points; the title was generic | dataviz checklist | 2 | All added. The title states the finding from data |
| 11 | Band-atlas filters were split above and below the list | dataviz interaction | 1 | One filter row above |
| 12 | Switching persona with a role open crashed the J7 page | H9 | 4 | A stale role selection is ignored across personas |

### Posture and excise

- **Recruiters (sovereign).** Rail, resizable thread and wide canvas; the rail collapses to icons. Ctrl/⌘ K reaches every page, and the Q composer is always one keystroke away. That fits long sessions.
- **Candidates (transient, often on a phone).** A thread-first home with a sheet for artifacts, plus four tabs and More.
- **Onboarding excise.** CV to ready takes 9 interactions, and all of them advance the goal. Failure recovery is one tap.

## What remains weak (carried into batch 2)

- **The original screens are bridged, not native.** Mandate, sourcing, compare, outreach, calendar, memory, setup, Passport, interview, slots and growth render on paper in D type, but they have no Q thread beside them. Q is central on Home, Plans, Onboarding and J7, but not yet on those pages.
- **Separate stores.** The J7 store and the onboarding profile store are not yet read by the shared world, so the Passport does not see onboarding claims or J7 assessments. This is batch 2's first integration task.
- **No usability testing yet.** The manual keyboard and screen-reader pass is still outstanding, so nothing is VERIFIED.
