# Table of Contents

**Stage 2 research report \| 23 October 2026 \| Product discovery, not a
technical implementation specification**

**Core goal:** Help organizations find and hire suitable, interested
people with less wasted work, while enabling candidates to prove and
improve their job-relevant abilities. The same Q intelligence must serve
different domain experiences; TalentQ should reuse Q's existing
capabilities wherever technically appropriate.

## Executive summary

The credible commercial opening is not natural-language sourcing, AI
interviewing, candidate scoring or autonomous sourcing agents by
themselves. LinkedIn, Juicebox, hireEZ, Greenhouse, Jobberman and
specialist assessment providers already offer substantial versions of
these. TalentQ must make the *complete recruitment relationship* better:
clear mandates, feasible requirements, reliable evidence, mutual
interest, successful screening, timely decisions and candidate growth.

**Most plausible initial buyer:** a Nigerian owner-operated business or
small HR team recruiting one to ten professional roles and currently
juggling job boards, email, WhatsApp, spreadsheets and interviews. This
is a hypothesis to validate, not an established market fact.

**Recommended initial wedge:** recruiter-guided hiring mandate -\>
candidate rediscovery and consented sourcing -\> evidence-linked
shortlist -\> interest and compensation checks -\> interview
coordination -\> human-controlled decision and accurate candidate
updates. Candidate-owned profiles and targeted practice can develop
alongside the hiring workflow, but a full LMS is not required.

**Nonnegotiable realities:** a LinkedIn Recruiter seat is not permission
to scrape profiles; employer cooperation is necessary for true
application-status updates; candidate assessment cannot infer
trustworthiness from social activity; speed is different for cached
views, fresh discovery and third-party verification. Sources
\[S1\]-\[S4\], \[S12\], \[S17\].

### Research-method and evidence labels

- **D (documented):** capability or limitation established in current
  primary product documentation, with source link.
- **C (complaint):** first-person customer or applicant report. This
  establishes that someone experienced a problem, not the prevalence of
  that problem or the absence of a remedy.
- **H (hypothesis):** proposed unmet need, TalentQ design or commercial
  opportunity. Must be validated with customers and, where relevant,
  live competitor testing.
- **R (research evidence):** sample-based survey or published empirical
  findings. Geography and selection bias matter.

This is a *desk-research journey atlas*. It does not represent
authenticated walkthroughs in paid competitor accounts, exhaustive
coverage of the recruiting software market, or completed Nigerian user
interviews. Some features announced in October 2026 are rolling out or
in closed beta. Journey details are documented or modeled, not claimed
as firsthand usability observations.

## 1. Competitor user journeys: what they actually do

### 1.1 LinkedIn Recruiter + Hiring Assistant 2

**Documented journey:** Employer licenses Recruiter and, where
available, Hiring Assistant -\> creates a project or links a job post
-\> refines job requirements -\> Hiring Assistant sources and evaluates
candidates -\> recruiter approves/rejects matches and gives feedback -\>
sends InMail or moves candidates into a pipeline -\> works with
supported ATS integrations, prescreening and scheduling. Hiring
Assistant can learn from actions, qualifications and project activity,
and some preferences carry forward across similar projects. Features
depend on subscription, permissions, rollout and connected ATS. \[S1\],
\[S2\], \[S3\]

**Friction:** recruiter feedback can take several steps to change
qualification decisions; inherited preferences are not universal across
all roles or colleagues; a recruiter reported irrelevant search
constraints on October 22 (C). The product is actively improving exactly
these capabilities, so this is *not* an uncontested or durable gap.
\[S2\], \[S18\]

**TalentQ experiment (H):** display a concise, editable 'Hiring Mandate'
with locked essentials, negotiables, exclusions and evidence thresholds.
Show every change Q makes, its source, and what shortlist results
changed. Ask a recruiter to correct a deliberately wrong search and
measure whether the mistake recurs in later sessions.

**Do not build:** unauthorized profile scraping or imaginary universal
LinkedIn API access. LinkedIn explicitly prohibits unauthorized scraping
and automation. \[S4\]

### 1.2 Jobberman Nigeria

**Documented journey:** Create an employer account -\> choose free,
standard, Pro Recruit or executive recruitment -\> post/approve a
vacancy and criteria -\> collect applicants and filter/rank within ATS
-\> optionally assess or invite passive candidates -\> optionally engage
Jobberman's recruiters -\> review their shortlist, interview and hire.
As of the researched public page, standard listing is advertised at NGN
100,000 per job; Pro Recruit promises five pre-screened candidates in
5-7 business days; executive recruitment includes deeper consultation,
coordination and a replacement commitment. \[S5\], \[S6\]

**Candidate path:** Discover jobs -\> search/filter -\> complete
profile/CV -\> apply -\> receive alerts and employer communications.
App-store reports include missing application history, inconsistent
location recommendations and inability to apply in app (C, not a
confirmed systematic bug). \[S7\]

**TalentQ experiment (H):** mobile-first candidate preference
constraints, one consistent application ledger across channels, role
feasibility coaching, conversational progress, and employer
communication commitments. Do not claim that TalentQ invented
assessment, shortlisting, CV parsing or career training, which Jobberman
already offers.

### 1.3 MyJobMag Nigeria

**Documented employer path:** register -\> choose job-posting/ATS or
candidate search -\> keyword search profiles -\> refine filters -\>
review candidate summaries -\> pay to unlock selected contact details or
use a subscription -\> contact candidates; optionally commission agency
shortlisting, CV screening or prebuilt assessments. The public search
page advertises NGN 4,000 per unlocked contact and a NGN 75,000
one-month plan with ten contact credits. \[S8\], \[S9\]

**Friction (structural, not verified complaints):** finding a profile,
unlocking contact details and reaching an actually interested person are
separate steps. An employer may pay for a contact without a
conversation. This is not proof that MyJobMag's contacts are inaccurate.

**TalentQ experiment (H):** charge for an *engaged,
qualification-checked shortlist* or a recruitment workflow, with
transparent definitions and safeguards, rather than charge solely for
profile discovery. Validate willingness to pay against the real
economics of sourcing.

### 1.4 Indeed Smart Sourcing + Smart Screening

