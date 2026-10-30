# Design pass · public site (atlas SC-001…006, SC-008, SC-013; decision D15 resolved 30 Oct)

The founder asked for the whole blueprint, so the public marketing site (D15: "proposed as a later phase") is now
built. Routes: `/site` (landing), `/site/how` (`?for=talent`), `/site/employers`, `/site/talent`, `/site/pricing`,
`/site/trust`, `/site/ask` (sample Q, full page) and `/sign-in`. All are `side: 'public'`, bare (no app shell).
**`/` is unchanged**: it stays the founder's prototype start (`screens/Entry.tsx`), which now has one extra link to
`/site`. Registering a route at `/` would have replaced it, so this was the least invasive option.

Tests: `qa/scripts/features/public.mjs` 125/125 (62 desktop + 63 phone; one desktop step checks signed-in Q). privacy.mjs 21/0, R1 95/0, T4 43/0; T1 74/2 (the same 2 fail with the public files removed, so they come from another area).
Files: `prototype/src/journeys/public/*` (Site frame, pages, `qsample.ts` rule engine, `SampleQ.tsx`, `content.ts`,
`public.css`), `src/routes/public.tsx`, `src/state/areas/public.ts`, `src/q/skills/public.ts`.
Positioning comes from `docs/sources/batch-6/00_START_HERE_PRODUCT_DECISION.md`: "Evidence-first hiring, with Q
doing the work", "Show what you can do, even if your CV doesn't" and both promises, quoted verbatim. Prices come from
`01_BUYER_EVIDENCE_AND_PRICING.md`. The ledger's "Unproven claims" are hard constraints, and the trust page lists
them as "Claims we don't make".

## Skills invoked (Skill tool) → screens → changes
- **interaction-design** → the sample Q is a small state machine: empty (page opener plus questions) → thinking
  (labelled, a fixed 450 ms, no fake progress) → reply. Other branches: refusal (permission denied) and offline
  (question kept, Retry). Sign-in is modelled as steps: start → sending → code, or start → choose account → waiting.
  Every error has a way out (create account, use Microsoft, finish sign-up, cancel). Sheets trap focus, close on
  Escape, and return focus to their trigger. The pricing "Ask about this" form opens inline, not in a modal.
- **ux-writing** → no claims beyond the evidence. Q's accuracy answer is "That isn't proven yet". Prices are "Prices
  we're testing" with "Being tested" stamps. The compare table writes "not decided" rather than inventing a number.
  Errors follow what happened, then why, then what to do ("Talentbridge asks its team to sign in with Microsoft…").
  Q's refusal of real people explains the rule, not just "no".
- **design-elevation** → Direction D materials only. Paper for reading; ink for Q's conversation. Gold appears only on
  the Q mark, Q's primary chip, the send button and the "Ask Q about this" links. There is one elevation level, and
  cards inside Q's thread are flat ruled panels. The type roles are Fraunces for voice and titles, Inter Tight for
  UI and Plex Mono for labels and the value sum.
- **design-superpowers:creative** (L2: inside the DS, no new tokens) → three ideas. (1) The hero puts the promise on
  paper and Q's sample conversation on ink, so Q is the hero object rather than an illustration. (2) A price is a
  "hypothesis stamp": the dashed label language the system already uses for unproven or simulated things. Only the
  free core gets a solid stamp. (3) Trust is laid out as a ledger: "Q does / Q doesn't" in two panels, then the
  shared evidence-class list (the same shapes and words as the Passport).
- **design-critique** → a critique of the rendered pages at both widths (below). Defects were fixed and re-rendered.
- **dataviz** wasn't needed: the only tabular data is the pricing compare. It is a plain table on desktop and a list
  per plan on phones, with direct labels and "not decided" in muted italics.

## Rendered critique (first render), most severe first
1. Sev 3 · focus (all pages with a sheet, both widths): the sheet's close-effect ran on first render and moved focus
   to "Ask Q" or "Menu" on page load, which made screen readers start mid-page. → Focus now returns to the trigger
   only after a sheet was open (pairs 03, 05).
2. Sev 3 · H1, state visibility (How it works): the audience switch showed no selected state, because `role="radio"`
   with `aria-checked` didn't match the `ds-filter` pressed style. → The checked option is filled with ink; the
   targets are 44 px (pair 02).
3. Sev 2 · H8, duplication (landing Q opener): "Describe a role" and "Describe a role for Q" did the same thing. →
   Starters are de-duplicated by action, and the opener shows every sample question so the empty state guides
   (pair 01).
