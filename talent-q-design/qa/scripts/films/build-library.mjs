// Builds the film and clip library page from assemble.mjs's index.json.
//   node build-library.mjs <films dir>   → <films dir>/index.html
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2];
const idx = JSON.parse(readFileSync(path.join(DIR, 'index.json'), 'utf8'));
const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
const FILMS = [['A', 'Film A · Hiring with Q', 'R1–R5'], ['B', 'Film B · Careers with Q', 'T1–T5']];
const journeys = [...new Set(idx.clips.map((c) => c.journey))].sort();

const films = FILMS.map(([id, title, range]) => `
  <section class="film" aria-labelledby="f${id}">
    <h2 id="f${id}">${h(title)} <span class="muted">${range}</span></h2>
    <div class="pair">${['desktop', 'phone'].map((k) => {
      const f = idx[`film-${id}-${k}`]; if (!f) return '';
      return `<figure class="${k}"><video id="v-${id}-${k}" controls preload="metadata" src="film-${id}-${k}.mp4"></video>
        <figcaption><b>${k === 'phone' ? 'Phone' : 'Desktop'}</b> · ${f.minutes} min
          <ol class="chapters">${f.chapters.map((c) => `<li><button type="button" data-v="v-${id}-${k}" data-t="${c.at}">${mmss(c.at)} ${h(c.title)}</button></li>`).join('')}</ol>
        </figcaption></figure>`;
    }).join('')}</div>
  </section>`).join('');

const clips = idx.clips.map((c) => `
  <li class="clip" data-j="${c.journey}" data-k="${c.kind}" data-l="${h(c.label)}">
    <video controls preload="none" src="${h(c.file)}"></video>
    <span class="tag">${c.journey} · ${c.kind} · ${c.seconds}s</span>
    <b>${h(c.label)}</b>
    <span>${h(c.text)}</span>
    <span class="muted small">In ${h(c.film)} at ${mmss(c.at)} · commit ${h(c.commit)}</span>
  </li>`).join('');

writeFileSync(path.join(DIR, 'index.html'), `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Talent Q films and clips</title>
<style>
:root{--paper:#f3efe8;--sheet:#fffdf9;--ink:#1a1714;--ink2:#4a443d;--rule:#ddd5c8;--gold:#8a6414}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.5 Inter,system-ui,sans-serif;padding:clamp(16px,3vw,40px)}
h1{font:400 clamp(28px,3vw,40px)/1.1 Fraunces,Georgia,serif;margin:0 0 6px}h2{font:400 24px/1.2 Fraunces,Georgia,serif;margin:0 0 12px}
.muted{color:var(--ink2)}.small{font-size:13px}.lead{max-width:760px;margin:0 0 28px}
.film{background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:16px;margin-bottom:24px}
.pair{display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,1fr);gap:20px;align-items:start}
@media (max-width:900px){.pair{grid-template-columns:1fr}}
figure{margin:0}video{width:100%;border-radius:10px;background:#141110;display:block}
.chapters{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:2px}
.chapters button{all:unset;cursor:pointer;color:var(--ink2);font-size:14px;padding:4px 0;min-height:24px}
.chapters button:hover,.chapters button:focus-visible{color:var(--ink);text-decoration:underline;outline:2px solid var(--gold);outline-offset:2px}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.filters button{border:1px solid var(--rule);background:transparent;border-radius:999px;padding:6px 12px;min-height:36px;font:inherit;font-size:14px;color:var(--ink2);cursor:pointer}
.filters button[aria-pressed=true]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.clips{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:16px}
.clip{background:var(--sheet);border:1px solid var(--rule);border-radius:14px;padding:12px;display:grid;gap:6px;align-content:start}
.clip[hidden]{display:none}.tag{font:12px/1 "IBM Plex Mono",monospace;letter-spacing:.05em;color:var(--gold);text-transform:uppercase}
</style></head><body>
<h1>Talent Q films and clips</h1>
<p class="lead muted">Recorded from the running prototype at commit <b>${h(idx.commit)}</b>. Every caption is a step that journey's test verified at that moment (✓). All data is simulated; nothing is sent, booked or verified for real. Choose a chapter to jump to it.</p>
${films}
<section aria-labelledby="cl"><h2 id="cl">Curveball clips <span class="muted">(${idx.clips.length})</span></h2>
<div class="filters" role="group" aria-label="Filter clips by journey"><button type="button" aria-pressed="true" data-f="">All</button>${journeys.map((j) => `<button type="button" aria-pressed="false" data-f="${j}">${j}</button>`).join('')}</div>
<ul class="clips">${clips}</ul></section>
<script>
document.querySelectorAll('.chapters button').forEach(b=>b.addEventListener('click',()=>{const v=document.getElementById(b.dataset.v);v.currentTime=+b.dataset.t;v.play();v.focus();}));
const fs=document.querySelectorAll('.filters button');fs.forEach(b=>b.addEventListener('click',()=>{fs.forEach(x=>x.setAttribute('aria-pressed',x===b));document.querySelectorAll('.clip').forEach(c=>{c.hidden=!!b.dataset.f&&c.dataset.j!==b.dataset.f;});}));
</script></body></html>`);
console.log(`library: ${path.join(DIR, 'index.html')} · ${idx.clips.length} clips`);
