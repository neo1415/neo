# Module map, dependencies and implementation roadmap

This document is derived from the ten journeys and the prototype's code. It defines the production system boundaries, who owns which data, how modules talk to each other, and the order to build them in.

Per-area detail lives in the journey handoffs (`journeys/handoff/*.md`). Cross-cutting specifications are:
- `Q-INTELLIGENCE-SPEC.md`
- `PRIVACY-AND-PERMISSIONS.md`
- `contracts/*.ts`

## 1. Modules

Each module owns its data; other modules read it through that module's API or events. It never reads another module's tables.

| # | Module | Owns (data) | Main responsibilities | Prototype reference |
|---|---|---|---|---|
| M1 | **Identity and accounts** | users, sessions, signup and verification codes, personal preferences (plain words, voice, proactivity, lite mode) | Signup and verification, choosing a work mode, personalising Q, settings | `routes/entry.tsx` (signup, settings) |
| M2 | **Organisations and tenancy** | organisations, members and roles, delegation mode, guidelines, verification status, agency–client links | Organisation setup, team permissions, guidelines Q applies, business verification | `journeys/hire-c/Team.tsx`, `Setup.tsx`; R1 verification |
| M3 | **Authorisation and privacy** (service, no UI) | discovery rules, consents, registrations, revocations (or a read model fed by M5) | `canSeeCandidate`, `canDiscover` and `visibleEvidence` for **every** read; the route and tool guard | `mock/world.ts`, `routes/guard.tsx`, `PRIVACY-AND-PERMISSIONS.md` |
| M4 | **People and profiles** | candidate profiles, claims in their own words, CV parse results, work history | Onboarding by chat, CV or form; profile editing; claims kept separate from evidence | `journeys/onboarding/*`, `services/profile.ts` |
| M5 | **Evidence Passport** | evidence items, files, provenance, verification state, sharing, redaction, revocation | Uploads (resumable), issuer verification, the disclosure matrix, "what X sees" previews | `journeys/talent-b/Passport.tsx`, `logic.ts` |
| M6 | **Roles and mandates** | role briefs (versioned), requirements, pay bands, approvals | Q-drafted briefs, versions and approval, Kora's intake | `journeys/hire-a/Roles.tsx`, `screens/MandateIntake.tsx` |
| M7 | **Search and matching** | search indexes (read models), saved searches, match explanations | Sourcing across providers, fit explanations, comparison by criteria, weighting | `journeys/hire-b/model.ts`, `journeys/agency/model.ts`, `q/scripts.ts` |
| M8 | **Pipeline** | pipeline entries, stage history, rejection reasons | Board, moves with undo, job-related rejection reasons | `journeys/hire-c/Pipeline.tsx` |
| M9 | **Correspondence** | threads, messages (versioned drafts), approvals, outbox, receipts | Drafting, diffs, pre-send checks, approval, sending (email, SMS, in-app), candidate replies | `journeys/hire-c/Messages.tsx`, `CandidateMessages.tsx` |
| M10 | **Scheduling** | calendar connections, busy times, holds, invites, panels, reschedules | Slot finding across time zones, holds, confirmations, reminders | `journeys/hire-c/Calendar.tsx`, `contracts/scheduling.ts` |
| M11 | **Interviews and assessments** | interviews, questions, answers, rubrics, feedback, disputes | Copilot, adaptive follow-ups, the candidate interview room, feedback, disputes | `journeys/hire-b/Interviews.tsx`, `journeys/talent-c/InterviewRoom.tsx` |
| M12 | **Jobs and applications** (candidate side) | job listings, employer signals, applications with honest statuses, saved jobs | Discovery, match explanation, applying, follow-ups | `journeys/talent-b/Jobs.tsx`, `Applications.tsx` |
| M13 | **Career intelligence (J7)** | J7 state per person (PERSON scope), plans, practice, assessments, records | Atlas, transferable skills, gaps, plans, practice vs proof, reassessment | `journeys/career/*` |
| M14 | **Agency** | clients, pools, registrations, campaigns, submittals, notes, documents, client reports | Client isolation, campaigns under limits, submittals with consent | `journeys/agency/*` |
| M15 | **Q runtime** (on `neo1415/q`) | conversation threads, tasks and frames, runs, artifacts and versions, suggestions, memory items | Conversation, tools, artifacts, proactive triggers, planner and agents, memory | `q/*`, `services/agents.ts`, `contracts/*`, `Q-INTELLIGENCE-SPEC.md` |
| M16 | **Notifications** | notification preferences, deliveries | Email, SMS and in-app digests, following candidate choices | Settings; R3 reminders |
| M17 | **Files and verification adapters** | stored files, scan results, verification requests | Chunked upload, malware scan, issuer and registry checks | T3, T4, R1 |
| M18 | **Events and audit** | the domain event log (append-only, scoped) | The audit log page, "who changed what", event feeds for Q's proactive rules | `emit` / `eventsFor`, `journeys/hire-a/Audit.tsx` |
| M20 | **Mail connections** (addendum E-01) | mailbox connections, sender identities and delegation, provider cursors | Connect Google, Microsoft and other business email; scopes; the provider adapters behind send, draft, read, events and attachment ports; the Talent Q service sender | `state/areas/mail.ts`, `/settings/email`, `handoff/ADDENDUM-HANDOFF.md` |
| M21 | **Media analysis** (audit addendum §F) | transcripts per content hash, key moments, media reviews per rubric version | Transcribe once, map moments to rubric criteria, frame review only on demand, a cost-limited queue | `state/areas/media.ts`, `/r/people/:id/video` |
| M19 | **Web app shell and design system** | none (client) | The Direction D shell, Q presence, the route registry, components, motion tokens | `prototype/src/ds/*`, `design-system/` |

