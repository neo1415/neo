// T4 runtime: the resumable certificate upload, network watching and "where you were" for returning people.
// The upload sends a file in parts; progress counts parts the (simulated) server acknowledged, never a timer.
// It survives the connection dropping (pauses, then carries on from the last safe part when back online),
// navigation (it keeps going in the background) and the page closing (paused; carries on from the last
// safe part when she says so). Everything is kept in the area slice, so it survives reloads.
import { emit, getWorld, now, uid, update, type World } from '../../mock/world';
import { appendQ } from '../../q/core/engine';
import { personC, readPersonC, type PersonState, type TalentCState, type UploadState } from '../../state/areas/talent-c';

export const CHUNK_KB = 240;
/** This page load. A saved place with a different id means she closed or reloaded the app since. */
export const SID = uid('sid');
const files = new Map<string, File>();
let timer: number | undefined;

const peopleOf = (w: World) => (w.areas['talent-c'] as TalentCState | undefined)?.people ?? {};
const actorIdFor = (w: World, personId: string) => w.actors.find((a) => a.personId === personId)?.id ?? personId;
const pct = (u: UploadState) => Math.round((u.done / u.chunks) * 100);
export const partsLine = (u: UploadState) => `${u.done} of ${u.chunks} parts (${pct(u)}%)`;
export { pct as uploadPct };

function qNote(w: World, personId: string, text: string, actions?: Parameters<typeof appendQ>[2]['actions']) {
  appendQ(w, actorIdFor(w, personId), { who: 'q', kind: 'notice', engine: 'system', text, actions });
}

/** Start sending a new file (the sample photo, or a real photo picked on the device). */
export function startUpload(personId: string, src: { kind: 'SAMPLE' } | { kind: 'DEVICE'; file: File }) {
  const file = src.kind === 'DEVICE' ? src.file : null;
  if (file) files.set(personId, file);
  update((w) => {
    const p = personC(w, personId);
    const sizeKb = file ? Math.max(1, Math.round(file.size / 1024)) : 2400;
    const failAt = p.upload?.failAt;
    p.upload = {
      evidenceId: 'e_grace_cert', fileName: file ? file.name : 'certificate-photo.jpg', sizeKb, chunks: Math.max(1, Math.ceil(sizeKb / CHUNK_KB)), done: 0,
      status: w.network === 'offline' ? 'PAUSED' : 'UPLOADING', reason: w.network === 'offline' ? 'OFFLINE' : undefined,
      source: file ? 'DEVICE' : 'SAMPLE', fingerprint: file ? `${file.name}|${file.size}|${file.lastModified}` : undefined, attempts: 1, failAt, startedAt: now(), updatedAt: now(),
    };
    emit(w, actorIdFor(w, personId), 'upload.started', `PERSON:${personId}`, `Started sending a certificate photo in ${p.upload.chunks} parts.`);
  });
  kick();
}

/** Carry on from the last safe part, inside a store update (Q ops and effects). Call kick() afterwards. */
export function resumeIn(w: World, personId: string): { ok: boolean; say: string } {
  const p = personC(w, personId); const u = p.upload;
  if (!u || u.status === 'IDLE') return { ok: false, say: 'There’s no upload to carry on with yet. Choose your certificate photo first.' };
  if (u.status === 'DONE') return { ok: true, say: 'Your certificate is already sent in full.' };
  if (u.status === 'UPLOADING') return { ok: true, say: `It’s sending now: ${partsLine(u)} safe.` };
  if (u.source === 'DEVICE' && !files.has(personId)) {
    u.status = 'PAUSED'; u.reason = 'NEED_FILE';
    return { ok: false, say: `The app was closed, so your phone needs you to choose the photo again (${u.fileName}). The ${u.done} parts already sent are safe; I’ll skip them.` };
  }
  if (w.network === 'offline') {
    u.status = 'PAUSED'; u.reason = 'OFFLINE';
    return { ok: false, say: `You’re offline right now. ${partsLine(u)} are safe. I’ll carry on by myself as soon as you’re back online.` };
  }
  const from = u.done + 1;
  u.status = 'UPLOADING'; u.reason = undefined; u.attempts += 1; u.updatedAt = now();
  emit(w, actorIdFor(w, personId), 'upload.resumed', `PERSON:${personId}`, `Carried on sending the certificate from part ${from}.`);
  return { ok: true, say: `Carrying on from ${pct(u)}% (part ${from} of ${u.chunks}). The first ${u.done} parts were already safe, so nothing is sent twice.` };
}
/** Carry on from the last safe part. A real file must be picked again after the page was closed. */
export function resumeUpload(personId: string, file?: File): { ok: boolean; say: string } {
  const u = readPersonC(getWorld(), personId).upload;
  if (file && u) {
    const fp = `${file.name}|${file.size}|${file.lastModified}`;
    if (u.fingerprint && fp !== u.fingerprint) return { ok: false, say: `That looks like a different photo from the one you started with (${u.fileName}). Choose the same photo, or start again with this one.` };
    files.set(personId, file);
  }
  let r = { ok: false, say: '' };
  update((w) => { r = resumeIn(w, personId); });
  kick();
  return r;
}

