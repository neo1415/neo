# Talent Q: design language

> **Theme:** calm, attentive, *presence*.
> **Concept:** Jarvis meets LinkedIn. You talk to Q, Q works in the background, and Q brings you only the moments that need a person.

**Design read:** an ambient AI recruitment workspace for founders and recruiters, and for job seekers (Africa-first, global). Calm, intelligent, human, voice-first. Trust matters more than flash: hiring affects livelihoods.

**Dials:**
- Creativity: bold
- Density: airy
- Variance: uniform
- Motion: expressive for Q's presence, quick and functional everywhere else

**Context overrides:** no AI-purple, no neon glow, no fake dashboards, no confetti.

## 1. Architecture: one home, not a sitemap

| Pattern | What it is | Why |
|---|---|---|
| **Home** | Q at the centre, Q's current line, one moment, and the dock. | One place where everything lives; nothing to navigate. |
| **Moment** | A card that rises when a person must decide (approve a brief, invite someone, make an offer), then settles away. | Shows decisions, not data. One primary action per moment. |
| **Lens** | A sheet that opens a single detailed view on demand: *Why him?*, the shortlist, live interview, roles and people, what Q is doing. Closes with "Back to Q". | Depth when needed, without permanent clutter. |
| **Dock** | Talk (mic) or type. Shows what Q expects you to say, or suggestions. | Voice-first, never voice-only. |
| **Thread** | Bottom-left, a quiet log of what Q did. | Shows the background work without stealing focus. |
| **Pills** | The focus pill opens *Roles & people*; the working pill opens *What Q is doing*. | Keeps "where is everything?" one tap away (critique finding H6/H7). |

### Two modes, one product

| Mode | For | What it looks like |
|---|---|---|
| **Voice / ambient** (`#/hire`, `#/work`, `#/app/voice`) | "Q, handle this." Onboarding, quick decisions, hands-free. | Q at the centre. One moment at a time. |
| **Workspace** (`#/app/*`, `#/you/*`) | Seeing everything at once and working through it. | A ChatGPT-style rail (new chat, chat history, search) plus overview pages. |

You can switch with one tap either way: **Talk to Q** in the rail, or **Workspace** in the ambient header.

**Recruiter workspace:**
- **Today:** every decision across roles, approvable in place
- **Roles:** each role's pipeline, people, versioned brief and activity
- **People:** every candidate in one table, each with a profile, timeline, evidence and transcript
- **Interviews**
- **What Q did:** the background log, limits and spend
- **Chats:** Q's replies carry the same cards (needs, pipeline, person, shortlist, brief, offer) and can be acted on inline. The composer carries a role **context** chip and a mic that switches to voice.

