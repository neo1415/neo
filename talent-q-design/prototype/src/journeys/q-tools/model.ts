// Q-TOOLS model: live derivations for Q's artifacts and the ops that both the pages and Q's skills use, so a button and
// a sentence to Q do exactly the same thing. Every read about candidates goes through canSeeCandidate (never around it).
import type { Actor } from '../../state/domain';
import { STAGES, STAGE_LABEL, type Stage } from '../../state/domain';
import { actorOf, canSeeCandidate, emit, simNow, uid, type World } from '../../mock/world';
import { registerOp } from '../../q/core/engine';
import { qt, qtw, type ArtKind, type QArtifact, type QSource } from '../../state/areas/q-tools';
import { allowed, domainOf, fileOf, MAX_MB, pageOf, PAY_CONFLICT, type WebFile } from './web';

export const tenantOf = (a: Actor) => (a.orgId ? `ORG:${a.orgId}` : `PERSON:${a.personId ?? a.id}`);
export const canOpen = (a: Actor, x: QArtifact) => x.owner === a.id || (x.visibility === 'TEAM' && x.tenant === tenantOf(a));
export const artOf = (w: World, id: string) => qt(w).artifacts.find((x) => x.id === id);
export const mine = (w: World, a: Actor) => qt(w).artifacts.filter((x) => canOpen(a, x)).slice().reverse();
export const orgName = (w: World, id?: string) => w.orgs.find((o) => o.id === id)?.name ?? 'your organisation';
export const KIND_WORD: Record<ArtKind, string> = { CHART: 'Chart', MAP: 'Map', DIAGRAM: 'Diagram', VIDEO: 'Narrated video', BROWSE: 'Web page', DOWNLOAD: 'Download' };

// ---------------- Time: progress is derived from when the work started, in real steps ----------------
export const elapsed = (x: { at: string }) => Date.now() - new Date(x.at).getTime();
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export function ageWords(w: World, iso: string) {
  const d = Math.round((simNow(w).getTime() - new Date(iso).getTime()) / 864e5);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : `${Math.round(d / 30)} months ago`;
}
/** Freshness of what a source says (published date), not of when Q read it. */
export function freshness(w: World, s: QSource): { k: 'live' | 'fresh' | 'ageing' | 'old'; word: string } {
  if (s.kind === 'TALENTQ') return { k: 'live', word: 'Live: read again each time it’s shown' };
  if (!s.publishedAt) return { k: 'ageing', word: 'Publication date unknown' };
  const d = (simNow(w).getTime() - new Date(s.publishedAt).getTime()) / 864e5;
  return d <= 45 ? { k: 'fresh', word: `Fresh · published ${ageWords(w, s.publishedAt)}` } : d <= 180 ? { k: 'ageing', word: `Ageing · published ${ageWords(w, s.publishedAt)}` } : { k: 'old', word: `Old · published ${ageWords(w, s.publishedAt)}` };
}

// ---------------- Roles and pipeline (SC-124 chart) ----------------
export function orgRoles(w: World, orgId?: string) {
  if (!orgId) return [];
  const legacy = orgId === 'org_kora' ? [{ id: w.mandate.mandateId, title: w.mandate.title }] : [];
  return [...legacy, ...w.mandates.filter((m) => m.orgId === orgId).map((m) => ({ id: m.id, title: m.title }))];
}
export const roleTitle = (w: World, id?: string) => (id ? (id === w.mandate.mandateId ? w.mandate.title : w.mandates.find((m) => m.id === id)?.title) : undefined);
/** Pipeline by stage for the actor's organisation (one role or all), with people the org may not see counted, never named. */
export function pipelineData(w: World, a: Actor, mandate?: string) {
  const roles = orgRoles(w, a.orgId).filter((r) => !mandate || r.id === mandate);
  const ids = new Set(roles.map((r) => r.id));
  const entries = w.pipeline.filter((p) => ids.has(p.mandateId) && STAGES.includes(p.stage));
  const seen = entries.filter((p) => canSeeCandidate(w, p.personId, a.orgId!));
  const rows = STAGES.map((s) => { const xs = seen.filter((p) => p.stage === s); return { stage: s as Stage, label: STAGE_LABEL[s], n: xs.length, people: xs.map((p) => ({ id: p.personId, name: w.people.find((x) => x.personId === p.personId)?.name ?? 'Someone', role: roleTitle(w, p.mandateId) ?? '' })) }; });
  return { roles, rows, total: seen.length, hidden: entries.length - seen.length };
}