**Documented path:** employer sets up a job or Smart Sourcing
subscription -\> retrieves matched candidates or runs skills/location
search -\> saves candidate lists -\> contacts candidates -\> uses
screening and Smart Fit Score to assist review -\> continues
interviewing and hiring under employer control. \[S10\], \[S11\]

**Friction (structural):** scoring and outreach do not force employers
to maintain funded openings, disclose compensation, or respond to
candidates. Some job seekers report no answers and questionable vacancy
freshness, but anecdotal allegations are not proof of fake listings.

**TalentQ experiment (H):** recruiter-confirmed mandate and periodic
live-status attestations; show 'last confirmed by employer' and avoid
falsely labeling an unconfirmed listing a verified funded vacancy.

### 1.5 Greenhouse + MyGreenhouse + new ecosystem

**Documented employer path:** create requisition -\> publish opening -\>
manage incoming applicants -\> structured screens, interview plans,
scorecards and collaboration -\> decisions and offers. The October 15
ecosystem announcement added positioning around sourcing, AI voice
screening and candidate identity verification; some sourcing components
are closed beta. A conversational Claude integration was announced
October 22. \[S12\], \[S13\]

**Documented candidate path:** create MyGreenhouse profile -\> search
participating employers -\> use quick apply -\> track applications,
tasks and candidate-facing stages *only where employers enable sharing*.
The candidate portal does not contact recruiters for candidates and
cannot display decisions employers have not released. Some third-party
applications may not appear. \[S14\], \[S15\]

**Gap (D):** an employer choosing not to share status cannot be
overridden by candidate-facing software. **TalentQ opportunity (H):**
employer-enforced communication promises with reminders, aging reports,
escalation and plain disclosure when status is unknown. Do not claim
cross-company profiles, voice interviews or candidate tracking are new.

### 1.6 Juicebox Agents + hireEZ

**Documented path:** create search mandate -\> agent proposes/revises
strategy -\> source from public/proprietary datasets and employer
records -\> rank candidates -\> prepare outreach -\> sequence engagement
-\> monitor replies and ATS sync. Juicebox explicitly advertises
adaptive agents, multi-agent sourcing, verified contact data and
autonomy controls. hireEZ advertises an AI recruiting agent designed
around the existing ATS. \[S16\], \[S17\]

**Gap (H):** contact information, evidence currency, candidate
willingness, employer preferences and team permissions can drift during
a long search. The products already target several of these problems.
Compare live error recovery and cost per qualified respondent, not
whether they possess 'agents'.

### 1.7 Ashby, HackerRank/CoderPad, Hack The Box

**Ashby** documents staged pipelines from Lead through Offer and offers
interview scheduling; its September 2026 keynote introduced WhatsApp and
Scheduled Agents. \[S19\], \[S20\]

**CoderPad** provides a collaborative browser-based interview IDE with
executable code, real environments, databases and playback. \[S21\]

**Hack The Box Talent Search** already provides an opt-in cybersecurity
recruiting community, skill/rank-based discovery, postings, and
assessment capabilities. \[S22\], \[S23\]

**TalentQ architectural implication:** for role-specific practical work,
design a common assessment orchestration contract that can launch and
collect results from specialist systems. A synthetic log analysis or
short sales roleplay can be native; a full cyber range or high-quality
coding IDE should be partner-first.

### 1.8 Simplify: candidate-side competitor

**Documented path:** candidate sets up professional profile -\> browses
opportunities -\> visits an application page -\> Simplify Copilot fills
supported fields -\> applicant reviews and submits -\> system logs
application to a tracker. Copilot documentation says it supports a large
proportion of application sites and preserves answers to repeated
questions. \[S24\], \[S25\]

**Gap (H):** faster applications do not guarantee that vacancies are
active, that candidates fit, or that employers respond. TalentQ should
optimize *qualified conversations*, not mass application volume.

## 2. The complete TalentQ service blueprint

There are four interacting workspaces:

1.  **Employer / recruiter:** role mandate, search, shortlist,
    authorized outreach, stages, candidate evidence, interviews,
    decision, offer.
2.  **Candidate:** professional record, opportunities, preferences,
    consent, practice, assessments, applications, feedback and career
    growth.
3.  **Hiring team / assessors:** role scorecards, evidence review, team
    discussion, independent evaluation, approval and exceptions.
4.  **Q and delegated agents:** research, source refresh, ranking,
    appointment coordination, evidence acquisition, status management
    and logging. Q is a shared intelligence/runtime with domain-specific
    tools, not a second isolated assistant.

**Common successful transition:** problem defined -\> funded/approved
role -\> feasible specification -\> authorized candidate pool -\>
evidence sufficient for initial shortlist -\> candidate interest
established -\> proportionate assessment -\> documented human decision
-\> offer accepted or explicit closure -\> outcome feedback.

**Global failure transitions:** unapproved job; infeasible compensation;
forbidden candidate criteria; unreliable source; no consent for contact;
stale profile; duplicate identity; interview no-show; poor connectivity;
specialist assessor unavailable; conflicting scorecards; employer
silent; withdrawn or cancelled vacancy; counteroffer; rejection dispute;
deletion/withdrawal request. None should silently become a fake success
or invented status.

## 3. Ten detailed personas and journeys

### J01. Ada: founder of a 12-person Lagos software startup

**Company:** fictional Lagos B2B software startup. **Hire:** one
experienced backend engineer in four weeks. **Budget:** limited and
uncertain. **Decision makers:** Ada plus technical advisor. **Current
stack:** LinkedIn, Jobberman, WhatsApp, Google Meet, spreadsheet.
**Success:** at least three genuinely qualified, interested, affordable
interviewees followed by one accepted offer.

