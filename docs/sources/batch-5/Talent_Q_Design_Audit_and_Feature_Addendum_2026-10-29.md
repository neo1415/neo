# Talent Q: Design Review Audit and Feature Addendum

**Date:** 29 October 2026  
**Basis:** User-supplied `Talent-Q-Design-Review.zip` and the founder's new requirements.  
**Purpose:** Amend the executable product blueprint, not begin production engineering.  
**Status:** Source inspection + static screen review; full browser runtime not independently exercised due to the review environment blocking local file and localhost navigation. No claim of production integration or exhaustive usability testing.

## A. What is actually in the review ZIP

- 55 distinct named page captures, each in desktop and phone form: 110 full captures. Additional thumbnails duplicate those captures; **not** 110 distinct page designs.
- 41 before/after pairs, 9 short motion MP4 clips, an offline review page, a bundled compiled application, styles and fonts.
- No editable TypeScript source, source-map-backed repository, engineering handoff, full recruiter/candidate master films, or full requirement/implementation traceability package inside this ZIP. Those may remain in Claude's repository.
- Everything in the standalone prototype is explicitly described as simulated. Do not represent screenshots, recordings or interface actions as live recruitment integrations.

## B. Source-grounded findings and issues

| Area | Observed in ZIP | Recommended specification change |
|---|---|---|
| Recruiter home | Ada has two items requiring attention, but Q's adjacent conversation opens with a generic offer of help. | Context-aware, concise Q opening with actionable relevant observations, respecting proactivity settings; avoid duplicating page copy. |
| Candidate messages | Zara has a Kora Pay conversation, draft area and simulated send. | Extend to candidate-initiated, policy-bound contact before/after application, Q-assisted questions, direct vs mediated outreach, rate limits, reporting and statuses. |
| Agency campaigns | Dele has client-scoped **outreach campaigns** with per-run and per-day limits. | Keep outreach campaigns separate from the broader hiring campaign/requisition workspace that groups roles, pipelines, assessments and outcomes. |
| Role brief | Ada can mark requirements must-have vs nice-to-have; the review describes fixed 1.5x weighting. | Add Q-proposed, employer-editable, job-related rubrics and per-criterion weights, with version approval and explainability; no protected-trait filters. |
| Candidate evidence | Tobi's Evidence Passport marks source-checked, waiting, own uploads and confidential records. | Add candidate-controlled video evidence and authorized project walkthroughs, including transcript, relevant moments, work-sample rubric, source, consent and expiry. |
| Mobile presentation | Grace home features persistent bottom Q composer and navigation, with content scrolling underneath; longer profiles and career maps are reported as difficult. | Require real device usability review, sticky controls, bottom safe areas, in-page index and mobile-specific visualizations. |
| Q proactivity | Zara/Tobi show useful event-triggered notices, but home greeting sometimes remains generic. | Define consistency between Q's contextual summary, proactive notice, main page and task state. |
| Career scoring | Development record separates practice from assessed evidence. | Preserve that distinction; do not treat a quiz response or video appearance as verified competency. |

The review gallery's **own** unresolved issues include long mobile pages, crowded headers, dense career atlas, unspecialized fixed weights, missing agency candidate-registration UI, missing version history for one intake brief, repeated practice tips, and incomplete interview-copilot timing. The prototype has not passed independent manual usability/accessibility testing here.

## C. New feature 1: Candidate-initiated recruiter correspondence

**Journey:** Candidate asks Q, “Can I contact someone about this role?” Q answers what is known from the listing or policy, identifies the employer's communication preference, proposes a concise relevant question and asks whether to send or use the public application channel. The candidate can edit the message, choose permitted channel and see sent/seen/replied/closed statuses when available. If direct messaging is not enabled, Q presents an alternative without inventing a recruiter address.

Required states: new message / draft / ask Q / awaiting permission / approved / queued / sent / undelivered / replied / timeout / muted / reported / blocked / consent revoked / application withdrawn. Candidate can reply to an established thread even when a pre-application initiation policy is stricter, subject to actual organization settings. Prevent mass unsolicited messages and false identities. Employer and agency permissions, rate limits, anti-abuse, time zone and contact privacy are required.

## D. New feature 2: Campaign and requisition organization

**Core hierarchy:**

```
Employer organization
  → Hiring initiative or campaign (e.g., Q1 Engineering Expansion)
      → Requisition / role (e.g., Senior Backend Engineer)
          → Approved mandate version and role-specific assessment rubric
          → Sourcing runs / source snapshots
          → Applications and candidate-role relationships
          → Role pipeline / stage changes
          → Interviews / assessments / correspondence
          → Offer / outcome and retrospective
```

**Agency extension:** agency → client organization → client-specific campaign and roles. Shared underlying candidate identity does NOT imply unrestricted client visibility. Campaign is a grouping/navigation/workload entity, not a duplicate source of truth for the role or candidate. **Outreach campaign** is a separate child of a requisition or client-specific talent pool, not the same thing as a hiring initiative.

Design: campaign overview, cross-role board, client switch, saved filters, responsible owners, approval queue, per-role scorecards, messages by role, stage counts, deadlines, next actions, archive, re-open, audit, empty and conflict states. Q can create, name, organize, summarize and navigate campaigns using natural language while preserving context.

## E. New feature 3: Configurable, role-specific evaluation studio

**First Q proposal:** Q drafts job-related competency criteria from the employer's approved mandate, workplace guidelines and an appropriate job-analysis taxonomy. It identifies the evidence to inspect, interview questions, practical assessment methods, weights and minimum requirements. Recruiter edits or approves; each candidate is assessed against the **same versioned rubric** for the same role and assessment stage. Material mid-campaign changes require notice, audit and principled re-assessment.

