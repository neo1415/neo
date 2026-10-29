# Q intelligence, memory, navigation and artifact specification

What production Q must do, derived from the ten journeys. The prototype shows **behaviour**: its "intelligence" is a rule-based simulation that says so in the product (the "Simulated Q" control in the thread header explains the limits). Production replaces the rules with the Q runtime: model plus tools, running on `neo1415/q` (see `research/Q-REUSE-AUDIT.md`). The behaviour, contracts and guarantees below stay the same.

**Companion documents**
- Event model for the eleven behaviours: `contracts/Q-WORKSPACE-CONTRACT.md`. Types are in `contracts/{run,workspace,memory,action,artifact,scheduling,talent}.ts`.
- Every skill, proactive rule and operation in the prototype: `Q-SKILLS-APPENDIX.md`.
- Evaluation corpus: 206 real phrasings typed in the journeys, each paired with its verified outcome, in `q-eval-corpus.json`.

## 1. Presence: one Q, everywhere, one conversation per person

| Requirement | Prototype reference | Production rule |
|---|---|---|
| Q is reachable on every product page: a desktop side thread (resizable, collapsible), and on phones an "Ask Q" bar that opens a sheet | `src/ds/AppShell.tsx`, `src/q/QThread.tsx` | The shell owns Q. Pages never host their own conversation. |
| One continuous conversation per person, surviving navigation, reload, other tabs and devices | `w.q.threads[actorId]` in `src/mock/world.ts` | A server-side thread per user (and per organisation context for recruiters), streamed to every client session. |
| Q knows where the person is: "On {page} · {person}" context line | `labelFor` in `src/q/core/engine.ts` | Each turn carries `{route, params, visible artifact ids, selection}` as context. |
| Text everywhere; voice where the device supports it, with stated fallbacks (voice off, unavailable, microphone declined) | `Composer` in `QThread.tsx`; T4 fallbacks | Speech-to-text and text-to-speech services. The transcript is editable before sending, and failures fall back to typing with the words kept. |
| Plain-words mode for people who ask for it | `prefs.plain`; `brief()` in `src/q/skills/core.ts` | A per-user preference applied to every reply: short sentences, every term explained. |
| Honesty: Q says it is a simulation in the prototype, never claims to be a general AI it isn't, and labels simulated sends and checks | `core.honest`, `ds-sim` labels | Production labels **real** external effects with receipts. Anything still simulated or pending keeps a label. |

## 2. Understanding: turns, intents, tasks

**Prototype mechanism.** Each skill scores the turn (0–1, winner above 0.45; `src/q/core/engine.ts`). A *frame* holds a multi-turn task (`intent`, `slots`, `awaiting`), and the frame owner's `answer()` gets the next turn first. A new intent suspends the old frame.

**Production mechanism.** The model does intent understanding with tool calling. The task-state semantics must be kept exactly:

1. **Messy language:** handle typos, colloquial speech, fragments ("pls repeat"), corrections ("no, Friday"), hesitation and topic changes. `q-eval-corpus.json` is the regression set, and every case must still reach its verified outcome.
2. **Ask only what changes the outcome:** one question at a time, with options labelled by their consequence, and never ask for something already known. Examples: R1 asks the business name once and the pay question in plain words; slots filled earlier are reused.
3. **Corrections edit the task in place:** "change it to Friday and make it friendlier" revises the same draft as v2 with a diff (R3). "Actually only the top 3" redrafts the submittal (R4).
4. **Contradictions are surfaced, not resolved silently:** "only seniors" followed by "why no juniors" makes Q name the conflict and ask which rule to keep (R5).
5. **Topic changes keep unfinished work:** the suspended task stays resumable, and "where was I?" returns to it (R1, T4).
6. **When Q doesn't understand,** it says so and offers its capabilities. It never guesses at consequential actions. The fallback logs `q.unhandled` for review.

## 3. Navigation on the user's behalf