| Step        | Conventional journey and likely failure                | TalentQ target experience                                               | Recovery / feature                                               |
|-------------|--------------------------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------|
| Trigger     | Engineer leaves; founder writes 'rockstar engineer' JD | Q interviews Ada about actual next-90-day work                          | F01 Mandate intake, F02 role feasibility                         |
| Constraints | Wants 8 skills, seniority and very low budget          | Q separates essentials from trainables; shows trade-offs                | If infeasible, propose narrower role, contract or revised budget |
| Search      | Repeats filters across multiple platforms              | Q searches permitted sources and prior employer applicants              | F03 Source orchestration; disclose missing sources               |
| Shortlist   | 30 CVs, hard to identify actual backend experience     | Q provides evidence-linked comparisons and gaps                         | F04 Evidence cards; unknown not equal to pass                    |
| Contact     | Unanswered messages and unclear expectations           | Q facilitates authorized, personalized invite with compensation band    | F05 consent, interest and availability check                     |
| Interview   | Founder asks ad hoc questions                          | Q produces structured questions and a short relevant technical exercise | F06 Interview plan, F07 assessment adapter                       |
| Decision    | Founder and advisor disagree                           | Independent rubric and explicit disagreements                           | F08 comparison/debrief; founder decides                          |
| Offer       | Candidate rejects pay or receives competing offer      | Q surfaces compatibility early and tracks offer state                   | F09 candidate status, F10 offer coordination                     |

**Key aha moment:** Ada gets a shortlist she can trust *without becoming
an expert recruiter*. **Risk:** a tiny employer may not pay enough to
cover expensive external data and AI interviews. **Test:** paid
concierge pilot with 5-10 SMEs; measure shortlist acceptance and
recruiter hours avoided.

### J02. Amaka: HR manager of an established Nigerian services group

**Company:** fictional 400-person airline-adjacent services group.
**Hire:** six sales, operations and administrative staff across
departments. **Current stack:** LinkedIn Recruiter, job boards, email,
spreadsheets and existing HR software. **Success:** one auditable,
governed process without forcing all departments to replace their
systems.

| Step                 | Existing journey and friction                           | TalentQ target                                               | Recovery / feature                          |
|----------------------|---------------------------------------------------------|--------------------------------------------------------------|---------------------------------------------|
| Request              | Department head emails vague request                    | Q creates role draft and required approval route             | F01, F11 role approvals                     |
| Authorization        | Budget approved in another system                       | Show 'not approved' until explicit authorization             | No external ads or outreach before approval |
| Historical pool      | Existing ATS includes duplicate and outdated applicants | Search authorized previous candidates before buying new data | F12 ATS importer, provenance and dedupe     |
| Parallel roles       | Different managers apply inconsistent criteria          | Role-level mandate and permissions                           | F13 tenant/RBAC and project scopes          |
| Candidate engagement | Conflicting emails and calendars                        | Shared activity ledger, candidate-facing scheduling          | F10, F14 communication ledger               |
| Assess               | Manager feedback inconsistent or late                   | Structured scorecards, reminders and independent evaluation  | F08 and F15 approval escalation             |
| Governance           | Staff attempt unauthorized bulk export                  | Least privilege, logged actions and retention rules          | F16 evidence/audit and retention            |
| Offer                | Approvals delayed for weeks                             | Q identifies bottleneck; never invents an approval           | F15 workflow escalation                     |

**Key aha moment:** Q shows exactly *where hiring has stopped*, which
actor owns the next action and which candidate may withdraw. **Risk:**
integration permissions and data residency. **Test:** two departments,
one import and one live role; count unsynchronized records, time spent
on approvals and staff adoption.

### J03. David: security lead at an MSSP hiring SOC analysts

**Company:** fictional security operations vendor. **Hire:** two SOC
analysts. **Current stack:** LinkedIn, GitHub, manual scenario
exercises, external cyber labs. **Success:** find analysts who can
investigate real evidence rather than merely recite acronyms.

| Step      | Existing journey and friction                   | TalentQ target                                                    | Recovery / feature              |
|-----------|-------------------------------------------------|-------------------------------------------------------------------|---------------------------------|
| Define    | JD says SIEM, Splunk, EDR and incident response | Q converts actual incidents into observable competencies          | F17 competency taxonomy         |
| Discover  | Certifications conceal experience gaps          | Q distinguishes credentials, work evidence and unsupported claims | F04 provenance                  |
| Screen    | Recruiter cannot assess technical answers       | Q conducts structured knowledge interview with rubric             | F06 role interview              |
| Practical | Building a real SIEM is expensive               | Start with synthetic investigation packet or launch partner lab   | F07 assessment adapter          |
| Evaluate  | 'Got the answer' hides reasoning quality        | Capture steps, interpretation, false-positive analysis and report | F18 structured evidence outcome |
| Failure   | Labs crash or tooling inaccessible              | Pause, resume and provide equivalent accessible alternative       | F19 session recovery            |
| Decision  | Q scores contradict lead analyst                | Human review with disagreement and evidence                       | F08, F20 appeal/recheck         |
| Growth    | Junior candidate lacks one trainable skill      | Candidate receives separate, permitted development feedback       | F21 feedback-to-learning link   |

**Key aha moment:** David sees a specific investigation trace rather
than an opaque 87/100 rating. **Risk:** validity of assessments and lab
licensing. **Test:** blind score 20 synthetic or volunteered exercises
with experienced human analysts; compare inter-rater agreement.

### J04. Ibrahim: high-volume customer support hiring manager

**Company:** fictional BPO, Lagos and Ibadan. **Hire:** 80 customer
support associates, variable shifts, 3-week start dates. **Current
stack:** Indeed/Jobberman, manual calls, bulk email, spreadsheets.
**Success:** fill cohort with low applicant dropout and fair screening.

| Step         | Current challenge                             | TalentQ                                                 | Recovery / feature            |
|--------------|-----------------------------------------------|---------------------------------------------------------|-------------------------------|
| Opening      | 80 vacancies receive hundreds of applications | Confirm approved openings, cohorts and salary           | F01, F02                      |
| Entry        | Long forms and phone data costs               | Short mobile-first intake and saved profile             | F22 low-bandwidth flows       |
| Requirements | Candidate can work days but not nights        | Match schedule, location and pay before interviews      | F23 mutual fit check          |
| Screen       | Recruiters repeat identical questions         | Candidate chooses short text/voice live or async format | F06, F24 modality choice      |
| Assessment   | Same customer scenario graded inconsistently  | Roleplay with observable job-related rubric             | F07 scripted simulation       |
| Scheduling   | Many cancellations                            | Slot coordination and graceful rebooking                | F10, F19                      |
| Offers       | Batch approvals and duplicate records         | Bulk safe actions, explicit limits, reconciliation      | F25 governed bulk workflow    |
| No-shows     | Candidate vanishes                            | Polite opt-in reminders and clear withdrawal            | F14 communication preferences |

