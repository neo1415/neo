# Engineering handoff · talent-a (T1 Amaka, T2 Chidi)

Specification only. The prototype is the behavioural and design blueprint, not the implementation. Every
"Prototype:" reference is to `prototype/src/`. Lines marked **PROD ≠ SIM** say where production must differ
from the simulation. Journey proof: `qa/scripts/journeys/T1.mjs`, `T2.mjs`.

## 0. Defaults that every feature below inherits

- **Scope.** All talent-a data is `PERSON:<personId>` scoped and private by default. Nothing in this area ever
  widens visibility on its own. The only paths to an employer are (a) `apply` (shares the person's profile
  claims with that one org) and (b) `share` (one evidence item with one org). Both need an explicit approval.
  Visibility is decided only by the central policy (`mock/world.ts`: `canSeeCandidate`, `canDiscover`,
  `visibleEvidence`); services never re-implement it. Employers can never see J7 plans, practice, assessments
  that weren't shared, readiness or plan adherence.
- **Claims vs evidence.** Three tiers, never merged: *claim* (the person's words, any source), *practice*
  (private, never proof) and *evidence* (reviewed work sample or verified credential). Only evidence changes a
  competency to shown; only shown competencies change distance-to-role. This is a backend invariant, enforced
  in the write path, not a UI convention.
- **Events.** Every state change emits an append-only domain event `{type, actorId, scope, text, data, at}`
  (prototype `emit()`); audit, Q memory and proactive rules read events, not UI state.
- **Q.** Every capability is reachable by natural language through the global Q (skills in
  `q/skills/talent-a.ts`, ids `ta.*`) and by the page. Pages call the same operations (`registerOp('ta.*')`) so
  the thread records what happened. Consequential acts return `kind: 'approval'` and execute only on the action.
  Reversible acts push an undo (`pushUndo`). **PROD ≠ SIM:** the prototype's matching is rule-based; production
  uses an LLM with tools, but the tools, approval gates and refusal rules below are the contract. If Q cannot do
  something it says so (no invented capability).
- **Memory.** Q may remember: goal, method preference, open commitments (`areas['talent-a'].commitments`), last
  visit, what was declined. It may not remember or infer protected characteristics. Memory is visible and
  deletable at `/c/memory` (owned by talent-b).
- **Failure defaults.** Offline: writes queue locally and say so; nothing that "sends" runs offline
  (`ta.apply.submit` refuses offline). Every list has a designed empty state; every slow call a skeleton.
- **Performance.** Pages render from a person-scoped read model; the atlas, route and readiness are pure
  functions of (profile, J7 state, evidence, jobs) and must compute in < 50 ms client-side for ≤ 60
  occupations. Cache taxonomy and listings per locale for 24 h; never cache another person's data.

## 1. Onboarding by chat, CV or form (T1)
- **Behaviour.** `/c/welcome` (`journeys/onboarding/Onboarding.tsx`): three ways in, switchable at any time,
  answers merged into one profile. Six sections (`services/profile.ts` `SECTIONS`); each can be answered,
  marked "none, and that's fine", or skipped (kept as missing, never nagged). No job history is a supported
  path (`ta.nowork`). Short form: seven optional fields, validation explains and suggests a fix
  (`validateForm`, `suggestFix`; "20226 → did you mean 2026?").
- **Data.** `Profile v2` (`services/profile.ts`): sections answered/none/skipped, `experience[]` of claims
  `{text, source: CV|CONVERSATION|YOU, confidence, flagged?}`, skills `{claimed|suggested|evidenced}`,
  location, workMode, goal, form draft and errors. Persist per person; keep claim provenance forever.
- **CV parsing.** Upload → `reading` (skeleton, MO-016/017) → parsed claims shown before use, or
  `NO_TEXT` with three recoveries (other file, chat, form) and nothing saved (`readCv`). Vague lines are kept
  with `confidence: 'check'` and a plain flag. **PROD ≠ SIM:** prototype reads canned text per person.
  Production: document text extraction (PDF/DOCX), OCR only with an explicit "it's a photo" warning and a
  confidence floor; an LLM extractor that may only *quote or lightly tidy* source spans (each claim stores
  the source span offsets); virus scan; 10 MB limit; delete the raw file after 30 days unless the person
  keeps it. Extraction never creates evidence and never sets `verified`.
- **Q tools.** `profile.answer(section, text)`, `profile.skip`, `profile.none`, `cv.read(fileId)`,
  `form.save`, `form.fix(field, value)`. Q asks one small question at a time (`QUESTIONS`).
- **Events.** `profile.answered`, `profile.cv.parsed|failed`, `profile.completed`.
- **Failure.** Parser timeout > 20 s → keep the upload, tell the person, offer chat/form; never half-apply.

## 2. Claims vs evidence (T1, T2)
- **Behaviour.** Every surface labels a claim as a claim ("Answered · your words", "Mentioned by you"); the
  key on J7 pages groups states into *counts as proof* / *doesn't count yet* (`journeys/career/Route.tsx`
  `ProofKey`). Practice is never shown as proof and Q refuses to treat it as proof (`ta.j7.notproof`).
