# Claude / Codex Design-First Production Directive for Talent Q

**Copy into the engineering/design coding-agent session AFTER adding the research pack to the Talent Q project.**  
**Task mode:** research reconciliation + product design + live prototype + motion proof. **NOT** unrestricted production backend implementation.

## Mission

Build a complete, editable and technically credible **Talent Q Design System and Experience Atlas**, using the founder's full product vision as binding scope. The aim is to eliminate ambiguity before implementation and give engineers working visual reference for every capability, including planned future features. No feature is silently dropped because it is too ambitious; mark it accurately as prototype/near-term/future/partner-dependent. The customer-facing brand is always **Talent Q**, gold as Q's primary identity, supported by deep charcoal and warm white.

Your first action is to open/read these materials in order:
1. `01_VISION_RESEARCH_AND_PRODUCT_EXPERIENCE_MASTER.md` (the master user promise and design requirements).
2. `04_FOUNDER_VISION_TRACEABILITY.csv` (every explicit founder requirement).
3. `02_COMPLETE_SCREEN_ATLAS.csv` (146 screen concepts and all visible states).
4. `03_MOTION_AND_VIDEO_ATLAS.csv` (41 named motion behaviors, events and reduced-motion alternatives).
5. `talentq-film.mp4` (4:33 audiovisual reference; use as creative reference, do not plagiarize frames).
6. Prior technical blueprint, investor/product brief and journey atlas as secondary sources; resolve contradictions in favor of the latest founder intent and this master specification, but flag material conflicts.
7. Connected `neo1415/q` integration branch `build/int-rc`: inspect only the Q/design/runtime capabilities relevant to this task. Respect the active engineering handoff and ongoing work; do not alter or redeploy Capital Q without permission.

## Skill-first requirement

Discover and use whatever **installed, documented** skills are actually available to this environment. If Figma MCP and its design skills are connected, follow its `figma-use` and design-generation prerequisite instructions, then produce a real Figma Design file using components, variables and responsive Auto Layout. If not, do not pretend to have uploaded to Figma. Produce a local exportable design system and **working React prototype** with named components and tokens, and mark Figma export as pending.

For interaction development, consult **Motion for React** and optionally its documented AI Kit; use CSS/Motion for standard state transitions, Rive only for interaction-driven gold Q presence when it provides genuine advantage. For presentation video, record working prototype journeys using browser capture/Playwright/FFmpeg or a documented recording capability. If the recording environment does not allow it, deliver scene-by-scene storyboards and working animation code, not fictional video deliverables.

## Non-negotiable objectives

A. **Build the design language**: semantic tokens (dark/light, gold, surfaces, typography), responsive grid, Q orb and its state inputs, layout/navigation, typography, controls, accessibility, content style, reduced motion, loading/empty/error/disabled/offline/approval states, zero generic glowing-AI cliché.

B. **Build the reusable components**: composer (text/voice/files/URLs), interview turn and caption, document/portfolio previews, candidate card, evidence badge/lineage, verification status, filter bar, role requirement card, rubric, candidate compare, Q plan/progress bar, run event timeline, approval sheet, modal, tray, artifact renderer, document editor, role-specific task panel, safe browser-viewer, agent task card, video/voice states, mobile bottom sheet, org policy inspector.

C. **Produce an editable experience atlas**: all 146 screens from `02_COMPLETE_SCREEN_ATLAS.csv` mapped to a Figma frame, component variant or annotated wireframe **with no exceptions**. Do not make 146 redundant full-design mockups. Make 30-45 distinct layouts as high-fidelity where justified and use component variants/annotated wireframes for closely related screens. Every entry gets a design URI or file path, and an explicit stage. For 8 golden journeys, provide full interactive desktop+mobile prototype flows, not mere static art.

D. **Design the 8 golden journeys**:
1) public intro → recruiter signup → Q hiring-intake → mandate approval;
2) recruiter search → partial results → evidence → compare → shortlist;
3) approved outreach → candidate answer → interview scheduling → pipeline state;
4) candidate import → profile confirmation → Evidence Passport → share controls;
5) candidate Explore Jobs → mutual fit → application → status/tracking;
6) interview preparation → Q-led text/form/voice modes → adaptive follow-up → evaluation;
7) live interview Q copilot → structured notes → recruiter coaching → candidate-permitted feedback;
8) Q multi-agent task → live true progress → artifacts → approval → error/resume.
All should use fictional, clearly labeled data. Include zero result, disconnected network, revoked consent, declined job, missing evidence, cost cap exceeded and assessment accommodation variants.

