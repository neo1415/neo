# Atlas gaps: decisions for every unrepresented item

Scope: the 51 screens, 23 motions and 10 vision groups that are RESEARCHED (not represented) in `screens/SCREEN-COVERAGE.csv`, `motion/MOTION-COVERAGE.csv` and `research/VISION-COVERAGE.csv` on 2026-10-29. I read the code but did not change it. The registry and code were not edited. Seven builders are changing journey pages right now, so line-level hosts can move. Each host below is named by route and component.

**Decisions.** **A**: add a state or section to an existing route. **B**: add a specimen to `/gallery/states` (`journeys/gallery/StatesGallery.tsx`; the last existing specimen is GS-15, so new ones start at GS-16). **C**: document as a future capability (specs in §4).

| | A | B | C | Total |
|---|---|---|---|---|
| Screens | 29 | 3 | 19 | 51 |
| Motions | 17 (5 of them are already in code, so only evidence needs recording) | 4 | 2 | 23 |
| Vision groups | 3 | 1 | 6 | 10 |
| **All** | **49** | **8** | **27** | **84** |

Priority order used throughout comes from `docs/sources/batch-1/00_CLAUDE_START_HERE_v2.md` §"first 12 usable screens" (P1 Q home … P12 memory) and from Addendum 08, which ranks scheduling, J7 and memory highest.

---

## 1. Screens not represented (51)

Change groups (`G-`) tie together items that one edit covers.

### Public site and entry

| ID | Title | Surface | Dec. | Route · component | What to add / why |
|---|---|---|---|---|---|
| SC-001 | Landing + Q intro | Public site | C | → C1 | `/` (`screens/Entry.tsx`) is a demo persona chooser. It is not a landing page, so it doesn't count. |
| SC-002 | How Talent Q works | Public site | C | → C1 | |
| SC-003 | For Employers | Public site | C | → C1 | |
| SC-004 | For Talent | Public site | C | → C1 | |
| SC-005 | Pricing | Public site | C | → C1 | Pricing depends on C2 billing. |
| SC-006 | Trust and AI explanations | Public site | C | → C1 | Reuse the `/c/passport` "How it works, in plain words" copy pattern. |
| SC-008 | Auth sign in | Public site | A | `/signup` · `Signup` in `routes/entry.tsx` | Add an "I already have an account" step: email, then the same 6-digit verify step (SC-010), then home. Include a wrong-email and locked-account error. |
| SC-013 | Public sample Q interaction | Public site | C | → C1 | A scripted, sandboxed Q thread with no sign-in. |

### Organisation setup and policy (P2) · group **G-SETUP** on `/r/setup` · `journeys/hire-c/Setup.tsx`

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-020 | Recruiter personal instructions | Employer governance | A | `/r/setup` · `Setup` | Add a "Your own instructions" section. Reuse the guideline row, scoped to the signed-in actor and shown below the org guidelines with "org rules win". Q cites it in drafts. This also closes V12. |
| SC-021 | Organisation approved templates | Employer governance | A | `/r/setup` · `Setup` | Add a "Templates" section: versioned message templates (invite, reject, follow-up) using the guideline row pattern. `/r/messages` drafts show "from template v2". This also closes the "missing templates" gap noted on SC-157. |
| SC-023 | Channel verification | Employer governance | A | `/r/setup` · `Setup` | Add a "Channels" section: email domain, SMS sender ID and WhatsApp number, each moving pending → verified → failed. Reuse `VerifySteps` from `journeys/hire-a/ui.tsx` and mark everything `ds-sim`. This covers V09. |
| SC-024 | Employer billing and usage | Employer governance | C | → C2 | No billing data model exists, and it needs a payment provider. |
| SC-025 | Compliance and retention settings | Employer governance | A | `/r/setup` · `Setup` | Add a "Retention" section: how long candidate data, interview notes and the audit log are kept, using `SwitchRow` plus duration chips. Admin-only editing, with every change written to `/r/audit`. |
| SC-146 | Source licence and connectivity manager | Agency/admin | A | `/r/setup` · `Setup` | Add a "Data sources" section listing PeopleGraph, GitHub and the internal pool, each with licence, permitted use and health (ok / rate-limited / not connected). Copy the provider-health card from `screens/CalendarSetup.tsx`. SC-033 feeds from this list. |

