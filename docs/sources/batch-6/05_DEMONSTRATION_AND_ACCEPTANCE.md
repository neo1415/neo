# Talent Q | Exact examples and acceptance tests to bridge prototype to production

## Scenario P1: The candidate with a bad CV
**Actors** Tobi (candidate), Ada (recruiter), Seyi (other candidate). Fictional test data only.
1. Tobi's CV is thin and poorly structured, missing terms "Postgres performance" and "API reliability". The product does not auto-decline.
2. Tobi allows Q to inspect one project repo and share a reviewed troubleshooting work sample with Kora. Q tags the evidence with source, permission, claims, limitations and an optional human reviewer.
3. Ada asks Q "Show me people who have actually fixed performance incidents, even if their resumes are weak."
4. Q retrieves job-relevant evidence, explains *why* Tobi might qualify, shows which criteria are not yet demonstrated, and offers one targeted follow-up.
5. Seyi's CV mentions every term; Q says this is candidate-reported evidence until separately supported, never calls him a liar.
6. Ada can examine both, change the approved role rubric via versioning, and ask Q for questions to resolve the remaining unknowns.
7. Candidate interest and permission gate outreach; Q drafts and seeks required approval, then only claims real send or booking after provider evidence.
8. Candidate views and revokes shared evidence; employer access and cached view update accordingly.

**Pass:** both candidates receive fair, evidence-specific treatment; Q does not equate writing quality with competency or absence of evidence with inability; no cross-scope leak, and human reviewer controls consequential decisions.

## Scenario P2: Candidate who can do the work but lacks formal experience
Amaka has an assessed SQL and spreadsheet work sample but no job title. Q maps the competency to a product/data analyst role, offers an entry-level position with confirmed employer intent, keeps private practice private, and suggests only a missing assessment. If the employer changes the rubric, historic evidence isn't silently re-scored.

## Scenario P3: Employer-led clear ROI
Ada begins with 200 inbound profiles. Q uses legitimate restrictions, not protected-characteristic shortcuts. It can surface source-cited role-relevant evidence and confirmed interest. Ada approves 4 candidates. Track **recruiter time spent** and **actual accepted interviews** against a baseline. Do not claim "we improved quality of hire" from a scripted demo.

## Scenario P4: Agency and privacy
Agency Dele tries to open Kora's confidential rubric or candidates who allow only verified direct employers. Access fails in route, search, Q tools, caching, artifacts and exported reports. Consent changes invalidate existing search previews. Approval follows client-specific policy.

## Scenario P5: The careless/out-of-context user
Ada navigates away mid-comparison, asks Q to send from another person's Gmail, changes desired role, and returns after reconnect. Q restores context, refuses unauthorized sender identity, asks only necessary clarifications, honors previous approved changes and accurately reports pending state.

## Scenario P6: CV and talent documents
Candidate says "make my CV sound stronger". Q improves organization, wording and project descriptions **without inventing jobs, qualifications or assessed skill**. It can attach a verifiable evidence link, if candidate permits it. User approves the final artifact.

## Design quality checks
- Show at desktop 1440 width and mobile 390 width; body text >= 12px. Accessible keyboard and alternative list views for all data visualization.
- Q is accessible from any route; normal navigation remains usable without Q.
- No deliberate loading delays for cinematic visuals; actual streamed events and recovery labels.
- No mandatory one-way video interview. Alternative form/text/voice modes by task and preference.
- Truthful activity labels; screenshots and demo data indicate simulation.
- Work evidence and citations remain inspectable from Q's conversational answer and candidate comparison.

## Measurable pilot gates
1. Candidate supply: permitted, relevant candidates are retrievable from at least one real source or direct consented cohort.
2. Reliability: relevant evidence links usable, source validity and freshness visible, no fabricated credential claims.
3. Employer relevance: human reviewers judge evidence usefulness and acceptable shortlisted candidates using declared rubric and baseline comparison.
4. Engagement: candidate confirms interest and agrees to proposed process, or Q records a factual refusal.
5. Operations: communication and booking receipts verified through provider; no duplicate sends.
6. Willingness to pay: employer pays an agreed bounded pilot fee and shows intent to repeat, after real delivery.
7. Privacy: revoke, tenant boundary and mistaken permission scenarios all pass.

**Do not assert that a pilot needs N customer interviews to begin coding.** Research from communities is enough to justify building a plausible wedge; real adoption and payment then decide whether it is sustainable. Controlled real-world feedback remains necessary for assessment validity, fairness and hiring safety.
