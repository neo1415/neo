// Assembles the recordings made by film-hook.mjs into the master films and the clip library.
//   node assemble.mjs <recordings dir> <output dir>
// Per recording: encode the screencast at film size with a caption band below the UI (captions never cover
// the interface). Each caption is a step the journey script verified, stamped with the commit it ran on.
// Per film: a title card per chapter, chapters joined, MP4 chapter markers. Per curveball: a short clip.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const [REC, OUT] = process.argv.slice(2);
const COMMIT = process.env.FILM_COMMIT || execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();
mkdirSync(path.join(OUT, 'clips'), { recursive: true });
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const probe = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const ass = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = (t % 60).toFixed(2).padStart(5, '0'); return `${h}:${String(m).padStart(2, '0')}:${s}`; };
const esc = (s) => s.replace(/\\/g, '').replace(/[{}]/g, '').replace(/\n/g, '\\N');

export const CHAPTERS = {
  R1: ['R1 · Funmi, first-time employer', 'A bakery founder who has never hired: from “I need help but I don’t know who” to a brief, a shortlist and interview times.'],
  R2: ['R2 · Ada, technical recruiter', 'A non-technical recruiter judging technical people: evidence, a safe project viewer, comparison by criteria, interview copilot and feedback.'],
  R3: ['R3 · Ngozi, busy HR team', 'Drafts, approvals and simulated sends; scheduling across Lagos and London; pipeline, team permissions and guidelines.'],
  R4: ['R4 · Dele, high-volume agency', 'Clients kept apart, pools, saved searches, campaigns, submittals and agents running at once.'],
  R5: ['R5 · Bayo, sceptical hiring manager', 'Contradictions, actions outside his role, unfair criteria redirected, memory corrected, sources in conflict, audit.'],
  T1: ['T1 · Amaka, first-time graduate', 'No job history, an unreadable CV, skipped steps — and a profile, matches and an application without anything invented.'],
  T2: ['T2 · Chidi, sales to product or business analysis', 'The career atlas in depth: transferable evidence, gaps, a plan, assessment and reassessment. Practice is never proof.'],
  T3: ['T3 · Tobi, experienced specialist', 'Evidence Passport: uploads, verification, confidential work redacted, different visibility per recruiter, access revoked.'],
  T4: ['T4 · Grace, low-bandwidth phone', 'Plain words, voice or typing, uploads that resume, lite mode, and an interview that survives a lost connection.'],
  T5: ['T5 · Zara, sceptical job seeker', 'Employer signals, honest application status, follow-ups, rejected advice remembered, and asking Q to forget.'],
  J11: ['J11 · One connected journey', 'Tobi asks Kora a question from the role briefing; Ada files it in a campaign, agrees a rubric, reviews his consented walkthrough and emails an invitation; he replies and it is booked. Six disruptions on the way.'],
  J12: ['J12 · Evidence-first hiring', 'Tobi’s CV is thin but his reviewed work shows Postgres; Seyi Okoro’s CV is polished but mostly claims. Q finds both by what they have shown, asks only for what is missing, and both progress. Then Tobi stops sharing an item.'],
};
// Each film ends with the connected journey that crosses to the other side: J12 for hiring, J11 for careers.
const FILMS = [['A', 'Film A · Hiring with Q', ['R1', 'R2', 'R3', 'R4', 'R5', 'J12']], ['B', 'Film B · Careers with Q', ['T1', 'T2', 'T3', 'T4', 'T5', 'J11']]];
const FMT = { desktop: { W: 1920, H: 1080, UIH: 900, FS: 31 }, phone: { W: 1080, H: 1920, UIH: 1640, FS: 40 } };

function nice(text) {
  const kind = (text.match(/\[(mind|info|recover)\]/) || [])[1];
  const label = { mind: 'Curveball · change of mind', info: 'Curveball · missing, conflicting or revoked information', recover: 'Curveball · interruption or recovery' }[kind];
  const body = text.replace(/Curveball\s*/i, '').replace(/\[(mind|info|recover)\]\s*:?\s*/g, '').replace(/^[:·\s]+/, '');
  return { curve: !!kind || /curveball/i.test(text), label, body: body.charAt(0).toUpperCase() + body.slice(1) };
}

