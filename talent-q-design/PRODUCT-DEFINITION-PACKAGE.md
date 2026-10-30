# Talent Q product-definition package

The complete interactive product and design blueprint: the founder's deliverable before any production build. Everything here is a simulation with fictional people. There is no production database, tenancy, API, backend, worker or infrastructure code, and Capital Q (`neo1415/q`) was only read.

## 1. The navigable prototype

`prototype/` is Direction D, built with React, TypeScript and Vite. Run `npm install && npm run dev`, then open `#/`. Review links open any page as any person: `#/<route>?as=<actorId>`.

| Area | Start here | Who |
|---|---|---|
| Public site | `#/site`, `#/site/pricing`, `#/site/trust`, `#/sign-in` | Anyone |
| Recruiter Q home | `#/r/home?as=u_ada` | Ada, Kora Pay |
| First-time employer | `#/r/home?as=u_funmi` | Funmi, Crumb & Co |
| Agency | `#/r/home?as=u_dele` | Dele, Talentbridge |
| Hiring manager | `#/r/home?as=u_bayo` | Bayo |
| Evidence-first comparison | `#/r/compare?as=u_ada` ("CV and proof") | Ada |
| Discovery and pipeline | `#/r/explore`, `#/r/pipeline`, `#/r/reminders`, `#/r/outcomes` | Ada |
| Interviews and assessments | `#/r/assess`, `#/r/questions`, `#/r/coaching` | Ada, Musa |
| Organisation admin | `#/r/admin?as=u_ada` | Ada (admin) |
| Q's work (artifacts and tools) | `#/q/artifacts`, `#/q/browse`, `#/q/downloads`, `#/q/sources` | Anyone signed in |
| Candidate home | `#/c/home?as=p_tobi`, `?as=p_seyio`, `?as=p_grace` | Candidates |
| Evidence Passport | `#/c/passport?as=p_tobi` | Tobi |
| Career intelligence (J7) | `#/c/career?as=p_chidi` | Chidi |
| Interview room and exercises | `#/c/interview`, `#/c/assess` | Candidates |

Q is the one global conversational interface on every page, by text and voice, with forms where they fit. Each page has its own opening line from live state, proactive cards, memory with sources, approvals before anything outbound, undo, and live artifact cards.

## 2. Coverage: every requirement is represented

Generated from `registry/status.json`; see `COVERAGE-SUMMARY.md`.

| Register | Total | Represented | How |
|---|---|---|---|
| Screen concepts | 183 | **183** | 82 as their own page, 101 as a state or section of one (`screens/SCREEN-COVERAGE.csv`) |
| Motions | 57 | **57** | Every motion runs in the prototype with a reduced-motion fallback (`motion/MOTION-COVERAGE.csv`) |
| Founder vision groups | 41 | **41** | 39 prototyped or integrated; V40 is designed only; one verified (`research/VISION-COVERAGE.csv`) |
| Addendum requirements | 83 | 82 prototyped | `registry/ADDENDUM-REQUIREMENTS.csv` |
| Consolidation requirements | 22 | 21 prototyped, 1 designed | `registry/CONSOLIDATION-REQUIREMENTS.csv` |

"Prototyped" means an interactive page or state exists and is tested. "Integrated" means it also changes shared state that other pages read. Nothing is "verified" against real users or providers; that needs production.

## 3. Journeys, films and tests

| Journey | What it proves | Test |
|---|---|---|
| R1–R5 | Funmi, Ada, Ngozi, Dele, Bayo: hiring with Q, with curveballs | `qa/scripts/journeys/R*.mjs` |
| T1–T5 | Amaka, Chidi, Tobi, Grace, Zara: careers with Q, with curveballs | `qa/scripts/journeys/T*.mjs` |
| J11 | One connected journey across contact, campaigns, rubric, media evidence and email | `J11.mjs` |
| J12 | Evidence-first hiring: thin CV with proof vs polished CV with claims | `J12.mjs` |
| Feature tests | 13 areas, from rubric and campaigns to the six coverage clusters | `qa/scripts/features/*.mjs` |
| Privacy and gates | Tenancy, discovery, revocation and caches, unknown ≠ 0, rubric versions, no send without approval | `qa/scripts/review/privacy.mjs`, `qa/scripts/gates/consolidation-gates.mjs` |

Films are in `captures/films/`: J11, J12, and the master films A (Hiring with Q: R1–R5 and J12) and B (Careers with Q: T1–T5 and J11). Each is desktop and phone. Every caption is a step the tests verified on that recording, and the commit is stamped on screen.

## 4. Design

| Deliverable | File |
|---|---|
| Design system (Direction D) | `design-system/DIRECTION-D-SYSTEM.md`, `tokens/`, `prototype/src/ds/` |
| Components | `components/COMPONENTS.md` |
| Quality gate | `handoff/DESIGN-QUALITY-GATE.md` |
| Design notes per area (skills used, critique, fixes, weaknesses) | `journeys/design/*.md` (19 areas) |
| Skill invocations with evidence | `DESIGN-SKILL-AUDIT.md` |
| Screen gallery, before/after pairs, motion library, films | the review gallery artifact (built by `qa/scripts/review/gallery/build.py`) |

## 5. Engineering handoff

| Document | What it settles |
|---|---|
| `handoff/MODULE-MAP-AND-ROADMAP.md` | 21 modules, owners, dependencies, build order; where evidence-first lives (§3a) |
| `handoff/Q-INTELLIGENCE-SPEC.md`, `Q-SKILLS-APPENDIX.md`, `q-eval-corpus.json` | Q's behaviour, skills and evaluation corpus |
| `handoff/Q-DEPENDENCY-GRAPH.md`, `q-graph.json` | V40: Q skill → ops → state → pages, generated from source |
| `handoff/PRIVACY-AND-PERMISSIONS.md` | Discovery, consent, tenancy, revocation |
| `handoff/ADDENDUM-HANDOFF.md` | Campaigns, rubric, media evidence, email: relationships and statecharts |
| `handoff/CONSOLIDATION-MERGE-LEDGER.md` | Every Build Pack change: duplicate, new, unresolved (CL-01 to CL-43) |
| `handoff/DECISION-REGISTER.md` | Founder decisions, open and resolved (D1–D25) |
| `handoff/PRODUCTION-VERTICAL-SLICE.md` | **For after this package is accepted:** the first production slice, the Q consumption decision, entities, events, migrations, branch plan and the first 10 tasks |
| `contracts/*.ts` | Typed contracts mirrored from the prototype |

## 6. What this package does not claim

- No real sends, bookings, payments, provider calls, model calls, browsing or downloads. All are simulated and labelled.
- No validated scoring. The rubric index is prototype arithmetic (D17), and no fairness statistic is shown anywhere.
- No customer, usability or screen-reader testing yet.
- The prices are hypotheses.
- Q's understanding is rule-based in the prototype, not open-ended reasoning or semantic retrieval.
