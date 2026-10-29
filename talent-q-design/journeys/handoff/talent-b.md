# Engineering handoff · talent-b (T3 Tobi, experienced specialist · T5 Zara, sceptical job seeker)

Specification only. The prototype is the behavioural and design blueprint, not the implementation. Paths are
relative to `prototype/src/`. **PROD ≠ SIM** marks where production must differ from the simulation. Journey
proof: `qa/scripts/journeys/T3.mjs`, `T5.mjs`; privacy regression: `qa/scripts/review/privacy.mjs`.

## 0. Defaults every feature inherits
- **Code map.** Pages `journeys/talent-b/{Passport,Jobs,Applications,Prep,Memory}.tsx`; shared rules and every
  mutation `journeys/talent-b/logic.ts` (`registerOp('tb.*')`); Q skills `q/skills/talent-b.ts` (ids `tb.*`);
  Q reply cards `journeys/talent-b/ui.tsx` (`registerRef('tb.evidence'|'tb.uploads'|'tb.summary'|'tb.match'|
  'tb.apps')`); proactive rules `q/proactive/talent-b.ts`; slice `state/areas/talent-b.ts`; seed
  `state/seeds/talent-b.ts`; routes `routes/talent-b.tsx`.
- **One operation layer.** Page buttons and Q chips call the same ops; Q never mutates outside an op. Production:
  each op is one server command (idempotency key per request), the page and Q are two clients of it.
- **Scopes and events.** Append-only `{type, actor, scope, text, data, at}` (`emit()` in `mock/world.ts`).
  `PERSON:<pid>` private; `SHARED:<org>:<pid>` visible to that org; `PUBLIC` for listing changes. Events emitted:
  `passport.uploaded|shared|access_ended|revoked|redacted|attestation_requested|review_requested|check`,
  `settings.discovery`, `settings.changed`, `q.summary.corrected`, `q.match.corrected`, `q.advice.declined`,
  `application.submitted|followup|moved_on|withdrawn`, `job.closed`, `memory.deleted`. Org-scoped events never
  carry item titles or reasons (`passport.access_ended` carries only `{org, count}`).
- **Approvals.** Share, revoke, submit, send, withdraw, discovery widening and delete arrive as `kind:'approval'`
  replies; only the chip/button performs them. Undo (`pushUndo`) for share/revoke/move-on/notification changes.
- **Honesty.** Q never promises an employer decision, never shows a confidential original, never presents a
  claim as proof (`TOLD` ≠ `SHOWN`), and labels every simulated action (`ds-sim`, `SENT_SIMULATED`).

## 1. Evidence Passport (`/c/passport`, `Passport.tsx`)
- **Behaviour.** "Proof" view: portfolio header with name, headline, a lead sentence ("4 of your 10 items are
  checked at the source") and a part-to-whole strip by state (checked / waiting / failed / own / confidential,
  `passportStats`), then items grouped by weight (`GROUPS`). Each card: kind · month, verification tag, what it
  shows, limits, who sees it (`SeenBy`), actions. Preview opens in place after its card (code excerpt,
  certificate, redacted doc, private original with highlighted sensitive spans).
- **Uploads.** CV / certificate / work sample / link (`tb.upload`, link validated client-side). Progress, drop at
  N%, "Retry from N%" resumes, cancel (`UploadRow`). Completion posts a Q notice and, for certificates and links,
  starts an issuer check. **PROD ≠ SIM:** resumable chunked upload (tus or S3 multipart) with server-acknowledged
  offsets; virus/malware scan and file-type sniffing before the item exists; PDF/image text extraction for CV
  claims; size limits stated before upload; uploads continue in the background and survive navigation/offline.
- **Verification.** States `VERIFIED | PENDING | UNVERIFIED | FAILED | UNDER_REVIEW` with fixed plain copy
  (`VER` in `logic.ts`). Pending ≠ failed, always said. Check outcomes: `UNREACHABLE` (stay PENDING, offer retry),
  `FAILED` (issuer answered, no match: offer fix / official PDF / manual review), `VERIFIED`.
  **PROD ≠ SIM:** issuer adapters (AWS Certification validation, Credly/Open Badges 3.0 verifiable credentials,
  university registries, Git host APIs for repository ownership), each with timeout, retry with back-off, and a
  per-issuer status page; manual review is a human queue with SLA; never mark VERIFIED without a stored proof
  record `{issuer, method, checkedAt, response hash}`.
