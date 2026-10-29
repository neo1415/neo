// MEDIA (audit addendum §F): the store logic behind candidate-authorised video and voice evidence.
// State machine for one item (MediaEvidence.state):
//   CONSENT (draft) ─consent given─▶ CONSENT+consent ─upload─▶ UPLOADING ⇄ PAUSED (offline; resumes from the same part)
//                                                     ─link──▶ UNSAFE_LINK (never fetched) | FETCHING ─▶ FETCH_FAILED
//   UPLOADING/FETCHING done ─▶ TRANSCRIBING (skipped when this content hash is already transcribed) ─▶ REVIEW
//   REVIEW (candidate checks transcript, chooses parts per organisation, previews) ─share─▶ READY ─stop─▶ REVOKED
//   delete removes the item, its transcript and its Passport entry (what an employer keeps is stated, D9 open).
// Every recruiter read goes through visibleSegments(); Q's review for an organisation is built only from the parts
// that organisation was shown, and cached by contentHash + rubric version (+ the shared parts).
import type { Evidence } from '@contracts';
import type { Actor, MediaEvidence, MediaReview, Rating, RubricCriterion } from '../../state/domain';
import { emit, getWorld, now, simNow, uid, update, type World } from '../../mock/world';
import { appendQ, registerOp } from '../../q/core/engine';
import { media, visibleSegments, type MediaState } from '../../state/areas/media';
import { approvedVersion, rubricFor, rubrics } from '../../state/areas/rubrics';
import { KEY_MOMENTS, SAMPLE, SEGMENTS, TRANSCRIPT, type Topic } from '../../state/seeds/media';
// Overrides and disputes go through the RUBRIC area's own operations (one audit trail, one undo, one Rating record).
import { dispute as rbDispute, overrideRating as rbOverride, resolveDispute as rbResolve } from '../rubric/ops';

// ---------------- small helpers ----------------
export const mx = (w: World): Required<MediaState> => {
  const m = media(w) as MediaState;
  m.transcripts ??= {}; m.notes ??= {}; m.seen ??= {}; m.alternatives ??= []; m.interviewOffered ??= {};
  if (m.dropAt === undefined) m.dropAt = 40;
  return m as Required<MediaState>;
};
/** Read-only view (never mutates a frozen selector result). */
export const ms = (w: World) => media(w) as MediaState;
export const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export const span = (a: number, b: number) => `${fmt(a)}–${fmt(b)}`;
export const itemsOf = (w: World, pid: string) => ms(w).items.filter((m) => m.ownerId === pid);
export const itemById = (w: World, id: string) => ms(w).items.find((m) => m.id === id);
export const orgName = (w: World, id: string) => w.orgs.find((o) => o.id === id)?.name ?? id;
export const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const isConfidential = (segId: string) => !!SEGMENTS.find((s) => s.id === segId)?.confidential;
export const PSCOPE = (pid: string) => `PERSON:${pid}`;
const DAY = 864e5;

/** Organisations a candidate can choose in consent (the Passport's three, plus any they applied to). */
export function consentOrgs(w: World, pid: string) {
  const ids = ['org_kora', 'org_tb', 'org_medlink'];
  for (const a of w.applications.filter((x) => x.personId === pid)) { const o = w.jobs.find((j) => j.id === a.jobId)?.orgId; if (o && !ids.includes(o)) ids.push(o); }
  return ids.filter((id) => w.orgs.some((o) => o.id === id));
}
/** The role an organisation is considering this person for (pipeline first; Kora's Senior Backend by default). */
export function roleFor(w: World, pid: string, orgId: string) {
  const ids = w.pipeline.filter((p) => p.personId === pid).map((p) => p.mandateId);
  const own = ids.find((id) => (id === w.mandate.mandateId ? orgId === 'org_kora' : w.mandates.find((m) => m.id === id)?.orgId === orgId));
  return own ?? (orgId === 'org_kora' ? w.mandate.mandateId : undefined);
}
export const roleTitle = (w: World, mandateId?: string) => (mandateId === w.mandate.mandateId ? w.mandate.title : w.mandates.find((m) => m.id === mandateId)?.title) ?? 'this role';