**Key aha moment:** every candidate sees a manageable process, and HR
sees exactly which step causes attrition. **Risk:** AI screening cost
per applicant and exclusion of people with poor connectivity. **Test:**
compare completion and interview-show rates against existing forms.

### J05. Lara: foreign company recruiting a senior Nigerian remote engineer

**Company:** fictional European SaaS firm. **Hire:** Nigeria-based
senior full-stack engineer. **Decision makers:** head of engineering,
recruiter, payroll/legal. **Success:** trustworthy experience evidence
and an offer that can legally and practically be fulfilled.

| Step         | Current challenge                             | TalentQ                                                               | Recovery / feature               |
|--------------|-----------------------------------------------|-----------------------------------------------------------------------|----------------------------------|
| Location     | 'Remote' means different things               | Q clarifies eligible countries, time zones and legal hiring routes    | F26 eligibility facts            |
| Compensation | Pay currency and contract form unclear        | Clearly compare currency, gross/net and contract preferences          | F23 compatibility                |
| Sourcing     | Profiles don't prove distributed-work skills  | Q requests project, communication and relevant collaboration evidence | F04                              |
| Identity     | Recruiter concerned about impersonation       | Proportionate verification from approved vendors with human oversight | F27 identity verification        |
| Practical    | Live coding introduces timezone friction      | Candidate schedules partner practical assessment                      | F07, F10                         |
| Privacy      | Candidate fears current employer discovery    | Private candidate visibility and disclosure controls                  | F28 privacy setting              |
| Offer        | Entity-of-record, tax and start-date problems | Escalate to employer's qualified legal/payroll personnel              | No automated legal determination |
| Close        | Candidate evaluates multiple offers           | Q keeps preferences current and timelines transparent                 | F09                              |

**Key aha moment:** Q prevents the company from investing in a candidate
for whom remote employment is infeasible. **Risk:** employment law
complexity; not a recommended MVP target without a partner.

### J06. Tunde: owner of a specialist recruitment agency

**Company:** fictional six-person recruitment agency. **Hire:** fills
ten roles for four client companies. **Current stack:** LinkedIn
Recruiter, Juicebox/hireEZ trial, email, agency ATS. **Success:**
profitable candidate delivery without cross-client data leaks or
duplicative work.

| Step        | Current challenge                                                | TalentQ                                                           | Recovery / feature       |
|-------------|------------------------------------------------------------------|-------------------------------------------------------------------|--------------------------|
| Mandate     | Clients change requirements without informing recruiters         | Signed, versioned client mandate and approval                     | F01, F29 version history |
| Reuse       | Same candidate gets approached repeatedly                        | Multi-role dedupe with consent and candidate representation rules | F12, F28                 |
| Team        | Junior sourcer, account manager and client have different access | Tenant and client-level boundaries                                | F13                      |
| Search      | Search errors recur across mandates                              | Agent learns locally without leaking between clients              | F30 scoped memory        |
| Outreach    | Candidate receives duplicate/unsolicited messages                | Shared suppression and communication ledger                       | F14                      |
| Submit      | Client sees candidate sent elsewhere without permission          | Explicit candidate consent to each submission                     | F28                      |
| Fees        | Contract may depend on accepted hire                             | Placement outcome and fee workflow, no unearned claims            | F31 agency reporting     |
| Replacement | New hire leaves early                                            | Transparent post-placement follow-up                              | F32 post-hire signal     |

**Key aha moment:** Q manages relationships and permissions, not just
contact lists. **Risk:** agencies already possess entrenched tools;
migrations are expensive. **Test:** compare one agency's accepted client
submissions per sourcer-hour.

### J07. Chiamaka: Nigerian graduate entering cybersecurity

**Candidate:** recent graduate without a SOC job history. **Goal:**
first junior SOC or security analyst position. **Current stack:**
Jobberman, LinkedIn, TryHackMe, CV PDFs, WhatsApp groups. **Success:**
appropriate interviews driven by demonstrated ability, not unrealistic
seniority filters.

| Step      | Existing friction                              | TalentQ                                                         | Recovery / feature               |
|-----------|------------------------------------------------|-----------------------------------------------------------------|----------------------------------|
| Onboard   | Can't demonstrate experience                   | Q imports CV and asks for labs, projects and education          | F33 candidate-controlled profile |
| Goal      | Vacancies demand 2-5 years experience          | Q separates attainable junior roles from stretch roles          | F34 honest opportunity map       |
| Proof     | Certifications may not reflect practical skill | Optional short synthetic alert exercise with clear rubric       | F07, F18                         |
| Interview | Nervous, cannot afford expensive coaching      | Q practice session with actionable job-related feedback         | F35 rehearsal                    |
| Learn     | Generic courses not tied to role               | Recommend targeted free/paid resources on verified gaps         | F21 learning links; no full LMS  |
| Apply     | Re-enters CV, loses tracking                   | One candidate application ledger for participating employers    | F36 application events           |
| Feedback  | Employer rejects without reason                | Honest employer decision status; separate practice feedback     | F09                              |
| Revise    | Failed assessment becomes permanent stigma     | Reassessment and versioned evidence; candidate controls sharing | F33, F20                         |

**Key aha moment:** her practical evidence gets considered even though
her professional history is short. **Risk:** candidates are unlikely to
pay much; core matching should be employer-funded.

### J08. Femi: passive senior engineer concerned about confidentiality

**Candidate:** already employed, strong salary and specialist skills.
**Goal:** only consider clearly superior offers discreetly. **Success:**
control contact, visibility and disclosure, with minimal time wasted.

| Step            | Existing friction                               | TalentQ                                                        | Recovery / feature       |
|-----------------|-------------------------------------------------|----------------------------------------------------------------|--------------------------|
| Discoverability | Public profile may be inaccurate                | Candidate can claim/update a consented professional record     | F33                      |
| Contact         | Low-value unsolicited recruiting messages       | Candidate-controlled contact rules and opportunity preferences | F28                      |
| Role details    | Vague company, salary and manager               | Q gives employer-verified facts before asking commitment       | F37 mandate transparency |
| Privacy         | Fear of current employer learning of job search | Suppress identifying data before interest/permission           | F28                      |
| Screen          | Asked to complete 3 generic assessments         | Reuse suitable, current, permitted evidence where accepted     | F38 portable evidence    |
| Interview       | Time zones and availability difficult           | Short, carefully scoped scheduling                             | F10                      |
| Offer           | Employer offers below expectations              | Early private compensation compatibility check                 | F23                      |
| Decline         | Recruiter keeps following up                    | One-click decline and suppression                              | F14                      |