### Roles, search and discovery (P3–P4) · group **G-SEARCH**

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-033 | Search scope & data source selector | Hiring/discovery | A | `/r/roles/:id` · `RoleDetail` (People view), `journeys/hire-a/Roles.tsx` | The "pool searched" line becomes editable chips of the G-SETUP sources. Unlicensed sources show disabled with the reason, and a change re-runs the search through the same Q op. This also partly covers V06. |
| SC-034 | Explore Talent landing | Hiring/discovery | A | `/r/roles` · `RolesList` | Add a top section "Explore without a role": counts of discoverable people by occupation, honouring each person's discovery rule. Selecting one starts a role brief instead of showing names. |
| SC-046 | Search empty state | Hiring/discovery | B | GS-16 "Search found nobody" | Show "0 people in 3 sources", the reason (for example a must-have that is too narrow) and chips for "widen to remote" and "drop must-have X". Reuse the `Empty` specimen layout. |
| SC-136 | Q research and source manager | Q tools | A | `/r/plan` · `Planner` | Add a "Sources" view tab: each source with what it found, its freshness and its licence, plus pause or remove. Planner already tracks source health, so this only surfaces it. |

### Pipeline, offers and outcomes · group **G-PIPE** on `/r/pipeline` · `journeys/hire-c/Pipeline.tsx`

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-056 | Candidate stage detail | Pipeline | A | `/r/pipeline` · `Card` | The card expands in place to show stage history (who, when), the next step, the interview and a link to the thread on `/r/messages`. |
| SC-058 | Offer and negotiation handoff | Pipeline | A | `/r/pipeline` · `Pipeline` | Moving someone to **Offer** opens a sheet (like `RejectForm`): pay inside the band, approver, and an offer message drafted into the `/r/messages` approval. The candidate's counter appears in the same thread. |
| SC-060 | Placement outcome journal | Pipeline | A | `/r/pipeline` · `Card` for HIRED | Add "Record outcome": start date plus 30/90-day check-ins (still there, rating against the brief). Entries are written to the event log. This feeds V29. |
| SC-140 | Agency placement and invoice status | Agency | A | `/r/agency/submittals` · `Submittals` | Add a "Placed" state per submittal with fee terms and invoice status (draft / sent / paid, simulated). The client is shown only on its own mandate. |

### Scheduling and correspondence (P6–P8, Addendum 08)

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-053 | Calendar booking | Scheduling | A | `/r/calendar` · `Calendar` ("Interviews, holds and invitations") | Show the commit step explicitly: hold → "Book" → provider receipt row (time, calendar, simulated ID). This also moves SC-154's receipts off the legacy `/r/calendar/connect`. |
| SC-159 | Interview reminder and follow-up queue | Scheduling | A | `/r/messages` · `Messages` | Add a "Scheduled" filter listing reminders and follow-ups Q will send (when, to whom, under which delegation), each with skip, edit or send now. Source it from `q/proactive/hire-c.ts`. This closes the V35 gap. |

### Candidate Evidence Passport (P9) · group **G-PASS** on `/c/passport` · `journeys/talent-b/Passport.tsx`

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-071 | Work authorisation and permits | Candidate evidence | A | `/c/passport` · "Add proof" | Add a new item kind "Right to work" with issuer check states (reuse cert pending/failed/manual). It is private by default and never used as a search filter without explicit share. This closes the V16 gap. |
| SC-076 | Candidate work critique | Candidate evidence | A | `/c/passport` · Preview | Add "Q's read of this project": what it shows and what it doesn't. Reuse the structure of `hire-b/ProjectViewer.tsx` so the candidate sees what recruiters will see. It is private. This closes the V17 gap. |
| SC-077 | Candidate revision history | Candidate evidence | A | `/c/passport` · item detail | Add a "Versions" list, newest first, with the old version readable, mirroring "Every version" in `hire-a/Roles.tsx`. Shared organisations keep the version they were shown. |

