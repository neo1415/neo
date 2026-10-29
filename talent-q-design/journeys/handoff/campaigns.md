# Engineering handoff · hiring campaigns and requisition organisation (audit addendum §D, AD-D-01…08)

Specification only. The prototype is the behavioural and design blueprint. "Prototype:" paths are under `prototype/src/`.
**PROD ≠ SIM** marks where production must differ. Proof: `qa/scripts/features/campaigns.mjs`; regressions: R1, R2, R4, R5.
Code map: state `state/areas/campaigns.ts`; read models and mutations `journeys/campaigns/model.ts`; pages
`journeys/campaigns/pages.tsx`; routes, Q card and opener `routes/campaigns.tsx`; Q skills `q/skills/campaigns.ts`
(ids `campaigns.*`); proactive rule `hire-a.campaign-draft` in `q/proactive/hire-a.ts`; Roles grouping `journeys/hire-a/Roles.tsx`;
hiring-vs-outreach lines in `journeys/agency/pages.tsx`. Cross-feature graph and statecharts: `handoff/ADDENDUM-HANDOFF.md`.

## 1. Entities
| Entity | Fields | Notes |
|---|---|---|
| `HiringCampaign` (`state/domain.ts`) | `id, orgId, clientOrgId?, name, goal, owner, deadline?, status ACTIVE·PAUSED·ARCHIVED, createdAt, createdBy, roles[], savedFilters[]` | `roles[]` is **the** requisition → campaign link. No candidate, stage, message or score is stored on it. |
| `SavedFilter` | `{id, label, query}`; query ∈ `all · stage:<STAGE> · multi · reply · assessed · role:<id>` | Shared with the team on the campaign. |
| `RoleMeta` (prototype only, `CampaignsState.roleMeta`) | `owner?, due?` per requisition | **PROD:** move to M6 as `Requisition.ownerId` and `Requisition.targetDate`. |
| Requisition (existing) | `MandateX`, and the legacy `w.mandate` (`m_backend`) | Read through one model, `reqOf` / `reqsFor`. **PROD:** one `Requisition` table; the legacy shape disappears. |
| Outreach campaign (existing, M14) | `agency.campaigns[] {clientOrgId, poolId, mandateId…}` | A child of a requisition. Its parent hiring campaign is derived: `campaignOf(mandateId)`. Never merged. |

