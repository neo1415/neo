# Talent Q | Vision completeness, product research and experience master specification

**Edition:** 27 October 2026  
**Status:** Discovery and design specification, not implemented behavior  
**Product name:** Talent Q  
**Audience:** Product owner, research/design agents, engineering lead, interview specialists, privacy reviewers

## Executive decision

Do not shrink the founder vision to the MVP. **Preserve the entire vision in one traceable inventory, but build progressively.** The MVP, design atlas and ultimate platform are three different views of the *same* product. Nothing is cut because it is difficult; a feature can be planned, research-gated or partner-dependent. Every design must distinguish a working product state from a proposed future capability.

Talent Q is a global, two-sided recruitment and professional-growth platform: employers find talent through Q; candidates use Q to demonstrate what they can do, secure employment and improve. Q is a persistent, multimodal, evidence-aware, permission-governed operating interface, not merely a chatbot embedded in an ATS. Q should be capable of researching, comparing, viewing evidence, proposing questions, interviewing, drafting, collaborating, coordinating communications, generating interactive artifacts and executing approved tasks. Users can always choose **voice, text, or structured controls** where practical.

The experience reference video suggests a premium visual system: dark canvas, warm gold orb, careful serif headlines, minimal chrome, human-scale conversational copy, progressive recruitment research, mobile/desktop coordination. The reference shows *what to achieve emotionally*, not an instruction to reproduce its exact scenes or hide missing features behind animation. Every progress state must correspond to a real backend event.

## 1. Findings from audit of existing materials

Three PDFs and the starter pack were inspected directly. Word-frequency checking is crude but revealing, and a content read confirms these findings.

| Area from founder vision | Complete investor brief | Technical blueprint | Starter feature atlas | This document addresses |
|---|---|---|---|---|
| Core hiring and candidate journeys | Reasonable high-level | Technical flows | Listed | Detailed journey and state ownership |
| Q as a general multi-domain intelligence | Mentioned | Partial architecture | Listed | Capability matrix, interfaces and constraints |
| Adaptive interview plans and context-specific follow-ups | Insufficient detail | Limited | Listed | Question planning, branching and evaluation |
| Organization/person policies that Q always checks | Underdeveloped | Mentioned | Listed | Versioning, precedence, invalidation and UI |
| Evidence from uploads, links, project viewers and work proofs | Shallow | Partial | Listed | Permissioned evidence graph and safe previews |
| Candidate portfolio vault, sharing, verification | Shallow | Partial | Listed | End-to-end candidate flow and share controls |
| Recruiter/nontechnical expert interpretation | Underspecified | Underspecified | Listed | Evidence-to-plain-language explanation |
| Live Q interview companion and recruiter coaching | Little detail | Little detail | Listed | Live assist, consent and feedback states |
| Voice/text/forms parity and accessibility | Partial | Partial | Listed | Channel-equivalent state designs |
| Multichannel email, WhatsApp, SMS, calling | Mostly absent | Mostly absent | Listed | Channel availability/consent/error states |
| Dynamic charts, UI artifacts, images, animated diagrams and video | Almost absent | Limited | Listed | Artifact grammar and motion storyboard |
| Agent autonomy, multi-agent work, long tasks and progress | Broad mentions | Partial runtime | Listed | Event-driven execution and UX states |
| Performance, prompt caching and learning from outcomes | Broad mentions | Partial | Listed | Cost/latency policy and learning safeguards |
| Cross-profession ranking, skills and assignments | Broad mentions | Early scoring | Listed | Skill-specific rubrics, no universal person-score |
| All screens and high-fidelity video design instructions | Missing | Missing | Missing | Comprehensive screen and motion atlas |

**Truthful conclusion:** No, the earlier PDFs did not fully capture this vision. They form useful business/technical references, but they are not a comprehensive experience specification. The previous Feature Atlas was a useful 60+ row checklist, not enough to direct the visual design of every screen.

## 2. Research method and source reliability

