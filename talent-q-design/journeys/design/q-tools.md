# Design pass · Q's tools and artifacts (SC-124, 126, 127, 128, 130, 136; V06, V07, V26; MO-004, 005, 031, 032, 034, 038, 056)

Routes (both sides, one rail entry "Q's work" in the Q group, tools as tabs): `/q/artifacts`, `/q/artifacts/:id`,
`/q/browse`, `/q/browse/:id`, `/q/downloads`, `/q/sources` (`prototype/src/routes/q-tools.tsx`).
Code: `prototype/src/journeys/q-tools/` (model, views, pages, refs, web fixtures, CSS), area slice
`state/areas/q-tools.ts`, Q in `q/skills/q-tools.ts`, `q/openers/q-tools.ts`, `q/proactive/q-tools.ts`.
Everything is made by asking Q in the global thread: "chart our pipeline by stage", "map where Kora's candidates are",
"draw the hiring process", "make a short narrated explainer of this role", "look up Kora's engineering blog",
"download this certificate", "what sources did you use", "what's the market pay for a senior backend engineer in
Lagos", "read it out loud", "carry on", "continue this on my phone". The reply carries a live card (`qt.art`,
`qt.sources`, `qt.conflict`, `qt.voice`) and the artifact opens on the canvas.
Test: `qa/scripts/features/q-tools.mjs` 158/158 (79 desktop, 79 phone). axe (wcag2a/aa + best practice) clean on all
eight q-tools pages at 1440; at 390 the only finding is the shell's `.ds-proto-bar` outside a landmark (shared shell,
same on every page, not changed here). No page scrolls sideways at 390 px.

## Skills invoked (Skill tool) → screens → changes
- **interaction-design** → each artifact is a small state machine (building → ready | empty | denied | error), with
  progress derived from when the work started, in real named steps (frames drawn 1–5; size/type → scan → extract
  page n of m); there is no spinner. Interruption is a first-class transition. Video: SPEAKING → (pause or offline)
  INTERRUPTED → resume. Voice: SPEAKING → (typing, mic, Escape, Stop or a new message) INTERRUPTED "listening" →
  "carry on". The receipt is the end state of a download and never appears before it. The link preview shows on
  hover and on focus, then a single choice bar confirms the action. No modals: removing a source is confirmed in place.
- **ux-writing** → outcomes name the reason and the next step. Blocked: "Its name says PDF, but it's a Windows
  program. Programs are never downloaded." Quarantined: "…password-protected, so its contents can't be scanned.
  It stays in quarantine until an admin reviews it, or you ask the sender for an unprotected copy." Fence: "Fetched
  text · untrusted. Q reads this as data. Nothing on a page can instruct Q." Injection: "Ignored. This text tries to
  give Q an instruction…" Unknown location: "Location not shared (unknown, not zero)". Voice state: "Stopped ·
  listening to you (you started typing)". Conflict: "I haven't picked one, and I won't without you."
- **design-elevation** → one elevation level (sheet on paper; panels inside are ruled). Plex Mono is used for data
  (domains, file names, counts), Fraunces for Q's words and titles, and Inter Tight for the UI. The storyboard screen
  is the only ink surface on the canvas, because it is Q narrating.
- **design-superpowers:creative** (L2, inside Direction D, no new tokens): (1) the untrusted fence is a dashed paper
  panel with a mono label, which is the D language for "not ours / not proof"; (2) a map with no basemap: a faint
  graticule and ghost reference cities give orientation without implying geography Q doesn't have; (3) the scan
  receipt is a ruled foot on the file card, so the outcome reads last, like a stamp; (4) gold appears only on the Q
  mark (including its new speaking state), Q's reading above the fence and Q's primary chips.
- **dataviz** → the chart is one series, so it has no legend; the title names it. Thin ink bars with 4 px ends and a
  direct value label sit on a recessive baseline. Each bar is focusable and shows a detail line naming who is in the
  stage. A Chart | Table toggle sits above it. The map is one series with dot area proportional to the count, city and
  count labelled directly, keyboard targets of 44 px or more, and a Map | List toggle. Text keeps its real 12–15 px
  size whatever the map's width: viewBox units are scaled by the rendered width.
- **accessibility-audit** → axe on every page at both widths. Fixed: heading order (frame titles and page titles are
  h2 under the canvas h1). SVG marks are `role=button` with names. Captions are `aria-live` only while paused, so a
  screen reader isn't flooded during play. The voice card's state line is live and the mark has a text title.
  Transcript, outline, table and list alternatives exist for every visual.
- **design-critique** → the rendered critique is below. Defects were fixed and the screens re-rendered.