- **Rules.** Competency state machine (`journeys/career/j7.ts`, `personas.ts` header):
  `none → unclear (mentioned) → practice → partial (transferable or submitted) → full (assessed) → verified`.
  Allowed writers: claims may only set `unclear`; practice only `practice`; reviewer only `full`; issuer only
  `verified`. Downgrades only by expiry/revocation, with an event.
- **Algorithm to validate.** Mention detection (`stateOf`, keyword sets `Comp.kws`): replace keywords with an
  embedding or skill-extraction model mapped to the occupation taxonomy; measure precision on labelled CVs
  (target ≥ 0.9 precision; a false "mentioned" is cheap, a false "shown" is forbidden by construction).

## 3. Entry-level matching (T1)
- **Behaviour.** "Jobs that fit" (`Onboarding.tsx` `JobsView`, ref card `ta.matches` in `onboarding/refs.tsx`):
  each listing's needs shown as evidenced / mentioned (claim) / not shown, with the person's own words as
  basis; location and unverified-employer notes; "the employer decides" always stated. Proactive
  `ta.jobs.new` when a new matching listing appears.
- **Algorithm.** `journeys/onboarding/match.ts`: `isEntry` (title rules), `needStatus` per need, fit = needs
  evidenced or mentioned, sort by fit then recency. **PROD ≠ SIM:** use taxonomy-normalised job needs and
  person skills; keep the three-state output and the basis string; never rank by inferred demographics;
  explainability is mandatory (each match lists its needs).
- **Data / caching.** Job listings (shared, org-owned), `seenJobs` per person. Recompute on profile or
  listing change; cache per person for 15 min.

## 4. CV line drafting without fabrication (T1)
- **Behaviour.** CV view and `ta.cv` card: lines grouped Education / Projects / Volunteering / Work / Skills,
  each showing the claim it came from. "Use these lines" approves (`ta.cv.approve`); download as text.
  Asking Q to add something not said is refused with a reason (`ta.cv.invent`).
- **Rules.** `draftCv` (`q/skills/talent-a.ts`): every line has `from` = claim id or profile field; no line
  without a source. **PROD ≠ SIM:** an LLM may rephrase, but a verifier must check each line's entities,
  numbers and verbs against its source claim (reject numbers or employers not in the source); store
  `{line, sourceClaimId, model, verifierResult}`.
- **State.** `areas['talent-a'].cv[personId] = {lines, status: DRAFT|APPROVED}` (`state/areas/talent-a.ts`).

## 5. Applying (T1)
- **Behaviour.** `ta.apply` shows exactly what will be shared, with whom, as an approval; `ta.apply.submit`
  creates the application, shares only onboarding claims with that org, and offers undo (withdraw).
- **APIs/events.** `POST /applications {jobId}` → `application.submitted` in scope `SHARED:<org>:<person>`.
  Withdraw → `application.withdrawn`, revokes the claim share for that org.
- **PROD ≠ SIM:** the prototype marks `SUBMITTED` with "simulated: nothing was really sent". Production
  delivers to the employer ATS (integration owned by hire-*), idempotent on `(personId, jobId)`.
- **Failure.** Offline or ATS error → nothing shared, draft kept, the person is told plainly.

## 6. J7 career intelligence (T2; T1 uses the same engine)

**Surfaces.** `/c/career` (`journeys/career/Career.tsx`, `Atlas.tsx`, `Route.tsx`): Atlas (radial map on
desktop, distance bands on phones, list twin), Your skills, Role sheet, Plan, Progress, Record, Openings, plus
"what employers can see right now". `/c/growth` (`screens/Career.tsx`): route, before-you-apply checklist,
six separate measures, no overall score.

**State.** `w.j7[personId]` = `J7State v2` (`j7.ts`): goal, competency states, record (append-only),
plan steps, `moved` (previous distances for the last move), archived goals with their steps, quiz,
assessments, adjustments, mentioned, startedAt, lastVisit. Persist server-side per person, versioned.

- **6.1 Occupation atlas.** Distance to an occupation = number of its needed competencies not *shown*
  (`gapsFor`). Rings 0–4+; families by angle; collision-aware labels; family collapse at scale; "within 2"
  filter. The route component states where you are, what is between you and the goal, and what counts.
  *Algorithm to implement:* occupation needs from a taxonomy (**PROD ≠ SIM:** prototype personas are
  hand-authored; production maps to ESCO/O*NET or a local Nigerian taxonomy with essential vs optional skills;
  distance should weight essential skills and stay explainable as a count the person can read).
