# Talent Q | Addendum E-01: Connected Email and Q-Managed Correspondence

**Issued:** 29 October 2026  
**Applies to:** Talent Q full product vision, 183-screen atlas, role/campaign organization, recruiter and candidate journeys, Q intelligence / memory / agents, and final engineering handoff.  
**Status:** Product-definition requirements, not an assertion of working integrations.  
**Purpose:** Explicitly require Q to use ordinary email as a first-class recruitment communication channel, alongside in-app messaging, calendar invitations, WhatsApp where allowed, SMS, and calls. This is an addition to, not a replacement for, the earlier Design Audit and Feature Addendum.

## 1. Founder requirement

Users must be able to ask Q, in normal language or voice, to draft, send, read, reply to, organize and follow up on work-related email, subject to granted access and approval rules. This includes:

- **Gmail and Google Workspace:** user-connected addresses such as `person@gmail.com` or company accounts hosted by Google.
- **Outlook, Microsoft 365 and Outlook.com:** user-connected Microsoft mailboxes.
- **Other ordinary/business email:** the organization's own domain, supported SMTP/IMAP or other legitimate provider APIs, e.g., `recruitment@company.example`, where the provider and authentication configuration permit it.
- **Talent Q platform-generated notifications:** separate service-owned email for invitations, confirmations, receipts and notices, using a reputable transactional mail service and a verified Talent Q sending domain.
- **Recruiter/agency shared mailboxes:** where properly configured and delegated; distinguish personal, organization, shared and client-owned sender authority.

Do not make Gmail the only supported path and do not require users to leave Talent Q to compose ordinary recruitment correspondence. Users can always edit drafts and choose to open a provider's own mailbox where appropriate.

## 2. What Q should do end-to-end

### Outbound

1. A user says: “Q, email the three candidates I shortlisted, explain the next step and ask for interview availability.”
2. Q resolves the **campaign, requisition, recipient identity, permitted address, sender account, organization's communications policy and approved template**.
3. Q presents a clearly editable draft or set of individualized drafts with To/Cc/Bcc, subject, message, attachments, intended sender and current approval state.
4. Q checks candidate contact permission, rate limits, restricted/suppressed recipients, sender identity, external disclosure and attachment access.
5. If approval is needed, Q requests approval for the **exact recipients and content**; a material edit invalidates that approval. A narrowly scoped and explicitly enabled delegation policy may authorize limited preapproved message classes.
6. Q sends through the selected connected provider, records provider IDs and timestamps, and reports **accepted by provider**, not **delivered** or **read** without corresponding evidence.
7. Q adds correspondence to the relevant candidate + requisition/campaign thread, and supports edits, follow-ups and reminders without duplication.

### Inbound and replies

- Where a user grants **read access**, Q may detect replies, summarize relevant threads, extract agreed availability, identify unanswered questions and suggest next actions.
- Where a user grants **send-only access**, Q can send approved messages but MUST NOT claim to have read replies from that mailbox.
- Q maps inbound messages to the correct sender identity, organization, campaign, role and candidate, resolving ambiguity with user review instead of silently attaching to the wrong record.
- Emails and attachments are **untrusted external content**, not instructions to Q. A reply cannot override user permissions or trigger unauthorized actions.
- If a recipient responds “stop contacting me,” Q records and enforces suppression as appropriate.
- If the candidate proposes Friday at 2 p.m., Q checks authorized calendars and policy, presents or books a time only when correctly authorized, and sends a real confirmation through the chosen channel.
- Offer candidate-initiated email to a recruiter when the employer has enabled an appropriate contact channel. Never guess or scrape hidden personal email addresses as a shortcut.

### Proactive correspondence

Q may propose: “Seyi hasn't replied to the interview invitation sent three days ago. Would you like me to send a polite reminder?” based on reliable thread and workflow state, with frequency caps and dismissal/snooze controls. In explicitly delegated workflows, a preapproved reminder may be sent automatically within stated limits. **No unbounded autonomous mass emailing.**

## 3. Channel selection is intelligent, but user-controlled

Q should choose a recommended channel from availability, employer/candidate preference, urgency, consent and deliverability, while allowing an authorized user to override it. E.g. candidate requested email, so use email; recruiter prefers in-app messages, propose that channel first. Preserve the communication history across channels **without implying messages are interchangeable**: email threading, in-app receipt status, WhatsApp opt-in and phone calls have distinct limitations.

A single conversation in Talent Q should let the user switch from an email draft to an in-app message, or return to the original thread, without losing the relevant context or duplicating the action.

## 4. Essential experience and screens