// ---------------- Locations (SC-124 map) ----------------
/** Approximate city centres (lat, lon). Only city level is ever shown; no addresses exist in Talent Q. */
export const CITIES: Record<string, [number, number]> = { Lagos: [6.52, 3.38], Abuja: [9.07, 7.49], 'Port Harcourt': [4.82, 7.03], Enugu: [6.45, 7.51], Uyo: [5.04, 7.93], Ibadan: [7.38, 3.94], Kano: [12.0, 8.52], Accra: [5.6, -0.19], Nairobi: [-1.29, 36.82], London: [51.5, -0.13] };
/** The drawn area: West Africa from Accra to Uyo. Cities outside it are listed at the edge, never squeezed in. */
export const VIEW = { lonMin: -1.4, lonMax: 9.4, latMin: 3.6, latMax: 12.8 };
export const cityOf = (loc?: string) => { const c = (loc ?? '').replace(/\s*\(.*\)\s*/, '').split(',')[0].trim(); return c && c.toLowerCase() !== 'remote' ? c : ''; };
export function mapData(w: World, a: Actor, mandate?: string) {
  const roles = orgRoles(w, a.orgId).filter((r) => !mandate || r.id === mandate);
  const ids = new Set(roles.map((r) => r.id));
  const pids = [...new Set(w.pipeline.filter((p) => ids.has(p.mandateId) && STAGES.includes(p.stage)).map((p) => p.personId))];
  const vis = pids.filter((pid) => canSeeCandidate(w, pid, a.orgId!));
  const by = new Map<string, { id: string; name: string }[]>();
  const unknown: { id: string; name: string }[] = [];
  for (const pid of vis) {
    const p = w.people.find((x) => x.personId === pid); const c = cityOf(p?.location);
    const who = { id: pid, name: p?.name ?? 'Someone' };
    if (!c) unknown.push(who); else by.set(c, [...(by.get(c) ?? []), who]);
  }
  const places = [...by.entries()].map(([city, people]) => {
    const ll = CITIES[city];
    const inView = !!ll && ll[0] >= VIEW.latMin && ll[0] <= VIEW.latMax && ll[1] >= VIEW.lonMin && ll[1] <= VIEW.lonMax;
    return { city, people, ll, inView };
  }).sort((x, y) => y.people.length - x.people.length || x.city.localeCompare(y.city));
  return { roles, places, unknown, total: vis.length, hidden: pids.length - vis.length };
}