export function pauseUpload(personId: string) {
  update((w) => { const p = personC(w, personId); if (p.upload?.status === 'UPLOADING') { p.upload.status = 'PAUSED'; p.upload.reason = 'USER'; } });
}
export function cancelUpload(personId: string) {
  files.delete(personId);
  update((w) => { personC(w, personId).upload = null; });
}
function tick() {
  timer = undefined;
  const w0 = getWorld();
  const people = Object.entries(peopleOf(w0)).filter(([, p]) => p.upload?.status === 'UPLOADING');
  if (!people.length) return;
  let again = false;
  update((w) => {
    for (const [pid] of people) {
      const p = personC(w, pid); const u = p.upload!;
      if (u.status !== 'UPLOADING') continue;
      if (w.network === 'offline') {
        u.status = 'PAUSED'; u.reason = 'OFFLINE';
        qNote(w, pid, `Your connection dropped while sending your certificate. ${partsLine(u)} are safe on our side. I’ll carry on from part ${u.done + 1} when you’re back online; you don’t need to start again.`);
        continue;
      }
      if (u.failAt !== undefined && u.done === u.failAt) {
        u.status = 'FAILED'; u.reason = 'SERVER'; u.failAt = undefined;
        qNote(w, pid, `Part ${u.done + 1} of your certificate didn’t go through (our server didn’t answer; simulated). The first ${u.done} parts (${pct(u)}%) are safe. Try again and I’ll carry on from ${pct(u)}%, not from the start.`,
          [{ label: 'Try again from here', primary: true, act: { t: 'do', op: 'talent-c.upload.resume' } }]);
        continue;
      }
      const t = Date.now();
      u.lastChunkMs = u.updatedAt ? Math.min(9999, t - new Date(u.updatedAt).getTime()) : undefined;
      u.done += 1; u.updatedAt = new Date(t).toISOString();
      // A part taking over 2.5 s means a slow connection: Q offers lite mode (proactive rule).
      if (u.lastChunkMs && u.lastChunkMs > 2500) p.slow = true;
      if (u.done >= u.chunks) {
        u.status = 'DONE'; u.reason = undefined;
        const e = w.evidence.find((x) => x.evidenceId === u.evidenceId);
        if (e) { e.source = 'Photo upload · received in full'; e.origin = 'UPLOAD'; e.verification = 'PENDING'; }
        p.stepsDone = [...new Set([...p.stepsDone, 1])];
        emit(w, actorIdFor(w, pid), 'evidence.uploaded', `PERSON:${pid}`, `Certificate photo received in full (${u.chunks} parts${u.attempts > 1 ? `, ${u.attempts} tries` : ''}). Issuer check pending.`);
        qNote(w, pid, `Your certificate is sent in full. It’s private to you. Someone still has to check it with the issuer, so for now it says “waiting for a check”, which is normal.`);
      } else again = true;
    }
  });
  if (again) kick();
}
export function kick() {
  if (timer !== undefined) return;
  const slow = Object.values(peopleOf(getWorld())).some((p) => p.slow);
  timer = window.setTimeout(tick, slow ? 1300 : 520);
}