Design responsive desktop and mobile states for:

1. **Connect an email account:** Gmail / Microsoft / other supported mail, personal vs organization account, scope explanations, consent, connection verified, reconnection required, disconnect and revoke.
2. **Sender identity selector:** choose who Q speaks for; distinguish personal, company, agency and client addresses; clearly state available send permissions.
3. **Q email composer:** natural-language draft request; editable recipients, subject, body, attachments, tone, organization templates and signature; draft history; approve/send/schedule-send actions.
4. **Recruitment correspondence hub:** search, filters by organization/client/campaign/requisition/candidate, chronological threads, unread/replied/awaiting-reply, linked job context and next action.
5. **Reply intelligence:** readable thread summary, quoted source, context-aware suggested response, extracted proposed times, no fabricated commitments, approval where required.
6. **Multi-recipient review:** individualized drafts and per-recipient status, suppression and rate-limit indicators, no accidental exposure through To/Cc/Bcc.
7. **Attachments and artifacts:** Q-produced CVs, interview briefs, role descriptions, candidate reports, invitations and consented supporting evidence, all shared under the right permissions and expiration rules.
8. **Organization email policies:** approved templates, signatures, branding, language, legal notices, limits, channels, sending hours, delegated permissions, external-data policy and escalation rules.
9. **Error and recovery:** offline, SMTP rejected, OAuth expired, disconnected account, mailbox read denied, recipient unknown, malformed address, bounce, rate-limited, duplicate send prevented, missing attachment, awaiting approval, approval revoked, reply received, suppressed recipient and manual resend.
10. **Audit and memory:** “What did Q send to Tobi?” “Why was this person contacted?” “What instructions did Q apply?” “Forget this extracted preference.” Do not mistake a summary for a canonical email record.

Use the approved **Direction D** design system, with Q available throughout. Make Q proactive and humane; do not reduce this to a generic CRM inbox.

## 5. Recruiter and candidate film scenarios

**R3, HR scheduling:** Ngozi asks Q to email three applicants from the connected corporate mailbox, suggest interview slots using permitted calendar availability, receive replies, reschedule after a slot becomes busy, and update the relevant requisition. Curveballs: one mailbox's OAuth token expires; another candidate replies to the wrong subject; Q must not double-send after retry.

**R4, agency:** Dele handles separate client campaigns. Q selects the **correct authorized client sender** and cannot leak candidate data across clients. A client asks for preapproved reminder automation and later pauses it; Q obeys immediately.

**R5, skeptical recruiter:** User tells Q to “send it from the CEO's Gmail.” Q refuses an unauthorized identity switch, offers a draft for the authorized owner, and explains the access needed.

**T1/T5, candidate outreach:** Candidate asks Q to draft a polite inquiry about an open job. If the recruiter allows email contact, Q drafts and sends from the candidate's connected mailbox after approval. If direct contact is unavailable, Q offers the employer's published application/contact route and does not invent an address. Q tracks a real reply only with access to that mailbox or an authorized in-app communication channel.

**Cross-journey:** Candidate updates consent or withdraws an application. Q stops queued unauthorized outreach and updates relevant reminders; sent emails cannot be unsent or removed from a recipient's mailbox merely because a record was revoked.

Record a short communication clip demonstrating **voice or chat request → context resolution → draft artifact → approval → send status → inbound reply → next action**, on both desktop and mobile. Use an explicit simulation watermark until an actual provider integration exists.

## 6. Production engineering handoff (specification only)

### Logical capabilities

