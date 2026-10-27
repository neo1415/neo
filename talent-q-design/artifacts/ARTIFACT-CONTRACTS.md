# Artifact contracts

Types live in `contracts/artifact.ts`. They mirror Q's `QResultBlockSchema`, `QTableBlockSchema`, `QChartBlockSchema` and `QArtifactVersion` (see `research/Q-REUSE-AUDIT.md`).

Rules:

1. Q produces data in a known shape, and Talent Q renders it with its own renderer. Generated client code from any source never runs.
2. Every artifact has a `version`, the run that made it, and its `sources`. An edit creates a new version, and anything approved binds to one version.
3. Artifacts sit on the **paper** surface in both themes (decision D1), so they read well and print.
4. `simulated: true` artifacts carry a visible label.

| Kind | Where in the prototype | Status |
|---|---|---|
| `COMPARISON` | `/r/compare`: requirement × person, each cell an evidence state that opens the evidence inspector | Built |
| `DOCUMENT` | Mandate (`/r/mandate`) is the first document-like artifact; CV and offer renderers come next | Partial |
| `SCHEDULE` | Slot list with interpretable score terms (`/r/calendar`) | Built (inline) |
| `PLAN` | J7 plan, downloadable as text (`/c/career`) | Built (text) |
| `TABLE` | Shares the comparison renderer's table styles | Not separately built |
| `CHART` | J7 comparable progress | Not built |
| `ROLE_MAP` | J7 route strip (list form) | Partial; graph view not built |
