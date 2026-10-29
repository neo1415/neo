# Addendum build brief (29 Oct): four features plus connected email, in one connected journey

Read this whole file before doing anything. It is shared by four builders working in parallel in the same working tree.

## Read first

1. The founder's two addenda, which are binding:
   - `/root/.claude/uploads/f24dbdcf-3d7a-552d-a43c-d7c010be65d0/1fc07cf0-Talent_Q_Design_Audit_and_Feature_Addendum_2026-10-29.md`
   - `/root/.claude/uploads/f24dbdcf-3d7a-552d-a43c-d7c010be65d0/32fd5c9b-Talent_Q_Email_and_Correspondence_Addendum_2026-10-29.md`
2. The connected journey (a service blueprint with the disruptions): `journeys/J11-CONNECTED-JOURNEY.md`.
3. The requirements you must satisfy: `registry/ADDENDUM-REQUIREMENTS.csv`. Cite their IDs.
4. The shared model, which is already written. Extend it; don't redefine it.
   - Types: the addendum section of `prototype/src/state/domain.ts` (Msg/Thread extensions, HiringCampaign, Rubric*, Rating, MediaEvidence, MediaReview, MailboxConnection, ContactPolicy, Suppression, FollowUpRule).
   - Slices and seeds: `prototype/src/state/areas/{campaigns,rubrics,media,mail}.ts`. Note `roleIndex()`: the index is never shown without coverage.
5. Design rules:
   - `design-system/DIRECTION-D-SYSTEM.md` (the system, including its execution rules)
   - `handoff/DESIGN-QUALITY-GATE.md` (the gate you must pass)
   - `journeys/DESIGN-PASS-BRIEF.md`, then one existing area file such as `journeys/design/hire-b.md`, to see the expected standard
   - `handoff/PRIVACY-AND-PERMISSIONS.md`

## Rules

- **Skills before code, through the Skill tool.** Invoke at least `design-skills:design-critique`, `design-skills:design-elevation`, `design-skills:interaction-design` and `design-skills:ux-writing`. Add `dataviz` when you show scores, coverage, timelines or progress, and `design-superpowers:creative` only if you need a new visual idea inside Direction D. The founder checks this: invocations are counted from transcripts. Record skill → screen → change in your design file.
- **Critique the rendered interface, not the code.**
  1. Render each new or changed screen at desktop (1440×900) and phone (390×844, deviceScaleFactor 2), full page, with Playwright (`/opt/node-tools/node_modules/playwright/index.js`).
  2. Look at the screenshots, critique them with `design-critique` (heuristics and severity), fix, and re-render.
  3. Keep first-render vs final pairs in `captures/review/pairs/<feature>/NN-before.png|NN-after.png`, with a caption in your design file.
- **Extend, never duplicate.** The existing messaging (`w.threads`, `journeys/hire-c/*`, `CandidateMessages`), role briefs (`MandateX`, the legacy `w.mandate` for `m_backend`), agency outreach campaigns, the Evidence Passport and the comparison are the base. A second inbox, role entity, evidence store or scoring page is a defect.
- **Simulate honestly.**
  - Every provider action (Google, Microsoft, SMTP, transcription, link fetch) carries a visible "Simulated" label.
  - Statuses are truthful: "Accepted by Google (simulated)", never "delivered" or "read" without evidence.
  - Never claim AI analysis, validation or usability testing that didn't happen.
