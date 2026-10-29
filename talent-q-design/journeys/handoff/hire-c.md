# Engineering handoff: R3, the busy HR team (area `hire-c`)

Specification only. The prototype (`prototype/`) is the behavioural reference; file paths below are relative
to `prototype/src`. **SIM** marks where production must differ from the simulation.

## 0. Shared rules (apply to every feature)

- **Tenant boundary.** Every record is scoped to one organisation (`orgId`). Recruiter reads and writes are
  filtered by the actor's `orgId`; candidate reads by `personId`. Candidate visibility goes through
  `canSeeCandidate` / `visibleEvidence` (`mock/world.ts`); never bypass them. Agencies never see an
  employer's own threads or pipeline.
- **Roles** (`journeys/hire-c/lib.ts` `CAN_SEND`, `CAN_MOVE`, `IS_ADMIN`): Admin/Owner approve, send, change
  roles and guidelines; Recruiter approves and sends; Hiring manager drafts, moves stages, changes panels;
  Interviewer gives feedback; Viewer reads. Enforce on the server, not only in the UI.
- **Approval binds to a version.** A send is valid only for the exact version that was checked and approved
  (`approveAndSend` compares `v` and `checkedV`). Any edit creates a new version and voids the approval.
- **Unverified organisations (decision D1).** `orgLimits(w, orgId)` / `outreachThisWeek` (`mock/world.ts`):
  unverified orgs may send 3 messages per rolling 7 days. Enforced in `approveAndSend` and `flushQueued`
  (`allowanceRefusal`), shown as a pre-send check, and every message they send carries
  "This employer isn't verified yet" (body suffix + candidate-side tag).
- **Audit.** Every state change emits a domain event `emit(w, actorId, type, scope, text, data)`; scopes
  `ORG:<id>`, `PERSON:<id>`, `SHARED:<org>:<person>`. Production: append-only event log, server time.
- **Q.** Q reaches every capability by typing (`q/skills/hire-c.ts`, skill ids `hire-c.*`). Pages and Q call
  the same operations (`registerOp('hire-c.*')`). Q replies carry `used` (context), `why`, `actions` and live
  cards (`journeys/hire-c/refs.tsx`). Consequential steps return `kind: 'approval'` and only the action performs.

## 1. Drafting and versioned correspondence

- **Behaviour.** `/r/messages` (`Messages.tsx`): inbox grouped per candidate, filters (to approve, drafts,
  need a reply, queued, sent), thread, draft editor with version pills and diff. Q: "draft an interview
  invitation for him" (resolves "him" from the last profile viewed), "change it to Friday and make the tone
  more friendly" → v2 with a "what changed" card (`DiffRef`: time, tone, panel, pay band rows, then the text).
- **Data.** `Thread{id, orgId, personId, mandateId, messages[]}`, `Msg{id, from, to, subject, body, at, status,
  channel, approvedBy?, receipt?}`; `DraftMeta{msgId, kind, tone, slot?, panel[], versions[], checks?, checkedV?,
  eventId?}`; `DraftVersion{v, at, by, subject, body, note, slot, tone, panel}` (`state/areas/hire-c.ts`).
  Status: DRAFT → AWAITING_APPROVAL → (QUEUED_OFFLINE) → SENT; DISCARDED (undoable).
- **Backend.** Compose from templates (`compose` in `lib.ts`) using mandate, pay band, panel, slot in the
  candidate's zone, tone. Hand-written drafts keep wording; a time change swaps only the date phrase.
  **SIM:** templates; production uses an LLM drafting tool constrained by guidelines, with the same
  structured fields and a deterministic post-check (section 2).
- **APIs/events.** `POST /drafts`, `POST /drafts/:id/versions`, `POST /drafts/:id/discard`, `POST /drafts/:id/restore`;
  events `message.drafted`, `message.revised`, `message.discarded`.
- **Q tools.** draft(person, kind), revise(draft, {slot|tone|panel|addBand|body}), show_diff, discard, undo.
  Memory: last person in context (`lastPerson`), active draft frame (`q.frames`).
- **Failure.** Candidate not in a role, marked not progressing, or consent withdrawn → refuse with the reason
  (`draftFlow`). No free slot for a requested day → no change, offer nearest days.

## 2. Pre-send checks and approvals

- **Behaviour.** "Send it" never sends: it runs checks (`runChecks`, `lib.ts`) and replies with a checks card
  (`ChecksRef`: problems first with fixes, passes grouped). All clear → "Approve and send" for that version.
  Hiring managers' drafts go to the approval queue (`message.approval.requested`).
- **Checks.** Approval (delegation mode, approver role, weekly allowance if unverified); Candidate (time inside
  08:00–19:00 their zone, not in the past, matches a reschedule request); Calendar (every panelist free,
  re-read now); Guidelines (pay band in first message, panel of two for engineering, interview hours,
  job-related wording, approve-each); Consent (channel allowed; withdrawn consent blocks). Each failure may
  carry a one-tap fix (`hire-c.fix`: add band, add interviewer, use next free time, switch channel).
- **Backend.** Checks run server-side at approve time again (time-of-check = time-of-use). Store results with
  `checkedV`; invalidate on any new version or calendar change.

## 3. Sending (simulated today)

- **Behaviour.** `approveAndSend` → `finalizeSend`: status SENT, receipt, calendar invite created/updated for
  invites, pipeline advanced; receipt card in Q (`DraftRef` receipt variant) and the outbox `/r/outreach`
  (`Outbox.tsx`: waiting, queued, sent with receipts).
- **SIM → production.** Real delivery via email (SES/SendGrid-class provider, DKIM on the org's verified
  domain), SMS (local aggregator; opt-in required) and in-app. Idempotency key = `msgId@v`; store provider
  message id as the receipt; handle bounces/complaints as events (`message.bounced`) that surface in Q.
