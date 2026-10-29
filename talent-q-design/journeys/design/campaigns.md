# Design pass · campaigns (hiring campaigns and requisition organisation, audit addendum §D; J11 step 4)

Routes: `/r/campaigns`, `/r/campaigns/:id`, plus the Roles page grouped by campaign (`/r/roles`, `/r/roles/m_backend`),
the hiring-vs-outreach lines on `/r/agency/campaigns` and Q's campaign card. Captures: `captures/review/after/{desktop,phone}/campaigns_*.png`;
feature states `captures/cx/campaigns/`. `qa/scripts/features/campaigns.mjs` covers desktop and phone (58 checks). No page scrolls sideways at 390 px.

## Skills invoked (Skill tool) → screen → change
- **design-skills:design-critique** → every campaign screen, rendered, then fixed (defects below). Information order follows the
  task: *Needs you* → Roles → People across roles → Scorecards → Messages → (agency) Outreach → History. Lede states Q's reading
  ("2 roles · 4 people in play · 3 things need you"), not a description; the explanation moved to a quiet line (list page).
- **design-skills:interaction-design** → state model per role and campaign. Campaign `ACTIVE ⇄ PAUSED → ARCHIVED → (re-open) ACTIVE`;
  archive is immediate and undoable (undo, not "are you sure?": nothing about a role changes). Role ∈ campaign is
  `free | in this | in another (conflict: move, never copy) | closed (re-open the role first) | other client (refused)`.
  The Add-a-role panel shows every role's state *before* the choice (error prevention), and the conflict is an inline banner
  with "Move it here" / "Keep it there". Stage counts animate only when a count changes (MO: `DUR.fast`, `EASE.enter`);
  role rows use `layout` (`DUR.normal`); new cards `arrive`. Context: "archive it" resolves to the campaign on screen or last discussed.
- **design-skills:ux-writing** → verb-first, specific labels ("Reply to Zara", "Open Tobi's message", "Move it here",
  "Take out of this campaign"); empty states say what is missing and the next step ("No roles yet. Add a role and its brief,
  people and messages show up here. The role itself doesn't change."); refusals give the reason and the way back
  ("…is closed, so it can't join a campaign. Re-open the role first…"); privacy notes count, never name.
- **design-skills:design-elevation** → one elevation level (sections are sheets, rows are flat with 1 px rules); gold only for Q
  (the lede diamond and Q-proposed approvals); one ink ramp for data; mono `tabular-nums` for counts and dates.
- **dataviz** → the stage strip is *not a chart*: a labelled count strip (count + stage name as direct labels, width ∝ count with a
  legible minimum, 2 px gaps, rounded ends, deeper stages one step darker on the ink ramp; empty stages folded into one line,
  like the pipeline board). Scorecards: index is text **beside** a coverage bar (0–100 % of criterion weight observed), always
  "83 at 50% coverage, 2/4 criteria"; an index never renders alone; no cross-role comparison. Board has a table twin on desktop.
- **design-superpowers:creative**: not used (recruiter area, Direction D unchanged).

## Defects found on first render (most severe first) and fixes
1. Agency overview had no client lens; people linked to the employer profile route → lens added (follows the campaign's client),
   names plain for agency, employer-only links hidden, client scorecards replaced by a one-line "belongs to the client" note.
2. Roles page didn't show Senior Backend (legacy `w.mandate`) and a closed role read "Next: find people" → roles grouped by
   campaign, legacy role included (and `/r/roles/m_backend` now opens a summary with the full brief and rubric links), closed reads "Closed · not hiring".
3. Messages listed Zara twice (two threads) and "needs a reply" disagreed with the later outbound message → one row per person,
   "waiting for a reply" computed from the person's latest message across their threads.
4. Draft briefs hid everything else about a role (Tobi's message vanished from Needs you while the legacy brief was a draft) → only
   rubric and search wait for an approved brief; replies, approvals and interviews still surface.
5. List lede was explanation in display type → Q's reading leads; the explanation is a quiet line.
6. Duplicate chips ("Open the thread" ×2) in Q's reply → per-person labels, de-duplicated.
7. Phone: board filters took three rows → one row that scrolls inside itself; board becomes one card per person.
8. (Lead review) The rubric studio wasn't reachable from a role → role detail (`/r/roles/:id`, incl. legacy Senior Backend) has a
   "Rubric v1 in force" / "Rubric: agree how to assess" action, and every role row and scorecard in a campaign links to `/r/roles/:id/rubric`.
9. (Lead review) The campaign-deadline card fired 7 weeks out and crowded R2's certificate card → it fires only within 10 days of
   the deadline, normal priority, and shares the brief's subject with `hire-a.draft-stale` (one card per thing).

## Pairs (`captures/review/pairs/campaigns/`)
- 01: Q4 overview, desktop. Duplicate Zara rows and a missing reply action → one row per person; reply to Tobi in Needs you.
- 02: Talentbridge client campaign. No client lens, profile links, repeated "no rubric" → lens, plain names, one client-scorecard note.
- 03: Campaign list. Explanation as the lede → Q's reading ("2 active campaigns · 2 things need you"), hidden people counted.
- 04: Roles. Flat list without Senior Backend, closed role told to "find people" → grouped by campaign, legacy role, "Closed · not hiring".
- 05: Q4 overview, phone. Filters wrapping three rows → single scrolling row; board as cards; in-page index.

## Requirements prototyped (evidence: `qa/scripts/features/campaigns.mjs` step names)
- AD-D-01 hierarchy org → campaign → requisition → rubric/outreach/pipeline/threads/interviews: model read from the existing stores ("J11-4 overview…", "Outreach runs listed as children of a role").
- AD-D-02 grouping only, a role in at most one campaign: move-not-copy ("Move: role leaves Q4…", "Conflict…").
- AD-D-03 agency client scoping: lens, client-only roles ("Agency list…", "Agency: a Medlink role can't join…", "Tenant: Ada can't see…").
- AD-D-04 outreach separate: child list on the campaign, parent link on `/r/agency/campaigns` ("Outreach page links each run…", "Outreach skill still owns…").
- AD-D-05 overview: stage counts, owners, deadlines, next actions, approvals, messages by role ("J11-4 …" steps).
- AD-D-06 board, saved filters, per-role scorecards (index with coverage), archive/re-open with history, empty and conflict states.
- AD-D-07 Q create / organise / summarise / navigate / archive / "what needs me", with context and undo ("Q: …" steps).
- AD-D-08 consumed, not built: the EMAIL area routes a thread (`campaignId`, `mandateId`); this area shows it under its role (J11-4).

## Remaining weaknesses (honest)
- Per-role due dates and owners live in `CampaignsState.roleMeta` (no field on `MandateX`); there is no UI to change them yet, only seed values.
- The legacy Senior Backend brief is still a draft in the seeded world while it has a shortlist and interviews, so "Approve the brief" leads Ada's list. True to state, odd as a story.
- Agency hiring campaigns have no rail entry of their own: the agency rail's "Campaigns" is the outreach list (shared file; see the handoff request).
- The rail icon reuses `atlas`; a dedicated campaigns icon needs `ds/icons.tsx` (shared).
- Saved filters are a fixed query vocabulary (`stage:`, `multi`, `reply`, `assessed`, `role:`), not free text. Q can't save one by voice.
- Not usability-tested with recruiters. Language understanding is rules, not a model.
