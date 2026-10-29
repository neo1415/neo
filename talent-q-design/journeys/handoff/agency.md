# Engineering handoff · agency (R4 Dele at Talentbridge; Tunde is a Viewer)

Specification only. The prototype is the behavioural and design blueprint, not the implementation. Every
"Prototype:" reference is to `prototype/src/`. Lines marked **PROD ≠ SIM** say where production must differ from the
simulation. Journey proof: `qa/scripts/journeys/R4.mjs`; privacy proof: `qa/scripts/review/privacy.mjs`.
Code map: model/rules `journeys/agency/model.ts`, pages `journeys/agency/pages.tsx`, routes `routes/agency.tsx`,
state and seed `state/areas/agency.ts`, `state/seeds/agency.ts`, Q `q/skills/agency.ts` (ids `agency.*`),
proactive `q/proactive/agency.ts`.

## 0. Defaults every feature inherits
- **Tenancy is two levels.** The *agency* (`org_tb`) is the tenant. The *client* (`org_kora`, `org_medlink`) is a
  hard partition inside it: every record (pool, search, campaign, submittal, note, run, doc, report, access request)
  carries `clientOrgId`. Every read takes the client in focus (`poolsFor(w, client)` etc. in model.ts). No API returns
  a cross-client list except agency home and agents, which return per-client groups. **PROD:** enforce this with row-level
  security on `(agency_id, client_org_id)`, not in the UI. A query without a client predicate fails closed.
- **Candidate privacy is central.** The agency sees only people with a relationship (registered with it, applied,
  or shared evidence) or whose discovery rule allows agencies: `canSeeCandidate(w, pid, 'org_tb')` in
  `mock/world.ts`, wrapped as `allowed()` in model.ts. Hidden people are **counted, never named**: pools
  (`hiddenMembers`), mandates (`mandateHidden`), searches and campaigns (`Campaign.notShown`). Withdrawn consent always
  wins. Services call the policy and never re-implement it. Stored lists (pool members, search results) may hold ids
  the viewer can no longer see, so filter at read time.
- **Roles.** OWNER/ADMIN/RECRUITER act (`canAct`). VIEWER reads pools, searches, notes and documents. VIEWER can't send,
  launch, upload, control agents or open confidential mandates without a grant (`canSeeMandate`, `hasAccess`).
- **Events.** Every change emits `{type, actorId, scope:'ORG:org_tb', text, data:{clientOrgId,…}}` (`emit`). Types:
  `agency.search.rerun`, `.submittal.drafted|sent|nudged`, `.campaign.approved`, `.run.paused|resumed|cancelled`,
  `.consent.withdrawn`, `.note.added`, `.doc.uploaded`, `.report.shared`, `.access.requested|decided|denied`,
  `.isolation.declined`, `.role.declined`, plus `consent.withdrawn` on `PERSON:<id>`. Audit, Q memory and proactive
  rules read events, never UI state.
- **Q.** Every capability is reachable by natural language (19 skills) and by the page. Both call the same ops
  (`registerOp('agency.*')`). Consequential acts (send submittal, launch campaign, share report, grant access) return
  `kind:'approval'` and run only on the action. Reversible acts push an undo. **PROD ≠ SIM:** matching is regex and
  rules. Production uses an LLM with these ops as tools, and keeps the same approval gates and refusals.
- **Navigation contract.** The rail holds Clients, Talent pools, Submittals, Campaigns, Agents and Client reports.
  Secondary pages nest (`AP` in model.ts: `pools/searches`, `pools/compare`, `clients/notes`, `clients/docs`,
  `clients/mandate/:id`). Old flat paths redirect.

## 1. Clients and tenant isolation
- **Behaviour.** The client lens (`ClientSwitch`) sits on every single-client page. It shows marks distinguished by
  shape and letters, and says "Showing X only. Y's records stay out of this view." Focus is stored per person
  (`AgencyState.focus[actorId]`). `/clients/:id` sets focus. The home and agents pages group by client and never mix rows.
- **Data.** `Org.clients[]` on the agency. `MandateX.clientOrgId`, plus `confidential` and `versions`.
  `AccessRequest {actorId, recordId, state}`.
- **Rules.** Q declines any request that combines two clients' people or records (`agency.isolation`). It explains the
  rule and offers a separate consent request. Conflict detection (`conflicts()`) finds a *visible* person in two
  clients' active pipelines with opposite work modes. It is surfaced to the agency only, and never to either client.