- **Confidential + redaction.** `confidential: true` locks an item: never shareable, never sent to an issuer,
  excluded from matching and Q's summary. `tb.redact` creates a separate item (`redactedOf`) the person previews
  before sharing; `tb.attest` asks a reference to confirm it (UNDER_REVIEW). Q refuses the original twice, without
  blame (`tb.conf`). **PROD ≠ SIM:** redaction is an LLM draft plus deterministic entity/number masking, always
  shown for approval; the original is encrypted at rest with the person as the only key holder for decryption.
- **Disclosure matrix and revocation.** "Sharing" view: per item × org cells (`cellOf`: `SHARED | PUBLIC |
  PUBLIC_UNSEEN | REVOKED | NONE | LOCKED | WITHDRAWN`), "See it as they do" reads `visibleEvidence()` — the
  same function the recruiter pages read. Revoke sets `revokedFrom`, tells the org only that access ended.
  **PROD ≠ SIM:** revocation must also purge the org's caches, exports, shortlists and generated artifacts that
  quote the item (see §2 enforcement points); anything already downloaded is disclosed as "they may keep copies".
- **Data.** `Evidence` (contracts): id, ownerId, kind, title, shows, limits, source, observedAt, verification,
  visibility `PRIVATE|SHARED_WITH|PUBLIC_PROFILE`, sharedWith[], revokedFrom[], confidential, redactedOf.
  Slice: `uploads[]`, `checks[]`, `corrections{}`.

## 2. Discovery rules (Passport "Search" view)
- **The one policy** lives in `mock/world.ts` and production must implement exactly this, server-side:
  - `relationshipWith(pid, org)`: registered with the agency, applied to one of its jobs, or holds a live share.
  - `canDiscover(pid, org)`: consent `discoverable` and rule ≠ NOBODY and org not in `hideFrom`; for
    `VERIFIED_EMPLOYERS`, org is an EMPLOYER with domain checked **and** registry VERIFIED; otherwise (employers
    and agencies) domain checked.
  - `canSeeCandidate = !withdrawnFrom.includes(org) && (relationshipWith || canDiscover)`. Withdrawal wins.
  - `visibleEvidence`: shared items follow the explicit share; public items need `canSeeCandidate`; never
    practice, never revoked.
- **Enforcement points** (each must call the same policy service, never re-implement it): search and sourcing
  results, talent pools and saved searches, candidate profile by URL, Q tools for recruiters (profile, compare,
  outreach), comparison/shortlist caches, campaigns and outreach queues, exports and reports, notifications that
  name a candidate. Cached results re-check at read time; a policy change emits an invalidation event.
- **UI.** Three options with accurate copy; "Right now" lists every organisation with its verdict from
  `canSeeCandidate` and a reason from `reachOf()` (explains, never decides); hide/stop-hiding per org
  (`tb.discovery {hide|unhide}`); plain rules; recruiter preview. `/settings` summarises and links here.
- **Data.** `discovery[pid] = {who, hideFrom[], showSalary}` + `consents[pid].discoverable|withdrawnFrom|
  registeredWith`. **PROD ≠ SIM:** org verification states come from §3's registry integrations, not seed flags.

## 3. Jobs (`/c/jobs`, `/c/jobs/:id`, `Jobs.tsx`)
- **Behaviour.** List grouped "Closest to your proof" / "Other open roles"; per card the employer signal tag and
  a fit line (shape-coded pips + "2 of 3 needs shown · 1 checked"). Detail: needs with evidence chips, "Does it
  fit you?" (pay, place, way of working from what the person told Q), employer signals with what they don't mean,
  Q suggestions with "Not for me" (remembered), apply panel with per-item consent; a listing can close mid-apply
  (nothing sent, choices kept).
- **Matching algorithm (implement as specified, then improve).** For each stated need: candidate items =
  Passport items excluding CLAIM, confidential and FAILED; an item supports a need if it matches the need's
  concept (prototype: `NEED_EV` regex table, fallback word overlap). State = `VERIFIED` if any supporting item is
  verified, else `SHOWN` if any, else `TOLD` if the person stated it (`tb.match.tell`), else `NONE`. Sort by share
  of needs not NONE, ties to verified employers. Output always lists the items used. **PROD ≠ SIM:** concept
  matching by an embedding + taxonomy (skills ontology) with a human-readable rationale per need; never a single
  opaque score; never infer from protected characteristics; a challenge is stored as TOLD, not proof.