### Jobs, applications and CV · group **G-APPLY**

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-087 | Cover letter / message builder | Candidate jobs | A | `/c/jobs/:id` · `JobDetailPage` ("Your application") | Add an optional message drafted only from her claims and Passport. Each line is approved, as in the CV builder, and the share preview includes it. |
| SC-088 | Resume revision comparison | Candidate jobs | A | `/c/welcome` · `Onboarding` (CV view) | Add CV versions with a line diff. Reuse the draft-diff pattern from `/r/messages`. |
| SC-175 | Rejected application recovery coaching | J7 | A | `/c/applications` · `ApplicationsPage` | A "Not progressing" card gets "What you can do next": the gaps against that job's needs and a link to add them to the `/c/career` plan. It never guesses the employer's reason. |
| SC-107 | Candidate interview feedback | Interviews | A | `/c/applications` timeline + `/r/interviews/:id` SUBMITTED | The recruiter can "Share feedback with the candidate" (approval, edited text only). The candidate sees it as a timeline item. This closes the V21 gap. |

### J7 career (P10) · group **G-J7** on `/c/career` · `journeys/career/Career.tsx`

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-092 | Resource and learning player | J7 | A | `/c/career` · Plan view | A "learning" plan step opens a sheet with a 3–5 minute text lesson (with source and licence), one check question and "mark done". It counts as practice, never as proof. This closes the V22 gap. |
| SC-172 | Career work sample improvement wizard | J7 | A | `/c/career` · Record view (assessed work sample) | Wrap the existing "improve and resubmit" in 3 steps (what the rubric said → what to change → resubmit). It is the same op, so this costs little. |

### Interviews and assessments (P11) · group **G-IV**

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-095 | Question bank studio | Interviews | A | `/r/interviews/:id` · `InterviewRoom` BRIEF step | Add a "Must-ask (locked by Kora)" block above the gap questions: uploaded questions with lock icon, source and version. Only admins edit them, from `/r/setup/handbook`. This closes the SC-096 gap and V14. |
| SC-106 | Interview transcript and evidence | Interviews | A | `/r/interviews/:id` · SUBMITTED step | Add "Notes and evidence": the interviewer's notes per requirement. For a `/c/interview` real interview, add the candidate's submitted answers. Label it honestly: there is no audio transcript. |
| SC-109 | Recruiter interview coaching | Interviews | A | `/r/interviews/:id` · SUBMITTED step | Add private "How it went" notes for the interviewer only: requirements not probed, leading or non-job questions flagged and one tip. This closes V20. |
| SC-114 | Work sample submission review | Interviews | A | `/r/people/:id` · `Profile` ("How to check") | Show a submitted work sample with rubric criteria. The recruiter marks shown / not shown per criterion, and the result lands as evidence with provenance. |
| SC-102 | Avatar video interview room | Interviews | C | → C3 | |
| SC-103 | Human live interview room | Interviews | C | → C3 | The copilot exists (`/r/interviews/:id`). The call itself needs a video provider. |
| SC-111 | Code exercise sandbox | Interviews | C | → C4 | |
| SC-112 | Cyber incident exercise | Interviews | C | → C4 | |
| SC-113 | Sales/customer service simulation | Interviews | C | → C4 | |

### Q artifacts and tools (P1)

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-124 | Q chart and map result | Q brain | B | GS-17 "Q returns a chart" | A small bar chart in a Q reply, with a "table view" toggle and a source line. It shares the specimen with MO-031. |
| SC-126 | Q diagram/graphics viewer | Q brain | B | GS-17 (second tab) | A simple flow diagram with a text alternative. |
| SC-127 | Q narrated video viewer | Q brain | C | → C6 | |
| SC-128 | Q secure browsing view | Q brain | C | → C5 | |
| SC-130 | Q download/extraction view | Q brain | C | → C5 | |

### Admin and audit

| ID | Title | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| SC-144 | Model and scoring version inspector | Admin | A | `/r/audit` · `Audit` | Each fairness or score entry shows "rules v1 · rubric v3 · guideline v3" and opens what each version said. It reads versions already in the store. This closes the V24 gap. |
| SC-141 | Enterprise compliance dashboard | Admin | C | → C7 | |
| SC-142 | Enterprise organisation reports | Admin | C | → C7 | |
| SC-145 | Bias and assessment quality dashboard | Admin | C | → C7 | It needs real outcome volumes, and synthetic numbers would mislead. |

---

## 2. Motions not represented (23)

