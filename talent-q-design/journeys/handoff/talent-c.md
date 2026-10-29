# Engineering handoff · talent-c (T4 Grace: low confidence, low bandwidth)

Specification only. The prototype is the behavioural and design blueprint, not the implementation. Paths are
relative to `prototype/src/`. **PROD ≠ SIM** marks where production must differ from the simulation. Journey
proof: `qa/scripts/journeys/T4.mjs`; follow-up regression: `qa/scripts/review/interview-followup.mjs`.

## 0. Defaults every feature inherits
- **Scope.** All T4 state is `PERSON:<personId>` and private. The only thing that ever leaves the person is the
  real-interview submission, scoped `SHARED:<orgId>:<personId>`, after explicit approval. Practice never leaves.
- **State.** Prototype slice `state/areas/talent-c.ts` (`PersonState`, `UploadState`, `InterviewRoom`), keyed
  by person. Production: a server-side per-person record plus a device-local mirror (IndexedDB) for drafts and
  upload checkpoints; the server is the source of truth for acknowledged parts and submitted answers.
- **Events.** Append-only `{type, actorId, scope, text, data, at}` (prototype `emit()`): `profile.work.saved`,
  `upload.started|resumed`, `evidence.uploaded`, `practice.done`, `interview.answers.submitted`,
  `settings.changed`, `q.voice.unavailable`. Audit, Q memory and proactive rules read events, not UI state.
- **Q.** Every capability works by typing or speaking to the global Q (`q/skills/talent-c.ts`, ids
  `talent-c.*`) and by the page; pages and Q call the same operations (`registerOp('talent-c.*')`).
  **PROD ≠ SIM:** matching is regex/keyword in the prototype; production uses an LLM with these tools, but the
  approval gates, refusals and wording rules here are the contract. Q never promises an employer decision.
- **Copy.** Plain British English, sentences ≤ 14 words where possible, terms explained on request.

## 1. Plain-words mode
- **Behaviour.** Chosen at signup (`routes/entry.tsx`, switch "Use plain, simple words") → `q.prefs[actor].plain`.
  Changes page copy (`FirstSteps.tsx`, `InterviewRoom.tsx`: extra reassurance, question tips) and Q replies:
  `talent-c.explain` answers in ≤ 2 sentences, offers "Still not clear" → one simpler rephrase ("Put simply: …"),
  closes on "got it". Covers glossary terms plus care-sector terms (`CARE` table: safeguarding, handover, care
  plan, pending, issuer…). On `/c/start`, "dont understand" with no term explains the current step.
- **Data.** `prefs.plain: boolean` (person setting, synced). Glossary entries carry `plain` and `simpler` strings.
- **Q / memory.** Q may remember the preference and which terms were explained (`glossarySeen`) so it doesn't
  re-explain; it must not infer literacy or ability from it. Visible and deletable in memory.
- **PROD ≠ SIM.** Simplification of free text (employer questions) must be reviewed text, not live generation:
  each interview question ships an employer-approved `simpler` wording (see §6), because the employer sees it.

## 2. Voice, typing or form, with fallbacks
- **Behaviour.** `ModeSwitch` (`journeys/talent-c/shared.tsx`) on every input: Type / Speak / Form. Switching
  never loses words (text and form fields are kept separately). Voice: `useVoice` → mic button; transcript fills
  an editable box ("What Q heard (you can fix it)"). Fallback states `VoiceState`: `OFF` (setting off: offer
  "Turn voice on"), `UNAVAILABLE` (no API) and `DENIED` (permission) → switch to typing automatically, say why in
  plain words, keep the words. Q: "my mic not working", "can i use the form instead" switch mode.
- **Data.** Per step `stepMode`, per room `answerMode`; per person `voice` state; `prefs.voice`.
- **Permissions.** Microphone requested only on the first tap of the mic, never on page load.
- **Integrations.** Speech-to-text: on-device first (Web Speech / OS), server STT only with consent; streaming
  partials ≤ 300 ms; language `en-NG` default with accent support. Text-to-speech ("Say it again"): on-device,
  rate 0.9. **PROD ≠ SIM:** the prototype uses browser APIs only; audio is never stored. Production may store
  audio only if the employer requires spoken answers and the person agrees; the answer of record is the
  confirmed transcript the person saw.
- **Failure.** Any STT error → text mode, `role="alert"` note, `q.voice.unavailable` event.

## 3. Resumable chunked upload
- **Behaviour.** `/c/start` step 2 (`FirstSteps.tsx` `CertStep`, logic `journeys/talent-c/runtime.ts`). File is
  sent in parts (`CHUNK_KB = 240`); progress = parts acknowledged by the server, never a timer. States
  `IDLE → UPLOADING → PAUSED(reason) | FAILED(SERVER) → DONE`; reasons `OFFLINE`, `CLOSED`, `USER`, `NEED_FILE`.
  Offline: stops at the last acknowledged part, resumes automatically when back. App closed: paused; resume
  asks for the same file again if the browser lost it (fingerprint `name|size|lastModified` must match, else
  "That looks like a different photo"). Failure at part n: "Try again from 60%" resumes at n, nothing re-sent.
  Alternative: type the certificate details (stored as a claim, not proof).
- **Data.** `UploadState` (`evidenceId, fileName, sizeKb, chunks, done, status, reason, fingerprint,
  attempts, lastChunkMs`). On DONE the evidence item becomes `origin: UPLOAD, verification: PENDING`.