// ---------------- links: what Q will and won't fetch ----------------
const SHORTENERS = /(^|\/\/|\.)(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at|tiny\.cc|rb\.gy)(\/|$)/i;
const PROFILES = /(tiktok\.com\/@[^/]+\/?$|instagram\.com\/[^/]+\/?$|facebook\.com\/[^/]+\/?$|youtube\.com\/(@|c\/|channel\/)[^/]+\/?$|x\.com\/[^/]+\/?$|twitter\.com\/[^/]+\/?$)/i;
export function checkLink(raw: string): { ok: true } | { ok: false; kind: 'UNSAFE_LINK' | 'FETCH_FAILED'; text: string } {
  const s = raw.trim();
  if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(s)) return { ok: false, kind: 'UNSAFE_LINK', text: 'That doesn’t look like a web address, so I didn’t open anything. Paste the full link to one video, or upload the file.' };
  if (SHORTENERS.test(s)) return { ok: false, kind: 'UNSAFE_LINK', text: 'This is a shortened link. I can’t check what’s behind a shortened link, so I never open one. Paste the full address of the video, or upload the file instead.' };
  if (/^http:\/\//i.test(s)) return { ok: false, kind: 'UNSAFE_LINK', text: 'This link isn’t encrypted (it starts with http, not https), so I won’t open it. Use the https address or upload the file.' };
  if (PROFILES.test(s)) return { ok: false, kind: 'UNSAFE_LINK', text: 'That’s a whole profile, not one video. I only ever look at the single video you choose, never the rest of your account. Paste the link to that one video.' };
  if (/drive\.google\.com|dropbox\.com|onedrive|sharepoint|icloud\.com/i.test(s) && !/[?&](usp=sharing|dl=0|public)/i.test(s)) return { ok: false, kind: 'FETCH_FAILED', text: 'The link opened a sign-in page, so I couldn’t get the video. I never sign in as you or use your password. Set the file to “anyone with the link”, or upload it.' };
  return { ok: true };
}

// ---------------- Passport entry: one Evidence item per media item, consistent with its parts ----------------
function syncEvidence(w: World, m: MediaEvidence) {
  let e = w.evidence.find((x) => x.evidenceId === m.evidenceId);
  if (!e) {
    e = { evidenceId: m.evidenceId, ownerId: m.ownerId, kind: 'WORK_SAMPLE', title: m.title, source: `Your ${m.source === 'UPLOAD' ? 'upload' : m.source === 'LINK' ? 'link' : m.source === 'PORTFOLIO' ? 'portfolio demo' : 'interview recording'} · ${m.kind === 'AUDIO' ? 'voice recording' : 'video'}, ${fmt(m.duration)}`,
      observedAt: simNow(w).toISOString().slice(0, 10), verified: false, verification: 'UNVERIFIED', origin: 'UPLOAD',
      shows: 'A recorded walkthrough of his own work. Employers see only the parts he chooses, with a transcript he checked.',
      limits: 'Shows what he said and showed on screen. Numbers he quotes from production are his own report.', visibility: 'PRIVATE', sharedWith: [] } as Evidence;
    w.evidence.push(e);
  }
  const orgs = [...new Set(m.state === 'READY' ? m.segments.flatMap((s) => s.sharedWith) : [])];
  e.sharedWith = orgs; e.visibility = orgs.length ? 'SHARED_WITH' : 'PRIVATE';
  if (m.state === 'READY') e.revokedFrom = (e.revokedFrom ?? []).filter((o) => !orgs.includes(o));
}

// ---------------- drafts, consent, sources ----------------
export function startDraft(w: World, pid: string) {
  const s = mx(w);
  const open = s.items.find((m) => m.ownerId === pid && m.state === 'CONSENT');
  if (open) return open;
  const old = s.items.find((m) => m.ownerId === pid && m.id === SAMPLE.mediaId);
  const m: MediaEvidence = { id: old ? uid('m') : SAMPLE.mediaId, evidenceId: old ? uid('e_video') : SAMPLE.evidenceId, ownerId: pid, kind: 'VIDEO', source: 'UPLOAD', title: SAMPLE.title, duration: SAMPLE.duration, contentHash: SAMPLE.contentHash, state: 'CONSENT', transcript: [], segments: [] };
  s.items.push(m);
  return m;
}
export interface ConsentInput { orgs: string[]; purpose: string; days: number; practice?: boolean }
export function giveConsent(w: World, id: string, c: ConsentInput, actor: Actor) {
  const m = itemById(w, id); if (!m) return;
  const at = simNow(w);
  m.consent = { at: at.toISOString(), orgs: c.practice ? [] : c.orgs, purpose: c.purpose, expires: new Date(at.getTime() + c.days * DAY).toISOString(), alternativeOffered: true };
  emit(w, actor.id, 'media.consent', PSCOPE(m.ownerId), `Consent recorded for “${m.title}”: ${c.practice ? 'private practice, no organisation' : list(c.orgs.map((o) => orgName(w, o)))}, for “${c.purpose}”, until ${fmtDate(m.consent.expires!)}.`, { mediaId: m.id, orgs: m.consent.orgs, days: c.days });
}
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function chooseSource(w: World, id: string, source: MediaEvidence['source'], link?: string) {
  const m = itemById(w, id); if (!m || !m.consent) return { ok: false as const, text: 'Consent comes first: nothing is processed before you’ve said who sees it and why.' };
  const s = mx(w);
  delete s.notes[m.id];
  m.source = source; m.link = link;
  if (source === 'LINK' || source === 'PORTFOLIO') {
    const r = checkLink(link ?? '');
    if (!r.ok) { m.state = r.kind; s.notes[m.id] = { kind: r.kind, text: r.text }; return { ok: false as const, text: r.text, kind: r.kind }; }
    m.state = 'FETCHING'; m.progress = { done: 0, total: 6 };
    return { ok: true as const };
  }
  m.state = 'UPLOADING'; m.progress = { done: 0, total: SAMPLE.parts };
  (m as MediaEvidence & { attempt?: number }).attempt = ((m as MediaEvidence & { attempt?: number }).attempt ?? 0) + 1;
  return { ok: true as const };
}

