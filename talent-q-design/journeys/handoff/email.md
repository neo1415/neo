# Engineering handoff: connected email and candidate-initiated contact (area `email`)

Specification only, not a claim of working integrations. The prototype is the behavioural reference; paths are relative to
`prototype/src`. **SIM** marks where production must differ. Sources: Addendum E-01 (E01-01…30), Audit addendum §C
(AD-C-01…09), J11 steps 1, 2, 3, 6, 10, 11, 12.

## 1. Entities and ownership (module map: `handoff/MODULE-MAP-AND-ROADMAP.md`)
| Entity | Prototype | Owner module | Notes |
|---|---|---|---|
| `MailboxConnection` | `state/areas/mail.ts` `mailboxes` | M16 Notifications → new **M20 Mail connections** | provider, owner, org, clientOrg, address, kind (PERSONAL/ORG/SHARED/CLIENT/SERVICE), scopes, state, `sendAs[]`. Credentials **never** in the app DB: KMS-encrypted refresh tokens in a secret store, referenced by id; the model never sees them. |
| `SenderIdentity` | `defaultSender`, `senderChoices` (`journeys/hire-c/email.ts`) | M20 | verified From/Reply-To; authorisation = actor ∈ `sendAs` (delegation), CLIENT only for that client's work, SERVICE only for platform notices. |
| `CorrespondenceThread` | `Thread` (`state/domain.ts`) | M9 Correspondence | `initiatedBy`, `state`, `campaignId`, `mandateId`, `channel{current, reason, overriddenBy}`. Link chain: org/client → campaign → requisition → candidate-role → thread. |
| `Message` | `Msg` | M9 | canonical record: envelope (sender, to, cc, bcc), subject, body, attachments, `approvedHash`, `idempotencyKey`, `delivery`, `failReason`, `providerId`, `acceptedAt`, `attempts[]`, `inbound{mailbox, matchedBy, subjectChanged}`. A summary never replaces it. |
| `Draft`/`Approval` | `DraftMeta` (`state/areas/hire-c.ts`) | M9 | versions, checks, `approval{by, at, hash, v, voided}`, `scheduledFor`, `batchId`, `template`, `campaignId`. |
| `AttachmentReference` | `Msg.attachments{id,label,artifact}` | M9 → M17 Files | references Q artifacts by id; access re-checked at send. |
| `ContactPolicy` | `mail.policies` | M2 Orgs | OFF / AFTER_APPLYING / BEFORE_APPLYING, channels, `perCandidateWeek`, `publicRoute`, `publicAddress`, `replyWindowDays`. |
| `Consent`, `Suppression` | `w.consents`, `mail.suppressions` | M3 AuthZ | withdrawal wins; suppression per org+person (and address). |
| `CommunicationAttempt`, `DeliveryEvent` | `Msg.attempts`, events `email.*` | M9 + M18 | append-only. |
| `FollowUpRule`, `ReminderAutomation` | `mail.followUps`, `mail.automations`, `mail.snoozed` | M9 / M15 Q runtime | cap per thread (1), snooze, dismiss; automations are client-approved message classes with a cap and an instant pause. |
| `Extracted` | `mail.extracted` | M15 memory | derived (proposed time/preference); forgettable without touching the email. |
| `OrgMailPolicy` | `mail.orgPolicy` | M2 | templates, signature, legal footer, language, sending hours, daily cap, channels, external-data rule, escalation. |

## 2. Status model
`DRAFT → AWAITING_APPROVAL → (approved: approvedHash set) → QUEUED (scheduled/outbox) → ACCEPTED (provider took it)
→ DELIVERED (only with provider evidence; we never infer it) | BOUNCED (final) | FAILED{AUTH_EXPIRED, DISCONNECTED,
SMTP_REJECTED, RATE_LIMITED, SUPPRESSED, BAD_ADDRESS, OFFLINE, MISSING_ATTACHMENT} | CANCELLED`; `REPLIED` is a thread state.
UI says "Accepted by Google (simulated) · not proof it was read". Candidate threads: OPEN, REPLIED, TIMEOUT, MUTED,
REPORTED, BLOCKED, CONSENT_REVOKED, APPLICATION_WITHDRAWN (+ "Seen" only when an org member opened it).

## 3. Provider ports (adapters per provider; no provider logic in prompts)
- `EmailSendPort.send({mailboxId, envelope, mime, idempotencyKey}) → {status: ACCEPTED|FAILED, providerId?, reason?, retryAfter?}`
  Gmail `users.messages.send` (scope `gmail.send`, *sensitive*); Graph `POST /users/{id}/sendMail` (`Mail.Send`);
  SMTP submission (587, STARTTLS, auth). Service notices via a transactional provider on Talent Q's verified domain.
