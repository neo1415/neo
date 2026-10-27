# Direction review: four directions, the same three experiences

Status: **awaiting the founder's final choice among A, B, C and D.** Nocturne (D1) is withdrawn. Nothing beyond these explorations will be built until one is chosen.

The founder did not approve A, B or C unchanged and asked for a fourth direction, D, that unifies their strengths. D is reviewed in its own section at the end. The A, B and C sections below are unchanged.

Live prototypes run in the same React app as the working product (`#/x`):
- A: `#/x/a/home`, `#/x/a/compare`, `#/x/a/career`
- B: `#/x/b/…`
- C: `#/x/c/…`
- D: `#/x/d/home`, `#/x/d/compare`, `#/x/d/career`

All three run the same scenario (`src/directions/shared/scenario.ts`): the same people, the same evidence, the same run steps, the same coaching question. So the differences come from design, not content.

Evidence:
- Screenshots: `captures/directions/screens/`, at 1440 and 390, idle and after interaction.
- Motion previews: `captures/directions/{a,b,c}-{desktop,phone}.mp4`. Captions sit in a band below the UI.
- axe-core: 0 violations on all 18 direction screens (`qa/scripts/axe-directions.mjs`).

## What makes them different

| | A · Atelier | B · Constellation | C · Studio |
|---|---|---|---|
| Theme statement | lucid, annotated, atelier | luminous, spatial, observatory | bold, warm, studio |
| Style family (`creative` skill library) | Swiss / editorial grid, annotated infographic | Spatial, single light source (chiaroscuro), node-link | Bento modularity, kinetic stage |
| Composition | Editorial spread: conversation in the margin, artifact as a feature page | Open dark field: Q on the left, a spatial artifact on the right | Bento stage: one large focus tile and supporting modules |
| Type | Fraunces (optical serif) + Inter Tight + Plex Mono | Space Grotesk (light) + JetBrains Mono | Bricolage Grotesque (heavy, condensed) + Manrope |
| Navigation | Magazine contents line, 01 / 02 / 03 | Command dock (in the header on desktop, floating on phones) + ⌘K console | Rounded rail on desktop, tab bar on phones |
| Q identity | A gold ink "Q" that draws itself; the drawn length is real progress | A gold core whose satellites are the live agents, each travelling as its step count advances | A large flat gold disc whose rings are the agents, and which morphs into the artifact it made |
| Evidence encoding | Harvey balls (shape) | Line style between person and requirement | Bar length plus an icon |
| J7 metaphor | Career atlas: a drawn route, "what the role is made of", annotated small multiples | Skill sky: skills as stars linked to role constellations | "Next stop": bold progress modules, swipeable next moves, a chat coach |
| Motion | Line drawing, no overshoot | Orbit and connect, no overshoot | Springs and shared-layout morphs |
| Density | Airy | Medium | One focus at a time |

Two decisions are shared by all three:
- **No direction encodes evidence by gold shade.** The dataviz validator measured adjacent gold steps at about 9 ΔE, below the 15 normal-vision floor. Shape, line style or length carries strength instead.
- **No direction shows an overall talent score.** Measures stay separate everywhere.

## Critique method

The method comes from the `design-skills:design-critique` skill:
1. Context.
2. A five-second scan.
3. Nielsen heuristics (H1–H10), each with a severity.
4. UX laws.
5. Product posture.
6. A score from 1 to 5 on the ten criteria the founder named.

**Context.** Recruiters such as Ada use this daily for long sessions (sovereign posture). Many are not technical, so the evidence must speak plainly. Candidates such as Amaka use J7 in shorter sessions, often on a phone and sometimes on poor connections.

## Scores (1–5), with the evidence behind each

