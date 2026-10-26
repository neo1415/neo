// Records the Talent Q product film.
//
//   npm run build && npx vite preview --port 4173 &
//   node video/record.mjs            → video/talentq-film.mp4
//
// The film page (#/film) holds a laptop and a phone running the real app in iframes.
// This script plays both people: it moves a cursor (or a fingertip on the phone), talks to Q,
// and directs the camera and titles. Frames come from the DevTools screencast at 1920×1080
// and are stitched at true speed with ffmpeg.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch { pw = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright') }

const here = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE_URL || 'http://localhost:4173/'
const RAW = path.join(here, 'raw')
const OUT = path.join(here, 'talentq-film.mp4')
fs.rmSync(RAW, { recursive: true, force: true })
fs.mkdirSync(RAW, { recursive: true })

const browser = await pw.chromium.launch({ args: ['--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'] })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await context.newPage()
page.on('pageerror', (e) => console.error('pageerror', e.message))

/* ---------- pointer overlay on the film stage ---------- */
async function installPointer() {
  await page.evaluate(() => {
    const st = document.createElement('style')
    st.textContent = `
      #__p{position:fixed;left:0;top:0;z-index:99999;pointer-events:none;transition:opacity .4s}
      #__p .arrow{filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}
      #__p .touch{display:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(240,211,149,.22);border:2px solid rgba(240,211,149,.75);box-shadow:0 0 24px rgba(240,211,149,.35)}
      #__p.touch .arrow{display:none} #__p.touch .touch{display:block}
      #__p.down .touch{transform:scale(.8)} #__p.down .arrow{transform:scale(.88)}
      .__rip{position:fixed;z-index:99998;pointer-events:none;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:2px solid #d9b56b;animation:__r .6s cubic-bezier(0,0,.2,1) forwards}
      @keyframes __r{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}`
    document.head.appendChild(st)
    const p = document.createElement('div')
    p.id = '__p'
    p.style.opacity = '0'
    p.innerHTML = '<svg class="arrow" width="30" height="30" viewBox="0 0 30 30"><path d="M5 3l18 10-7.6 1.9L11.4 22z" fill="#0b0a08" stroke="#ece6da" stroke-width="1.8" stroke-linejoin="round"/></svg><div class="touch"></div>'
    document.body.appendChild(p)
    window.__pt = (x, y) => { p.style.transform = `translate(${x - 5}px, ${y - 3}px)` }
    window.__ptMode = (m) => { p.classList.toggle('touch', m === 'touch'); p.style.opacity = m === 'off' ? '0' : '1' }
    window.__ptDown = (on, x, y) => { p.classList.toggle('down', on); if (on) { const r = document.createElement('div'); r.className = '__rip'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700) } }
  })
}

/* ---------- capture ---------- */
const frames = []
const cdp = await context.newCDPSession(page)
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const f = path.join(RAW, `f${String(frames.length).padStart(6, '0')}.jpg`)
  frames.push({ f, t: metadata.timestamp })
  fs.writeFile(f, Buffer.from(data, 'base64'), () => {})
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})

/* ---------- direction helpers ---------- */
const wait = (ms) => page.waitForTimeout(ms)
const film = (fn, arg) => page.evaluate(([f, a]) => window.__film[f](a), [fn, arg])
const layout = (l) => film('layout', l)
const title = (t) => film('title', t)
const load = async (which, route) => { await page.evaluate(([w, r]) => window.__film.load(w, r), [which, route]); await wait(1200) }
const F = (name) => page.frame({ name })
let px = 960, py = 540
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

async function moveTo(x, y) {
  const d = Math.hypot(x - px, y - py)
  const steps = Math.max(10, Math.min(40, Math.round(d / 18)))
  const mx = (px + x) / 2 + (y - py) * 0.07, my = (py + y) / 2 - (x - px) * 0.07
  const sx = px, sy = py
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps)
    const nx = (1 - t) ** 2 * sx + 2 * (1 - t) * t * mx + t * t * x
    const ny = (1 - t) ** 2 * sy + 2 * (1 - t) * t * my + t * t * y
    await page.evaluate(([a, b]) => window.__pt(a, b), [nx, ny])
    await page.mouse.move(nx, ny)
    await wait(16)
  }
  px = x; py = y
}

async function tap(device, q, { after = 600, hover = 220, sel } = {}) {
  await page.evaluate((m) => window.__ptMode(m), device === 'phone' ? 'touch' : 'arrow')
  const loc = F(device).locator(sel || `[data-q="${q}"]`).first()
  await loc.waitFor({ state: 'visible', timeout: 45000 })
  await wait(250)
  const b = await loc.boundingBox()
  const x = b.x + b.width / 2, y = b.y + b.height / 2
  await moveTo(x, y)
  await wait(hover)
  await page.evaluate(([a, c]) => window.__ptDown(true, a, c), [x, y])
  await page.mouse.down(); await wait(80); await page.mouse.up()
  await page.evaluate(() => window.__ptDown(false))
  await wait(after)
}

