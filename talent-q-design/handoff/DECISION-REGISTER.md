# Outstanding decisions

This register lists only decisions that are still open. Approved product and design decisions live in `decisions/`. "Founder" means a product or design trade-off that only the founder can make. "Engineering" means the next phase can decide it with the founder informed.

## Decided by the founder (29 Oct)

| # | Decision | What it means for the build | Where it is in the prototype |
|---|---|---|---|

## Still open

| # | Decision | Owner | Why it matters | Prototype's current assumption |
|---|---|---|---|---|
| D1 | **Default discovery rule.** Should candidates be findable only by verified employers by default, with no agencies? | Founder | It decides how big the agency market is and how much privacy candidates get. Agencies currently see only people who registered with them or who opted in. | `VERIFIED_EMPLOYERS` by default (`mock/world.ts` `discoveryRule`). R4's pools shrank accordingly. |
| D2 | **Agency registration.** How a candidate registers with an agency, and what they consent to (pools, campaigns, submittals per client) | Founder | Registration is what allows an agency to see a candidate. It needs its own consent screen. | Registration is seed data. The consent flow is not yet designed. |
| D3 | **Unverified employers.** Should they be able to post roles before verification? | Founder | R1's founder flow depends on it. | Yes. Search waits for verification, and posting creates an applicant relationship. |
| D4 | **Matching and weighting policy.** Which evidence counts, how much, and who may change the weights | Founder plus a fairness review | Affects ranking fairness and legal exposure. | Must-have requirements carry equal weight unless the recruiter changes this. Q's own weighting is labelled as its judgement (R2). |
| D5 | **Assessment validity.** Which assessments are allowed, how they're validated, and how disputes are resolved | Founder plus a psychometrics adviser | Assessments become evidence employers rely on. | A disputed result is left out until it's reviewed (R2). |
| D6 | **J7 occupation and skills taxonomy.** ESCO, O*NET, a local Nigerian taxonomy, or a blend | Founder | Defines the atlas, the gaps and the openings. | A hand-built occupation set (`journeys/career/personas.ts`). |
| D7 | **Countries and credential sources at launch.** Which issuers and business registries to integrate (for example Nigeria's CAC, professional bodies, universities) | Founder (markets), then engineering | Verification is a core promise. | Simulated issuers with honest pending and failed states (T3). |
| D8 | **Languages.** English only at launch, or also Pidgin, Yoruba, Hausa or Igbo, and in voice too? | Founder | Affects T4 (Grace) and plain-words mode. | English, with a plain-words mode. |
| D9 | **Retention periods.** For memories, audit events, applications, interview recordings and files after deletion | Founder plus legal (NDPR/GDPR) | Determines what the deletion receipt can promise (T5). | The deletion receipt lists what is kept (audit, sent messages) and why. |
| D10 | **Interview recordings.** Whether to store audio of voice answers or only the transcript | Founder plus legal | Privacy and cost. | Transcript only. |
| D11 | **Agent cost and limits.** Per-tenant limits for concurrent agents and outreach volume, and when a cost approval is needed | Founder (pricing) | Agency economics; the open SC requirement for cost approval. | Three concurrent agent slots; campaign limits per run, per day and per message (R4). |
| D12 | **Q runtime mapping.** How Talent Q's tools, artifacts and approvals map onto Capital Q's runtime and approval records (contract open questions) | Engineering, with the Q team | Avoids building a second Q kernel. | Contracts mirror Q's stream model (`contracts/run.ts`). |
| D13 | **Production stack, hosting and data residency** | Engineering, with the founder informed | Foundations phase. | Not decided. |
| D14 | **Calendar, email, SMS, speech-to-text and text-to-speech providers** | Engineering | Integrations for scheduling (M10), correspondence (M9) and voice. | All simulated, with honest labels. |
| D15 | **Public marketing site** (atlas screens 001–008, 013) | Founder | Not part of the ten journeys. Proposed as a later phase. | Documented as a future capability (`ATLAS-GAPS.md`). |