| Criterion | A | B | C | Evidence |
|---|---|---|---|---|
| Visual hierarchy | 5 | 4 | 5 | A: the serif verdict leads, and the ledger rows read left to right. C: Von Restorff, since the one verdict tile is gold. B: the hierarchy is clear, but the dark field has two equal focal points: Q and the map. |
| Comprehension (5-second scan) | 5 | 3 | 4 | A's ledger with Q's margin notes answers "who has what" with no learning. B's thread map needs its legend to decode line styles (H6, recognition over recall), and node-link layouts are unfamiliar (Jakob's law). C's 3/3 numerals answer instantly but risk reading as a score. |
| Interaction quality | 3 | 4 | 5 | C: the face-off answers the recruiter's actual question ("who is ahead where"), and the Q→artifact morph is a clear peak (peak-end rule). B: focusing a node relights its threads, and selecting a requirement compares everyone on it. A: interactions are correct but subtle, and focusing a person changes little on screen. |
| Typography | 5 | 4 | 4 | A: Fraunces at display size with a measured sans body is the most refined. B: light Space Grotesk on dark is elegant but thin at body sizes. C: Bricolage is distinctive, but heavy display type in every tile reduces contrast between levels. |
| Creative quality | 4 | 5 | 4 | B is the most original product image: a Q you can watch working and evidence you can see connect. A and C are crafted but closer to known references (editorial magazines; bento product sites). |
| Mobile usability | 4 | 4 | 5 | C is mobile-native: thumb-reach tab bar, swipe cards, a stacked face-off. A collapses well (vertical route, one ledger per person). B's maps compress into small spaces, so its list and table fallbacks carry more of the load on phones. |
| Coherence | 5 | 4 | 4 | A's single typographic voice holds across all three experiences. B's graphs share one grammar of lines and nodes. C's modules risk drifting into a dashboard of cards as screens multiply (the founder's core complaint about Nocturne). |
| Motion | 3 | 5 | 4 | B's motion is information: satellites move only when counts change, and threads draw as evidence arrives. C's morph and springs are expressive. A uses line drawing well but has the least motion. |
| Accessibility | 4 | 4 | 4 | All are at 0 axe violations, with shape or length encodings, text alternatives (B ships table and list views) and reduced-motion handling. Not verified: manual keyboard and screen-reader passes. Risk points: A's long italic serif passages, B's thin type on dark, C's chip and legend labels. |
| Product differentiation | 3 | 5 | 4 | B looks unlike any HR product. C looks like a premium consumer app, distinct from enterprise HR. A could be mistaken for a high-end publication. |
| **Total (50)** | **41** | **42** | **43** | The totals are within two points. **They are not a recommendation.** The trade-offs below matter more than the sum. |

## Strongest risk of each

- **A · Atelier: "beautiful but quiet."** Q is present but restrained. It is the least "Jarvis" and the least kinetic, and on screen it can read as reading rather than doing.
  - Severity 2 (H1): progress is legible but understated.
  - Mitigation if chosen: give the ink a stronger working state and add an artifact-assembly motion.
- **B · Constellation: "learnability and scale."** Node-link maps are unfamiliar to many recruiters, and the thread map becomes a hairball beyond about 5 people × 5 requirements.
  - Severity 3: affects the main comparison task at scale.
  - Mitigation if chosen: cap the map at a focused shortlist, keep the table one tap away (already built), and default non-technical users to the list view.
- **C · Studio: "regresses to cards."** Bento is the easiest system to over-apply; 128 more screens of tiles would recreate the dashboard feel. The large "3/3" numerals edge towards the forbidden single score.
  - Severity 2.
  - Mitigation if chosen: enforce "one focus tile per screen", and make coverage numerals smaller than the verdict.

## Hybrids are possible, but you choose

Strong pairings exist, for example C's interaction model and phone ergonomics with B's Q (orbit) and agent motion. I am not choosing for you. Pick one direction, or name the pieces to combine. Once you choose, the chosen system is applied to the existing working prototype, keeping its state, scheduling, memory and evidence logic.


---

# Direction D · The Living Intelligence Workspace

Code: `src/directions/d/` (`kit.tsx` shell, Q mark and evidence glyphs; `Recruit.tsx`; `Career.tsx`; `data.ts`; `d.css` tokens). It uses the same scenario data as A, B and C, extended with a 24-profile pool, six screened people, interview availability and a 14-occupation atlas (48 in the scale demo, of which 34 are marked illustrative).

## One system, not a collage

D is one material system with two surfaces. Each surface has one job.

