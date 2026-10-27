# Design skill and tool audit

This file records what was actually installed in this session (cloud container, 27 Oct 2026), what was used, and what each use produced. A skill is listed as used only if it was invoked through the Skill tool and its guidance changed the work. Nothing here is inferred from a skill's name.

## Used

| Skill / tool | When | Output it shaped |
|---|---|---|
| `design-superpowers:creative` | v2 redesign (pre-directive) | The "ambient presence" direction and the black and gold palette. Also the basis for the three directions in Phase 1. |
| `design-superpowers:design` | v2 redesign | The one-home model: moments for approval, lenses for detail. Carried into the TS prototype. |
| `design-skills:design-elevation` | v2 redesign | Type scale, spacing rhythm, the restraint rules (no card around everything, no gradients) |
| `design-skills:interaction-design` | v2 redesign | Q state machine (idle, listening, thinking, working, waiting, done) and the undo window |
| `design-skills:journey-mapping` | v2 film | The intertwined recruiter and candidate story arc used by the film |
| `design-skills:ux-writing` | v2 | Q's voice: short, specific, no hype. Approval and error copy. |
| `design-skills:design-critique` | v2 review | Critique log in `docs/DESIGN.md`, plus fixes (crowding, hierarchy) |
| `design-skills:accessibility-audit` | v2 review | Contrast fix (`--text-3` from 3.86 to 5.63:1), landmarks, the `h1` rule; axe-core scans |
| Claude Design canvas (Artifact type) | Phase 1 | Three-direction board at https://claude.ai/artifact/MmkpWffDt1d8FhAR9kTFZc, with six artboards (A Nocturne, B Ledger, C Atelier; desktop and mobile each) |
| Playwright + Chromium (pre-installed) | v2, continuing | Screenshots, flow tests, axe runs, screencast capture for video |
| ffmpeg | v2, continuing | MP4 encoding of captured frames |
| Subagent (general-purpose) | Phase 1 | `research/Q-REUSE-AUDIT.md`: a read-only audit of `neo1415/q` |

Skills that Phase 2 onward invokes are appended in the log at the end of this file as they are used.

## Available but not used yet, and why

| Skill | Plan |
|---|---|
| `design-skills:design-systems`, `design-superpowers:ds-make` | Phase 2 tokens and component specs |
| `design:design-handoff` | Per-screen contracts (directive §Engineering-ready) once screens exist |
| `design:accessibility-review`, `design-superpowers:design-review` | Phase 6 audit of the TS prototype |
| `dataviz` | J7 progress and comparison charts |
| `design-skills:ux-research`, `design:user-research` | Reviewer sign-off rubric for J7 (directive Track C) |
| `design-skills:ux-strategy`, `design-skills:design-ops` | Not needed for production work. Would be used only if the owner asks for strategy or process artifacts. |
| `marketing:*` | Out of scope (product design, not campaigns) |

## Present but unusable here

| Tool | Reason |
|---|---|
| Figma MCP and all `figma:*` skills | The plugin's Figma server fails with proxy 403 (ERR_PROXY_TUNNEL), and the founder has no paid Figma plan. The skills require that server, so none were invoked. |
| Canva, Notion, Slack, Linear, Asana, Intercom, HubSpot and other plugin MCPs | Same proxy 403. They are also not needed. |
| `design-superpowers:figma-setup` (PluginOS) | Needs Figma desktop. Not available in a cloud container. |

## Named in the directive but not installed

| Named | Status |
|---|---|
| "frontend-design" skill | Not installed. Its role is covered by design-elevation plus the design canvas. |
| "Motion skill" | Not installed. The `motion` (Motion for React) npm library is used directly. |
| Rive | Not installed and not needed (see EXPERIENCE-DECISIONS D4) |
| Graphify | Not installed. V40 is recorded as not used. |
| Image or video generation | None available. All visuals are code, and all video is a recording of the running prototype. |

## Log

- 27 Oct: Phase 1. Design canvas created with three directions. Registers generated. Q reuse audit received.
