# Components

Source: `prototype/src/ui/kit.tsx`, `prototype/src/q/QPresence.tsx`, `prototype/src/q/RunConversation.tsx`, styles in `prototype/src/styles/components.css`.
Live gallery: `#/gallery`.
Tokens: three tiers.
1. `tokens/tokens.json` holds the reference and semantic tiers.
2. `tokens/build.mjs` generates CSS from them and checks contrast.
3. `components.css` holds the component tier.

Names describe structure, not content. No component has more than five variants.

| Component | Purpose | Variants | States | Accessibility |
|---|---|---|---|---|
| **QPresence** | Shows what Q is doing, everywhere it appears | size | idle, listening, thinking, working (measured progress), waiting, done, error, offline | `role="img"` + state label. A ring shape per state, not colour alone. Reduced motion shows a static disc and ring. |
| **Button** | Triggers an action | primary, secondary, quiet, danger (+ compact) | default, hover, active, focus, disabled | Native `<button>`, 44px minimum target, visible focus ring |
| **IconButton** | An icon-only action | none | as Button | `aria-label`, plus a `title` tooltip |
| **Composer** | Talk or type to Q. Voice is never the only path. | none | empty, typing, listening, transcribed (simulated label), disabled | Labelled input. The mic is a toggle (`aria-pressed`). A live hint line announces state. |
| **QSays / MeSays** | One turn of conversation | live (delta) | streaming, complete | Q's live text is announced politely |
| **UsedContext** | Shows what an answer drew on: what you said, a fact, a source, an inference, a memory, a policy | none | none | A list with a label |
| **RunSteps** | Agent progress from `q.step.updated` events | none | running (measured n of total), done, held, failed (recoverable note) | An ordered list. Each step's status is also given as text. |
| **RunConversation** | The run's messages, questions, failures and stop control | none | idle, running, awaiting input, failed, cancelled, replayed after reconnect | Free text and suggested-answer buttons are equivalent |
| **Moment** (`.moment`) | A decision that needs a person | waiting | waiting, approved, sending | Contains real buttons and links |
| **EvidenceBadge** | The evidence state for one requirement | 6 states | none | A distinct shape per state, plus a text label |
| **Banner** | Offline, error, partial or recovered | info, warn, risk, ok | optional action | `role=alert` for risk, otherwise `status` |
| **Field / TextArea / Switch / Choice / Segmented** | Form input | none | default, focus, invalid (Field), checked | Native controls with labels. `aria-describedby` links help and error text. The switch uses `role="switch"`. |
| **Sheet** | A focused overlay | bottom, center | open, closed | `role=dialog`, `aria-modal`, focus moves in and returns, Escape closes |
| **Toast** | Receipts and undo | with action | none | A polite live region |
| **Paper** (`.paper`) | The surface for artifacts Q produces (decision D1) | none | none | The token overrides keep every pair at 4.5:1 or better |
| **PageHead / Arrive** | Page title; content arriving | none | none | `Arrive` skips movement when reduced motion is on |

## Planned, not built yet

- Data chart: J7 progress over comparable attempts. Use the `dataviz` skill.
- Role-map graph with a list alternative.
- Document viewer: CV, offer, interview plan.
- Safe browser / project preview.
- Interview transcript with evidence anchors.
- Agent plan approval with budget.
- Multi-agent fan-in view.