// ---------------- Hiring process (SC-126 diagram) ----------------
export interface Step { id: string; label: string; note: string; n?: number; gate?: string; here?: boolean }
export function processSteps(w: World, a: Actor): { title: string; steps: Step[]; basis: string[] } {
  if (a.orgId) {
    const org = w.orgs.find((o) => o.id === a.orgId)!;
    const d = pipelineData(w, a);
    const g = (re: RegExp) => org.guidelines.find((x) => re.test(x));
    const gate = org.delegation === 'DRAFT_ONLY' ? 'Q drafts only; a person sends' : org.delegation === 'APPROVE_EACH_SEND' ? 'A person approves each message' : 'Sent within an approved campaign';
    const n = (s: Stage) => d.rows.find((r) => r.stage === s)?.n ?? 0;
    return {
      title: `How ${org.name} hires`,
      basis: [`${org.name}’s pipeline stages (live counts)`, `Delegation: ${gate}`, ...org.guidelines.slice(0, 2)],
      steps: [
        { id: 'SOURCED', label: 'Found', note: 'Q searches people who can be found, or who applied', n: n('SOURCED') },
        { id: 'SHORTLISTED', label: 'Shortlisted', note: 'A recruiter picks who to contact, by evidence', n: n('SHORTLISTED') },
        { id: 'CONTACTED', label: 'Contacted', note: 'First message from the role’s inbox', n: n('CONTACTED'), gate },
        { id: 'REPLIED', label: 'Replied', note: 'The person answers; silence isn’t a no', n: n('REPLIED') },
        { id: 'INTERVIEW', label: 'Interview', note: g(/panel|interview/i) ?? 'Structured, job-related questions', n: n('INTERVIEW'), gate: 'Times agreed with the person' },
        { id: 'OFFER', label: 'Offer', note: 'Pay and start date in writing', n: n('OFFER'), gate: 'Hiring manager signs off' },
        { id: 'HIRED', label: 'Hired', note: 'Everyone else hears back', n: n('HIRED') },
      ],
    };
  }
  const apps = w.applications.filter((x) => x.personId === a.personId);
  const latest = apps[apps.length - 1];
  const job = latest ? w.jobs.find((j) => j.id === latest.jobId) : undefined;
  const at = latest?.status ?? 'DRAFT';
  const order = ['SUBMITTED', 'VIEWED', 'INTERVIEW', 'OFFER'];
  return {
    title: job ? `Your path with ${orgName(w, job.orgId)}` : 'How applying works',
    basis: job ? [`Your application to ${job.title}`, 'Talent Q’s application stages'] : ['Talent Q’s application stages'],
    steps: [
      { id: 'SUBMITTED', label: 'Applied', note: 'You choose what to share', here: at === 'SUBMITTED' },
      { id: 'VIEWED', label: 'Viewed', note: 'Someone at the employer opened it', here: at === 'VIEWED' },
      { id: 'INTERVIEW', label: 'Interview', note: 'You agree the time; adjustments on request', here: at === 'INTERVIEW', gate: 'You confirm' },
      { id: 'OFFER', label: 'Offer', note: 'In writing, with pay', here: at === 'OFFER', gate: 'You decide' },
    ].map((s) => ({ ...s, note: order.indexOf(s.id) < order.indexOf(at) ? `${s.note} · done` : s.note })),
  };
}

