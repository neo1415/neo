# Design pass: agency (R4, Dele at Talentbridge; Tunde is a Viewer)

Pages: agency home, `/r/agency/clients` (and `/clients/:id`), `clients/mandate/:id`, `clients/notes`, `clients/docs`,
`pools`, `pools/searches`, `pools/compare`, `submittals`, `campaigns`, `agents`, `reports`. Old flat paths redirect.
Code: `prototype/src/journeys/agency/pages.tsx`, `model.ts`, `src/routes/agency.tsx`, `src/styles/agency.css`.

## Defects found (most severe first)
1. **Two navigation systems.** An 11-item pill bar repeated the rail on every page, wrapped to two rows on desktop and
   scrolled sideways on phones. The rail didn't mark secondary pages. (IA, Jakob, excise)
2. **Agent monitoring didn't scan.** Each run was a tall card with five equal buttons. State showed only as a small
   tag plus colour. Interrupted looked the same as paused, and nothing showed where a resumed run had picked up again.
   There was no overview of slots or states. (H1, Von Restorff, Hick)
3. **Client isolation was a row of filter chips with a grey sentence.** It looked like a filter, not like a workspace boundary.
4. **Privacy leaks in the agency area.** Saved searches, the Medlink ops mandate, the seeded submittal and the campaign
   approval text named Chidi, Amaka or Zara. Excluded campaign rows named Zara with a privacy reason.
5. **Pool rows said "3 of 3 must-haves shown",** too close to the hidden-people note's "shown". The note was a plain
   paragraph that was easy to miss.
6. **Kickers and titles held status** ("mandate v1 · confidential", "report · v2 shared").
7. **Empty states** were one grey sentence with no next step. "Say it to Q" chips repeated across pages.

## Skills → screens → changes
- **design-critique** (all 13 pages). The IA review led to one navigation system. The rail keeps the six top destinations
  (Clients, Talent pools, Submittals, Campaigns, Agents, Client reports). Secondary pages nest under their parent
  path, so the rail marks where you are. In-page tabs appear only inside Clients (Mandates, Team notes, Documents)
  and Talent pools (Pools, Saved searches, Compare). They're underlined, so they never read as a second rail. The
  client page and the Clients page were merged into one.
- **interaction-design** (agents, home, pools, docs). Agent runs were modelled as 8 phases (`phaseOf` in model.ts):
  running, waiting, retrying, failed, paused, interrupted, finished and cancelled. Each phase has its own icon shape
  and word. Each row offers one contextual primary action (Pause, Resume, or Retry now plus Skip provider). Priority and
  cancel sit behind "More options", and cancel still asks for confirmation. Finished runs collapse per client.
  Motion uses the `ds/motion` tokens: the fill moves only when a unit finishes (DUR.slow, linear; MO-009); the count
  fades in on each unit (DUR.normal, EASE.enter); a running bar's edge breathes; a retrying track sweeps (MO-036);
  rows reflow with `layout`; upload bars follow real progress (MO-016); "More options" uses `arrive`. All loops stop
  under reduced motion and in lite mode.
- **dataviz** (agents, home, pools, campaigns).
  The meter's fill carries state (ink running, warn paused, hatched risk failed, ok finished) over a same-ramp track,
  with markers where a run resumed (caret) and where the provider failed (risk tick). A KPI row shows slots in use and
  counts per state, each with icon and word. Pools show evidence pips plus words; campaigns gained a sent-of-total meter.
- **design-elevation** (all). Home client cards were simplified to an inline fact row. Equal-weight tiles were
  removed. One elevation level is kept. Spacing and type sizes were reduced, and the sheet holds the runs as a single
  ruled list.
- **ux-writing** (all).
  Kickers are one line and status moved to tags; empty states have a title, a reason and a next step. The privacy note: "1 more person in this pool isn't shown. Their privacy settings don't allow agencies to
  find them, and they haven't registered with Talentbridge. Talent Q doesn't say who." The delegation banner leads
  with "You approve each campaign once"; "Say it to Q" became "Try saying to Q".
- **Client isolation.** A client lens band sits at the top of every single-client page. Each client has a mark that
  differs by shape and letters (Kora: filled square "KP"; Medlink: ring "MH"), not by colour. The note names the other
  client: "Showing Kora Pay only. Medlink Health's records stay out of this view." The same marks head each client's
  section on the home and agents pages.
- **Privacy (store-enforced).** `allowed()` (canSeeCandidate) now also filters pipelines (`mandatePeople`,
  `pipelineFor`, so reports too), search results and diffs, conflicts, campaign targets (counted in `notShown`, never
  messaged or named), Q's pipeline, re-run and campaign replies, and submittal rows. Seeds no longer list Chidi there.

## Before/after pairs (`captures/review/pairs/agency/`)
- 01 Pools, desktop: the duplicate 11-item section bar is replaced by the client lens and three section tabs. The
  rail marks Talent pools.
- 02 Agents, desktop: tall five-button cards become phase-coded rows with a slot and state overview.
- 03 Agents, phone: one primary action per run, and the sideways-scrolling bar is gone.
- 04 Pools, phone: evidence pips, and the hidden-people note designed as a row in the list.
- 05 Home, desktop: client marks, inline facts and compact live agent rows instead of tag-and-bar soup.

Key states are in `captures/review/after/*/u_dele_state_*.png` (failed, interrupted, resumed with marker, Medlink pool
with 2 hidden, submittal draft, report flagged) and in `captures/cx/R4/`.

## Verification
- `R4.mjs` passes on desktop and phone, no page errors. New assertions: no agency page or Q reply names Zara, Chidi or
  Amaka; anonymous hidden counts on pools, the ops mandate and campaigns; the rail marks the parent of nested pages;
  no in-page section bar; old paths redirect. `privacy.mjs` passes; `tsc` is clean for agency files.

## Remaining weaknesses
- Interrupted (page closed while running) only appears after a real reload. R4 doesn't drive it, so its capture is unproven.
- On phones the run rows are still long. A collapsed "summary only" mode for 10+ agents is not designed.
- The client lens holds two clients. With 8+ clients it needs a searchable switcher.
- "Try saying to Q" chips remain on most pages. They're useful for the demo but repetitive for daily use.
- Shared suggestion: the rail's `current()` in `src/ds/AppShell.tsx` could accept a `nav.match` prefix list, so areas
  needn't nest paths to get "you are here".
