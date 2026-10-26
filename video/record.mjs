// Records the Talent Q product walkthrough video.
//
// Usage:  npm run build && npx vite preview --port 4173 &   then   node video/record.mjs
// Output: video/talentq-user-journeys.mp4
//
// Frames are captured with the Chrome DevTools screencast (crisp 1920×1080 JPEGs with
// real timestamps) and stitched with ffmpeg, so the video plays back at true speed.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch { pw = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright') }
const { chromium } = pw

const here = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE_URL || 'http://localhost:4173/'
const RAW = path.join(here, 'raw')
const OUT = path.join(here, 'talentq-user-journeys.mp4')
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null

fs.rmSync(RAW, { recursive: true, force: true })
fs.mkdirSync(RAW, { recursive: true })

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] })
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 })
const page = await context.newPage()
page.on('pageerror', (e) => console.error('pageerror', e.message))

/* ---------------- overlay: cursor, click ripples, captions ---------------- */
await context.addInitScript(() => {
  const install = () => {
    if (document.getElementById('__cur')) return
    const st = document.createElement('style')
    st.textContent = `
      #__cur{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))}
      #__cur.down svg{transform:scale(.86);transform-origin:5px 3px}
      #__cur svg{transition:transform .12s}
      .__rip{position:fixed;z-index:2147483646;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:2.5px solid #C9A04B;background:rgba(201,160,75,.18);animation:__rip .6s cubic-bezier(.2,.8,.2,1) forwards}
      @keyframes __rip{from{transform:scale(.2);opacity:1}to{transform:scale(1.5);opacity:0}}
      #__cap{position:fixed;left:50%;bottom:26px;z-index:2147483645;pointer-events:none;transform:translateX(-50%) translateY(20px);opacity:0;transition:opacity .45s,transform .45s cubic-bezier(.2,.8,.2,1);display:flex;align-items:center;gap:14px;padding:12px 22px 12px 14px;border-radius:999px;background:rgba(11,12,15,.86);backdrop-filter:blur(14px);color:#f3f0e8;font:500 16px/1.3 'Inter Variable',Inter,sans-serif;box-shadow:0 18px 50px -12px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.07);white-space:nowrap}
      #__cap.on{opacity:1;transform:translateX(-50%) translateY(0)}
      #__cap b{font-weight:650;color:#E2C27C;font-size:12px;letter-spacing:.14em;text-transform:uppercase;padding:5px 11px;border-radius:999px;background:rgba(201,160,75,.16)}
    `
    document.head.appendChild(st)
    const c = document.createElement('div')
    c.id = '__cur'
    c.innerHTML = '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M5 3l18 10-7.6 1.9L11.4 22z" fill="#0B0C0F" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>'
    c.style.transform = `translate(${window.__cx ?? 800}px, ${window.__cy ?? 450}px)`
    document.body.appendChild(c)
    const cap = document.createElement('div')
    cap.id = '__cap'
    cap.innerHTML = '<b></b><span></span>'
    document.body.appendChild(cap)
  }
  window.__setCursor = (x, y) => { window.__cx = x; window.__cy = y; const c = document.getElementById('__cur'); if (c) c.style.transform = `translate(${x - 5}px, ${y - 3}px)` }
  window.__down = (on) => document.getElementById('__cur')?.classList.toggle('down', on)
  window.__ripple = (x, y) => { const r = document.createElement('div'); r.className = '__rip'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700) }
  window.__caption = (k, t) => {
    const cap = document.getElementById('__cap'); if (!cap) return
    if (!t) { cap.classList.remove('on'); return }
    cap.classList.remove('on')
    setTimeout(() => { cap.querySelector('b').textContent = k; cap.querySelector('b').style.display = k ? '' : 'none'; cap.querySelector('span').textContent = t; cap.classList.add('on') }, cap.classList.contains('on') ? 250 : 0)
  }
  window.__smoothScroll = (y, ms) => new Promise((res) => {
    const el = document.scrollingElement; const s = el.scrollTop; const d = y - s; const t0 = performance.now()
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const step = (now) => { const p = Math.min(1, (now - t0) / ms); el.scrollTop = s + d * ease(p); p < 1 ? requestAnimationFrame(step) : res() }
    requestAnimationFrame(step)
  })
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install)
  else install()
  if (document.documentElement) new MutationObserver(() => document.body && install()).observe(document.documentElement, { childList: true })
})