/** After transcription (or a cache hit): the transcript and three parts, nothing shared yet. */
function toReview(w: World, m: MediaEvidence, cached: boolean) {
  const s = mx(w);
  m.transcript = TRANSCRIPT.map((l) => ({ ...l }));
  m.segments = SEGMENTS.map((x) => ({ id: x.id, t: x.t, tEnd: x.tEnd, label: x.label, sharedWith: [] }));
  m.state = 'REVIEW'; m.progress = undefined;
  if (!cached) s.transcripts[m.contentHash] = { at: now(), lines: m.transcript.length };
  syncEvidence(w, m);
  emit(w, 'system', 'media.transcribed', PSCOPE(m.ownerId), cached ? `“${m.title}”: same file as before (content hash ${m.contentHash}), so the cached transcript was reused.` : `“${m.title}” was transcribed once (simulated) and cached by its content hash.`, { mediaId: m.id, cached });
}

// ---------------- the ticker: uploads, pauses, fetches, transcription ----------------
function tick() {
  const w = getWorld(); const s = media(w) as MediaState | undefined; if (!s) return;
  const busy = s.items.filter((m) => ['UPLOADING', 'PAUSED', 'FETCHING', 'TRANSCRIBING'].includes(m.state));
  if (!busy.length) return;
  // Offline, only an upload in flight changes (it pauses); everything else waits for the connection.
  if (w.network === 'offline' && !busy.some((m) => m.state === 'UPLOADING')) return;
  update((d) => {
    const x = mx(d);
    for (const m of x.items) {
      const p = m.progress;
      if (d.network === 'offline' && m.state !== 'UPLOADING') continue;
      if (m.state === 'UPLOADING') {
        if (d.network === 'offline') { m.state = 'PAUSED'; x.notes[m.id] = { kind: 'PAUSED', text: `Paused at part ${p?.done ?? 0} of ${p?.total ?? SAMPLE.parts} because the connection dropped. It carries on from the same part when you reconnect.` }; continue; }
        if (!p) continue;
        p.done = Math.min(p.total, p.done + 1);
        const pct = Math.round((100 * p.done) / p.total);
        const attempt = (m as MediaEvidence & { attempt?: number }).attempt ?? 1;
        if (x.dropAt && attempt === 1 && pct >= x.dropAt && !(m as MediaEvidence & { dropped?: boolean }).dropped) {
          (m as MediaEvidence & { dropped?: boolean }).dropped = true;
          d.network = 'offline'; m.state = 'PAUSED';
          x.notes[m.id] = { kind: 'PAUSED', text: `Paused at ${pct}% (part ${p.done} of ${p.total}) because the connection dropped. Nothing is lost: it carries on from part ${p.done + 1} when you reconnect.` };
          appendQ(d, m.ownerId, { who: 'q', kind: 'notice', engine: 'rules', text: `Your upload paused at ${pct}% because the connection dropped. Nothing is lost; it carries on from the same part when you’re back online.` });
          continue;
        }
        if (p.done >= p.total) { m.state = 'TRANSCRIBING'; m.progress = { done: 0, total: 10 }; }
      } else if (m.state === 'PAUSED' && d.network !== 'offline' && x.notes[m.id]?.kind === 'PAUSED') {
        m.state = 'UPLOADING'; const done = p?.done ?? 0;
        x.notes[m.id] = { kind: 'PAUSED', text: `Back online: carried on from part ${done + 1} of ${p?.total ?? SAMPLE.parts}. The ${done} parts already sent weren’t sent again.` };
        appendQ(d, m.ownerId, { who: 'q', kind: 'notice', engine: 'rules', text: `Back online. Your upload carried on from part ${done + 1} of ${p?.total ?? SAMPLE.parts}; nothing was sent twice.` });
        emit(d, 'system', 'media.upload.resumed', PSCOPE(m.ownerId), `Upload of “${m.title}” resumed from part ${done + 1}.`);
      } else if (m.state === 'FETCHING' && d.network !== 'offline' && p) {
        p.done += 1;
        if (p.done >= p.total) {
          if (x.transcripts[m.contentHash]) toReview(d, m, true);
          else { m.state = 'TRANSCRIBING'; m.progress = { done: 0, total: 10 }; }
        }
      } else if (m.state === 'TRANSCRIBING' && p) {
        if (p.done === 0 && x.transcripts[m.contentHash]) { toReview(d, m, true); continue; }
        p.done += 1;
        if (p.done >= p.total) toReview(d, m, false);
      }
    }
  });
}
if (typeof window !== 'undefined') { const g = window as unknown as { __mediaTick?: number }; if (!g.__mediaTick) g.__mediaTick = window.setInterval(tick, 300); }

