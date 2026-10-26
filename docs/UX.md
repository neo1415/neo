# Talent Q — UX specification

This is the UX layer behind the clickable prototype in `src/` and the walkthrough video in `video/`.
It turns the two strategy briefs (Investor & Product Brief, Global Market Research v1) into journeys, screens and interaction rules.

> Product thesis carried into every screen: **a shorter, more trustworthy path from a genuine hiring need to a qualified, interested candidate and an accountable decision.** Q advises; people decide.

---

## 1. Design principles

| Principle | What it means on screen |
|---|---|
| **Evidence over noise** | Every claim shows its source, freshness and verification state. “Unknown” is a first-class label, never a silent zero. |
| **Two-sided fit** | Employer fit (F) and candidate compatibility (A) are shown separately; the mutual index √(F×A) ranks. Never shown as a probability of success. |
| **Human decides** | AI output is labelled *AI advice*. Final decisions require a named human and a written reason. Agents can never make them. |
| **Consent is visible** | Candidates approve every extracted claim, choose what each employer sees, and can revoke it. |
| **No silent failure** | Dropped connections checkpoint and offer a low-data path; empty searches say “no verified candidate found” instead of padding a list. |
| **Calm power** | Sovereign posture for recruiters (dense, keyboard-friendly), transient posture for candidates (one clear next action per screen). |

## 2. Personas used in the prototype

From the brief’s ten representative journeys, the prototype follows two end to end and folds in the failure paths of four others.

| Persona | Role in the prototype | Failure path shown |
|---|---|---|
| **Ada** — Lagos startup founder | Employer protagonist: sign-up → onboarding → intake → shortlist → decision → offer | Budget doesn’t fit “senior” → feasibility review with four options, mandate v2 |
| **Femi** — passive senior developer | Candidate protagonist: sign-up → profile → confidential invite → interview → offer | Privacy risk → confidential mode, current employer auto-blocked, company hidden until he accepts |
| **Tunde** — agency founder | Agency console | Candidate represented twice → duplicate-submission guard, consent request |
| **Emeka** — low-bandwidth applicant | Inside Femi’s interview | Connection drops mid-interview → checkpoint, resume, or switch to low-data text |
| **David** — security hiring manager | Shortlist coverage | Strong CV, weak evidence → high fit + low coverage flagged as “collect evidence”, not “reject” |
| **Chiamaka** — new graduate | Shortlist “train a junior” alternative, growth paths | Experience requirements → junior alternative surfaced by feasibility review |

## 3. Journey maps

### 3.1 Recruiter journey (Ada)

| Stage | Screen / route | Key actions | Q’s role | Emotion | Peak / risk |
|---|---|---|---|---|---|
| Discover | Landing `/` | Reads promise, watches live intake demo, plays with the Q-Match explorer | Demonstrates value before sign-up | Curious → intrigued | Q-Match slider is the “aha” |
| Sign up | `/signup?role=employer` → `/verify` | SSO or email, live validation, password strength, 6-digit OTP | — | Low effort | Auto-advancing OTP, animated check |
| Onboard | `/onboarding/employer` (6 steps) | Company, hiring rhythm, compliance, connect tools, invite team | Narrates each step in the side rail | Reassured | NDPA pre-set; human-review gate locked on |
| Define the role | `/app/intake` | Describes outcomes in plain words; answers 3 chip questions | Clarifies, builds the mandate live, runs feasibility review | Understood | **Crisis:** budget vs seniority → **resolution:** mandate v2 |
| Find evidence | `/app/shortlist` | Watches results stream; sorts; corrects (“less like this”); opens detail | Streams results, explains every rank, marks unknowns | Confident | Re-rank animation after correction |
| Confirm interest | Shortlist drawer | Reviews Q’s draft, hides company name, approves & sends | Drafts; respects caps & opt-outs | In control | “Femi is interested” toast |
| Assess | `/app/pipeline`, `/app/assess` | Drags candidate forward; reads screen transcript; requests human task review; submits scorecard | Runs structured screen, tags rubric signals | Informed | Independent scorecards reveal |
| Decide & offer | `/app/decision` | Compares finalists vs original rubric, writes reason, builds offer | Labelled AI advice only | Decisive | **Climax:** offer sent + celebration |
| Operate | `/app/agents`, `/agency`, `/analytics`, `/governance` | Launches a bounded agent; handles duplicate submission; reviews funnel, fairness, spend, audit | Persistent, policy-bound agents | Trust | Locked “never makes final decisions” |

### 3.2 Candidate journey (Femi)

| Stage | Screen / route | Key actions | Q’s role | Emotion | Peak / risk |
|---|---|---|---|---|---|
| Discover | Landing `/` | “I’m looking for work” | — | Sceptical | “Free — always” |
| Sign up | `/signup?role=candidate` → `/verify` | Email + OTP | — | Quick | — |
| Build profile | `/onboarding/candidate` (6 steps) | Upload CV (or talk to Q), approve claims, set preferences, choose visibility, add evidence | Parses CV, excludes sensitive data, explains “unverified” | Respected | Confidential mode + auto-blocked employer |
| Get matched | `/me` | Sees opportunities ranked both ways and a confidential invite | Explains hidden roles (“why you didn’t see…”) | Valued | Invite banner |
| Respond | `/me/invite` | Checks fit vs own preferences, toggles what’s shared, accepts | — | In control | Company name revealed on accept |
| Interview | `/me/interview` | Disclosure, 4 questions, autosave | Structured Q screen | Focused | **Crisis:** connection drop → **recovery:** low-data resume |
| Track | `/me/applications` | Live status timeline, review-window countdown | — | Informed | No ghosting |
| Grow | `/me/rehearsal`, `/me/evidence`, `/me/growth`, `/me/privacy` | Private practice, revoke/undo evidence access, close a gap, export data | Feedback, gap analysis | Empowered | Practice never shared |
| Offer | `/me/offer` | Terms checked against preferences; accepts | Independent take on the offer | Elated | **Climax:** confetti; profile auto-hides |