This edition cross-references primary product documentation, technical standards and publicly described competitor capabilities. It is a **targeted, verifiable research foundation**, not a claim to have personally logged into every paid platform or interviewed real candidate cohorts. Product behaviors can vary by plan, market and date. Evidence labels: **Documented** = vendor/standards documentation; **Observed** = supplied demo video or current code inspected; **Hypothesis** = proposed Talent Q solution; **Requires validation** = usability, fairness, costs, vendor eligibility or actual customer demand untested.

### Research questions required before approving a feature family

For each area, research in this order: (1) who is the user; (2) what event starts the need; (3) what outcome matters; (4) current workflow and drop-off; (5) existing products' exact screens and limitations; (6) permissions/regulation; (7) failure and no-data states; (8) mobile/offline/accessibility; (9) cost and latency; (10) measurable success. Save screenshots, source links, date checked, and competitor restrictions. Never claim a capability is absent merely because its landing page did not mention it.

## 3. Competitive design and implementation patterns worth borrowing

| Category | Existing evidence and implication | Talent Q design principle |
|---|---|---|
| Conversational sourcing | LinkedIn's Hiring Assistant 2 documents richer reasoning, memory and sourcing. Search-by-conversation is no longer differentiation [S01]. | Q's entire hiring mandate should stay coherent when requirements change, with explicit evidence and corrections. |
| Interview capture and coaching | BrightHire describes real-time interview guides, AI notes, coaching [S02]. Metaview supports templates, source-enriched summaries and ATS sync [S03]. | Live companion is a first-class journey but must not pretend to be novel. Make feedback useful, consensual and role-related. |
| Practical assessment | CodeSignal offers realistic practice formats [S04]; specialist platforms already support tests. | Orchestrate work samples or partner environments before building bespoke IDEs or SIEMs. |
| Dynamic generated interface | Google A2UI documents streaming declarative UI with bounded component catalogs [S05]. Vercel AI SDK supports streamed tool/UI parts [S06]. | Use a **typed, allowlisted artifact contract**. Models suggest layout and content; browser renders validated native components. |
| Motion | Motion for React supports shared-element layout transitions and interruptible animation [S07]. Rive provides state machines driven by inputs [S08]. | Use CSS and native Motion for interfaces; Rive for Q's purposeful state machine only if needed; no video-coded functional UI. |
| Figma agent workflows | Figma MCP supports editable frames/components, code-to-design, variables, Code Connect and design system tools [S09]. | Claude should create an editable design system and interactive prototypes, not only screenshots. |
| Real-time AI presence | Tavus publishes CVI and live interaction events [S10]; ElevenLabs publishes turn/interrupt event controls [S11]. | Voice and video are adapters to the same interview/run state, with text/form fallback. |
| WhatsApp calling | Twilio documents business calling and permission limits [S12]. | Show channel eligibility; never promise unapproved calls. Email/SMS/WhatsApp share a consented intent, not a universal send API. |
| Hiring evaluation | EEOC emphasizes job-related validated assessments and accommodation [S13]; EU AI Act classifies some recruitment systems as high-risk [S14]. | Assess role-specific evidence, not social-worth, emotions, looks, accent, personality speculation or protected traits. |
| Model and app risk | NIST AI RMF offers a method for evaluation and governance [S15]. | Scoring, inference, model behavior and permissions must be observable, versioned and correctable. |

## 4. Who the application must serve

**Employers:** solo founder, occasional hiring manager, nontechnical recruiter for a technical role, specialist technical assessor, HR generalist, enterprise talent-acquisition lead, high-volume recruiter, recruitment agency owner, team member/interviewer, compliance admin.

**Candidates:** active experienced applicant, graduate/no work history, passive professional, career switcher, gig/contract worker, remote/global applicant, low-bandwidth/mobile user, candidate requiring accommodations, candidate managing work samples privately, rejected candidate seeking constructive development.