| Layer | Decision | Taken from | Changed to fit |
|---|---|---|---|
| Surfaces | **Ink thread** (left on desktop; the whole screen on phones) is where Q thinks, speaks and shows its agents. **Paper canvas** is where evidence is read. | B's dark field, A's paper | The dark field is narrowed to the conversation, so evidence is always read on paper at high contrast. |
| Type | Fraunces for Q's voice, verdicts and headlines · Inter Tight for UI and body · IBM Plex Mono for data and labels. Major-third scale (12 to 46) with at least 1.5× between hierarchy levels. | A | A's long italic passages are cut: italic is kept only for Q's margin notes. |
| Colour | Neutrals for 90%. **Gold means Q and Q's work only** (its mark, its proposals, the primary next step). Green appears once, for "verified at source". | One-accent rule (`design-elevation`) | B's luminous palette and C's warm surfaces are dropped. |
| Q identity | An open bowl and tail, an abstract Q, with each live agent as a point on the bowl. A point advances only when its agent finishes a unit of work. Still when idle. A text status sits beside it ("Working · 3 agents", "Waiting for you"). | B's orbit | Shrunk to a mark in the thread header. No idle breathing or glow loop. One peak moment: the core settles when the invitations are sent or the work sample is assessed. |
| Evidence vocabulary | One set of glyphs for hiring and careers: ring+disc verified, disc evidenced, half partial, ring not shown, dashed unclear, dotted practising. In the map view, strength is line style. | A's Harvey balls, B's line styles | Strength is never encoded by shade (dataviz validator: gold steps ≈ 9 ΔE). |
| Interaction | Chips for the next step, free text that routes to the same steps, progressive disclosure (cells open their evidence in place), dark primary buttons for commits, simulated labels on every external effect. | C | C's bento tiles are not used: one artifact, one view at a time. |
| Phones | The thread is home. An artifact opens as a full-height sheet with a slim ink bar holding Q's latest line and the way back. The calendar becomes an agenda. The atlas gets a "nearest five" list. | C | Q's line on the sheet keeps the conversation present while the artifact is open. |

## What "Q builds the interface" means here

Each step of the work picks the view that answers the question asked, and states why in the thread ("Shown as a ledger: requirements in rows, so gaps line up"):