async function hover(device, sel, ms = 900) {
  await page.evaluate((m) => window.__ptMode(m), device === 'phone' ? 'touch' : 'arrow')
  const b = await F(device).locator(sel).first().boundingBox()
  await moveTo(b.x + b.width / 2, b.y + b.height / 2)
  await wait(ms)
}

// Talk to Q: wait until Q is listening for an answer, press the mic, let the words land.
async function speak(device, { after = 600 } = {}) {
  await F(device).locator('[data-expecting="true"]').waitFor({ timeout: 60000 })
  await wait(500)
  await tap(device, 'mic', { after: 200 })
  await F(device).locator('[data-expecting="true"]').waitFor({ state: 'detached', timeout: 60000 }).catch(() => {})
  await wait(after)
}

async function typeAnswer(device, text) {
  await F(device).locator('[data-expecting="true"]').waitFor({ timeout: 60000 })
  await wait(500)
  await tap(device, 'dock-input', { after: 150 })
  await page.keyboard.type(text, { delay: 26 })
  await wait(300)
  await tap(device, 'dock-send', { after: 600 })
}

const pointerOff = () => page.evaluate(() => window.__ptMode('off'))
const until = (device, sel, timeout = 60000) => F(device).locator(sel).first().waitFor({ state: 'visible', timeout })

/* ---------- the film ---------- */
await page.goto(BASE + '#/film')
await page.waitForFunction(() => !!window.__film)
await page.evaluate(() => document.fonts.ready)
await installPointer()
await wait(800)
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })
const marks = []
const mark = (id) => { marks.push({ id, t: frames.length ? frames[frames.length - 1].t : 0 }); console.log('▶', id) }

// 1 · Cold open
mark('open')
await wait(600)
await film('orb', 'idle')
await wait(1400)
await title({ kind: 'full', text: 'Hiring got loud.', size: 64 })
await wait(2600)
await title({ kind: 'full', text: 'Hundreds of CVs. Days of silence.', size: 64 })
await wait(3000)
await film('orb', 'listening')
await title({ kind: 'full', text: 'What if you could just say what you need?', size: 64 })
await wait(3400)
await film('orb', 'speaking')
await title({ kind: 'full', text: 'Talent Q', sub: 'Hire by talking.', size: 104 })
await wait(3600)
await title(null)
await film('orb', null)
await wait(900)

// 2 · Ada finds Talent Q
mark('ada-landing')
await load('desk', '/')
await layout('desk')
await wait(1000)
await title({ kind: 'super', sub: 'Ada Nwosu · founder, Paystride · Lagos', text: 'Needs one backend engineer. Has no recruiter.' })
await wait(5200)
await title(null)
await hover('desk', '[data-q="hero-work"]', 500)
await tap('desk', 'hero-hire', { after: 1500 })

// 3 · Onboarding is a conversation
mark('ada-onboarding')
await tap('desk', 'google', { after: 900 })
await title({ kind: 'super', sub: 'No forms', text: 'Q asks. Ada answers out loud.' })
await speak('desk')
await speak('desk')
await title(null)
await until('desk', '[data-q="calendar"]')
await wait(1800)
await tap('desk', 'calendar', { after: 1600 })
await tap('desk', 'workspace-ok', { after: 1500 })

// 4 · The brief
mark('ada-brief')
await speak('desk', { after: 400 })
await title({ kind: 'super', sub: 'Brief, live', text: 'Q turns one sentence into a real brief.' })
await until('desk', '[data-q="opt-mid"]', 40000)
await title({ kind: 'super', sub: 'The honest part', text: '“Senior” at $2,000 won’t find anyone. Q says so first.' })
await wait(2600)
await hover('desk', '[data-q="opt-raise"]', 700)
await hover('desk', '[data-q="opt-junior"]', 700)
await tap('desk', 'opt-mid', { after: 1200 })
await title(null)
await until('desk', '[data-q="approve"]', 40000)
await wait(2200)
await tap('desk', 'approve', { after: 2600 })

// 5 · Night
mark('night')
await pointerOff()
await title({ kind: 'super', sub: '11:42 pm', text: 'Ada sleeps. Q keeps working, only where people agreed to be found.' })
await wait(9000)
await title(null)

// 6 · Meanwhile, Femi
mark('femi-onboarding')
await layout('phone')
await load('phone', '/start?role=work')
await title({ kind: 'super', sub: 'Femi Okafor · senior engineer · Lagos', text: 'Not looking. Quietly curious.' })
await tap('phone', 'google', { after: 900 })
await title(null)
await tap('phone', 'cv', { after: 1800 })
await until('phone', '[data-q="claim-yes"]', 30000)
await title({ kind: 'super', sub: 'Consent first', text: 'Nothing from his CV is used until he says it’s right.' })
await wait(1400)
for (let i = 0; i < 4; i++) await tap('phone', 'claim-yes', { after: 650 })
await title(null)
await until('phone', '[data-q="pay"]', 30000)
await wait(900)
await tap('phone', 'pay-ok', { after: 900 })
await until('phone', '[data-q="choice-conf"]', 30000)
await wait(1500)
await tap('phone', 'choice-conf', { after: 1200 })
await title({ kind: 'super', sub: 'Confidential', text: 'His current employer will never see him here.' })
await wait(4200)
await title(null)