**Q roles:** conversational guide, hiring-intake analyst, evidence librarian, source researcher, candidate fit explainer, interview conductor, practice coach, task coordinator, artifact author, policy-aware communications assistant. These are **skills of one Q**; they do not require multiple visible assistant personas or permanent dedicated models.

## 5. Full journeys and adaptive intelligence

### J1. Employer states a vague need
1. Employer says 'I need a cybersecurity person.' Q checks organization policy, mandate access and any reusable organization definitions **before** creating a plan. 2. Q asks only missing, high-value questions (SOC monitoring vs pentesting; location/remote; shifts; expected experience; pay; urgency). 3. Q presents an editable, structured mandate with must-have, nice-to-have, business purpose, budget/unknown, draft interview plan and assumptions. 4. Employer can upload a JD, a question pack, a link, or a voice note. Q reconciles inputs without silently overwriting facts and shows a comparison. 5. Employer approves the mandate. 6. Q begins authorized sourcing; the view streams factual progress events and candidate cards as evidence arrives. 7. If results are thin, Q explains trade-offs and suggests a feasible revision rather than inventing people.

### J2. Nontechnical recruiter assessing technical talent
1. Recruiter opens a role, candidate project link or uploaded artifact. 2. Q fetches safely where permitted and inspects relevant code/repository/sample without executing arbitrary programs in the trusted origin. 3. Q returns: plain-English project summary; what is demonstrated; what is not demonstrated; authenticity/verification status; interview questions and a work-sample recommendation. 4. Recruiter may ask 'Explain that more simply' or 'Show me the part of the repository proving this.' 5. Qualified specialist reviews material where necessary. **Do not assert competence from repo stars or an LLM impression alone.**

### J3. Candidate onboarding and reusable portfolio
1. Candidate may start with CV, link, form or Q interview. 2. Q extracts claims with confidence/source, requests confirmation for material facts, keeps unknown unknown. 3. Candidate uploads certificates, visas/permits, links, work samples, experience proofs and portfolio projects; each item carries owner, sharing scopes, expiry/revocation, authenticity and verification state. 4. Candidate chooses public discoverability, anonymous interest, employer-specific share, or private. 5. Explore recommends opportunities based on *declared* preferences and permitted professional evidence, never extrapolated sensitive traits. 6. Candidate can request CV or tailored cover letter and receive editable artifacts grounded in confirmed facts. 7. Candidate can request critique and learning guidance privately. 8. Candidate can revoke shares, correct data, export or request deletion.

### J4. Adaptive Q-led interview (text, form or voice/video)
1. Q resolves the employer's versioned interview policy, job competencies, mandatory questions, user-selected mode and candidate accommodations. 2. Q constructs a **question plan**, not a rigid script: competency, question, evidence required, follow-up logic, maximum time, prohibited areas. 3. Q asks each mandatory question exactly as required if wording is locked; optional probes clarify contradictions, shallow examples, missing technical steps or changed answers. 4. Q does not repeat a question already answered adequately; it explains when a clarification is needed. 5. Candidate can request repetition, accessible alternative, pause/resume where permitted, or human review. 6. Q records observable answer evidence and unanswered competencies, not inferred personality. 7. Recruiter gets an explainable rubric and recordings/transcripts only where consented; candidate receives approved status and permitted feedback. 8. Candidate practice uses the same domain skills but **a separate private evaluation record**.

### J5. Live interview with human and Q
1. Recruiter schedules a call and receives candidate notice/consent options. 2. Q joins or observes only through an authorized integration. 3. Live dashboard shows role rubric, covered/uncovered topics and optional suggested follow-ups; Q never interrupts unless invoked or specifically enabled. 4. Q captures evidence-linked notes and unresolved questions. 5. Recruiter edits and confirms observations. 6. Post-call Q prepares recruiter feedback on questioning quality, candidate evidence and next steps. 7. Candidate feedback is separately approved and scoped; no private panel notes are accidentally exposed.

