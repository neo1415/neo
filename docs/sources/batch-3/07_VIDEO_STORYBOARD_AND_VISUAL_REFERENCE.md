# Talent Q | Film reference analysis and production shot lists

**Reference:** user-supplied `talentq-film.mp4`; duration 4m33s; landscape 1920×1080. Observations below come from sampled frames and story continuity, not from reverse engineering its source.

## Reference film: observed structure

| Approx. film segment | Visual idea | Talent Q interpretation |
|---|---|---|
| 0:00–0:15 | Gold point appears in darkness; editorial recruitment problem headline; Talent Q named | Premium Q signature intro; don't put this cinematic delay into functional app load |
| 0:15–0:40 | Web landing: Q orb and 'Hire by talking' dialogue start | Product landing and frictionless first conversational command |
| 0:40–1:10 | Q asks about location, role and needs, then constructs search brief | Adaptive intake; concise question rather than generic long questionnaire |
| 1:10–1:40 | Search starts; refined criteria and first evidence/results appear | Run accepted and source-backed progress; partial results as available |
| 1:40–2:10 | Mobile app enters; candidate-facing journey revealed | One platform, two sides; consistent state and Q identity |
| 2:10–2:45 | Employer proof/research view and candidate-facing panel | Shared professional evidence with different permissions |
| 2:45–3:25 | Candidate preferences and consent/choice-style flows | Candidate agency, private preferences and explicit sharing |
| 3:25–4:10 | Split device compositions and interview invitation | Explicit employer/candidate state transitions and matching explanation |
| 4:10–4:33 | Final soft ending/CTA with gold presence | Emphasize product outcome, not technical jargon |

## Design language inferred and recommended

- **Colors:** near-black/charcoal, off-white text, restrained warm gold accent; avoid washed-out gold body text.
- **Composition:** large central single thought; extraordinary negative space; typography hierarchy; tiny smooth glows only around Q's presence.
- **Behavior:** narration and UI transitions feel conversational, not like dashboards filling for spectacle. Q orb persists as a locus, but never obscures usable content.
- **Improve for real accessibility:** reference film captions/controls are tiny; production controls and copy must be 16px by default where feasible, focus visible and reduced motion provided.

## Six prototype-film production outlines

### FILM-01 | 'Hire by talking' | 60–90 s
**Scene 1**: Employer arrives. Q gold presence and one sentence: 'Tell me who you need.' Show keyboard and microphone as equal options.  
**Scene 2**: Employer says they need SOC analysts. Q asks two essential clarifications; user enters location, responsibilities and pay.  
**Scene 3**: Structured mandate fades in as a useful artifact, and recruiter approves it.  
**Scene 4**: Actual demo run events populate the task panel and candidate shortlist.  
**Scene 5**: Click candidate; Q explains observed evidence versus unknowns.  
**Scene 6**: Recruiter approves outreach; show message receipt and pending response, not imaginary success.  
**Ending**: 'From hiring need to evidence-backed conversation.'

### FILM-02 | 'What you've done travels with you' | 45–75 s
Candidate uploads CV; Q extracts details; candidate corrects one mistake; Evidence Passport organizes a credential, project link and reference; candidate makes one item visible to a specific employer and leaves a private work item hidden; show a revocation that immediately removes access. End on ownership and portability, not a public social feed.

### FILM-03 | 'Jobs that actually fit' | 45–75 s
Candidate Explore shows jobs in a declared location and remote preference; Q compares work arrangements and salary compatibility; open a job, inspect fit evidence and unknowns; submit a candidate-authorized application; applications dashboard shows received vs pending states. Include a clear empty-result recovery path.

### FILM-04 | 'Interview in your own mode' | 60–90 s
Intro shows voice/text/form choices; candidate starts text interview and gets an adaptive technical follow-up because their first explanation lacked a concrete step; Q checks a locked mandatory question; candidate pauses and resumes; recruiter receives rubric-backed review; candidate gets appropriate non-confidential feedback. A brief voice option shows audio-reactive orb and captions without making video mandatory.

### FILM-05 | 'More than a CV' | 60–90 s
Recruiter has no technical skill. Candidate grants access to a project. Q opens a safe snapshot, highlights what the project actually demonstrates, creates plain-English interpretation and offers a short relevant work sample. During a consented human interview, optional Q companion identifies an uncovered skill and suggests a follow-up; post-call feedback helps the interviewer improve. Show explicit human review.

### FILM-06 | 'Q is working' | 60–90 s
Recruiter gives multiple valid tasks. Q displays a plan with available tools, budget and expected dependencies; safe source reads start in parallel with event-backed UI; first candidate results become available early; a source fails with recoverable warning; a candidate comparison/chart artifact appears; Q drafts personalized outreach, pauses for approval, and shows real final receipt. The narrative contrasts useful progress against false 'AI thinking' animations.

## 41 additional micro-animation captures

Each `MO-001...MO-041` row must have **one reusable component and one source event**. Capture a short GIF/MP4 of the prototype event and its reduced-motion rendering. Produce the clips from **real component state changes** (with recorded mock server events if not connected) rather than an uneditable video rendering. Keep captures in `motion/clips/MO-###.mp4` and link them in `MOTION-COVERAGE.csv`. The film should not demonstrate capabilities that the prototype cannot simulate from its own contracts.

## Production quality checklist

- 16:9 landscape walkthrough, also demonstrate 9:16 phone viewport where pertinent.
- Browser UI legible at 1080p; avoid tiny fonts that disappear in exported video.
- Synthetic profiles, company names, salary figures and source data visibly marked illustrative.
- Timecode-based subtitle file plus accessible transcript.
- Optional soundtrack must not obscure Q's voice or user actions.
- Controls do not visibly teleport; record actual navigation, clicks and state transition continuity.
- No fake delivery, successful identity verification, external search result, recruitment outcome or real candidate rating.
- Fidelity table at end: fully interactive; locally simulated; external provider demo; not implemented.
- Source code for animation states and the motion-token definitions must accompany clips.