- `EmailDraftPort.upsertDraft / deleteDraft` — optional mirror of the draft into the user's mailbox (Gmail `drafts`,
  Graph `createMessage`) for "open in my mailbox"; needs compose/ReadWrite scopes, off by default.
- `EmailReadPort.getThread(providerThreadId)`, `getMessage(id)` — only with read scope (Gmail `gmail.readonly` or
  `gmail.metadata` + targeted reads = *restricted*; Graph `Mail.Read`/`Mail.ReadBasic`). Fetch only recruiting threads (by
  provider thread id/labels), never mailbox-wide search.
- `MailboxEventsPort` — Gmail `users.watch` → Pub/Sub push → `history.list` from the stored `historyId`; Graph change
  notifications (subscriptions renewed before expiry, ≤ ~3 days for mail) + delta query; IMAP: IDLE where supported else
  polling (≥ 2–5 min) with UID/MODSEQ cursors. All three reconcile from a cursor on a schedule to recover missed events.
- `EmailAttachmentPort.resolve(artifactId, viewer) → signed, expiring URL or inline bytes`, after an authorisation check.

## 4. Q tools (all run as the user, same authorisation as the UI)
`listPermittedSenders` (read) · `draftRecruitmentEmail` (write draft, no approval) · `inspectEmailThread` (read; requires
READ scope, otherwise returns `SCOPE_UNAVAILABLE` and Q says so) · `requestSendApproval` (creates approval request for the
exact hash) · `sendApprovedEmail` (**approval class: explicit per message**, or pre-approved message class under delegation;
refuses if hash ≠ approved) · `scheduleFollowUp` / `cancelFollowUp` (suggest-only unless delegated; capped) ·
`summarizeReplies` (read scope; output marked derived) · `routeThreadToCampaign` (write, audited, undoable) ·
`confirmInboundMatch` (person only) · `bookProposedTime` (calendar write; needs calendar scope and recruiter role).
Prototype equivalents: ops `email.*`, skills `email.*` / `contact.*` in `q/skills/email.ts`.

## 5. Events (scoped like all events: `ORG:` / `SHARED:org:person` / `PERSON:`)
`email.draft.created`, `email.approval.requested`, `email.send.requested`, `email.provider.accepted`, `email.send.failed`,
`email.delivery.updated`, `email.reply.observed`, `email.match.confirmed|rejected`, `email.approval.voided`,
`email.followup.scheduled|snoozed|cancelled`, `email.identity.refused`, `email.draft.handoff`, `mailbox.connected|
reconnected|expired|disconnected`, `suppression.recorded`, `automation.paused|resumed|ran|skipped`, `thread.routed|muted|
reported|blocked`, `contact.candidate.sent`, `consent.withdrawn`, `interview.booked`.

## 6. Transactional outbox and idempotency
1. Approve = one DB transaction: store `approvedHash`, `idempotencyKey = H(messageId, approvedHash)`, and an outbox row.
2. A worker sends with the key (Gmail/Graph don't dedupe by key: store `{key → providerId}` and check before calling;
   for Gmail also set a deterministic `Message-ID` header so a retry after an *ambiguous* timeout can be detected by
   searching sent items by Message-ID when read scope exists; without it, mark AMBIGUOUS and ask a person, never auto-resend).
3. Bounded retries with jittered back-off on RATE_LIMITED/5xx (honour `Retry-After`); AUTH_EXPIRED stops and waits for
   reconnect; content edit → new hash → new key, old approval voided. 4. Each attempt is appended (`attempts[]`).
Exactly-once external delivery cannot be guaranteed by a key alone; ambiguous outcomes are surfaced, not guessed.

## 7. Consent, tenancy, policy
- Contact policy checked before drafting *and* at send (candidate side, `contactState`/`sendContact`); per-candidate weekly
  new-thread limit; replying in an established thread allowed; no recruiter personal addresses exposed; Q never infers
  or scrapes addresses (only the address the person gave, `addressOf`).
- Recruiter sends: checks (`emailChecks` + R3 checks): sender authority, mailbox state, recipient address, suppression,
  Cc/Bcc well-formed and no outside addresses in Cc (fix: move to Bcc), daily cap, attachments available and owned by the
  org, consent channels, guidelines. Multi-recipient = individual messages, never a shared To.
