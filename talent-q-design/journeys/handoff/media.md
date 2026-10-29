# Handoff · media: candidate-authorised video and voice evidence (audit addendum §F; AD-F-01…13)

Prototype: `prototype/src/journeys/media/{logic.ts,Candidate.tsx,Report.tsx,Player.tsx,media.css}`,
`state/areas/media.ts`, `state/seeds/media.ts`, `q/skills/media.ts`, `q/proactive/media.ts`, `routes/media.tsx`;
the Passport hosts the candidate side (`journeys/talent-b/Passport.tsx`, Proof view). Everything is simulated: upload,
link check, fetch, transcription and analysis. **No provider is integrated.**

## 1. Entities and ownership (modules from `handoff/MODULE-MAP-AND-ROADMAP.md`)
| Entity | Owner | Notes |
|---|---|---|
| `MediaEvidence` (item, state, parts, consent, transcript) | **M5 Evidence Passport** | One per recording. Always paired with one Passport `Evidence` (`WORK_SAMPLE`, origin `UPLOAD`) whose visibility/sharedWith is *derived* from its parts. |
| Stored file, content hash, transcript, key moments | **M17 Files and verification adapters** | Secure object storage; transcript keyed by content hash. |
| `MediaReview` (per organisation, per rubric version) | M5 produces, **assessment link** to the rubric module (RUBRIC/M-eval) | Q-proposed `Rating` records written to the rubric store; overrides/disputes use the RUBRIC ops (`journeys/rubric/ops.ts`). |
| Consent record | M3 Authorisation + M5 | Scope (orgs, parts), purpose, expiry, `alternativeOffered`. |
| Events | M3 audit | `media.consent`, `media.transcribed`, `media.shared`, `media.access_ended`, `media.revoked`, `media.deleted`, `media.review.built/reviewed/disputed`, `rating.overridden` (RUBRIC). |

## 2. Consent, tenancy and retention
- Nothing is uploaded, fetched or transcribed before consent. Consent names organisations (or private practice), the
  purpose and an expiry (default 90 days; 30/180 offered). Expiry ends access automatically.
- **Every recruiter read uses `visibleSegments(w, mediaId, orgId)`**: item READY, org in consent, consent not expired,
  candidate consent not withdrawn, part shared with that org. Plus `canSeeCandidate` on the route. The recruiter page
  never receives transcript lines outside visible parts (filtered before render); unshared parts appear only as
  "Not shared" with no title. Q's skills use the same function.
- Q's review for an org is built **only from parts shared with that org**; findings are filtered again at read time.
- Revoke: parts unshared, Passport item `revokedFrom` the orgs, unreviewed Q ratings removed, reviewed ratings keep
  time codes but lose the media ref. Org is told only that access ended. Delete: file, transcript (if no other item
  shares the hash), corrections and Passport entry removed; deletion event to the person. **What the employer keeps**
  (record of sharing, reviewed ratings) and for how long is **decision D9, open**; the UI says so.
- Sources: only one explicitly chosen video. Shortened links, `http`, whole profiles/channels are refused unfetched;
  sign-in links fail without using credentials (AD-F-08).

## 3. Pipeline design (production)
1. **Ingest**: resumable chunked upload (tus or S3 multipart) to encrypted storage in the person's region; malware
   scan (M17); compute SHA-256 → `contentHash`. Links: allowlisted hosts, SSRF-safe fetcher (no redirects to private
   ranges, no shorteners, size/time caps), store a copy, hash it.
2. **Transcribe once per contentHash** (speech-to-text with word timings); cache; candidate corrections stored as an
   overlay (never mutate the raw transcript). Re-upload of the same file is a cache hit (prototype shows this).
3. **Key moments**: segment by topic from the transcript; propose part boundaries; job relevance per part.
4. **Review** per `{contentHash, rubricId, v, sharedPartSet}` (the prototype key: `sha256…|rub@v1|s1+s3`), computed
   once when the candidate shares, or on first open; **never per page view**. A new rubric version never re-scores
   silently: the report stays on v1 until a person asks ("Prepare a v2 report").
