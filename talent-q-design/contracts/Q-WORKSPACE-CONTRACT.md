# Q workspace contract (draft)

Types: `contracts/workspace.ts`. These extend the run stream in `contracts/run.ts`, with the same envelope, sequence numbers, cursors and durability rules. They do not change `neo1415/q` and they do not add a second orchestration system. They describe what Q must emit so the Direction D workspace can show Q's work truthfully.

## What the prototype does today

The prototype simulates this contract through typed service boundaries:
- `src/services/agents.ts` for the planner;
- `src/services/profile.ts` for onboarding;
- `src/mock/runtime.ts` for runs.

**View choice in the prototype is scripted.** A human-written mapping decides which view each step shows. That is a demonstration of the experience, not autonomous artifact selection. In production, the `views[]`, `defaultView` and `reason` fields of an artifact must come from the run.

## The eleven behaviours and the events behind them

| # | Behaviour | Event(s) | UI that consumes it | Must hold |
|---|---|---|---|---|
| 1 | Understand the request; ask only what changes the outcome | `q.request.understood`, `q.clarification.required` | Thread: a restated goal, then one question with consequence-labelled options | A blocking question halts only the dependent tasks |
| 2 | Recall authorised context | `q.context.recalled` | Thread chips above Q's reply ("Mandate v1 · approved", "Your meeting hours") | Every item shows its source and scope. Withheld items are counted by reason and never shown |
| 3 | Read the organisation's policies and instructions | `q.policy.applied` | A policy chip, plus "needs your yes" tags on gated tasks | Policy refs carry versions. A blocked action names its rule |
| 4 | Plan and delegate | `q.plan.proposed`, `q.task.updated` | Plan graph (depth columns), agent lanes | Tasks form a DAG. Optional tasks can be skipped before start. Progress counts real units only |
| 5 | Work through tools and connected services | `q.tool.called`, `q.tool.result`, `q.integration.unavailable` | Lane source tags, activity log | Each call names its connector and says whether it was simulated. An outage is reported by name with a recovery mode |
| 6 | Show truthful progress and intermediate findings | `q.task.updated`, `q.finding.available` | Q mark (one point per running agent), lanes, findings list | No timer-driven progress. Findings link to evidence |
| 7 | Choose the presentation | `q.artifact.created` (`views[]`, `defaultView`, `reason`) | Canvas view switcher and the "Shown as …" line | Views use known kinds only. Each view has a table or list fallback and a `scale` rule for large data |
| 8 | Create, revise and update artifacts | `q.artifact.patched`, `q.followups.offered` | Versions (v1…vN), progressive canvas, follow-up chips | Partial artifacts are marked. Old versions stay readable. Switching views never resets the conversation |
| 9 | Continue across conversations and sessions | `q.run.paused`, `q.run.resumed` | "Paused · resume" banner, plans list, resumed reference check | Resume starts from the last finished unit. An interruption by disconnect is stated |
| 10 | Ask before consequential actions | `q.handoff.proposed`, `q.handoff.decided` | Approval queue: preview, effect, receipt | Approval binds to the payload hash. Receipts say whether they are simulated. There is no bulk send that bypasses "approve each send" |
| 11 | Recover from errors, interruptions and unavailable integrations | `q.integration.unavailable`, `q.run.failed` (run.ts), `q.run.paused` | Lane warning tag, a question in the thread, the Q mark's "blocked" shape | Recovery is RETRYING, SKIPPED or ASK_USER, and the choice is visible |

## Performance

These targets apply to the runtime, not only to the design:
- Acknowledge every request within 400 ms, as a restatement or a "thinking" state.
- Emit the first durable event within 1 s.
- Any task over 10 s must emit unit progress and stay resumable.
- The workspace never blocks on a long run: the user can read, switch views and navigate while Q works.

## Open questions for the Q team

- Who owns `ViewKind` additions? Proposal: the design system ships renderers, and Q may only reference kinds that exist.
- Should rate-limit retries be emitted per attempt, or coalesced?
- How do payload hashes map to Capital Q's existing approval records?