1. **Find** → a sieve (24 → 14 → 6 → 3). Dots move to their stage as profiles are actually screened. Every profile set aside has a reason. Above 60 profiles the sieve switches to counts ("What if the pool were 240?").
2. **Examine evidence** → cards grouped by person, each resolving from "Checking…" to verified, self-reported or outdated, with what the evidence shows and its limits.
3. **Compare** → a ledger (requirements fixed as rows, people as columns, Q's margin notes), plus Map (relationships) and Pair (two people, the difference named) over the same data. Adding three people grows the columns, and Q rewrites its notes for six.
4. **Arrange interviews** → the recruiter's week with busy blocks, their remembered rules and Q's proposed times. Approve one or all. Sent is labelled simulated.

The artifact is versioned (v1 Pool … v4 Interviews). Every earlier view stays one tap away and nothing resets. The conversation is one continuous thread.

**Simulated:** in the prototype the view choice is a mapping from step to view. In production this needs a contract in which Q returns an artifact with typed views and a stated reason. That is a requirement on Q, not something already built.

## J7: the atlas, and practice that is not proof

- **Atlas:** occupations grouped by family into sectors, with distance from "you" equal to the number of competencies not yet shown. A "within 2 gaps" filter fades the rest. At 48 occupations, each family collapses to one point at its nearest role and opens on demand. Labels are placed by a collision-aware pass; names that don't fit appear on hover or focus, and the List view has every name.
- **Role sheet:** each competency has its glyph, and its evidence opens to show "Proves" and "Does not prove". Demand ("7 of the 10 listings you saved") is labelled illustrative.
- **Practice:** a right answer is logged as a *practice attempt*: private, and explicitly not proof. SQL changes to "Practising" and **the map does not move**.
- **Work sample → rubric review (simulated reviewer):** 3 of 4 criteria met, level 2 of 4. Only then does SQL count as evidenced. Eight occupations move one ring closer, each leaving a trail from where it was.
- **Development record:** a four-step ladder (practice attempt · work sample submitted · assessed by rubric and reviewer · verified credential). It says what each step counts for. Each entry shows its class, its justification and what it does not prove.

## Review (design-critique method, as for A, B and C)

Defects found by viewing the renders, and fixed before presenting:

| # | Found | Fix |
|---|---|---|
| D1 | The atlas had overlapping labels (Supply Planner over Operations Analyst; an open family unreadable). | Collision-aware label placement with priorities (goal, selected, nearest); hidden names on hover or focus; a wider sector for an open family. |
| D2 | The "moved" trails showed solid, not dashed: Motion's `pathLength` overrides the dash pattern. | Trails fade in instead and keep their dash; the old position is marked. |
| D3 | The ledger notes were wrong for six people ("Only Ifeoma has shown on-call", but Dayo's is verified). | A separate note set for six people. |
| D4 | The "why this view" chip had a square icon that read as an unchecked checkbox. | A gold diamond (Q's colour). |
| D5 | The map's 3/3 labels overflowed their node circles. The map legend used glyphs while the map uses line styles. | Larger nodes; a line-style key. |
| D6 | The calendar's "No calls before 10" label was hidden under Monday's stand-up. | A calendar key above the grid. |
| D7 | Phone: the "Back to Q" button overlapped the kicker; view tabs wrapped; the four sieve columns were too narrow; family labels were clipped. | An ink sheet bar with Q's latest line; scrolling tabs; the sieve as rows; clamped labels; a "nearest five" list. |
| D8 | Phone: the pair view's three columns squeezed the notes. | The requirement above, the two people below. |
| D9 | axe: role=dialog on `main`; no main landmark or h1 on phones. | On phones the thread is `main` with an h1; the sheet is a `section` dialog. |

### Scores (1–5)

These are my scores of my own work, made with the same rubric as A, B and C. Treat them as a claim to check against the renders and films, not as an independent judgement.

| Criterion | D | Evidence |
|---|---|---|
| Visual hierarchy | 5 | The serif finding headline leads each view. The ink/paper split separates "Q is talking" from "evidence to read" before any reading happens. |
| Comprehension | 5 | Each view's title states its finding ("Only one heavy line reaches payments systems."). The default comparison is the ledger, not the map. |
| Interaction quality | 5 | One continuous conversation; views switch without resetting; versions; evidence opens in place; one-tap approvals. |
| Typography | 5 | A's system, trimmed of long italic passages. |
| Creative quality | 4 | The bowl-and-agents mark and the two-material split are distinctive. They are less spectacular than B's full spatial field, on purpose. |
| Mobile usability | 4 | Thread-first, a sheet with Q's line, agenda, list fallbacks. The atlas is small on a phone; labels are thinned and the nearest-five list carries it. |
| Coherence | 5 | One glyph vocabulary and one shell across hiring and J7. |
| Motion | 4 | Every motion is caused by an event: agents finishing, cards resolving, columns growing, roles moving. There are fewer signature moments than B or C. |
| Accessibility | 4 | axe-core: 0 violations in 22 scans of D's key states, desktop and phone (`qa/scripts/axe-direction-d.mjs`). Shape and line-style encodings, table and list alternatives. The manual keyboard and screen-reader pass is still open. |
| Product differentiation | 4 | Unlike HR dashboards; closer to a premium research tool than to B's observatory. |
| **Total (50)** | **45** | Self-assessed; see the note above. |

## What D improves over A, B and C

- **Over A:** Q visibly works (agents on the mark, live counts, cards resolving), so A's "beautiful but quiet" risk is addressed. Interactions change the canvas meaningfully.
- **Over B:** relationship views are an option over the same data, not the only view. The default is a ledger, so B's learnability and scale risks are handled. The map remains for "how do they connect".
- **Over C:** one artifact with views replaces a grid of tiles, so there is no drift back towards cards. Coverage counts are small, so they cannot read as a single score.
- **New in D:** a versioned artifact and a continuous conversation. View choice is stated by Q. Scale modes are built in (sieve to counts, 3 to 6 people, 14 to 48 occupations). J7 separates practice from proof and keeps a justified record.

## Trade-offs that remain

1. **The view choice is scripted.** Production needs Q to return typed artifact views with a reason; this is a contract to add to Q.
2. **The ink column is heavy on desktop.** It is 400px of dark beside paper. That suits a long recruiting session; a collapsible thread may be needed for wide-artifact work.
3. **Restraint costs spectacle.** The Q mark is small and still when idle. If the founder wants Q to feel more "Jarvis", the mark can grow, but the rule that it moves only for real work should stay.
4. **Phones get the weakest atlas.** On a phone the atlas is a glance; the list does the work.
5. **Scale has limits.** The ledger is designed for up to about 8 people before horizontal scroll dominates; beyond that it needs grouping (not built). The map is readable to about 6.
6. **Not validated with people.** No usability test has been run. The manual keyboard and screen-reader pass is outstanding.
7. **Two experiences share one shell.** Candidates and recruiters get the same ink/paper workspace. A lighter candidate home may still be wanted in the 183-screen rollout.

Evidence: `captures/directions/screens/d-*` (desktop and phone), `captures/directions/d-{hiring,career}-{desktop,phone}.mp4`.