## Rendered critique (first render), most severe first
1. Sev 3 · H1/H4 (Sources and the "what sources" reply): blocked and quarantined downloads were listed as sources
   ("Not opened"), and "what sources did you use" answered "0 sources" for a blocked file. → Only a clean file
   becomes a source. Q answers for the latest artifact that actually used sources (pairs 06, 07).
2. Sev 3 · Readability (map, phone): reference-city labels collided (Uyo / Port Harcourt), were clipped at the right
   edge, and shrank below 12 px when the 600-unit map rendered at 330 px. → Text is scaled to its real size, ghost
   labels are hidden on narrow screens and end-anchored near the edge, and Uyo's label is offset (pairs 02, 03).
3. Sev 2 · H8 (browse): "On the allowed list" was repeated on six links, which was noise. The 182 MB video preview
   promised "scanned before anyone can open it", but it is over the limit and is never fetched. → Only "Not allowed"
   is flagged. Oversize files say "over the 25 MB limit". Q's own one-line reading now sits above the fence, so Q's
   words and the page's words are visibly separate (pairs 04, 05).
4. Sev 2 · H2 (Q's chart reply): "Here's kora Pay's roles…", because lowercasing the title broke the proper noun;
   "1 more aren't". → "Here's the chart: …", with singular and plural handled (pair 01).
5. Sev 2 · H4 (dates): the kicker used real time (30 Oct) while receipts used the product clock (29 Oct). → All
   displays use the simulated clock (pair 09).
6. Sev 2 · H8 (thread, phone): a refused video still produced an empty "Narrated video · not made" card under Q's
   refusal. → Refusals are said once, in Q's words (pair 08).
7. Sev 1 · Navigation (phone): the tool tabs clipped "Sour…". → Tighter tab padding, so all four fit at 390 px.

## Before/after pairs
- 01: Chart, desktop: Q's reply copy fixed ("Here's the chart…", grammar), same chart and table toggle
- 02: Map, desktop: Uyo / Port Harcourt label collision fixed; reference labels end-anchored at the edge
- 03: Map, phone: text kept at real size, reference labels hidden, no clipping
- 04: Secure browsing, desktop: Q's reading outside the fence; allowed-list tags removed; oversize preview honest
- 05: Secure browsing, phone: same, and the tool tabs fit at 390 px
- 06: Sources, desktop: blocked and quarantined files no longer listed as sources; freshness tag plus detail
- 07: Sources, phone: "what sources did you use" answers for an artifact that used sources (was "0 sources")
- 08: Q thread, phone: no empty "not made" card under a refusal; voice card interrupted state
- 09: Downloads, desktop: receipt date on the product clock; outcomes with reasons

## Requirements covered (evidence = test step names in q-tools.mjs)
- SC-124: chart and map from live, privacy-filtered state (a withdrawn consent drops the person at once, counted not
  named); table and list views; loading or empty; permission denied for a candidate and for an agency asking for
  Kora's pipeline.
- SC-126: vector figure with checks from the org's delegation; outline; candidate's own path.
- SC-127: simulated storyboard with captions, transcript and provenance; play, pause (interrupted), resume, offline
  stop; consent refusals (a person, voice cloning).
- SC-128 / V06: sandbox tags, untrusted fence, injection ignored and shown, "do what the page says" refused, link
  previews, off-list domain never fetched and requestable, nothing sent.
- SC-130 / V07 / MO-034: limits, scan steps, receipt only after the scan, clean / blocked / quarantined with reasons,
  only clean files open.
- SC-136 / MO-056: sources with freshness, licence, who can see them and what used them; filter; share or keep
  private; remove; conflicting sources side by side, with the choice recorded and both kept.
- MO-004 / MO-005: speaking and interruption in the global thread; MO-038: desktop to phone, same thread and same
  frame (verified with a second 390×844 device on the same store).

## Shared-file change
- `src/ds/QMark.tsx` (additive): a `speaking` mood. The core swells with a level, like `listening`, and the label is
  "Speaking". No existing mood changed.

## Remaining weaknesses (honest)
- Voice is captions only. The amplitude is derived from the syllables of the current word, not from real audio.
  Speaking state shows in the voice card and not in the thread header (that would mean editing `QThread`).
- The interrupt hooks watch the composer by its id and the microphone by its label. That works, but it is coupled to
  the shell's markup. A core `onComposerInput` event would be cleaner.
- The web is five fixed snapshots on `.example` domains. Research is one topic (Lagos backend pay). "Read it again"
  only updates the read date.
- Map positions are approximate city centres. With few people, a city-level dot can still identify someone; the
  recruiter can already see these people, but a minimum-count rule is not implemented.
- The chart is single-role-group (all roles, or one if named). No time series, no filters on the page beyond the
  table toggle.
- Not VERIFIED: no screen-reader pass, and no recorded MP4 clips for the motions.
