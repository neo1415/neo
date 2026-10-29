# Engineering handoff · hire-b (R2 Ada, a non-technical recruiter hiring a Senior Backend Engineer at Kora Pay)

Specification only. The prototype is the behavioural and design blueprint, not the implementation. Every
"Prototype:" path is under `prototype/src/`. Lines marked **PROD ≠ SIM** say where production must differ.
Journey proof: `qa/scripts/journeys/R2.mjs` (74 steps, desktop + phone). Privacy proof: `qa/scripts/review/privacy.mjs`.
Code map: rules `journeys/hire-b/model.ts`, ops `journeys/hire-b/ops.ts`, pages `screens/Compare.tsx`,
`journeys/hire-b/{Profile,ProjectViewer,Interviews,Ledger}.tsx`, Q cards `journeys/hire-b/refs.tsx`, skills
`q/skills/hire-b.ts` (ids `hire-b.*`), proactive `q/proactive/hire-b.ts`, state `state/areas/hire-b.ts`, seed `state/seeds/hire-b.ts`.

## 0. Defaults every feature inherits
- **Tenancy.** The employer org (`org_kora`) is the tenant. Every hire-b record (corrections, plans, live notes, ratings,
  feedback, reviews, "seen" markers) carries `orgId` and the actor. **PROD:** use row-level security on `org_id`.
  A query without the predicate fails closed.
- **Candidate privacy is central and read-time.** All candidate reads go through `canSeeCandidate`,
  `visibleEvidence` and `relationshipWith` (`mock/world.ts`). Withdrawn consent → nothing. Revoked item → not shown,
  only counted ("ended access to 1 item"). PRACTICE is never visible. Saved views (comparison people, interview plans)
  are caches: `rank()` re-checks `canSeeCandidate` every read. Services call the policy and never re-implement it.
- **Never one score.** The UI and API expose a level per requirement and an order. A single number exists only
  inside the ranking function and is never shown or exported.
- **Roles.** Panel membership (`interview.panel`) gates the copilot and feedback. Non-panel members read only.
- **Events.** `emit(w, actor, type, scope, text, data)`: `q.corrected`, `pipeline.updated`, `interview.started`,
  `interview.plan`, `interview.feedback`, `interview.disputed` (scope `SHARED:<org>:<person>`),
  `assessment.review.opened|resolved` (SHARED), `integration.retry|recovered`. Audit, memory and proactive rules
  read events, never UI state.
- **Q.** Every capability is reachable by typing (13 skills) and by the page. Both call the same ops
  (`registerOp('hb.*')`). Consequential acts (submit feedback, open a review) need `kind:'approval'`. Corrections
  push an undo. **PROD ≠ SIM:** matching is regex (`criteriaIn`, `peopleIn`, `CHALLENGE`). Production uses an LLM
  with these ops as tools and keeps the same gates, refusals and "only what was shared" rule.

## 1. Candidate profile and evidence provenance — `/r/people/:id` (`Profile.tsx`)
| Aspect | Spec |
|---|---|
| Behaviour | Title = name. Lede = Q's reading in sentences (`ledeFor`). Where they are: stage + 7-step meter. Fit against the brief: one-row ledger + per-requirement level, the items it rests on (links scroll to them), how to check. Shared items grouped Checked / Not checked / Confidential. Banners: offline, "new since you last looked", "impressive CV, thin evidence". States: not found, withdrawn, not allowed. |
| Data | `Evidence{evidenceId, ownerId, kind, title, source, observedAt, verification, origin, visibility, sharedWith, confidential, redactedOf, shows, limits, revokedFrom}`; `EV_REQ` maps evidence → requirement + note + `partial`. `hireB.seen[actor][person] = {at, items:[id:verification]}`. |
| Permissions | Only `visibleEvidence(w, pid, org)`. Confidential items show existence, kind, source, date and never `shows`/`limits`/contents, and are never used in scoring. |
| Backend | `GET /orgs/:org/candidates/:pid/profile` returns policy-filtered evidence with provenance (source, observed date, origin, share scope) and verification state. `POST …/seen` stores the diff basis. **PROD ≠ SIM:** `EV_REQ` is hand-written. Production needs a reviewed mapping evidence→requirement (Q proposes it, a human or reviewer confirms it, it is stored with a version). |
| Rules | Level per item (`itemLevel`): CLAIM → claim; partial flag or older than 2 years → partial; VERIFIED → verified; else evidenced. Cell level = the strongest non-excluded item. A claim never outranks real evidence. A recruiter correction overrides it, labelled "your correction". |
| Failure | Offline: show the loaded copy and say so. Person deleted: "We can't find this person". Consent withdrawn mid-session: permission page on next render, and Q stops using the items. |