| Behaviour | Prototype | Production requirement |
|---|---|---|
| "Show me everything about Tobi" opens the profile and keeps the conversation | `core.open` → `qNavigate` | An `open_page(route, params)` tool over a route registry. The registry is the single source of pages, labels and permissions (`src/routes/registry.ts`). |
| "Go back to the comparison" restores the exact prior state (filters, criteria, scroll) | `qBack`, `useViewState` (state per person per page) | View state is persisted per user and page on the server. Back is a navigation-history stack per user, not the browser's alone. |
| Q never offers to open the page you're already on | `QThread.tsx` action filter | Same rule in the action renderer. |
| Return to unfinished work across sessions | `lastRoute` per actor; "welcome back" (T2, T4) | A last-location and open-tasks summary on sign-in. Q's first line says what changed while you were away. |
| Permission-aware navigation | `OrgOnly` guard (`src/routes/guard.tsx`); privacy refusal in `core.open` | The navigation tool is denied by the same authorisation as the page. Q explains the refusal without revealing what exists. |

## 4. Artifacts: what Q builds and keeps up to date

Artifacts are live objects that Q creates and revises. They render inside the thread as cards and on the page as the canvas. Examples:
- role briefs with versions (R1);
- message drafts with diffs (R3);
- comparisons with criteria and weighting (R2);
- development plans (T2);
- submittals and client reports (R4);
- the interview review (T4).

| Rule | Prototype | Production |
|---|---|---|
| A thread card and the page show the **same** object; edits from either side update both | `registerRef` (`src/q/refs.ts`) renderers read the store | An artifact service with ids, versions and patches; clients subscribe (`q.artifact.created/patched`). |
| Every revision is a version; old versions stay readable; approval binds to a version | Brief v1→v2 (R1), draft v1→v2 (R3) | Immutable versions. An approval references `{artifactId, version, payloadHash}`. |
| Presentation is chosen for the content, with a list fallback | `Canvas` views; contract §7 | `views[]`, `defaultView` and `reason` come from the run. Only view kinds that exist in the design system may be used. |
| Partial or in-progress artifacts are marked | "updating" in the Canvas header | `partial: true` until synthesis completes. |

## 5. Acting: operations, approvals and permissions

The prototype has 76 **operations** (`registerOp`), listed in the appendix. Each is a state change Q can perform. In production each becomes a tool with:
- input schema;
- permission check;
- tenant scope;
- approval class;
- audit event;
- undo, where reversible.

**Approval classes, as the journeys use them:**

| Class | Examples | Rule |
|---|---|---|
| Free and reversible | Move a pipeline card, change a filter, mark a plan step done | Do it, offer **Undo** (`pushUndo`), and audit it. |
| Needs a yes | Send a message, book or hold a time, share or revoke evidence, submit interview answers, submit candidates to a client | Show a preview with the checks Q ran (role, delegation, calendar, guidelines, consent, time zone), then **Approve and send**. The receipt states whether it was simulated or real. |
| Outside the person's role | A hiring manager sending an offer or changing policy (R5); a viewer opening a confidential role (R4) | Refuse, name who can do it, and offer to ask them. |
| Never | Unredacted confidential originals (T3), protected-criterion filters (R5), sends that bypass "approve each send" (R5) | Refuse, offer the job-related or redacted alternative, and audit. |

Organisation delegation modes (`Org.delegation`):
- `DRAFT_ONLY`;
- `APPROVE_EACH_SEND`;
- `APPROVED_CAMPAIGN`, with per-run, per-day and per-message limits (R4).

## 6. Proactive help

**Prototype.** 41 rules (`src/q/proactive/*.ts`) are evaluated from real state. Each produces `{subject, text, why, actions}`. Lifecycle: OPEN, SNOOZED (Later, 24 h), DISMISSED or DONE, remembered per person (`src/q/core/proactive.ts`). Preferences: OFF, QUIET (high priority only) or NORMAL. High-priority suggestions sort first. The card shows the observation, its actions, and a quiet "Why am I seeing this?", "Later" and "Dismiss".

**Production.**
- Rules become event-driven triggers on domain events, plus scheduled checks: no reply after N days, uploads paused, interviews tomorrow.
- Every suggestion must cite the facts behind it (`why`).
- A dismissal must stop a repeat unless the facts change. The subject key defines "same suggestion".
- Rate limit: no more than two visible at a time.
- Never interrupt a task the user is typing in.

## 7. Memory and context

Contract: `contracts/memory.ts`. It defines layers, truth classes (STATED_BY_USER, VERIFIED_FACT, THIRD_PARTY_CLAIM, INFERENCE, ORG_POLICY), lifecycle, write modes, visibility scopes and retention.

