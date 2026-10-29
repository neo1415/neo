# Build brief for journey areas (CX3/CX4)

You are one of five builders working **in the same checkout at the same time**. Other builders are editing
other files right now. Stay inside the files you own; everything else is read-only for you.

Read first: `journeys/JOURNEY-MAP.md` (your journeys, cast, curveballs), `journeys/AUDIT-BATCH1.md`,
`contracts/Q-WORKSPACE-CONTRACT.md`, `design-system/DIRECTION-D-SYSTEM.md`, then the code named below.
The prototype is `talent-q-design/prototype` (React 18 + TypeScript + Vite, `motion/react`).

## Non-negotiables
- Direction D only (paper canvas, ink thread, gold reserved for Q). Reuse `src/ds/*` components and
  classes (`ds-sheet`, `ds-btn`, `ds-opt`, `ds-filter`, `ds-field`, `ds-input`, `ds-banner`, `ds-sim`,
  `Canvas`, `Glyph`, `QMark`). Candidate pages get warmth automatically (`data-audience`).
- **Q is the centre.** Every capability in your journeys must be reachable by typing (or speaking) to the
  global Q, in imperfect natural language, from any page — not only by clicking. Pages are where work is
  seen and refined; Q does the work, navigates, asks clarifying questions, explains, and asks for approval.
