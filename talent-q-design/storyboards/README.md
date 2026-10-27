# Storyboards

The recorded films are scripted in `../qa/scripts/films.mjs`. Each `film(...)` block is the storyboard: one caption per beat, with the real UI action that produces it. Results are in `../qa/VIDEO-CAPTURE-REPORT.md`.

## Planned, blocked by unbuilt screens

**Film 2 · Candidate onboarding (60–75 s).**
1. Welcome.
2. The candidate uploads a CV.
3. Q extracts details and asks to confirm the uncertain ones.
4. The candidate corrects one mistake.
5. Q proposes evidence from a project link.
6. The Passport is created with everything private.
7. The candidate shares one item with one employer.

Needs SC-061–066.

**Film 6 · Multi-agent work and artifacts (60–90 s).**
1. The recruiter gives three tasks in one message.
2. Q shows a plan with tools, budget and dependencies, and asks for approval.
3. Three bounded specialists run in parallel, each with real step counts.
4. One source fails with a recoverable warning.
5. Results fan in to a comparison table and a chart artifact.
6. Q drafts outreach and pauses for approval.
7. The receipt arrives.
8. A cost threshold triggers `q.cost.approval.required`.

Needs SC-119, SC-131, SC-132.
