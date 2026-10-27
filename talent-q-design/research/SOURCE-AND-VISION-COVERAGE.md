# Source and vision coverage

Status as of 27 Oct 2026. Machine-readable registers live beside this file:

- `../screens/SCREEN-COVERAGE.csv`: 183 screens
- `../motion/MOTION-COVERAGE.csv`: 57 motions
- `VISION-COVERAGE.csv`: 41 vision groups

`../COVERAGE-SUMMARY.md` tallies them. All four are generated from `../registry/status.json` by `../scripts/build-registers.mjs`. Rows are never deleted. A capability that cannot ship yet stays in the register with its dependency named.

## 1. Source manifest

The originals are in `docs/sources/` exactly as uploaded. The hash is the first 12 hex digits of SHA-256.

| Source | Batch | Bytes | SHA-256 | Standing |
|---|---|---|---|---|
| `00_CLAUDE_START_HERE_v2.md` | 1 | 16,908 | 02d4aeea734b | **Controlling instruction** |
| `08_ADDENDUM_SCHEDULING_J7_MEMORY_AND_TOOLING.md` | 4 | 25,853 | cc14e8c7adc8 | Highest-priority detail (read first per directive) |
| `Talent_Q_Vision_Addendum_v2.pdf` | 4 | 60,141 | 3ae12eb5bf5b | PDF copy of 08. Vocabulary diff against the markdown: identical apart from one hyphenation artifact |
| `README_SEND_TO_CLAUDE.md` | 4 | 5,571 | 63cf120c1f5b | Packaging, plus six priority acceptance samples |
| `01_VISION_RESEARCH_AND_PRODUCT_EXPERIENCE_MASTER.md` | 2 | 32,748 | 8caff6e0757d | Prior founder vision: journeys J1–J8, IA, motion principles |
| `02_COMPLETE_SCREEN_ATLAS_v2.csv` | 2 | 60,625 | 181bccc0b210 | **Current**. 183 rows |
| `02_COMPLETE_SCREEN_ATLAS.csv` | 2 | 46,285 | e3e7de726f32 | Historical. All 146 IDs are present unchanged in v2 (checked) |
| `03_MOTION_AND_VIDEO_ATLAS_v2.csv` | 2 | 10,180 | cae32fdae6e0 | **Current**. 57 rows |
| `03_MOTION_AND_VIDEO_ATLAS.csv` | 2 | 6,947 | c78fc6732af8 | Historical. All 41 IDs are present in v2 |
| `04_FOUNDER_VISION_TRACEABILITY_v2.csv` | 3 | 4,820 | 99b37b483569 | **Current**. 41 rows |
| `04_FOUNDER_VISION_TRACEABILITY.csv` | 3 | 3,582 | 0eb268116adf | Historical. All 32 IDs are present in v2 |
| `05_CLAUDE_DESIGN_FIRST_MASTER_DIRECTIVE.md` | 3 | 10,501 | e1ff672d63a1 | Superseded where revised. Its requirements still stand |
| `06_DESIGN_SCOPE_AND_NEXT_RESEARCH.md` | 3 | 5,455 | 836a88b145ac | Scope notes and open research |
| `07_VIDEO_STORYBOARD_AND_VISUAL_REFERENCE.md` | 3 | 6,755 | df38bef97509 | Analysis of the founder's 4m33s film, plus FILM-01 to FILM-06 outlines |
| `Talent_Q_Complete_Investor_and_Product_Brief.pdf` | 1 | 156,063 | d7449cf1c2b3 | Context only. Forecasts are not requirements |
| `TalentQ_Technical_Blueprint_v1.pdf` | 1 | 204,430 | 016685930427 | Context. The Q-Match baseline is reconciled in §2 |
| `TalentQ_Global_Market_Research_and_Commercial_Strategy_v1.pdf` | 1 | 151,852 | c04b57292645 | Context: markets, pricing, channels |
| `TalentQ_User_Journey_Atlas_Stage2.docx` | 1 | 40,095 | 5308960c3fbf | Context: journey detail |
| `neo1415/q` @ `build/int-rc` `91a8acb` | n/a | n/a | n/a | Read-only. See `Q-REUSE-AUDIT.md` |

## 2. Conflicts and how each is resolved

