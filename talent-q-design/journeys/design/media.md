# Design pass · media (audit addendum §F: candidate-authorised video and voice evidence; J11 steps 7–8)

Routes: the candidate side lives in the Evidence Passport (`/c/passport`, Proof view, section "Video and voice", deep links
`?media=add|review|parts|preview|ready`); the recruiter report is the new `/r/people/:id/video` (`?t=<s>&play=1` seeks).
Captures: `captures/features/media/{d,m}-NN-*.png` (full page, every state, from the test) and element captures in
`captures/review/pairs/media/{first-el,after-el}/`. `qa/scripts/features/media.mjs` passes 114/114 (57 desktop, 57 phone).
T3 54/54 and T5 52/52 still pass. No page scrolls sideways at 390 px.

## Skills invoked (Skill tool) → screens → changes
- **interaction-design** → the item state machine (CONSENT → UPLOADING ⇄ PAUSED → TRANSCRIBING → REVIEW → READY → REVOKED,
  plus UNSAFE_LINK / FETCH_FAILED), written at the top of `journeys/media/logic.ts`. The upload shows **parts** (10 blocks),
  so "carries on from part 5" is visible, not just claimed. Pausing is condition-driven (the connection), resuming is
  automatic on reconnect (condition loop), with a manual "Resume" only when online. Playback is event-caused (the
  playhead moves only while playing); seeking is instant. Destructive actions (stop sharing, delete, sharing a
  confidential part) use an inline confirmation that states the consequence; reversible ones (transcript fixes, marking
  reviewed) use Undo instead. Goal-gradient: a 4-step indicator (Consent · Recording · Check · Share).
- **ux-writing** → consent copy as two plain lists, "What Q will do" / "What Q won't do" (the prohibited inferences in
  everyday words: "Judge your face, voice, accent or appearance", "Guess how confident, honest or likeable you are").
  Errors follow what/why/what next: "I didn't open that link. This is a shortened link. I can't check what's behind a
  shortened link, so I never open one…" plus a recovery button. Retention copy names what Kora keeps and that D9 is open.
  Recruiter: "Not shown … not scored and never counted as zero"; the refusal to "is he confident?" gives the reason and
  an alternative.
- **design-elevation** → Direction D materials: ink for the player only (where the recording plays), paper for evidence,
  gold only for Q's own work (the lede diamond, key-moment markers, timestamp chips, corrected-line wash). One elevation
  level: the media card is a flat ruled panel inside the Passport sheet; the will/won't boxes were flattened.
- **dataviz** → the timeline is a part-to-whole strip of the video: shared parts filled (ink), unshared parts as a hatched
  track labelled only "Not shared" (never the title), Q's moments as gold ticks underneath, a 2 px surface gap, direct
  labels, mono time ticks, and an `sr` list of parts as the text alternative. Coverage is a second part-to-whole strip:
  **block width = weight**, filled = shown in the video, hatched = not shown, a legend, and the role index printed only
  next to its coverage ("index 63 at 57% coverage, prototype arithmetic"). Ratings use 4 squares plus "3/4" (shape and
  number, not colour).
- **design-critique** → rendered critique below (heuristic, severity 0–4), then fixes and re-renders.
- **design-superpowers:creative** → not used (no new visual idea needed inside Direction D).

## Rendered critique (first render), most severe first
1. Sev 3 · H5/AD-F-07: the text/form/adjustment alternatives were hidden in a collapsed `<details>`; "always offered"
   wasn't true at a glance. → Always-visible dashed panel with three buttons (pair 01).
2. Sev 3 · Visibility/Fitts: "Mark the report reviewed" sat after every finding (≈5 screens on a phone). → Moved under
   the coverage strip, before the findings (pair 05).
3. Sev 3 · Phone, first screen: lede at 19 px + a 4-line statement pushed the player below the fold. → 17 px lede on
   phones, statement cut to two lines (pair 06).
4. Sev 2 · H8/Miller: up to five quoted moments per finding made the report very long. → First two, "Show N more moments".
5. Sev 2 · H4: org toggles read "+ Kora Pay: doesn't see this" (state and action mixed). → "Kora Pay · Not shared" /
   "✓ Kora Pay · Shared" with the action in the accessible name (pair 04).
6. Sev 2 · H9: the unsafe-link banner explained but offered no way forward. → "Upload the file instead" in the banner (02).
7. Sev 2 · H8: the paused state said "40%" twice and "connection dropped" twice. → "Paused · 4 of 10 parts sent";
   banner says what happens next (03). Q's last line was stale after resuming → Q now posts "Back online…".
8. Sev 2 · Lede copy lower-cased proper nouns ("go in production", "postgres"). → Case-aware lists.
9. Sev 2 · Second "Add a video" button visible while a recording was mid-flow. → Hidden until the current one is done.
10. Sev 1 · 25 repeated underlined "Correct" links were noise. → Muted until hover/focus (44 px target kept).
11. Sev 1 · Duplicate "not judged on accent" lines on the communication finding; radio drawn as a checkbox; the
    candidate preview player was full width. → Removed, round radio, 640 px max.

## Before/after pairs (`captures/review/pairs/media/`)
- 01 Consent (desktop): alternatives always visible; will/won't flattened with ✓/✕.
- 02 Unsafe link (desktop): recovery button in the banner.
- 03 Paused at 40% (desktop): no duplicated numbers; what happens next.
- 04 Self-review (phone): clearer per-part sharing toggles; step indicator wraps by step.
- 05 Recruiter report (desktop, full page): review action up front, proper-noun lede, moments folded.
- 06 Recruiter report (phone, first screen): lede and statement shortened.

## Requirements prototyped (evidence = `qa/scripts/features/media.mjs` step names)
AD-F-01 upload/link/portfolio, interview recording only when offered · AD-F-02 consent before processing (orgs, purpose,
90-day expiry) · AD-F-03 unsafe link, fetch failed, pause/resume from the same part, transcribing · AD-F-04 transcript
correction (by Q and inline), key moments, job relevance per part · AD-F-05 private practice or named employers,
per-part sharing (public preview is stated as not available yet) · AD-F-06 stop sharing and delete with what Kora keeps
(D9) · AD-F-07 alternatives always offered · AD-F-08 one chosen video, no profiles, never signs in · AD-F-09 timestamped,
playable findings with uncertainty · AD-F-10 refusals and the page statement · AD-F-11 communication judged on content,
written alternative · AD-F-12 self-review before sharing, human review, dispute · AD-F-13 one transcription per hash,
cached report key, frame review only on demand (stated). Also AD-E-10 (index only with coverage), AD-B-03 (PageIndex).

## Remaining weaknesses (honest)
- Analysis is authored for one content hash; any other file gets the same transcript. No model watched anything.
- The candidate's "What Q told Kora" timecodes aren't playable (only the preview player is).
- The phone transcript is a nested scroll region (440–520 px); a per-part disclosure might be better. Untested with users.
- Public preview visibility (AD-F-05) is stated as unavailable, not built.
- Narrowing shared parts after a *reviewed* report keeps that report (its moments are filtered at read time).
