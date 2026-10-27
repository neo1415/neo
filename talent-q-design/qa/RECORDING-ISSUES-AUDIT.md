# Founder-reported problems, audited against the current prototype

The problems come from the founder's review of films F1, F3 and F4 (27 Oct).

| # | Problem reported | Confirmed in the current prototype? | Root cause | Status |
|---|---|---|---|---|
| 1 | Mobile navigation overcrowded and partly clipped | **Yes.** At 390px the Nocturne top bar holds 7 recruiter links in a horizontally scrolling row; "Calendar" and later items are cut off at the edge (`captures/screens/m-p01-home.webp`). | Desktop information architecture squeezed onto a phone: 7 destinations exceeds Hick's comfortable range, and it isn't a phone pattern. | **Fixed in all three directions**: 3 destinations; a contents line (A), a floating dock (B) or a bottom tab bar (C). Applies to the product once a direction is chosen. |
| 2 | Film captions cover interface content and actions | **Yes.** `qa/scripts/films.mjs` drew captions as a pill over the bottom of the viewport. | Overlay inside the page. | **Fixed in the capture pipeline**: `qa/scripts/direction-films.mjs` typesets captions with libass in a separate band below the interface, so they cannot overlap. F1–F8 will be re-recorded with it after the direction choice. |
| 3 | Q presence underdeveloped | **Yes.** Nocturne Q is a 56px disc with a ring, and it reads as an icon. | Q designed as a status indicator, not a presence. | **Addressed in each direction**: an ink hand whose drawn length is real progress (A); an orbit with one satellite per live agent (B); a large disc whose rings are agents and which becomes the artifact (C). |
| 4 | Too much text without enough visual hierarchy | **Yes.** Nocturne J7 shows six measures as six text cards, gaps as paragraphs, and the route as a row of text boxes. | Content written first and laid out second; no visual encodings. | **Addressed**: every direction encodes evidence graphically (shape, line or length), shows progress as charts (small multiples, rings, bars), and leads with one verdict line. |
| 5 | The recruiter comparison could present evidence more elegantly | **Yes.** Nocturne's table repeats "Evidenced / Not evidenced yet" text in every cell. | Table as the default for everything. | **Addressed**: an annotated ledger with Q's margin notes (A); an evidence-thread map with requirement-centred comparison (B); a face-off with who's ahead where (C). |
| 6 | J7 lacks progression, skill relationships, achievement, personalised development and the sense of a coach | **Yes.** Nocturne J7 is a list page plus a separate interview form. | J7 treated as a page of facts, not a place. | **Addressed**: each direction shows a route; a skill-to-role relationship view (atlas, sky or chips); measurable change from one practice (coverage 6 → 7, and a new skill on the progress chart); a next-move recommendation; and an in-page coach. |

## Still open

- The 12 working Nocturne screens keep their current look until a direction is chosen. Then the chosen system is applied to them, keeping their state machines and contracts.
- The F1–F8 films will be re-recorded with the band-caption pipeline in the chosen direction, plus the two missing films (onboarding, multi-agent planner).