// ---------------- Narrated explainer (SC-127): a storyboard, not a rendered video ----------------
export interface Frame { title: string; lines: string[]; caption: string }
export function roleFor(w: World, a: Actor, route: string): { kind: 'MANDATE' | 'JOB'; id: string } | null {
  const r = route.match(/^\/r\/roles\/([\w-]+)/)?.[1] ?? route.match(/^\/c\/jobs\/([\w-]+)/)?.[1];
  if (a.orgId) { const ids = orgRoles(w, a.orgId).map((x) => x.id); const id = r && ids.includes(r) ? r : ids[0]; return id ? { kind: 'MANDATE', id } : null; }
  const j = r && w.jobs.some((x) => x.id === r) ? r : w.applications.filter((x) => x.personId === a.personId).map((x) => x.jobId).pop() ?? 'j_kora_backend';
  return { kind: 'JOB', id: j };
}
export function storyboard(w: World, scope: Record<string, string>): { role: string; org: string; frames: Frame[]; basis: string } | null {
  let title: string, org: string, needs: string[], pay: string, mode: string, where: string, basis: string;
  if (scope.job) {
    const j = w.jobs.find((x) => x.id === scope.job); if (!j) return null;
    title = j.title; org = orgName(w, j.orgId); needs = j.needs; pay = j.pay; mode = j.workMode; where = j.location; basis = `${org}’s public job post (posted ${fmtDay(j.posted)})`;
  } else {
    const id = scope.mandate;
    if (id === w.mandate.mandateId) { title = w.mandate.title; org = 'Kora Pay'; needs = w.mandate.requirements.map((r) => `${r.label}${r.mustHave ? '' : ' (nice to have)'}`); pay = w.mandate.payBand; mode = w.mandate.workMode; where = w.mandate.location; basis = `The ${title} brief, v${w.mandate.version}`; }
    else { const m = w.mandates.find((x) => x.id === id); if (!m) return null; title = m.title; org = orgName(w, m.clientOrgId ?? m.orgId); needs = m.requirements.map((r) => r.label); pay = `₦${(m.pay.min / 1e3).toFixed(0)}k–₦${(m.pay.max / 1e3).toFixed(0)}k / ${m.pay.period}`; mode = m.workMode; where = m.location; basis = `The ${title} brief, v${m.versions.at(-1)?.v ?? 1}`; }
  }
  const modeWord = mode === 'HYBRID' ? 'hybrid' : mode === 'REMOTE' ? 'remote' : 'on site';
  return {
    role: title, org, basis,
    frames: [
      { title, lines: [org, `${where} · ${modeWord}`], caption: `This is a short explainer of the ${title} role at ${org}.` },
      { title: 'What you’d do', lines: needs.slice(0, 3), caption: `The work centres on ${needs.slice(0, 3).map((x) => x.replace(/ \(nice to have\)/, '').toLowerCase()).join(', ')}.` },
      { title: 'What counts as evidence', lines: ['Work you’ve shared', 'A short sample, if asked', 'Never a face, voice or accent'], caption: 'Evidence is work you choose to share. Q never judges faces, voices or accents.' },
      { title: 'Pay and place', lines: [pay, `${where}, ${modeWord}`], caption: `Pay is ${pay.replace(/\s*\/\s*/, ' a ').replace('month', 'month')}, ${modeWord} in ${where}.` },
      { title: 'What happens next', lines: ['Found → Contacted → Interview → Offer', 'A person approves every message'], caption: 'A person approves every message, and you hear back either way.' },
    ],
  };
}
export const transcriptOf = (frames: Frame[]) => frames.map((f) => f.caption).join(' ');

// ---------------- Voice (MO-004, MO-005): simulated speech, captions only ----------------
export const WPS = 2.6;
export const wordsOf = (t: string) => t.split(/\s+/).filter(Boolean);
export function spokenIndex(v: { text: string; startedAt: string; stoppedAt?: number; resumedFrom?: number; resumedAt?: string }, t = Date.now()) {
  const n = wordsOf(v.text).length;
  if (v.resumedAt && v.resumedFrom !== undefined) { if (v.stoppedAt !== undefined && v.stoppedAt > v.resumedFrom) return v.stoppedAt; return Math.min(n, v.resumedFrom + Math.floor(((t - new Date(v.resumedAt).getTime()) / 1000) * WPS)); }
  if (v.stoppedAt !== undefined) return v.stoppedAt;
  return Math.min(n, Math.floor(((t - new Date(v.startedAt).getTime()) / 1000) * WPS));
}
export function voiceState(v: Parameters<typeof spokenIndex>[0]): 'SPEAKING' | 'INTERRUPTED' | 'DONE' {
  const n = wordsOf(v.text).length; const i = spokenIndex(v);
  if (i >= n) return 'DONE';
  if (v.stoppedAt !== undefined && (v.resumedFrom === undefined || v.stoppedAt > v.resumedFrom)) return 'INTERRUPTED';
  return 'SPEAKING';
}
/** Simulated amplitude for the speaking mark: from the syllables of the word being spoken, not a loop. */
export const amplitude = (word: string) => Math.min(1, (word.replace(/[^aeiouy]/gi, '').length + 1) / 5);

