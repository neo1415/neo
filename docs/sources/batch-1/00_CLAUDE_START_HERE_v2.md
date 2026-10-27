# TALENT Q | CLAUDE MASTER DIRECTIVE v2
## One prompt to launch research reconciliation, full design system, prototype journeys and demo recordings

**Paste this entire file as your first message to Claude Code (or attach and ask it to execute as the controlling instruction).** Attach the full `Talent_Q_Expanded_Design_Pack_v2.zip`, plus `talentq-film.mp4`, the product/investor brief, technical blueprint, market study and user journey atlas. Link the accessible `neo1415/q` repository. This document **supersedes** the original `05_CLAUDE_DESIGN_FIRST_MASTER_DIRECTIVE.md` where revised. It does not discard any old requirements.

---

You are the Talent Q design and experience lead, UX researcher, senior frontend engineer and system architect. You are building a practical, working **design foundation and clickable prototype**, not generating decorations. The founder's long-range vision is binding product scope, while the MVP build order remains selective. The brand is always **Talent Q** (with a space). Gold is its central identity, with carefully chosen near-black/white support and at least 12px for any onscreen text. Public positioning must stand independently of Capital Q; code reuse is internal only.

**What must happen in this engagement:** audit the complete prior founder vision against every source, incorporate Addendum 08's new Scheduling/Correspondence, J7 Career Intelligence and Q Memory/Cross-Session Context priorities, inspect reusable Q capability boundaries, design *the complete product*, and deliver a version-controlled, usable component system, linked screen map, interactive prototypes and captured motion/video demos. Do not quietly discard difficult capabilities. Treat unknown capabilities as named research questions and partner dependencies.

## Step 0. Read the source pack, then reconcile before generating art

Read:
1. `08_ADDENDUM_SCHEDULING_J7_MEMORY_AND_TOOLING.md` (this adds highest-priority detail).
2. `01_VISION_RESEARCH_AND_PRODUCT_EXPERIENCE_MASTER.md` (complete prior founder vision, 8 journeys, 7 families).
3. `04_FOUNDER_VISION_TRACEABILITY_v2.csv` (all original + added vision requirements).
4. `02_COMPLETE_SCREEN_ATLAS_v2.csv` (all original 146 screens plus new candidate career, scheduling, communications and memory concepts).
5. `03_MOTION_AND_VIDEO_ATLAS_v2.csv` (all original 41 motions + newly required animations).
6. `07_VIDEO_STORYBOARD_AND_VISUAL_REFERENCE.md` and `talentq-film.mp4` (creative inspiration, not a frame-by-frame copy).
7. `06_DESIGN_SCOPE_AND_NEXT_RESEARCH.md` plus the prior brief, technical blueprint, market report and user journey atlas.
8. `neo1415/q`, **latest active integration branch first**. Read root `CLAUDE.md`, `docs/ai-handoff/START-HERE.md`, the newest status/handoff, and actual implementation of `q-runtime`, `q-orchestrator`, `q-firewall`, `q-core`, `q-tools`, model gateway, Q events and artifacts. Do not infer today's deployed features from older `main` branch README. Do not commit/redeploy/change this existing product without owner permission.

First produce `SOURCE-AND-VISION-COVERAGE.md`: map each source, revision, conflicts, founder requirement ID, user journey, screen IDs, design artifact, backend dependency, provider dependency, and outstanding evidence. **Do not delete a row** simply because it cannot ship immediately.

## Tool choice: do NOT make paid Figma a dependency

- Inspect your *actually installed* Claude tools/skills. Use `/design`, Claude Design/Artifacts, frontend-design guidance, browser automation, available video/capture tools, Motion skill, etc. only if present and supported. Do not hallucinate a named skill or report an artifact created when none exists.
- The founder has **no paid Figma plan**. Figma Starter permits drafts but has strict MCP access and write-to-canvas restrictions. If the account cannot write real components, **use a code-first design system as the source of truth**, not a fake Figma URL.
- Implement **React/TypeScript**, responsive components, named CSS tokens, meaningful component variants and a runnable local prototype. Prefer the existing stack conventions where appropriate. Use Motion for React for UI transitions and optional Rive only if it meaningfully improves the Q state machine.
- Use Claude Design/Artifacts for interactive concepts and aesthetic review; export or replicate the accepted work in the repository. A Claude artifact is not a substitute for version-controlled implementation or backend contracts.
- Record demonstrations from the *working prototype* using browser recording/Playwright+FFmpeg or available equivalent. Provide actual MP4 files and state-machine source; if capture isn't possible, label this as blocked and provide executable reproducible captures and storyboards. Never invent a video file.

## Product structure and the experience to convey

