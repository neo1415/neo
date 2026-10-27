# Experience decisions

Each decision states what was chosen, what it rules out, and what evidence would reopen it.

## D1. Direction: Nocturne, with Atelier's split, and Ledger as the light theme

Three gold-consistent directions were drawn on the design canvas (https://claude.ai/artifact/MmkpWffDt1d8FhAR9kTFZc). Each direction has a recruiter Q home and a J7 career home on mobile.

| Direction | Strength | Weakness |
|---|---|---|
| **A · Nocturne** (dark, Q disc, serif voice line) | Closest to the founder's film language (01 §9, 07): one central thought, negative space, gold reserved for Q. Approval moments read clearly. | Dense artifacts (tables, CVs, documents) are tiring to read as light text on black for long periods. |
| **B · Ledger** (warm paper, editorial grid) | Best for long reading, tables and printing. Calm, credible to HR buyers. | Q loses its presence: gold becomes a typographic mark only, and the film's "warm point in the dark" disappears. |
| **C · Atelier** (dark conversation beside a light artifact canvas) | Separates *talking to Q* from *the thing Q made*, which is exactly Track D's artifact workspace. | On a phone, two grounds compete unless the artifact becomes a sheet. |

**Chosen:**
- A is the identity and the default ground.
- C's split is the layout for any screen where Q has produced an artifact: comparison, evidence, CV, plan, schedule. The artifact sits on a light "paper" surface, and the conversation stays dark.
- On mobile the artifact rises as a sheet over the conversation.
- B's palette becomes the full light theme, for people who prefer it and for printing and export.

This keeps gold as Q's signal and gives dense evidence a readable surface. It also keeps one coherent system instead of three.

**Reopen if:** reviewers find the two-ground split disorienting in testing (target: 4 of 5 testers can say what is Q's work and what is their conversation).

## D2. Gold is a signal, not a decoration

- Gold appears only on: Q's presence, the single primary action in view, the focus ring, and progress that Q is actually making.
- Gold is never used for body text on dark. Gold text is limited to 12–14px mono labels (10.15:1 on the dark ground, 5.74:1 on paper; `tokens/CONTRAST-REPORT.txt`).
- No gradients, no glows except the Q disc's own soft halo (01 §9 allows "tiny smooth glows only around Q's presence").

## D3. Q's presence is a disc, not an orb of noise

- The v2 prototype's grainy canvas orb is replaced by a crisp gold disc with a thin ring.
- State is carried by the ring and by motion, never by colour alone:
  - **idle:** still
  - **listening:** the ring follows the input level
  - **thinking:** slow rotation of a ring arc
  - **working:** the arc length equals real step progress
  - **waiting:** the ring is dashed and the disc dimmed
  - **done:** a single settle pulse
  - **error:** a notch in the ring
- Every state also has a text label for screen readers and reduced motion.
- No robot face, no sparkles, no "AI" glyph.

## D4. Motion stack: Motion for React, CSS and canvas; no Rive

- Q's seven states are a small finite machine that SVG and CSS render exactly. Rive would add a binary asset pipeline and an extra runtime for no gain.
- Every motion in the atlas is driven by a typed event from the mock runtime, never by a timer pretending progress (the atlas column `fake_progress_prohibited = Yes`).
- `prefers-reduced-motion` swaps each motion for its fallback from the atlas.

## D5. Typography

- **Newsreader** is Q's voice: serif headlines and Q's spoken lines.
- **Geist** is the UI.
- **Geist Mono** is used for labels, timestamps and IDs.
- Body is 16px, the minimum is 12px (mono labels only), and line length is capped at 68ch.

## D6. One Q, mirrored contracts, no second engine

- The prototype's contracts mirror the shapes in `neo1415/q`, but use hiring enums of our own (`research/Q-REUSE-AUDIT.md`). Mirrored shapes: `QStreamEvent{contractVersion,eventId,runId,sequence,occurredAt,type,data}`, run statuses, action proposals bound to a payload hash, `StepResult`, memory candidates and items, and `PermittedContextPlan`.
- A browser-side mock runtime replays scenarios as these events, with resumable cursors. No orchestration framework is added.

## D7. Honesty labels

- Anything simulated carries a visible `SIMULATED` label in mono: provider receipts, calendar data, messages and people.
- Synthetic people and companies are fictional.
- No screen claims a connected provider.

## D8. Measures, never a talent score

- Recruiter views show requirement-by-requirement evidence states:
  - `VERIFIED_CAPABILITY`
  - `EVIDENCED`
  - `NOT_EVIDENCED`
  - `EVIDENCE_OUTDATED`
  - `BELOW_TARGET_ON_ASSESSMENT`
  - `REQUIREMENT_UNCLEAR`
- J7 shows the six separate measures. There is no single headline number anywhere (C5 in the source coverage).