/* ---------------- screencast capture ---------------- */
const frames = []
const cdp = await context.newCDPSession(page)
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const f = path.join(RAW, `f${String(frames.length).padStart(6, '0')}.jpg`)
  frames.push({ f, t: metadata.timestamp })
  fs.writeFile(f, Buffer.from(data, 'base64'), () => {})
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})

/* ---------------- director helpers ---------------- */
const wait = (ms) => page.waitForTimeout(ms)
let cx = 800, cy = 450
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

async function moveTo(x, y, ms = 650) {
  const sx = cx, sy = cy
  const dist = Math.hypot(x - sx, y - sy)
  const dur = Math.max(260, Math.min(ms, 260 + dist * 0.9))
  const steps = Math.max(8, Math.round(dur / 22))
  // slight arc for a natural hand movement
  const mx = (sx + x) / 2 + (y - sy) * 0.08, my = (sy + y) / 2 - (x - sx) * 0.08
  for (let i = 1; i <= steps; i++) {
    const t = easeIO(i / steps)
    const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * x
    const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * y
    await page.evaluate(([a, b]) => window.__setCursor(a, b), [px, py])
    await page.mouse.move(px, py)
    await wait(dur / steps)
  }
  cx = x; cy = y
}

async function target(sel, { nth = 0, dx = 0.5, dy = 0.5 } = {}) {
  const loc = typeof sel === 'string' ? page.locator(sel).nth(nth) : sel
  await loc.waitFor({ state: 'visible', timeout: 15000 })
  await loc.scrollIntoViewIfNeeded()
  const b = await loc.boundingBox()
  return { x: b.x + b.width * dx, y: b.y + b.height * dy, b, loc }
}

async function click(sel, opts = {}) {
  const { x, y } = await target(sel, opts)
  await moveTo(x, y, opts.ms)
  await wait(opts.hover ?? 160)
  await page.evaluate(([a, b]) => { window.__down(true); window.__ripple(a, b) }, [x, y])
  await page.mouse.down()
  await wait(70)
  await page.mouse.up()
  await page.evaluate(() => window.__down(false))
  await wait(opts.after ?? 450)
}

async function hover(sel, ms = 700, opts = {}) {
  const { x, y } = await target(sel, opts)
  await moveTo(x, y)
  await wait(ms)
}

async function type(text, delay = 34) {
  await page.keyboard.type(text, { delay })
}

async function fill(sel, text, delay) {
  await click(sel, { after: 150 })
  await type(text, delay)
  await wait(250)
}

async function drag(fromSel, toSel, { toDy = 0.25 } = {}) {
  const a = await target(fromSel)
  await moveTo(a.x, a.y)
  await wait(200)
  await page.evaluate(() => window.__down(true))
  await page.mouse.down()
  const b = await target(toSel, { dy: toDy })
  const sx = cx, sy = cy
  const steps = 40
  for (let i = 1; i <= steps; i++) {
    const t = easeIO(i / steps)
    const px = sx + (b.x - sx) * t, py = sy + (b.y - sy) * t
    await page.evaluate(([p, q]) => window.__setCursor(p, q), [px, py])
    await page.mouse.move(px, py)
    await wait(22)
  }
  cx = b.x; cy = b.y
  await wait(250)
  await page.mouse.up()
  await page.evaluate(() => window.__down(false))
  await wait(700)
}

async function slide(sel, toFrac, { from } = {}) {
  const { b } = await target(sel)
  const cur = from ?? (await page.locator(sel).first().evaluate((el) => (el.value - el.min) / (el.max - el.min)))
  const sx = b.x + 10 + (b.width - 20) * cur, y = b.y + b.height / 2
  await moveTo(sx, y)
  await wait(150)
  await page.evaluate(() => window.__down(true))
  await page.mouse.down()
  const ex = b.x + 10 + (b.width - 20) * toFrac
  const steps = 30
  for (let i = 1; i <= steps; i++) {
    const px = sx + (ex - sx) * easeIO(i / steps)
    await page.evaluate(([p, q]) => window.__setCursor(p, q), [px, y])
    await page.mouse.move(px, y)
    await wait(24)
  }
  cx = ex; cy = y
  await page.mouse.up()
  await page.evaluate(() => window.__down(false))
  await wait(400)
}

