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

## Execution rules (added in the design pass, 29 Oct)

These rules came out of the critique of the ten journeys. They are what keeps the system looking designed rather than assembled.

**Page anatomy**
- Every page has a one-line kicker and a title.
  - The kicker gives context only: who or where, or a date. Status never goes in the kicker; use a tag or a banner.
  - The title is the subject: a name, a role, or "Good morning, Ada". Q's reading of the page is a lede under the title, never the title itself.
- "Simulated" is marked once, in the shell: the rail brand on desktop, a thin bar on phones. Each action that would touch a real system carries its own label ("Simulated send", "Simulated upload", "Simulated check").

**Elevation**
- There is one level. A `ds-sheet` floats on the paper; a sheet inside a sheet becomes a flat panel with a 1 px rule.
- Shadows are tinted toward the paper hue (`--shadow`).

**Controls**
- Choosing between options uses `ds-opt` cards.
- An on/off setting uses `SwitchRow` (`src/ds/Switch.tsx`). It has `role="switch"`, and its state is shown by position and by the words On or Off, never by fill colour alone.
- Q's actions are chips. The primary action is gold, because it is Q's; everything else is quiet.
- A page action is a `ds-btn`.

**Q in the thread**
- Replies are short. Lists go in reference cards, not paragraphs.
- Context chips show what Q used.
- "Q noticed" cards follow a fixed order: the observation, then its actions as chips, then a quiet footer row with "Why am I seeing this?", "Later" and "Dismiss".
- Q never offers to open the page you are already on.

**Candidate surfaces** (creative-direction refresh)
- Q speaks first, in one line, about what matters today.
- The person's next real commitment is the visual anchor.
- Progress is a path written in the person's own terms, where "not yet" reads as normal.
- No dashboards of identical stat tiles.

**Recruiter surfaces**
- Dense but calm. "Needs you" leads.
- Counts are direct labels, so a pipeline stage strip carries both the number and the stage name.
- Interviews only in "Coming up"; personal busy blocks live on the calendar.

**Motion tokens** (`src/ds/motion.ts`)

| Purpose | Duration | Easing |
|---|---|---|
| Feedback | 100–200 ms | — |
| Orientation | 200–400 ms | — |
| Entering | — | `EASE.enter` (decelerate) |
| Leaving | faster than entering | `EASE.exit` |

- `arrive` (rise 6 px and fade in) is the one pattern for messages, cards and page arrival.
- Nothing functional runs longer than 500 ms, and no real work is ever delayed so that an animation can be seen.
- Reduced motion turns movement into instant swaps (`MotionConfig` is global). Lite mode removes animation entirely.

**Privacy-aware patterns**
- A hidden person is counted, never named: "2 people aren't shown: their privacy settings…".
- A permission state shows no data, says why in plain words, and offers a way back.
