# Design skill and tool audit

This audit is built from execution evidence. The source is the session transcript (`/root/.claude/projects/-home-user-neo/<session>.jsonl`), searched for `"name":"Skill"` tool calls. A skill counts as **invoked** only if a Skill tool call exists. "Read instructions" means its instructions were loaded into the session, which happens on invocation. For some skills, reference files were also opened with a shell command; this is noted.

Correction to the previous version of this file: it credited `design-superpowers:creative` as "the basis for the three directions in Phase 1". The transcript has no invocation of it in Phase 1; it was invoked only in the earlier JavaScript round. That claim was unsupported and has been removed.

## Invocation log (from the transcript)

| # | Phase | Skill | Arguments (abridged) |
|---|---|---|---|
| 1 | v2 JavaScript prototype (before the directive) | `design-superpowers:creative` | "Jarvis meets LinkedIn… must not look like generic AI SaaS" |
| 2 | v2 | `design-skills:design-elevation` | voice-first ambient redesign |
| 3 | v2 | `design-superpowers:design` | one ambient home, approval cards |
| 4 | v2 | `design-skills:interaction-design` | (no args) |
| 5 | v2 | `design-skills:journey-mapping` | Ada and Femi story map for the film |
| 6 | v2 | `design-skills:ux-writing` | Q's voice and tone |
| 7 | v2 | `design-skills:design-critique` | critique of the v2 screens |
| 8 | v2 | `design-skills:accessibility-audit` | v2 contrast, voice alternatives |
| 9 | TS Phase 2 (Nocturne) | `design-skills:design-systems` | token tiers, component inventory |
| 10 | Direction exploration (this round) | `design-superpowers:creative` | three substantially different directions |
| 11 | this round | `dataviz` | evidence, progress, skill-graph encodings |
| 12 | this round | `design-skills:interaction-design` | motion languages and Q state machines per direction |
| 13 | this round | `design-skills:design-critique` | rubric critique of A, B and C |
| 14 | Direction D (founder's unification request) | `design-skills:design-elevation` | unify A's type and evidence, B's Q and relationship views, C's interaction and mobile into one system |
| 15 | earlier publish of the direction review page | `artifact-design` | single-file review page (logged now; it was invoked but missing from this table) |
| 16 | Batch 1 (D as the system) | `dataviz` | J7 progress small multiples and phone distance bands: form, marks, key, table view, title states finding, filter row |
| 17 | Batch 1 | `design-skills:design-critique` | heuristics, excise, IA and posture across the D shell, onboarding, planner, J7 and bridged screens (`qa/BATCH-1-REVIEW.md`) |
| — | Complete experience (ten journeys) | none invoked | No design skill was invoked in this phase. The Direction D system and the Batch 1 critique and elevation guidance were reused as written. The review was done with scripts, not skills: axe over 106 page scans (`qa/scripts/review/axe-all.mjs`) and a keyboard review (`qa/scripts/review/keyboard.mjs`). The screen-reader pass (for which `design-skills:accessibility-audit` is the natural fit) is still to do. |

**Gap the founder identified, confirmed.** The 12 Nocturne screens were built with only #9 invoked during that phase. That is a likely contributor to their "internal dashboard" quality.

## Per-capability table

| Capability (installed) | Read instructions | Invoked | Screens or assets it helped create | Concrete improvement | If not used, why |
|---|---|---|---|---|---|
| `design-superpowers:creative` | Yes, plus `core-principles.md` and `creative-direction.md`, and queries of `style-contexts.csv` and `visual-styles.csv` | Yes (#1, #10) | Directions A, B, C (`src/directions/*`) | Forced three distinct style families (editorial grid, chiaroscuro spatial, bento) instead of three intensities of one ("false variety" anti-pattern); a theme statement per direction; the trust-critical context kept gimmicks out | n/a |
| `dataviz` | Yes, plus `color-formula.md`, `palette.md`, `anti-patterns.md`, `interaction.md`, `marks-and-anatomy.md`; ran `scripts/validate_palette.js` on 3 surfaces | Yes (#11, #16) | Evidence marks in A, B, C; progress small multiples (A), rings (B), bars (C) | The validator showed gold steps are about 9 ΔE apart (below the 15 floor), so evidence strength is carried by shape, line or length in every direction; single-series emphasis instead of extra hues | n/a |
| `design-skills:interaction-design` | Yes, plus `references/motion-principles.md` | Yes (#4, #12) | Q state machines (ink, orbit, bloom); per-direction motion; Q→artifact morph in C | Motion tied to real counts (no fake progress); 500ms ceiling for functional motion; zero overshoot for data views in A and B, springs only in C; a designed peak moment per flow (verdict, coverage 6 → 7) | n/a |
| `design-skills:design-critique` | Yes | Yes (#7, #13, #17) | `decisions/DIRECTION-REVIEW.md`, `qa/DESIGN-REVIEW-PROCESS.md` | Scored rubric with heuristic severities; 12 defects found by viewing renders and fixed before presenting | n/a |
| `design-skills:design-systems` | Yes | Yes (#9) | `tokens/tokens.json`, `components/COMPONENTS.md` | Three-tier tokens, a contrast gate in the build, a five-variant cap | It shaped structure, not visual quality; the founder judged the result too dashboard-like |
| `design-skills:design-elevation` | Yes, plus `references/elevation-protocol.md` and `references/design-interrogation.md` | Yes (#2 for v2, #14 for D) | Direction D (`src/directions/d/`): `d.css` tokens, the thread and canvas shell, every D view | Functional and perceptual patterns separated (ink thread = where Q works, paper canvas = where evidence is read); one major-third type scale with ≥1.5× jumps between hierarchy levels; one accent (gold = Q and its work only); 8px spacing; chart titles state the finding ("Only one heavy line reaches payments systems."); tabular numbers; the interrogation checklist drove cutting the decorative idle animation from the Q mark | n/a |
| `design-skills:accessibility-audit` | Yes (v2 only) | Yes (#8) | v2 fixes; axe pipeline carried forward | Contrast fix, landmarks | The current scans are automated axe runs, not a re-invocation; a manual keyboard and screen-reader pass is still open |
| `design-skills:journey-mapping`, `design-skills:ux-writing` | Yes (v2 only) | Yes (#5, #6) | v2 film and Q's voice | Story arc; tone rules still used in copy | Not re-invoked this round |
| `design-superpowers:design` | Yes (v2 only) | Yes (#3) | v2 one-home model | Moments and lenses carried into Nocturne | Not re-invoked this round |
| `artifact-design` | Yes | Yes (#15) | The published direction review page (A, B, C, and now D) | Page contract: title, no external requests, self-contained build, phone width | n/a |
| `design-superpowers:design-review`, `design:design-critique`, `design:accessibility-review` | No | No | n/a | n/a | They overlap with the critique and accessibility skills already used. Invoking them now would only pad this list. `design-review` covers design-system compliance and will be used after the system is rebuilt in the chosen direction. |
| `design-skills:ux-research`, `design:user-research` | No | No | n/a | n/a | Needed for real usability testing of the chosen direction (the J7 reviewer sign-off). There are no participants in this session. |
| `design:design-handoff`, `design-superpowers:ds-make`, `ds-manage`, `ds-producer`, `ds-consumer`, `map-design` | No | No | n/a | n/a | These apply once a direction is chosen and rebuilt as tokens and components |
| `design:ux-copy` | No | No | n/a | n/a | Overlaps with `ux-writing` (used) |
| `marketing:*` | No | No | n/a | n/a | Out of scope (campaigns, not product design) |
| Claude Design canvas (Artifact type) | Yes | Yes (Phase 1) | Three-direction board (Nocturne, Ledger, Atelier) | First exploration, now superseded by the working prototypes | n/a |
| Playwright + Chromium, ffmpeg with libass, axe-core (pre-installed tools) | n/a | Used | All screenshots, motion previews (captions in a separate band), accessibility scans | Evidence that every claim can be checked against | n/a |

## Design pass (29 Oct): skills invoked before any change

The founder found that the journey phase had used no design skills. The design pass corrected that: every area designer invoked its skills through the Skill tool **before** changing a page, and each recorded which skill changed which screen in `journeys/design/<area>.md` ("Skills → screens → changes"). The invocations below were counted from the agent transcripts, not from the agents' own notes.

| Who | Area (journeys) | Skills invoked |
|---|---|---|
| Lead | Shared layer: shell, Canvas, Q thread and cards, switches, motion tokens | `design-elevation`, `creative`, `interaction-design`, `design-critique` |
| Area designer | hire-a (R1, R5) | `design-critique`, `design-elevation`, `interaction-design`, `ux-writing`, `dataviz` |
| Area designer | hire-b (R2) | `design-critique`, `design-elevation`, `interaction-design`, `ux-writing`, `dataviz` |
| Area designer | hire-c (R3) | `design-critique`, `design-elevation`, `interaction-design`, `ux-writing`, `dataviz`, `creative` |
| Area designer | agency (R4) | `design-critique`, `design-elevation`, `interaction-design`, `ux-writing`, `dataviz` |
| Area designer | talent-a (T1, T2) | `design-critique`, `design-elevation`, `interaction-design`, `ux-writing`, `dataviz`, `creative` |
| Area designer | talent-b (T3, T5) | `design-critique`, `design-elevation`, `interaction-design`, `ux-writing`, `dataviz`, `creative` |
| Area designer | talent-c (T4) | `design-critique`, `design-elevation`, `interaction-design`, `ux-writing`, `dataviz`, `creative` |

What the skills changed, in short (detail in each area file):
- **design-critique** found the defects, ranked by severity, on every page: dead ends ("0 shown"), status used as titles, card walls, sideways-scrolling tables on phones, buried primary actions.
- **design-elevation** set the shared surface rules: one sheet of rows instead of floating cards, tags for status, one accent (gold) reserved for Q, and a consistent type scale.
- **interaction-design** shaped the states and motion: in-place confirmation instead of dialogs, undo instead of "are you sure", the pause, offline and reconnect states, one suggestion card at a time, and motion tokens that never block input.
- **dataviz** replaced text tables with charts that read at a glance: the evidence ledger in compare, the pay range meter, the shared free-time strip, stage strips and proof strips.
- **ux-writing** rewrote labels and Q's lines in plain words (no recruiting jargon for Funmi, short calm lines for Grace).
- **creative** was used where an area needed a new visual idea inside Direction D, for example Grace's interview "ticket" and the career route.

The permanent rule is in `handoff/DESIGN-QUALITY-GATE.md`: skills first, then build, then the gate's checks.

## Present but unusable here

| Tool | Reason |
|---|---|
| Figma MCP and all `figma:*` skills (including `figma-use-motion` and `figma-implement-motion`) | The plugin's Figma server fails with proxy 403 (ERR_PROXY_TUNNEL) in this container, and the founder has no paid Figma plan. None were invoked. |
| Canva, Notion and the other plugin MCP servers | Same proxy 403 |
| `design-superpowers:figma-setup` (PluginOS) | Needs the Figma desktop app |

## Asked for but not installed

| Capability | Status |
|---|---|
| A "frontend-design" skill | Not installed. The closest installed capabilities, `creative` and `interaction-design`, were used instead. |
| A "Motion" skill | Not installed. The Motion for React library is used directly, guided by `interaction-design`. |
| Graphic or image generation | No image-generation tool exists in this session. Every graphic in the directions is hand-built SVG or CSS from data (routes, maps, orbits, charts). No raster art is presented as generated. |
| Rive, Graphify | Not installed |