// 7 · Morning: one decision, not a dashboard
mark('morning')
await layout('desk')
await pointerOff()
await title({ kind: 'super', sub: '7:05 am', text: 'Seven people fit. Q brings Ada one decision.' })
await until('desk', '[data-q="invite"]', 40000)
await wait(1800)
await title(null)
await tap('desk', 'why', { after: 1400 })
await F('desk').locator('[role=dialog] > div').nth(1).evaluate((el) => el.scrollTo({ top: 420, behavior: 'smooth' }))
await wait(2600)
await tap('desk', 'lens-close', { after: 1200 })
await tap('desk', 'invite', { after: 1400 })
await until('desk', '[data-q="send-invite"]')
await wait(1600)
await tap('desk', 'toggle-hide', { after: 900 })
await tap('desk', 'toggle-hide', { after: 700 })
await tap('desk', 'send-invite', { after: 600 })

// 8 · The invite lands on Femi's phone
mark('invite')
await layout('split')
await wait(1600)
await title({ kind: 'super', sub: 'Seconds later', text: 'A confidential invite. Pay and remote already checked.' })
await until('phone', '[data-q="interested"]', 40000)
await wait(1800)
await tap('phone', 'what-see', { after: 1500 })
await tap('phone', 'share-pay', { after: 700 })
await tap('phone', 'share-pay', { after: 700 })
await tap('phone', 'lens-close', { after: 900 })
await title(null)
await tap('phone', 'interested', { after: 1200 })
await title({ kind: 'super', sub: 'Mutual interest, before anyone books a meeting', text: 'Femi said yes. Ada hears it instantly.' })
await until('desk', '[data-q="approve"]', 40000)
await wait(1600)
await tap('desk', 'approve', { after: 900 })
await title(null)

// 9 · Q interviews Femi
mark('interview')
await until('phone', '[data-q="start-now"]', 40000)
await wait(1400)
await tap('phone', 'start-now', { after: 1600 })
await title({ kind: 'super', sub: 'The interview', text: 'Q interviews. A person decides.' })
await wait(2600)
await tap('phone', 'begin', { after: 600 })
await title(null)
await tap('desk', 'watch', { after: 300 })
await layout('splitDesk')
await wait(900)
await speak('phone', { after: 300 })
await speak('phone', { after: 300 })
await until('phone', '[data-q="low-data"]', 30000)
await title({ kind: 'super', sub: 'Signal lost', text: 'Nothing is lost. Femi carries on in low-data text.' })
await wait(2400)
await tap('phone', 'low-data', { after: 600 })
await typeAnswer('phone', 'A transfers lookup scanned 4M rows. A composite index took p95 from 2.1s to 86ms.')
await title(null)
await speak('phone', { after: 300 })
await until('phone', '[data-q="back-home"]', 40000)
await wait(1800)
await tap('phone', 'back-home', { after: 1200 })

// 10 · Ada decides
mark('decide')
await layout('desk')
await title({ kind: 'super', sub: 'Your call', text: 'Q advises. Ada decides.' })
await until('desk', '[data-q="offer"]', 40000)
await wait(2600)
await title(null)
await hover('desk', '[data-q="offer"]', 600)
await tap('desk', 'offer', { after: 1600 })
await tap('desk', 'send-offer', { after: 2600 })

// 11 · Femi's offer
mark('offer')
await layout('phone')
await until('phone', '[data-q="accept-offer"]', 40000)
await title({ kind: 'super', sub: 'Femi', text: 'Every term checked against what he asked for.' })
await wait(3400)
await title(null)
await tap('phone', 'accept-offer', { after: 1800 })
await pointerOff()
await layout('split')
await wait(5200)

// 12 · Close
mark('close')
await layout('black')
await wait(900)
await film('orb', 'done')
await title({ kind: 'full', text: 'Talent Q', sub: 'Hire by talking. Get hired for what you can do.', size: 104 })
await wait(5600)
await title(null)
await film('orb', null)
await wait(1500)

await cdp.send('Page.stopScreencast')
await wait(600)
await browser.close()

/* ---------- encode ---------- */
const list = []
for (let i = 0; i < frames.length; i++) {
  const d = i < frames.length - 1 ? Math.max(0.001, frames[i + 1].t - frames[i].t) : 1
  list.push(`file '${frames[i].f}'`, `duration ${d.toFixed(4)}`)
}
list.push(`file '${frames[frames.length - 1].f}'`)
fs.writeFileSync(path.join(RAW, 'list.txt'), list.join('\n'))
const t0 = frames[0].t
console.log(`Encoding ${frames.length} frames · ${((frames[frames.length - 1].t - t0) / 60).toFixed(1)} min`)
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(RAW, 'list.txt'),
  '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-tune', 'film', '-movflags', '+faststart', OUT], { stdio: 'inherit' })
fs.writeFileSync(path.join(here, 'chapters.json'), JSON.stringify(marks.map((m) => ({ id: m.id, at: +Math.max(0, m.t - t0).toFixed(1) })), null, 2))
fs.rmSync(RAW, { recursive: true, force: true })
console.log('✔', OUT)