| # | Conflict | Resolution |
|---|---|---|
| C1 | `05` directive vs `00_…_v2` | v2 controls wherever it revises 05. The remaining 05 requirements stay in force. |
| C2 | 146 → 183 screens, 41 → 57 motions, 32 → 41 vision groups | The v2 files are the registers. The v1 files remain only as provenance; the diff shows nothing was removed or renamed. |
| C3 | `07` lists six films and 41 motion clips | The v2 directive and the founder's message both ask for **eight** captioned narrative captures, including dedicated scheduling and J7 films, and for all **57** motions. 07's FILM-01 to 06 feed films 1, 2, 5 and 6. Scheduling, J7, memory correction and evidence portfolios get their own storyboards. |
| C4 | The founder's `talentq-film.mp4` was named but not uploaded | Only its written analysis (07, 01 §9) is used. `video/talentq-film.mp4` in this repo is **our own** earlier prototype film, not the reference. It shares the filename, so references to it always state which film is meant. |
| C5 | The blueprint's Q-Match `M = √(F×A)` vs "no global Talent Score" (08, J8) | Q-Match stays a **role-specific, two-sided** fit pipeline. It is never a property of the person. The UI shows its components and evidence states (fit, availability, unknowns), not one headline number. The J7 measures stay separate: `evidence_coverage`, `competency_mastery`, `practice_progress`, `role_fit`, `readiness_to_apply`, `growth_plan_adherence`. |
| C6 | The directive reads the Q repo's "latest active integration branch first" | The audit used `build/int-rc` (= deployed). The 26 Oct handoff says active work moved to `speed/q-oct20`. **Outstanding:** diff the contracts we mirror (`packages/contracts/src/q/*`) against `speed/q-oct20` before Phase 4. |
| C7 | 00 and 05 call for Motion for React and Rive | Motion for React, CSS and canvas are used. Rive is not used: Q's states are simple enough for a canvas state machine. This is recorded in `decisions/EXPERIENCE-DECISIONS.md`. |
| C8 | The paid video avatar (Tavus) in V10/SC-102 | Designed as an optional mode, with the provider simulated and labelled. Voice and text stay complete paths (V11). |
| C9 | Capital Q delegation `AUTO`/`ASK` vs Talent Q's `DRAFT_ONLY` / `APPROVE_EACH_SEND` / `APPROVED_CAMPAIGN` | Talent Q's three modes are the product modes. Mapping: DRAFT_ONLY = no grant; APPROVE_EACH_SEND = ASK; APPROVED_CAMPAIGN = AUTO, bounded by a campaign grant. The mapping is an owner question (audit Q3). |
| C10 | The earlier prototype in `src/` (JavaScript, before the directive) | Historical concept. The source of truth is now `talent-q-design/prototype` (TypeScript). Ideas carried forward: the ambient Q home, moments for approval, lenses, the conversation workspace. |
| C11 | WhatsApp outbound calling | Not universally eligible: Nigeria- and US-based business senders are excluded (08, Twilio docs). The UI checks eligibility before offering a call and falls back to scheduled phone, email or SMS. |

## 3. Vision register: journey, dependency, outstanding evidence

`Backend` names the Q package to mirror (see the audit). `Provider` is an external dependency, which is simulated in the prototype.

