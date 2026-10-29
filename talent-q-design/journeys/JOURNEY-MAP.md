# Journey coverage map: R1–R5 and T1–T5

One product, one simulated world, one cast:

| Side | Who | Organisation or situation |
|---|---|---|
| Recruiter | **Funmi Adebayo** | Founder, Crumb & Co bakery (new signup) · R1 |
| Recruiter | **Ada Okafor** | Talent partner at Kora Pay, not technical · R2 |
| Recruiter | **Ngozi Eze** | HR lead at Kora Pay; colleagues Seyi (Lagos) and Musa (London) · R3 |
| Recruiter | **Dele Martins** | Talentbridge agency; clients Kora Pay and Medlink · R4 |
| Recruiter | **Bayo Ojo** | Kora engineering manager, sceptical · R5 |
| Candidate | **Amaka Eze** | Graduate · T1 |
| Candidate | **Chidi Nwosu** | Sales rep → product or business analyst · T2 |
| Candidate | **Tobi Adeyemi** | Senior backend engineer, private · T3 |
| Candidate | **Grace Okon** | Care assistant on a phone with a weak connection · T4 |
| Candidate | **Zara Mensah** | Backend engineer, sceptical · T5 |

**Legend.**
- ✓ exists and is reused.
- ◐ exists, but is extended or rebuilt.
- ＋ is new in this phase.

Every curveball is listed with its category:
- **[mind]**: the user changes their mind.
- **[info]**: information is unavailable, conflicting, missing or revoked.
- **[recover]**: interruption, navigation, permission or execution recovery.

## Recruiter journeys

### R1: The confused first-time employer (Funmi)

**Flow**
1. Signup ＋ and verify ＋
2. Work mode ＋
3. Q personalisation ＋
4. Organisation setup ◐ (from the conversation, not a form-first flow)
5. Policies ◐
6. Conversational intake ◐: "I need someone to help me with my business, I don't know what kind of person"
7. Role options artifact ＋, then role choice
8. Budget realism ＋ (pay band versus market, illustrative)
9. Mandate ◐
10. Discovery (planner) ◐
11. Shortlist inspection ◐
12. Outreach approval ◐
13. Scheduling ◐

**State**: org.created, mandate.created and versioned, pipeline.sourced and shortlisted, message.drafted and approved, calendar.hold.

**Curveballs**
- [mind] Switches from "shop manager" to "someone to do my books" mid-intake. Q keeps the shared answers, re-plans and versions the mandate.
- [info] Doesn't know "mandate" or "pay band". Q explains in plain words from its glossary.
- [recover] Clicks "Discard draft" by mistake, then says "undo that". Q restores it from the undo stack.
- [recover] Leaves and returns next day. Q resumes ("We stopped at…").
- [info] Budget ₦80k/month is below market for a bookkeeper. Q proactively raises it with options.

### R2: The non-technical technical recruiter (Ada)

**Flow**
1. Role research ＋ (what a senior backend engineer actually does, in plain language)
2. Comparison ✓
3. Candidate profile page ＋
4. Safe project viewer ＋
5. Evidence provenance ◐
6. Assessment selector ＋
7. Interview questions and adaptive follow-ups ＋
8. Live interview copilot (simulated) ＋
9. Recruiter feedback ＋

**State**: evidence visible only as each candidate disclosed it (T3); interview.feedback; pipeline.

**Curveballs**
- [info] Kunle has an impressive CV but weak evidence. Q separates "unknown" from "weak".
- [info] Zara's GitHub is rate-limited. Q says so, retries, and shows it as unknown.
- [mind] Ada challenges "Talk to Tobi first". Q re-weights by her criterion and shows what changes.
- [info] Kunle disputes the assessment. Q opens a review request, and the result is marked "under review".
- [mind] "Compare on evidence from the last year only". Q's ledger filter changes and the margin notes are rewritten.

### R3: The busy HR team (Ngozi)

**Flow**
1. Team and permissions ＋
2. Organisation guidelines ✓
3. Calendar connections ✓
4. Panel selection ＋
5. Scheduling ◐ across time zones
6. Correspondence inbox ＋
7. Approved channels ◐
8. Reminders ＋
9. Interviews list ＋
10. Feedback from both sides ＋
11. Pipeline board ＋

**Curveballs**
- [info] The preferred slot is taken after the proposal. Q re-checks before sending (existing hard scenario).
- [info] Musa is in London. Q shows fairness for the time zone.
- [mind] Zara asks to reschedule. Q handles the counterproposal.
- [recover] Ngozi is offline. Sends queue; nothing is claimed as sent.
- [recover] An invitation was drafted but not approved. The proactive engine flags it and does not send it.
- [mind] Seyi swaps the panel. Holds are re-validated.

### R4: The high-volume agency (Dele)

**Flow**
1. Agency home ＋ with clients
2. Mandates per client ＋
3. Talent pool and saved searches ＋
4. Concurrent agents ✓ (planner, run per client)
5. Campaign ＋
6. Comparison ✓
7. Team collaboration ＋
8. Submittals ＋
9. Status report document ＋