## 2. Ownership
- **M6 Roles and mandates** owns `HiringCampaign`, the requisition → campaign link, archive and re-open, and the campaign read models
  (the lead's decision in `ADDENDUM-HANDOFF.md` §3). A separate campaign module is **not** recommended: a campaign has no data of its own
  beyond grouping, so splitting it would create a second source of truth for "which roles are we hiring for".
- Read-only consumers: M8 pipeline (stage counts), M9 correspondence (threads by `mandateId` / `campaignId`), M10/M11 interviews,
  M11 rubrics (`approvedVersion`, `roleIndex`), M14 outreach (children), M18 events (history).
- Writers into the link from elsewhere: M9 thread routing writes `Thread.campaignId` (a routing record; role → campaign stays canonical).

## 3. Canonical hierarchy and invariants
`Organisation → [agency: Client] → HiringCampaign → Requisition → {brief versions, Rubric versions, OutreachCampaign, PipelineEntry, Interview, Thread} → outcome`.
1. A requisition is in **at most one** campaign per organisation. Adding one that is elsewhere is a *conflict*: the user chooses to move it (audited on both) or leave it. Never copied.
2. A closed or filled requisition can't be added (re-open the role first). An archived campaign takes no new roles (re-open it first).
3. A client campaign (`clientOrgId`) holds only that client's requisitions. Any mix is refused and audited (`campaign.role.declined`).
4. Archive, pause, remove a role: change grouping only. They never close a role, withdraw a candidate or cancel a message.
5. All counts are computed at read time from the owning stores and the viewer's permissions. Nothing is cached on the campaign.

## 4. Tenant, privacy and agency client rules
- Reads filter by `campaign.orgId === viewer.orgId`; agency staff additionally by the client in focus (`lensOf` = agency `focusOf`).
  A campaign of another organisation renders a permission page with no data (proof: "Tenant: Ada can't see Talentbridge's campaign about Kora").
- People in stage counts, the board, messages and interviews pass `canSeeCandidate(w, pid, viewerOrg)`. Hidden people are **counted, never named**;
  withdrawn consent is not counted.
- Agency staff never see the client's scorecards (client-owned), and people names aren't linked to employer profile pages.
- VIEWER and INTERVIEWER read only; OWNER, ADMIN, RECRUITER and HIRING_MANAGER organise (`canManage`). **PROD:** row-level security on
  `(org_id, client_org_id)`; a query without the client predicate fails closed.

## 5. API and events
| API | Approval class | Event (scope `ORG:<orgId>`, `data.campaignId`) |
|---|---|---|
| `GET /campaigns?client=` · `GET /campaigns/:id/overview` | read | — |
| `POST /campaigns {name, goal?, deadline?, clientOrgId?}` | reversible | `campaign.created` (undo → `campaign.deleted` only while it has no roles) |
| `POST /campaigns/:id/requisitions {requisitionId, move?}` → 409 `{conflict: otherCampaignId}` | reversible | `campaign.role.added` (+ `campaign.role.removed` on the source when moved) |
| `DELETE /campaigns/:id/requisitions/:rid` | reversible | `campaign.role.removed` |
| `POST /campaigns/:id/archive · /reopen · /pause · /resume` | reversible | `campaign.archived`, `campaign.reopened`, `campaign.paused`, `campaign.resumed` |
| `PATCH /campaigns/:id {name}` | reversible | `campaign.renamed` |
| `POST /campaigns/:id/filters {label, query}` | reversible | `campaign.filter.saved` |
Declines are events too (`campaign.role.declined`). The campaign's history page is a filter over M18 events by `data.campaignId`.

## 6. Q tools (prototype skills → production tools)
`createCampaign` (`campaigns.create`; asks for a name if missing; duplicate name opens the existing one), `addRequisitionToCampaign` /
`removeRequisitionFromCampaign` (`campaigns.role`; dry-run first so the reply states the conflict; move only on an explicit choice),
`summarizeCampaign` (`campaigns.summary`, read), `listNextActions` (`campaigns.needs`, read), `openCampaign` (`campaigns.open`, navigation),
`archiveCampaign` / `reopenCampaign` (`campaigns.archive`), `renameCampaign`, plus `campaigns.explain` (hiring vs outreach).
All reversible ones push an undo entry and return a live `campaigns.card`. **Context:** the campaign on screen, else the one named, else the last
one discussed (`q.ui[actor|campaigns].focus`), so "archive it" works. **Agency disambiguation:** campaign skills claim an agency turn only for
"hiring campaign", a hiring campaign's name or the `/r/campaigns` pages; otherwise the outreach skills (`agency.campaign`) own it.
**PROD ≠ SIM:** regex understanding becomes an LLM calling these tools with the same gates and refusals.

**Proactive** (`hire-a.campaign-draft`, normal priority): to the campaign owner, only within 10 days of the deadline, when a role in
the campaign still has a draft brief. Subject = the brief version, shared with `hire-a.draft-stale`, so one dismissal covers both.
**Opener** (`routes/campaigns.tsx`): on campaign pages Q's first line names the first action that needs the reader.

## 7. Read models and caching
- `stageCounts(role, viewerOrg)`, `messagesFor(role | unfiled)`, `scorecard(role, people)`, `nextActions(campaign)`, `board(campaign)` in `model.ts`.
- Next-action rules (ordered): brief draft (who it waits on, from the version note) · rubric proposed / none · messages awaiting approval ·
  candidate's latest message unanswered (per person, across threads) · interview to arrange · panel feedback missing · nobody on an approved role ·
  thread in the campaign but not filed to a role. Rubric and search wait for an approved brief; messages and interviews never do.
- **PROD:** materialise a per-requisition summary (counts by stage, awaiting-reply, approvals) updated from M8/M9/M10/M11 events; the campaign
  overview aggregates summaries for its roles. Cache key `(orgId, clientOrgId?, viewer permission epoch)`; invalidate on consent or discovery
  changes, because privacy filters change counts. Scorecards are never cached apart from their rubric version.

## 8. Failure and recovery
Conflict (409) → inline choice; closed role → refusal with "re-open the role"; other client → refusal (isolation); archived campaign → offer
re-open; unknown or foreign campaign → permission page; concurrent edit of `roles[]` → server-side compare-and-set on the link table.

## 9. Risks
- Campaigns becoming a second role list (duplicated counts or fields). Mitigation: no stored aggregates; the link is one table.
- Leakage through counts in agency views (a count can hint at a person). Mitigation: counts only for permitted viewers; hidden-count copy is generic.
- Overlap with outreach vocabulary for agencies ("campaign"). Mitigation: label the agency rail item "Outreach" (request below).
- Next-action noise. Mitigation: per-person dedupe and "Waiting on others" collapsed; needs validation with recruiters.

## 10. Shared-file requests (not edited)
- `routes/agency.tsx` (agency area): rename the rail item "Campaigns" → "Outreach", and add "Hiring campaigns" (`/r/campaigns`, `orgKind: 'AGENCY'`).
  `registry.ts` allows one `nav` per path, so this needs either the agency route to declare a second entry or `nav.also`.
- `ds/icons.tsx`: a campaigns icon (the route uses `atlas` for now).
- `state/domain.ts`: optional `MandateX.ownerId?` and `MandateX.targetDate?` to retire `CampaignsState.roleMeta`.

## 11. Validation still required
Recruiter interviews on whether "campaign" or "hiring plan" is the right word; whether one-campaign-per-role holds for shared roles across
initiatives; next-action ordering with 5 recruiters; agency staff on per-client lenses. No usability testing has been done.
