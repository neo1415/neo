# Privacy, tenancy and permissions: production specification

The prototype enforces these rules in one place, the store: `canSeeCandidate`, `canDiscover`, `relationshipWith`, `visibleEvidence` and `eventsFor` in `prototype/src/mock/world.ts`, plus the route guard `prototype/src/routes/guard.tsx`. `qa/scripts/review/privacy.mjs` proves them (21 checks).

Production must implement the **same policy as one authorisation service**, called by every read path. It must not be re-implemented per feature.

## 1. Who may see a candidate

`canSeeCandidate(person, org)` is true when:

1. consent has **not** been withdrawn from that organisation (withdrawal always wins), **and**
2. either:
   - there is an **explicit relationship**: the person applied to one of the organisation's jobs, shared at least one item with it (and has not revoked it), or registered with it (agencies); **or**
   - the person's **discovery rule** allows the organisation:
     - `ANYONE` (the default, founder decision D1): any organisation, verified or not. Unverified organisations are limited (§6).
     - `EMPLOYERS_AND_AGENCIES`: any organisation with a verified domain.
     - `VERIFIED_EMPLOYERS`: employers with a verified domain and a verified company registration. Agencies are excluded.
     - `NOBODY`: no one may discover them.
     - `hideFrom[]` overrides all of the above for the organisations listed.

The global switch `consents.discoverable = false` means the same as `NOBODY`.

## 2. What they may read

| Item visibility | Readable by an organisation when |
|---|---|
| `PRIVATE`, `PRACTICE` (J7 practice, private interview practice), confidential originals | Never |
| `SHARED_WITH: [orgs]` | The organisation is listed, the item is not in `revokedFrom`, and consent is not withdrawn. The explicit share holds even if discovery is `NOBODY`. |
| `PUBLIC_PROFILE` | `canSeeCandidate` is true |
| Redacted copy (`redactedOf`) | Only through its own share; the original stays private |

## 3. Enforcement points (all must call the one service)

| Path | Prototype enforcement | Production obligation |
|---|---|---|
| Recruiter search and sourcing | `poolFor` (`journeys/hire-a/model.ts`), sourcing run (`q/scripts.ts`) | Filter in the query, not after ranking. Never return counts of hidden people per organisation. |
| Agency pools, people lists, campaigns, submittals | `allowed`, `activeMembers`, `hiddenMembers`, campaign exclusion (`journeys/agency/model.ts`) | Pools may hold only the person IDs the agency may see. Hidden members are counted, never named. Every campaign send re-checks at send time. |
| Candidate profile page | `Profile.tsx` (`journeys/hire-b/`) | Show a permission state with no data, not even the person's name, unless the organisation already holds it. |
| Q tools (open profile, compare, summarise) | `core.open` refusal (`q/skills/core.ts`); evidence via `visibleEvidence` | Tools run as the user, with the same authorisation. Refusals don't reveal whether hidden data exists. |
| Cached results (saved comparisons, search results, agent outputs) | Re-checked on read: `rank()` and `Sourcing.tsx` | Caches store IDs only and re-authorise on every read. Revocation and withdrawal take effect immediately. |
| Downstream artifacts (reports, submittals, exports) | Agency report isolation check | Re-check when the artifact is generated and when it is shared. A document already sent outside Talent Q can't be recalled, so the person is told that (T5 deletion receipt). |
| Events and audit | `eventsFor` scopes: `ORG:`, `PERSON:`, `SHARED:org:person` | Every event carries a scope and is filtered by it. Revocation events tell the organisation only that access ended, never why. |

## 4. Tenancy

- Every organisation-owned record carries `orgId`.
- Agency records also carry `clientOrgId`.
- Lists filter by the client in focus. Q refuses requests that mix clients (R4).
- Pages belonging to one organisation are guarded by organisation, not just hidden from navigation. The prototype found and fixed a leak where `/r/agency/*` was reachable by URL from an employer.

## 5. Roles within an organisation

`OrgRole`: OWNER, ADMIN, RECRUITER, HIRING_MANAGER, INTERVIEWER, VIEWER.

| Action | Allowed roles (as in the journeys) |
|---|---|
| Change policy or guidelines, change roles | OWNER, ADMIN |
| Approve and send correspondence | OWNER, ADMIN, RECRUITER, under the organisation's delegation mode |
| Draft correspondence; give interview feedback | All except VIEWER (HIRING_MANAGER drafts go to the approval queue) |
| Make offers | OWNER, ADMIN, RECRUITER (R5: a hiring manager is refused, with who can do it) |
| Open confidential mandates | Members on the mandate. A VIEWER requests access and an OWNER grants it (R4) |

## 6. Organisation verification and limits (founder decisions D1, D3)

- Verification needs a verified domain and a company registration check against an external registry.
- **Until verified, an organisation:**
  - can search, and finds people whose rule is `ANYONE`;
  - **cannot post roles**;
  - can send **at most 3 outreach messages a week**, each labelled for the candidate as "This employer isn't verified yet";
  - **cannot** run campaigns or make submittals;
  - **cannot** see contact details.
- The limits are one configuration object (`UNVERIFIED_LIMITS` in `prototype/src/mock/world.ts`); production keeps them in configuration, not code.
- Every send path checks the weekly allowance at send time.

## 7. Candidate controls (all reversible and audited)

- Discovery rule and per-organisation hiding, set on the Evidence Passport and summarised in Settings.
- Per-item sharing and revocation.
- Consent withdrawal per organisation.
- Memory review, correction and deletion with a receipt.
- Notification channels.

Every change emits an event scoped `PERSON:` and takes effect on the next read (§3).

## 8. Fairness

- Selection by protected characteristics is refused and audited (`q/core/policy.ts`).
- Accommodation requests are not refusals. A mention of accommodation does not trigger the guard.
