# Direction review: three directions, the same three experiences

Status: **awaiting the founder's choice.** Nocturne (D1) is withdrawn. Nothing will be built in a direction until one is chosen.

Live prototypes run in the same React app as the working product (`#/x`):
- A: `#/x/a/home`, `#/x/a/compare`, `#/x/a/career`
- B: `#/x/b/…`
- C: `#/x/c/…`

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