| ID | Name | Surface | Dec. | Route · component | What to add |
|---|---|---|---|---|---|
| MO-013 | Candidate comparison morph | Compare | A (in code) | `/r/compare` · `journeys/hire-b/Ledger.tsx` | **Already implemented**: rows use `layout="position"` and widths ease on re-weight (header comment cites MO-013). Record the evidence and capture a clip. |
| MO-021 | Answer recorded | Interview room | A (in code) | `/c/interview` · `talent-c/InterviewRoom.tsx` | **Already implemented**: a "saved" note after each answer (comment cites MO-021). Record the evidence. |
| MO-022 | Interview progress | Interview room | A (in code) | same | **Already implemented**: segmented progress (comment cites MO-022). Record the evidence. |
| MO-025 | Interview complete | Interview | A (in code) | same · `PracticeDone`, `RealDone` | **Now in code**: `talent-c-endmark` scales in (uncommitted builder edit). The registry note saying "no motion" is stale. Confirm after merge. |
| MO-029 | Candidate share revoked | Portfolio | A (in code) | `/c/passport` · `styles/talent-b.css` `.tb-cell` | **Already implemented**: a 160 ms colour transition on share and end access (CSS comment cites MO-029). Record the evidence. |
| MO-004 | Q speaks | Voice/video | A | `/c/interview` · `InterviewRoom` "Say it again" | While `reading` is true, show `QMark` in a speaking mood (core pulses with the utterance; still under reduced motion and lite mode). Today only the label changes. |
| MO-005 | Q interrupted | Voice/video | A | same | Stopping the reading (second press, or the mic opening) collapses the pulse and shows "Stopped". Same change as MO-004. |
| MO-024 | Interview paused | Interview | A | `/c/interview` · pause banner (`room.paused`) | Fade the answer card to `data-paused` and slide the banner in with `arrive`. There is no motion today. |
| MO-018 | Question plan appears | Interview plan | A | `/r/interviews/:id` · BRIEF "Questions from the evidence gaps" | Stagger the questions in with `arrive` (DUR.normal, 40 ms each). |
| MO-023 | Live Q suggests follow-up | Live companion | A | `/r/interviews/:id` · LIVE "That answer sounds general" | Make the follow-up block enter with `arrive` and a gold left rule. |
| MO-026 | Candidate score review | Employer review | A | `/r/interviews/:id` · FEEDBACK step | The rubric rows fill one by one from Q's draft. The human edits come after, so there's no implied verdict. |
| MO-014 | Job preference filter | Explore Jobs | A | `/c/jobs` · `JobsPage` list | Wrap the job cards in `motion` `layout` so cards re-flow when a filter changes. |
| MO-030 | CV draft generated | CV builder | A | `/c/welcome` · `Onboarding` CV view | CV lines arrive with `Arrive` from `ui/kit` one at a time, each with its source chip. |
| MO-040 | Candidate application status | Applications | A | `/c/applications` · status tag | Cross-fade the status tag and add a new timeline entry with `arrive` when the employer acts. |
| MO-041 | Consent change | Privacy | A | `/settings` and `/c/passport` discovery | Add `SwitchRow` thumb travel plus a one-line "Saved: verified employers only" confirmation that fades out. |
| MO-046 | Invite delivery status | Inbox | A | `/r/messages` · message status | Status steps (queued → sent → delivered → read, simulated) tick in place. Offline shows as queued. |
| MO-052 | J7 evidence sharing approved | Evidence Passport | A | `/c/career` · Record (`ta.share.do`) | The competency glyph morphs practice → proof only after approval, with an undo chip. Reuse the existing keyed glyph scale from MO-050. |
| MO-031 | Graphic from Q | Q canvas | B | GS-17 | The chart draws in, then the table toggle appears. |
| MO-034 | Download scanned | File vault | B | GS-18 "File checked before opening" | Show scanning → passed / blocked with a reason, then "open in the safe viewer". This demonstrates the C5 behaviour without building C5. |
| MO-035 | Agent budget warning | Q planner | B | GS-19 "Budget nearly used" | An agent lane hits 80 % of the budget, Q pauses it and asks: "continue up to ₦X" or "stop here". |
| MO-056 | Q conflicting evidence | Q memory | B | GS-13 "Sources disagree" (existing) | Animate the existing static specimen: the two claims slide apart and the "ask in interview" line appears. |
| MO-032 | Video artifact available | Q canvas | C | → C6 | |
| MO-038 | Desktop-mobile narrative transition | Demo film | C | → C11 | This is a film-editing transition, not product UI. |

