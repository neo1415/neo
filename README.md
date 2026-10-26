# Talent Q — UI/UX prototype

A clickable, animated prototype of **Talent Q**, the AI-native recruitment platform described in the *Complete Investor & Product Brief* and *Global Market Research & Commercial Strategy v1*. It covers every journey from the landing page through sign-up, onboarding and the full recruiter and candidate workflows, plus a recorded walkthrough video.

- **Walkthrough video:** [`video/talentq-user-journeys.mp4`](video/talentq-user-journeys.mp4) (1080p; chapter times in `video/chapters.json`)
- **UX spec:** [`docs/UX.md`](docs/UX.md): journey maps, screen inventory, micro-interaction catalogue, accessibility and tokens

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

All data is mocked, so there's no backend. State such as names entered at sign-up is kept in `localStorage`.

### Routes

| Area | Routes |
|---|---|
| Public | `#/` landing · `#/signup` · `#/login` · `#/forgot` · `#/verify` · `#/onboarding/employer` · `#/onboarding/candidate` |
| Recruiter workspace | `#/app` · `/intake` · `/shortlist` · `/pipeline` · `/assess` · `/decision` · `/agents` · `/agency` · `/analytics` · `/governance` |
| Candidate hub | `#/me` · `/invite` · `/interview` · `/rehearsal` · `/evidence` · `/applications` · `/growth` · `/offer` · `/privacy` |

## Re-record the video

```bash
npm run build
npx vite preview --port 4173 &
node video/record.mjs                 # all chapters
ONLY=intake,shortlist node video/record.mjs   # selected chapters
```

The recorder drives the real app with Playwright. It adds an on-screen cursor, click ripples and captions, captures 1920×1080 frames through the Chrome DevTools screencast, and encodes them with ffmpeg at true playback speed.

## Stack

React 18 · React Router · Framer Motion · Lucide icons · Vite. Fonts: Plus Jakarta Sans, Inter and Instrument Serif, all self-hosted with `@fontsource`.

The people, companies and figures in the prototype are fictional or come from the briefs. Talent Q is presented as a concept: no feature here claims to be live.
