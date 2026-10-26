# Talent Q: hire by talking

An interactive prototype of **Talent Q**: an AI recruiter you speak to. Think Jarvis meets LinkedIn.

There are no dashboards and no sidebar. Each person has one home:
- **Q** sits at the centre.
- You **talk or type** to it.
- Q works in the background.
- Cards called **moments** rise only when a person needs to decide something.
- Detailed views open as temporary **lenses** and close back to Q.

- **Film:** [`video/talentq-film.mp4`](video/talentq-film.mp4). A story-paced walkthrough of Ada (a founder hiring) and Femi (a candidate), with a laptop and a phone synced live.
- **Design language:** [`docs/DESIGN.md`](docs/DESIGN.md). Theme, tokens, Q's states and voice, journeys, critique and accessibility results.

## Run it

```bash
npm install
npm run dev
```

| Try | URL |
|---|---|
| Landing | `#/` |
| Meet Q and onboard | `#/start` |
| Ada's home (recruiter) | `#/hire`. Jump ahead with `?at=morning`, `?at=yes` or `?at=decide` |
| Femi's home (candidate, best at phone width) | `#/work`, or `#/work?at=after` for the offer |
| Q-led interview | `#/work/interview` |
| **Recruiter workspace** (chat and everything in one view) | `#/app/today`: Today, Roles, People, Interviews, What Q did, chats |
| **Candidate workspace** | `#/you/today`: Today, Jobs, Applications, Evidence, Privacy, chats |
| Both sides at once | Open `#/hire?at=morning` and `#/work` in two tabs. They sync live. |

The mic button simulates speech: it transcribes what Q expects you to say. Typing works everywhere too.

## Re-record the film

```bash
npm run build && npx vite preview --port 4173 &
node video/record.mjs
```

`video/record.mjs` directs `#/film`, a stage holding a laptop and a phone that run the real app. It plays both users, moves the camera, and adds titles. Frames are captured at 1920×1080 through the DevTools screencast and encoded with ffmpeg.

## Stack

React 18 · Framer Motion · Vite · canvas for Q. Fonts: Newsreader, Geist and Geist Mono (OFL, self-hosted). All people, companies and figures are fictional or come from the strategy briefs.