**Key aha moment:** candidate is interested precisely because TalentQ
doesn't force disclosure or unnecessary interviews. **Risk:**
demonstrating consent and making data provenance reliable.

### J09. Nkiru: operations professional transitioning to data analysis

**Candidate:** employed administrator with strong Excel and reporting
skills but no formal analyst title. **Success:** be judged on
transferable capability and get a realistic growth plan.

| Step           | Existing friction                          | TalentQ                                                         | Recovery / feature        |
|----------------|--------------------------------------------|-----------------------------------------------------------------|---------------------------|
| Goal           | Keyword job boards reject career switch    | Q elicits work tasks and outcomes rather than titles alone      | F17 skills ontology       |
| Evidence       | Reporting portfolio stored in spreadsheets | Candidate uploads redacted work sample or synthetic equivalent  | F33, F18                  |
| Mapping        | Insufficient SQL exposure                  | Q identifies essential versus trainable competencies            | F34                       |
| Practice       | Generic technical quizzes overwhelm        | Targeted analyst mini-case and feedback                         | F35, F21                  |
| Matching       | Recruiters doubt readiness                 | Transparent fit evidence plus unknowns                          | F04                       |
| Application    | Cannot explain career transition           | Q helps draft an accurate narrative for applicant approval      | F39 application assistant |
| Interview      | Employer assumes traditional career path   | Structured rubric recognizes transferable experience            | F08                       |
| Post-rejection | Generic 'not selected'                     | Candidate receives authorized feedback, not private panel notes | F21                       |

**Key aha moment:** Q reveals adjacent capability that keyword search
misses. **Risk:** convincing recruiters to trust standardized cross-role
evidence.

### J10. Sola: skilled candidate using an older mobile phone and inconsistent data access

**Candidate:** Lagos outskirts; proficient customer service worker,
sometimes has weak internet, needs accessible and asynchronous options.
**Success:** participate without purchasing devices or maintaining
constant video connectivity.

| Step          | Existing friction                               | TalentQ                                             | Recovery / feature     |
|---------------|-------------------------------------------------|-----------------------------------------------------|------------------------|
| Discover      | Heavy pages timeout                             | Lightweight jobs/profile mode                       | F22                    |
| Onboard       | Large CV upload fails                           | Resume upload retry and form alternatives           | F19                    |
| Assessment    | AI voice call drops                             | Pause, retry, switch to text or reschedule          | F24                    |
| Accessibility | Single interview format incompatible with needs | Equivalent accessible accommodation request         | F40 accessibility      |
| Privacy       | Unsure how recording used                       | Upfront, granular recording/transcript notice       | F41 privacy disclosure |
| Score         | Latency and accent distort transcription        | Confirm transcripts; do not grade accent or network | F42 speech recovery    |
| Scheduling    | No stable calendar access                       | SMS/email/WhatsApp where consented and integrated   | F14                    |
| Decision      | Silent rejection                                | Accurate status from participating employer         | F09                    |

**Key aha moment:** TalentQ does not confuse connection quality, device
access or accent with competence. **Risk:** video-centered product
design; offer voice and text equivalents where valid.

## 4. Major blockers and required platform behaviors

| Blocker                                           | Detection                                           | Required behavior                                            | Never do                                             |
|---------------------------------------------------|-----------------------------------------------------|--------------------------------------------------------------|------------------------------------------------------|
| No approved opening                               | No authorized signoff                               | Save as draft, route approval                                | Publish or outreach as if approved                   |
| Impossible combination of salary and requirements | Recruiter trade-off review                          | Show alternative role scopes and uncertainty                 | Invent market salary certainty                       |
| Discriminatory requirements                       | Review age, sex, personal traits and role rationale | Clarify legitimate job requirements, escalate when necessary | Blindly filter by protected traits                   |
| Under-18 candidate                                | Age gate when necessary                             | Apply appropriate guardian/legal safeguards                  | Treat 16-year-old as a normal adult applicant        |
| No lawful data access                             | Source permissions unavailable                      | Skip provider, explain coverage                              | Scrape protected profiles or fabricate source access |
| Duplicate identity                                | Conflicting names/profile links                     | Hold merge for review                                        | Merge unrelated people silently                      |
| Stale contact                                     | Bounce or outdated verification                     | Suppress, request update, provide alternative                | Repeatedly contact old numbers                       |
| Salary mismatch                                   | Preferences and mandate don't overlap               | Seek employer flexibility or stop                            | Recruit as if mutually compatible                    |
| No candidate consent                              | Missing authorized communication ground             | Seek permitted introduction/opt-in                           | Mass-send unsolicited spam                           |
| Employer status unknown                           | ATS has no new event                                | Show 'not confirmed' and last known update                   | Invent progress to reassure applicants               |
| AI interview refusal                              | Candidate preference                                | Provide reasonable human or alternative route                | Penalize refusal as low motivation                   |
| Poor network                                      | Repeated disconnect and network indicators          | Resume from checkpoint and offer text                        | Automatically downgrade candidate rating             |
| Accent / speech recognition error                 | Low transcription certainty, disputes               | Allow transcript correction or human review                  | Infer intelligence from accent                       |
| Technical test failure                            | Provider timeout                                    | Retry or provide equivalent task                             | Mark candidate incompetent                           |
| AI assessment uncertainty                         | Conflicting evidence                                | Escalate to qualified assessor                               | Automatic significant rejection                      |
| Employer indecision                               | Overdue decision deadline                           | Flag owner, escalate, notify candidate accurately            | Promise an offer without approval                    |
| Rejection challenge                               | Candidate contests evidence                         | Human review and amend inaccurate data                       | Hide assessment rationale                            |
| Retention and withdrawal                          | Request to delete/withdraw                          | Scope deletion according to legal controller duties          | Promise instant removal of employer-owned records    |
| Failed payment/verification                       | Third-party failure                                 | Graceful recoverable state                                   | Lose paid order or expose credentials                |