**Candidate workspace:** Today (the offer, what's coming up), Jobs for you, Applications (live status), My evidence, Privacy, and Chats (offer advice, interview prep, what employers see).

Routes: `#/` landing · `#/start` meet Q and onboard · `#/hire` Ada's home · `#/work` Femi's home · `#/work/interview` Q-led interview · `#/film` film stage · `#/app/today` recruiter workspace · `#/you/today` candidate workspace.

## 2. Tokens

| Token | Value | Role |
|---|---|---|
| `--void` | `#0b0a08` | Background (warm black) |
| `--ink-1/2/3` | `#12110e` `#1a1814` `#23201b` | Tonal elevation instead of shadows |
| `--text` | `#ece6da` | Primary text: 15.9:1 on void |
| `--text-2` | `#a8a194` | Secondary text: 7.7:1 |
| `--text-3` | `#8f887b` | Tertiary text and labels: 5.6:1 (raised from 3.9:1 after the audit) |
| `--gold` | `#d9b56b` | Q's light and accent text: 10.2:1. Never a large fill except the final offer actions. |
| `--ok / --warn / --risk` | `#93c39c` `#e6b366` `#e78d7f` | All above 8:1 on void |
| Radii | 12 · 22 · 999 | Control · card · pill: three only |
| Motion | 100 / 200 / 300 / 500 ms | Enter ease-out, exit ease-in (about 75% of the enter time). Moments use a gentle spring (100/26). |

**Type:**
- Newsreader is Q's voice (light serif, optical sizes).
- Geist is the UI.
- Geist Mono is for system labels (11px uppercase, +0.08em).
- All three are OFL fonts, self-hosted through `@fontsource`.
- The scale is 1.25 on a 16px base.

## 3. Q's presence

Q is drawn on a canvas as a soft, grainy body of light (`src/q/QPresence.jsx`). Its states:

| State | What you see | Meaning |
|---|---|---|
| idle | Slow breathing | Ready |
| listening | Ripples, swells with your voice | Hearing you |
| thinking | A highlight orbiting inside | Working it out |
| speaking | Syllable pulse while words appear | Talking |
| working | Three satellites orbiting | Busy in the background |
| done | A brighter bloom | Something good happened |

State changes are smoothed, never cut. The orb respects `prefers-reduced-motion` by rendering one still frame.

## 4. Q's voice

| Q is | Q is not | Example |
|---|---|---|
| Direct | Chatty | "Seven people fit. Femi stands out." |
| Honest | Salesy | "Senior at $2,000 won't find anyone. Here are options." |
| Humble about AI | Authoritative | "Q advises, you decide." "A ranking aid, not a prediction." |
| Respectful of candidates | Extractive | "Your employer can't see this." "Dropping out never counts against you." |

Q's lines run 8–14 words where possible. Buttons are verb plus object ("Send offer", "Ask if he's interested"). Q never claims to have decided anything.

## 5. Journeys and failure paths

| Ada (recruiter) | Femi (candidate) |
|---|---|
| Lands, presses "I'm hiring" | Is onboarded by Q on his phone |
| Signs in with a link, no password | Drops his CV; approves each claim |
| Tells Q the company and markets; rules are set (NDPA, a human decides) | Sets his minimum pay (private) |
| Describes the role out loud, and a brief builds live | Turns on confidential mode (employer auto-blocked) |
| **Crisis:** the budget doesn't fit "senior" → Q offers options → brief v2 | Receives a confidential invite and checks what they'll see |
| Q searches overnight, only consented sources | Says yes, and is interviewed by Q |
| One decision in the morning: Femi, *Why him?*, then the shortlist | **Crisis:** signal drops → nothing lost → low-data text mode |
| Sends the invite (undo window) | Gets the offer, checked against his terms, and accepts |
| Watches the interview live, with Q's notes | |
| **Peak:** makes the offer (human confirmation) | |
| **End:** "That's your hire, Ada." | **End:** profile hidden, evidence kept |

The two devices are live-synced over a `BroadcastChannel`: Ada's invite lands on Femi's phone, and Femi's answers stream into Ada's live view. When run alone, each side simulates the other, so the demo never dead-ends.

## 6. Review log

**Skills used:**
- `design-superpowers:creative`: design read, dials, style library, and three directions. You picked Ambient presence.
- `design-elevation`: elevation protocol and interrogation checklist.
- `design-superpowers:design`: layout composition.
- `interaction-design`: micro-interactions, peak-end, excise.
- `ux-writing`: Q's voice.
- `journey-mapping`: storymap of the film.
- `design-critique`: heuristic pass.
- `accessibility-audit`: contrast math plus axe-core.

**Critique fixes:**
- Focus and working pills now open lenses (H6/H7, H1).
- The invite has an undo window (H3).
- Q's line measure was fixed to avoid tall text towers.
- Early taps are queued so they are never dropped.

**Accessibility:**
- `--text-3` raised to AA.
- Landmarks and headings added; the activity thread is now an `<aside>`.
- axe-core (WCAG 2.2 AA + best practice) reports no violations on the landing, start, recruiter home and interview screens.
- Everything voice-driven also works by typing or tapping.
