# Design pass · talent-a (T1 Amaka, T2 Chidi)

Routes: `/c/welcome`, `/c/career` (J7: atlas/list, skills, role, plan, progress, record, openings, return),
`/c/growth`, and the Q cards `ta.matches`, `ta.cv`, `ta.assess`. After captures: `captures/review/after/
{desktop,phone}/p_amaka_c_welcome.png`, `p_chidi_c_career.png`, `p_chidi_c_growth.png`; journey states in
`captures/cx/T1`, `captures/cx/T2` (T1 76/76, T2 62/62 PASS, desktop and phone).

## Defects found (most severe first)
1. No view answered "where am I, what's between me and the goal, what counts". The radial atlas showed
   distance to every role but not the route to *your* goal; proof vs practice appeared only in a 6-item key.
2. Progress put practice dots on the same level axis as assessed work, so practice looked like a score.
3. Readiness: six equal tiles; mastery listed every attempt ("level 2 · level 3"); role-fit value overflowed;
   competencies duplicated the checklist; no sense of how far along the checklist you are.
4. Profile: answered sections used the evidence "not shown yet" circle, so a finished profile looked empty.
5. Kickers crammed status ("CHIDI · GOAL · 1 OF 9 SHOWN · PRIVATE"); 8 tabs (list duplicated the atlas).
6. Phone atlas: two "None in this band" rows before any content; family chips scrolled sideways.
7. Atlas: dashed rings (dataviz anti-pattern), ring numbers sat under nodes, goal used gold (Q's colour).
8. Plan: nothing said which steps can produce proof; text-only progress; record ladder took a full screen.

## Skills → screens → changes
- **dataviz** (atlas, route, progress, readiness, plan, record). Form first: the route is a single ordered
  series (`journeys/career/Route.tsx`): You → each goal competency (proof first, solid ink line) → Goal,
  dotted where nothing counts yet; strength by glyph shape, never shade, and every state written in words.
  Radial atlas: solid hairline rings, ring scale on a free diagonal with halo, dotted route line to the goal,
  "within 2" as a one-hue wash, legend replaced by a three-part scale sentence. Progress (`Trend`): proof and
  practice never share a scale (practice in its own lane), real time on x, width measured not scaled,
  hover/focus tooltip, table twin, designed empty state for competencies with no line. Readiness: route +
  segmented checklist meter + measures as a definition list, each tagged "Built from proof" / "Private ·
  doesn't count" / "Advice only"; mastery shows latest level "(was 2)". Plan: segmented meter (done ink,
  late hatched + text). Record: four-step ladder with the proof boundary drawn, entries tagged Counts /
  Doesn't count.
- **design-critique** (all pages). H4 fix for profile marks (own check/dash/dotted marks, not evidence
  glyphs); Hick's law: list moved under Atlas as a Map/List toggle (7 tabs); kickers are one line, privacy
  became a tag; role sheet grouped "Still to show" / "Shown with proof"; skills table → two grouped lists
  ("Needed for …", "Also yours") that work at 390 px.
- **interaction-design / motion** (MO-048/050/051, `ds/motion.ts`). Route glyphs re-key on state change and
  scale in (DUR.normal, EASE.enter); evidence expand enter 200 ms / exit 100 ms; plan rows and bands
  re-layout at DUR.slow; atlas nodes 400 ms (was 500); view switches use `arrive`. Nothing blocks input.
- **ux-writing**. "Gaps" → "to show"; "Done" → "Mark done"; "Practise one (private)"; proof wording is
  consistent everywhere ("Counts as proof", "Doesn't count yet"); claims truncated at word boundaries.
- **creative** (Direction D, L2: within tokens). Theme: *candid, encouraging companion*. Personal headlines
  ("Chidi, 4 things stand between you and …", "1 of 4 shown with proof, Chidi. 3 to go.", "6 of 6 done. Nice
  work."); honesty kept (no promises; "Employers still decide"). Gold removed from goal/selection on paper
  (gold stays Q's); the Q assessment card gets level pips and a "Counts as proof" chip.
- **design-elevation**: one spacing rhythm, pills for state, ink for proof, dashed for not-yet.

## Pairs (`captures/review/pairs/talent-a/`)
- 01 Atlas (desktop): route to the goal and proof key above the map; rings and goal line clarified.
- 02 Progress (desktop, after reassessment): practice moved to its own lane; tally of what counts.
- 03 Readiness (desktop): route, checklist meter, measures tagged by what they're built from.
- 04 Atlas (phone, full page): vertical route, empty bands collapsed, chips wrap, goal marked without gold.
- 05 Profile built (desktop): answered sections show a check, with a 6-section meter.
- 06 Plan (desktop): proof-producing steps marked; segmented progress.

## Remaining weaknesses
- Phone header: the demo clock and privacy tag take two lines above the tabs; the shared `ds-views` tab
  strip still scrolls sideways inside itself on phones (shared component; a wrap or overflow menu belongs
  in `src/ds/Workspace.tsx`).
- Radial atlas labels still crowd at the 48-occupation scale for Amaka's data family; the List twin is the
  fallback. The route repeats on Atlas and Readiness by design, which costs phone height.
- Readiness "Next" marks the first unchecked item but has no per-item action; Q does it from the button.
- No new on/off settings in this area, so `SwitchRow` was not needed; method cards stay `ds-opt` (choice).