// ---------------- transcript corrections, parts, sharing ----------------
export function editLine(w: World, id: string, idx: number, text: string, actor: Actor) {
  const m = itemById(w, id); const l = m?.transcript[idx]; if (!m || !l || !text.trim() || l.text === text.trim()) return null;
  const before = l.text; l.text = text.trim(); l.edited = true;
  emit(w, actor.id, 'media.transcript.corrected', PSCOPE(m.ownerId), `Corrected the transcript at ${fmt(l.t)}.`, { mediaId: m.id, t: l.t });
  return before;
}
/** The line playing at a given second (the last line that started at or before it). */
export const lineAt = (m: MediaEvidence, t: number) => { let i = 0; m.transcript.forEach((l, k) => { if (l.t <= t) i = k; }); return i; };
export function setPart(w: World, id: string, segId: string, org: string, on: boolean) {
  const m = itemById(w, id); const s = m?.segments.find((x) => x.id === segId); if (!m || !s) return;
  s.sharedWith = on ? [...new Set([...s.sharedWith, org])] : s.sharedWith.filter((o) => o !== org);
  if (m.state === 'READY') { syncEvidence(w, m); invalidate(w, m); }
}
/** Share the chosen parts: READY, Passport entry updated, an event for each organisation (titles of unshared parts never leave). */
export function finishShare(w: World, id: string, actor: Actor) {
  const m = itemById(w, id); if (!m) return;
  m.state = 'READY';
  syncEvidence(w, m);
  for (const org of m.consent?.orgs ?? []) {
    const segs = m.segments.filter((s) => s.sharedWith.includes(org));
    if (!segs.length) continue;
    const secs = segs.reduce((a, s) => a + s.tEnd - s.t, 0);
    emit(w, actor.id, 'media.shared', `SHARED:${org}:${m.ownerId}`, `${actor.name} shared a walkthrough video with ${orgName(w, org)}: ${segs.length} of ${m.segments.length} parts (${fmt(secs)}).`, { mediaId: m.id, parts: segs.map((s) => s.id) });
    ensureReview(w, m.id, org);
  }
}
/** A change in what an organisation may see voids its cached review (the next open rebuilds it, once). */
function invalidate(w: World, m: MediaEvidence) {
  const s = mx(w);
  s.reviews = s.reviews.filter((r) => r.mediaId !== m.id || r.state === 'HUMAN_REVIEWED' || keyFor(w, m.id, r.orgId, r.rubricId, r.v) === r.cacheKey);
}

// ---------------- revoke and delete ----------------
export const KEEPS = (w: World, orgs: string[]) => `${list(orgs.map((o) => orgName(w, o))) || 'An employer'} keeps a record that you shared a video and when access ended, plus any rating a person there already reviewed (with its time codes, but no video and no transcript). Q’s unreviewed findings are removed. How long that record is kept follows the employer’s retention policy; Talent Q’s default isn’t decided yet (decision D9, open).`;
export function revoke(w: World, id: string, actor: Actor) {
  const m = itemById(w, id); if (!m) return [];
  const orgs = [...new Set(m.segments.flatMap((s) => s.sharedWith))];
  m.segments.forEach((s) => { s.sharedWith = []; });
  m.state = 'REVOKED';
  const e = w.evidence.find((x) => x.evidenceId === m.evidenceId);
  if (e) { e.revokedFrom = [...new Set([...(e.revokedFrom ?? []), ...orgs])]; e.sharedWith = []; e.visibility = 'PRIVATE'; }
  dropUnreviewed(w, m);
  for (const org of orgs) emit(w, actor.id, 'media.access_ended', `SHARED:${org}:${m.ownerId}`, `${actor.name} ended ${orgName(w, org)}’s access to a video.`, { mediaId: m.id });
  emit(w, actor.id, 'media.revoked', PSCOPE(m.ownerId), `Stopped sharing “${m.title}” with ${list(orgs.map((o) => orgName(w, o))) || 'anyone'}.`);
  return orgs;
}
function dropUnreviewed(w: World, m: MediaEvidence) {
  const s = mx(w); const r = rubrics(w);
  s.reviews = s.reviews.filter((x) => x.mediaId !== m.id || x.state === 'HUMAN_REVIEWED');
  if (r) r.ratings = r.ratings.filter((x) => !(x.source === 'Q_PROPOSED' && !x.reviewed && x.refs.every((ref) => ref.evidenceId === m.evidenceId)))
    .map((x) => (x.reviewed ? x : { ...x, refs: x.refs.filter((ref) => ref.evidenceId !== m.evidenceId) }));
}
export function deleteMedia(w: World, id: string, actor: Actor) {
  const s = mx(w); const m = itemById(w, id); if (!m) return [];
  const orgs = m.state === 'REVOKED' ? [] : revoke(w, id, actor);
  const ended = [...new Set([...orgs, ...(w.evidence.find((x) => x.evidenceId === m.evidenceId)?.revokedFrom ?? [])])];
  s.items = s.items.filter((x) => x.id !== id);
  if (!s.items.some((x) => x.contentHash === m.contentHash)) delete s.transcripts[m.contentHash];
  delete s.notes[id];
  w.evidence = w.evidence.filter((x) => x.evidenceId !== m.evidenceId);
  emit(w, actor.id, 'media.deleted', PSCOPE(m.ownerId), `Deleted “${m.title}”: the video, its transcript and its Passport entry. ${ended.length ? `${list(ended.map((o) => orgName(w, o)))} keep${ended.length === 1 ? 's' : ''} only the record described in your deletion receipt.` : 'It was never shared.'}`, { contentHash: m.contentHash });
  return ended;
}