---

## 3. Vision groups not represented (10)

| ID | Requirement | Indicative screens | Dec. | Where / how |
|---|---|---|---|---|
| V09 | WhatsApp and conventional calling | SC-023, SC-053, SC-047 | A (+C) | WhatsApp: SC-023 channel verification on `/r/setup`, plus WhatsApp as a simulated channel in `/r/messages` and the candidate's channel preference in `/settings`. Calling: C12. |
| V14 | User-uploaded locked interview questions | SC-095, SC-096, SC-019 | A | SC-095 on `/r/interviews/:id`, with questions sourced from the `/r/setup/handbook` upload. |
| V20 | Interviewer quality coaching | SC-109, SC-057 | A | SC-109 on `/r/interviews/:id`. `/r/interviews` lists "coaching available". |
| V26 | Agent-generated art, chart and video | SC-122, SC-124, SC-127 | B (+C) | GS-17 chart/diagram specimen. Video goes to C6. |
| V03 | Low-latency, cheap provider orchestration | SC-120, SC-035, SC-080 | C | → C8 |
| V06 | Web search, safe scraping/fetch, links | SC-033, SC-128, SC-136 | C (+A) | C5. SC-033 and SC-136 (A) show source choice and provenance now. |
| V07 | Safe internet file downloads | SC-130, SC-068 | C (+B) | C5. MO-034 specimen GS-18. |
| V29 | Q improves with users and results | SC-133, SC-144, SC-145 | C (+A) | C9. SC-060 outcomes and SC-144 versions (A) provide the data hooks. |
| V32 | Avoid infrastructure hell | SC-028, SC-035, SC-099 | C | → C8 |
| V40 | Graphified code understanding | SC-179 | C | → C10 |

---

## 4. Future capabilities (C specs)

Shared building blocks from `src/ds`: `AppShell`, `Canvas` (views, versions, building), `Split`/`Thread`/`EntryView`, `QMark` (+`moodOf`, `presenceLine`), `Glyph`/`GlyphKey`, `SwitchRow`, motion tokens `DUR`/`EASE`/`arrive`, and the classes `ds-sheet`, `ds-table`, `ds-banner`, `ds-chip`, `ds-filter`, `ds-tabs`, `ds-skeleton`, `ds-sim`, `ds-used`, `ds-why`, `ds-suggest`, `ds-btn`, `ds-field`/`ds-input`, `ds-opt`, `ds-tag`. Public pages register with `side: 'public', bare: true`, as `/signup` does.