### J6. Persistent recruiting campaign
1. Recruiter saves a mandate, eligible sources and spending/outreach budget. 2. Q creates tasks (source, normalize, verify, shortlist, contact, follow-up, schedule, report) with explicit dependencies. 3. Independent reads run concurrently; actions that send or expose data require approval or an explicit, tightly scoped delegation. 4. Tasks emit accepted/running/source-found/analysis/awaiting-approval/completed/failed events with real timestamps. 5. Recruiter can interrupt, revise search, pause, resume or revoke. 6. Agents deduplicate work and preserve context, while permissions are rechecked at execution time. 7. Failures are recoverable and shown honestly, with partial useful results.

### J7. Candidate career development without a full LMS
1. Candidate explores role, sees job-related skill evidence and missing proofs. 2. Q recommends bite-size learning linked to concrete competency gaps; resources may be external videos/course chapters with accurate link provenance. 3. Candidate practices, receives actionable coaching based on answer quality, completeness and observed reasoning. 4. Later evidence and separate assessments can demonstrate improvement. 5. Recruiter-visible evidence must be knowingly shared; private learning does not silently lower a person's hiring ranking.

### J8. Talent ranking without a universal social score
For a particular role, show **fit components and confidence**: essential competency evidence, relevant work outputs, verified credentials, experience scope, mutually stated preferences and unknowns. Weightings differ between roles and are reviewed by qualified subject experts. Avoid cross-industry overall leaderboards that call one human 'better' than another. A candidate may be top-ranked *for this named mandate* while still having unresolved verification.

## 6. Every feature family and its required interaction contract

The canonical CSV feature inventory gives 100+ individual entries with ID, actor, flow, status, evidence requirements and design treatment. Every implementation must include four controls where applicable: (a) user can understand source/evidence, (b) user can correct or withdraw, (c) accessible text alternative, (d) server-authenticated actions. The future vision remains in the inventory even when deferred.

**F1 Identity, onboarding, organization:** candidate account, employer account, agency accounts, roles, teams, terms/consent, locale, notification and communication preferences, user instructions, employer standards, uploaded guidelines, CV import, profile confirmation and correction.

**F2 Demand and supply:** hiring intake, roles, open mandates, Explore jobs, Explore talent, saved searches, candidate matching, mutual fit, recommendation explanation, source freshness, evidence provenance, passive interest, applicant tracking, candidate privacy and portfolios.

**F3 Evidence and credentials:** upload/parse/search work samples, certification and work-permit vault, expiry, source validation, verification partners, GitHub or personal projects, safe link viewer, excerpts, video proof, assessment history, selective employer sharing, audit of access.

**F4 Interviews and practice:** Q question planner, recruiter-uploaded question banks, required-versus-adaptive follow-ups, voice, text, form and live video, accommodations, candidate mock practice, role rubrics, live interviewer copilot, post-interview assessments, recruiter coaching, candidate feedback, specialist tasks, coding/cyber/sales/customer-service simulations, provider connectors.

**F5 Agents and execution:** task intents, plan/approval view, bounded parallel experts, background tasks, artifact creation, source research, web browsing, safe downloads, emails, WhatsApp/SMS, eligible calling, calendars, reminders, drafts, campaigns, pipeline synchronization, CRM/ATS integration, traceable actions and retries.

**F6 Artifacts and expression:** Q presence/orb, message, rich tables, comparison matrices, CV/letter builder, animated interview plan, flowcharts, skill radar charts (careful about interpreting axes), job-market charts, maps, downloadable PDFs, evidence viewer, dynamic forms, work previews, diagrams, explanatory images, optional narrated video, high-fidelity and reduced-motion versions.

**F7 Governance:** permissions, policy precedence, source licensing, user-consented memory, deletion/retention, fairness checks, assessment validity, explainability, breach controls, communication consent, price ceilings, agent budgets, identity verification, region-specific obligations.

## 7. Q intelligence: implement as layers, not prompt magic