- **APIs.** `GET /clients/:id/overview`, `POST /focus`, `POST /mandates/:id/access-requests`,
  `POST /access-requests/:id/decision` (owner only; the requester gets a notice).
- **Failure.** Unknown client → "not one of your clients". Another org by URL → `OrgOnly` permission page, with no data.

## 2. Pools and registrations
- **Behaviour.** `pools`: one card per pool, members ranked by evidence (see §10). Each row shows evidence pips plus words
  and a per-client consent tag. Hidden people appear as one anonymous note. Withdrawn people appear in "Removed from
  this pool" with a reason.
- **Data.** `Pool {clientOrgId, mandateId, members[]}`. Registrations come from seed `registrations` →
  `Consent.registeredWith` (relationship). `shareConsent[personId] = clientOrgId[]` holds consent to be put forward,
  *per client*.
- **Rules.** Membership never grants visibility. Withdrawal (`withdrawConsent`) cascades atomically: pools (marked
  removed), queued or held campaign messages (excluded), draft submittals (left out), search results and run findings
  are purged, and owners are notified. Anything already sent stays sent, and Q says so.
  **PROD ≠ SIM:** only the candidate withdraws, from their own account. The demo control on the page is simulated.

## 3. Saved searches with diffs
- **Behaviour.** `pools/searches`: query, last run, results tagged "New since last run" or "Seen before". "N new waiting"
  shows when the market changed after the last run. A re-run diff names new people (`agency.rerun`); "Add new people to
  the pool" is one step away.
- **Data.** `SavedSearch {query, keywords, lastRunAt, results[], newSinceLast[], runs}`. **PROD ≠ SIM:** `universe`
  (who matches since when) is a stand-in for a live index query.
- **Algorithm.** `rerunSearch`: `now = match(query) ∩ allowed ∩ ¬withdrawn`, `new = now − previous results`, and
  persist `results`, `newSinceLast`, `lastRunAt` and `runs`. Proactive `agency.search-new` fires when the fresh count
  is above 0.
- **Caching.** Cache results per `(searchId, policyVersion)`. Invalidate on any consent or discovery change for a member.

## 4. Campaigns under delegation limits
- **Behaviour.** `campaigns`: limits (per run, per day, words, follow-ups), the first message, and per-message status
  (Queued, Sent (simulated), Held, Excluded with reason). A sent-of-total meter shows progress. The page shows a
  "can't launch" banner until the client brief is signed.
- **Rules (`launchCampaign`).** All of these must hold:
  - `canAct`.
  - `org.delegation === 'APPROVED_CAMPAIGN'` (one approval covers the campaign, not each message).
  - A signed `BRIEF` doc for the mandate (`briefSigned`; Talentbridge guideline).
  - Each member must be allowed (otherwise counted in `notShown`), not withdrawn (otherwise Excluded), and within
    `maxWords` and `perRun` (otherwise Held for the next run).

  At send time the sender re-checks consent for every message.
- **Agent execution.** Launching creates a `CAMPAIGN` run (§6), one message per unit. **PROD ≠ SIM:** a real email
  provider with idempotency keys per `(campaignId, personId, step)`, a daily cap enforced server-side, unsubscribe
  handling and real receipts instead of `msg_sim_*`.

## 5. Submittals with per-person consent
- **Behaviour.** `submittals`: drafts show per-person include or leave out, with a reason. The approval box states the
  effect ("Sends 3 profiles to Kora Pay"). Sent submittals show the receipt, a nudge action and the client's reply.
  Changing your mind ("only the top 3") redrafts and discards the old draft.
- **Rules.** `draftSubmittal` takes the top N of `ranked(pool)` and includes only `consentState === 'OK'` for *that*
  client. `sendSubmittal` re-checks consent at the moment of sending, and pipeline entries move to SHORTLISTED.
  **PROD ≠ SIM:** profiles leave Talent Q through a client-portal share or email, under a data-sharing record per person.

## 6. Concurrent agent runs: priority, pause, resume, retry
- **Behaviour.** The `agents` page shows each run with:
  - an 8-phase status (`phaseOf`: running, waiting, retrying, failed, paused, interrupted, finished, cancelled), each
    with its own icon and word;
  - a progress meter that moves only when a unit finishes, with markers where the run resumed and where the provider failed;
  - one contextual action, with priority and cancel under "More options";
  - an activity log.

  A summary row shows slots in use and counts per state.