// ---------------- Sources ----------------
function upsertSource(w: World, a: Actor, s: Omit<QSource, 'id' | 'tenant' | 'addedBy' | 'usedIn' | 'fetchedAt' | 'visibility'> & { visibility?: QSource['visibility'] }, artId: string) {
  const st = qtw(w); const tenant = tenantOf(a);
  let x = st.sources.find((y) => y.tenant === tenant && y.key === s.key && (y.visibility === 'TEAM' || y.addedBy === a.id));
  if (!x) { x = { ...s, id: uid('src'), tenant, addedBy: a.id, usedIn: [], fetchedAt: simNow(w).toISOString(), visibility: s.visibility ?? 'ME' }; st.sources.push(x); }
  else x.fetchedAt = simNow(w).toISOString();
  if (!x.usedIn.includes(artId)) x.usedIn.push(artId);
  return x.id;
}
export const sourcesFor = (w: World, a: Actor) => qt(w).sources.filter((s) => s.tenant === tenantOf(a) && (s.visibility === 'TEAM' || s.addedBy === a.id));
export const webSource = (url: string) => { const p = pageOf(url); return p ? { key: `web:${p.url}`, kind: 'WEB' as const, title: p.title, domain: domainOf(p.url), url: p.url, publishedAt: p.publishedAt, licence: p.licence } : null; };

// ---------------- Making artifacts ----------------
const TITLES: Record<ArtKind, (w: World, s: Record<string, string>, a: Actor) => string> = {
  CHART: (w, s, a) => `${s.mandate ? roleTitle(w, s.mandate) : `${orgName(w, a.orgId)}’s roles`}: people by stage`,
  MAP: (w, s, a) => `Where ${s.mandate ? `${roleTitle(w, s.mandate)} candidates` : `${orgName(w, a.orgId)}’s candidates`} are`,
  DIAGRAM: (w, _s, a) => processSteps(w, a).title,
  VIDEO: (w, s) => `Explainer: ${storyboard(w, s)?.role ?? 'this role'}`,
  BROWSE: (_w, s) => pageOf(s.url)?.title ?? domainOf(s.url),
  DOWNLOAD: (_w, s) => fileOf(s.file)?.name ?? 'File',
};
const BUILD: Partial<Record<ArtKind, number>> = { VIDEO: 3200, DOWNLOAD: 3600, BROWSE: 900 };