## 4. Screen inventory (27 routes)

**Public:** Landing · Sign up (role → form) · Verify (OTP) · Sign in · Forgot password · Employer onboarding (6 steps) · Candidate onboarding (6 steps)

**Employer workspace (`/app`):** Overview · Role intake · Shortlist (+ candidate drawer, outreach composer, correction modal) · Pipeline (drag & drop) · Assessments (screen / practical task / scorecards) · Decision & offer · Q agents (+ new-agent drawer) · Agency console (+ duplicate warning) · Analytics · Trust & audit (audit / fairness / spend)

**Candidate hub (`/me`):** Home · Invite · Interview · Practice · Evidence wallet · Applications · Growth · Offer · Privacy & data

**Video only:** `/scene/:id` title cards.

## 5. Micro-interaction catalogue

Framework: trigger → rules → feedback → loops (Saffer). Motion tokens: 120 / 200 / 320 / 520 ms, `cubic-bezier(.2,.8,.2,1)`; springs `stiffness 420, damping 34`. All motion respects `prefers-reduced-motion`.

| Interaction | Trigger | Feedback | Why |
|---|---|---|---|
| Button press | Click | Ripple from the pointer, 0.97 scale, sheen on hover | Confirms the press instantly (<100 ms) |
| Hero headline | Page load | Words rise from blur in sequence; serif “not noise.” lands last | Sets tone; draws eye to the promise |
| Live intake demo | Loop | Chat bubbles spring in, typing dots, mandate checklist ticks | Shows value before sign-up |
| Q-Match explorer | Drag slider | Mutual index re-springs on each change | Teaches the formula by touch |
| Stat counters | Scroll into view | Count up once | Draws attention to the problem |
| Password strength | Typing | Four segments fill and change colour; hint text updates | Prevents errors early (poka-yoke) |
| Email field | Blur / valid | Green check pops in; error message expands | Inline validation, never on keystroke |
| OTP | Typing / paste | Auto-advance, lift on fill, all green on complete → drawn check | Removes excise |
| Onboarding rail | Step change | Numbered dots fill gold, connector line grows, Q’s tip cross-fades | Progress and narrative |
| Chips / options | Select | Check icon grows in; selected card gets ink border | Clear selected state |
| Q thinking | Async work | Orb pulses with rotating halo; typing dots | Modeless status |
| Mandate builder | Answer given | Sections expand, weight bars fill, changed values flash gold | Shows Q’s work in progress |
| Feasibility review | Constraint conflict | Amber card; options stagger in; chosen option badge | Honest crisis moment |
| Version badge | Mandate changes | Badge re-springs v1 → v2 → v3 | Change is visible and reversible |
| Streaming results | Search | Skeleton rows; cards rise in one by one | Feedback within 1 s, progressive |
| Score rings | Mount / change | Stroke draws to value with count-up | Comparable at a glance |
| Re-rank | Correction | List dims, then cards slide to new positions (FLIP layout); toast with **Undo** | Undo instead of “are you sure?” |
| Drawer | Open detail | Slides in on spring; Esc closes | Keeps list context |
| Toasts | Any async outcome | Slide up, stack, auto-dismiss, optional action | Non-blocking confirmations |
| Kanban drag | Pointer drag | Card lifts and tilts; target lane glows gold; ghost at origin | Direct manipulation |
| Scorecard reveal | Submit | Other reviewer’s card un-blurs | Independence, then comparison |
| Connection drop | Network loss | Pulsing offline icon; “you’re safe” checkpoint card | Failure path with dignity |
| Offer / acceptance | Peak moments | Gold confetti + drawn check | Peak-end rule |
| Revoke access | Toggle | Row slides out; toast with Undo | Reversible privacy action |

## 6. Accessibility notes

- Focus-visible outline on every control (2px gold, offset 2px); switches use `role="switch"` + `aria-checked`; segmented controls use `role="tab"` + `aria-selected`.
- Toasts live in an `aria-live="polite"` region; dialogs set `aria-modal` and close on Esc.
- Body text on paper ≥ 4.5:1; muted text reserved for secondary information.
- Drag-and-drop always has a non-drag path (stage menu / ⌘→).
- Interview offers text, voice and video; low-data mode and accommodations are stated before the first question.
- `prefers-reduced-motion` collapses all animation to near-instant.

## 7. Design tokens (excerpt)

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0b0c0f` | Sidebar, primary buttons, dark surfaces |
| `--gold` | `#c9a04b` | Brand accent, progress, Q |
| `--paper` | `#f8f6f1` | App background |
| `--green / --amber / --red / --blue / --violet` | semantic | Verified / warning / error / candidate-side score / AI advice |
| Type | Plus Jakarta Sans (display), Inter (UI), Instrument Serif italic (accent) | |
| Radius | 6 / 10 / 14 / 20 / 28 | |
