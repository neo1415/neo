// Cross-device bus: Ada's desktop and Femi's phone (separate tabs or iframes) hear each other.
const ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('talent-q') : null
const local = new Set()

export function emit(type, data = {}) {
  const msg = { type, data, at: Date.now() }
  ch && ch.postMessage(msg)
  local.forEach((fn) => fn(msg))
  try { sessionStorage.setItem('tq:last:' + type, JSON.stringify(msg)) } catch {}
}

export function on(type, fn) {
  const h = (m) => { const msg = m.data && m.data.type ? m.data : m; if (msg.type === type) fn(msg.data) }
  ch && ch.addEventListener('message', h)
  local.add(h)
  return () => { ch && ch.removeEventListener('message', h); local.delete(h) }
}

export const isFilm = () => {
  try { if (window.top !== window && window.top.location.hash.startsWith('#/film')) return true } catch {}
  return new URLSearchParams(window.location.hash.split('?')[1] || '').get('film') === '1'
}

// Wait for the other side. Standalone demos fall back to a simulated reply so they never dead-end.
export function waitFor(type, { fallbackMs = 6000, signal } = {}) {
  return new Promise((resolve) => {
    let t
    const off = on(type, (d) => { clearTimeout(t); off(); resolve(d) })
    if (!isFilm()) t = setTimeout(() => { off(); resolve({ simulated: true }) }, fallbackMs)
    signal && signal.addEventListener('abort', () => { clearTimeout(t); off() })
  })
}