/** Make an artifact for the signed-in person. Returns it (with `denied` when the request couldn't be met). */
export function makeArtifact(w: World, a: Actor, kind: ArtKind, scope: Record<string, string>, id?: string): QArtifact {
  const st = qtw(w);
  const art: QArtifact = { id: id ?? uid('art'), kind, owner: a.id, tenant: tenantOf(a), title: '', at: new Date().toISOString(), scope, buildMs: BUILD[kind] ?? 0, sources: [], visibility: 'ME' };
  const deny = (why: string) => { art.denied = why; };
  if ((kind === 'CHART' || kind === 'MAP') && !a.orgId) deny('Charts and maps of a pipeline are for the organisation doing the hiring. Your own data is on your Passport and Applications.');
  if ((kind === 'CHART' || kind === 'MAP') && a.orgId && scope.org && scope.org !== a.orgId) deny(`That pipeline belongs to ${orgName(w, scope.org)}. Each organisation sees only its own hiring, so I can’t chart or map it for ${orgName(w, a.orgId)}.`);
  if (kind === 'VIDEO' && scope.person) deny('A video about a person needs that person’s consent, and Q doesn’t make videos of people. I can make one about the role instead.');
  if (kind === 'BROWSE' && !allowed(scope.url)) deny(`${domainOf(scope.url)} isn’t on your organisation’s list of sites Q may open, so nothing was fetched.`);
  if (kind === 'DOWNLOAD' && scope.file && fileOf(scope.file) && !allowed(fileOf(scope.file)!.url)) deny('That file is on a site Q may not open.');
  art.title = art.denied ? `${KIND_WORD[kind]} not made` : TITLES[kind](w, scope, a);
  if (!art.denied) {
    if (kind === 'CHART' || kind === 'MAP' || kind === 'DIAGRAM') {
      if (a.orgId) art.sources.push(upsertSource(w, a, { key: `talentq:pipeline:${a.orgId}`, kind: 'TALENTQ', title: `${orgName(w, a.orgId)} pipeline records (Talent Q)`, licence: `${orgName(w, a.orgId)}’s own records`, visibility: 'TEAM' }, art.id));
      if (kind === 'MAP') art.sources.push(upsertSource(w, a, { key: 'talentq:locations', kind: 'TALENTQ', title: 'City each person put on their profile', licence: 'Shared by each person; city only', visibility: 'TEAM' }, art.id));
      if (kind === 'DIAGRAM' && a.orgId) art.sources.push(upsertSource(w, a, { key: `talentq:policy:${a.orgId}`, kind: 'TALENTQ', title: `${orgName(w, a.orgId)} hiring guidelines and approval settings`, licence: `${orgName(w, a.orgId)}’s own records`, visibility: 'TEAM' }, art.id));
      if (kind === 'DIAGRAM' && !a.orgId) art.sources.push(upsertSource(w, a, { key: 'talentq:applications', kind: 'TALENTQ', title: 'Your applications (Talent Q)', licence: 'Yours; private to you' }, art.id));
    }
    if (kind === 'VIDEO') { const sb = storyboard(w, scope); if (!sb) deny('I couldn’t find that role.'); else art.sources.push(upsertSource(w, a, { key: `talentq:role:${scope.mandate ?? scope.job}`, kind: 'TALENTQ', title: sb.basis, licence: scope.job ? 'Public job post' : `${orgName(w, a.orgId)}’s own records`, visibility: scope.job ? 'ME' : 'TEAM' }, art.id)); }
    if (kind === 'BROWSE') { const s = webSource(scope.url); if (!s) deny(`I couldn’t reach ${domainOf(scope.url)}: the page didn’t load (simulated fetch failed). Nothing was saved.`); else art.sources.push(upsertSource(w, a, s, art.id)); }
    if (kind === 'DOWNLOAD') { const f = fileOf(scope.file); if (f) art.sources.push(upsertSource(w, a, { key: `file:${f.id}`, kind: 'FILE', title: f.name, domain: domainOf(f.url), url: f.url, licence: f.outcome === 'CLEAN' ? 'Downloaded copy; same terms as its page' : 'Not opened' }, art.id)); }
  }
  st.artifacts.push(art);
  emit(w, a.id, art.denied ? 'q.artifact.denied' : 'q.artifact.made', art.tenant, art.denied ? `Q declined to make a ${KIND_WORD[kind].toLowerCase()}: ${art.denied}` : `Q made ${KIND_WORD[kind].toLowerCase()} “${art.title}” for ${a.first}.`, { artifactId: art.id, kind });
  return art;
}

// ---------------- Downloads (SC-130): size/type check → scan → (clean) extract; receipt only after the scan ----------------
export type ScanStage = 'CHECKING' | 'SCANNING' | 'EXTRACTING' | 'CLEAN' | 'BLOCKED' | 'QUARANTINED';
export function scanStage(x: QArtifact, f: WebFile, t = elapsed(x)): { stage: ScanStage; step: number; of: number; page?: number } {
  if (t < 900) return { stage: 'CHECKING', step: 1, of: 3 };
  if (f.early) return { stage: 'BLOCKED', step: 1, of: 3 };
  if (t < 2200) return { stage: 'SCANNING', step: 2, of: 3 };
  if (f.outcome !== 'CLEAN') return { stage: f.outcome, step: 2, of: 3 };
  if (t < x.buildMs) return { stage: 'EXTRACTING', step: 3, of: 3, page: Math.max(1, Math.min(f.pages ?? 1, Math.ceil(((t - 2200) / (x.buildMs - 2200)) * (f.pages ?? 1)))) };
  return { stage: 'CLEAN', step: 3, of: 3 };
}
export const scanDone = (x: QArtifact) => { const f = fileOf(x.scope.file); return !!f && ['CLEAN', 'BLOCKED', 'QUARANTINED'].includes(scanStage(x, f).stage); };
export { MAX_MB };