- **Data.** `AgentRun {clientOrgId, kind, provider, providerState, total, done, state, priority 1|2|3, attempts,
  retryInTicks, resumedFrom, failedAt, log[], found[]}`.
- **Scheduler (`fillSlots`, `tick`).**
  - 3 concurrent slots (`SLOTS`). The queue is ordered by priority.
  - An urgent run pre-empts the lowest-priority running run, which yields and continues later from its own position.
  - Each unit is atomic: `done` increases only after the unit commits.
  - Pause and resume keep `done`. Resume records `resumedFrom` and never repeats finished units.
  - Interrupt ("stop Medlink, Kora is urgent", `interrupt()`) pauses one client's runs and raises the other's,
    starting its main saved search if nothing is active.
- **Failure.** If a provider stops answering, the run is marked FAILED with `failedAt` and the work so far is kept.
  The system retries once automatically. If the provider recovers, `providerState: RECOVERED` and the run continues
  from `done`. If it still fails, the run waits for a person, who can choose Retry now or Skip provider. Skip finishes
  on the Talent Q network with a reduced total. Other runs are never affected.
- **Recovery.** A run left RUNNING when the tab closed becomes **Interrupted** on the next load (`startRunner`).
- **PROD ≠ SIM:** a server-side durable job queue (not a browser `setInterval`) with:
  - leases and heartbeats (a lost heartbeat → interrupted);
  - per-provider circuit breakers and backoff;
  - per-client quotas;
  - live progress pushed to clients over SSE or WebSocket.

## 7. Notes and mentions
- **Behaviour.** `clients/notes`: a composer, newest first, @mentions highlighted, a "Mentions you" tag, and read on
  view. Notes are internal: the client never sees them.
- **Data.** `Note {clientOrgId, mandateId?, by, text, mentions[], readBy[]}`. Mentions are agency staff matched by
  first name (`addNote`).
- **Q.** "tell tunde to check femi's references" becomes a client-scoped note with a mention. Proactive
  `agency.mention` notifies the person mentioned. **PROD:** resolve mentions against user ids, not names.

## 8. Documents
- **Behaviour.** `clients/docs`: name, signed or not-signed brief tag, confidential tag, summary, and an upload with a
  progress bar. Viewers can read but not upload. Confidential docs are hidden by role, with a count.
- **Rules.** A signed `BRIEF` unlocks campaigns for its mandate.
  **PROD ≠ SIM:** real upload (virus scan, size and type limits, resumable uploads), e-signature verification
  instead of a `signed` flag, extraction of summary and requirements by Q with citations.

## 9. Client reports with isolation checks
- **Behaviour.** On `reports`, Q drafts a report from one client's records (`buildReport`: summary, each mandate,
  candidates put forward, outreach, risks). The person edits each section and saves a new version. Sharing goes
  through Q's approval. Version history is kept.
- **Isolation check (`isolationCheck`), live while editing and again at share time.** Every person named must be in
  `peopleFor(client)` (pipeline ∪ pools, filtered by `allowed`). No other client's name may appear. If either rule
  fails, Share is disabled and the banner names what to remove.
- **PROD:** run the check server-side at share time against entity extraction (not substring matching), and store the
  shared version immutably with its receipt.

## 10. Algorithms
- **Fit per requirement.** `fit[mandateId][personId][reqId] ∈ {verified, full, partial, none}`, from evidence only.
  It is never a single score on screen.
- **Ranking (`fitScore`, `ranked`).** Weights: verified 3, full 2, partial 1, none 0. Must-haves count double.
  Sort by score descending, then by name. Pool rows show "Evidence for k of n must-haves" (`mustHavesShown`), where
  k counts must-haves whose evidence isn't `none`.
- **PROD:** fit marks come from the evidence service (`visibleEvidence` for this viewer), and must be recomputed
  when evidence is revoked or consent changes.
- **Diff.** Set difference against the last persisted results (§3).
- **Isolation.** Allow-list match (§9).

## 11. Memory, context and performance
- **Q context per turn:** the actor, their role, the client in focus, the open frame (draft submittal or campaign
  awaiting approval), and the latest runs. Q's memory may hold preferences (for example the default submittal size),
  never candidate data across clients.
- **Performance:** pages read from a client-scoped read model. Agent progress arrives as events, and pages don't poll.
  Ranking stays under 20 ms for 200 members. Cache nothing that crosses clients or candidate privacy, and key every
  cache by `(agency, client, policyVersion)`.