### 7.1 Authority and policy resolution
Order: platform safety/legal rules > jurisdiction/regulatory requirements > consent/access rights > approved organization rules > approved hiring mandate or assessment policy > person-level preferences > current authorized instruction. Conflicts surfaced rather than silently ignored. **Every action and question-planning request receives a resolved policy snapshot** with version and scope; if unchanged it may be securely cached and reused. Changes invalidate derived plans and relevant cache keys. Never send an entire organization knowledge base to the model per turn.

### 7.2 Context and memory
Store facts separately from Q inferences, guesses, short-term working context, archived documents and permissions. The write gate validates provenance, meaningfulness, scope and user correction. A candidate's private practice, employer feedback, open web content and one recruitment outcome are not interchangeable training data. Organization-specific knowledge must remain tenant-isolated.

### 7.3 Task plan and multi-agent delegation
A run graph contains goal, subtasks, dependencies, eligible tools, input scopes, budget, deadline, approval class, retry rules, checkpoint and streamed progress. Parallelize safe independent research tasks only. Agent subcalls have a concurrency and spend budget; duplicate source fetches collapse into one shared read. Agents cannot self-grant tool permissions or override outreach approvals. An unsatisfied task returns an honest limitation and partial result, not a fabricated success.

### 7.4 Dynamic question generation
The question planner maps role competencies -> mandatory/questions -> candidate evidence -> uncertainty -> candidate answer -> follow-up decision. A 'need-to-ask' predicate is a deterministic/checkable combination of missing evidence, conflict, rubric coverage and permitted follow-up count. LLM drafting can generate candidate-specific probes, but a validator checks relevance, duplication, prohibited topics, timing and output schema. Locked uploaded questions retain exact text and ordered constraints.

### 7.5 Evaluations and continuous improvement
Improve **retrieval relevance, prompt/tool choice, question coverage, candidate experience, factual grounding, source freshness, performance and validated job-specific predictive utility**, not model personality by absorbing unfiltered chats. Collect explicit feedback and observable task metrics with consent, hold out evaluation cases, version changes, compare baselines, monitor fairness and roll back regressions. Do not self-train live user data invisibly; first deliver retrieval-plus-evaluation and human-reviewed improvements.

## 8. Performance, economics and perceived responsiveness

**Fast path**: local UI state -> cached authorized read -> indexed database retrieval -> deterministic filtering/ranking -> streamed explanation when needed. No model call for sorting, navigation, pagination, status reads or a simple filter. Avoid N+1 candidate queries by grouped read projections and batched claims. Use stable keys for derived caches: tenant, actor scope, role, policy version, evidence revision, match method and query. On permission change, invalidate and reauthorize.

**Expensive path**: long research, tool orchestration, summarization, transcription, video interviews, image or video generation. Queue and checkpoint, stream source-backed stage transitions, allow partial results, enforce caps and fallbacks, trace latency/cost by task. Provider prompt caching should use stable versioned prefix and compact dynamic context; validate actual cache hit rates, since they vary by provider and prompt structure.

**Proposed test targets, not measured guarantees:** immediate clickable UI feedback (<100 ms on capable devices); first accepted run event <300 ms on normal network; cached search result <1 s p95; first relevant candidate group visible within a few seconds if local index warm; streaming first useful response under 2 s p95 in common path; slower remote discovery must show true events, never a fake completion meter. Test on Lagos 4G and lower-end Android, not only fast developer Wi-Fi.

## 9. Visual direction from supplied 4m33s film reference

**Observed motifs:** black near-void canvas, restrained small warm-gold luminous orb, generous negative space, central serif headline, restrained UI panels and tiny accents, deliberate fade/dissolve, quiet desktop-to-phone story, understated research progress, smooth reflow between proof screens, no busy gradients. The film is an *aspirational concept*, not proof of a shipped interface or provider capability.

**Design risk:** the demo uses very small on-screen text. Production must be markedly more readable, with body text at least 16px where possible, clear contrast, focus indicators and reduced-motion support. Gold shouldn't be used for every element or for large low-contrast text blocks. A text or form user should never be forced into voice/video to access features.

