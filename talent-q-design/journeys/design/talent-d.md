# TALENT-D design note (coverage build, 30 Oct)

Seven candidate screens and six motions, built inside Direction D with the existing `ds/*` components and tokens.
Gold stays Q's: it marks only Q's lines and Q's suggested wording. No new typefaces, colours or aesthetics.

| ID | Route | Person | What exists |
|---|---|---|---|
| SC-071 Work authorisation | `/c/work-permit` | Zara | States per country, private by default, shared per employer with a consent receipt, never a filter, a document as a separate "not checked" step |
| SC-076 Work critique | `/c/work/critique` | Amaka (and Chidi) | Q's kind, concrete read of her own write-up, anchored to paragraphs |
| SC-077 Revision history | `/c/work/versions` | Amaka | Versions with who, when, what changed and the source, compare, restore, who has which version |
| SC-087 Cover note | `/c/jobs/:id/letter` | Grace (and Chidi, Zara) | Lines from her own facts only, a source under every line, she approves, nothing sent |
| SC-092 Learning player | `/c/learn/:id` | Tobi (and Chidi) | Simulated video with captions and transcript, article view, exercise, tied to a gap |
| SC-172 Improvement wizard | `/c/career/improve` | Chidi | Five steps; evidence only after review and his choice; shared only after a receipt |
| SC-175 Recovery coaching | `/c/applications/:id/recovery` | Chidi | Warm, uses only feedback Tinda shared, never guesses |

Motions: MO-014 (Jobs), MO-029 (versions preview), MO-030 (Passport CV draft), MO-040 (Applications and recovery),
MO-041 (work authorisation), MO-052 (wizard and the Passport card).

## Skill → screen → change
- **design-skills:interaction-design.**
  - Every screen is modelled as states: empty, ready, loading, error and denied, with `?state=` for review. The
    wizard is a five-state machine with no impossible states: you can't use a review that didn't improve, and you
    can't share before the receipt.
  - Undo over confirm for reversible edits. Restore adds a version; nothing is deleted. In-place `ConfirmButton`s are
    kept only where an employer's access changes.
  - Peak-end: the wizard's peak is "level 3 of 4, was 2", and its end is a private, receipted share. Recovery ends on
    "What stays the same".
- **design-skills:ux-writing.**
  - Q never says "rejected" or "failed".
  - Recovery separates "What Tinda told you" (quoted exactly, with the date) from "Next steps from what Tinda said".
    Without feedback it reads: "Tinda didn't say why, and I won't guess."
  - Work authorisation says "Your statement … Not checked by anyone", never "verified".
  - Critique opens with "Already working" and gives each point a why and a "Try:".
- **design-skills:design-elevation.**
  - One primary action per sheet, and sheets are grouped by task.
  - Source chips are one small vocabulary: an arrow for a source and a dashed pen for "Your words", so colour is
    never the only signal.
  - The version timeline uses filled and hollow dots, with mono version numbers (the Plex data face).
- **design-superpowers:creative (L2: work inside the design system).**
  - The simulated video sits on the existing ink and night tokens and says "Simulated video · no media plays" on
    screen.
  - The consent receipt is a paper card with mono labels: What, Who, When, Status.
  - No new colour. The shared-state pill uses the `--ok` border plus text.
- **design-skills:design-critique.** Ran on the first render at 1440 and 390. Findings and fixes are below.
- **design-skills:accessibility-audit (player and receipts).**
  - The play button no longer combines `aria-pressed` with a changing label.
  - A +10s control was added. The scrubber is a native range with `aria-valuetext` ("0:30 of 1:36").
  - The screen region is focusable, with a visible focus ring and Space, arrow and C keys.
  - Captions are mirrored to a polite live region while playing. The transcript is a list of buttons.
  - Receipts are a named `group`. Access changes are announced with `role=status`.

## Rendered critique (first render), most severe first
1. Sev 3 · Task-first (critique, phone): the four-paragraph document came before "Ask Q to read it", so the task was
   two screens down. → On ≤860 px, Q's read now comes first (pair 02).
2. Sev 3 · H5 (work authorisation, empty): "Share with Kora Pay" was active before anything was stated, and the
   confirm then said "Add a country first". → Disabled, with a visible reason (pair 01).
3. Sev 2 · H8 (versions): Q's opener repeated the proactive card word for word ("Medlink Health has version 1…"). →
   The opener now offers the next action instead: compare or restore (pair 03).
4. Sev 2 · H6 (compare): Was and Now were labelled only for screen readers. → Visible mono "Was" and "Now" labels,
   matching the P6 CV diff (pair 03).
5. Sev 2 · Writing (recovery Q line): "…like sales executive confirmed by your employer" read awkwardly. → It now
   names the item in quotes: "… is still confirmed" (pair 04).
6. Sev 1 · Writing (regional note): "the employer confirms what they need" appeared twice. → Said once (pair 01).
7. Sev 1 · A11y (player): the play button was both pressed and relabelled, and there was no forward seek. → Fixed
   (pair 05).

## Before/after pairs
- 01: Work authorisation (desktop). Sharing is disabled until something is stated, and the regional note is no longer repetitive.
- 02: Critique (phone). Task-first: "Ask Q to read it" now comes before the long document.
- 03: Versions (desktop). The opener no longer duplicates the proactive card, and the comparison has visible Was and Now labels.
- 04: Recovery (phone). Clearer Q line that names the confirmed item.
- 05: Learning player (desktop). Play has a single state, and there is a +10s control.

## Honesty rules, and how they are tested
- The work authorisation never filters. The test counts `/c/jobs` cards before and after stating it.
- The employer's event carries no details. Only Kora's receipt grants a read (`authVisibleTo`). The document goes
  only by a second choice and is always "not checked".
- The critique and wizard never invent facts. Where a fix needs something only the candidate knows, Q says so. The
  wizard's "your fact" is typed by Chidi.
- The cover note runs the P6 guard (`addedClaims`, wrapped as `inventedIn`) on Q's lines and refuses approval if it
  finds anything. Her own lines are labelled and flagged, never blocked.
- In recovery, the test checks Q's replies and the page against guess phrasing ("probably because…"). Feedback is
  quoted exactly.
- Simulated:
  - the reviewer (J7 `submitSample`);
  - the employer's reply (a labelled reviewer control);
  - the video;
  - sends (`SENT_SIMULATED`, "not read yet").

## Remaining weaknesses (honest)
- The critique, cover-note facts, lessons and wizard edits are authored for this cast: Amaka and Chidi (critique),
  Grace, Chidi and Zara (notes), Tobi and Chidi (lessons), and Chidi (wizard). Anyone else sees an honest empty
  state.
- No recruiter page reads the work authorisation yet. `authVisibleTo()` is the single read path a recruiter profile
  should use. The employer's preview lives on Zara's page.
- The motions in the main shell don't have a global `MotionConfig`. TALENT-D wraps its own pages and hooks in
  `Still` (OS reduced motion, or the person's lite setting). Other areas' motion components still don't honour
  reduced motion.
- No dedicated MP4 clips were recorded. The motions are checked as working states in `talent-d.mjs`, with phone runs
  under `reducedMotion: reduce`.
- The improvement wizard covers one J7 sample (Chidi's brief). Tobi's post-mortem needs a colleague's confirmation,
  not edits, so it isn't offered.
- On the Passport, the receipt line appears only for items shared from the wizard. Ordinary Passport shares still
  have no receipt.
