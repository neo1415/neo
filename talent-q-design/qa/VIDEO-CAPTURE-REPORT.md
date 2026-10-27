# Video capture report

Every film below is a screen recording of the running TypeScript prototype (`prototype/`, served by `vite preview`), driven by `qa/scripts/films.mjs`.

- **Frames:** DevTools screencast, kept at true speed, encoded with ffmpeg (H.264).
- **Overlay:** captions, title cards, the round pointer and the `Talent Q prototype · simulated data` watermark are added by the capture script. They are not product UI.
- **What is simulated:** every provider action shown (calendar consent, free/busy, event write, email send, speech) is simulated, and the UI labels it so.

Reproduce:

```bash
cd talent-q-design/prototype && npm run build && npx vite preview --port 4174 &
node ../qa/scripts/films.mjs ../captures/video          # all, or add F1,F3 to pick
```

| Film | File | Size / length | Journey shown | Status |
|---|---|---|---|---|
| 1 · Recruiter discovers and compares talent | `captures/video/F1-recruiter-discovers-and-compares.mp4` | 1920×1080 · 66 s | Request by text → intake questions → approval of mandate v1 → live sourcing with real step counts, a rate-limited source, offline and reconnect with cursor replay → shortlist → comparison → evidence inspector → missing evidence becomes an interview question | **Recorded** |
| 2 · Candidate onboarding | n/a | n/a | Needs SC-061–066 (welcome, CV ingestion, conversational onboarding, structured form, claims editor), which are not built | **Blocked**: next on the task list |
| 3 · Scheduling | `captures/video/F3-scheduling.mp4` | 1920×1080 · 81 s | Calendar consent scoped to busy times → remembered hours with source → busy-only read across Google and Outlook → interpretable slot reasons → recruiter approval → candidate sees own-zone times → a chosen slot becomes busy before booking (hard scenario C) and is reported honestly → recheck, write, provider acknowledgement → booked with simulated receipt → recruiter sees the same record and its full history | **Recorded** |
| 4 · J7 Career Intelligence | `captures/video/F4-j7-career-intelligence.mp4` | 1080×1920 (phone) · 71 s | Graduate route → gaps explained, not scored → private practice → adaptive follow-up → criterion feedback → explicit promotion to passport → career-switcher persona → six separate measures → 2 KB text plan | **Recorded** |
| 5 · Adaptive interview | `captures/video/F5-adaptive-interview.mp4` | 1920×1080 · 77 s | Vague answer → follow-up → switch to form without losing place → employer-required question → pause and resume → voice with captions (simulated speech) → back to typing → done, with human review stated | **Recorded** |
| 6 · Multi-agent work and artifacts | n/a | n/a | Sourcing steps and the comparison artifact exist (shown in film 1). The planner (SC-119), parallel agents (SC-131), budget approval and the handoff centre (SC-132) do not exist yet. Recording film 1 again under this title would overstate it. | **Blocked**: build SC-119/131/132 first |
| 7 · Memory correction | `captures/video/F7-memory-correction.mp4` | 1920×1080 · 66 s | Ask Q what it remembers → sources → correct the meeting window → mark a third-party salary claim "don’t use" → context pack shows it excluded, content hidden → next scheduling run uses 11:00 and cites the correction → candidate's private practice proven not shared | **Recorded** |
| 8 · Evidence portfolios | `captures/video/F8-evidence-portfolios.mp4` | 1920×1080 · 41 s | Passport with what each item shows and its limits → "what Kora Pay sees" view → share a credential → make a project private → employer's evidence inspector immediately reports the withdrawal | **Recorded** |

**Total:** 6 of 8 recorded, 2 blocked by unbuilt screens.

## Defects the recordings found, all fixed before the final takes

1. **Focus loss in dialogs.** `Sheet` re-ran its focus effect on every render, so typing in a dialog lost focus after each character. This affected every keyboard user. Fixed in `ui/kit.tsx`.
2. **Intent routing.** "What do you remember about my interview hours?" was routed to scheduling. Memory questions are now matched first.
3. **Stale provenance.** After a correction, Q still said "as you asked on 20 Oct". It now cites the correction and its date.
4. **Phone encode.** The 9:16 film was padded incorrectly, so the scale filter was changed.

## Not yet done

- Individual 8–20 s clips for each of the 57 motions (the atlas's `required_capture` column).
- Reduced-motion versions of the clips.
- Narration. The films are captioned only.