**Design language:** gold represents Q; deep charcoal and warm whites support it. Do not copy existing Capital Q screens blindly. Components need semantic tokens, responsive layouts, explicit loading/empty/error/permission states and purposefully restrained motion.

## 10. Information architecture to design before coding

Global: landing / role choice / sign-in / onboarding / Q Home / Inbox / Saved / Tasks / Notifications / Settings / Help / Privacy Center.

Employer: organization setup / policy studio / team and roles / mandates / mandate builder / Explore Talent / search results / candidate detail / side-by-side compare / evidence inspector / shortlist / sourcing agent / campaigns / outreach approval / inbox / interview plan / interview room / live copilot / scorecard / pipeline / offer handoff / reports / subscriptions.

Candidate: onboarding / confirm extracted CV / Evidence Passport / document vault / share settings / public profile preview / Explore Jobs / job detail / Q fit explanation / applications / invite response / interview readiness / practice studio / practice feedback / Q-led interview mode chooser / work samples / skill bridge / CV and letter builder / privacy center.

Agency: client organization selector / isolated client mandates / permission-controlled candidate relationships / submission approval / placement tracking / reports.

Q: chat+voice room / current run tray / plan approval / source panel / artifact canvas / documents editor / visualizer / browser-safe viewer / call handoff / tool activity and evidence receipts / background tasks / model or service failure response.

Design production must cover the **screen inventory CSV** with desktop and mobile variants. A unique full-size frame is required per distinct layout; reusable variants may be component instances. Never respond with 100 near-identical wallpaper screens.

## 11. Motion/video principles: real UI first, filmed proof second

Motion categories: Q orb/presence; task state events; navigation continuity; candidate card arrival; evidence opening; comparison morph; streaming form generation; voice turn states; interview question transitions; work-sample preview; multi-agent summary fan-in; approval receipt; cross-device handoff; graceful reconnect; declined action and error; document export. The animation register identifies expected source event, fallback, desktop/mobile, reduced motion and demonstration shot.

Deliver **live editable prototypes and reusable motion components** first. Then create short demonstration videos by recording those real prototypes with controlled mock data. Do not pay for generated video merely to simulate an interface that could be rendered by the browser. Generated narrative video is optional for marketing, not a replacement for product UI source code. Motion for React/Rive/CSS should share semantic state definitions; video should show the implemented transition, not invent a different one.

## 12. Evaluation framework for interview questions and scores

Separate:
- **Evidence completeness:** fraction of role competencies supported by reviewable evidence (not candidate worth).
- **Evidence quality:** rubric anchors linked to observable behavior, conditions and reviewer confidence.
- **Interview coverage:** required questions addressed versus remaining; adaptive probes justified by concrete gaps.
- **Work-sample validity:** task relevance to real job activities, consistent administration and human review.
- **Communication effectiveness:** clarity and structure only when genuinely essential to the role, with accessibility allowances.
- **Candidate experience:** completion, fairness perception, time burden, consent clarity and helpful feedback.
- **Recruiter interview quality:** question coverage, redundancy, interruption patterns and agreement with approved rubrics. No emotional or accent profiling.

Role-specific scores must identify method version, confidence and missing data. **Do not create a universal percentile ranking across different professions without validated comparable constructs and representative reference samples.** Run inter-rater agreement checks, subgroup impact monitoring where lawful, calibration checks and candidate challenge processes. Early results are human-reviewed decision aids, never automated rejection.

## 13. Roadmap: preserve total vision and still ship

**Design pre-production:** audit source vision, complete canonical screen/motion inventory; create tokens, reusable components and 8 golden journey prototypes; simulate realistic business data; record usability walkthroughs and motion references; owner signs off. **Designing every possible feature to implementation fidelity before testing the main loop is wasteful:** fully design critical flows, atlas and wireframe deferred flows.