- **Failure.** Provider error → status FAILED with retry and a plain-words notice; never show "sent" before
  the provider accepts.

## 4. Offline outbox

- **Behaviour.** Approving while offline sets QUEUED_OFFLINE (never "sent"); banner on Messages/Outbox.
  On reconnect `flushQueued` re-checks calendars and allowance, then sends or returns the draft with a reason.
- **Production.** Client-side outbox (IndexedDB) holding the approval token `{msgId, v, approver, at}`;
  server validates the token on replay and re-runs checks. Expire tokens after 24 h.

## 5. Scheduling across time zones, holds, invites, reschedules

- **Behaviour.** `/r/calendar` (`Calendar.tsx`, `WeekOverlap.tsx`): per-day shared free time, a day chart
  (busy, interviews, holds, outside-working-day hatching, everyone-free overlap, Q's options), proposals with
  Hold / Draft invitation, bookings list with panel changes. Q: "find a time for Kunle with Seyi and Musa next
  week", "hold the first one". Candidate `/c/slots` and `/c/messages`: confirm or ask to move (days, part of day).
- **Algorithm (`findSlots`, `lib.ts`).** Inputs: attendees, candidate, dates, org interview hours (parsed from
  the HOURS guideline, default 09:00–17:00 Lagos), duration 45, optional preferred time / part of day, events
  to exclude. Step 30 min from window start; skip weekends and anything before now + 18 h; reject if any
  attendee is busy (overlap test) or if the slot falls outside 09:00–18:00 in any attendee's local zone;
  honour part of day in the candidate's zone; at most 2 per day when several days are open; preferred time
  sorted first. Production: same rules over provider free/busy, DST-correct zone maths (IANA), buffers and
  per-person no-meeting blocks (`MeetingPreferences`), fairness score that spreads early/late starts.
- **Holds** are internal events (status HOLD) visible only to the org. **Panel changes** re-validate holds and
  notify admins (`interview.panel.changed`, proactive rule `hire-c.panel`). **Reschedule**: event →
  RESCHEDULE_REQUESTED, current time stays held, proactive rule `hire-c.reschedule`, new draft of kind
  RESCHEDULE constrained to the request.
- **Failure.** Slot taken after proposing (test switch on `/r/calendar`) → check fails, next free time offered.

## 6. Calendar connections

- **Behaviour.** `/r/calendar/connect` (`Connections.tsx`): team list with provider and status, one-permission
  consent ("busy times only"), disconnect stops checks at once; earliest-start preference stored as memory.
- **Integrations. SIM →** Google Calendar `freeBusy.query` (scope `calendar.freebusy`), Microsoft Graph
  `getSchedule` (`Calendars.ReadBasic`); event write (`events.insert` / `POST /events`) requested separately
  at first booking. Never store titles or attendees. Tokens encrypted, per user; health states
  `TOKEN_EXPIRED | REVOKED | PROVIDER_DEGRADED` shown on the page and in checks.
- **Caching.** Free/busy cached per user for 5 min, invalidated by provider push (Google watch / Graph
  subscriptions); always re-read at approve time.

## 7. Pipeline

- **Behaviour.** `/r/pipeline` (`Pipeline.tsx`): board by stage; empty stages collapse; move via select or Q
  ("move Ife to interview", undoable); "not progressing" requires a job-related reason (protected criteria
  refused, `q/core/policy.ts protectedCriterion`), stored internally, never in the candidate message, and
  drafts a kind decision message for approval.
- **Data/events.** `PipelineEntry{personId, mandateId, stage, at, by, note?}`; `pipeline.moved`. Moving never
  messages anyone.

## 8. Team roles

- **Behaviour.** `/r/team` (`Team.tsx`): members with local time, role select (admins only), permission
  matrix, recent changes. Q: "make Musa a recruiter", undo. Last admin cannot be removed (server rule).
- **Events.** `team.role.changed`. Role changes take effect on the next request (re-issue session claims).

## 9. Guidelines that Q applies

- **Behaviour.** `/r/setup` (`Setup.tsx`): guidelines with on/off switch, wording edit (new version), whether
  Q can check it, usage count and last use; delegation mode (draft only / approve each / approved campaign).
  `/r/setup/handbook` (`Handbook.tsx`): reading a handbook proposes rules with page sources; each needs
  approval and then joins the guidelines; instructions that widen Q's authority are set aside.
- **Data.** `Guide{id, text, source, check, on, v, by, at, used, lastUsed}`; `check` ∈ PAY_BAND, PANEL_TWO,
  APPROVE_EACH, JOB_RELATED, HOURS, NONE. **SIM:** the check type is fixed per seeded guideline; production
  classifies new guidelines into a checkable type (LLM + confirmation) or leaves them as cited guidance.
- **Precedence.** Platform > law > consent > organisation > role > person > current instruction; lower layers
  narrow, never widen (`@contracts POLICY_PRECEDENCE`). Uploaded documents are untrusted input.

## 10. Reminders and proactive notices

- **Rules** (`q/proactive/hire-c.ts`): unapproved draft older than a day; candidate hasn't replied; panel
  changed by a colleague; candidate asked to move; messages queued offline. Each is computed from state and
  carries a `why`; dismiss/snooze handled by the engine. Candidate: day-before interview reminder (**SIM**:
  shown as a promise; production schedules a job per confirmed event).

## 11. Performance, caching, failure summary

- Inbox: paginate threads (50), index by `(orgId, updatedAt)`; unread/approval counts maintained as counters.
- Checks are cheap except calendar reads; batch free/busy for all panelists in one provider call per provider.
- Every failure says what happened and what happens next; nothing is ever claimed as sent, booked or verified
  before the external system confirms it.
