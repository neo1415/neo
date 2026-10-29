// Assembles the J11 connected-journey film (addenda AD-H-04, E01-29) from a recording made by
//   VIDEO_DIR=<dir> FILM_PACE=<ms> node qa/scripts/journeys/J11.mjs
// Usage: node j11-film.mjs <dir> <out dir>. Per viewport: the screencast above a caption band (captions never cover
// the interface); each caption is a step J11 verified at that moment; a "Simulated" mark stays on screen throughout;
// title and end cards; MP4 chapter markers per journey step.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const [DIR, OUT] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const COMMIT = process.env.FILM_COMMIT || execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const probe = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const ts = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = (t % 60).toFixed(2).padStart(5, '0'); return `${h}:${String(m).padStart(2, '0')}:${s}`; };
const esc = (s) => s.replace(/\\/g, '').replace(/[{}]/g, '').replace(/\n/g, '\\N');
const FMT = { d: { W: 1920, H: 1080, UIH: 900, FS: 31, name: 'desktop' }, m: { W: 1080, H: 1920, UIH: 1640, FS: 40, name: 'phone' } };
const STEP = { 1: 'Discover the role', 2: 'Reach out', 3: 'File it in the campaign', 4: 'The campaign', 5: 'Agree how to judge', 6: 'Ask for the work', 7: 'Show the work', 8: 'Review the evidence', 9: 'The rubric changes', 10: 'Invite by email', 11: 'Someone else’s identity', 12: 'Reply and book' };

const head = (f) => `[Script Info]\nScriptType: v4.00+\nPlayResX: ${f.W}\nPlayResY: ${f.H}\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
  `Style: Cap,Inter,${f.FS},&H00ECECE6,&H00ECECE6,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,80,80,${Math.round(f.FS * 1.3)},1\n` +
  `Style: Tag,Inter,${Math.round(f.FS * 0.55)},&H006BB5D9,&H006BB5D9,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,0,0,1,40,40,${Math.round(f.FS * 0.45)},1\n` +
  `Style: Sim,Inter,${Math.round(f.FS * 0.5)},&H006BB5D9,&H006BB5D9,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,0,0,3,40,40,${Math.round(f.FS * 0.45)},1\n` +
  `Style: Title,Fraunces,${Math.round(f.FS * 2)},&H00ECECE6,&H00ECECE6,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,120,120,0,1\n` +
  `Style: Sub,Inter,${Math.round(f.FS * 0.9)},&H00B9C2C4,&H00B9C2C4,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,160,160,${Math.round(f.H * 0.58)},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

function card(file, f, title, sub, secs) {
  const a = file.replace(/\.mp4$/, '.ass');
  writeFileSync(a, head(f) + [`Dialogue: 0,${ts(0)},${ts(secs)},Title,,0,0,0,,${esc(title)}`, `Dialogue: 0,${ts(0.3)},${ts(secs)},Sub,,0,0,0,,${esc(sub)}`, `Dialogue: 0,${ts(0)},${ts(secs)},Sim,,0,0,0,,SIMULATED · Talent Q prototype`].join('\n') + '\n');
  ff(['-f', 'lavfi', '-i', `color=c=0x141110:s=${f.W}x${f.H}:r=30:d=${secs}`, '-vf', `ass=${a},format=yuv420p`, '-c:v', 'libx264', '-crf', '22', '-t', String(secs), file]);
  rmSync(a);
}

for (const vp of ['d', 'm']) {
  const f = FMT[vp];
  const raw = readdirSync(path.join(DIR, vp)).filter((x) => x.endsWith('.webm')).map((x) => path.join(DIR, vp, x))[0];
  if (!raw) continue;
  const caps = JSON.parse(readFileSync(path.join(DIR, `${vp}-chapters.json`), 'utf8'));
  const dur = probe(raw);
  // Each caption appears just before the moment its step was verified and stays until the next one.
  const ev = caps.map((c, i) => {
    const num = +c.name.split(' ')[0]; const text = c.name.replace(/^\d+\s+/, '');
    const start = Math.max(i ? caps[i - 1].t + 0.2 : 0, c.t - 2.5); const end = i < caps.length - 1 ? Math.max(caps[i + 1].t - 2.5, start + 2) : Math.min(dur, c.t + 4);
    return { num, text, start, end };
  });
  const a = path.join(OUT, `j11-${f.name}.ass`);
  writeFileSync(a, head(f) + [
    `Dialogue: 0,${ts(0)},${ts(dur)},Sim,,0,0,0,,SIMULATED · no real email, video analysis, transcription or booking · ${COMMIT}`,
    ...ev.map((e) => `Dialogue: 0,${ts(e.start)},${ts(e.end)},Tag,,0,0,0,,STEP ${e.num} · ${esc(STEP[e.num] ?? '').toUpperCase()}`),
    ...ev.map((e) => `Dialogue: 0,${ts(e.start)},${ts(e.end)},Cap,,0,0,0,,${esc(e.text)}`),
  ].join('\n') + '\n');
  const body = path.join(OUT, `j11-${f.name}-body.mp4`);
  ff(['-i', raw, '-vf', `scale=-2:${f.UIH}:flags=lanczos,pad=${f.W}:${f.H}:(ow-iw)/2:0:color=0x141110,ass=${a},format=yuv420p`, '-r', '30', '-c:v', 'libx264', '-crf', '21', '-preset', 'medium', body]);
  const intro = path.join(OUT, `j11-${f.name}-intro.mp4`); const outro = path.join(OUT, `j11-${f.name}-outro.mp4`);
  card(intro, f, 'J11 · One connected journey', 'Tobi asks Kora a question, shares a consented walkthrough and gets an interview. Ada files, judges with a versioned rubric, reviews the evidence and emails — through six disruptions.', 6);
  card(outro, f, 'Booked, once', `Every caption was a step the journey test verified. ${caps.filter((c) => c.ok).length} of ${caps.length} passed in this recording.`, 4);
  const list = path.join(OUT, `j11-${f.name}.txt`);
  writeFileSync(list, [intro, body, outro].map((x) => `file '${path.resolve(x)}'`).join('\n'));
  // Chapters: intro, then one per journey step (first caption of each step).
  const firstOf = {}; ev.forEach((e) => { if (!(e.num in firstOf)) firstOf[e.num] = e.start + 6; });
  const marks = [[0, 'Introduction'], ...Object.entries(firstOf).map(([n, t]) => [t, `Step ${n} · ${STEP[n]}`])];
  const total = 6 + probe(body) + 4;
  const meta = path.join(OUT, `j11-${f.name}.meta`);
  writeFileSync(meta, ';FFMETADATA1\ntitle=J11 · One connected journey (' + f.name + ')\n' + marks.map(([t, name], i) => `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(t * 1000)}\nEND=${Math.round((marks[i + 1]?.[0] ?? total) * 1000)}\ntitle=${name}`).join('\n') + '\n');
  const out = path.join(OUT, `J11-connected-journey-${f.name}.mp4`);
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-i', meta, '-map_metadata', '1', '-map_chapters', '1', '-c', 'copy', '-movflags', '+faststart', out]);
  for (const x of [a, body, intro, outro, list, meta]) rmSync(x);
  console.log(`${out}  ${probe(out).toFixed(0)}s, ${marks.length} chapters`);
}