**MVP slice:** organization policy -> recruiter defines role -> consenting candidate onboarding/evidence -> indexed discovery -> explainable shortlist -> approved invite -> candidate response -> Q-led text/form interview -> human review; desktop/mobile with honest streamed progress and failure recovery.

**Next:** job Explore, Evidence Passport, CV builder, practice studio, voice/video mode, scheduling, live meeting copilot, ATS integration, candidate development.

**Long term:** persistent sourcing agents, verified skills ecosystem, multinational regulatory workflows, advanced partner assessments, rich generated artifacts/media, broader communications and outcome-learning methodology.

## 14. Acceptance gates before design-to-code

- 100% of original vision requirements have stable IDs, rationale and disposition: MVP, next, later, partner-dependent, rejected with reason (not silently deleted).
- Figma file includes tokens, typed components and variants; mobile and desktop, with accessible text-only paths.
- Eight golden journeys work end to end with mock data in a clickable prototype; no unsupported dead-end controls.
- Motion library covers each registered event, error and reconnect, including reduced-motion behavior.
- At least 12 annotated usability tasks tested internally on plausible users; later real user research mandatory.
- Every backend-dependent screen names the event, query, command or policy it expects, and distinguishes a simulated view from implemented functionality.
- All external provider assumptions and rights/consent boundaries are marked.
- No confidential employer/candidate data is used in generated demos without authorization.
- No blanket promise that Q can do *any task at any cost*. Capability comes from scoped tools, approved budgets and measurable success.

## 15. Research citations and official sources

[S01] LinkedIn Hiring Assistant 2 announcement (29 Sep 2026): https://news.linkedin.com/2026/hiring-assistant-2  
[S02] BrightHire interview guide, coaching: https://www.zoom.com/en/products/brighthire/  
[S03] Metaview interview notes and ATS: https://www.metaview.ai/interview-notes  
[S04] CodeSignal practice exercises (updated 24 Sep 2026): https://support.codesignal.com/hc/en-us/articles/12984563824279-Practice-Content-Overview  
[S05] A2UI protocol and status (v0.9.1 production, v1.0 candidate): https://a2ui.org/  
[S06] Vercel AI SDK UI streaming: https://github.com/vercel/ai/blob/main/content/docs/04-ai-sdk-ui/02-chatbot.mdx  
[S07] Motion React transitions: https://motion.dev/docs/react-layout-animations  
[S08] Rive state machines: https://rive.app/features  
[S09] Figma MCP design tools: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/  
[S10] Tavus CVI real-time interaction events: https://docs.tavus.io/sections/conversational-video-interface/interactions-protocols/overview  
[S11] ElevenLabs voice turn interruptions: https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow  
[S12] Twilio WhatsApp Business Calling permissions: https://www.twilio.com/docs/voice/whatsapp-business-calling  
[S13] US EEOC employment selection procedure guidance: https://www.eeoc.gov/laws/guidance/employment-tests-and-selection-procedures  
[S14] EU AI Act official legal portal: https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng  
[S15] NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework  
[S16] Figma structured files & Code Connect: https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/  
[S17] Vercel MCP interactive UI sandbox: https://vercel.com/kb/guide/ai-sdk-mcp-apps  
[S18] Tavus realtime product: https://www.tavus.io/cvi  
[S19] ElevenLabs events: https://elevenlabs.io/docs/eleven-agents/customization/events  
[S20] TalentCLEF 2026 contextualized job-person matching benchmark: https://arxiv.org/abs/2606.31692  
[S21] InterviewPlayground (simulation-based research, not hiring validation): https://arxiv.org/abs/2610.12023  
[S22] Original Q repository, `build/int-rc`, read October 27: https://github.com/neo1415/q  

**Research limitations:** This is a grounded desk-review and comprehensive design specification, not paid-product click testing or a statistically representative global user study. Vendor integrations, licensing, cost, jurisdiction and empirical matching/interview score validity still require separate validation. Source and artifact inventories should be refreshed before implementation.
