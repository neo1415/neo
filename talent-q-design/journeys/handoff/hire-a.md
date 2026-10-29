# Engineering handoff · hire-a (R1 Funmi, first-time employer at Crumb & Co · R5 Bayo, sceptical hiring manager at Kora Pay)

This is a specification only: the prototype is the behavioural and design blueprint. Every "Prototype:" path is under
`prototype/src/`. **PROD ≠ SIM** marks where production must differ from the simulation.
Proof: `qa/scripts/journeys/R1.mjs` (94 steps) and `R5.mjs` (66 steps), each on desktop and phone, plus `qa/scripts/review/privacy.mjs`.
Code map:
- Rules: `journeys/hire-a/model.ts`.
- Pages: `journeys/hire-a/{Home,Roles,Audit}.tsx`, `screens/{MandateIntake,Sourcing,Memory}.tsx`.
- Q cards and meters: `journeys/hire-a/ui.tsx`.
- Skills: `q/skills/hire-a.ts` (ids `hire-a.*`). Proactive rules: `q/proactive/hire-a.ts`.
- State: `state/areas/hire-a.ts`. Seed: `state/seeds/hire-a.ts`.

## 0. Defaults every feature inherits
- **Tenancy.** Every mandate, version, search, pipeline entry, thread, hold, verification attempt and event carries
  `orgId`. Reads are scoped by `orgMandates` / `scopeOf`. **PROD:** row-level security on `org_id`; fail closed.
- **Candidate privacy** uses the store policy (`canSeeCandidate`, `canDiscover`, `visibleEvidence` in `mock/world.ts`),
  which is checked at read time. Search pools are filtered every run (`poolFor`). Never re-implement the policy in a service.
- **Org limits** come from `orgLimits(w, orgId)` (founder decisions D1 and D3). An unverified organisation can search,
  but it can't post roles, it has `outreachPerWeek: 3`, and it gets no campaigns, no submittals and no contact details.
  Every message it sends is labelled "not verified yet". `limitsFor` (model.ts) adds `used` (sent in the last 7 days)
  and `drafted` (waiting for approval).
- **Q.** Every capability can be reached by typing and through the page, and both go through the same ops
  (`registerOp('hire-a.*')`).
  - Consequential acts (approve a brief, post, hold times, discard) reply with `kind:'approval'`, or perform the act
    only when the user taps the approval action.
  - Reversible acts call `pushUndo`.
  - **PROD ≠ SIM:** intent and slot matching is regex (`NEED`, `rolesFrom`, `parseHours`, `cacNumber`). Production uses
    an LLM with these ops as tools. It keeps the same gates, refusals, frames and "say what you used" (`used`, `why`).

## 1. Conversational intake and organisation setup (R1)
| Aspect | Spec |
|---|---|
| Behaviour | Funmi has no org. Q asks one plain question at a time: business → what takes your time → role → hours → budget (`question()`). It creates the org from one line (`createOrg`) with her as OWNER. When she names two jobs, Q asks her to pick one. A change of mind ("actually… my books, part time") re-plans and keeps her shared answers (`applyChange`). "Where was I?" resumes from the stored step (`whereWasI`). |
| Data | `HAIntake{step, business, city, pains, roleKey, prevRoleKey, hours, days, budget, mandateId, updatedAt}` per actor. `Org{verified:{domain, registry}, delegation, guidelines}`. |
| Rules | Role catalogue `ROLES` (plain description, requirements, `partOk`). A shop manager is always full-time. Work she says she'll do herself is excluded from the role. |
| Events | `org.created`, `mandate.created`. |
| Memory | The intake frame is task state, not memory. **PROD:** keep the frame server-side per conversation, so it survives devices. |
| Failure | An unclear answer gets the question again with chips, never a guess. A question mark ("what's a mandate?") gets an explanation, then Q asks its pending question again (`hire-a.explain`). |