- **Signals.** `signalsOf`: email domain checked, registered business, recruiter active (14 days), reply history.
  **PROD ≠ SIM:** DNS/MX + verified-sender check for domain; Companies House / CAC Nigeria / ORC Ghana registry
  lookups; activity from real recruiter sessions; reply stats with minimum sample size before showing.
- **Pay fit.** Prototype converts NGN at an illustrative rate. **PROD ≠ SIM:** dated FX source, shown as such.

## 4. Applications (`/c/applications`, `Applications.tsx`)
- **Behaviour.** Status only from employer actions (`APP_LABEL`, `appExplain`): Sent, Viewed ("only that"),
  Interview ("a step, not an offer"), Not progressing, Listing closed ("not a rejection"), Withdrawn. Days since
  last employer activity; after `noReplyDays` (10) a no-blame banner with "Draft a follow-up" (Q drafts, approval
  sends, `SENT_SIMULATED` in `w.threads`) or "Move on" (undoable, stays open their side). Withdraw lives inside
  the timeline disclosure and needs approval.
- **PROD ≠ SIM:** status from the employer ATS/webhooks; follow-ups rate-limited (one per application per
  `noReplyDays`); messages delivered in-app/email with delivery receipts.

## 5. Interview prep (`/c/prep`, `Prep.tsx`)
- Next booked interview (calendar) or live applications; per stated need: likely question, what to point to
  (verified first), or a story prompt; "Practise this with Q". Built only from the job's stated needs, the
  person's Passport and the invite; never the employer's notes or scoring. Practice never counts as proof.

## 6. Candidate memory (`/c/memory`, `Memory.tsx`)
- **Behaviour.** Each remembered item: source, sensitive flag, "never shared"/shared-with, what it's used for.
  Delete shows a plan (`deletionPlan`): what goes, what can't (deletion record, applications/messages already
  sent). `tb.forget` blanks content, removes it from every use (declined advice re-enabled), writes a receipt
  (date, kinds, kept list, 0-disclosure proof from the sharing log). Q: "forget that I'm leaving my job".
- **PROD ≠ SIM:** hard delete across stores, vector indexes and Q context caches within a stated SLA; receipt
  signed and exportable; the deletion record holds no content.

## 7. Notifications
- In-thread Q notices from real state (`appendQ`: upload done/failed, check outcomes, listing closed mid-apply)
  and proactive rules with a `why`: `tb.cert.failed`, `tb.cert.pending`, `tb.app.noreply`, `tb.saved.closed`,
  `tb.interview.soon`. Channel prefs via Q (`tb.notify`, undoable) in `consents[pid].notifications`
  `{email, sms, inApp, digest}`. **PROD ≠ SIM:** delivery service honouring prefs and quiet hours, digest batching.

## 8. Q intelligence, memory and agents
- Tools = the ops above; skills in `q/skills/talent-b.ts` (`tb.upload`, `tb.verify`, `tb.conf`, `tb.redact`,
  `tb.share`, `tb.revoke`, `tb.viewas`, `tb.summary(.challenge)`, `tb.discovery`, `tb.jobs`, `tb.trust`,
  `tb.match(.challenge)`, `tb.apply`, `tb.status`, `tb.followup`, `tb.withdraw`, `tb.advice(.decline)`,
  `tb.notify`, `tb.forget`, `tb.memory`, `tb.prep`, `tb.message`). Every reply lists `used` context and `why`.
- Context Q may read: the person's own Passport, memory items still ACTIVE, their applications, public job data.
  Never another person's data, never an org's private notes. Summary of the person (`summaryFor`) cites a basis
  per line and honours corrections.
- Background agents (production): issuer-check worker, upload/scan worker, no-reply timer, listing-closed
  watcher. None acts outward without an approval already given.

## 9. Performance and failure
- Matching and reach are pure functions of state: compute server-side, cache per (person, job) and (person) with
  invalidation on evidence, share, discovery or org-verification events. Offline: uploads and checks pause and
  resume (banner on Passport); nothing is lost. Every list has a designed empty state; issuer outages surface as
  "still pending", never "failed".