## 5. Feature extraction and dependency map

**Feature priority is based on contribution to measurable recruitment
outcomes, not visual impressiveness.** All features below are proposals,
not proof of existing Capital Q code reuse.

### Foundation (P0): build/verify before a commercial pilot

- **F01 Hiring Mandate Interview:** Q elicits business outcome, role,
  seniority, must-have skills, constraints, budget and decision maker.
  *Journey:* J01/J02/J04/J06. *Success measure:* hiring manager approves
  a usable brief without major rewrite.
- **F02 Feasibility and Trade-offs:** identify impossible bundles,
  invite choice on budget, location, role scope. *Journey:* J01/J04/J05.
  *Measure:* fewer mandates returned for rework.
- **F03 Authorized Source Orchestration:** connect owned ATS,
  candidate-approved profile pool and licensed/publicly permitted
  sources; report coverage. *Journey:* all employer personas. *Measure:*
  true eligible candidates sourced, source failures labeled.
- **F04 Evidence-linked Shortlist:** role-specific requirements,
  verified/self-reported/unknown signals, source freshness, no deceptive
  universal suitability score. *Measure:* manager acceptance rate and
  accuracy of evidence.
- **F09 Candidate Status & Communication:** accurate states and
  last-confirmed timestamps; cannot infer employer decisions. *Journey:*
  every candidate. *Measure:* fewer applicant status inquiries; higher
  closure coverage.
- **F13 Permissions and Data Isolation:**
  employer/candidate/team/assessor roles, client boundaries, permission
  logs. *Measure:* zero unauthorized cross-tenant reads in adversarial
  tests.
- **F14 Outreach Ledger:** permission-aware outbound, opt-out
  suppression, delivery and reply state. *Measure:* valid conversations
  and zero known suppression breaches.
- **F16 Audit, Provenance and Retention:** every source, authorized
  action, model recommendation and human decision attributable and
  reviewable.
- **F23 Mutual Fit Check:** salary, work mode, location, notice period,
  shift availability, candidate interest without unnecessary exposure of
  private detail.

### Workflow expansion (P1): validate through 2-3 employer pilots

- **F05 Interest / Availability Gate:** candidate invite -\> consent and
  actual interest -\> recruiter sees confirmed response; avoid
  misleading 'available' inference.
- **F06 Structured Q Interview:** reusable competency rubric,
  configurable interviewer guidance and disclosure; text/voice/video
  chosen appropriately; human decision.
- **F07 Assessment Adapter:** task definition -\> third-party or native
  lightweight environment -\> verified results -\> grader evidence -\>
  review and retry; don't build full cyber range.
- **F08 Hiring Team Scorecards:** independent ratings tied to observable
  criteria; disagreements visible and not averaged away.
- **F10 Scheduling and Offer Workflow:** calendars, confirmations,
  rescheduling, no-shows, employer-authorized offer state.
- **F12 ATS Ingest / Dedupe:** applicant history import with provenance
  and tenant permissions.
- **F15 Deadline Escalation:** reminders and supervisor escalation when
  approvals or candidate updates stall.
- **F19 Session Resume:** checkpoints, retry budgets, provider failure
  state.
- **F28 Candidate Consent and Visibility:** candidate controls exposure,
  contact rules, personal data sharing and corrections.
- **F33 Candidate-owned Professional Profile:**
  CV/projects/credentials/preferences, privacy controls and
  verified-history sources.
- **F35 Interview Practice:** candidate-facing private rehearsal,
  separated by design from employer screening.

### Strategic options (P2): justify with evidence before building

- **F18 Specialized practical evidence formats** for SOC, sales,
  software, data and operations.
- **F21 Targeted learning recommendations** tied to a demonstrated,
  relevant gap; initially links, short Q explanations and practice, not
  a course marketplace.
- **F25 Governed high-volume hiring** with accessibility and bulk safety
  controls.
- **F27 Proportionate identity checks** with licensed providers and
  review path.
- **F30 Scoped persistent agents** for authorized source refresh,
  approval-based outreach and follow-up; **do not duplicate Q's existing
  workforce if reusable**.
- **F38 Portable assessment evidence** with expiration, role context,
  source reliability and candidate authorization.
- **F40 Accessibility alternatives** and documentation controls.
- **F31 Agency placement operations**, but only if agencies become a
  validated segment.

### Explicitly defer

- Full LMS/course marketplace, generalized high-resolution video avatars
  for every applicant, proprietary SIEM/cyber range, full coding IDE,
  universal automated job applications, automated background
  investigation of Instagram/social circles, autonomous final hiring
  decisions, indiscriminate age/gender targeting, universal LinkedIn
  scraping.

## 6. Journey-to-feature graph: what the features *do* within real lives

**J01 Startup founder:** F01 -\> F02 -\> F03 -\> F04 -\> F23 -\> F14/F05
-\> F06/F07 -\> F08 -\> F10/F09. If F02 reports no realistic hire, route
to a revised mandate, not a fake shortlist.

**J02 Corporate HR:** F11 authorization -\> F01 -\> F12/F13 -\> F03/F04
-\> F14/F10 -\> F08/F15 -\> human approval -\> F09. If external HR sync
fails, preserve source of truth and retry safely.

**J03 SOC recruiter:** F17 -\> F03/F04 -\> F06 -\> F07 + F18 -\>
qualified human evaluation -\> F08 -\> F09. Provider failure routes to
retry/alternate; candidate development routes to F21 only with proper
separation.

**J04 High-volume team:** F01 -\> F22 -\> F23 -\> F06/F24 -\> F25 -\>
F10 -\> F09. Drop-off triggers lighter modality, not candidate
rejection.

**J05 Remote employer:** F26 jurisdiction -\> F23 -\> F04 -\> F27/F28
-\> F07 -\> F10 -\> human payroll review -\> offer. Country eligibility
failure ends recruitment cleanly.

**J06 Agency:** F29 client mandate -\> F13/F12 -\> F30/F03 -\> F14/F28
-\> F08 -\> F31/F32. Missing consent blocks client submission.

**J07 Graduate:** F33 -\> F34 -\> F07/F35 -\> F21 -\> suitable jobs -\>
F36/F09. Practice results never silently pass to employers.

