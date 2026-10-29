# J11: one connected journey for the four addendum features and connected email

Sources: *Talent Q Design Audit and Feature Addendum* (29 Oct 2026) §C–§H, and *Addendum E-01: Connected Email and Q-Managed Correspondence* (29 Oct 2026).
Method: `design-skills:journey-mapping`. This is a **future-state service blueprint**: two people (Tobi and Ada) plus the system behind the line of visibility.
Status: a **proto map**, built from the addenda and the existing cast. No user research sits behind it yet; the open questions are listed at the end.
It extends existing work rather than adding a parallel product:
- the correspondence model (`w.threads`);
- the Senior Backend role (`m_backend`, the legacy `w.mandate`, with listing `j_kora_backend`);
- Tobi's Evidence Passport;
- Kora's people, pipeline and calendar.

## Cast and setting

- **Tobi Adeyemi** (T3): a backend engineer in Lagos. Careful about who sees his work. Mostly on a phone, sometimes a laptop.
- **Ada Okafor** (R2): talent partner at Kora Pay. On desktop at work, on a phone between meetings. Her Google Workspace mailbox (`ada@kora.example`) is connected with **send and read** access.
- **Kora Pay's contact policy:** candidates may message about a role **before applying**, in-app or by email to the role's published address (`careers@kora.example`), up to 2 new threads a week per candidate. Personal recruiter addresses are never shown.
- **Hiring campaign:** "Q4 Engineering Expansion", owned by Ada. It holds Senior Backend Engineer (`m_backend`) and Backend Engineer, Payouts (`m_payouts`).

## Blueprint (left to right in time)

| Phase | 1. Discover the role | 2. Reach out | 3. Route and organise | 4. Agree how to judge | 5. Show the work | 6. Review the evidence | 7. Invite and reply |
|---|---|---|---|---|---|---|---|
| **Tobi: actions** | Opens the Kora listing; plays the 2-minute role briefing | Asks Q "can I contact someone about this role?"; edits Q's short question; chooses in-app | Waits; sees "Seen by Kora" | (none) | Answers Ada's request; records a 6-minute walkthrough; pastes a link; consents to share 2 segments with Kora only | Reads what Kora will see; corrects one transcript line | Receives the invitation email and the in-app notice; replies "Thursday 14:00 works" |
| **Tobi: thinking** | "Is the on-call real? Who would I report to?" | "Will this look pushy? Where does it go?" | "Did anyone read it?" | | "What exactly will they see, and for how long?" | "Did Q get my words right?" | "Is this a real invite or an automated one?" |
| **Tobi: feeling** | curious | hesitant → reassured | uncertain | | protective → in control | relieved | **confident (peak)** |
| **Ada: actions** | | | Sees a new candidate-initiated thread; says "put this in the Q4 Engineering campaign"; Q links thread → role → campaign | Asks Q for a rubric; edits weights (raises "Incidents and on-call" from 1 to 2); approves v1 | Asks Tobi (through Q) for a walkthrough of his reconciliation service | Opens Q's evidence report; checks clips at their timestamps; lowers one rating with a reason; marks the report human-reviewed | Says "email Tobi an interview invite for Thursday or Friday"; approves the exact draft; the send fails on an expired token; reconnects; sends once; the reply arrives and Q proposes booking |
| **Ada: thinking** | | | "Which role is this about? Do I have to file it by hand?" | "Are these criteria fair and job-related? Can I change them later?" | | "Is 'Postgres' really shown, or just mentioned?" | "Did it actually go? Will it go twice?" |
| **Ada: feeling** | | | busy → relieved | sceptical → in control | | **trusting (peak)** | anxious → assured (**end**) |
| **Touchpoints (screens)** | Job detail with role briefing (`/c/jobs/j_kora_backend`) | Q sheet; contact card on job detail; candidate messages (`/c/messages`) | Messages hub (`/r/messages`), campaign overview (`/r/campaigns`) | Evaluation studio (`/r/roles/m_backend/rubric`) | Passport: add video (`/c/passport?tab=proof`); consent sheet | Evidence report (`/r/people/p_tobi/video`); scorecard with coverage | Q email composer; connect-email (`/settings/email`); messages hub; calendar |
| **Q's role (frontstage)** | Answers from the listing and the briefing transcript; quotes the timestamp | States the policy; drafts a 3-line question; never invents an address | Proposes the campaign link; summarises the thread | Drafts criteria from the approved brief, guidelines and ESCO skills, with evidence to inspect, questions, methods, weights and anchors | Explains consent scope and expiry; transcribes once; marks moments | Maps moments to criteria; shows the index **with** coverage and uncertainty; never scores unknowns as zero | Resolves sender, recipient, campaign and template; runs checks; reports "accepted by Google", not "delivered"; reads the reply only with read scope |
| **Backstage (system)** | Briefing transcript cached per listing version | Contact policy check, rate limit (2/week), anti-abuse; thread created with `initiatedBy: CANDIDATE` | Thread gets `mandateId` and `campaignId`; audit event | Rubric version stored and frozen; ratings bound to `{rubricId, v}` | Media stored; transcript per content hash; consent record with scope and expiry; unsafe-link check | Review cached by `{contentHash, rubricId, v}`; overrides audited with reason | Transactional outbox; idempotency key per approved draft; provider message id; reply mapped to thread by provider thread id |
| **Pain points** | Watching a long video on a slow connection | Not knowing whether contact is allowed | Filing messages by hand | Fixed, unexplained weights | Uploads failing; oversharing | Black-box scores | Silent failures; double sends |
| **Opportunities** | Chapters and transcript; ask Q instead of scrubbing | Make the policy visible before drafting | Route by saying it | Q drafts, the human edits and approves; versioned | Resumable upload; segment-level sharing | Timestamped, inspectable, overridable | Truthful statuses; reconnect without losing the draft |