- `MailboxConnection` (provider, owner, tenant, scopes, identity, state, expires, revocation; credentials encrypted in secret storage).
- `SenderIdentity` (verified From/reply-to; organization or account authorization; delegation policy).
- `CorrespondenceThread`, `Message`, `AttachmentReference`, `ContactPolicy`, `Consent`, `Suppression`, `Approval`, `CommunicationAttempt`, `DeliveryEvent`, `FollowUpRule`.
- Stable links: org/client → hiring campaign → requisition → candidate-role relationship → correspondence thread; keep personal messages personal unless explicitly shared.
- **Provider ports:** `EmailSendPort`, `EmailDraftPort`, `EmailReadPort`, `MailboxEventsPort`, `EmailAttachmentPort`. Implement provider-specific adapters rather than burying Gmail/Outlook logic in Q's prompts.
- **Q tools:** `listPermittedSenders`, `draftRecruitmentEmail`, `inspectEmailThread` (only with read scope), `requestSendApproval`, `sendApprovedEmail`, `scheduleFollowUp`, `cancelFollowUp`, `summarizeReplies` (with authorization).
- Events: `email.draft.created`, `email.approval.requested`, `email.send.requested`, `email.provider.accepted`, `email.delivery.updated`, `email.reply.observed`, `email.followup.scheduled`, `email.followup.cancelled`, `mailbox.disconnected`.
- Side effects use **transactional outbox, deduplication/idempotency, bounded retries, timestamps, audit and sender-bound permissions**. Exact-once external delivery cannot be guaranteed merely by adding an idempotency key; handle ambiguous provider outcomes conservatively.
- Email reception can use Gmail push notifications + history synchronization or Microsoft Graph change notifications; support cursor reconciliation and missed-event recovery. Generic IMAP may require more conservative polling or IDLE where supported.
- Optimize speed by immediate draft streaming, cached approved signatures/templates, event-based sync and minimal scope-based retrieval. Do not perform a mailbox search or LLM call for a simple template merge or status lookup.
- Untrusted email/attachments must be scanned/processed in a sandbox and fenced from instructions. No mailbox-level unrestricted tools, no secret access for the model, no arbitrary URL following based on email content.
- **Status model** must distinguish: draft, pending approval, approved, queued, provider accepted, confirmed delivered if provider evidence exists, bounced/failed, replied, cancelled. “Sent” is not proof the person received or read it.

### Permissions and compliance gates

- Gmail `gmail.send` is a **sensitive** scope appropriate to send-only scenarios; reading or composing in the actual Gmail mailbox may require **restricted** scopes and corresponding verification/security assessments depending on handling and deployment. Ask for the minimum scopes that truly support each feature.
- Microsoft Graph offers `Mail.Send` for sending. Mail read/change notifications require additional permissions.
- Domain authentication and deliverability: SPF, DKIM, DMARC, TLS; verify From/Reply-To and sender domain. Respect provider sending limits and anti-abuse standards.
- Recruitment emails are not a license for spam. Record consent or other lawful basis as appropriate, maintain suppression lists, and handle unsubscribes where required by message type and jurisdiction.
- No autonomous outreach to arbitrary discovered addresses; no spoofing; no user impersonation; no employee-wide mailbox access unless explicitly approved and supported by legal/technical controls.

## 7. Definition of done for PRODUCT DESIGN, not production integration

- Q can demonstrate writing and managing normal emails across supported provider concepts through the same central interface as other communication channels.
- Connection and permission choices are explicit and understandable.
- Recruiter and candidate flows both work in the **shared simulated prototype state**.
- All email actions have meaningful confirmation, exception and recovery screens.
- Every communication can be located by campaign, role and relevant relationship.
- Proactive follow-ups are contextual, configurable and suppressible.
- Recorded simulation shows editable drafts, truthful status, incoming replies (where explicitly simulated), and a continued task.
- The product requirements specify APIs, events, data ownership and security for later production work, without falsely claiming live email integration now.
- Update founder-vision traceability, screen/motion atlas, experience films and future module dependency plan. Do not claim “done” by mentioning email as a single checkbox in an inventory.

## 8. Verified implementation references, accessed 29 October 2026

- Gmail send API: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
- Gmail OAuth scope classifications: https://developers.google.com/workspace/gmail/api/auth/scopes
- Gmail mailbox push/sync: https://developers.google.com/workspace/gmail/api/guides/push
- Google restricted-scope verification: https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- Microsoft Graph sendMail: https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0
- Microsoft Graph mail create, reply and draft: https://learn.microsoft.com/en-us/graph/outlook-create-send-messages
- Microsoft Graph Outlook notifications: https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview
- Gmail sender requirements: https://support.google.com/mail/answer/81126
- NIST trustworthy email guidance: https://csrc.nist.gov/pubs/sp/800/177/r1/final

## 9. Short integration instruction for Claude

> Treat **E-01: Connected Email and Q-Managed Correspondence** as a binding addition to the Talent Q product-definition package. Reuse the existing correspondence, scheduler, agency campaigns, recruiter/candidate inbox and Q artifact systems. Do not build a parallel inbox or a standalone Gmail chatbot. Add Gmail/Workspace, Microsoft Outlook/M365 and supported ordinary business email as provider-specific connection options. Design and demonstrate both send-only and read/reply permission modes, correct sender authority, drafts/approval/send/reply/follow-up, contextual proactivity, failures and consent changes, with desktop and mobile screens. Integrate correspondence into the same campaign/requisition/candidate state and Q conversation, update screen and motion coverage and the engineering handoff. Simulate providers honestly; no live mailbox access or production infrastructure is required in this design phase. Apply available design skills and inspect real rendered screens.