const caption = (k, t) => page.evaluate(([a, b]) => window.__caption(a, b), [k, t])
const scrollTo = (y, ms = 1400) => page.evaluate(([a, b]) => window.__smoothScroll(a, b), [y, ms])
const scrollToSel = async (sel, offset = 90, ms = 1400) => {
  const y = await page.locator(sel).first().evaluate((el, o) => el.getBoundingClientRect().top + window.scrollY - o, offset)
  await scrollTo(y, ms)
}
async function go(route, ms = 900) {
  await page.evaluate((r) => { window.location.hash = r; const c = document.getElementById('__cur'); if (c) c.style.opacity = r.startsWith('/scene') ? '0' : '1' }, route)
  await wait(ms)
}
async function scene(id, { t, s = '', k = '', p = '' }, ms = 4200) {
  await caption('', '')
  const q = new URLSearchParams({ t, s, k, p }).toString()
  await go(`/scene/${id}?${q}`, ms)
}
const store = (patch) => page.evaluate((p) => window.__tq.set(p), patch)

/* ---------------- storyboard ---------------- */
const chapters = []
const chapter = (id, fn) => chapters.push({ id, fn })

chapter('intro', async () => {
  await scene('intro', { t: 'Hire on evidence, not noise.', s: 'Product walkthrough · every recruiter & candidate journey' }, 5200)
})

chapter('landing', async () => {
  await scene('01', { k: 'First impression', t: 'The landing page', s: 'One promise for two audiences — and a live demo of Q before anyone signs up.' })
  await go('/', 600)
  await scrollTo(0, 10)
  await caption('Landing', 'Hero: staggered headline, live Q intake demo, floating match notification')
  await wait(5200)
  await hover('[data-q="hero-hire"]', 700)
  await hover('[data-q="hero-seek"]', 700)
  await caption('Landing', 'Problem stats count up as they scroll into view')
  await scrollTo(900, 1600)
  await wait(1600)
  await caption('Landing', 'How it works: five employer steps draw in sequence')
  await scrollToSel('#how', 40, 1500)
  await wait(2200)
  await caption('Landing', 'Q-Match explorer: drag F and A to see the mutual index react')
  await scrollToSel('#qmatch', 60, 1500)
  await wait(600)
  await slide('[data-q="qmatch-card"] input[type=range] >> nth=0', 0.93)
  await slide('[data-q="qmatch-card"] input[type=range] >> nth=1', 0.40)
  await wait(900)
  await slide('[data-q="qmatch-card"] input[type=range] >> nth=1', 0.9)
  await wait(700)
  await caption('Landing', 'Candidate promise: evidence, privacy and status you can trust')
  await scrollToSel('#candidates', 0, 1500)
  await wait(1800)
  await hover('#candidates .lp-card >> nth=1', 900)
  await caption('Landing', 'Feature catalogue for both sides, then trust & governance')
  await scrollTo(await page.evaluate(() => document.querySelector('#candidates').offsetTop + document.querySelector('#candidates').offsetHeight - 40), 1500)
  await wait(1600)
  await scrollToSel('#trust', 40, 1500)
  await wait(1800)
  await caption('Landing', 'Pricing: employers pay, candidates never do')
  await scrollToSel('#pricing', 40, 1500)
  await wait(800)
  await hover('#pricing .lp-card >> nth=1', 900)
  await hover('#pricing .lp-card >> nth=2', 700)
  await caption('Landing', 'FAQ accordion with honest answers')
  await scrollTo(await page.evaluate(() => document.querySelector('#pricing').offsetTop + document.querySelector('#pricing').offsetHeight - 60), 1300)
  await click('button:has-text("Does Q decide who gets hired?")', { after: 1200 })
  await click('button:has-text("Is my job search visible")', { after: 1200 })
  await scrollTo(await page.evaluate(() => document.scrollingElement.scrollHeight), 1500)
  await wait(1600)
  await caption('', '')
  await scrollTo(0, 1800)
  await wait(600)
})