// ---------------- Ops (pages and Q both call these) ----------------
const sayNav = (x: QArtifact) => ({ nav: { to: x.kind === 'BROWSE' ? `/q/browse/${x.id}` : x.kind === 'DOWNLOAD' ? '/q/downloads' : `/q/artifacts/${x.id}`, label: x.title } });
registerOp('qt.make', (w, args, a) => { const x = makeArtifact(w, a, String(args.kind) as ArtKind, (args.scope ?? {}) as Record<string, string>); return x.denied ? { say: x.denied } : sayNav(x); });
registerOp('qt.browse', (w, args, a) => { const x = makeArtifact(w, a, 'BROWSE', { url: String(args.url) }); return x.denied ? { say: x.denied, nav: { to: `/q/browse/${x.id}`, label: 'secure browsing' } } : sayNav(x); });
registerOp('qt.download', (w, args, a) => { makeArtifact(w, a, 'DOWNLOAD', { file: String(args.file), from: String(args.from ?? '') }); return { nav: { to: '/q/downloads', label: 'downloads' } }; });
registerOp('qt.open', (w, args, a) => {
  const x = artOf(w, String(args.id)); if (!x || !canOpen(a, x)) return { say: 'That file isn’t yours to open.' };
  const f = fileOf(x.scope.file);
  if (!f || !scanDone(x) || scanStage(x, f).stage !== 'CLEAN') return { say: 'That file can’t be opened: only files that pass the scan open.' };
  const st = qtw(w); if (!st.opened.includes(x.id)) st.opened.push(x.id);
  emit(w, a.id, 'q.download.opened', x.tenant, `${a.first} opened ${f.name} after a clean scan (simulated).`);
});
registerOp('qt.allow.request', (w, args, a) => { const d = String(args.domain); qtw(w).allowRequests.push({ tenant: tenantOf(a), domain: d, by: a.id, at: simNow(w).toISOString() }); emit(w, a.id, 'q.allowlist.requested', tenantOf(a), `${a.first} asked an admin to allow ${d}. Not allowed yet.`); return { say: `I’ve asked an admin to review ${d}. Until they allow it, I won’t open it.` }; });
registerOp('qt.source.refresh', (w, args) => { const s = qtw(w).sources.find((x) => x.id === args.id); if (s) s.fetchedAt = simNow(w).toISOString(); });
registerOp('qt.source.visibility', (w, args, a) => { const s = qtw(w).sources.find((x) => x.id === args.id); if (!s || s.addedBy !== a.id || !a.orgId) return; s.visibility = args.to === 'TEAM' ? 'TEAM' : 'ME'; emit(w, a.id, 'q.source.visibility', s.tenant, `${a.first} made “${s.title}” ${s.visibility === 'TEAM' ? `visible to ${orgName(w, a.orgId)}` : 'private to them'}.`); });
registerOp('qt.source.remove', (w, args, a) => { const st = qtw(w); const s = st.sources.find((x) => x.id === args.id); if (!s || (s.addedBy !== a.id && s.visibility !== 'TEAM')) return; st.sources = st.sources.filter((x) => x.id !== s.id); emit(w, a.id, 'q.source.removed', s.tenant, `${a.first} removed the source “${s.title}”. Artifacts that used it say so.`); });
registerOp('qt.conflict.decide', (w, args, a) => {
  const d = String(args.decision) as 'RANGE' | 'KEEP_BOTH' | 'ASK_COLLEAGUE';
  qtw(w).conflicts[`${tenantOf(a)}|${PAY_CONFLICT.id}`] = { decision: d, by: a.id, at: simNow(w).toISOString() };
  emit(w, a.id, 'q.conflict.decided', tenantOf(a), `${a.first} chose how to handle conflicting sources on ${PAY_CONFLICT.topic}: ${d === 'RANGE' ? 'show both as one wider range' : d === 'KEEP_BOTH' ? 'keep both, side by side' : 'ask a colleague'}. Both sources are kept.`);
  return { say: d === 'RANGE' ? 'Noted. Where pay comes up I’ll say “₦2.2m–₦3.6m, from a survey and from job ads”, and name both sources. Neither is dropped.' : d === 'KEEP_BOTH' ? 'Noted. I’ll show both figures side by side, each with its source and date, and won’t merge them.' : 'Noted. I’ll keep both and leave this open until a colleague decides. Nothing is overwritten.' };
});
export const conflictDecision = (w: World, a: Actor) => qt(w).conflicts[`${tenantOf(a)}|${PAY_CONFLICT.id}`];
export function research(w: World, a: Actor) {
  const ids = [PAY_CONFLICT.a.url, PAY_CONFLICT.b.url].map((u) => upsertSource(w, a, webSource(u)!, 'research:pay'));
  emit(w, a.id, 'q.research', tenantOf(a), `Q read two public pages on ${PAY_CONFLICT.topic} (simulated). They disagree; both are kept.`);
  return ids;
}
registerOp('qt.research.pay', (w, _a, a) => { research(w, a); });