**J08 Passive professional:** F28 -\> role transparency F37 -\> F23 -\>
selected consent -\> F38 -\> scheduling -\> decision. Decline suppresses
follow-up.

**J09 Career switcher:** F33 -\> transferable skills F17 -\> F34 -\>
F35/F21 -\> F04 -\> F39 -\> applications. Unknown formal title is not
automatic rejection.

**J10 Low-bandwidth candidate:** F22 -\> F33 -\> F41 -\> F24/F19/F42 -\>
F09. Technical failure means retry and accessible equivalent, not poor
competency.

## 7. Super-speed: journey-specific performance goals (proposals, not benchmarks)

Q should *feel immediately responsive* while preserving honesty about
long-running work.

| Interaction                     | Design goal to test                                                                          | What user should see                                     | Limits                                                        |
|---------------------------------|----------------------------------------------------------------------------------------------|----------------------------------------------------------|---------------------------------------------------------------|
| Open known role/shortlist       | Local/cached display effectively instant; target sub-second at p95 on representative devices | Already-authorized last-known state                      | Clearly flag stale timestamps                                 |
| Begin conversation              | Acknowledge immediately; target perceptible response under 500 ms where feasible             | Q understands request and starts working                 | First audio response depends on provider/network              |
| Adjust search constraints       | Update visible mandate immediately                                                           | Show locked constraints and version diff                 | Fresh sourcing remains asynchronous                           |
| First useful fresh results      | Progressive stream as evidence is validated                                                  | First candidates appear with source and confidence       | Do not promise all 15 in seconds                              |
| Large source query / ATS import | Background workflow with checkpointed progress                                               | Counts, partial candidates, external providers waiting   | Provider quotas and rights set lower bound                    |
| Start interview                 | Preload consent, rubric and candidate context                                                | Natural opening, fast turn-taking, transcript confidence | Tavus/ElevenLabs require runtime benchmarks                   |
| Technical assessment            | Load prepared lightweight environment                                                        | Task starts promptly                                     | Full lab spin-up and external systems cannot be instantaneous |
| Resume interrupted session      | Recover from durable checkpoint                                                              | No lost answers and no double scoring                    | Must verify recording/transcript consistency                  |

**Architecture approach:** reusable Q runtime with domain pack;
stage-specific prefetch; separate cached read paths from fresh discovery
paths; concurrent authorized provider retrieval; progressive result
presentation; idempotent workflow steps; durable long-running agent
jobs; smart caching with permissions and expiry; provenance on all
recommendations. No claim here that Capital Q already has every building
block: a repository audit is required.

## 8. Commercial prioritization and sequencing

### Candidate beachheads

**Segment A: Lagos SMEs with 1-10 professional roles**: lower enterprise
integration overhead, immediate recruiter time savings, but significant
price sensitivity and low data coverage. **Preferred first experiment.**

**Segment B: Nigerian agencies**: recurring search volume and a strong
need for outreach coordination, but deep competitive overlap and strict
client segmentation.

**Segment C: specialist cybersecurity and technical hiring**: valuable
outcome evidence and a strong assessment story, but comparatively
expensive assessment validation.

**Segment D: high-volume BPO hiring**: large throughput and clear funnel
metrics, but cost sensitivity, accessibility and fraud management
requirements.

### Commercial packaging hypotheses

1.  **Mandate-based sourcing:** monthly small-business tier covering a
    limited number of active roles and shortlist refreshes; avoid
    pricing that encourages indiscriminate applications.
2.  **Qualified-engagement package:** defined number of *consenting,
    interested, preliminarily qualified* contacts. Outcome must be
    precisely defined and auditable.
3.  **Recruitment agent operations:** premium role-based autonomous
    sourcing, compliant outreach, follow-up and reporting within
    spending limits.
4.  **Specialist verification/assessment:** metered pass-through with
    margin and explicit candidate consent.
5.  **Agency workspace:** multi-client permission controls and placement
    reporting only after demand validation.

No numerical pricing recommendation is justified yet: need costs of
data, AI, voice interviews, assessment vendors, recruiter support and
customer willingness to pay. Jobberman's NGN 100,000 standard listing
and MyJobMag's NGN 4,000 contact unlock offer competitive anchors, not a
valid calculation of TalentQ's price. \[S5\], \[S8\]

## 9. Research experiments to falsify the idea

**E1: Hiring mandate usability (8-12 Nigerian hiring managers).** Task:
define a real role through Q; compare with self-written job
specification. Measures: completion time, acceptance of generated spec,
number of edits, budget realism. Failure threshold: managers cannot
reliably state must-haves or reject the brief.

**E2: Shortlist quality (5-10 live but consented hiring mandates).**
Compare employer's usual sourcing with TalentQ plus permitted sources.
Blind manager review of matched profiles; record precision at 5 and 10,
verified-vs-unknown evidence, availability, compensation compatibility,
shortlisting time. No false promise if few source results.

**E3: Candidate interest pilot (50-100 opted-in professionals).** Show
opportunity with salary, work format and status; measure intent, actual
reply, opt-out, willingness to share professional evidence, unwanted
contact complaints.

**E4: Candidate journey study (10-15 job seekers across early-career,
employed, switching, accessible/low-bandwidth).** Observe upload,
profile correction, mobile matching, practice, application tracking,
interview interruption, privacy choice. Capture abandoned steps.

**E5: Technical validity study (two hiring experts plus 15-25 consenting
sample exercises).** Compare job-related scenario rubrics with evaluator
consensus. Explicitly test speech-to-text and lab failure cases. Do not
use an unvalidated aggregate 'hireability' score.

**E6: Recruiter workflow test (two employers).** Capture existing tools,
status delays, miscommunication and decision ownership. Q manages
reminders and logs, but human staff control actual decisions. Compare
elapsed time and candidate drop-off before and after.

**E7: Real willingness to pay.** Offer priced pilot proposals with
concrete deliverables and measure commitments, not polite verbal
enthusiasm.

### Decision gates

- **Proceed with sourcing wedge** only if recruiters judge
  evidence-based shortlists meaningfully more useful than current tools
  *and* unit economics can support employer pricing.
- **Proceed with native Q interviewing** only if candidate completion,
  accessibility and recruiter evidence quality outperform a simpler
  human/video alternative.
