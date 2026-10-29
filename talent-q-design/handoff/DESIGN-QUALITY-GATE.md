# Design quality gate

From now on, no journey moves from "it works" straight to recording. Each journey, and each new screen within one, passes these checkpoints in order. Keep it light: the output is better screens, not paperwork.

| # | Checkpoint | What happens | Proof it happened |
|---|---|---|---|
| 1 | Design research and skills, **before** building | Load the relevant skills and apply them to the brief: `design-critique`, `design-elevation`, `interaction-design`, `ux-writing`, plus `dataviz` for any chart or ledger and `design-superpowers:creative` for the candidate surfaces | One line per skill in the journey's design note: which screens it shaped |
| 2 | Visual implementation | Build with `src/ds` components and the execution rules in `design-system/DIRECTION-D-SYSTEM.md`. Fix shared problems in the shared component, not on one page | — |
| 3 | Browser rendering | `qa/scripts/review/capture-all.mjs` captures every page in the journey at desktop 1440 and phone 390, plus its key states | `captures/review/after/` |
| 4 | Visual critique | Look at every capture against the critique checklist (hierarchy, density, excise, labels, copy, touch, states, motion) and write down the defects | Defect list in the journey's design note |
| 5 | Corrections | Fix the defects, then recapture. Repeat until you would show it to a design lead | Before/after pairs for the worst problems |
| 6 | Interaction and accessibility | Run `qa/scripts/review/axe-all.mjs` and `keyboard.mjs`, plus the journey's own script, which protects behaviour. Run `privacy.mjs` if the journey touches candidate data | Script output |
| 7 | Reviewed prototype | The founder reviews the screens in the gallery (`/gallery/review`, published) | Founder sign-off |
| 8 | Final recording | `qa/scripts/films/record-all.sh` then `assemble.mjs` | Films with the commit stamped on every frame |

Automated tests protect behaviour. They are not design validation, and a passing test suite never substitutes for checkpoints 3–5.