| ID | Capability (covers) | Purpose · user · entry | Reuses from `src/ds` | Data | States | Dependencies |
|---|---|---|---|---|---|---|
| C1 | Public marketing site (SC-001–006, SC-013) | Explain Talent Q and convert visitors. Users: employers, talent, buyers. Entry: `/`, `/how`, `/employers`, `/talent`, `/pricing`, `/trust`, `/try` (bare public routes). The `/` persona chooser moves to `/demo`. | `QMark` (hero, idle → thinking in the sample), `Thread` + `EntryView` for the scripted sample, `Glyph`/`GlyphKey` on the trust page, `ds-sheet`, `ds-btn`, `ds-sim` | Static copy plus a pricing table (from C2). The sample uses a fixed script with no store writes. | Default, reduced-motion, lite (low bandwidth), sample-running, sample-limit-reached → sign up | Pricing decision (C2), legal review of trust claims, the founder's brand copy |
| C2 | Billing and usage (SC-024; pricing for SC-005) | Owners see plan, seats, Q usage and invoices. Entry: `/r/setup` → "Billing" tab, admins only. | `Canvas` views (Plan · Usage · Invoices), `ds-table`, `ds-banner` (limit near), `SwitchRow` (auto top-up), `ds-sim` | Plan, seats, metered runs, agent minutes, outreach sends, invoices | Trial, active, near limit, over limit (Q pauses non-urgent runs), payment failed, cancelled | Payment provider (Paystack/Stripe), pricing model, tax/VAT per country |
| C3 | Video and live interview rooms (SC-102, SC-103; V10 video) | Real-time interviews. SC-103: human interviewer with Q copilot alongside. SC-102: optional avatar Q interviewer. Entry: the `/c/slots` confirmed invite → "Join", and `/r/interviews/:id` LIVE. | `Split` (call ‖ copilot `Thread`), `QMark` listening/speaking, the existing live rubric and notes, `ds-banner` for connection, `SwitchRow` (camera off / captions) | Session, consent to record, captions, notes (not a judgement on the face or voice) | Pre-join check, waiting room, live, degraded (falls back to audio, then to the text room `/c/interview`), recording consent refused, ended → SC-106 | WebRTC provider, captions/ASR, avatar vendor (SC-102 only), legal on recording, bandwidth floor. Text/form parity must stay. |
| C4 | Practical assessment simulators (SC-111, 112, 113) | Role-specific work tests: code, incident response, sales call. Entry: `/r/people/:id` "How to check" → assign; the candidate opens it from `/c/messages`. | `Canvas` (brief · workspace · submit), `Glyph` rubric marks, the GS-05 upload pattern, the GS-10 resume pattern, `ds-sim` | Exercise definition, rubric, attempt, submission, review (into SC-114) | Assigned, in progress (autosave), paused, accommodation applied, submitted, reviewed, disputed (SC-116) | Sandboxed code runner, scenario authoring, ASR for the sales simulation, rubric validation |
| C5 | Q web tools: browse, fetch, download, extract (SC-128, SC-130; V06, V07; MO-034 behaviour) | Q researches the open web and files safely. Entry: Q thread run step → "open in safe view". The `/r/plan` Sources view (SC-136) lists what was fetched. | The `ProjectViewer` sandbox pattern (`hire-b/ProjectViewer.tsx`), `ds-skeleton`, `ds-used` (source chips), `ds-why`, GS-18 scan states | URL, fetch time, licence/robots result, scan result, extracted text with provenance | Allowed, blocked by policy, robots-disallowed, scanning, malware blocked, extracted, stale | Fetch service with allow-list, malware scanner, robots/licence checks, Q firewall (`q-firewall` in `neo1415/q`) |
| C6 | Q media artifacts: narrated video (SC-127, MO-032; V26 video) | Q produces a short explainer, for example a role brief walkthrough. Entry: Q reply "make a 60 s video" → artifact in `Canvas`. | `Canvas` building/versions, `QMark` working with agents, `ds-sim`, transcript as text alternative | Script, voice, frames, captions, cost | Queued, rendering (truthful %), ready, failed (offer text version), budget refused | TTS and video model vendor, cost budget (MO-035), captioning |
| C7 | Enterprise assurance (SC-141, SC-142, SC-145) | Compliance and fairness oversight across teams. Users: enterprise admin, DPO. Entry: `/r/audit` → "Reports" view. | `Canvas` views, `ds-table` (with table-first chart fallbacks), `Glyph`, `ds-banner` (insufficient data) | Aggregated audit events, retention status (SC-025), rubric/guideline versions (SC-144), adverse-impact ratios by stage | Insufficient sample (shows no ratio), within threshold, flagged, exported | Real outcome volume, a legal definition of protected groups per country, consented demographic collection, statistician review |
| C8 | Provider orchestration and infrastructure (V03, V32) | Route each Q step to the cheapest adequate model or provider with fallbacks, without the team running its own infrastructure. No new screen: it surfaces through the existing run states (SC-120) and `/r/plan` source health. | `QMark` blocked/offline, GS-09 retry pattern | Provider registry, latency/cost per call, fallback chain | Primary ok, degraded → fallback, all down → queued (GS-06) | Model gateway in `neo1415/q`, managed hosting choices, cost telemetry |
| C9 | Learning loop (V29) | Q improves rubrics and matching from outcomes, with human approval. Entry: `/r/audit` versions (SC-144) → "proposed change". | `ds-suggest` (proposal + why), the `Roles` version list pattern, `ds-table` | Placement outcomes (SC-060), corrections (SC-178), dispute results (SC-116) | Proposed, approved (new version), rejected, rolled back | Enough outcome data, evaluation harness, governance sign-off |
| C10 | Code graph understanding (V40) | Q reads a candidate's repository as a graph (modules, ownership, tests) to explain what the work shows. Entry: `/r/people/:id` project viewer → "how it's built". | `ProjectViewer`, `Glyph` (shows / doesn't show), `ds-skeleton` | Repo snapshot, parsed graph, the candidate's consent | Not shared, indexing, ready, too large, private repo refused | Code indexing service, candidate OAuth consent, SC-179 context pack |
| C11 | Demo film transition (MO-038) | Film editing: one moment cut between desktop and phone. Entry: `captures/video` pipeline. | Captures of existing routes at 1440 and 390 | Paired captures | n/a | Video edit tooling. It is not a product feature. |
| C12 | Conventional calling (V09 calling) | Click-to-call or callback for candidates without data. Entry: `/r/messages` thread → "Call". | `ds-banner`, `ds-sim`, approval chip (GS-03) | Number, consent, call log (no recording by default) | Consent missing, ringing, no answer → SMS fallback, completed | Telephony provider, consent law per country |