**Separate signals:**
- Eligibility requirements with lawful, defensible necessity.
- Demonstrated skills and work outcomes, each with independent evidence provenance.
- Structured interview answers against anchored criteria.
- Domain-specific practical assessments with assessment version and human review.
- Candidate-side compatibility/preferences and availability.
- Coverage/uncertainty, freshness and evidence reliability.

**Prototype arithmetic, NOT a validated employment test:** For criterion j, weight w_j >= 0 and an anchored observed rating r_j in {0,1,2,3,4}, define eligible observed set O. Report

```
Observed role-evidence index = 100 * Σ(j in O) w_j*(r_j/4) / Σ(j in O) w_j
Evidence coverage             = 100 * Σ(j in O) w_j / Σ(all job criteria) w_j
```

Display the score ONLY with the coverage and underlying rubric evidence. For example, 90/100 at 30% coverage is not a strong complete evaluation. Never set unknown criteria to zero or make the provisional index a probability of performance. Limit comparisons to a specified role and validated scoring procedure. Do not produce a global person-worth or universal talent score. Candidate compatibility is separately determined rather than laundering preferences into the skill index. Human review remains required for consequential decisions. Weighting, thresholds and the job-relatedness of the assessment require research and empirical validation.

**Design views:** Q's suggested rubric, side-by-side edit/approve, assessment sources, criteria matrix, video evidence timestamps, uncertainty inspector, recruiter override with reason, rubric revisions, candidate explanation and appeal/correction route.

## F. New feature 4: Consent-based video and voice evidence review

**Feasible:** authorized multimodal systems can process a candidate-supplied recorded project demo, mock interview, work presentation or employer-authorized interview recording, extract transcript and relevant video moments, summarize demonstrable tasks and compare role-specific response content to a job-relevant rubric. Timestamp every supported claim and allow correction, transcript editing and human inspection.

**Do not:** infer honesty, loyalty, personality, emotional stability, gender, age, race, disability, competence or trustworthiness from facial expressions, voice timbre, accent, eye contact, apparent confidence or appearance. Do not silently browse a candidate's unrelated social-media videos using their account or credentials; candidates should explicitly select and authorize relevant media. For spoken-communication job requirements, use task-related, anchored criteria and accessible alternative assessment formats; avoid accent and disability proxies.

**Candidate choice:** upload file; paste authorized link; link a portfolio demo; allow a human-reviewed interview recording if consented. Candidate chooses visibility: private practice, specifically shared with employer, or public profile preview. Video can be rescinded, subject to legal retention requirements. Provide text and form alternatives and accommodation paths.

**Efficient production strategy:** store source media securely; perform transcription once, generate key moments and structured evidence, cache by content hash and authorized rubric version, perform visual frame review only when the job task actually requires it, show uncertainty and time-coded supporting clips; do not run an expensive multimodal evaluation for every page view.

**Design states:** permission and consent, upload/link, ingest/transcribe, transcript review, job relevance, timestamped evidence, rubric mapping, self-review, recruiter human review, scorecard, disputed correction, shared/private visibility, delete/revoke, failed media fetch and unsafe link.

## G. Other cross-system requirements

- One persistent Q composer on every major experience. Q's proactive notice should be grounded in live task/application state and not repeat visible page text. Dismiss, snooze and user preferences persist.
- Candidate-to-recruiter communications, hiring campaigns, candidate evidence, matching and decisions must be connected via one consistent simulated product graph for the design prototype. The production handoff must define canonical relationships, permissions, contracts and external integrations without implementing them yet.
- Do not ask Claude to rebuild real production backend, run large certification suites or generate 30-minute films before correcting the design/source gaps. Existing visual review remains useful; make a short targeted feature walkthrough for the four new features and update user journeys, screens and handoff.

## H. Deliverables for Claude's next pass

1. Add four feature sections to the master product requirements, the role/campaign user-journey maps and the screen atlas.
2. Show **one realistic connected journey**: candidate watches the role briefing, asks Q to contact recruiter, recruiter routes the message into an existing campaign, Q proposes a rubric, candidate supplies a technical video demonstration, Q creates a timestamped evidence report, the recruiter reviews the evidence and asks the candidate to interview. Include three disruptions and recovery states.
3. Produce desktop and mobile interactive prototype screens for the gaps. Use approved Direction D, apply all relevant design skills before drawing, then critique rendered screenshots.
4. Capture a short film from that connected journey with simulation labels.
5. Create an engineering handoff for the four features: domain entities, data ownership, consent and tenant rules, event/API contracts, task boundaries, costs/caching, risks and validation requirements.
6. Update source/vision/coverage registers accurately. No claim of completed AI integration, empirical validation or human usability testing.
7. Preserve the existing candidate messaging, outreach campaign and role brief prototypes and evolve them rather than duplicating equivalent pages.

## I. Public references for future engineering and legal diligence

- Gemini multimodal video understanding: https://ai.google.dev/gemini-api/docs/video-understanding
- HireVue scientific approach to job-related transcript assessment: https://www.hirevue.com/platform/our-science
- UK ICO AI hiring data protection audit and guidance: https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2024/11/thinking-of-using-ai-to-assist-recruitment-our-key-data-protection-considerations/
- EEOC disability accommodations for AI tools: https://www.eeoc.gov/sites/default/files/2022-07/ADA%20and%20AI%20Worker%20Tip%20Sheet.pdf
- SIOP selection validation principles: https://doi.org/10.1017/iop.2018.195
- European Commission AI Act risk classification: https://digital-strategy.ec.europa.eu/en/faqs/navigating-ai-act

**End of addendum.**
