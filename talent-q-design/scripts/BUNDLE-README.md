# Talent Q: the complete product-definition package (read this first)

This archive holds the whole Talent Q product and design blueprint as of 30 October 2026. The exact repository commit is in `COMMIT.txt`. It is the deliverable before any production build begins.

Talent Q is evidence-first hiring with Q doing the work. Q is one conversational assistant on every page, for employers, agencies and candidates.

**Nothing here is a production system.** The prototype simulates everything that would touch the outside world, and says so on screen: email, calendars, messages, bookings, transcription, video, browsing, downloads, verification and payments. Scores are prototype arithmetic, not a validated test, and no usability testing with real people has been done. All people and companies are fictional.

## Start here

1. **Browse** `review-gallery/index.html` in a browser; it works offline. It has the master films by chapter (Film A, Hiring with Q, about 20 minutes; Film B, Careers with Q, about 13 minutes; desktop and phone), the J11 and J12 films, 139 before/after pairs, the motion clips, every screen on desktop and phone, and the prototype itself (`review-gallery/app/index.html`). Every film caption is a step the tests verified on that recording.
2. **Full-quality films** are in the separate download `Talent-Q-Films.zip`: `master/` (Films A and B with chapter markers, plus 112 short clips of interruptions and outcomes), `J12/` and `J11/`.
3. **Read** `ALL-SPECS.md`, every specification in one file, starting with the package index.

## What's in each folder

| Folder or file | What it is |
|---|---|
| `ALL-SPECS.md` | Every specification joined into one file, in reading order. Start here if you can read only one file. |
| `review-gallery/` | The visual review, offline, including the films by chapter. `app/index.html` inside it is the navigable prototype. |
| `founder-sources/` | The founder's documents: vision, the 183-screen atlas, the 57 motions, directives, addenda and the 30 October Consolidated Build Pack (`batch-6/`). |
| `product-definition/` | The working folder: prototype source, registers, handoff, journeys, tests and tools. Its own `PRODUCT-DEFINITION-PACKAGE.md` is the index. |

## Coverage

- **Screen concepts:** all 183 are represented, 82 as their own page and 101 as a state or section of one.
- **Motions:** all 57 run, each with a reduced-motion fallback.
- **Founder vision groups:** all 41 are covered; 39 are prototyped or integrated and one (graphified code understanding) is designed.
- **Tests:** twelve journeys (R1–R5, T1–T5, J11, J12), the privacy suite, the consolidation quality gates and 13 feature tests all pass on one build.

The details and the honest list of weaknesses are in `product-definition/PRODUCT-DEFINITION-PACKAGE.md` and the per-area design notes.

## After this package

`product-definition/handoff/PRODUCTION-VERTICAL-SLICE.md` sets out the first production slice: how Talent Q consumes Capital Q's shared runtime, the entities, the events, the migrations and the first ten tasks. It starts only once this blueprint is accepted.
