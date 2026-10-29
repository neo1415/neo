# Addendum handoff: candidate contact, hiring campaigns, evaluation rubrics, media evidence, connected email

Sources:
- `docs/sources/batch-5/Talent_Q_Design_Audit_and_Feature_Addendum_2026-10-29.md`
- `docs/sources/batch-5/Talent_Q_Email_and_Correspondence_Addendum_2026-10-29.md`

Requirements: `registry/ADDENDUM-REQUIREMENTS.csv` (AD-* and E01-*). Each row's status changes only with evidence.
Journey: `journeys/J11-CONNECTED-JOURNEY.md`.

Per-feature detail, from each feature's builder:
- `journeys/handoff/email.md`
- `journeys/handoff/campaigns.md`
- `journeys/handoff/rubric.md`
- `journeys/handoff/media.md`

This file holds what spans them: the canonical relationships, the statecharts, module ownership, and the rules no feature may break.

This is a specification. **Nothing here is a live integration.** In the prototype, mail providers, transcription, link fetching and scoring are simulated and labelled as such.

## 1. Canonical relationships (one product graph)

```
Organisation (employer | agency)
  └─ [agency] Client organisation ── never implies cross-client visibility
      └─ HiringCampaign ─────────────── groups requisitions; holds no copies
          └─ Requisition (MandateX) ─── brief versions (M6)
              ├─ Rubric ─ RubricVersion (frozen when approved) ─ Rating (bound to {rubric, v})
              ├─ OutreachCampaign (agency, M14) ── a child of a requisition or client pool, not a hiring campaign
              ├─ PipelineEntry (candidate × requisition)
              ├─ Interview / Assessment ─ Rating
              └─ CorrespondenceThread (candidate × org [× requisition] [× campaign])
                    └─ Message ─ CommunicationAttempt ─ DeliveryEvent
Person (candidate)
  ├─ Evidence (Passport, M5) ─ MediaEvidence ─ segments with per-organisation sharing
  │        └─ MediaReview (per media item × rubric version; cache key contentHash+v) ─ proposes Ratings
  ├─ Consent / DiscoveryRule / ContactPolicy relationship
  └─ MailboxConnection (personal) ── a candidate's own sender, send-only by default
MailboxConnection (personal | org | shared | client | service) ─ SenderIdentity (sendAs) ─ scopes {SEND, READ}
```

Rules:
1. A campaign references requisition ids. A role belongs to at most one campaign per organisation. A campaign never stores candidate data.
2. A rating always names its rubric version. A newer version never rewrites an old rating; re-assessment creates new ratings.
3. A message's delivery status comes only from provider evidence. "Accepted" is not "delivered", and "delivered" is not "read".
4. Media is processed only after consent. A recruiter read always goes through `visibleSegments` and `canSeeCandidate`.
5. Inbound email is untrusted content. It is never an instruction, and never matched silently when the match is ambiguous.

## 2. Statecharts (from `design-skills:interaction-design`)

### 2.1 Outbound message (in-app and email)

```
DRAFT ──request approval──▶ AWAITING_APPROVAL ──approve (binds approvedHash)──▶ APPROVED
  ▲                               │                                               │
  └──── material edit (hash changes, approval void) ◀──────────────────────────────┤
APPROVED ──send (idempotencyKey)──▶ QUEUED ──provider ok──▶ ACCEPTED ──provider evidence──▶ DELIVERED
                                       │                       └─ bounce event ─▶ BOUNCED (final)
                                       ├─ AUTH_EXPIRED / DISCONNECTED ─▶ FAILED (retryable; draft kept APPROVED)
                                       ├─ RATE_LIMITED ─▶ FAILED (retry after window)
                                       ├─ SUPPRESSED / BAD_ADDRESS ─▶ FAILED (final; needs a person)
                                       └─ OFFLINE ─▶ stays QUEUED; sent on reconnect
FAILED (retryable) ──retry with the SAME key──▶ QUEUED   (provider dedups; a second "send" after ACCEPTED is DUPLICATE_PREVENTED)
Any state before ACCEPTED ──cancel──▶ CANCELLED.  After ACCEPTED: can't be unsent (the person is told).
```