// ---------------- Q's report: findings mapped to the approved rubric (or the brief) ----------------
const TOPIC_BY_REQ: Record<string, Topic> = { r1: 'payments', r2: 'go', r3: 'postgres', r4: 'incidents', r5: 'mentoring' };
const TOPIC_RE: [Topic, RegExp][] = [
  ['incidents', /incident|on-?call|outage|post-?mortem/i], ['mentoring', /mentor|coach|grow(ing)? (other|junior)/i], ['payments', /payment|reconcil|settle|ledger|money/i],
  ['postgres', /postgres|sql|database|quer(y|ies)|schema/i], ['go', /\bgo\b|golang/i], ['communication', /communicat|explain|stakeholder|written|spoken|present/i], ['design', /design|architect|trade-?off/i],
];
export function topicOf(c: { label: string; requirementId?: string; why?: string; evidenceToInspect?: string[] }): Topic | undefined {
  if (c.requirementId && TOPIC_BY_REQ[c.requirementId]) return TOPIC_BY_REQ[c.requirementId];
  return TOPIC_RE.find(([, re]) => re.test(c.label))?.[0] ?? TOPIC_RE.find(([, re]) => re.test(`${c.why ?? ''} ${(c.evidenceToInspect ?? []).join(' ')}`))?.[0];
}
export interface Crit { id: string; label: string; weight: number; kind: RubricCriterion['kind'] | 'REQUIREMENT'; anchors?: string[]; requirementId?: string; why?: string; evidenceToInspect?: string[] }
/** The criteria Q maps to: the approved rubric version, or (when none is approved) the brief's requirements, unscored. */
export function criteriaFor(w: World, mandateId: string): { rubricId?: string; v?: number; crit: Crit[] } {
  const rub = rubricFor(w, mandateId); const ver = approvedVersion(w, mandateId);
  if (rub && ver) return { rubricId: rub.id, v: ver.v, crit: ver.criteria.map((c) => ({ ...c })) };
  const reqs = mandateId === w.mandate.mandateId ? w.mandate.requirements : w.mandates.find((m) => m.id === mandateId)?.requirements ?? [];
  return { crit: (reqs as { reqId?: string; id?: string; label: string; mustHave?: boolean; plain?: string }[]).map((r) => ({ id: r.reqId ?? r.id ?? r.label, label: r.label, weight: r.mustHave ? 2 : 1, kind: 'REQUIREMENT' as const, requirementId: r.reqId ?? r.id, why: r.plain })) };
}
export const keyFor = (w: World, mediaId: string, orgId: string, rubricId = 'brief', v = 0) => {
  const m = itemById(w, mediaId);
  return `${m?.contentHash}|${rubricId}@v${v}|${visibleSegments(w, mediaId, orgId).map((s) => s.id).join('+')}`;
};
const quoteFor = (m: MediaEvidence, t: number) => m.transcript[lineAt(m, t)]?.text ?? '';

