# Design pass · EMAIL (addendum E-01 connected email; audit §C candidate-initiated contact)

Routes: `/settings/email` (both sides), `/r/messages` (correspondence hub + composer), `/c/messages`, `/c/jobs/:id` (role
briefing + contact card), plus Q cards `email.reply`, `email.status`, `email.batch`. Captures: `captures/review/after/
{desktop,phone}/{u_ada_settings_email,u_ada_r_messages,p_tobi_c_jobs_j_kora_backend,p_tobi_c_messages,p_tobi_settings_email,
u_dele_settings_email}.png`; journey states `captures/cx/email/01–09`, `captures/cx/contact/01–04`.
Tests: `features/email.mjs` 62/62, `features/contact.mjs` 32/32; R3 48/48, R4 72 PASS, R5 66/66, T3 54/54, T5 52/52.
No page scrolls sideways at 390 px. Everything provider-shaped is labelled Simulated; "Demo" controls are labelled Demo.

## Skills invoked (Skill tool) → screens → changes
- **interaction-design** → send pipeline, composer, settings. Statechart: approval binds to a content hash (FNV over sender,
  channel, to, Cc, Bcc, subject, body, attachments); a material edit voids it and says so ("An earlier approval no longer
  applies"). Delivery is a separate axis: QUEUED → ACCEPTED | FAILED(reason) | BOUNCED; a failure keeps the approval and the
  idempotency key, so the recovery (Reconnect / Try again (same key) / Send in Talent Q instead) is the primary action and a
  retry can't double-send; "send it again" records DUPLICATE_PREVENTED. Attempts are shown as a small timeline. Reconnect
  is a round trip that returns to the draft (consent screen → back to `/r/messages`). Block uses an in-place confirm.
- **ux-writing** → every error and recovery string follows "what failed. why. what to do": "Not sent. Google says the
  sign-in for ada@… has expired, so nothing was sent. Your approval of this exact version is kept… Reconnect, then send
  again: it goes once, with the same key." Status words are truthful: "Accepted by Google (simulated) · not proof it was
  read". Consent copy names each permission and what is *not* asked for. Candidate timeout: "No reply yet … That isn't a
  rejection." Q's refusal for the CEO's Gmail names what Ada may use and the access needed.
- **design-elevation** → one elevation level (reply card and failure alert are flat bordered panels inside the thread
  sheet); envelope rows read as a letter header (mono labels, 96 px gutter, single rule); the simulated video is an ink
  "screen" with the caption in Fraunces so it reads as a player, not a card; gold only on Q's own proposal (reply card rule).
- **design-critique** → rendered captures, heuristics + severity (below), then fixes and re-renders.
- **dataviz** → not used: there are no charts; the attempts record is a list (time + result + line style), the right form.

## Rendered critique findings (most severe first) and fixes
1. (Sev 3, H8/Hick) Hub: three filter selects and eight state chips stacked above the list on desktop and phone →
   search stays visible; campaign/role/channel collapse behind one "Campaign, role, channel (n)" control. Pair 04.
2. (Sev 3, H1) Job page briefing rendered as a pale card; nobody would read it as a video → ink screen, caption, chapter
   label, dark play bar. Pair 02.
3. (Sev 3, phone) Job page ~8,700 px tall at 390 → `PageIndex` (Briefing · Ask them · Fit · For you · Employer). Pair 03.
4. (Sev 3, H8) Threads became walls of full email bodies → sent bodies clamp with "Show the whole message"; failed draft
   keeps the recovery alert at the top of the composer; in-thread `PageIndex` when there's a reply and a draft. Pairs 05, 06.
5. (Sev 2, H5) "Block" was one tap → `ConfirmButton`. (Sev 2, H8) attachments list dominated the composer → disclosure
   with a count. (Sev 2, H4) Checks read "Sender Sender" → "Sending address". (Sev 1) Settings showed ISO dates →
   "2 Oct 2026"; the Talent Q service row claimed to send "messages you approve" → "Talent Q's own notices, never as you".

## Pairs (`captures/review/pairs/email/`)
- 01 Settings desktop: first render → final (readable dates; the Talent Q service row no longer claims to send for you).
- 02 Job detail desktop: pale briefing card → ink video player with caption and chapter label.
- 03 Job detail phone: no index → `PageIndex` under the header; dark player.
- 04 Hub desktop: facet selects always open + attachment list open → collapsed facets and attachments.
- 05 Hub, token expired: long sent bodies → clamped; recovery first in the composer.
- 06 Hub phone (Ngozi, send-only): long thread → clamped bodies under the "Q can't see email replies" note.

## Requirement IDs now prototyped (route · evidence = test step)
- AD-C-01 `/c/jobs/j_kora_backend` · contact "Q answers … quotes the time (1:12)", "Play from 1:12 seeks".
- AD-C-02/03 same · "Contact card shows Kora's policy before any draft", "Q states the policy first".
- AD-C-04, E01-27 `/c/jobs/j_rivers_backend` · "Rivers: Q refuses, offers the route, never an invented address".
- AD-C-05/06 `/c/messages` · "status Sent", "Seen by Kora Pay", "Timeout shown honestly", "mutes", "Consent revoked".
- AD-C-07 · reply in an established thread allowed (`contactState`); AD-C-08 · "Weekly limit enforced"; AD-C-09 `/r/messages`
  · "marked as started by the candidate", Mute / Report / Block, "Step 3: thread routed".
- E01-01/02/03 `/settings/email` · "Consent explains scopes", "Connected: new Microsoft mailbox, send only", "Reconnect opens
  the consent screen". E01-04 composer From select · "Step 10: draft resolves sender". E01-05/06 · "Composer: channel, From…".
- E01-07 · "Checks list shows the Sender group". E01-08 · "Material edit voids the earlier approval". E01-09 · "Truthful
  status", "Bounce". E01-10 · "Step 6: request drafted in the same thread". E01-11 · "Read denied", "did Grace reply".
- E01-12 · "Step 12: inbound … subjectChanged", "Match confirmed". E01-13 · "Untrusted email". E01-14 · suppression on
  "stop" (`receiveEmail`) + "Per-recipient status with a suppression mark". E01-15 · "Booked … Thursday 14:00".
- E01-16 · "Proactive follow-up: reason, cap and scope honesty", "Snooze recorded". E01-17 · composer Channel switch with
  Q's reason. E01-18 · "Hub filters by campaign / channel". E01-19 · "Reply intelligence: summary, quoted source…".
- E01-20 · "Multi-recipient: three individual drafts". E01-21 · "Attach a Q artifact". E01-22 · `/settings/email` policy.
- E01-23 · auth expired, duplicate prevented, bounce, rate-limited, offline, read denied, suppressed, SMTP refused (demo),
  missing attachment (check), approval voided: steps above. E01-24 · "Audit: what was sent / why contacted", "Forget".
- E01-25 · "R4: paused automation is obeyed", "Kora work goes from the Kora client sender". E01-26 · "Step 11: refused".
- E01-28 · "Consent revoked … can't be unsent". E01-30 · `journeys/handoff/email.md`.
- Not done: E01-29 (the communication clip/film) — left for the lead's film pass.

## Remaining weaknesses (honest)
- No usability testing; copy and flows are judged by heuristics only. The briefing video is a caption track, not media.
- Reply "intelligence" is rules (day/time regex, stop words, instruction patterns), not a model; summaries are templated.
- The hub groups by person, so a person with two roles shows one row; filters apply to any of their threads.
- Sent-message bodies clamp but the thread still grows; virtualisation and a "jump to newest" are not designed.
- Agency pages don't yet show the client sender or the automation (they live on `/settings/email`); see handoff.
- "Seen" is recorded when an org member opens the thread in the hub, including when it is the default selection.