chapter('employer-signup', async () => {
  await scene('02', { k: 'Recruiter journey', t: 'Ada signs up', s: 'Founder of a 42-person Lagos fintech. One backend hire, no full-time recruiter.', p: 'Persona: Ada · Lagos startup founder' }, 4600)
  await go('/', 900)
  await caption('Sign up', 'Ada chooses “I’m hiring” — the role is carried into sign-up')
  await click('[data-q="hero-hire"]', { after: 1100 })
  await caption('Sign up', 'SSO or email · live validation · password strength meter')
  await hover('button:has-text("Google")', 500)
  await fill('[data-q="su-name"]', 'Ada Nwosu')
  await fill('[data-q="su-email"]', 'ada@paystride')
  await wait(500)
  await type('.co')
  await fill('[data-q="su-company"]', 'Paystride')
  await fill('[data-q="su-password"]', 'Lagos-API-2026!', 60)
  await wait(500)
  await click('[data-q="su-submit"]', { after: 1600 })
  await caption('Verify', 'Six-digit code with auto-advance, then an animated confirmation')
  await wait(600)
  await type('482916', 180)
  await wait(2600)
})

chapter('employer-onboarding', async () => {
  await caption('Onboarding', 'Q guides set-up; the progress rail fills as each step completes')
  await wait(1200)
  await click('[data-q="size-2"]', { after: 400 })
  await click('[data-q="country-0"]', { after: 500 })
  await click('[data-q="ob-next"]', { after: 900 })
  await caption('Onboarding', 'Hiring rhythm and role families set sensible defaults')
  await click('[data-q="freq-0"]', { after: 500 })
  await click('[data-q="roles-5"]', { after: 400 })
  await click('[data-q="ob-next"]', { after: 1000 })
  await caption('Onboarding', 'Compliance pre-set for Nigeria (NDPA) · the human review gate is locked on')
  await wait(1200)
  await click('[role=switch] >> nth=1', { after: 600 })
  await hover('text=Human review gate', 1300)
  await click('[data-q="ob-next"]', { after: 900 })
  await caption('Onboarding', 'Connect calendar & email without migrating anything')
  await click('[data-q="connect-gcal"]', { after: 1500 })
  await click('[data-q="connect-gmail"]', { after: 1500 })
  await click('[data-q="ob-next"]', { after: 900 })
  await caption('Onboarding', 'Invite teammates with role-based access')
  await fill('[data-q="invite-input"]', 'kemi@paystride.co')
  await click('[data-q="invite-add"]', { after: 900 })
  await click('[data-q="ob-next"]', { after: 900 })
  await caption('Onboarding', 'Workspace ready — a small celebration, then straight to the first mandate')
  await wait(3000)
  await click('[data-q="ob-next"]', { after: 1200 })
})

chapter('intake', async () => {
  await scene('03', { k: 'Recruiter journey', t: 'Explain the job, get a real mandate', s: 'Ada describes outcomes in plain words. Q clarifies, checks feasibility and writes a versioned brief.' })
  await go('/app/intake', 2200)
  await caption('Role intake', 'Ada describes the work — not a job title')
  await fill('[data-q="intake-input"]', 'We need a backend engineer who can stop our API failures and speed up the database. Up to $2,000/month, must overlap our hours.', 22)
  await click('[data-q="intake-send"]', { after: 2600 })
  await caption('Role intake', 'The mandate builds live on the right as Q asks clarifying questions')
  await wait(1200)
  await click('[data-q="chip-1-2"]', { after: 1900 })
  await click('[data-q="chip-2-0"]', { after: 1900 })
  await click('[data-q="chip-3-1"]', { after: 2400 })
  await caption('Feasibility review', '“Senior” at $2,000 is unrealistic — Q explains the trade-offs and offers options')
  await wait(2600)
  await hover('[data-q="feas-budget"]', 800)
  await hover('[data-q="feas-junior"]', 800)
  await click('[data-q="feas-mid"]', { after: 1500 })
  await caption('Feasibility review', 'Mandate v2 saved — v1 is kept in history with the reason')
  await wait(2800)
  await caption('Role intake', 'Confirm, and Q searches only permissioned sources')
  await click('[data-q="start-search"]', { after: 2600 })
})

