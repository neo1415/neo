# Design pass · talent-c (T4 Grace, phone-first, low bandwidth)

Routes: `/c/start`, `/c/interview` (practice, real, J7), the home first-steps card. Files: `journeys/talent-c/*`,
`styles/talent-c.css`, `routes/talent-c.tsx`, `q/skills/talent-c.ts`. T4.mjs 43/43, interview-followup.mjs 7/7.

## Defects found (most severe first)
1. Interview, phone: only the question fitted above the fold; switch, privacy box, a duplicated "Question 1 of 4"
   heading and two full-width pills pushed the answer box off-screen. No visible progress.
2. "Skip this follow-up" was a 13 px link (under 44 px), buried in small text; the follow-up gave no context.
3. Kicker carried status ("Practice · only you see this", "… · real interview").
4. Lost-connection and pause states were plain text with no orientation; reconnecting gave no page feedback.
5. Review read as an unstructured list; the receipt was one line (weak ending, peak-end rule).
6. Upload failure was signalled by a red dashed segment only; the decorative picture stayed during upload.
7. Motion: the question fade used `AnimatePresence mode="wait"` (new text waited for the exit), ad hoc 0.3 s timing;
   lite still faded (MotionConfig "always" removes movement, not opacity).
8. Copy: long first-steps lead; demo controls looked like product buttons; "welcome back" fired on an untouched step 1.

## Skills → screens → changes
- **design-critique** (all screens): heuristic pass gave the list above. Visibility of status (H1): progress meter,
  upload tags, saved notes. Recognition over recall (H6): the follow-up quotes the first answer. Fitts: tools
  side by side at 48 px, Skip as a 44 px button. Minimalism (H8): practice privacy said once (header tag)
  mid-question; room switch only before starting and after finishing; "what they'll see" collapses mid-question.
- **design-elevation** (`/c/interview`, `/c/start`): one focal question per screen (serif 23–30 px, gold rule),
  one elevation level (follow-up, review answers, receipt and progress are flat bordered panels inside the sheet),
  icon + word tags (Real interview, Private practice, Sending/Paused/Stopped/Sent), numbered stepper with filled
  current and green done states, receipt as a 2×2 data grid.
- **interaction-design** (all states): state machine kept, each state now designed: intro → question →
  follow-up → paused/offline → reconnected → review → confirm → receipt; practice → done. "Say it again" shows
  "Reading it out…" while TTS plays (releases on end or timeout). Answer saved feedback ("Answer 2 saved.").
  Pause/offline never hide the answer; Save explains why it's disabled. Undo-free send keeps an inline two-step
  confirm. Peak-end: "Well done, Grace" + tips, and a receipt with "What happens next".
- **ux-writing** (all copy, Q notices): shorter lead ("You can also just tell Q."), offline banner cut to two
  sentences, follow-up explains why and that the first answer still counts, buttons stay verb-first
  ("Save answer and go on", "Skip this follow-up"), "Demo controls · for reviewers, not part of the app",
  failure notice "(a simulated server error)". Per-action labels kept: "Simulated send", "Sent (simulated)".
- **dataviz** (upload bar, interview meter, home card): segmented part meter = acknowledged parts (never a timer),
  status never colour-only (tag word + icon + sentence), next part outlined/dashed, done turns green; question
  meter 6 px segments (done ink / now gold), text carries the meaning, meter `aria-hidden`.
- **creative** (L2, within Direction D): warmth through Grace's name, ticks, the green "done" mark and gentle
  copy; no new palette or type. Gold stays Q's (current question, tip label).

## Motion (tokens from `src/ds/motion.ts`; none gates an action)
- MO-019 question arrives (rise 6 px, DUR.slow, keyed; no exit wait). MO-020 simpler words cross-fade
  (DUR.normal); "say it again" gold wash 450 ms, decorative. MO-021 "Answer N saved" arrives (`arrive`), clears in
  3.5 s. MO-022 meter segments colour-transition 200 ms. MO-024 pause / MO-006 offline banners use `arrive`;
  MO-007 "Connected again" note for 4 s. MO-016 upload part fills in 180 ms; the part in flight breathes.
  MO-002 listening: Q mark in listening mood + slow ring on the mic. MO-025/028 done mark scales in once.
- Lite: `useStill()` renders every motion element in its final state, CSS kills all transitions/animations,
  icons and pictures hidden, 56 px targets. Reduced motion handled globally plus CSS fallbacks for keyframes.

## Pairs (`captures/review/pairs/talent-c/`, T4 states, same viewport)
- 01 Practice question, phone (lite): progress, tools side by side, privacy once; answer box now reachable.
- 02 Lost connection mid-interview, phone: oriented banner, kept answer, "Saved on this phone" with tick.
- 03 Upload stopped at 60%, phone: "Stopped" tag + icon, picture removed during upload, file row with size.
- 04 Real review, phone: each answer a panel with question, input method tag; cleaner send/change pair.
- 05 Receipt, desktop: receipt grid, what happens next, "See what you sent"; tag in the header, not kicker.
- 06 First steps, desktop: stepper states, shorter lead, quiet demo controls.
After captures: `captures/review/after/{desktop,phone}/p_grace_c_{start,interview}.png` plus 25 states each
(`p_grace_c_start__*`, `p_grace_c_interview__*`, `p_tobi_c_interview__followup`).

## Remaining weaknesses
- Phone: "Your answer" still starts below the fold on long questions; a sticky answer bar would fix it.
- Practice tips (`tipsFor`) are rule-based and repetitive across questions.
- The real interview's switch to practice is only available before starting and after finishing (by design);
  mid-interview it is reachable by asking Q.
- Shared shell (not mine): on phones the global offline banner (`ds/AppShell.tsx`) uses a 3-column grid that
  squeezes its text into a ~12-character column; it should stack (`grid-template-columns: auto 1fr` and the
  Reconnect button on its own row under 480 px). It also duplicates my page-level offline message.
- `motion/MOTION-COVERAGE.csv` (not mine) still lists MO-021, MO-022, MO-024, MO-025 as RESEARCHED; they are now
  prototyped in `journeys/talent-c/InterviewRoom.tsx`, and MO-002 is now driven by the mic on `/c/interview`.