- Honest simulation: nothing is really sent, booked or verified. Use statuses like `SENT_SIMULATED`, label
  with `<span className="ds-sim">Simulated</span>` where a real system would act, and never present
  scripted replies as general AI. If Q cannot handle something, it says so (the engine's fallback does this).
- Consequential actions (send, book, share, submit, withdraw, delete, reveal confidential data) need explicit
  approval: Q replies with `kind: 'approval'` and actions; only the action performs it. Respect
  `org.delegation`, team roles (`actor.role`), org guidelines, candidate consent and evidence scopes.
- Never promise an employer decision to a candidate. Practice (J7) is never proof. No fabricated evidence.
- Accessibility: real labels, visible focus, 44px targets, `aria-pressed`/`aria-live` where state changes,
  no colour-only meaning, works at 390px wide, respects reduced motion (`MotionConfig reducedMotion="user"`
  is already global). British English, plain words; explain any term (see `src/q/core/glossary.ts`).
- Every page has loading/empty/error/offline/permission-denied states where they can occur.

## Contracts you build on (read the code)
- **Store** `src/mock/world.ts` (World v4): `update(fn)`, `useWorld(sel)` (selectors may return new
  arrays/objects), `getWorld`, `actorOf`, `orgOf`, `personOf`, `emit(w, actorId, type, scope, text, data?)`,
  `visibleEvidence(w, personId, viewerOrgId)`, `simNow`. Types in `src/state/domain.ts`, seed in
  `src/state/seed.ts` (cast, orgs, jobs, pipeline, calendar…). Scope strings: `ORG:<id>`,
  `PERSON:<id>`, `SHARED:<org>:<person>`.
- **Your own state**: if you need a slice the domain lacks, add `src/state/areas/<area>.ts` exporting
  `export const area = { id: '<area>', init: () => ({...}) }` plus a typed accessor; it lives at
  `w.areas.<area>`. Only `import type` from `../../mock/world` in that file (it is globbed eagerly).
- **Your own seed records**: `src/state/seeds/<area>.ts` exporting `export const seed: SeedPatch` (actors,
  orgs, people, mandates, pipeline, threads, calendar, interviews, jobs, applications, evidence). Seeds
  apply to a fresh world: in the browser run `localStorage.clear()` then reload (or "Reset the demo").
- **Routes**: `src/routes/<area>.tsx` calls `registerRoute({ path, side, label, render, nav? })`
  (see `src/routes/registry.ts`, examples in `src/routes/core.tsx` and `src/routes/entry.tsx`). Pages
  render as the canvas beside the global Q thread; don't build your own conversation column. Use
  `Canvas` from `src/ds/Workspace`. Home blocks: `registerHomeSection(side, {...})` /
  `registerRecruiterHome(when, render)` from `src/routes/entry.tsx`.
- **Q skills**: `src/q/skills/<area>.ts` with `registerSkill({ id, side, match, handle, answer? })` and
  `registerOp(name, fn)` (`src/q/core/engine.ts`, `types.ts`). `match` returns 0–1 (winner above 0.45; core
  skills use 0.7–0.97, so pick deliberately and prefix ids with your area). Use `c.norm`, `c.ents` (people,
  days, time, money, tone, yes/no/undo/back/correction/unsure flags; `src/q/core/nlu.ts`), and frames for
  multi-turn tasks (`frame: { intent, slots, awaiting, startedAt }`, then `answer()` handles the reply; return
  null if the turn isn't an answer). Replies carry serialisable `actions` (`{t:'say'|'nav'|'do'}`), `used`
  (context Q drew on), `why`, `kind`, `ref` (live card via `registerRef(type, renderer)` in `src/q/refs.ts`).
  `effects(w, actor)` mutate the store atomically with the reply; `nav` navigates and records history so
  "go back" works. Use `pushUndo` for reversible actions. Look at `src/q/skills/core.ts` for style.
- **Proactive**: `src/q/proactive/<area>.ts` with `registerRule({ id, side, priority, evaluate(w, actor) })`
  returning suggestions from *real state* with a `why`. Engine handles dismiss/snooze/prefs.
- **View state that survives navigation**: `useViewState(key, initial)` from the engine.
- **Styles**: put any CSS in `src/styles/<area>.css` (import it from your routes file), classes prefixed
  `.<area>-`. Use tokens from `src/styles/tokens.css` (`--ink`, `--paper`, `--sheet`, `--rule`, `--gold-*`,
  `--risk`, `--warn`, `--ok`…). Do not edit `src/ds/ds.css`.

## Files you must NOT edit
`src/mock/world.ts`, `src/state/domain.ts`, `src/state/seed.ts`, `src/q/core/*`, `src/q/QThread.tsx`,
`src/q/skills/core.ts`, `src/q/skills/hiring-basic.ts`, `src/ds/*`, `src/routes/core.tsx`,
`src/routes/entry.tsx`, `src/routes/registry.ts`, `src/app/*`, `contracts/*`, other areas' files, legacy
`src/screens/*` unless your assignment names one. If you need a change there, write it in your final report
(exact diff you want) and work around it meanwhile. Do not touch the `neo1415/q` (Capital Q) repository.

## Verify
- `npx tsc --noEmit -p .` from `prototype`. Errors in files you don't own come from other builders' work in
  progress: ignore them, but your files must be clean.
- Run your own dev server on your port: `npx vite --port <PORT> --strictPort` (background) — do **not** run
  `npm run build` (it writes the shared `dist/`).
- Write `qa/scripts/journeys/<JOURNEY>.mjs` per journey: Playwright (`require('/opt/node-tools/node_modules/playwright/index.js')`,
  `chromium.launch()` needs no options). Start from `localStorage.clear()`, switch actor by editing
  `tq.world.v4` → `session.actor` (or the person menu), drive the journey mostly **by typing to Q**
  (`#q-ask` + Enter; on phones open the "Ask Q" bar first), assert visible outcomes, exercise **at least three
  curveballs** (change of mind; unavailable/conflicting/revoked info; interruption/navigation/permission
  recovery), capture desktop 1440×900 and phone 390×844 screenshots to `captures/cx/<JOURNEY>/`, collect page
  errors, and print a PASS/FAIL line per step. Fix what fails. Look at your screenshots and fix what looks wrong.
- Do not commit or push; the lead integrates.

## Report back (concise)
Files created; journeys and steps working; curveballs exercised with PASS/FAIL; known gaps; any change you
need in a shared file (exact diff).