/** Build (once) the review for an organisation. Never re-runs while a review with the same key exists. */
export function ensureReview(w: World, mediaId: string, orgId: string, opts: { v?: number } = {}): MediaReview | undefined {
  const m = itemById(w, mediaId); if (!m) return undefined;
  const segs = visibleSegments(w, mediaId, orgId); if (!segs.length) return undefined;
  const mandateId = roleFor(w, m.ownerId, orgId); if (!mandateId) return undefined;
  const cf = criteriaFor(w, mandateId);
  const rubricId = cf.rubricId ?? 'brief'; const v = opts.v ?? cf.v ?? 0;
  const key = keyFor(w, mediaId, orgId, rubricId, v);
  const s = mx(w);
  const hit = s.reviews.find((r) => r.mediaId === mediaId && r.orgId === orgId && r.cacheKey === key);
  if (hit) return hit;
  // A newer rubric version is never applied silently: an existing review on an older version stays until a person asks.
  if (opts.v === undefined && s.reviews.some((r) => r.mediaId === mediaId && r.orgId === orgId && r.rubricId === rubricId && r.v !== v)) return undefined;
  const inSeg = (t: number) => segs.some((sg) => t >= sg.t && t < sg.tEnd);
  const findings: MediaReview['findings'] = []; const notShown: string[] = [];
  for (const c of cf.crit) {
    if (c.kind === 'ELIGIBILITY' || c.kind === 'COMPATIBILITY') { notShown.push(c.id); continue; }
    const topic = topicOf(c); const km = topic ? KEY_MOMENTS[topic] : undefined;
    const moments = (km?.moments ?? []).filter((x) => inSeg(x.t)).map((x) => ({ t: x.t, tEnd: x.tEnd, text: quoteFor(m, x.t) }));
    if (!km || !moments.length || km.rating === undefined) { notShown.push(c.id); continue; }
    const partial = moments.length < km.moments.length;
    findings.push({ criterionId: c.id, moments, rating: cf.rubricId ? km.rating : undefined, uncertainty: partial && km.uncertainty === 'LOW' ? 'MEDIUM' : km.uncertainty, note: km.note });
  }
  const r: MediaReview = { id: uid('mr'), mediaId, rubricId, v, personId: m.ownerId, orgId, cacheKey: key, findings, notShown, state: 'Q_DRAFT' };
  s.reviews.push(r);
  emit(w, 'system', 'media.review.built', `ORG:${orgId}`, `Q prepared an evidence report from ${m.ownerId === 'p_tobi' ? 'Tobi' : 'a candidate'}’s shared video (${cf.rubricId ? `rubric v${v}` : 'role brief, no approved rubric'}); cached as ${key}.`, { reviewId: r.id });
  if (cf.rubricId) writeRatings(w, r, m);
  return r;
}
/** Q-proposed Rating records for the RUBRIC scorecard. A reviewed or overridden rating is never touched. */
function writeRatings(w: World, r: MediaReview, m: MediaEvidence) {
  const rs = rubrics(w); if (!rs) return;
  for (const f of r.findings) {
    if (f.rating === undefined) continue;
    const refs = f.moments.map((x) => ({ evidenceId: m.evidenceId, t: x.t, tEnd: x.tEnd, quote: x.text.slice(0, 140) }));
    const existing = rs.ratings.find((x) => x.rubricId === r.rubricId && x.v === r.v && x.personId === r.personId && x.criterionId === f.criterionId);
    if (existing) {
      if (!existing.reviewed && !existing.override) existing.refs = [...existing.refs.filter((x) => x.evidenceId !== m.evidenceId), ...refs];
      continue;
    }
    const rating: Rating = { id: `rt_${r.id}_${f.criterionId}`, rubricId: r.rubricId, v: r.v, personId: r.personId, criterionId: f.criterionId, rating: f.rating, uncertainty: f.uncertainty, refs, note: `From the video: ${f.note}`, source: 'Q_PROPOSED', by: 'q', at: now(), reviewed: false };
    rs.ratings.push(rating);
  }
}
export const ratingFor = (w: World, r: MediaReview, criterionId: string) => rubrics(w)?.ratings.find((x) => x.rubricId === r.rubricId && x.v === r.v && x.personId === r.personId && x.criterionId === criterionId);

/** Recruiter override with a reason (audited). The RUBRIC scorecard reads the same Rating record. */
export function overrideRating(w: World, r: MediaReview, criterionId: string, to: number, reason: string, actor: Actor) {
  const rt = ratingFor(w, r, criterionId); if (!rt || !reason.trim()) return null;
  const from = rt.rating;
  const res = rbOverride(w, actor, rt.id, to, reason);
  if (res && 'say' in res) return null;
  return { from, to: rt.rating };
}
export function markReviewed(w: World, r: MediaReview, actor: Actor) {
  r.state = 'HUMAN_REVIEWED'; r.reviewedBy = actor.id;
  for (const f of r.findings) { const rt = ratingFor(w, r, f.criterionId); if (rt) rt.reviewed = true; }
  emit(w, actor.id, 'media.review.reviewed', `ORG:${r.orgId}`, `${actor.name} reviewed Q’s video report and its ${r.findings.length} findings.`, { reviewId: r.id });
}
export function dispute(w: World, r: MediaReview, criterionId: string, text: string, actor: Actor) {
  r.state = 'DISPUTED';
  const rt = ratingFor(w, r, criterionId);
  if (rt) rbDispute(w, actor, rt.id, text);
  (r as MediaReview & { disputes?: { criterionId: string; text: string; at: string; state: 'OPEN' | 'RESOLVED' }[] }).disputes = [...((r as MediaReview & { disputes?: unknown[] }).disputes as never[] ?? []), { criterionId, text, at: now(), state: 'OPEN' }];
  emit(w, actor.id, 'media.review.disputed', `SHARED:${r.orgId}:${r.personId}`, `${actor.name} asked for a correction to one finding in the video report.`, { reviewId: r.id, criterionId });
}
export type Disputed = { criterionId: string; text: string; at: string; state: 'OPEN' | 'RESOLVED' };
export const disputesOf = (r: MediaReview) => ((r as MediaReview & { disputes?: Disputed[] }).disputes ?? []);