| Requirement | Journey evidence |
|---|---|
| Q shows what it used: "used" chips on replies, naming sources such as "Kora guidelines", "Your meeting hours (20 Oct)" or "Tobi's consent" | R2, R3 |
| A memory carries its source and truth class. An inference is marked as an inference and is never used as a stated fact. | R5 (Bayo's "remote is fine" was Q's inference, corrected) |
| A correction supersedes and never overwrites: the old value is kept as "replaced", with who and when | R5, `/r/memory` |
| Forgetting gives a receipt: what was deleted, and what can't be deleted (audit records, sent messages) and why | T5 |
| Rejected advice is remembered and never repeated | T5 |
| Scopes never leak: a candidate's private memory, J7 practice and Passport private items are invisible to every organisation. Organisation memory is invisible to candidates and to other organisations. | T2, T3, R4 |
| Context packs (`ContextPack`) list what Q is using for a task, with scope and revision ids, so a reply is reproducible | `contracts/memory.ts` |

## 8. Multi-step work: plans and agents

**Planner (`/r/plan`, `src/services/agents.ts`).**
- Goal, then a clarifying question, then context and policy recall, then a DAG plan.
- Agent lanes with real unit progress, pause and resume across sessions, and an approval queue for handoffs.

**Agency agents (R4, `src/journeys/agency/model.ts`).**
- Several runs at once (three slots, priority order).
- Interrupt and reprioritise ("stop Medlink, Kora is urgent").
- Provider outage handling: automatic retry once, then a stated failure; manual retry loses no work.

**Production requirements.**
- Durable runs on the Q runtime, with resume from the last finished unit.
- Unit-based progress only.
- Per-tenant concurrency limits.
- Priority queues.
- Recovery mode RETRYING, SKIPPED or ASK_USER, visible to the user.
- Agents act only through the same tools and approval classes as Q (§5).

## 9. Evidence and fairness guarantees Q must keep

1. **Only authorised evidence.**
   - Recruiters see what the candidate shared with their organisation, plus public items only if the privacy policy allows it. Policy functions: `canSeeCandidate`, `canDiscover`, `relationshipWith`, `visibleEvidence` in `src/mock/world.ts`.
   - Production enforces the same policy in **every** retrieval path: search, profile reads, Q tool calls, caches and generated artifacts.
   - Tests: `qa/scripts/review/privacy.mjs` (21 checks). Spec: `PRIVACY-AND-PERMISSIONS.md`.
2. **Show evidence with its basis.**
   - Unknown is not weak.
   - Sources that disagree are shown together, not reconciled silently (R5: CV versus GitHub).
   - A disputed assessment is left out until it's reviewed (R2).
3. **Protected criteria are refused.** Q refuses criteria on age, sex, family, religion, origin and appearance, redirects to job-related alternatives, and audits the refusal (`src/q/core/policy.ts`, `core.fairness`).
4. **Practice is never proof.** J7 practice and private interview practice never change what an employer sees (T2, T4).
5. **Nothing is fabricated.** CV lines and profiles use only what the person said or proved (T1).
6. **No promises about employer decisions.** "Viewed" means only viewed (T5, T4 receipt).

## 10. Performance and resilience

- Targets from `contracts/Q-WORKSPACE-CONTRACT.md`: acknowledge within 400 ms, first durable event within 1 s, unit progress after 10 s, and the workspace never blocks.
- **Offline:** messages typed offline are kept and sent on reconnect after a state re-check, and nothing consequential is sent while offline (`flushOutbox`; R3, T4).
- **Low bandwidth:** lite mode; resumable chunked uploads; an interview draft kept on the device across connection loss (T4).

## 11. Model gateway and evaluation

- The prototype can call an optional model gateway (`VITE_TQ_MODEL_GATEWAY_URL`, `ModelGatewayRequest` in `src/q/core/engine.ts`) with no credentials in the client. In production this is replaced by the Q runtime.
- **Evaluation before launch:**
  - Run `q-eval-corpus.json` (206 cases across ten journeys) as an intent and outcome regression suite.
  - Add red-team cases for fairness, privacy (cross-tenant requests from R4, discovery restrictions) and prompt injection in uploaded documents.
  - Measure clarification rate, repeated-question rate and correct-refusal rate.