| ID | Requirement | Journeys | Screens | Backend | Provider | Outstanding |
|---|---|---|---|---|---|---|
| V01 | Cross-profession hiring | J1, J2 | SC-027, 096, 110 | taxonomy (new) | none | Profession taxonomy source |
| V02 | One reusable Q brain | all | SC-117, 118, 119 | q-runtime, q-orchestrator | model gateway | Engine choice (audit Q2) |
| V03 | Low-latency, cheap orchestration | all | SC-120, 035, 080 | stream.ts, model gateway budgets | LLM vendors | Latency budget per screen |
| V04 | Real progress, transparent work | all | SC-120, 121, 135 | Q_STREAM_EVENT_TYPES | none | Mid-run cost-approval event (gap) |
| V05 | Parallel delegation | J6, Track D | SC-119, 131, 045 | workforce plan/job-runner | none | Measured, not summed, budgets |
| V06 | Search, safe fetch, links | J1, J6 | SC-033, 128, 136 | q-tools, q-firewall | search/fetch APIs | Source licensing (SC-146) |
| V07 | Safe downloads | J3 | SC-130, 068 | q-tools | malware scan | Scanner choice |
| V08 | Email, SMS, WhatsApp outbound | Track B | SC-048, 049, 050 | q-actions, communication | Gmail, Graph, SMS, WhatsApp | Outlook, SMS, WhatsApp absent in Q |
| V09 | WhatsApp and phone calling | Track B | SC-023, 053, 047 | none | Twilio/Meta | Country eligibility (C11) |
| V10 | Optional video/voice | J4 | SC-098, 102, 101 | GateQ interview port | Tavus, Deepgram, ElevenLabs | Cost per minute |
| V11 | Text, form, voice parity | J4 | SC-099, 100, 101 | shared question engine | STT/TTS | Parity test fixtures |
| V12 | Org/personal instructions | J1 | SC-018, 020, 097 | instructions.ts | none | Precedence resolver (gap) |
| V13 | Adaptive questions | J4 | SC-096, 097, 099 | question engine (new) | LLM | Rubric validation |
| V14 | Locked uploaded questions | J4 | SC-095, 096, 019 | question bank (new) | none | none |
| V15 | Portfolio and evidence vault | J3 | SC-067, 068, 073 | artifacts, evidence | storage | none |
| V16 | Credential/permit verification | J3 | SC-070, 071, 072 | evidence | verifier partners | Partners per country |
| V17 | Q browses and critiques projects | J3, J5 | SC-069, 076, 129 | safe browse | sandbox | Sandbox isolation |
| V18 | Insight for nontechnical recruiters | J2 | SC-039, 040, 108 | evidence explainers | none | none |
| V19 | Live interview copilot | J5 | SC-104, 103, 106 | realtime voice | STT | Consent law per region |
| V20 | Interviewer coaching | J5 | SC-109, 057 | evals | none | Coaching rubric |
| V21 | Candidate practice and feedback | J7 | SC-089, 107, 093 | J7 engines | none | Rubric reliability |
| V22 | Skill learning | J7 | SC-090, 091, 092 | J7 engines | course links | Content licensing |
| V23 | CV and cover letter | J3, J7 | SC-086, 087, 125 | artifacts (document) | none | Fact-confirmation gate |
| V24 | Category-specific ranking | J8 | SC-040, 108, 144 | Q-Match (C5) | none | Adverse-impact validation |
| V25 | Explore jobs and talent | J1, J3 | SC-034, 079, 084 | search | job sources | Source licences |
| V26 | Agent-made art, charts, video | Track D | SC-122, 124, 127 | result-block, artifact | renderer | Safe typed renderers only |
| V27 | Warm gold Q across devices | all | SC-117, 101, 011 | stream resume | none | none |
| V28 | Candidate controls portfolio | J3 | SC-073, 075, 078 | permissions | none | none |
| V29 | Q improves with results | all | SC-133, 144, 145 | evals, memory | none | Evaluated-learning loop (gap) |
| V30 | International and accessible | all | SC-007, 100, 064 | i18n | none | Locale list |
| V31 | Agencies and teams | J6 | SC-137, 138, 016 | tenancy | none | Tenancy model (audit Q9) |
| V32 | Avoid infrastructure hell | all | SC-028, 035, 099 | reuse | none | none |
| V33 | Proactive scheduling | Track B | SC-147, 150, 153, 154 | communication | Google, Graph | Outlook adapter |
| V34 | Panels, time zones, rechecks | Track B | SC-148, 151, 155, 160 | scheduling (new) | Google, Graph | DST fixtures |
| V35 | End-to-end correspondence | Track B | SC-156, 158, 159 | communication, email | email, SMS, WhatsApp | Opt-out ledger |
| V36 | J7 career intelligence | Track C | SC-162, 163, 165, 167 | J7 B1–B6 (new) | none | Competency library |
| V37 | J7 private practice to evidence | Track C | SC-170, 173 | permissions, evidence | none | Promotion consent copy |
| V38 | Cross-session memory with provenance | Track A | SC-177, 179, 181 | q-knowledge memory | none | Versioned org rules (gap) |
| V39 | Correctable, revocable memory | Track A | SC-178, 182, 183 | write gate, revocation | none | Cache purge proof |
| V40 | Graphify code understanding | dev | SC-179 | n/a | Graphify | Not installed here, so not used |
| V41 | Design without paid Figma | ops | SC-001, 117 | n/a | n/a | Met: Claude Design canvas plus TS source |