- Two complementary user worlds: **Employer/Recruiter/Agency** and **Candidate/Professional**, connected by one Q conversation and permissioned matching intelligence.
- The same Q handles text, forms, voice and optional video; voice is never mandatory and cannot be the only accessible path.
- Q proactively interprets roles, asks context-aware clarifications, adapts to answers, uses versioned organization/recruiter/candidate instructions, browses permitted sources, produces relevant artifacts, evaluates evidence, and coordinates bounded parallel tasks.
- Org rules must be **resolved before each relevant read, message draft, assessment, send or workflow**, with correct policy precedence. Files and external pages are untrusted evidence; uploaded instructions are reviewed and assigned explicit authorized scope.
- Q must not lose valid context after page navigation, refresh, reconnect, restart or parallel agents. Use state checkpoints, scoped durable memory, provenance, user correction, expiry/revocation and compact retrieval. Don't falsely promise perfect recall.
- Q makes useful visuals: comparison tables, work previews, candidate cards, CVs, role maps, structured interview plans, annotated project evidence, graphs and occasional video. The format should be selected based on the actual question and evidence; use safe typed renderers, not arbitrary generated client code from untrusted sources.
- The interface gives an **immediate useful acknowledgement** and real event-backed states throughout work: preparing, searching, reading, extracting, comparing, awaiting approval, sending, confirmed, partial result, failed, retried and resumed. No fabricated progress events or hidden thinking disclosures.

## The four **non-negotiable deep-dive tracks**

### Track A: Q memory/context (design and contracts)

Design a complete Memory/Context product including live thread checkpoints, conversation history, generated context packs, versioned preferences and organization rules, provenance-linked entity knowledge, episodic task records and human-reviewed model evaluation learning. Specify what may be learned, how long it's kept, permission and tenant scope, user view/edit/delete controls, conflict resolution and invalidation. For each retrieval, separate current prompt, authorized factual context, knowledge source, and inference. Build demos of: Q recalling a recruiter preference next session; correcting a wrong memory; remembering an agreed question plan; an interrupted research task resuming; private candidate practice remaining undisclosed; revoked permission immediately making past facts unavailable.

If Graphify is installed, use its graph to inspect code/docs dependencies and compare with `neo1415/q`, not as Talent Q's production memory. Obsidian-style node and backlink visualization may inspire an optional human-facing knowledge inspector; do not use an Obsidian vault as production storage. Reuse the **existing** LangGraph components/checkpointers if appropriate. Do not install a redundant orchestration framework.

### Track B: Recruitment scheduling and correspondence, end to end

Design recruiter calendar connection, available-hours setup, panel assignment, preference alignment, cross-zone proposal, candidate selection/counteroffer, provider availability recheck, event commit, confirmations, automatic but authorized follow-up, reminders, reschedules, cancellation, rebooking, and CRM/pipeline update. Prototype Google/Outlook integration states, no authorization/revoked authorization, busy conflicts and fallback-to-email/text. Messages obey org communication policy, opt-ins and approvals. Candidates should never see recruiters' private event details. Demonstrate this journey independently as a **complete clickable flow** and a video.

Include safe and accurate provider research: Google Calendar FreeBusy/events, Microsoft getSchedule/findMeetingTimes, email connectors, SMS/WhatsApp messaging, optional calls. WhatsApp outbound calling is **not universally eligible**, including restrictions on business senders based in Nigeria. Provider limitations must be surfaced in UI and fallback plans. Simulate unavailable providers honestly; never send actual mail during design.

### Track C: J7 Career Intelligence and Development, first-class product

**J7 from the original master = candidate career development**. Treat it as an entire first-class design area, not one page. Develop separate journeys and screens for career goals, career-role routes, skill/evidence gap explanations, personalized practice, bite-sized role-specific learning, helpful coaching, project and CV improvements, competency demonstration, reassessment, progress and changing career interests. Cover graduate, career switcher and specialist user journeys at high fidelity, with separate private practice versus shared hiring evidence; no universal 'human talent score'. Include concrete assessment/rubric design and how progress is measured reliably, not just decorative charts.

Design a **Career Q** loop: `Goal -> baseline evidence -> role gap -> practical plan -> practice -> useful feedback -> new evidence -> reassessment -> job opportunity -> repeat`. External courses may be linked, but full LMS infrastructure is not required for MVP. J7 needs its own storyboard, its own 3 working prototype paths, and a standalone reviewer signoff.

### Track D: Q agent and artifact workspace

One Q with modular specialist tasks, bounded parallel reads, source-backed results, budget controls, explicit action receipts, pause/cancel/resume and editable generated artifacts. Design desktop and mobile views for safe web/project viewer, evidence cards, candidate comparisons, diagram/table/document/image/video artifacts, agent state timeline, approvals, failures, progress and learning from user corrections. Show 'what Q knows' with sources, corrections and privacy controls. All flow animations have reduced-motion fallback and actual state triggers.

## Design scope and production order