5. **Frame review only on demand** (a criterion that needs the picture, e.g. reading a diagram), on the shared parts only.
6. **Outputs**: findings with moments (t, tEnd, quote), proposed rating with anchor, uncertainty and reason;
   `notShown` criteria (never zero). Ratings go to the rubric store as `Q_PROPOSED`, `reviewed: false`.

## 4. Provider options (references only, not integrated)
Multimodal video understanding such as Gemini (https://ai.google.dev/gemini-api/docs/video-understanding); any
speech-to-text with word timestamps; self-hosted Whisper-class models for data-residency. Selection needs a bias and
accuracy evaluation on accented Nigerian/Ghanaian English before use (§7).

## 5. Prohibited inferences and accessibility
- Never infer honesty, loyalty, personality, emotion, confidence, competence, age, gender, race or disability from face,
  voice timbre, accent, eye contact or appearance (addendum §F). Q refuses with a reason and an alternative
  (`media.noinference`); the report states it; the rubric fairness screen blocks such criteria (RUBRIC).
- Spoken-communication criteria are anchored on content (structure, reasons, trade-offs) with a written alternative.
- Text, form and adjustment alternatives are always visible; no reason required (EEOC ADA/AI tip sheet:
  https://www.eeoc.gov/sites/default/files/2022-07/ADA%20and%20AI%20Worker%20Tip%20Sheet.pdf).
- UK ICO AI recruitment guidance (https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2024/11/thinking-of-using-ai-to-assist-recruitment-our-key-data-protection-considerations/):
  DPIA, purpose limitation, transparency to the candidate (the candidate sees "What Q told Kora"), human review.
- EU AI Act (https://digital-strategy.ec.europa.eu/en/faqs/navigating-ai-act): AI used to evaluate candidates is
  high-risk (Annex III); emotion recognition in the workplace is prohibited. Needs risk management, logging, human
  oversight and accuracy documentation before any EU deployment. SIOP validation principles apply to the rubric.

## 6. APIs, events and Q tools (approval class)
- `POST /media` (draft) · `POST /media/{id}/consent` · `POST /media/{id}/upload` (resumable) / `POST /media/{id}/link`
  · `GET /media/{id}` (owner) · `PATCH /media/{id}/transcript/{line}` · `PUT /media/{id}/parts/{part}/share/{org}` ·
  `POST /media/{id}/share` · `POST /media/{id}/revoke` · `DELETE /media/{id}` (candidate only).
- `GET /orgs/{org}/people/{pid}/media` (authorised view: visible parts, filtered transcript, review) ·
  `POST /reviews/{id}/reviewed` · rating override/dispute via the rubric API.
- Q tools: add (navigates, no side effect beyond a draft), share parts (**approval**), what X sees (read), fix line
  (direct, undoable), stop sharing (**approval**), delete (**approval**), summarise/where/play (read), mark reviewed
  (direct, undoable), override (RUBRIC, reason required). Proactive: "transcript ready to check" (candidate, high),
  "new walkthrough shared" (recruiter, one per item, cleared when opened).

## 7. Costs, risks and validation still required
- Cost drivers: storage (≈150 MB per 6 min), one transcription per hash, one review per (hash, version, part set);
  frame review is the expensive step and is opt-in per criterion. Budget caps per org; cache hit rate is a metric.
- Risks: transcription errors on accents (mitigated by candidate correction, but measure WER by accent); leakage of
  unshared parts via caches or Q (enforce `visibleSegments` server-side, test it); confidential client data in videos
  (per-part warning only, no detection); over-trust in Q's proposed ratings (human review state, uncertainty).
- Validation: usability with candidates (is a 6-minute ask reasonable? what do they refuse to show?), recruiter trust
  study, accuracy and adverse-impact evaluation of any provider, legal review of retention (D9), DPIA.
- Prototype gaps: authored analysis for one file; public preview not built; candidate-side timecodes not playable.