## 2. Role brief (mandate): versions, approval binding, discard and undo — `/r/roles/:id`
| Aspect | Spec |
|---|---|
| Behaviour | Three tabs: Brief, People and Versions. Every change makes a new version (`revise`), and old versions stay readable (`snapshots`). Approval binds to one exact version (`approveIn` checks `curV`). Any later change returns the brief to draft. Discard is undoable and restores the brief exactly. |
| Data | `MandateX{versions[{v, at, by, note}], status}`. `meta[id]{roleKey, hours, days, approvedV, approvedBy, approvedAt}`. `snapshots[id][v]`. `discarded[id]`. |
| Permissions | `can(actor, cap)`: `approve_brief`/`edit_brief` for OWNER, ADMIN, RECRUITER and HIRING_MANAGER; `delete_role` for OWNER, ADMIN and RECRUITER, or the brief's creator. A brief from another organisation shows a permission page. |
| API | `POST /mandates` · `PATCH /mandates/:id` (→ v+1) · `POST /mandates/:id/approve {v}` (409 if v ≠ current) · `DELETE` as a soft delete with restore. |
| Events | `mandate.revised`, `.approved`, `.unapproved`, `.discarded`, `.restored`, `.reverted`. |

## 3. Pay realism (illustrative guide) and `PayRange`
- `band(role, hours, days)` scales the full-time range pro rata for part-time and rounds to ₦5k. Below the range, Q
  offers three choices: raise it, fewer days, or keep it. Keeping it is recorded in the version note.
- The meter shows the offer against the band, gives the verdict in words, and labels the range "illustrative".
- **PROD ≠ SIM:** the ranges are hand-written. Production needs a sourced, dated pay dataset by city, role and hours.
  Show its source and date, and never present it as a quote.

## 4. Organisation verification and the limits it lifts (D1/D3)
| Aspect | Spec |
|---|---|
| Behaviour | Before verifying, Funmi can search and shortlist. `LimitsPanel` (People view and home) shows messages sent and drafted out of the weekly allowance, "Posting roles: off until verified" and "candidates see 'not verified yet'". She starts verification by typing ("verify my business"), from a chip, or from a refused post. Q explains why, confirms her business email from her sign-up code (`confirmEmail`; free-mail domains fail), and asks for the CAC number. |
| Rules | `cacNumber` parses `RC/BN + digits` from free text. `lookupRegistry` (SIMULATED) accepts 7 digits, reports too short (FORMAT) and otherwise not found. After 3 failed tries, checking stops and she is offered a manual document review. On success the org becomes `verified:{domain:true, registry:'VERIFIED'}` and any of her open jobs pick up the verified signals. |
| Data | `verify[orgId]{email{address, at, ok}, tries[{at, number, ok, reason}], at}`. Every attempt is kept. |
| Events | `org.verification.email`, `org.verification.failed`, `org.verified`. |
| **PROD ≠ SIM** | Use the CAC public register API, or a KYB provider, and match the registered name against the org name (fuzzy, with human review below a threshold). Prove the domain with an emailed code or a DNS TXT record. Rate-limit lookups per org and per IP. Store the provider's reference, not just a boolean. Re-verify yearly. Add a manual review queue for certificate uploads. |
| Failure | Provider down: say so, keep the limits, and retry in the background. Never mark an org verified on a timeout. |

## 5. Posting a role (only for verified organisations)
- `postAsk` refuses with a reason when `orgLimits().postRoles` is false. When posting is allowed, it asks for approval.
- `postRole` creates a `Job` with signals and can be undone (`hire-a.unpost` closes the job).
- An application creates `relationshipWith`, so candidates who apply become visible even if they hide from discovery.
- API: `POST /orgs/:org/jobs {mandateId}` (403 `ORG_UNVERIFIED`). `PATCH …/jobs/:id {status:'CLOSED'}`. Events: `job.posted`, `job.closed`.