function header(f) {
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${f.W}\nPlayResY: ${f.H}\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    `Style: Cap,Inter,${f.FS},&H00ECECE6,&H00ECECE6,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,80,80,${Math.round(f.FS * 1.4)},1\n` +
    `Style: Tag,Inter,${Math.round(f.FS * 0.55)},&H006BB5D9,&H006BB5D9,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,0,0,1,40,40,${Math.round(f.FS * 0.45)},1\n` +
    `Style: Title,Fraunces,${Math.round(f.FS * 2.1)},&H00ECECE6,&H00ECECE6,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,120,120,0,1\n` +
    `Style: Sub,Inter,${Math.round(f.FS * 0.95)},&H00B9C2C4,&H00B9C2C4,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,160,160,${Math.round(f.H * 0.58)},1\n` +
    `Style: Kick,Inter,${Math.round(f.FS * 0.6)},&H006BB5D9,&H006BB5D9,&H00000000,&H00000000,1,0,0,0,100,100,3,0,1,0,0,2,160,160,${Math.round(f.H * 0.58)},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
}

function titleCard(file, f, kicker, title, sub, secs = 4) {
  const tmp = file.replace(/\.mp4$/, '.ass');
  writeFileSync(tmp, header(f) + [`Dialogue: 0,${ass(0)},${ass(secs)},Kick,,0,0,0,,${esc(kicker)}`, `Dialogue: 0,${ass(0)},${ass(secs)},Title,,0,0,0,,${esc(title)}`, `Dialogue: 0,${ass(0.3)},${ass(secs)},Sub,,0,0,0,,${esc(sub)}`].join('\n') + '\n');
  ff(['-f', 'lavfi', '-i', `color=c=0x141110:s=${f.W}x${f.H}:r=30:d=${secs}`, '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo`, '-t', String(secs), '-vf', `ass=${tmp},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-c:a', 'aac', '-shortest', file]);
  rmSync(tmp);
}

/** Encode one recording; returns its file, duration and caption list (times relative to the file). */
function encode(dir, id, kind) {
  const f = FMT[kind];
  const frames = JSON.parse(readFileSync(path.join(dir, 'frames.json'), 'utf8'));
  const caps = JSON.parse(readFileSync(path.join(dir, 'captions.json'), 'utf8'));
  if (frames.length < 2) return null;
  const t0 = frames[0].t;
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const dur = i < frames.length - 1 ? Math.min(8, Math.max(0.001, frames[i + 1].t - frames[i].t)) : 1.5;
    list.push(`file '${path.join(dir, frames[i].f)}'`, `duration ${dur.toFixed(4)}`);
  }
  list.push(`file '${path.join(dir, frames[frames.length - 1].f)}'`);
  writeFileSync(path.join(dir, 'list.txt'), list.join('\n'));
  // Long idle gaps (> 8 s, e.g. a script waiting on a timer) are shortened; shift captions to match.
  const shift = (t) => { let s = 0; for (let i = 0; i < frames.length - 1 && frames[i + 1].t <= t; i++) s += Math.max(0, frames[i + 1].t - frames[i].t - 8); return t - t0 - s; };
  const total = shift(frames[frames.length - 1].t) + 1.5;
  const rel = caps.map((c) => ({ ...c, at: Math.max(0, Math.min(total, shift(c.t))) }));
  const ev = [`Dialogue: 0,${ass(0)},${ass(total)},Tag,,0,0,0,,${esc(`${CHAPTERS[id][0].toUpperCase()} · ${kind.toUpperCase()} · COMMIT ${COMMIT} · SIMULATED DATA, NOT A REAL INTEGRATION`)}`];
  // Captions queue: each is held at least 2.4 s; one arriving sooner waits for the previous to finish.
  let free = 0;
  for (const c of rel) { c.show = Math.max(c.at, free); free = c.show + 2.4; }
  rel.forEach((c, i) => {
    const n = nice(c.text); const end = Math.min(total + 3, Math.max(c.show + 2.4, rel[i + 1]?.show ?? total));
    const mark = c.ok ? '{\\c&H7BC98A&}✓{\\c&HECECE6&}' : '{\\c&H6B6BE0&}✗{\\c&HECECE6&}';
    ev.push(`Dialogue: 0,${ass(c.show)},${ass(end)},Cap,,0,0,0,,${mark} ${n.label ? `{\\c&H6BB5D9&}${esc(n.label)}{\\c&HECECE6&}\\N` : ''}${esc(n.body)}`);
  });
  writeFileSync(path.join(dir, 'caps.ass'), header(f) + ev.join('\n') + '\n');
  const file = path.join(dir, 'seg.mp4');
  const scale = kind === 'phone' ? `scale=-2:${f.UIH}` : `scale=-2:${f.UIH}`;
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-vf', `${scale}:flags=lanczos,pad=${f.W}:${f.H}:(ow-iw)/2:0:color=0x141110,fps=30,tpad=stop_mode=clone:stop_duration=${Math.max(0, free - total).toFixed(2)},ass=${path.join(dir, 'caps.ass')},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', file]);
  return { file, dur: probe(file), caps: rel.map((c) => ({ ...c, at: c.show })) };
}