## Disruptions and recovery (each one is a test step)

1. **Unsafe link, then upload resumes** (phase 5). Tobi first pastes a shortened link. Q refuses to fetch it ("I can't check what's behind a shortened link") and offers upload instead. The upload drops at 40% when the connection goes, then resumes from the same part.
2. **Consent restriction** (phases 5–6). Tobi shares only segments 1 and 3, about payments and Postgres, not segment 2, which shows a client's dashboard. The report marks criteria that only segment 2 could show as **not shown**, coverage drops, and the index is never treated as zero.
3. **Mid-campaign rubric change** (phase 4/6). After Tobi's review, Ada adds "Mentoring" as a criterion (v2). Q says that Tobi and Ifeoma were assessed on v1. It offers to notify the candidates already assessed, re-assess on v2, or keep v1 for this round. v1 ratings stay attached to v1. Nothing is silently re-scored.
4. **OAuth expired mid-send** (phase 7). Google says the token has expired. The message stays **Approved, not sent**. Ada reconnects (simulated consent screen), and Q sends with the same idempotency key, so it is sent once. A second "send it" says "Already sent at 14:02, accepted by Google".
5. **Unauthorised identity** (phase 7, a curveball from R5). "Send it from the CEO's Gmail" is refused, because only Ada's own mailbox and the shared careers address are hers to send from.
6. **Reply on the wrong thread** (phase 7). Tobi's reply arrives with a changed subject line. Q matches it by provider thread id and sender, and asks Ada to confirm before attaching it.

## Moments of truth

- **Reach out** (phase 2): the first time Tobi learns whether Kora is approachable. The policy must be visible *before* he writes.
- **Evidence report** (phase 6, peak for Ada): trust is won by timestamps she can play, not by a number.
- **Send and reply** (phase 7, end): a truthful status and a single send after a failure. A well-handled failure is remembered more than a smooth send.

## What each phase requires (traceable to requirements)

| Phase | Requirement IDs (see `registry/ADDENDUM-REQUIREMENTS.csv`) |
|---|---|
| 1 | AD-C-01 (role briefing with transcript and chapters) |
| 2 | AD-C-02…09 (candidate-initiated contact, policy, statuses, limits, no invented addresses) |
| 3 | AD-D-01…08 (hiring campaign hierarchy, routing, cross-role board, agency client scoping) |
| 4 | AD-E-01…09 (rubric proposal, edit/approve, versions, change notice) |
| 5 | AD-F-01…08 (consented media, segment sharing, transcript, unsafe links, revoke) |
| 6 | AD-E-10…14, AD-F-09…12 (index with coverage, uncertainty, override, appeal, no prohibited inferences) |
| 7 | E01-01…20 (connected email, sender identity, approval, statuses, replies, follow-ups, failures, audit) |

## Open questions (need research before the map is trusted)

- Do candidates want to message before applying, or would they rather apply with a question attached? (Interview 5 candidates.)
- What weight changes do recruiters actually make to a Q-proposed rubric? (Observe 5 recruiters.)
- Is a 6-minute walkthrough a reasonable ask, and what do candidates refuse to show? (Diary study.)