## 2. Safe project viewer (`ProjectViewer.tsx`, `projects.ts`)
| Aspect | Spec |
|---|---|
| Behaviour | Read-only. Code is shown as text (never executed). Pages render in `<iframe sandbox="" srcDoc>` with `referrerPolicy=no-referrer`. Scripts are stripped and counted ("switched it off"). Links show their domain and need a second step ("This would leave Talent Q…", simulated). Q explains: summary, what it shows, what it doesn't. |
| Integrations | GitHub connector: `hireB.github{status DOWN/CHECKING/OK, cachedAt, checkedAt, tries}`. Outage → cached copy with date, "unknown, not weak", Retry. **SIM:** the outage clears on the 2nd retry. **PROD ≠ SIM:** a real GitHub App with per-candidate OAuth consent. Snapshots are stored server-side (content-addressed). Rendering happens on a separate sandbox origin (no cookies), with CSP `default-src 'none'`, scripts removed server-side by an HTML sanitiser (not regex `inertHtml`), images proxied, and a size cap. "Repository belongs to the candidate" is a separate verification. |
| Performance | Serve the cached snapshot first and refresh in the background. A skeleton shows while checking (MO-033). Retry with backoff. Never block the profile on the connector. |
| Q | `hire-b.project` explains a project in plain words. `hire-b.github` retries and says so honestly. |

## 3. Comparison and matching — `/r/compare` (`screens/Compare.tsx`, `Ledger.tsx`)
| Aspect | Spec |
|---|---|
| Behaviour | Title states the finding (`headline`). One filter row: people, requirements, switches "last year only" and "weigh must-haves equally". "What changed" note after any change. Ledger: rows ranked; block width = weight; shade = level (validated ordinal ramp); select a block → inspector with every item, including excluded ones and why. Table view twin. Q's notes (`readingOf`) are rewritten from state. |
| State | View per actor: `CompareView{people, criteria, lastYear, weighting:'Q'|'EQUAL', open, last:Snapshot}` (`w.q.ui[actor|/r/compare].cmp`). `setCmp` stores `Snapshot{label, order, scores, cells}` *before* each material change. `addCorrection` stores one too. Undo clears it. |
| Algorithm (validate) | `LEVEL_VALUE` verified 3, evidenced 2, partial 1, claim 0, none 0. `weightOf`: must-have 2, nice-to-have 1; in Q mode payments (r1) ×1.5. Score = Σ level × weight. Order by score, ties shown as "level". Last-year filter excludes items older than 365 days. Disputed/under-review, failed and confidential items are excluded. `describeChange` and `changesSince` produce the plain-words diff (moves, cell changes, lead narrowed/grew). **PROD:** the 1.5× is Q's inference and must stay labelled as such, overridable, and logged. Validate weights with hiring managers. Run an adverse-impact check (no protected attributes; CV, school and name never enter scoring). |
| Corrections | "Tobi's Go library doesn't count as production" → one level down, stored with the actor (`q.corrected`) and undoable. Q never raises a level to *verified* on anyone's word. |
| Performance | Ranking is O(people × criteria × items) and runs on each change (<5 ms here). **PROD:** compute server-side per view and cache by (org, view hash, evidence version). Morph animation is 300 ms, never blocking. |

## 4. Assessment recommendation (`ASSESS`, `assessFor` in model.ts; skill `hire-b.assess`)
- Per requirement: type, time, why, what to avoid. If the person already has *verified* evidence → "don't test it
  again; talk about it". Recommendations are shown on the profile ("How to check") and in Q replies.