**Curveballs**
- [info] Kora wants on-site Lagos and Medlink wants remote-only for the same candidate. Q flags the conflict.
- [info] Provider outage for one agent. Recovery, with other clients unaffected.
- [recover] A team member opens a confidential Kora record and gets permission denied, with the reason shown.
- [info] A candidate withdraws consent. Their record is removed from pools and campaigns, and Q explains.
- [mind] Dele interrupts the Medlink search to prioritise Kora. Pause and resume work.

### R5: The difficult, sceptical recruiter (Bayo)

**Flow**: Q conversation, memory correction ✓, policy enforcement ◐, source conflicts ＋, approvals ✓, audit trail ＋.

**Curveballs**
- [mind] Contradictory demands ("senior but cheap, fast but thorough"). Q names the trade-off and asks him to choose.
- [info] "Only men under 30". Q declines and redirects to job-related criteria, and the refusal is logged.
- [recover] "Send it to all of them now" is outside his permission (approve-each-send). Q prepares the sends but doesn't perform them.
- [info] Two sources disagree on Kunle's dates. Conflicting-evidence reconciliation.
- [mind] He corrects a remembered preference. Memory is updated and the old value is superseded.

## Candidate journeys

### T1: The inexperienced graduate (Amaka)

**Flow**: signup ＋ → onboarding ◐ (natural language plus an optional form) → profile → Passport ✓ (now fed by onboarding) → skills exploration → J7 atlas ✓ → entry-level matches ＋ → interview rehearsal ✓ → CV builder ＋ → application ＋.

**Curveballs**
- [info] "I don't know what to write". Q interviews her gently.
- [info] Unreadable CV ✓.
- [info] No employment history. Q uses projects and volunteering and never fabricates.
- [recover] Form mistakes are validated with a recovery path.
- [mind] "Can I skip this?" Q allows it and remembers what is missing.

### T2: The career switcher (Chidi, sales → product or business analyst)

**Flow**: J7 discovery ◐ → transferable competencies ＋ → evidence ✓ → gaps ✓ → plan ✓ → practice ✓ → work sample ✓ → learning resource ＋ → progress ✓ → reassessment ＋ → opportunities ＋.

**Curveballs**
- [mind] Changes goal from PM to BA. Archived goal ✓; the plan re-points.
- [mind] Disagrees with the path. Q explains and adapts.
- [info] Quiz correct but no practical evidence. Practice is never proof ✓.
- [recover] Returns three weeks later. Q summarises what changed (simulated time skip).

### T3: The experienced specialist (Tobi)

**Flow**: Passport ◐ → portfolio upload ＋ → certification ＋ → project preview ＋ → credential verification ＋ → confidential work sample ＋ (a redacted summary plus verifier attestation) → selective disclosure per employer ＋ → recruiter discovery ◐ → advanced interview prep ✓.

**Curveballs**
- [info] His best work is confidential. Q suggests a redacted summary plus a reference attestation.
- [info] The certification issuer is unreachable. Shown as "verification pending", not as failed.
- [info] Revokes Kora's access to a portfolio item. Ada's view updates live and Q tells Ada only that access ended.
- [mind] Challenges Q's analysis. Q shows the basis and corrects it.
- [recover] Different visibility for Kora and the agency, with a per-viewer preview.

### T4: The low-confidence, low-bandwidth user (Grace)

**Flow**: phone-first, with simple language, voice/text/form alternatives, large targets, Lite mode ＋, resumable upload ＋, interrupted session ＋, interview with reconnect ✓.

**Curveballs**
- [info] Doesn't understand "evidence". Q rephrases ("proof of what you did").
- [recover] Voice is unavailable. Text and form alternatives.
- [recover] An upload fails at 60%. Resume from 60%.
- [recover] Accidentally leaves the app. She returns where she was.
- [recover] Connection drops in the interview. Answers are kept and she reconnects.

### T5: The sceptical job seeker (Zara)

**Flow**: job discovery ＋ with employer verification signals ＋ → job detail ＋ → mutual fit ＋ → application ＋ → tracking ＋ → interview prep ✓ → status visibility ＋ → correspondence ＋ → evidence explanation ✓ → consent ＋ → memory review ✓ → deletion ＋.

**Curveballs**
- [info] A saved job closes. Q proactively says so and offers similar jobs.
- [info] The recruiter doesn't respond. Q shows the honest status and a nudge option, with no promises.
- [mind] Challenges the match explanation. Q shows its basis and corrects it.
- [mind] Rejects Q's advice. Q respects it and remembers.
- [mind] Changes notification preferences.
- [info] "Forget my salary". Memory is forgotten, with proof of non-sharing ✓.

## Shared new components

These are owned per area, with one store:

| Component | Area |
|---|---|
| Global Q thread, Q tab and sheet | Q |
| Proactive card | Q |
| Undo toast | Q |
| Glossary | Q |
| Signup, verify, work mode, Q personalisation | Entry |
| Candidate profile, project viewer | Recruiter |
| Pipeline board, inbox, interviews, team | Recruiter |
| Agency home, clients, submittals, report | Agency |
| Audit log | Organisation |
| Settings (notifications, proactive Q, privacy) | Shared |
| Jobs, job detail, applications | Candidate |
| Passport upload and verification, disclosure matrix | Candidate |
| Lite mode | Candidate |