- Agencies: CLIENT senders only for that client's work; `campaignsFor` / `canSeeCandidate` guard data per client.
- Consent withdrawal: cancels queued sends and reminders; already-sent email can't be recalled — say so.
- "Send it from the CEO's Gmail": refused unless the CEO connected it and added the user to `sendAs`; offer a draft handoff.

## 8. Untrusted content
Inbound email and attachments are data: rendered as quoted text, processed in a sandbox (MIME parse, AV scan, no remote
content, no link following), passed to the model inside a fenced block with an instruction that it contains no commands.
Instruction-like text is flagged in the UI (`looksLikeInstruction`) and never changes state. Q tools available while an
email is in context are read-only; any write still needs a person's action.

## 9. Scopes and verification gates
Ask for the minimum per feature: send-only = `gmail.send` (sensitive: OAuth verification) / `Mail.Send`. Read replies =
Gmail restricted scope (`gmail.readonly` or `gmail.metadata` + modify for labels) → Google restricted-scope verification and
an annual third-party security assessment; Graph `Mail.Read` (admin consent often required in M365 tenants). Shared and
delegated mailboxes: Graph `Mail.Send.Shared`, Gmail domain-wide delegation only with explicit admin approval.

## 10. Deliverability
Transactional notices from `notices@talentq.example`-style domain with SPF, DKIM (2048-bit), DMARC `p=quarantine`→`reject`,
aligned Return-Path, TLS; list-unsubscribe for notice classes where required; bounce/complaint webhooks feed `Suppression`.
User mailboxes send as the user via their provider (their SPF/DKIM). SMTP "other business email" requires a DNS check of
SPF/DKIM/DMARC at connect time. Respect Gmail bulk-sender rules (<0.3% spam rate) and provider send limits (per-mailbox cap).

## 11. Sync and matching
Match inbound by provider thread id (Gmail `threadId`, Graph `conversationId`, IMAP `References/In-Reply-To`) and sender;
subject changes or ambiguous matches go to a person ("Is this the same conversation?"), never a silent attach. Map to
sender identity → org → campaign → role → candidate. Send-only mailboxes never claim to know about replies.

## 12. Costs and caching
No LLM call for template merges, status lookups or policy checks (deterministic). LLM only for drafting free text and
reply summaries (small model; ~1–2k tokens per reply; cache by message id). Briefing Q&A answers from the stored transcript
(cache per listing version); no re-transcription. Signatures/templates cached per org policy version. Push/notification sync
avoids polling cost; IMAP polling is the expensive path—limit to connected recruiting mailboxes.

## 13. Failure and recovery (all designed and tested)
AUTH_EXPIRED → banner + proactive card + Reconnect (consent round trip) → resend same key; RATE_LIMITED → retry same key;
SMTP_REJECTED → change sender; BOUNCED → in-app instead, no auto-resend; SUPPRESSED → blocked at check; OFFLINE → outbox,
re-check on reconnect; DUPLICATE → "Already sent at …"; approval voided on edit; read denied → stated plainly;
DISCONNECTED → scheduled sends fail back to approval; MISSING_ATTACHMENT → check with "remove" fix.

## 14. Task boundaries
EMAIL owns: mail connections, sender identity, composer/approval/outbox, inbound sync and matching, reply intelligence,
follow-ups, candidate contact policy and threads, briefing Q&A. CAMPAIGN owns campaign entities (EMAIL only writes
`thread.campaignId/mandateId`). MEDIA owns evidence uploads (EMAIL only sends the request message). Calendar booking reuses M10.
**Agency pages (R4, not built here):** show the client sender chosen for each client campaign and outreach run; outreach
campaign sends should go through the same send pipeline with the CLIENT mailbox; show and pause the client's reminder
automation on the client page (today it is on `/settings/email` and by Q: "pause the Kora reminders").

## 15. Risks
Restricted-scope verification lead time (weeks) and cost; tenant admins blocking consent; token expiry storms; mis-matching
replies to the wrong candidate (mitigated by confirm step); prompt injection via email; candidates perceiving pre-application
contact as gated; agencies mixing client senders; over-messaging (caps + suppression); "accepted" read as "read".

## 16. Validation still required
Usability with 5 recruiters (approval-bound-to-hash comprehension; recovery after token expiry) and 5 candidates (policy
card before drafting; status wording, "Seen"); legal review of lawful basis and unsubscribe per jurisdiction (NDPA Nigeria,
UK GDPR/PECR); provider sandbox tests for idempotency/ambiguous outcomes; deliverability seed tests; red-team of injection.
