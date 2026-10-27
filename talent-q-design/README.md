# Talent Q design workspace

The source-controlled design system and runnable prototype for **Talent Q**, built under `docs/sources/batch-1/00_CLAUDE_START_HERE_v2.md`.

## Run the prototype

```bash
cd talent-q-design/prototype
npm install
npm run dev        # builds tokens, then starts Vite
npm run build      # tokens → typecheck → production build
```

Open `#/` and choose the hiring side or the candidate side. Open both in two tabs to see them update each other.

All data is fictional. Provider actions (email, calendar, consent screens, speech) are **simulated and labelled**; nothing is sent or written.

| Priority | Screen | Route |
|---|---|---|
| 1 | Q home and composer | `#/r/home` |
| 2 | Organisation first run and policy studio | `#/r/setup` |
| 3 | Mandate intake (talk or form) | `#/r/mandate` |
| 4 | Sourcing progress (try the offline switch mid-run) | `#/r/sourcing` |
| 5 | Comparison and evidence inspector | `#/r/compare` |
| 6 | Outreach approval and delegation | `#/r/outreach` |
| 7 | Calendar connection, preferences, slots | `#/r/calendar` |
| 8 | Candidate slot picker | `#/c/slots` |
| 9 | Evidence Passport | `#/c/passport` |
| 10 | J7 career home and route | `#/c/career` |
| 11 | Adaptive interview (typing, form, voice) and private practice | `#/c/interview`, `#/c/interview?practice=c_sql_window` |
| 12 | What Q remembers: review and correction | `#/r/memory`, `#/c/memory` |
| | Component gallery | `#/gallery` |

## Map

- `PROGRESS.md`: where things stand and the next tasks. **Start here when resuming.**
- `COVERAGE-SUMMARY.md`, `screens/SCREEN-COVERAGE.csv`, `motion/MOTION-COVERAGE.csv`, `research/VISION-COVERAGE.csv`: generated from `registry/status.json` by `scripts/build-registers.mjs`.
- `research/SOURCE-AND-VISION-COVERAGE.md`: source manifest, conflicts, vision register.
- `research/Q-REUSE-AUDIT.md`: read-only audit of `neo1415/q`.
- `decisions/EXPERIENCE-DECISIONS.md`: chosen direction and why.
- `DESIGN-SKILL-AUDIT.md`: which design skills and tools were really used.
- `tokens/`: `tokens.json` (reference and semantic tiers) and `build.mjs` (CSS plus contrast gate).
- `contracts/`: typed run events, actions, memory, scheduling, talent/J7 and artifacts.
- `components/COMPONENTS.md`, `motion/STATE-MACHINES.md`, `artifacts/ARTIFACT-CONTRACTS.md`.
- `qa/`: report and reproducible scripts. `captures/`: screenshots and videos.
- Design directions canvas: https://claude.ai/artifact/MmkpWffDt1d8FhAR9kTFZc (private until shared from its Share menu).