const index = { commit: COMMIT, films: [], clips: [] };
const dirs = readdirSync(REC).filter((d) => existsSync(path.join(REC, d, 'frames.json')));
for (const [fid, ftitle, ids] of FILMS) {
  for (const kind of ['desktop', 'phone']) {
    const f = FMT[kind]; const parts = []; const chapters = []; let at = 0;
    const work = path.join(OUT, `.work-${fid}-${kind}`); mkdirSync(work, { recursive: true });
    const open = path.join(work, 'open.mp4');
    titleCard(open, f, 'TALENT Q · PROTOTYPE WALKTHROUGH', ftitle, `${kind === 'phone' ? 'Phone' : 'Desktop'} · every caption is a step the journey test verified · simulated data · commit ${COMMIT}`, 5);
    parts.push(open); at += probe(open);
    for (const id of ids) {
      const segs = dirs.filter((d) => d.startsWith(`${id}-${kind}-`)).sort();
      if (!segs.length) continue;
      const card = path.join(work, `${id}-card.mp4`);
      titleCard(card, f, `CHAPTER · ${id}`, CHAPTERS[id][0].replace(/^\w+ · /, ''), CHAPTERS[id][1]);
      const start = at; parts.push(card); at += probe(card);
      for (const d of segs) {
        const e = encode(path.join(REC, d), id, kind); if (!e) continue;
        // Clips: each curveball, from the previous verified step to just after this one.
        e.caps.forEach((c, i) => {
          const n = nice(c.text); if (!n.curve) return;
          const s = Math.max(0, Math.min(c.at - 6, (e.caps[i - 1]?.at ?? c.at - 12) - 1)); const len = Math.min(45, c.at + 3 - s);
          const name = `${id}-${kind}-${String(index.clips.filter((x) => x.journey === id && x.kind === kind).length + 1).padStart(2, '0')}.mp4`;
          ff(['-ss', s.toFixed(2), '-i', e.file, '-t', len.toFixed(2), '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-c:a', 'aac', '-movflags', '+faststart', path.join(OUT, 'clips', name)]);
          index.clips.push({ file: `clips/${name}`, journey: id, kind, label: n.label ?? 'Curveball', text: n.body, film: `film-${fid}-${kind}.mp4`, at: +(at + c.at).toFixed(1), seconds: +len.toFixed(1), commit: COMMIT });
        });
        parts.push(e.file); at += e.dur;
        index.films.push({ film: fid, kind, journey: id, steps: e.caps.length, passed: e.caps.filter((c) => c.ok).length });
      }
      chapters.push({ title: CHAPTERS[id][0], start, end: at });
    }
    writeFileSync(path.join(work, 'parts.txt'), parts.map((p) => `file '${p}'`).join('\n'));
    const meta = path.join(work, 'chapters.txt');
    writeFileSync(meta, ';FFMETADATA1\ntitle=' + ftitle + ` (${kind})\ncomment=Talent Q prototype, commit ${COMMIT}. Simulated data.\n` + chapters.map((c) => `\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(c.start * 1000)}\nEND=${Math.round(c.end * 1000)}\ntitle=${c.title}`).join('\n') + '\n');
    const out = path.join(OUT, `film-${fid}-${kind}.mp4`);
    ff(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'parts.txt'), '-i', meta, '-map_metadata', '1', '-map_chapters', '1', '-c', 'copy', '-movflags', '+faststart', out]);
    console.log(`${out} · ${(at / 60).toFixed(1)} min · ${chapters.length} chapters`);
    index[`film-${fid}-${kind}`] = { minutes: +(at / 60).toFixed(1), chapters: chapters.map((c) => ({ title: c.title, at: +c.start.toFixed(1) })) };
    rmSync(work, { recursive: true });
  }
}
writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
console.log(`clips: ${index.clips.length}`);