What the person sees at each state: "Draft", "Waiting for your yes", "Approved, not sent", "Sending", "Accepted by Google (simulated)", "Bounced: address doesn't exist", "Not sent: Google needs you to sign in again", "Already sent at 14:02".

### 2.2 Candidate-initiated thread

```
(contact card shows policy) ──draft──▶ draft ──send──┬─ policy BEFORE_APPLYING / channel allowed ─▶ OPEN
                                                     ├─ policy needs the org's ok ─▶ AWAITING_PERMISSION ─ok─▶ OPEN
                                                     ├─ policy OFF ─▶ (not sent) published route offered
                                                     └─ weekly limit reached ─▶ (not sent) when it resets
OPEN ─org reply─▶ REPLIED ─▶ … ─▶ CLOSED
OPEN ─no reply within replyWindowDays─▶ TIMEOUT ("no reply yet", never shown as a rejection)
either side ─mute─▶ MUTED;  org ─report─▶ REPORTED ─▶ BLOCKED (candidate told: no further messages to this org)
candidate ─withdraw consent─▶ CONSENT_REVOKED (queued items stop; sent ones stay sent)
candidate ─withdraw application─▶ APPLICATION_WITHDRAWN
```

### 2.3 Mailbox connection

```
NONE ─connect─▶ CONSENT (scopes explained: send-only or send and read) ─grant─▶ CONNECTED{scopes}
CONNECTED ─token expires─▶ EXPIRED ─reconnect─▶ CONNECTED   (approved drafts survive; nothing auto-sends on reconnect)
CONNECTED|EXPIRED ─disconnect or provider revoke─▶ REVOKED  (queued sends from it fail with DISCONNECTED)
READ scope absent ⇒ Q never claims to have read replies from that mailbox.
```

### 2.4 Media evidence ingest

```
CONSENT (orgs, purpose, expiry, alternative offered) ─▶ choose source
  ├─ LINK ─ shortened or unknown host ─▶ UNSAFE_LINK (never fetched) ─▶ choose again
  │       └─ allowed host ─▶ FETCHING ─fail─▶ FETCH_FAILED ─retry or upload─▶ …
  └─ UPLOAD ─▶ UPLOADING ─offline─▶ PAUSED ─online─▶ UPLOADING (resumes from the last part)
─▶ TRANSCRIBING (once per contentHash) ─▶ REVIEW (candidate corrects lines) ─▶ READY
READY ─share segments per org─▶ visible to those orgs only ─revoke─▶ REVOKED (retention notice)
```

### 2.5 Rubric version and ratings

```
(none) ─Q proposes─▶ Q_PROPOSED ─edits─▶ Q_PROPOSED (working copy) ─approve─▶ APPROVED v1 (frozen)
APPROVED vN ─edit─▶ draft vN+1 ─approve─┬─ no ratings on vN ─▶ APPROVED vN+1, vN SUPERSEDED
                                         └─ ratings exist ─▶ change notice (affected people) ─▶ decision:
                                              NOTIFY_AND_REASSESS (new ratings on vN+1) | KEEP_FOR_ROUND (vN stays in force for those people)
Rating: Q_PROPOSED (reviewed=false) ─person reviews─▶ reviewed ─override (reason required)─▶ REVIEWER rating with override{from, reason}
         ─candidate disputes─▶ dispute OPEN (excluded from comparisons) ─resolved─▶ RESOLVED
```

## 3. Module ownership (extends `MODULE-MAP-AND-ROADMAP.md`)