/** What the organisation's report shows right now: findings whose moments are still in visible parts. */
export function reportView(w: World, r: MediaReview) {
  const segs = visibleSegments(w, r.mediaId, r.orgId);
  const inSeg = (t: number) => segs.some((s) => t >= s.t && t < s.tEnd);
  const findings = r.findings.map((f) => ({ ...f, moments: f.moments.filter((x) => inSeg(x.t)) })).filter((f) => f.moments.length);
  const gone = r.findings.filter((f) => !findings.some((x) => x.criterionId === f.criterionId)).map((f) => f.criterionId);
  return { segs, findings, notShown: [...r.notShown, ...gone] };
}
/** The video's own coverage of the rubric: weight of criteria it speaks to over all job criteria (not an index). */
export function videoCoverage(crit: Crit[], shown: string[]) {
  const job = crit.filter((c) => c.kind !== 'COMPATIBILITY' && c.weight > 0);
  const all = job.reduce((a, c) => a + c.weight, 0); const got = job.filter((c) => shown.includes(c.id)).reduce((a, c) => a + c.weight, 0);
  return { pct: all ? Math.round((100 * got) / all) : 0, n: job.filter((c) => shown.includes(c.id)).length, of: job.length };
}

// ---------------- prohibited inferences (AD-F-10, AD-F-11) ----------------
export const TRAIT_RE = /\b(confident|confidence|honest|honesty|dishonest|lying|liar|truthful|sincere|trustworth\w*|trust him|trust her|loyal\w*|nervous|anxious|shy|personality|introvert\w*|extrovert\w*|emotional\w*|stable|stability|temperament|enthusias\w*|passionate|likeable|likable|charisma\w*|attractive|good[- ]looking|presentable|well[- ]spoken|accent|sound (like|smart|native)|native speaker|how old|age|young|old|gender|race|ethnic\w*|disab\w*|stutter\w*|eye contact|body language|facial|expression|smile|tone of voice|voice)\b/;
export function traitAsked(norm: string) {
  if (!TRAIT_RE.test(norm)) return false;
  if (/\b(accommodat|adjustment|alternative|accessib)/.test(norm)) return false;
  return /\b(is|does|did|was|seem|seems|look|looks|sound|sounds|come across|rate|score|judge|tell|think|how|would|can you|from (the )?(video|recording)|he|she|they|him|her|tobi|candidate)\b/.test(norm);
}
export const NO_INFERENCE = 'No inferences from face, voice, accent or appearance';

