# Talent Q design system: Direction D

Approved by the founder on 29 Oct 2026 as the primary design direction. Code lives in `prototype/src/ds/`. Tier-1 values come from `tokens/tokens.json`, which builds `styles/tokens.css` with a contrast gate.

## Materials

| Material | Where | Job |
|---|---|---|
| **Ink** (`--night`) | Rail, thread, phone tabs, sheet bar | Where Q thinks, speaks and works. Also navigation |
| **Paper** (`--paper`, `--sheet`) | Canvas, artifacts, forms | Where evidence and work are read at high contrast |
| **Gold** (`--gold-light` on ink, `--gold` and `--gold-ink` on paper) | Q mark, Q's proposals, the one primary next step | Means "Q and Q's work". Never decoration and never an evidence level |

**Candidate warmth.** `data-audience="candidate"` warms the paper (#f7efe3) and the ink, rounds surfaces to 20px and uses first-name greetings. Contrast floors, the accent and every rule stay the same.

## Type

| Face | Use |
|---|---|
| Fraunces | Q's voice, verdicts, view titles that state the finding |
| Inter Tight | UI and body text |
| IBM Plex Mono | Data, labels, counts, versions |

Scale: 12 · 14 · 16 · 19 · 24 · 30 · 38 · 46 (major third).

## Components (`src/ds/`)

| Component | Notes |
|---|---|
| `AppShell` | Workspace switcher (Hiring and Career), a rail of up to 4 groups and 9 items, the command palette (⌘/Ctrl K), and phone tabs (4 plus More). Shows only areas that exist |
| `Split` | Thread and canvas. The separator can be dragged, moved with the arrow keys or Home/End, and double-clicked to reset. The thread collapses to a strip that still shows Q's state. Width and mode persist per user |
| `Thread` | Context chips, plan and agent counts, Q's voice, the "Shown as …" reason, next-step chips and the composer (which can be replaced, e.g. by the multimodal composer) |
| `Canvas` | Kicker, a SIMULATED label, a title that states the finding, a view switcher, versions, and an aside slot. On phones it is a full-height dialog sheet with Q's latest line |
| `QMark` | Moods: idle, listening, thinking, working (one point per agent, advanced by finished units), waiting, blocked, done, offline. Each mood has a distinct shape and a text label |
| `Glyph` | One evidence vocabulary: verified, evidenced, partial, practising, not shown, unclear. Encoded by shape, never by shade |
| `ds.css` | Classes for buttons, chips, filters, options, fields, banners, tables and skeletons |
| Legacy bridge (`.ds-legacy`) | Renders the original screens on paper in D's type and colours until each is rebuilt natively |

## Motion principles

1. **Motion is caused by events.** Agent points advance when a unit finishes, cards resolve when a check finishes, and roles move when assessed evidence changes a gap count. There are no idle loops.
2. **Functional motion takes 500 ms or less,** eases out and never overshoots on data.
3. **One peak per flow.** The Q core settles once, for example when invitations are sent or a work sample is assessed.
4. **`prefers-reduced-motion` removes travel, not information.** Shapes and labels carry every state.

## Navigation information architecture

| Workspace | Groups and items |
|---|---|
| **Hiring** | **Q:** Home, Plans and agents · **Hiring:** Roles, Search, People, Approvals (badge), Calendar · **Knowledge:** What Q remembers, Organisation and policy |
| **Career** | **Q:** Career atlas, Getting started · **Grow:** Readiness to apply, Practice and interview · **Evidence:** Evidence Passport, Interviews, What Q remembers |

New areas join an existing group, or replace an item with a hub. The rail does not grow past nine items per workspace; the palette and Q reach everything else.

## Accessibility

- Every interactive SVG node is a focusable button with a name.
- Every chart has a table or list fallback.
- Phones use landmarks: the thread is `main` and the sheet is a `dialog`.
- Touch targets are at least 44 px.
- axe-core runs on every batch (`qa/scripts/axe-batch1.mjs`).