| Module | Adds |
|---|---|
| M6 Roles and mandates | `HiringCampaign`; the requisition → campaign link; archive and re-open; campaign read models |
| M9 Correspondence | `CorrespondenceThread` states, candidate-initiated threads, `ContactPolicy`, `Suppression`, `FollowUpRule`, `Approval` bound to a content hash, `CommunicationAttempt`, `DeliveryEvent`, the transactional outbox, idempotency |
| **M20 Mail connections (new)** | `MailboxConnection`, `SenderIdentity`, provider adapters behind `EmailSendPort`, `EmailDraftPort`, `EmailReadPort`, `MailboxEventsPort` and `EmailAttachmentPort` (Gmail/Workspace, Microsoft Graph, SMTP/IMAP, the Talent Q service sender) |
| M11 Interviews and assessments | `Rubric`, `RubricVersion`, `Rating`, overrides, disputes, the scoring contract (index + coverage), fairness checks |
| M5 Evidence Passport + M17 Files | `MediaEvidence`, segment sharing, consent with expiry, transcript, revoke and retention |
| **M21 Media analysis (new, behind M17)** | Transcription once per content hash, key moments, `MediaReview` per rubric version, frame review only on demand. A queue with cost limits; never runs per page view |
| M15 Q runtime | New tools (§4); page-aware openers (AD-B-01); untrusted-content fencing for email and media |
| M3 Authorisation | `visibleSegments`, contact-policy checks, sender authority (`sendAs`), client isolation for client senders |

Build order: M20 sits after M9 (phase 3). M21 after M5 and M11 (phase 4). Campaigns ship with M6 in phase 3. The rubric studio ships in phase 4 with M11.

## 4. Q tools added (approval classes from `Q-INTELLIGENCE-SPEC.md` §5)

| Tool | Approval | Notes |
|---|---|---|
| `listPermittedSenders` | read | Only mailboxes where `sendAs` includes the user |
| `draftRecruitmentEmail` / `draftCandidateQuestion` | none (a draft) | Resolves campaign, requisition, recipient, sender, policy, template |
| `requestSendApproval` | — | Binds `approvedHash` |
| `sendApprovedEmail` | consequential: an approved hash is required | Idempotency key per approval |
| `inspectEmailThread`, `summarizeReplies` | read; READ scope required | Content fenced as untrusted |
| `scheduleFollowUp` / `cancelFollowUp` | reversible | Frequency caps; delegation only within its limits |
| `createCampaign`, `routeThreadToCampaign`, `summarizeCampaign` | reversible, audited | |
| `proposeRubric`, `editCriterion`, `approveRubric` | approval is consequential | Refuses protected or proxy criteria |
| `overrideRating` | consequential: a reason is required | Audited |
| `ingestMedia`, `reviewMedia` | candidate consent required | Cached by content hash and rubric version |

## 5. Open decisions this adds (also in `DECISION-REGISTER.md`)

- **D16 — mail providers and verification.** Gmail restricted scopes need a security assessment, so start with send-only plus in-app replies. Read access should be per tenant, opt-in.
- **D17 — rubric validation.** Who signs off a rubric's job-relatedness. Adverse-impact monitoring. Whether the index is shown to hiring managers or only to recruiters.
- **D18 — media.** Which transcription and analysis provider and region. Retention of media and transcripts after revoke. Whether interview recordings are offered at all (this links to D10).
- **D19 — candidate contact default.** Whether contact before applying is on by default for verified employers, and the default weekly limit.

## 6. Validation still required (nothing here is validated)

- **Rubric weights, thresholds and the index:** job analysis, then criterion-related validation and adverse-impact analysis (SIOP principles) before any consequential use.
- **Media review:** human-reviewed accuracy of transcripts and moment mapping. An accessibility review of alternatives (EEOC, ICO guidance). An EU AI Act high-risk assessment for employment use.
- **Email:** provider verification (Google restricted-scope review), deliverability (SPF, DKIM, DMARC), and abuse controls tested under load.
- **Usability:** the J11 journey with 5 candidates and 5 recruiters (open questions in `journeys/J11-CONNECTED-JOURNEY.md`).