chapter('shortlist', async () => {
  await scene('04', { k: 'Recruiter journey', t: 'Evidence, not noise', s: 'Results stream in with provenance, freshness and what Q doesn’t know. Fit and interest are scored separately.' })
  await go('/app/shortlist', 600)
  await caption('Shortlist', 'Results stream progressively from four permissioned sources')
  await wait(3600)
  await caption('Q-Match', 'Each candidate: employer fit (F), their compatibility (A), mutual √(F×A), evidence coverage')
  await hover('[data-q="cand-femi"] >> text=MUTUAL', 1400)
  await caption('Q-Match', 'Sort by employer fit: Tobi leads… but he’d never accept the budget')
  await click('button:has-text("Employer fit")', { after: 2200 })
  await click('button:has-text("Mutual")', { after: 2000 })
  await caption('Recruiter correction', '“Not this kind of candidate” edits the mandate and re-ranks — decisions kept')
  await click('[data-q="less-aisha"]', { after: 900 })
  await click('[data-q="reason-oncall"]', { after: 3200 })
  await caption('Candidate detail', 'Why Q ranked Femi here — every requirement linked to evidence and confidence')
  await click('[data-q="cand-femi"] >> text=Femi Okafor', { after: 1600 })
  await page.locator('.drawer > div').nth(1).evaluate((el) => el.scrollTo({ top: 360, behavior: 'smooth' }))
  await wait(2200)
  await page.locator('.drawer > div').nth(1).evaluate((el) => el.scrollTo({ top: 900, behavior: 'smooth' }))
  await wait(2000)
  await caption('Mutual interest', 'Q drafts a confidential interest check — nothing is sent without approval')
  await click('[data-q="compose-interest"]', { after: 1800 })
  await click('[role=switch] >> nth=0', { after: 900 })
  await click('[role=switch] >> nth=0', { after: 700 })
  await click('[data-q="approve-send"]', { after: 3800 })
  await caption('Mutual interest', 'Femi accepts — pay, remote and notice all confirmed before any interview')
  await wait(2000)
  await page.keyboard.press('Escape')
  await wait(900)
})

chapter('pipeline', async () => {
  await scene('05', { k: 'Recruiter journey', t: 'Pipeline & assessments', s: 'Clear ownership per stage, structured Q screens, practical tasks and independent scorecards.' })
  await go('/app/pipeline', 1600)
  await caption('Pipeline', 'Drag Femi forward — Q coordinates the next step automatically')
  await drag('[data-q="k-femi"]', '[data-q="lane-screened"]')
  await wait(1600)
  await drag('[data-q="k-femi"]', '[data-q="lane-interviewed"]')
  await wait(1800)
  await caption('Assessments', 'Q-led structured screen: transcript tagged against the rubric, AI advice labelled')
  await click('[data-q="to-assess"]', { after: 2600 })
  await scrollTo(300, 1200)
  await wait(1200)
  await scrollTo(0, 900)
  await caption('Assessments', 'Practical task: a standardised exercise with qualified human review')
  await click('button[role=tab]:has-text("Practical task")', { after: 2600 })
  await click('[data-q="request-review"]', { after: 2200 })
  await caption('Scorecards', 'Independent scorecards stay hidden until each reviewer submits')
  await click('button[role=tab]:has-text("Scorecards")', { after: 1200 })
  await click('[data-q="score-r1-5"]', { after: 300 })
  await click('[data-q="score-r2-5"]', { after: 300 })
  await click('[data-q="score-r4-3"]', { after: 400 })
  await click('[data-q="submit-scorecard"]', { after: 2800 })
})