4. Sev 2 · hierarchy and alignment (Pricing): the offer cards had uneven heights and their buttons sat at different
   heights. → The cards stretch, and "What we're testing" plus the action align at the bottom (pair 03).
5. Sev 2 · relevance and density (Employers journey): step 1 said "Ask Q about this comparison" and steps 1, 2 and 5
   were text only. → Each step now has its own demonstration (approved criteria, "why Tobi is still here", the
   comparison, the bounded follow-up, receipts) and its own question to Q (pair 04).
6. Sev 2 · consistency (How it works, step 3): a blank right column. → Added the "one targeted follow-up" sample.
7. Sev 1 · lists (Trust, Pricing): list markers were missing because the base reset removes them. → Bullets restored
   (pair 06).
8. Sev 1 · disclosure (Sign in, phone): "Demo emails" didn't look expandable. → It has a disclosure arrow (pair 05).
9. Sev 1 · redundancy (landing kicker): "TALENT Q" under the Talent Q brand. → Now names the two audiences.

## Before/after pairs
- 01: Landing, desktop. Opener chips de-duplicated and every sample question shown; the kicker names both audiences.
- 02: How it works, desktop. The audience switch shows its selected state; step 3 has a demonstration.
- 03: Pricing, desktop. Cards aligned; no focus ring stolen by "Ask Q" on load; bullets restored.
- 04: For employers, desktop. A demonstration and a step-specific "Ask Q" for every journey step.
- 05: Sign in, phone. "Menu" no longer takes focus on load; the demo emails disclosure has its arrow.
- 06: Trust, desktop. List markers restored in "Q doesn't", privacy and "Claims we don't make".

## Requirements covered (evidence = step names in `qa/scripts/features/public.mjs`, desktop and phone)
- **SC-001:** the commercial line, an entry for each side, both promises verbatim, Q present and labelled as a sample,
  and an honest "no results to claim yet".
- **SC-013:**
  - opener empty state;
  - the fictional comparison, with no overall score;
  - refusal of real people (permission denied);
  - "not proven" for accuracy;
  - prices as hypotheses;
  - sample criteria from a described role;
  - honest fallback;
  - leads to `/signup`;
  - persists across pages in the tab; Start over;
  - offline with the question kept, then Retry;
  - the list alternative;
  - the dock as a dialog with a page opener; Escape returns focus.
- **SC-002:** the audience switch in the address, and demos for approving criteria, receipts and sharing.
- **SC-003:** outcomes "measured, not promised"; the Tobi/Seyi journey with sources; the bounded follow-up; trust.
- **SC-004:** the candidate line, warm paper, four evidence classes, free core, and practice that is never proof.
- **SC-005:**
  - four offers, with "Being tested" ×3 and Free;
  - no payment fields;
  - the compare covers mandate, seat, agents and assessment, with "not decided";
  - the value model is labelled as a model;
  - inline validation;
  - interest is recorded in `areas.public` and nothing is sent.
- **SC-006:**
  - Q does / doesn't;
  - human review;
  - five classes;
  - revocation;
  - simulated vs real, with receipts;
  - no face scoring;
  - six claims we don't make;
  - in-page index.
- **SC-008:**
  - the three methods, each labelled simulated;
  - incomplete, unknown and wrong-code errors;
  - Talentbridge refused for an email code (permission denied);
  - "Sending…";
  - Ada by code → `/r/home` with an `auth.signed_in` event in `ORG:org_kora`;
  - Tobi by Google → `/c/home`;
  - Microsoft cancel, then Dele → `/r/home`;
  - Funmi's unfinished account → `/signup` as Funmi.
- **Mobile:** the Menu sheet, task-first lists (pricing compare as a list, journey steps as a scrollable row), and no
  sideways scroll with text ≥ 12 px on all nine pages.

## Honest remaining weaknesses
- The sample Q is a regex matcher with about 15 intents. Phrasings it doesn't expect fall back to "I only have a few
  sample answers". That is honest, but it's thin. It is text only: no voice on the public pages.
- Pricing interest is stored but nobody sees it: there is no internal "leads" view. Sign-in has no password option
  (a deliberate passwordless choice), and the atlas row lists passwords, so this needs the founder's confirmation.
- The Talentbridge "Microsoft only" rule is an invented demo policy. It shows the permission-denied state; it isn't
  a product decision.
- No locale or language choice on the public pages (SC-007 remains a section of `/settings`).
- No real loading states for page content: the pages are static. Loading appears only where something "happens"
  (Q reading, sending a code, waiting for a provider).
- Screen-reader pass not done; axe not run on these pages in this pass (keyboard behaviour is covered by the test:
  focus trap, Escape, focus return).