- **Proceed with candidate learning** only if it changes actual
  candidate preparation or employer acceptance; otherwise keep targeted
  guidance free or lightweight.
- **Proceed with specialist integrations** where they improve validity
  or cost; defer owned simulation engines until integration costs or
  requirements justify development.

## 10. Important conclusions

**What TalentQ should not try to be:** a bigger LinkedIn database, a
cheaper clone of Greenhouse, a generic ATS, a full learning platform, or
an automated background-surveillance tool.

**What it can try to become:** a continuously improving,
consent-respecting hiring service that helps the employer clarify the
need, finds and verifies relevant people, establishes mutual interest,
routes useful assessments, coordinates decisions, maintains honest
status, and turns allowable skills evidence into future career
opportunities.

**Strongest hypothesis:** a *trusted hiring mandate + evidence-based
interested shortlist + accountable communication* is a better initial
product than any single 'AI recruiter' feature.

**Biggest unsolved business risk:** obtaining lawful, sufficiently rich
data and employer participation without requiring a large two-sided
marketplace before value appears. The practical answer begins with
employer-owned candidate histories, candidate opt-in, permitted provider
data, and real employers willing to pay for better workflows.

**Most urgent next deliverable:** prototype the J01/J02/J07 journey trio
and run paid and observed pilots before committing to a full-platform
build. Confirm what Q's existing runtime, memory, interview, Tavus,
ElevenLabs, authorization and workforce integrations already support by
examining the actual repositories and live deployments, not by
assumption.

## Sources and verification links

\[S1\] LinkedIn, Hiring Assistant 2 announcement (29 Sep 2026):
<https://news.linkedin.com/2026/hiring-assistant-2>

\[S2\] LinkedIn, Hiring Assistant learning and feedback documentation:
<https://www.linkedin.com/help/recruiter/answer/a14870042>

\[S3\] LinkedIn, Create a project with Hiring Assistant:
<https://www.linkedin.com/help/recruiter/answer/a7105879>

\[S4\] LinkedIn User Agreement, scraping and automated access
restrictions: <https://www.linkedin.com/legal/user-agreement>

\[S5\] Jobberman employer plans and hiring products:
<https://www.jobberman.com/employer>

\[S6\] Jobberman Pro Recruit program:
<https://www.jobberman.com/employer/pro-recruit>

\[S7\] Jobberman Google Play reviews (2026, user-reported):
<https://play.google.com/store/apps/details?id=com.jobberman>

\[S8\] MyJobMag candidate search workflow and advertised contact-credit
pricing: <https://www.myjobmag.com/employers/find-candidates>

\[S9\] MyJobMag employer posting/ATS and shortlisting:
<https://www.myjobmag.com/employers/>

\[S10\] Indeed candidate sourcing documentation:
<https://www.indeed.com/help/employers/articles/360015979211?co=IN&hl=en>

\[S11\] Indeed candidate pipeline workflow:
<https://www.indeed.com/hire/resources/howtohub/how-to-build-a-candidate-pipeline>

\[S12\] Greenhouse Orchestrated Hiring Ecosystem announcement (15 Oct
2026):
<https://www.greenhouse.com/uk/newsroom/greenhouse-launches-the-orchestrated-hiring-ecosystem-to-break-ais-hiring-doom-loop>

\[S13\] Greenhouse Claude integration (22 Oct 2026):
<https://www.greenhouse.com/de/newsroom/greenhouse-brings-the-orchestrated-hiring-ecosystem-to-anthropics-claude>

\[S14\] MyGreenhouse candidate FAQ including status limitations:
<https://support.greenhouse.io/hc/en-us/articles/43418495049499-MyGreenhouse-FAQ-for-Candidates>

\[S15\] MyGreenhouse stages and sharing:
<https://support.greenhouse.io/hc/en-us/articles/42201508536091-MyGreenhouse-Stages>

\[S16\] Juicebox recruiting agents: <https://juicebox.ai/agents>

\[S17\] Juicebox agent release, May 2026:
<https://juicebox.ai/blog/introducing-the-next-generation-of-juicebox-agents>

\[S18\] Reddit r/recruiting, reported LinkedIn search error, 22 Oct 2026
(anecdote):
<https://www.reddit.com/r/recruiting/comments/1xcm3nv/linkedin_recruiting_search_issues/>

\[S19\] Ashby interview scheduling introduction:
<https://docs.ashbyhq.com/scheduling-and-interviews-an-introduction>

\[S20\] Ashby September 2026 AI / WhatsApp product keynote:
<https://www.ashbyhq.com/ashby-one/2026/london/product-keynote>

\[S21\] CoderPad live coding interviews:
<https://coderpad.io/platform/coding-interviews/>

\[S22\] Hack The Box talent search:
<https://www.hackthebox.com/business/talent-search>

\[S23\] Hack The Box candidate assessment:
<https://www.hackthebox.com/business/cybersecurity-candidate-assessment-for-hiring>

\[S24\] Simplify Copilot autofill documentation:
<https://help.simplify.jobs/help/articles/2415391-using-copilot-to-autofill-applications>

\[S25\] Simplify application tracker:
<https://help.simplify.jobs/en/articles/2140179-using-the-job-tracker>

\[S26\] Greenhouse 2026 international candidate report, 20 Oct 2026:
<https://www.greenhouse.com/newsroom/6-in-10-job-seekers-are-rethinking-how-they-write-to-avoid-sounding-like-ai-even-as-most-use-it-in-their-search>

\[S27\] CV-Library 2026 Candidate Behaviour Barometer (UK-focused):
<https://www.cv-library.co.uk/recruitment-insight/candidate-behaviour-barometer-2026-the-recruitment-trust-gap/>

\[S28\] Nigeria Data Protection Act section 37 commentary with legal
text: <https://www.twinethos.com/explore/law/ng-ndpa-s37/>

\[S29\] Nigeria Data Protection Commission implementation guidance:
<https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf>

\[S30\] Greenhouse 2026 AI Interview Report:
<https://www.greenhouse.com/newsroom/63-of-job-seekers-have-faced-an-ai-interview-most-havent-had-a-good-one-yet>

\[S31\] LinkedIn ATS integration and Recruiter System Connect:
<https://www.linkedin.com/help/recruiter/answer/a496957>
