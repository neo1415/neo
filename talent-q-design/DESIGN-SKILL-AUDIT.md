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

**Gap the founder identified, confirmed.** The 12 Nocturne screens were built with only #9 invoked during that phase. That is a likely contributor to their "internal dashboard" quality.

## Per-capability table

| Capability (installed) | Read instructions | Invoked | Screens or assets it helped create | Concrete improvement | If not used, why |
|---|---|---|---|---|---|
| `design-superpowers:creative` | Yes, plus `core-principles.md` and `creative-direction.md`, and queries of `style-contexts.csv` and `visual-styles.csv` | Yes (#1, #10) | Directions A, B, C (`src/directions/*`) | Forced three distinct style families (editorial grid, chiaroscuro spatial, bento) instead of three intensities of one ("false variety" anti-pattern); a theme statement per direction; the trust-critical context kept gimmicks out | n/a |
| `dataviz` | Yes, plus `color-formula.md` and `palette.md`; ran `scripts/validate_palette.js` on 3 surfaces | Yes (#11) | Evidence marks in A, B, C; progress small multiples (A), rings (B), bars (C) | The validator showed gold steps are about 9 ΔE apart (below the 15 floor), so evidence strength is carried by shape, line or length in every direction; single-series emphasis instead of extra hues | n/a |
| `design-skills:interaction-design` | Yes, plus `references/motion-principles.md` | Yes (#4, #12) | Q state machines (ink, orbit, bloom); per-direction motion; Q→artifact morph in C | Motion tied to real counts (no fake progress); 500ms ceiling for functional motion; zero overshoot for data views in A and B, springs only in C; a designed peak moment per flow (verdict, coverage 6 → 7) | n/a |
| `design-skills:design-critique` | Yes | Yes (#7, #13) | `decisions/DIRECTION-REVIEW.md`, `qa/DESIGN-REVIEW-PROCESS.md` | Scored rubric with heuristic severities; 12 defects found by viewing renders and fixed before presenting | n/a |
| `design-skills:design-systems` | Yes | Yes (#9) | `tokens/tokens.json`, `components/COMPONENTS.md` | Three-tier tokens, a contrast gate in the build, a five-variant cap | It shaped structure, not visual quality; the founder judged the result too dashboard-like |
| `design-skills:design-elevation` | Yes (v2 only) | Yes (#2), v2 only | v2 JavaScript prototype | Spacing rhythm and restraint rules | **Not used this round.** It would be appropriate to apply it to the chosen direction before rollout (next step) |
| `design-skills:accessibility-audit` | Yes (v2 only) | Yes (#8) | v2 fixes; axe pipeline carried forward | Contrast fix, landmarks | The current scans are automated axe runs, not a re-invocation; a manual keyboard and screen-reader pass is still open |
| `design-skills:journey-mapping`, `design-skills:ux-writing` | Yes (v2 only) | Yes (#5, #6) | v2 film and Q's voice | Story arc; tone rules still used in copy | Not re-invoked this round |
| `design-superpowers:design` | Yes (v2 only) | Yes (#3) | v2 one-home model | Moments and lenses carried into Nocturne | Not re-invoked this round |
| `artifact-design` | Planned | Not yet | (publishing the live direction prototype) | n/a | Required before publishing a page; it is invoked at publish time |
| `design-superpowers:design-review`, `design:design-critique`, `design:accessibility-review` | No | No | n/a | n/a | They overlap with the critique and accessibility skills already used. Invoking them now would only pad this list. `design-review` covers design-system compliance and will be used after the system is rebuilt in the chosen direction. |
| `design-skills:ux-research`, `design:user-research` | No | No | n/a | n/a | Needed for real usability testing of the chosen direction (the J7 reviewer sign-off). There are no participants in this session. |
| `design:design-handoff`, `design-superpowers:ds-make`, `ds-manage`, `ds-producer`, `ds-consumer`, `map-design` | No | No | n/a | n/a | These apply once a direction is chosen and rebuilt as tokens and components |
| `design:ux-copy` | No | No | n/a | n/a | Overlaps with `ux-writing` (used) |
| `marketing:*` | No | No | n/a | n/a | Out of scope (campaigns, not product design) |
| Claude Design canvas (Artifact type) | Yes | Yes (Phase 1) | Three-direction board (Nocturne, Ledger, Atelier) | First exploration, now superseded by the working prototypes | n/a |
| Playwright + Chromium, ffmpeg with libass, axe-core (pre-installed tools) | n/a | Used | All screenshots, motion previews (captions in a separate band), accessibility scans | Evidence that every claim can be checked against | n/a |

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