chapter('decision', async () => {
  await scene('06', { k: 'Recruiter journey', t: 'A human decides', s: 'Side-by-side against the original rubric. Q advises; Ada records the decision and makes the offer.' })
  await go('/app/decision', 2400)
  await caption('Decision', 'Compare finalists against the original rubric — AI advice clearly labelled')
  await hover('text=AI advice', 1600)
  await click('[data-q="choose-femi"]', { after: 600 })
  await caption('Decision', 'A written reason is required — stored with rubric and model versions for audit')
  await fill('[data-q="decision-reason"]', 'Strongest on both must-haves; incident evidence confirmed by Tolu.', 26)
  await click('[data-q="make-offer"]', { after: 1200 })
  await caption('Offer', 'Offer builder checks the budget ceiling as you adjust')
  await slide('.modal input[type=range]', 1.0)
  await wait(1000)
  await slide('.modal input[type=range]', 0.5)
  await wait(700)
  await click('[data-q="send-offer"]', { after: 1200 })
  await caption('Offer', 'Offer sent · others notified kindly with feedback · mandate closed on day 9')
  await wait(4200)
})

chapter('workspace', async () => {
  await scene('07', { k: 'Recruiter journey', t: 'Delegate with guardrails', s: 'Policy-bound Q agents, an agency console, analytics and a full audit trail.' })
  await go('/app/agents', 1400)
  await caption('Q agents', 'Live agent run: every action scoped, logged and escalated when it should be')
  await wait(3200)
  await click('[data-q="new-agent"]', { after: 1200 })
  await caption('Q agents', 'Permitted tools, spend cap, time-to-live — final decisions are never delegated')
  await click('.drawer [role=switch] >> nth=3', { after: 600 })
  await slide('[data-q="agent-budget"]', 0.42)
  await click('.drawer button.chip:has-text("7 days")', { after: 600 })
  await click('[data-q="launch-agent"]', { after: 2200 })
  await caption('Agency console', 'Representation ledger with a duplicate-submission guard')
  await click('[data-q="nav-agencyconsole"]', { after: 1800 })
  await click('[data-q="submit-candidate"]', { after: 2400 })
  await click('[data-q="ask-consent"]', { after: 1600 })
  await caption('Analytics', 'Funnel, stage delays vs baseline and hours saved')
  await click('[data-q="nav-analytics"]', { after: 3200 })
  await scrollTo(400, 1200)
  await wait(1600)
  await caption('Trust & audit', 'Audit trail, fairness monitoring and spend controls')
  await click('[data-q="nav-trustaudit"]', { after: 2400 })
  await click('button[role=tab]:has-text("Fairness")', { after: 2400 })
  await click('button[role=tab]:has-text("Spend controls")', { after: 2400 })
  await caption('Notifications', 'Notification centre and the overview dashboard')
  await click('[data-q="nav-overview"]', { after: 2200 })
  await click('[data-q="bell"]', { after: 2200 })
  await click('[data-q="bell"]', { after: 600 })
  await scrollTo(500, 1400)
  await wait(1200)
  await scrollTo(0, 1000)
  await caption('Sign in', 'Returning users: sign in, with inline error feedback')
  await go('/login', 1400)
  await click('[data-q="li-submit"]', { after: 1200 })
  await fill('[data-q="li-email"]', 'ada@paystride.co')
  await fill('[data-q="li-password"]', 'password123', 50)
  await click('[data-q="li-submit"]', { after: 1800 })
})