---

## 5. Represented items whose evidence looks thin or wrong

| Item(s) | Status | Problem found in code | Suggested fix |
|---|---|---|---|
| SC-027, 028, 036, 039, 041, 045, 049, 117, 118, 133, 158, 177, 178 | INTEGRATED | The only evidence is `captures/screens/p0x-*`, all committed 2026-10-27. The hosting files (`QHome`, `MandateIntake`, `Sourcing`, `Compare`, `Outreach`, `Memory`) changed on 2026-10-29, and `QHome` and `Compare` are being edited now. All the notes are the same generic sentence. | Recapture after the builders merge, and cite code paths plus a qa log per item. |
| SC-049, SC-158 (INTEGRATED); SC-047, SC-048 | INTEGRATED / PROTOTYPED | `/r/outreach` is a legacy bridge (`screens/Outreach.tsx`) with no nav entry; only Q skills link to it. The live approval surface is `/r/messages`. | Re-point to `/r/messages`, or state that `/r/outreach` is the delegation-mode page. |
| SC-162 | INTEGRATED | `/c/growth` is unlisted (no nav). The evidence is from the old p10 captures, and the J7 work moved to `/c/career`. | Downgrade to PROTOTYPED or recapture. |
| SC-122 | PROTOTYPED | Mapped to `/r/compare`, but `Compare`'s `Canvas` passes no `views`/`versions`. Artifact views and versions live on `/r/roles/:id`, `/c/passport` and `/c/career`. | Re-point to `/r/roles/:id`. |
| SC-029, 040, 120, 121, 123, 135, 179 | PROTOTYPED | Evidence is empty. The code does support them: the `MandateIntake` form, the `Compare` inspector and `ds-table`, the `Sourcing` steps and `failedSource` banner, `QHome` "Recently", and `Memory` "What Q would use". | Add the code paths as evidence. |
| MO-015 | PROTOTYPED | `/r/mandate` (`MandateIntake.tsx`) has no motion code at all. The evidence is film F1 of an earlier screen. | Re-point to the `/r/roles/:id` versions, or downgrade. |
| MO-003 | PROTOTYPED | "Q thinks" is the global `QThread` `QMark`, not the mandate page. | Re-point the route to `/r/home` (or any route). |
| MO-043, 044, 045, 047 | PROTOTYPED | `/c/slots` renders `CandidateSlots`, which has no motion. The only motion is the toast in the legacy `SlotPicker`, hidden in a collapsed `<details>`. Films F3 predate the rebuild. | Downgrade, or add motion to `CandidateSlots`. This is high priority (P8). |
| MO-036, 039, 042 | PROTOTYPED | These point at legacy bridges off nav (`/r/calendar/connect`, `/r/setup/handbook`). The main `/r/calendar` and `/r/setup` have no such motion. | Keep, but note that they are legacy-only. |
| MO-001, 009, 027, 028, 057 | PROTOTYPED | Evidence is empty. MO-028 is backed by the `toast` in `Outreach`. MO-057 has no visible motion in `Outreach`. | Add evidence, or downgrade MO-057. |
| MO-002 | PROTOTYPED | Under-claimed: the note says the mic isn't animated, but `styles/talent-c.css` now has the MO-002 breathing ring on `.talent-c-mic`. | Update the note and evidence. |
| V41 | **VERIFIED** | The evidence is a sentence ("design canvas + …"), and the route `/` is the demo chooser. VERIFIED requires captures, axe and review. It also cites SC-001, which is not represented. | Downgrade to INTEGRATED/PROTOTYPED, or cite `design-system/` and `tokens/` with a build log. |
| V04, V28, V33–V38 | PROTOTYPED | The route is "see screens", which is not a route. | Give each one a primary route. |
| V28 | PROTOTYPED | The only evidence is film F8, which shows the earlier Passport that is no longer routed (per the MO-029 note). | Cite `/c/passport` and T3 logs. |
| MO-013, 021, 022, 025, 029 | RESEARCHED | Under-claimed: these are implemented in code (§2). | Promote with evidence once the builders' edits land. |