- **6.2 Transferable skills.** From verified Passport items (`Comp.from`, e.g. employer letter) → `partial`,
  with "doesn't show" text. *Validate:* transfer rules must be reviewed per occupation pair; never `full`.
- **6.3 Gaps.** Role sheet groups "still to show" and "shown with proof"; each gap offers practise (private)
  and/or submit a work sample. Q explains each gap in plain words (`ta.j7.gaps`, `ta.j7.role`).
- **6.4 Plan.** Steps `{kind: Practice|Learning|Work sample|Credential|Conversation, minutes, due, why,
  goals[]}`; only Work sample/Credential steps can produce proof (shown on each step). Reorder, done,
  progress %, remove, swap on disagreement with reasoning first (`ta.j7.disagree`), goal change archives
  non-shared steps and restores them on return (`setGoal`). Undo for goal change.
- **6.5 Practice vs proof.** Quiz (`startQuiz`/`answerQuiz`) logs a private `Practice attempt`, may set
  `practice`, never moves the atlas, mirrored to the Passport as PRIVATE `PRACTICE` (non-shareable:
  `ta.share.do` rejects it). Progress plots practice in a separate lane, never joined.
- **6.6 Assessment and reassessment.** `submitSample`: rubric of 4 criteria, level 1–4, reviewer sign-off;
  sets `full`, records which occupations moved; round 2 uses the *same rubric* so the trend is comparable.
  **PROD ≠ SIM:** reviewer is simulated. Production: human reviewer marketplace or calibrated LLM pre-score
  plus human sign-off; rubric versioning (a new rubric version starts a new line, never joins);
  inter-rater agreement checks; turnaround SLA shown to the person; appeals.
- **6.7 Staleness and return.** `changesSince`: days away, overdue steps, practice ≥ 14 days old marked
  stale, listing age (> 30 days "may be close to filled"), closed listings, application status.
  Proactive rules `ta.plan.overdue`, `ta.commitment.due`, `ta.j7.back` (`q/proactive/talent-a.ts`).
  **PROD ≠ SIM:** demo clock (`ta.time.skip`) is a prototype control only; production uses real time and a
  daily job that recomputes staleness.
- **6.8 Openings.** Real listings linked to occupations (`jobsFor`), with gaps, age, closed state, prior
  application outcome. "Employers decide; this is a reading, not a promise." Never predicts a decision.
- **6.9 Explicit sharing.** `ta.share` → approval naming the item and org; `ta.share.do` sets
  `SHARED_WITH [org]`, emits `evidence.shared`, undo revokes (`revokedFrom`). Only assessed or verified
  items; practice and plans are never shareable.

**Q tools (J7).** `j7.discover`, `j7.skills`, `j7.gaps(occ)`, `j7.role(occ)`, `j7.goal.set(occ)` (undoable),
`j7.plan`, `j7.step.{toggle,progress,move,remove,swap}`, `j7.quiz.{start,answer}`, `j7.sample.submit(comp)`
(approval when it uploads a file), `j7.changes`, `j7.share(item, org)` (approval), `j7.view(view)`.
**Events.** `j7.goal.changed`, `j7.practice.logged`, `j7.assessment.completed`, `j7.step.*`, `evidence.shared`.
**Integrations.** Occupation taxonomy; listings feed; learning providers for Learning steps (deep links,
completion via provider webhook or the person's word, marked as such; never proof); reviewer service.
**Failure.** Reviewer unavailable → submission stays `Work sample submitted` (partial) with an ETA; taxonomy
outage → last cached atlas with its date; listing gone → "closed" not removed.

## 7. Algorithms to implement or validate (summary)

| Algorithm | Prototype | Production requirement |
|---|---|---|
| Skill inference from text | keyword sets (`Comp.kws`, `NEED_KWS`) | taxonomy-linked extractor; outputs claims only; precision ≥ 0.9 |
| Distance to role | count of unshown needs (`gapsFor`) | essential-weighted count, still readable as "N to show" |
| Transferability | authored `Comp.from` | reviewed rules per occupation pair; caps at partial |
| Entry-level match | title regex + needs (`match.ts`) | normalised needs; explainable; no demographic features |
| Assessment scoring | authored rubric results | rubric versioning, human sign-off, agreement metrics, appeals |
| CV drafting | template from claims (`draftCv`) | LLM + source-grounding verifier per line |
| Staleness | 14-day practice, 30-day listing (`changesSince`) | configurable per competency/listing type |