chapter('candidate-signup', async () => {
  await store({ offerSent: false, inviteStatus: 'pending', interviewDone: false, offerAccepted: false })
  await scene('08', { k: 'Candidate journey', t: 'Femi builds a private profile', s: 'A passive senior developer. Wants a better role without alerting his current employer.', p: 'Persona: Femi · passive senior developer' }, 4600)
  await go('/', 900)
  await caption('Sign up', '“I’m looking for work” — free, always')
  await click('[data-q="hero-seek"]', { after: 1100 })
  await fill('[data-q="su-name"]', 'Femi Okafor')
  await fill('[data-q="su-email"]', 'femi.okafor@mail.com')
  await fill('[data-q="su-password"]', 'Ledger-2B-rows!', 55)
  await click('[data-q="su-submit"]', { after: 1600 })
  await type('739204', 170)
  await wait(2600)
  await caption('Onboarding', 'Upload a CV or talk to Q — sensitive data is excluded automatically')
  await hover('[data-q="cv-drop"]', 900)
  await click('[data-q="cv-upload"]', { after: 3800 })
  await caption('Onboarding', 'Every extracted claim needs Femi’s approval before it’s used')
  await wait(1600)
  await click('[data-q="claim-5"]', { after: 700 })
  await click('[data-q="claim-5"]', { after: 700 })
  await click('[data-q="ob-next"]', { after: 900 })
  await caption('Onboarding', 'Preferences: pay floor with market context, pattern, direction')
  await slide('[data-q="pay-range"]', 0.31)
  await click('button[role=tab]:has-text("Hybrid")', { after: 500 })
  await click('button[role=tab]:has-text("Remote")', { after: 500 })
  await click('[data-q="dir-3"]', { after: 600 })
  await click('[data-q="ob-next"]', { after: 900 })
  await caption('Onboarding', 'Confidential mode — his current employer is auto-blocked')
  await click('[data-q="vis-open"]', { after: 600 })
  await click('[data-q="vis-confidential"]', { after: 1400 })
  await click('[data-q="ob-next"]', { after: 900 })
  await caption('Onboarding', 'Optional evidence: prove a skill once, reuse it everywhere')
  await click('[data-q="evid-gh"]', { after: 700 })
  await click('[data-q="evid-port"]', { after: 700 })
  await click('[data-q="ob-next"]', { after: 900 })
  await caption('Onboarding', 'Profile live — privately. One employer has already invited him.')
  await wait(3200)
  await click('[data-q="ob-next"]', { after: 1600 })
})

chapter('candidate-invite', async () => {
  await scene('09', { k: 'Candidate journey', t: 'Invite → interview', s: 'A confidential interest check, selective disclosure, then a structured screen that survives a dropped connection.' })
  await go('/me', 1800)
  await caption('Candidate home', 'Opportunities ranked by fit both ways — and a confidential invite')
  await hover('text=Opportunities that fit both ways', 1000)
  await click('[data-q="open-invite"]', { after: 1800 })
  await caption('Invite', 'Fit against his own preferences, and exactly what the employer will see')
  await hover('text=How this fits what you told Q', 1200)
  await click('.card [role=switch] >> nth=2', { after: 700 })
  await click('.card [role=switch] >> nth=2', { after: 600 })
  await click('[data-q="accept-invite"]', { after: 2000 })
  await caption('Invite', 'Company revealed on acceptance. Choose text, voice or video')
  await click('[data-q="format-voice"]', { after: 500 })
  await click('[data-q="format-text"]', { after: 700 })
  await click('[data-q="start-interview"]', { after: 1600 })
  await caption('Interview', 'Disclosure up front: AI interviewer, human decision, accommodations available')
  await wait(1800)
  await click('[data-q="begin-interview"]', { after: 3200 })
  await caption('Interview', 'Answers checkpoint automatically')
  await fill('[data-q="answer-input"]', 'A settlement job held row locks on our ledger table, so payouts timed out. I traced it with pg_stat_activity and moved the job to batched updates with SKIP LOCKED.', 14)
  await click('[data-q="answer-send"]', { after: 2800 })
  await fill('[data-q="answer-input"]', 'Post-mortem within 48 hours, an alert on lock wait time and a runbook. Incidents dropped from five a month to one.', 14)
  await click('[data-q="answer-send"]', { after: 1600 })
  await caption('Failure path', 'Connection drops (Emeka’s scenario) — progress is safe; resume or switch to low-data')
  await wait(2600)
  await click('[data-q="resume-low"]', { after: 4200 })
  await fill('[data-q="answer-input"]', 'A transfers lookup scanned 4M rows. A composite index on account, status and created_at took p95 from 2.1s to 86ms.', 14)
  await click('[data-q="answer-send"]', { after: 3400 })
  await fill('[data-q="answer-input"]', 'One incident channel, a status update every 15 minutes, and a plain-English summary for support.', 14)
  await click('[data-q="answer-send"]', { after: 2600 })
  await caption('Interview', 'Done — with a committed review window instead of silence')
  await wait(1600)
  await click('[data-q="to-applications"]', { after: 3600 })
})