- Complete **screen coverage** for every entry in the v2 atlas. Coverage can be a real high-fidelity screen, composable variant or annotated wireframe, but must be linked to its source ID; do not fake compliance with empty frame labels.
- Implement the **first 12 usable screens**: (1) Talent Q home/Q composer; (2) employer first-run and org policy; (3) recruiter mandate intake; (4) Q sourcing/progress; (5) candidate comparison/evidence; (6) recruiter outreach approval; (7) calendar connection and recruiter preferences; (8) candidate proposal/slot-picker; (9) candidate evidence passport; (10) career intelligence home and role map (J7); (11) adaptive interview room (text/form/voice parity); (12) Q memory review and correction.
- Then implement complete **golden paths** for: recruiter mandate→match, candidate intake→evidence, outreach→scheduling, employer interview→feedback, candidate role explore→application, candidate J7 graduate, candidate J7 career switcher, candidate J7 specialist practice, Q cross-session memory correction, multi-agent research/artifact, accessibility/low bandwidth, conflict/error recovery.
- Use cohesive black/gold/white design, typography hierarchy, warm and restrained motion, deliberate empty space, meaningful graphics, dark/light if beneficial, 16px target body text, 12px hard minimum, no gradients unless there is a specific rationale. Avoid cards around every element and glowing AI cliché.
- Capture **all** motion atlas entries as reproducible UI states; for key behaviors provide short MP4 clips if recording works. Make **eight narrated or captioned narrative captures** including dedicated scheduling and J7 films. Use synthetic examples and watermark simulations.

## Engineering-ready design contracts

For each route/screen: `screenId`, user goal and actor, permissions and tenant, states, fields/forms, source/evidence needs, query/command and response shapes, domain event types, canonical object ownership, responsive behavior, accessibility, motion triggers, output artifacts, provider dependencies, failures and recovery, fixture test and review rubric.

For each Q run display: define typed run events and sequencing; SSE or resumable stream contract; reconnect cursor; canceled state; cost approval; partial data; safe caching, per-scope invalidation and optimistic UI boundaries. No unnecessary model calls or database round trips just to render UI.

For memory: memory candidate and write gate, provenance, visibility, TTL/retention class, conflict versions, retrieval source and correction. For scheduling: request/slot/proposal/event/receipt/message templates and authorization. For J7: goal, competency definition, rubric version, practice attempt, permitted coaching evidence, work sample, improvement claim and sharing status.

## Protect scope and product delivery

This is **a product, not an infrastructure experiment**. Do not require an actual external scheduling provider, production Graphify, custom memory DB or video renderer to produce the design slice. Reuse packages/code. Start a separate design worktree/repo; no merges to Capital Q without review. Build visible functionality before framework additions; targeted tests for the flows and permission invariants, plus representative viewport screenshots. Parallel agent work only after stable shared contracts and design tokens; one owner for shared files.

Never claim unsupported external API access. Do not create a second Q, execute arbitrary downloaded code, reveal personal calendar events, message people without permission, or publish candidate learning/private artifacts by default. Human review is required where hiring decisions, fairness or irreversible effects demand it.

## Expected file tree and proof of completion

```
talent-q-design/
  README.md
  decisions/EXPERIENCE-DECISIONS.md
  research/SOURCE-AND-VISION-COVERAGE.md
  research/PROVIDER-CAPABILITY-MATRIX.md
  research/J7-CAREER-INTELLIGENCE-SPEC.md
  research/SCHEDULING-AND-CORRESPONDENCE-SPEC.md
  research/Q-MEMORY-AND-CONTEXT-SPEC.md
  tokens/
  prototype/                        # runnable React/TypeScript application
  components/                       # source-controlled interactive design system
  screens/SCREEN-COVERAGE.csv
  motion/MOTION-COVERAGE.csv
  motion/STATE-MACHINES.md
  artifacts/ARTIFACT-CONTRACTS.md
  contracts/                        # proposal types, event types, mock fixtures
  storyboards/
  captures/                         # actual screenshots / video files if possible
  qa/ACCESSIBILITY-AND-UX-REPORT.md
  qa/VIDEO-CAPTURE-REPORT.md
```

A screen is NOT done because it has a title. It is done when a reviewer can open it, understand what it is for, perform the interaction, see failure states, and trace the intended server/AI contract. A video is NOT done because a storyboard mentions one. Completion requires reproducible recorded output, or an explicit blocker and reliable capture script.

## First-session output and continuation

**First session:** deliver an annotated design direction board (three gold-consistent alternatives), the starter tokens/components, a working 12-screen navigable prototype with real mocked events, J7/scheduling/memory mini-journey maps, and the coverage dashboard. Do not spend the entire first session writing architecture papers. If time/tool limits prevent all twelve, deliver the working portion, report the exact percent and next concrete task, and continue in subsequent sessions. Do not claim unfinished scope is complete.

After the first usable slice, work systematically through the remaining screens, variants, animation demos and case studies. Show measured progress rather than vague status updates. Preserve all founder requirements in the vision register and distinguish concept, prototype, integrated and production-certified states.

**Start now with the source audit, the design direction and the first working prototype. No production integration, paid spending or Capital Q changes without owner authorization.**
