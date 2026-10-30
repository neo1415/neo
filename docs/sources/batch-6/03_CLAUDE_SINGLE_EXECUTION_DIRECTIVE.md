# Claude Code: Talent Q consolidation, UI integration and production readiness assignment

You are working on an EXISTING source-controlled Talent Q design prototype and product-definition repo. Do not produce another parallel product, second screen atlas or separate app. The founder needs a clean path from existing experience design to production.

## Inputs (required)
1. Current working Talent Q repository branch and `product-definition` directories, including `ALL-SPECS.md`, `COVERAGE-SUMMARY.md`, `MODULE-MAP-AND-ROADMAP.md`, `Q-INTELLIGENCE-SPEC.md`, `ADDENDUM-HANDOFF.md`, `DECISION-REGISTER.md`, `ATLAS-GAPS.md`, design system, 183/57/41 registers, `J11-CONNECTED-JOURNEY.md`, and complete 10 journeys.
2. Attached consolidation files: `00_START_HERE_PRODUCT_DECISION.md`, `01_BUYER_EVIDENCE_AND_PRICING.md`, `02_ARCHITECTURE_AND_IMPLEMENTATION_MAP.md`, `04_SOURCE_LEDGER.md`, `05_DEMONSTRATION_AND_ACCEPTANCE.md`.
3. Read-only audited `neo1415/q` shared Q runtime, latest active branch and handoff at time of work. Do not assume a previous branch is current.

## Directives
- **Merge, do not replace:** these consolidated requirements are additive and prioritizing. The existing founder vision, feature atlas, design decisions and audited work remain binding unless explicitly superseded. Produce one change ledger with an ID and original file for each change.
- **Keep branding:** Talent Q, Direction D, gold and near-black/paper, Q everywhere, voice/chat/form, contextual artifacts and candidate/recruiter experiences.
- **Use actual design skills:** inspect installed design skills and read the relevant instructions before UI work. Apply appropriate creative, design-elevation, ux-writing, interaction design, dataviz, critique and motion skill workflows. Preserve the existing design system. Render actual desktop/mobile screens and critique them; no generic AI cards by default.
- **Use source truth:** inspect real files before implementing, and show which existing components/contracts will be extended. Do not duplicate M4/M5/M6/M7/M9/M10/M11/M13/M15, `World` or existing Q tools.
- **Privacy/security first for protected actions:** recruiter search, all Q retrieval, cache and artifacts must honor permissions and evidence revocation; the prototype's known access-control defects may be fixed as part of the illustrative experience. The real backend must enforce authorization, never trust UI checks.
- **Prototype honesty:** the design prototype remains simulated and is not a real hiring service. Production integration is a separate approved implementation phase. Keep simulated provider and score labels.
- **No infrastructure hell:** prefer straightforward, versioned modules, contracts, typed adapters, targeted tests, event/stream UI. No speculative service sprawl. Reuse Q, don't fork it.

## Work A: close the product definition cleanly (short, concrete)
1. Diff the source register with this pack and identify duplicate vs new vs unresolved behavior. Author `CONSOLIDATION-MERGE-LEDGER.md`.
2. Add explicit requirements to existing rubrics/evidence/matching views for **weak CV / proven competence** and **polished CV / insufficient proof**; make them different evidence states, not moral judgments.
3. Integrate verified hiring intent, repeat-assessment avoidance, candidate response commitments and candidate-side feedback without separate UIs where current campaigns, Passport and correspondence already fit.
4. Resolve scope/approval/consent assumptions by defaulting to the safest implementable option and recording genuine unresolved decisions. Do not invent verified employers or validation evidence.

## Work B: make the important interactions visible in the current Direction D prototype
Implement or refine the **existing** paths, for desktop and mobile:
- Recruiter Q Home: can ask "find someone who can troubleshoot Postgres, not just list it on a CV".
- Mandate and rubric: Q drafts job-relevant criteria from the real work; recruiter can adjust, approve and version.
- Sourcing / Compare: show 2 illustrative candidates with contrasting CV polish vs proof, inspect source and gaps; Q can explain why a weak CV still deserves review.
- Candidate Passport: candidate owns specific consent, versions and source classes; no automatic cross-employer sharing.
- Hiring campaign: all requisitions, candidate states, rubric versions, messages and interviews connected without duplicate data.
- Candidate Q Home / J7: available proof and gaps, evidence-only progression and relevant role suggestions.
- Correspondence and schedule: consented contact, approvals, time-zone and collision checks, true provider statuses in future production and clearly simulated ones now.
- Good UI for recruiter evaluation of a nontraditional candidate, candidate explanation and human correction.

Include at least one explicit realistic alternative: Tobi has a bad resume and credible job-relevant evidence; Seyi has a beautiful CV with unverified claims. Q must **not** declare Tobi inherently better without role-relevant proof, and must **not** punish Seyi for having not yet supplied proof. Both can progress to appropriately targeted review.

## Work C: complete the engineering handoff, without prematurely creating microservices
Produce `PRODUCTION-VERTICAL-SLICE.md` mapping each interaction to: route/component, owner module, data entities, permission check, API or Q tool, event, worker if any, caching/latency strategy, audit, and recovery state. Decide in writing how the existing Q kernel will be consumed (versioned package or API), contingent on newest repo audit.

Provide database/entity sketch, task/event contracts and a thin migration plan, but avoid implementing unrelated production features in this design branch. Define a separate branch for first actual production slice after approval. Ensure the design source remains usable.

## Work D: a decisive commercial walkthrough, not months of market research
Create a 4–7 minute recorded desktop journey and a concise phone equivalent showing the weak-CV vs polished-CV case from role brief through evidence to approved next step; source the screens from the running prototype. Update the existing main recruiter/candidate films by chapter rather than re-recording hours without need. Label simulated data prominently.

## Output and quality gate
- Update original 183/57/41 traceability files without deleting rows; correct distinctions among screens, states, routes, integrated simulations and verified integrations.
- Deliver running build/screenshots and annotated journey, not only docs; preserve prior 10 journeys and J11.
- Verify privacy for employer/agency visibility, revoked evidence and caches; check no unknown evidence is scored zero; check rubric version consistency; check no outbound action occurs without requisite approval.
- Report actual finished vs pending, source files changed, commit SHA and no claimed AI skills without invocation evidence.
- Return a **short implementation-start checklist** for real backend work: first 10 tasks, owners/modules, dependencies, acceptance conditions and the latest Q reuse risks.

## Explicit stop condition
Do not reopen the whole concept phase. After this consolidation is implemented and demonstrated, the next task is production Phase 0+1 and the first real Capability-to-Opportunity Loop. Do not delay it to make every one of the 183 planned concepts live in production.

**Begin by inspecting the current repo. Execute real incremental improvements. Commit and provide reviewable outputs.**