// Voice
registerOp('qt.voice.start', (w, args, a) => { qtw(w).voice.push({ id: String(args.id ?? uid('v')), owner: a.id, text: String(args.text), startedAt: new Date().toISOString(), artifactId: args.artifactId ? String(args.artifactId) : undefined }); });
registerOp('qt.voice.stop', (w, args, a) => {
  const v = qtw(w).voice.find((x) => x.id === args.id && x.owner === a.id); if (!v || voiceState(v) !== 'SPEAKING') return;
  v.stoppedAt = spokenIndex(v); v.stopReason = String(args.reason ?? 'You stopped me');
});
registerOp('qt.voice.resume', (w, args, a) => {
  const v = qtw(w).voice.find((x) => x.id === args.id && x.owner === a.id); if (!v || voiceState(v) !== 'INTERRUPTED') return;
  v.resumedFrom = v.stoppedAt; v.resumedAt = new Date().toISOString(); v.stoppedAt = undefined; v.stopReason = undefined;
});
export const latestVoice = (w: World, a: Actor) => qt(w).voice.filter((v) => v.owner === a.id).at(-1);

// Desktop → phone (MO-038)
registerOp('qt.handoff', (w, args, a) => { const x = artOf(w, String(args.id)); if (!x || !canOpen(a, x)) return; qtw(w).handoffs.push({ id: uid('ho'), owner: a.id, artifactId: x.id, at: simNow(w).toISOString(), from: 'desktop', position: Number(args.position ?? 0) }); emit(w, a.id, 'q.handoff', x.tenant, `${a.first} sent “${x.title}” to their phone, with the same Q conversation.`); return { say: `It’s on your phone now: open Talent Q there and “${x.title}” is waiting, at the same place, with this conversation.` }; });
registerOp('qt.handoff.picked', (w, args, a) => { const h = qtw(w).handoffs.find((x) => x.id === args.id && x.owner === a.id); if (h && !h.pickedUpAt) h.pickedUpAt = simNow(w).toISOString(); });
export const pendingHandoff = (w: World, a: Actor, artId?: string) => qt(w).handoffs.filter((h) => h.owner === a.id && (!artId || h.artifactId === artId)).at(-1);

export const actorNow = (w: World) => actorOf(w);