## 2. Dependencies (build order follows them)

```
M18 Events/audit ─┐
M1 Identity ──────┼─> M2 Orgs/tenancy ─> M3 AuthZ/privacy ─┬─> M7 Search/matching ─> M14 Agency
                  │                                         ├─> M4 Profiles ─> M5 Passport ─> M13 J7
                  │                                         ├─> M6 Mandates ─> M8 Pipeline ─> M11 Interviews
                  │                                         ├─> M12 Jobs/applications
                  │                                         └─> M9 Correspondence ─> M10 Scheduling
M17 Files/verify ──> M5, M2 (business verification), M4 (CV)
M16 Notifications <── M9, M10, M12, M15
M20 Mail connections ──> M9 (send and read ports), under M3 (sender authority)
M21 Media analysis <── M5, M17; ──> M11 (proposes ratings against the approved rubric version)
M15 Q runtime: reads everything only through module APIs, under M3; writes only through module tools
M19 Shell: hosts every page and Q
```

## 3. Interfaces between modules

- **Commands:** Q tools and the UI call module APIs. Each command declares its permission, approval class and audit event; see the approval classes in Q-INTELLIGENCE-SPEC §5.
- **Events:** every state change emits a scoped domain event (`DomainEvent` in `prototype/src/state/domain.ts`). Q's proactive triggers, notifications and the audit log consume events. They never poll another module's tables.
- **Read models:** search indexes and Today pages are read models built from events and always authorised through M3 at read time.

## 3a. Consolidation (30 Oct): where evidence-first hiring lives

No new module. The pack's `CapabilityEvidenceForRole` layer (`PRODUCTION-VERTICAL-SLICE.md` §4) is spread across existing owners. The prototype code for each entity is named in the last column.

| Entity | Owner | Reads | Prototype |
|---|---|---|---|
| RoleCompetency (on an approved, frozen rubric version), effort budget, accepted proof | M6 | M7, M11 | `state/areas/rubrics.ts`, `journeys/rubric/*` |
| EvidenceItem plus proof class, review | M5 | M3 (filters), M7, M13 | `mock/world.ts` evidence; `journeys/evidence/model.ts` `proofClass` |
| CvDocument and mentions (descriptive, never scored) | M4 | M7 | `state/areas/proof.ts` `cvs` |
| EvidenceClaimLink, RoleEvidenceEvaluation (unknown ≠ 0) | M7 | M8, M15 tools | `EV_REQ`, `cellFor`, `proof.links`; `proofReading` |
| EvidenceReuseDecision (accept prior / verify / bounded sample) | M11 | M5, M9, M12 | `journeys/evidence/ops.ts` |
| InterestCheck, ProcessCommitment | M12 | M8, M9, M16 | `state/areas/proof.ts` |
| HiringIntentConfirmation | M6 | M12 | `state/areas/proof.ts` `intents` |
| CandidateMutualPreferences | M4 | M7 (separate from suitability) | `state/areas/proof.ts` `prefs` |
| HiringOutcome (consented, human-verified) | M8 | later evaluation | not prototyped (slice task after 10) |

**Revised order for the first build.** The pack's P1 replaces "phase by phase" with one vertical slice through phases 0–4: M19, M1–M3, M18, then the M15 adapter, then M4/M5/M17 and M6/M7, then M11/M12 for reuse and interest, then M9/M10/M20 for one mail path and one calendar. The ten tasks and acceptance conditions are in `PRODUCTION-VERTICAL-SLICE.md` §8. The phases below remain the path for everything outside the slice.

## 4. Implementation roadmap

| Phase | Ships | Modules | Journeys it unlocks |
|---|---|---|---|
| 0. Foundations | Shell, design system, accounts, organisations, roles, events and audit, the authorisation and privacy service with its tests | M19, M1, M2, M18, M3 | Signup, team, settings |
| 1. Q core | Conversation, page context, navigation tool, artifacts and versions, approvals, undo, memory with sources, proactive triggers | M15 (from the `neo1415/q` audit) | Q present everywhere with real tools |
| 2. Candidate foundations | Profiles, Passport (uploads, verification, sharing, revocation), jobs and applications | M4, M5, M17, M12 | T1, T3, T5 (core) |
| 3. Employer hiring loop | Mandates and **hiring campaigns**, search and matching, pipeline, correspondence with approvals, **candidate-initiated contact**, **connected email (send-only first)**, scheduling | M6, M7, M8, M9, M10, M16, **M20** | R1, R2 (core), R3 |
| 4. Interviews and assessment | Interview room, copilot, adaptive follow-ups, feedback, disputes, **rubric studio and evidence-backed scoring**, **media evidence** | M11, **M21** | R2, T4, J11 |
| 5. Career intelligence | J7 atlas, plans, practice vs proof, reassessment | M13 | T2 |
| 6. Agency | Clients, pools, campaigns, submittals, concurrent agents, reports | M14 + M15 agents | R4 |
| 7. Hardening | Fairness and privacy red-team, Q evaluation on `q-eval-corpus.json`, performance targets, accessibility verification (screen reader) | All | R5 and every curveball |

## 5. Decisions needed before phase 0

These decisions are also recorded in the decision register:
- The production stack and hosting.
- How Q tools map onto Capital Q's runtime and approval records (contract open questions).
- Calendar and email providers.
- Credential-issuer and business-registry sources per country.
- Where speech-to-text runs.