// ---------------- Network: real browser events + the shell's "Simulate offline" ----------------
let lastNet: World['network'] = getWorld().network;
function onNetChange(next: World['network']) {
  if (next === lastNet) return;
  lastNet = next;
  if (next !== 'online') return;
  // Back online: carry on uploads paused by the drop, and resume interviews paused by the drop.
  const w = getWorld();
  const st = peopleOf(w);
  for (const [pid, p] of Object.entries(st)) {
    if (p.upload?.status === 'PAUSED' && p.upload.reason === 'OFFLINE') {
      if (p.upload.source === 'DEVICE' && !files.has(pid)) continue;
      update((d) => { const u = personC(d, pid).upload!; u.status = 'UPLOADING'; u.reason = undefined; u.attempts += 1; qNote(d, pid, `You’re back online. Carrying on with your certificate from part ${u.done + 1} of ${u.chunks}.`); });
      kick();
    }
    for (const [m, r] of Object.entries(p.rooms)) {
      if (r.paused?.reason === 'OFFLINE') update((d) => { const rr = personC(d, pid).rooms[m]; const qn = rr.paused!.qIndex + 1; rr.paused = null; qNote(d, pid, `Connection is back. Your ${m === 'REAL' ? 'interview' : 'practice'} carries on at question ${qn}, with your answer just as you left it.`); });
    }
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => update((w) => { w.network = 'offline'; }));
  window.addEventListener('online', () => update((w) => { w.network = 'online'; }));
  window.setInterval(() => {
    const w = getWorld();
    // Pause interviews the moment the connection drops (the page may not be open).
    if (w.network === 'offline' && lastNet === 'online') {
      const st = peopleOf(w);
      for (const [pid, p] of Object.entries(st)) for (const [m, r] of Object.entries(p.rooms)) {
        if (r.started && !r.done && !r.paused) update((d) => { personC(d, pid).rooms[m].paused = { reason: 'OFFLINE', at: now(), qIndex: r.qIndex }; });
      }
      // …and stop any upload at the last acknowledged part, straight away (no part is half-sent).
      for (const [pid, p] of Object.entries(st)) if (p.upload?.status === 'UPLOADING') update((d) => {
        const u = personC(d, pid).upload!; u.status = 'PAUSED'; u.reason = 'OFFLINE';
        qNote(d, pid, `Your connection dropped while sending your certificate. ${partsLine(u)} are safe on our side. I’ll carry on from part ${u.done + 1} when you’re back online; you don’t need to start again.`);
      });
    }
    onNetChange(w.network);
  }, 400);
  // Slow connection hints from the browser, where available (Network Information API).
  const conn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  const slowNet = !!conn && (conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
  // ---------------- This page load: the app was closed or reloaded since the last save ----------------
  const w = getWorld();
  const st = peopleOf(w);
  if (Object.keys(st).length || slowNet) {
    update((d) => {
      for (const [pid] of Object.entries(st)) {
        const p = personC(d, pid);
        if (slowNet) p.slow = true;
        if (p.upload?.status === 'UPLOADING') { p.upload.status = 'PAUSED'; p.upload.reason = 'CLOSED'; }
        for (const r of Object.values(p.rooms)) { if (r.started && !r.done && !r.paused) r.paused = { reason: 'LEFT', at: now(), qIndex: r.qIndex }; }
        if (p.place && p.place.sid !== SID && isUnfinished(p)) p.place.left = true;
      }
    });
  }
}

/** Was she in the middle of something on the page she last used? */
export function isUnfinished(p: PersonState) {
  if (!p.place) return false;
  if (p.place.route.startsWith('/c/interview')) { const r = p.rooms[p.room]; return !!r?.started && !r.done; }
  return p.stepsDone.length < 3;
}
/** Plain description of where a person was, for Q and the pages. */
export function whereLine(p: PersonState): string {
  const pl = p.place; if (!pl) return '';
  if (pl.route.startsWith('/c/interview')) {
    const r = p.rooms[p.room]; if (!r) return 'you were in the interview room';
    return `you were in your ${p.room === 'REAL' ? 'interview' : 'practice interview'}, at question ${r.qIndex + 1}${r.draft.trim() ? ', with an answer half written. It’s saved on this phone' : ''}`;
  }
  const u = p.upload;
  if (p.step === 1 && u && u.status !== 'DONE' && u.done > 0) return `you were on step 2 of 3, sending your certificate. ${partsLine(u)} are safe`;
  return `you were on step ${p.step + 1} of 3: ${STEP_LABEL[p.step]}`;
}
export const STEP_LABEL = ['telling me about your work', 'adding your certificate', 'getting ready for your interview'];

/** The current actor came back after closing or leaving: Q says where they were and offers to continue. */
export function welcomeBack(w: World, personId: string) {
  const p = personC(w, personId);
  if (!p.place?.left) return;
  if (!isUnfinished(p)) { p.place.left = false; return; }
  const line = whereLine(p);
  p.place.left = false; p.place.sid = SID;
  const actor = w.actors.find((a) => a.personId === personId);
  qNote(w, personId, `Welcome back${actor ? `, ${actor.first}` : ''}. Last time ${line}. Nothing was lost. Do you want to carry on?`,
    [{ label: 'Carry on', primary: true, act: { t: 'do', op: 'talent-c.continue' } }, { label: 'Not now', act: { t: 'say', text: 'not now' } }]);
}
// The app opened (or reloaded) with someone who has unfinished steps: tell them where they were.
if (typeof window !== 'undefined') {
  const a = getWorld().actors.find((x) => x.id === getWorld().session.actor);
  if (a?.personId && readPersonC(getWorld(), a.personId).place?.left) queueMicrotask(() => update((w) => welcomeBack(w, a.personId!)));
}