chapter('candidate-growth', async () => {
  await scene('10', { k: 'Candidate journey', t: 'Grow between applications', s: 'Private rehearsal, a reusable evidence wallet, targeted growth and full control of personal data.' })
  await go('/me/rehearsal', 1600)
  await caption('Practice', 'Private interview rehearsal — never visible to employers')
  await click('[data-q="rec-start"]', { after: 3600 })
  await click('[data-q="rec-stop"]', { after: 3800 })
  await caption('Evidence wallet', 'Verified evidence with source; per-employer access he can revoke')
  await click('[data-q="cnav-evidencewallet"]', { after: 2200 })
  await click('button:has-text("Revoke")', { after: 1600 })
  await click('.toast button:has-text("Undo")', { after: 1400 })
  await caption('Growth', 'Competency gaps from real interviews and target roles — not a course catalogue')
  await click('[data-q="cnav-growth"]', { after: 2000 })
  await click('[data-q="grow-0"]', { after: 1800 })
  await caption('Privacy & data', 'Visibility, consent, access log, export, correction and deletion')
  await click('[data-q="cnav-privacydata"]', { after: 2200 })
  await click('button:has-text("Download my data")', { after: 2200 })
})

chapter('candidate-offer', async () => {
  await store({ offerSent: true })
  await scene('11', { k: 'Candidate journey', t: 'The offer', s: 'Status that never goes silent — and an offer checked against everything Femi asked for.' })
  await go('/me/applications', 2600)
  await caption('Applications', 'Live status from the employer, step by step')
  await wait(1200)
  await click('[data-q="view-offer"]', { after: 2200 })
  await caption('Offer', 'Every term checked against his preferences, with Q’s independent take')
  await hover('text=Q’s take', 1800)
  await click('[data-q="accept-offer"]', { after: 1200 })
  await caption('Offer', 'Hired — and his evidence comes with him')
  await wait(4800)
  await caption('', '')
})

chapter('outro', async () => {
  await scene('outro', { t: 'Hire on evidence. Get hired on evidence.', s: 'Talent Q · UI/UX prototype · October 2026' }, 6500)
})

/* ---------------- run ---------------- */
await page.goto(BASE + '#/scene/intro?t=' + encodeURIComponent('Hire on evidence, not noise.'))
await page.evaluate(() => { localStorage.clear(); document.fonts && document.fonts.ready })
await page.reload()
await wait(1500)
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })
const marks = []
for (const c of chapters) {
  if (ONLY && !ONLY.includes(c.id)) continue
  const t0 = Date.now()
  marks.push({ id: c.id, start: frames.length ? frames[frames.length - 1].t : 0 })
  console.log('▶', c.id)
  try { await c.fn() } catch (e) { console.error('✖', c.id, e.message) }
  console.log('  done in', ((Date.now() - t0) / 1000).toFixed(1) + 's', '· frames', frames.length)
}
await cdp.send('Page.stopScreencast')
await wait(800)
await browser.close()

/* ---------------- encode ---------------- */
const list = []
for (let i = 0; i < frames.length; i++) {
  const d = i < frames.length - 1 ? Math.max(0.001, frames[i + 1].t - frames[i].t) : 1
  list.push(`file '${frames[i].f}'`, `duration ${d.toFixed(4)}`)
}
list.push(`file '${frames[frames.length - 1].f}'`)
fs.writeFileSync(path.join(RAW, 'list.txt'), list.join('\n'))
const total = frames[frames.length - 1].t - frames[0].t
console.log(`Encoding ${frames.length} frames · ${(total / 60).toFixed(1)} min`)
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(RAW, 'list.txt'),
  '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-tune', 'animation', '-movflags', '+faststart', OUT], { stdio: 'inherit' })
fs.writeFileSync(path.join(here, 'chapters.json'), JSON.stringify(marks.map((m) => ({ id: m.id, at: +(m.start ? m.start - frames[0].t : 0).toFixed(1) })), null, 2))
console.log('✔', OUT)