E. **Motion implementation**: for each of 41 records in `03_MOTION_AND_VIDEO_ATLAS.csv`, create event-to-UI storyboard frames, a trigger and the implemented transition or reproducible prototype. Use a strict contract: `eventType`, `payloadSchema`, `surface`, `componentState`, `motionVariant`, `reducedMotionFallback`, `captureId`. The Q orb must have discrete states: idle, listening, processing, speaking, paused, error, reconnecting, finished. Do not fake backend progress in production.

F. **Videos**: export 41 short state demonstrations where available (8-20 seconds each) plus **six narrative walk-throughs** using the real prototype: (i) recruiter 'hire by talking' 60-90 s; (ii) candidate CV-to-Evidence-Passport 45-75 s; (iii) job Explore and mutual fit 45-75 s; (iv) Q interview and Q feedback 60-90 s; (v) live co-pilot and role-specific work sample 60-90 s; (vi) multi-agent research and interactive artifacts 60-90 s. Distinguish what is implemented versus simulation, and put a simple 'concept prototype' watermark if simulated. Include captions and fixed seed data. Supply shot list and source state machine for every clip. A single marketing sizzle video is not adequate.

G. **Premium UX behavior**: minimize time-to-interaction. On input, show immediate accepted state and next usable UI; progressive data and eventual network result are separate. Use actual state transitions. Motion must not delay reading or controls. Put data-heavy tables in native components with virtualization as needed and keep mobile usable. Default body type should be legible (16px target); never below 12px on screen. Accessibility target WCAG 2.2 AA with keyboard focus, reduced motion, captions and low-bandwidth fallbacks.

H. **Developer handoff**: for each distinct screen, provide: route, actor, primary goal, responsive specification, required component(s), states, permission, API/query/command/event needed, fixtures, visual QA screenshots, and how to judge it. For each component, generate prop/event types. Package mock fixtures separately from production data. Demonstration UI may emulate APIs but must be conspicuously labeled and use the same eventual contracts. Preserve the Q core; no new unauthorized Q runtime.

## Anti-infrastructure-hell rules

- First deliver a visible *design slice*, not months of setup. Begin with Q Home, employer hiring-intake, candidate Explore, Evidence Passport, search/compare, Q interview, artifact canvas and multi-agent progress. These unlock the other variations.
- Build one design system, not separate ones for candidate, recruiter and agency. Compose variants from roles.
- No deployment, migrations, provider spend, purchased template or production secrets without explicit authorization.
- Don't redesign the core Q or rewrite the React runtime while designing Talent Q.
- Do not create a custom browser, SIEM, video engine or LLM abstraction as design prerequisites.
- Use no fake 'we are researching' phase in a shippable app; for demo state replay, label it simulated.
- Don't treat interview voice/avatar as mandatory; parity with forms/text is required.
- Every design assertion must be either backed by source, grounded in user brief, or labeled conceptual.

## Deliverable file tree (adapt to actual tools)

```
talent-q-design/
  README.md
  SOURCE-AND-VISION-COVERAGE.md
  EXPERIENCE-DECISIONS.md
  design-tokens/
  figma/ (file URL, frame atlas, variants, exports if connected)
  prototype/ (runnable UI with fictional data)
  screens/SCREEN-COVERAGE.csv
  motion/MOTION-COVERAGE.csv
  motion/STATE-MACHINES.md
  storyboard/ (visual frames and shot list)
  video/ (MP4 proof, captions and README)
  ux-research/ (competitor references, usability task scripts)
  quality/ (desktop/mobile captures, a11y and legibility review)
```

## Completion conditions and reporting

A design is not done when it looks beautiful. It is done when the flow is understandable without narration, controls respond, state transitions are real/prototyped, error/privacy/fallback modes exist and the implementation team has no unowned product decisions. Report three coverage percentages: vision IDs accounted for, screen entries designed, motion entries prototyped/recorded. Never label mocked states as backend integration.

**First-session deliverable:** a visual Design Direction Board (3 genuinely distinct treatments within the gold identity), a signed-off token set proposal, 8 golden-journey storyboards, and the first 8 prototype screens wired to mock events. Then proceed through the atlas systematically; don't waste time generating 146 disconnected decorative images before the first working flow.

## Essential reference material

Official Figma MCP tools: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/  
Figma structure/Code Connect: https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/  
Motion for React: https://motion.dev/docs/react  
Rive state machines: https://rive.app/features  
A2UI (reference, not mandated architecture): https://a2ui.org/  
ElevenLabs events: https://elevenlabs.io/docs/eleven-agents/customization/events  
Tavus events: https://docs.tavus.io/sections/conversational-video-interface/interactions-protocols/overview