// ---------------- ops (buttons and Q chips both call these) ----------------
const cand = (a: Actor) => a.personId!;
registerOp('media.start', (w, _a, actor) => { startDraft(w, cand(actor)); return { nav: { to: '/c/passport?media=add', label: 'your Evidence Passport' } }; });
registerOp('media.cancel', (w, a) => { const s = mx(w); s.items = s.items.filter((m) => !(m.id === a.id && m.state === 'CONSENT')); });
registerOp('media.consent', (w, a, actor) => { giveConsent(w, String(a.id), { orgs: (a.orgs as string[]) ?? [], purpose: String(a.purpose), days: Number(a.days ?? 90), practice: !!a.practice }, actor); });
registerOp('media.source', (w, a) => {
  const r = chooseSource(w, String(a.id), a.source as MediaEvidence['source'], a.link ? String(a.link) : undefined);
  if (!r.ok && 'kind' in r && r.kind === 'UNSAFE_LINK') return { say: `${r.text}` };
  if (!r.ok && 'kind' in r && r.kind === 'FETCH_FAILED') return { say: r.text };
});
registerOp('media.resume', (w, a) => { const m = itemById(w, String(a.id)); if (m && m.state === 'PAUSED') { if (w.network === 'offline') return { say: 'You’re still offline, so it stays paused. It carries on by itself when you reconnect.' }; m.state = 'UPLOADING'; } });
registerOp('media.dropAt', (w, a) => { mx(w).dropAt = a.on ? 40 : null; });
registerOp('media.edit', (w, a, actor) => { const before = editLine(w, String(a.id), Number(a.idx), String(a.text), actor); if (before !== null && a.undo !== false) (w.q.undo[actor.id] ??= []).push({ id: uid('u'), label: 'the transcript correction', at: now(), inverse: { op: 'media.edit', args: { id: a.id, idx: a.idx, text: before, undo: false } } }); });
registerOp('media.part', (w, a) => { setPart(w, String(a.id), String(a.seg), String(a.org), !!a.on); });
registerOp('media.share', (w, a, actor) => {
  const m = itemById(w, String(a.id)); if (!m) return;
  if (a.parts) { const org = String(a.org); for (const s of m.segments) s.sharedWith = (a.parts as string[]).includes(s.id) ? [...new Set([...s.sharedWith, org])] : s.sharedWith.filter((o) => o !== org); }
  if (!m.segments.some((s) => s.sharedWith.length) && m.consent?.orgs.length) return { say: 'Nothing is selected yet, so nothing was shared. Choose at least one part for an organisation.' };
  finishShare(w, m.id, actor);
  const orgs = [...new Set(m.segments.flatMap((s) => s.sharedWith))];
  return { say: orgs.length ? `Shared. ${list(orgs.map((o) => `${orgName(w, o)} sees ${m.segments.filter((s) => s.sharedWith.includes(o)).map((s) => s.label.replace(' (confidential)', '')).join(' and ')}`))}. Until ${fmtDate(m.consent!.expires!)}; you can stop it any time.` : 'Saved as private practice. Nobody else can see it.' };
});
registerOp('media.revoke', (w, a, actor) => { const orgs = revoke(w, String(a.id), actor); return { say: orgs.length ? `Stopped. ${list(orgs.map((o) => orgName(w, o)))} can no longer play the video or read its transcript. ${KEEPS(w, orgs)}` : 'It wasn’t shared with anyone, so nothing changed.' }; });
registerOp('media.delete', (w, a, actor) => { const ended = deleteMedia(w, String(a.id), actor); return { say: `Deleted the video, its transcript and its Passport entry.${ended.length ? ` ${KEEPS(w, ended)}` : ' It was never shared, so no one keeps anything.'}` }; });
registerOp('media.alternative', (w, a, actor) => {
  const s = mx(w); const kind = String(a.kind) as 'TEXT' | 'FORM' | 'ADJUSTMENT';
  const orgs = (a.orgs as string[] | undefined) ?? ['org_kora'];
  s.alternatives.push({ personId: cand(actor), kind, at: now(), orgs });
  for (const o of orgs) emit(w, actor.id, 'media.alternative', `SHARED:${o}:${cand(actor)}`, `${actor.name} asked to ${kind === 'TEXT' ? 'answer in writing instead of a video' : kind === 'FORM' ? 'answer a short form instead of a video' : 'discuss an adjustment for the video request'}.`);
  return { say: kind === 'TEXT' ? `Done: ${list(orgs.map((o) => orgName(w, o)))} will see that you’d rather write it. A written walkthrough counts the same; add it under Add proof → work sample.` : kind === 'FORM' ? `Done: I’ve asked ${list(orgs.map((o) => orgName(w, o)))} for a short form instead (simulated). You don’t need to record anything.` : `Done: I’ve told ${list(orgs.map((o) => orgName(w, o)))} you’d like to discuss an adjustment (simulated). You don’t need to say why.` };
});
registerOp('media.offerInterview', (w, a) => { const s = mx(w); const pid = String(a.pid ?? 'p_tobi'); s.interviewOffered[pid] = a.on ? ['org_kora'] : []; });
registerOp('media.reviewed', (w, a, actor) => { const r = mx(w).reviews.find((x) => x.id === a.id); if (!r) return; markReviewed(w, r, actor); return { say: 'Marked as reviewed by you. Q’s proposed ratings on the scorecard now show as reviewed.' }; });
registerOp('media.override', (w, a, actor) => { const r = mx(w).reviews.find((x) => x.id === a.id); if (!r) return; const o = overrideRating(w, r, String(a.crit), Number(a.to), String(a.reason ?? ''), actor); return o ? { say: `Changed from ${o.from} to ${o.to}, with your reason recorded in the audit log.` } : { say: 'A reason is needed to change a rating.' }; });
registerOp('media.dispute', (w, a, actor) => { const r = mx(w).reviews.find((x) => x.id === a.id); if (!r) return; dispute(w, r, String(a.crit), String(a.text), actor); return { say: `Sent to ${orgName(w, r.orgId)} as a correction request. Until someone there looks at it, the finding is marked “disputed”.` }; });
registerOp('media.resolve', (w, a, actor) => { const r = mx(w).reviews.find((x) => x.id === a.id); if (!r) return; disputesOf(r).forEach((d) => { d.state = 'RESOLVED'; }); for (const f of r.findings) { const rt = ratingFor(w, r, f.criterionId); if (rt?.dispute?.state === 'OPEN') rbResolve(w, actor, rt.id, 'looked at the moments again'); } r.state = 'HUMAN_REVIEWED'; r.reviewedBy = actor.id; emit(w, actor.id, 'media.review.dispute_resolved', `SHARED:${r.orgId}:${r.personId}`, `${actor.name} looked at the correction request and resolved it.`); });
registerOp('media.rebuild', (w, a) => { const r = ensureReview(w, String(a.media), String(a.org), { v: Number(a.v) }); return r ? { say: `Prepared a report on rubric v${r.v}. The earlier report stays on its own version.` } : undefined; });
registerOp('media.unreview', (w, a) => { const r = mx(w).reviews.find((x) => x.id === a.id); if (!r) return; r.state = 'Q_DRAFT'; r.reviewedBy = undefined; for (const f of r.findings) { const rt = ratingFor(w, r, f.criterionId); if (rt && !rt.override) rt.reviewed = false; } });
registerOp('media.ensure', (w, a) => { ensureReview(w, String(a.media), String(a.org)); });
registerOp('media.seen', (w, a, actor) => { const s = mx(w); const seen = (s.seen[actor.id] ??= []); if (!seen.includes(String(a.id))) seen.push(String(a.id)); });

// ---------------- QA hook (tests only; not a product surface) ----------------
if (typeof window !== 'undefined') (window as unknown as { __tqMedia: unknown }).__tqMedia = { visibleSegments: (id: string, org: string) => visibleSegments(getWorld(), id, org), getWorld };