- **Policy is not optional.** Consent, tenant isolation (`canSeeCandidate`, `visibleEvidence`, `visibleSegments`), the contact policy, suppression, and no prohibited inferences from face or voice. Q refuses with a reason and an alternative.
- **Use Q, the way the rest of the product does.** Every capability is reachable by saying it to Q (skills in `q/skills/*.ts`, registered by glob) and by visible controls. Proactive rules live in `q/proactive/*.ts`, carry a reason, and use one subject per thing.
- **Phone first.** No sideways scroll at 390 px; the primary action is reachable; long pages use `PageIndex` from `src/ds/PageIndex.tsx` (the lead is adding it; if it isn't there yet, leave a TODO and tell the lead).
- **Ownership.** Edit only your files (listed in your brief). For anything shared, put the request in your final report. Shared files: `src/ds/*`, `src/q/QThread.tsx`, `src/q/core/*`, `src/mock/world.ts`, `src/state/domain.ts`, `src/routes/entry.tsx`, `src/routes/registry.ts`, `src/app/*`. If you must add a field to a domain type, make it optional and report it.
- **Tests.**
  - Write `qa/scripts/features/<feature>.mjs`, covering your states on desktop and phone, in the style of `qa/scripts/journeys/R3.mjs` (PASS/FAIL lines, `window.__tqQA`).
  - Run the existing journeys you could affect (listed in your brief) against your own build, and fix any regression you caused.
  - `npx tsc --noEmit -p .` must be clean.
- **Dev server.** Use your own port: `npx vite --port <PORT> --strictPort` from `talent-q-design/prototype`. To test against a stable build, run `npx vite build --outDir <scratch>/<feature>-dist` and serve it with `python3 -m http.server`. Kill only your own processes, by PID.
- **No commits.** The lead integrates and commits.
- **Handoff.** Write `journeys/handoff/<feature>.md`, covering:
  - entities and data ownership (module from `handoff/MODULE-MAP-AND-ROADMAP.md`);
  - consent and tenant rules;
  - APIs, events and Q tools, with approval classes;
  - task boundaries;
  - costs and caching;
  - failure and recovery;
  - risks;
  - validation still required.

## The connected journey (J11): the exact steps the lead's test drives

Use these utterances and paths so the parts join up. Match casual variations too.

| # | Who | Where | Says or does | Result | Owner |
|---|---|---|---|---|---|
| 1 | Tobi `p_tobi` | `/c/jobs/j_kora_backend` | Plays the role briefing; asks "is the on-call real?" | Q answers from the briefing transcript and quotes the time (e.g. 1:12) | EMAIL (briefing component) |
| 2 | Tobi | same | "can I contact someone about this role?" then "send it" | Q shows Kora's policy before drafting; a 3-line editable question; sent in-app; thread `initiatedBy: CANDIDATE`, state OPEN; status visible in `/c/messages` | EMAIL |
| 3 | Ada `u_ada` | `/r/messages` | "put this in the Q4 Engineering campaign" | Thread gets `campaignId: c_q4_eng`, `mandateId: m_backend`; audit event | EMAIL (uses `campaigns` slice) |
| 4 | Ada | `/r/campaigns/c_q4_eng` | Opens the campaign | Roles with stage counts, next actions, Tobi's message under Senior Backend | CAMPAIGN |
| 5 | Ada | `/r/roles/m_backend/rubric` | "propose a rubric for the senior backend role", "make incidents and on-call weight 2", "approve the rubric" | Q_PROPOSED → edited → v1 APPROVED (frozen) | RUBRIC |
| 6 | Ada | thread | "ask Tobi for a walkthrough video of his reconciliation work" | An in-app request in the same thread, approved and sent (simulated) | EMAIL |
| 7 | Tobi | `/c/passport` | "add a video"; consent (Kora only, purpose, 90-day expiry, text alternative offered); pastes `https://bit.ly/3xRecon` → UNSAFE_LINK; uploads; offline at 40% → PAUSED → resume → TRANSCRIBING → REVIEW (corrects a line) → shares segments 1 and 3 with Kora, **not** 2 | READY; nothing of segment 2 is visible to Kora | MEDIA |
| 8 | Ada | `/r/people/p_tobi/video` | Opens Q's report; "lower postgres to 2, the tuning was on synthetic data"; "mark the report reviewed" | Findings mapped to rubric v1 criteria with timestamps and uncertainty; "not shown" lists criteria only segment 2 could show; index **with** coverage; override audited with reason | MEDIA (report), RUBRIC (scorecard on profile and compare) |
| 9 | Ada | rubric | "add mentoring to the rubric", "approve it" | v2 needs a change notice: Tobi (and Ifeoma, if rated) were assessed on v1; choices: notify and reassess, or keep v1 for this round. v1 ratings stay on v1 | RUBRIC |
| 10 | Ada | thread | "email Tobi an interview invite for Thursday or Friday" | Composer: sender Ada (Google Workspace), recipient, campaign, checks, approval of the exact content. The demo control "Simulate token expiry" (or the seeded state) gives FAILED AUTH_EXPIRED → reconnect at `/settings/email` → resend with the same idempotency key → ACCEPTED (simulated). "send it again" → "Already sent at …" | EMAIL |
| 11 | Ada | anywhere | "send it from the CEO's gmail" | Refusal with what access is needed; offers a draft for the owner | EMAIL |
| 12 | Tobi | `/c/messages` | Replies by email "Thursday 14:00 works" (simulated inbound with a changed subject) | In Ada's thread with `subjectChanged`; Q asks Ada to confirm the match; then proposes booking Thursday 14:00 against calendars; books (simulated) and confirms | EMAIL |

The seeded data the journey assumes:
- Tobi's video is "Reconciliation service walkthrough", 6:00 long, with three segments:
  1. Payments reconciliation, 0:00–2:10
  2. Client dashboard (confidential), 2:10–3:40
  3. Postgres tuning, 3:40–6:00
- Content hash `sha256:9f2c…demo`. MEDIA seeds the transcript.
