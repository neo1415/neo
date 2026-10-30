# Coverage build brief (30 Oct): close the remaining 183 / 57 / 41 gaps

The founder's scope (30 Oct): finish the **complete interactive product and design blueprint**, not production code. Every remaining screen concept, motion and vision group gets a real page, state or interaction in the Direction D prototype. Documenting a gap is not enough. Nothing from J1–J12 may regress.

## Where the requirements are
- Screen concepts: `docs/sources/batch-2/02_COMPLETE_SCREEN_ATLAS_v2.csv`. Read your rows in full: purpose, actor, states, Q role, data, notes.
- Motions: `docs/sources/batch-2/03_MOTION_AND_VIDEO_ATLAS_v2.csv` (trigger, surface, reduced-motion fallback).
- Vision groups: `docs/sources/batch-3/04_FOUNDER_VISION_TRACEABILITY_v2.csv`.
- Current status of each: `screens/SCREEN-COVERAGE.csv`, `motion/MOTION-COVERAGE.csv`, `research/VISION-COVERAGE.csv` (generated; don't edit).
- Product rules: `handoff/Q-INTELLIGENCE-SPEC.md`, `handoff/PRIVACY-AND-PERMISSIONS.md`, `handoff/DECISION-REGISTER.md`, `handoff/CONSOLIDATION-MERGE-LEDGER.md`.
- Design system: `design-system/DIRECTION-D-SYSTEM.md`, `handoff/DESIGN-QUALITY-GATE.md`. For the standard expected, read one design note, e.g. `journeys/design/evidence-candidate.md`.

## How the prototype is put together (extend it; never duplicate it)
- Prototype: `prototype/` (React + TypeScript + Vite). One world store: `mock/world.ts`.
- **Area slices:** add your own in `src/state/areas/<you>.ts` (`export const area = { id, init }`).
- **Seeds:** add your own in `src/state/seeds/<you>.ts` (`export const seed: SeedPatch`). Everything registers itself by glob.
- **Routes:** `src/routes/<you>.tsx` with `registerRoute({ path, side: 'recruiter'|'candidate'|'both'|'public', label, render, nav? })`. Nav entries come from `nav: { group, label, icon, order }`, so there is no shared nav file.
- **Pages:** put your pages in `src/journeys/<you>/`, using the `ds/*` components (Canvas, sheets, chips, tags, Glyph, PageIndex, ConfirmButton) and the tokens.
- **Q** is the one global conversational interface:
  - skills in `src/q/skills/<you>.ts` (`registerSkill`, `registerOp`);
  - proactive rules in `src/q/proactive/<you>.ts`;
  - page-aware openers in `src/q/openers/<you>.ts`;
  - live result cards via `registerRef`.

  Every new page needs a Q opener that names what needs the person, and the main tasks on it must also work by asking Q (text, with voice where it fits).
- **Privacy** is enforced in the store: `canSeeCandidate`, `visibleEvidence`, `canDiscover`, tenant scopes on events. Never bypass it.
- **QA hook:** `window.__tqQA` (`getWorld`, `update`, `act(op, args)`). Review links: `#/route?as=<actorId>`.
- **Cast:** Ada / Ngozi / Musa / Seyi Balogun (Kora Pay), Bayo, Funmi (Crumb & Co), Dele (Talentbridge agency), and candidates Tobi, Seyi Okoro, Amaka, Chidi, Grace, Zara, Ifeoma, Kunle. See `state/seed.ts` and `state/seeds/*`.

## Rules
1. **Design skills before code, through the Skill tool:**
   - `design-skills:interaction-design`, `design-skills:ux-writing`, `design-skills:design-elevation`, `design-superpowers:creative` (inside Direction D: no new aesthetics, typefaces or colours; gold is Q's alone), `design-skills:design-critique`;
   - `dataviz` for any chart, table or dashboard;
   - `design-skills:accessibility-audit` for anything unusual (players, sandboxes, maps).

   Then render desktop 1440×900 and phone 390×844 (deviceScaleFactor 2) with Playwright (`/opt/node-tools/node_modules/playwright/index.js`). Critique the screenshots with `design-critique`, fix, and re-render. Keep before/after pairs in `captures/review/pairs/<you>/NN-before.png|NN-after.png` and write `journeys/design/<you>.md`. That note should cover skill → screen → change, a `## Before/after pairs` section with `- NN: caption` lines, and honest remaining weaknesses.
2. **Mobile is task-first:** sheets and lists, never a shrunk desktop grid. No sideways scroll at 390px. Body text ≥ 12px. Keyboard reachable, with a list alternative for every visualisation.
3. **Simulate honestly and label it.**
   - No real sends, payments, provider calls, model calls, video, browsing or downloads.
   - Show provider statuses truthfully: accepted ≠ delivered ≠ read.
   - No outbound action without approval.
   - Unknown is never zero.
   - Never score faces, accents, emotion or personality.
   - Pricing and validation claims are hypotheses, never facts (`docs/sources/batch-6/04_SOURCE_LEDGER.md`, "Unproven claims").
4. **Motions** use the existing motion tokens (`ds/motion` / DUR, EASE), and every one has a reduced-motion or lite fallback, as the atlas row says.
5. **Stay in your own files.** Don't edit shared code (`mock/world.ts`, `ds/*`, `q/core/*`, `app/*`, other areas' journeys or routes). If you truly need a shared change, make it the smallest additive one, and name it in your report.
6. **Status:** write `registry/patches/<you>.json` in the `registry/status.json` shape:
   ```json
   { "screens": { "SC-xxx": { "status": "PROTOTYPED", "route": "/r/...", "evidence": "files; test step names", "note": "what is shown and what is simulated" } }, "motions": {...}, "vision": {...} }
   ```
   Use PROTOTYPED (an interactive page or state that exists) or INTEGRATED (it also changes shared state that other pages read). The lead merges these. Claim only what exists and is tested.
7. **Test:**
   - Write `qa/scripts/features/<you>.mjs` covering desktop and phone, one step per requirement, with step names that cite the IDs. It takes env `BASE`.
   - Run `npx tsc --noEmit -p .` until it is clean.
   - Run `qa/scripts/review/privacy.mjs <base>` plus the journeys your area touches. The address style for each is in `qa/scripts/journeys/run-all.sh`.
   - Use your own vite port. Don't commit.
8. **Report:** IDs covered with routes, tests and counts, skills invoked, shared-file changes, regressions found and fixed, and what is still weak.
