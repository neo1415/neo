# Audit of Batch 1 against the Complete Experience Directive (29 Oct)

| Directive requirement | Batch 1 state | Gap | Severity |
|---|---|---|---|
| Q available everywhere, by text or voice | Q's thread exists on 4 D-native routes. The 11 bridged screens have **no Q at all**; Q home has the voice composer | Q missing on most of the product | Blocking |
| One conversation across pages and sessions | Each journey keeps **its own local entries**. Leaving a page loses the conversation (except the planner, which derives it from its store) | No global conversation | Blocking |
| Q understands natural language | Onboarding, planner and J7 accept typed text but route **only on keywords**. Q home has 6 keyword branches | No dialogue manager, slot memory, correction or undo handling | Blocking |
| Q navigates for the user and preserves state | Q home replies with a link chip. There is no view-state memory and no "go back to the comparison" | No nav stack, no view-state | Major |
| Proactive assistance from real state | None (the only "proactive" item is the static "overnight" brief in the old D direction) | No proactive engine, dismiss or snooze | Major |
| One authoritative app state | **Four stores**: `mock/world` (hiring, scheduling, memory), `services/profile`, `services/agents`, the J7 store in `localStorage`. Onboarding claims never reach the Passport; J7 assessments never reach anything | Disconnected | Blocking |
| Private vs recruiter-visible knowledge | `visibleMemories()` scopes memories only. Evidence sharing is a per-item flag on one candidate (Tobi) | No per-recruiter disclosure, no consent revocation flow | Major |
| Ten journeys, five per side | Fragments of R2 (compare), R3 (calendar), T1 (onboarding), T2/T3 (J7 personas) exist | R1, R4, R5, T4 and T5 are absent; signup, pipeline, inbox, jobs, applications, team, agency and audit are missing | Blocking |
| Dedicated pages | 15 routes; no candidate profile, jobs, applications, messages, pipeline, interviews list, team, settings, agency or audit | Missing pages | Major |
| Curveball testing | Batch scripts test happy paths plus three failures (unreadable CV, rate limit, not connected) | No user-changes-mind, revoked-consent or interruption tests per journey | Major |
| Long master films | 6 short films (25–60 s) | Not continuous journeys | Major |
| Honest simulation | Labels "Simulated" exist on canvases | No explicit statement of Q's understanding limits (rule-based) | Minor |

## Decisions taken to fix the foundations

1. **One store.** `mock/world.ts` becomes the single authoritative store (v4). It holds a typed domain-event log, identities and tenants, mandates, pipeline, conversations, calendar, interviews, jobs, applications, candidate profiles and passports with per-organisation disclosure, J7, planner and Q state. The profile, agents and J7 services become slices of it. The legacy screens keep their `update()` API.
2. **One Q.** A global conversation per identity, persisted, sits beside every route (thread on desktop, Q tab and sheet on phones). Pages contribute context ("you are on Tobi's profile") and actions. Q's replies carry serialisable actions instead of closures, so the conversation survives navigation and reloads.
3. **Q brain.** A dialogue manager with intent detection over imperfect language. It handles slot filling (asking only what is missing and reusing earlier answers), corrections ("actually…"), undo, glossary explanations, multi-intent turns, refusal or redirection of non-job-related criteria, and navigation with view-state restore. It reaches a model gateway when one is configured (`VITE_TQ_MODEL_GATEWAY_URL`, `ModelGatewayRequest` shape). Otherwise it uses a bounded rule engine and says so in the UI. No credentials ship in the prototype.
4. **Proactive engine.** Rules over real state produce suggestions with a stated reason, Act / Snooze / Dismiss, and a user-level setting (off, quiet, normal). Snoozes and dismissals persist.
5. **One cast.** Journeys are connected:
   - Zara applies to Kora (T5) and appears in Ngozi's pipeline (R3).
   - Tobi's selective disclosure (T3) controls what Ada sees (R2).
   - Chidi's J7 practice (T2) never becomes recruiter-visible.
   - The agency (R4) recruits for Kora under tenant isolation.