---

## 6. Implementation list: cheapest A/B first, in founder priority order

S is under ½ day, M is ½–2 days and L is more than 2 days. Do the "record" rows as registry edits only after the builders merge.

| # | Pri. | Change | Covers | Size |
|---|---|---|---|---|
| 1 | P5/P9/P11 | Record evidence for the motions already in code | MO-013, 021, 022, 025, 029 | S |
| 2 | P1 | GS-17 "Q returns a chart" (chart draws in, table toggle, diagram tab) | SC-124, SC-126, MO-031, V26 | S |
| 3 | P1 | GS-19 budget warning + GS-18 download scanned | MO-035, MO-034 (V07 behaviour) | S |
| 4 | P2 | `/r/setup`: Retention section | SC-025 | S |
| 5 | P2 | `/r/setup`: Your own instructions + Templates (guideline-row reuse) | SC-020, SC-021, V12 gap | M |
| 6 | P2 | `/r/setup`: Channels (verify steps) + Data sources (provider-health card) | SC-023, SC-146, V09 | M |
| 7 | P3/P4 | GS-16 search found nobody | SC-046 | S |
| 8 | P3/P4 | `/r/roles/:id` editable source chips; `/r/plan` Sources view | SC-033, SC-136, V06 (partial) | M |
| 9 | P3 | `/r/roles` "Explore without a role" | SC-034 | M |
| 10 | P6 | `/r/messages` delivery status ticks + WhatsApp simulated channel | MO-046, V09 | S |
| 11 | P6 | `/r/messages` "Scheduled" reminders filter | SC-159 | M |
| 12 | P7/P8 | `/r/calendar` hold → Book → receipt row; add motion to `CandidateSlots` (fixes the MO-043–047 flag) | SC-053, MO-043–047 | S |
| 13 | P9 | `/c/passport` Versions list | SC-077 | S |
| 14 | P9 | `/settings` + Passport consent confirmation motion | MO-041 | S |
| 15 | P9 | `/c/passport` Right to work item; Q's read of a project | SC-071, SC-076 | M |
| 16 | P10 | `/c/career` share-approved glyph morph; resubmit stepper | MO-052, SC-172 | S |
| 17 | P10 | `/c/career` learning-step sheet | SC-092, V22 gap | M |
| 18 | P11 | `/c/interview` Q speaks/stopped `QMark` mood during `reading`; pause motion | MO-004, MO-005, MO-024 | S |
| 19 | P11 | `/r/interviews/:id` motions: plan stagger, follow-up arrive, rubric fill | MO-018, MO-023, MO-026 | S |
| 20 | P11 | `/r/interviews/:id` SUBMITTED: notes and evidence + private coaching | SC-106, SC-109, V20 | M |
| 21 | P11 | `/r/interviews/:id` locked must-ask questions | SC-095, V14 | M |
| 22 | P12 | Animate GS-13 sources disagree | MO-056 | S |
| 23 | — | `/signup` sign-in step | SC-008 | S |
| 24 | — | `/c/jobs` filter re-flow; `/c/applications` status cross-fade; `/c/welcome` CV lines arrive | MO-014, MO-040, MO-030 | S |
| 25 | — | `/c/applications` recovery coaching + shared interview feedback | SC-175, SC-107 | M |
| 26 | — | `/c/jobs/:id` cover message; `/c/welcome` CV version diff | SC-087, SC-088 | M |
| 27 | — | `/r/audit` version inspector | SC-144 | M |
| 28 | — | `/r/people/:id` work sample review | SC-114 | M |
| 29 | — | `/r/pipeline` stage detail, offer sheet, outcome journal | SC-056, SC-058, SC-060 | L |
| 30 | — | `/r/agency/submittals` placed + invoice state | SC-140 | M |

Once all 30 rows are done, every one of the 183 / 57 / 41 atlas items is represented as a route, a state or section, a gallery specimen, or a spec'd future capability. No new standalone screens are added.