- **PROD ≠ SIM:** the table is static. Production stores it per role family, editable by the org, versioned and
  reviewed for fairness (no trick puzzles, paid work samples where length > 1 h).

## 5. Interview questions (`questionsFor`, `QBANK`; skill `hire-b.questions`; card `hb.questions`)
- One question per requirement, chosen by the requirement's level (verified → go deeper; claim → ask for a specific
  example; none → find out). Order: must-haves first, then the least-shown first. "Use these in the interview" saves
  `hireB.plans[interviewId]` (`hb.plan.keep`, event `interview.plan`). Kora guideline: job-related only.
- **PROD ≠ SIM:** an LLM generates questions grounded in the cited evidence ids and the requirement, filtered by org
  guidelines (no protected topics) and stored with their sources. A human can edit or drop each one.

## 6. Live copilot — `/r/interviews/:id` (`InterviewRoom`)
| Aspect | Spec |
|---|---|
| Behaviour | BRIEF → LIVE → FEEDBACK → SUBMITTED (`LiveInterview.step`). Question rail with coverage (asked/noted/rated). "Ask now" with the level before the interview. Notes typed by the interviewer. Vague answers (`isVague`) → follow-ups (`followUpsFor`) beside the question and in Q's card. Live rubric Strong/Some/Not shown per requirement. |
| Rules | Vague = hedges ("helped", "we", "stuff", "kind of") or fewer than 7 words, *and* no number or first-person decision. Follow-ups: "You said 'we'…" first, then requirement-specific, then generic (max 3). Starting moves the pipeline to INTERVIEW. Only the panel can start; PLANNING interviews can't start. |
| Privacy | The copilot reads typed notes only. It doesn't listen to and doesn't record the call. The candidate never sees notes or ratings. **PROD ≠ SIM:** any audio/transcript mode needs explicit candidate consent, a visible recording state and a retention policy. Don't build it without legal review. |
| Responsiveness | A follow-up must appear in under 400 ms after a note is added. It's local rules today; production should send it to the model with a timeout and fall back to the generic list. |

## 7. Feedback (`draftFeedback`, ops `hb.iv.finish|draft|submit`; skill `hire-b.feedback`)
- Q drafts from the ratings and notes. Overall rule: any must-have Not shown → Concerns; all must-haves Strong →
  Strong; otherwise Mixed (shown to the user as a suggestion). The human edits text and the overall rating
  (`byQ:false`). Submit needs approval. It writes `interview.feedback{by, rating, notes, at, evidenceRefs}`, sets
  status DONE, adds a pipeline note and emits `interview.feedback`. A draft survives navigation. Proactive
  `hire-b.feedback-due` nudges.
- **PROD:** feedback is immutable after submit (amendments are new versions). Other panellists' feedback is hidden
  until you submit yours (calibration). This isn't in the sim; add it.

## 8. Dispute (`hb.dispute.simulate`, `hb.review.open|resolve`; skill `hire-b.dispute`; proactive `hire-b.dispute`)
- A candidate disputes a result (`interview.disputed`, SHARED scope). The result is **excluded from every comparison**
  immediately (`disputedEvidence`) and marked "Under review". Opening a review needs approval. It assigns a reviewer
  (Seyi, hiring manager) and sets the evidence `UNDER_REVIEW`. Resolution: UPHELD → VERIFIED again; REVISED →
  FAILED (withdrawn, not deleted). The candidate is told only "under review" and the outcome.
- **PROD ≠ SIM:** the candidate files the dispute from their own side, with a reason. Reviewer assignment follows org
  policy (not the original assessor). SLA timers apply. All transitions are audited.

## 9. Q intelligence, memory and proactive
- Context: the current route's person (`personInFocus`), the last person named in the thread, and the stored compare
  view. Replies carry `used` (what Q drew on) and `why`. Cards: `hb.ledger`, `hb.reason`, `hb.questions`,
  `hb.followups` (ids carry the state the reply was about).
- Proactive rules: new evidence since last look (`seen` diff), disputed result, feedback drafted not submitted. Each has a
  `why`. **PROD:** run from the event stream, de-duplicate by subject, and respect snooze and prefs (engine).