## 6. Search and shortlist
| Aspect | Spec |
|---|---|
| Behaviour | Q searches only against an approved brief. Results show what each person shares: the fit list, what isn't shown yet, and up to two visible evidence items with a verification glyph. Shortlisting works by name, by "top N" or with a button, and can be undone. |
| Rules | `poolFor` uses the role pool and then `canSeeCandidate`. People who chose verified employers only (Zara, Tobi) never reach Crumb & Co. Ranking is `fit − unknown`, then years. **PROD ≠ SIM:** pools are hard-coded. The real ranking is per-requirement evidence matching against the brief (shared with hire-b's ranking contract). Never show a single score, and re-check privacy every time a cached result is read. |
| Events | `q.search.ran`, `pipeline.shortlisted` / `pipeline.unshortlisted`. |
| Performance | A search writes a snapshot `search[id]{at, found}`, and the People view re-filters on every render. **PROD:** run the search as an async job with partial results, as on the Kora search page (`screens/Sourcing.tsx` and the run events). |

## 7. Interview holds and invitations, within the outreach cap
- `proposeReply` plans weekday slots for the shortlist, and the plan is capped by `limitsFor().left`
  (allowance − sent − drafted). Q names who was left out and how to lift the cap.
- `proposeIn` writes simulated `CalEvent{status:'HOLD'}` holds and `Msg{status:'DRAFT'}` invitations. Unverified
  senders get a footer: "From Talent Q: <org> hasn't verified its business yet". Nothing is sent or booked here.
- **PROD:** enforce the cap at send time on the server (an atomic counter per org per rolling 7 days, keyed by
  `orgLimits`), as well as in Q's planning. The candidate-facing label is added by the messaging service, not the template.

## 8. Permissions, delegation and bulk send (R5)
- `hire-a.perm`: offers, policy changes and "send to all" are refused with the reason, the rule and the names of
  people who can do it, and Q offers to ask them (`hire-a.request` writes into their Q thread).
- Bulk send under `APPROVE_EACH_SEND` produces one `AWAITING_APPROVAL` draft per person and sends nothing.
- Events: `q.permission.declined`, `request.created`. **PROD:** the policy engine is the source of truth; Q reads it.

## 9. Fair-hiring guardrails and contradictions (R5)
- Protected attributes (`hire-a.fair.redirect`) and proxies (`hire-a.fair.proxy`, e.g. "graduated before 2015" stands
  in for age) are declined. Q offers job-related criteria from the brief. A chosen criterion is added as a new version.
  Every decline is logged as `q.policy.declined`.
- Standing instructions (`instructions[actor]`, e.g. "only seniors") are checked against later asks. Q names the
  trade-off and asks which to keep (`tradeoff`).
- **PROD ≠ SIM:** a regex list. Production needs a reviewed classifier plus a jurisdiction policy, and the declines
  must be auditable.

## 10. Memory correction and source conflicts (R5)
- Memory: Q shows what it holds with source and truth class (`MemoryRef`). A correction supersedes the item rather than
  deleting it (`correctMemory` sets `supersedes_id`; the old item becomes `superseded`). Undo restores the old item.
  `/r/memory` hides colleagues' private items and candidates' practice records (`recruiterMemories`).
- Conflicts: `CONFLICTS[pid]` pairs two shared items (Kunle's CV says 6 years; GitHub shows about 2). Both are always
  shown, and Q never picks one. The team's choice (check in interview, or ask the candidate) is stored in `conflicts[pid]`.
  **PROD:** detect conflicts by comparing structured claims, and keep both sources with their provenance.

## 11. Audit log — `/r/audit`
- Built from `w.events` scoped to `ORG:<id>` and `SHARED:<org>:…`. Filter by person, kind, words and day. The filters
  survive navigation (`useViewState`), and Q sets them ("who changed the panel?", "what did you do yesterday?").
- **PROD:** an append-only, tamper-evident event store, indexed by org, actor, type and time. Exports are role-gated.

## 12. Algorithms to implement or validate
| Algorithm | Prototype | Production need |
|---|---|---|
| Role inference from plain talk | keyword scores (`rolesIn`) | LLM classification against the catalogue, confirmed by the user |
| Pay guide | static ranges (`band`) | sourced dataset with percentile bands and a freshness date |
| Candidate ranking | fit − unknown | per-requirement evidence levels; bias audit |
| Registry match | 7-digit rule | KYB provider with name matching and human review |
| Outreach cap | `orgLimits` + `limitsFor` | server-side rolling window, enforced at send time |
| Proxy detection | regex list | reviewed classifier and policy; logged outcomes |
