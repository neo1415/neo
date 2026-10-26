import { useEffect, useRef } from 'react'

// Q's presence: a soft, grainy body of light rendered on canvas.
// States: idle (slow breath) · listening (ripples, swells with voice) · thinking (orbiting highlight)
//         speaking (syllable pulse) · working (satellites — Q busy in the background)
const targets = {
  idle: { amp: 0.0, wobble: 0.035, glow: 0.55, think: 0, ripple: 0, sats: 0 },
  listening: { amp: 0.06, wobble: 0.06, glow: 0.8, think: 0, ripple: 1, sats: 0 },
  thinking: { amp: 0.0, wobble: 0.05, glow: 0.7, think: 1, ripple: 0, sats: 0 },
  speaking: { amp: 0.05, wobble: 0.045, glow: 0.85, think: 0, ripple: 0, sats: 0 },
  working: { amp: 0.0, wobble: 0.04, glow: 0.6, think: 0.35, ripple: 0, sats: 1 },
  done: { amp: 0.12, wobble: 0.03, glow: 1.1, think: 0, ripple: 0.6, sats: 0 },
}

let grain
function getGrain() {
  if (grain) return grain
  grain = document.createElement('canvas')
  grain.width = grain.height = 256
  const g = grain.getContext('2d')
  const img = g.createImageData(256, 256)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return grain
}

export default function QPresence({ size = 280, state = 'idle', level, className, style }) {
  const ref = useRef(null)
  const stRef = useRef(state)
  const lvlRef = useRef(level)
  stRef.current = state
  lvlRef.current = level

  useEffect(() => {
    const cv = ref.current
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = size * 1.9
    cv.width = W * dpr
    cv.height = W * dpr
    const ctx = cv.getContext('2d')
    ctx.scale(dpr, dpr)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cur = { ...targets.idle }
    const ripples = []
    let lastRipple = 0
    let raf
    const t0 = performance.now()
    const g = getGrain()

    const frame = (now) => {
      const t = reduce ? 0 : (now - t0) / 1000
      const tgt = targets[stRef.current] || targets.idle
      for (const k in cur) cur[k] += (tgt[k] - cur[k]) * 0.06

      const cx = W / 2
      const cy = W / 2
      const r0 = size * 0.36
      // voice amplitude: provided level, or synthetic syllables while speaking/listening
      let voice = 0
      if (lvlRef.current != null) voice = lvlRef.current
      else if (stRef.current === 'speaking') voice = Math.max(0, Math.sin(t * 9.3) * 0.5 + Math.sin(t * 5.1 + 1) * 0.35 + 0.15)
      else if (stRef.current === 'listening') voice = Math.max(0, Math.sin(t * 6.1) * 0.4 + Math.sin(t * 13.7) * 0.25 + 0.2)
      const breath = Math.sin(t * 1.1) * 0.025
      const r = r0 * (1 + breath + cur.amp * voice + (stRef.current === 'done' ? 0.06 : 0))

      ctx.clearRect(0, 0, W, W)

      // halo
      const halo = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.4)
      halo.addColorStop(0, `rgba(232, 190, 110, ${0.22 * cur.glow})`)
      halo.addColorStop(0.45, `rgba(190, 140, 70, ${0.08 * cur.glow})`)
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, W, W)

      // ripples while listening
      if (cur.ripple > 0.2 && t - lastRipple > 0.9) { ripples.push({ b: t }); lastRipple = t }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const p = (t - ripples[i].b) / 2.6
        if (p > 1) { ripples.splice(i, 1); continue }
        ctx.beginPath()
        ctx.arc(cx, cy, r * (1.05 + p * 0.9), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(240, 211, 149, ${(1 - p) * 0.35 * cur.ripple})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      // body — organic contour from summed sines
      ctx.save()
      ctx.beginPath()
      const N = 96
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2
        const n = Math.sin(a * 3 + t * 0.9) * 0.5 + Math.sin(a * 5 - t * 1.3) * 0.3 + Math.sin(a * 2 + t * 0.4) * 0.2
        const rr = r * (1 + n * cur.wobble * (1 + voice * 0.8))
        const x = cx + Math.cos(a) * rr
        const y = cy + Math.sin(a) * rr
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      }
      ctx.closePath()
      ctx.filter = `blur(${size * 0.018}px)`
      const body = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.32, r * 0.05, cx, cy, r * 1.05)
      body.addColorStop(0, 'rgba(255, 246, 225, 0.98)')
      body.addColorStop(0.34, 'rgba(244, 212, 146, 0.96)')
      body.addColorStop(0.62, 'rgba(184, 136, 62, 0.9)')
      body.addColorStop(1, 'rgba(70, 50, 20, 0.0)')
      ctx.fillStyle = body
      ctx.fill()
      ctx.filter = 'none'

      // thinking highlight orbiting inside the body
      if (cur.think > 0.02) {
        ctx.globalCompositeOperation = 'lighter'
        const a = t * 2.2
        const hx = cx + Math.cos(a) * r * 0.42
        const hy = cy + Math.sin(a) * r * 0.42
        const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.55)
        hl.addColorStop(0, `rgba(255, 240, 205, ${0.55 * cur.think})`)
        hl.addColorStop(1, 'rgba(255, 240, 205, 0)')
        ctx.fillStyle = hl
        ctx.fillRect(0, 0, W, W)
        ctx.globalCompositeOperation = 'source-over'
      }

      // grain, only on the light
      ctx.globalCompositeOperation = 'source-atop'
      ctx.globalAlpha = 0.07
      const ox = (t * 37) % 256
      ctx.drawImage(g, -ox, -ox, 512, 512)
      ctx.drawImage(g, 256 - ox, 256 - ox, 512, 512)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.restore()

      // satellites while Q works in the background
      if (cur.sats > 0.02) {
        for (let k = 0; k < 3; k++) {
          const a = t * (0.7 + k * 0.18) + (k * Math.PI * 2) / 3
          const rr = r * (1.55 + k * 0.12)
          const x = cx + Math.cos(a) * rr
          const y = cy + Math.sin(a) * rr * 0.92
          ctx.beginPath()
          ctx.arc(x, y, 2.4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(240, 211, 149, ${0.85 * cur.sats})`
          ctx.fill()
        }
      }
      if (!reduce) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={`Q is ${state === 'idle' ? 'ready' : state}`}
      style={{ width: size * 1.9, height: size * 1.9, margin: -size * 0.45, display: 'block', pointerEvents: 'none', ...style }}
    />
  )
}