- **Backend.** Resumable protocol (tus or S3 multipart): `POST /uploads` → `{uploadId, chunkSize}`;
  `PUT /uploads/{id}/parts/{n}` idempotent by `(uploadId, n, sha256)`; `GET /uploads/{id}` → acknowledged
  parts; `POST /uploads/{id}/complete` verifies the whole-file hash, virus-scans, strips EXIF location, then
  attaches to evidence. Uploads expire after 7 days incomplete. Max 15 MB; image or PDF only.
- **Bandwidth.** Adaptive part size 64–512 KB; one part in flight on 2G, three on 4G; client compresses
  photos to ≤ 1600 px long edge / ~400 KB before sending (with consent shown in the UI).
- **Q.** `talent-c.upload` ("try again pls", "is my certificate sent"), op `talent-c.upload.resume`; proactive
  `talent-c.upload` (paused/failed, with why). Notices on drop, failure, reconnect and completion.
- **PROD ≠ SIM.** Failure is a demo control (`failAt`); the issuer check is not performed (stays PENDING).

## 4. Interrupted sessions and resume ("where was I")
- **Behaviour.** `usePlace` (`shared.tsx`) records `{route, label, at, sid, left}`; leaving mid-step or closing
  the app sets `left`. On return (same route, or app reopen) `welcomeBack` (`runtime.ts`) posts "Welcome back,
  Grace. Last time you were … Nothing was lost." with Carry on / Not now. Q: "where was i", op `talent-c.continue`
  navigates back and resumes the upload or unpauses the room. Proactive `talent-c.left`.
- **Data.** `place`, interview `draft`/`form` saved on every keystroke. **PROD ≠ SIM:** drafts persist locally
  (IndexedDB) immediately and sync to the server debounced (2 s) when online; the device copy wins until the
  server acknowledges. Session id per app launch decides "closed since".

## 5. Lite mode and low bandwidth
- **Behaviour.** `consents[person].lite`; `LiteWrap` (`shared.tsx`) sets `data-lite`, disables every animation
  (motion elements render final state), hides decorative pictures, raises targets to 56 px and text to 17–18 px.
  Offered when a part takes > 2.5 s, or the browser reports `saveData` / 2G (`runtime.ts`), by page banner and
  proactive rule `talent-c.slow`. Q: "internet is so slow", "turn off lite mode"; undoable (`pushUndo`).
- **Budgets (production).** First load of `/c/start` or `/c/interview` ≤ 150 KB transferred in lite (no web
  fonts beyond the system fallback, no images), ≤ 400 KB normal; interactive < 5 s on 2G (250 kbps, 600 ms RTT).
  Each interview turn ≤ 5 KB. No polling faster than 30 s; network state from browser events.

## 6. Interview room
- **Behaviour.** `/c/interview` (`journeys/talent-c/InterviewRoom.tsx`, logic `interview.ts`, banks
  `questions.ts`). Practice and real rooms are separate records; practice is private, never proof, never sent.
  One question at a time with progress, "Say it again" (TTS) and "Simpler words" (toggle; the employer sees the
  wording answered). Pause any time; no clock. Lost connection: room pauses (`paused.reason = OFFLINE`), the
  answer stays editable and saved on the device, Save is disabled ("Waiting for connection"), resumes at the same
  question on reconnect. Real: review of exactly what the employer will see (question wording, answer, typed/
  spoken/form), inline confirm, then receipt. Q: repeat, simpler, pause, carry on, "my answer is …" (fills the
  box, never saves), "what will they see", "send my answers" (approval).
- **Adaptive follow-up (SC-099), algorithm to validate.** Per question optional `followUp` + `cue` (regex of
  concrete-detail markers). After a non-form answer: ask the follow-up once iff `!cue.test(answer) ||
  wordCount(answer) < 12`. The follow-up answer is appended to the first (`"\n\nFollow-up: <q>\n<answer>"`); the
  employer sees both in order. "Skip this follow-up" keeps the first answer and moves on. Never more than one per
  question; never in form mode. **Validate before production:** false-positive rate on real answers (target
  < 20% of complete answers asked again), fairness across dialects/second-language English (cue words must not
  penalise phrasing), and employer sign-off on each follow-up text. **PROD ≠ SIM:** a model may judge "lacks
  the concrete detail", but must return a reason code, be logged, and keep the one-follow-up cap.
- **Approval.** Submission only via the action (`talent-c.interview.submit`) or the page's two-step confirm;
  refused offline; idempotent by room; never undoable (said before sending).
- **Backend.** `POST /interviews/{id}/answers` (draft, per question, idempotent by `(roomId, qid, rev)`),
  `POST /interviews/{id}/submit` → `{receipt, at, status}`; server re-derives the payload from stored answers
  (never trusts the client view). Employer read model shows only: final answers, wording answered, input method.
  Never: practice, deleted drafts, pauses, timing.
- **PROD ≠ SIM.** Send is `SENT_SIMULATED`; receipt id is local (`uid('rcpt')`). Production issues the receipt
  server-side and notifies the employer; tips after practice are rule-based (`tipsFor`), not assessment.

## 7. Open risks
- Device-local drafts on shared phones: offer "Clear this phone" on sign-out.
- STT accuracy for Nigerian English needs testing with real users before voice is promoted over typing.
