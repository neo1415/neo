# State machines

Each motion in the prototype is driven by one of these machines. None runs on a timer that pretends progress. The atlas column `fake_progress_prohibited = Yes` is honoured: progress bars move only when a unit of simulated work completes.

## Q presence (`prototype/src/q/QPresence.tsx`)

```
idle ──run.started──▶ thinking ──step.updated──▶ working(progress = Σ done/total)
  ▲                      │                        │
  │                      ├─input.required / approval.required──▶ waiting ──respond──▶ working
  │                      └─run.failed──▶ error
  └──────── run.completed ◀── done (one settle pulse) ◀──────────┘
any ──network offline──▶ offline ──reconnect + replay──▶ previous state
voice capture: listening (disc follows the input level)
```

Reduced motion: no rotation, no pulse, no scaling. The ring shape and label still change.

## Run lifecycle (`contracts/run.ts`, `prototype/src/mock/runtime.ts`)

Run statuses mirror Q's `Q_RUN_STATUSES`. The stream carries the event types in `QStreamEvent`.

- Durable events have a per-run `sequence`. They are kept and replayed after the cursor (`afterSequence`) when a subscriber reconnects.
- `q.message.delta` and `q.artifact.preview` are live-only, as in Q.
- Cancel sets `CANCEL_REQUESTED`. The script stops at its next check, and the run ends `CANCELLED` with a recoverable message.
- Episodic resume (SC-181): the sourcing run persists `sourcing.cursor`, so a new run continues from profile n+1 rather than starting again.

## Scheduling (`contracts/scheduling.ts` `SCHEDULING_TRANSITIONS`)

```
DRAFT_REQUEST → POLICY_AND_CONSENT_CHECK → CALENDAR_CONNECTION_CHECK → AVAILABILITY_READ → SLOTS_CALCULATED
  → RECRUITER_CONFIRMATION → CANDIDATE_PROPOSAL_SENT → AWAITING_CANDIDATE
  → CANDIDATE_ACCEPTS → AVAILABILITY_RECHECK → EVENT_WRITE → PROVIDER_ACK → BOOKED → REMINDERS → COMPLETED
     │                     └─ slot became busy → SLOTS_CALCULATED → AWAITING_CANDIDATE   (hard scenario C)
     ├─ CANDIDATE_COUNTERPROPOSES → recruiter review → AWAITING_CANDIDATE
BOOKED → RESCHEDULED → SLOTS_CALCULATED → AWAITING_CANDIDATE
CALENDAR_CONNECTION_CHECK → FAILED (not connected / revoked)  → retry after connecting
```

- "Booked" is shown only after `PROVIDER_ACK`. The receipt is labelled *simulated*.
- Every transition is appended to `scheduling.history`, which the recruiter can expand.

## Memory item lifecycle (`contracts/memory.ts`)

```
candidate ─write gate─▶ active ─correct─▶ superseded   (new item: supersedes_id = old)
                          ├─forget──▶ forgotten
                          ├─don’t use (third-party claim)──▶ revoked (delete_or_revoke_state = REVOKED)
                          └─expires_at──▶ archived
```

- Retrieval for any task excludes `revoked`, `forgotten` and `CANDIDATE_PRIVATE_PRACTICE`. The "What Q would use" panel shows this, with content hidden for revoked items.
- Correcting the meeting-window memory changes the `earliestLocal` input to slot calculation, so the next scheduling run proposes different times.

## Interview (`prototype/src/screens/Interview.tsx`)

```
question(i) ─answer─▶ [lacks concrete detail?] ─yes─▶ follow-up ─answer─▶ question(i+1)
                                                ─no──────────────────────▶ question(i+1)
any ─pause─▶ paused ─resume─▶ same question
last answer ─▶ done (interview: sent for human review) | feedback (practice: private; promote needs explicit consent)
mode (text | form | voice) can change at any point without losing the position
```
