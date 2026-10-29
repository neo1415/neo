// Candidate profile and CV ingestion (simulated). Typed boundary: Q's skills and the profile page call only
// the functions here, so a real parser and profile API could replace this file.
// Principle: everything read from a CV or said in conversation is a CLAIM, kept in the person's own words.
// Nothing here creates evidence, and nothing is ever added that the person didn't say or upload.
import { actorOf, emit, now, update, useWorld, type World } from '../mock/world';

export type Track = 'graduate' | 'switcher' | 'experienced';
export type Confidence = 'sure' | 'check';
export interface Claim { id: string; text: string; source: 'CV' | 'CONVERSATION' | 'YOU'; confidence: Confidence; flagged?: string }
export type ExpKind = 'job' | 'project' | 'volunteer' | 'course';
export interface Experience { id: string; kind: ExpKind; title: string; org: string; when: string; claims: Claim[] }
export interface SkillItem { id: string; label: string; state: 'claimed' | 'suggested' | 'evidenced'; note?: string; source?: Claim['source'] }
export type Section = 'study' | 'project' | 'volunteer' | 'tools' | 'location' | 'goal';
export const SECTIONS: Section[] = ['study', 'project', 'volunteer', 'tools', 'location', 'goal'];
export interface FormDraft { name: string; location: string; study: string; year: string; project: string; volunteer: string; tools: string }
export type FormErrors = Partial<Record<keyof FormDraft, string>>;
export interface Profile {
  v: 2; track: Track | null; name: string; location: string; workMode: 'remote' | 'hybrid' | 'onsite' | ''; visibility: 'private' | 'employers-i-choose';
  method: 'cv' | 'talk' | 'form' | null;
  study: string; year: string; goal: string;
  experience: Experience[]; skills: SkillItem[];
  /** Sections the person has answered, said "none" to (that's fine), or chose to skip (Q remembers, without nagging). */
  answered: Section[]; none: Section[]; skipped: Section[];
  /** The person's own words per section, for corrections ("actually…"). */
  answers: Partial<Record<Section, string>>;
  noJobs: boolean;
  cv: { status: 'none' | 'reading' | 'unreadable' | 'read'; file?: string; at?: string };
  form: FormDraft; formErrors: FormErrors;
  done: boolean;
}

export const QUESTIONS: Record<Section, { label: string; ask: string; help: string[] }> = {
  study: { label: 'What you studied', ask: 'What did you study, and where? For example “Economics at UNN, finished 2026”.', help: ['What was your course called, and which school or university?', 'Roughly when did you finish (or when will you)?'] },
  project: { label: 'A project', ask: 'Tell me about one project from school: your final-year project, a group assignment, anything. What was it about, and what did you do?', help: ['What was the topic of your final-year project or a big assignment?', 'Did you collect any information yourself, like a survey or interviews? Roughly how many people?', 'What did you find out, or what did you make at the end?'] },
  volunteer: { label: 'Volunteering and activities', ask: 'Have you volunteered, helped run a club or church group, or helped in a family business? All of that counts.', help: ['Did you ever keep money or records for a group?', 'Did you organise an event, or teach or tutor anyone?', 'Did you help in a shop or a family business, even informally?'] },
  tools: { label: 'Tools you’ve used', ask: 'Which tools did you use for any of that? Excel, Google Sheets, Word, PowerPoint, anything else.', help: ['Did you type it up in Word, or make tables or charts in Excel or Google Sheets?'] },
  location: { label: 'Where you can work', ask: 'Where can you work from? A city, or “remote only”.', help: ['Which city do you live in, and would you move or travel for work?'] },
  goal: { label: 'What you want first', ask: 'Last one: what kind of work would you like first? It’s fine to say you’re not sure yet.', help: ['Do you enjoy working with numbers, with people, or organising things?'] },
};

export const blankForm = (): FormDraft => ({ name: '', location: '', study: '', year: '', project: '', volunteer: '', tools: '' });
export const blankProfile = (): Profile => ({ v: 2, track: null, name: '', location: '', workMode: '', visibility: 'private', method: null, study: '', year: '', goal: '', experience: [], skills: [], answered: [], none: [], skipped: [], answers: {}, noJobs: false, cv: { status: 'none' }, form: blankForm(), formErrors: {}, done: false });
const BLANK = blankProfile();

/** Reads a stored profile; older shapes (v1) start again as blank rather than guessing. */
export const readProfile = (w: World, pid: string): Profile => { const p = w.profiles[pid] as Profile | undefined; return p && p.v === 2 ? p : { ...BLANK, name: w.people.find((x) => x.personId === pid)?.name ?? '' }; };
const whose = (w: World) => { const a = actorOf(w); return a.side === 'candidate' && a.personId ? a.personId : 'p_amaka'; };
export function useProfile<T>(sel: (p: Profile) => T): T { return useWorld((w) => sel(readProfile(w, whose(w)))); }
export const trackOf = (_w: World, pid: string): Track => (pid === 'p_chidi' ? 'switcher' : pid === 'p_tobi' ? 'experienced' : 'graduate');

/** Mutate a person's profile inside an update; keeps the Passport in step once the profile is done. */
export function editProfile(w: World, pid: string, f: (p: Profile) => void) {
  const p = structuredClone(readProfile(w, pid));
  if (!p.track) p.track = trackOf(w, pid);
  if (!p.name) p.name = w.people.find((x) => x.personId === pid)?.name ?? '';
  f(p);
  w.profiles[pid] = p as unknown as World['profiles'][string];
  if (p.done) syncToPassport(w, pid, p);
}
export const setProfile = (f: (p: Profile) => Profile) => update((w) => { const pid = whose(w); editProfile(w, pid, (p) => Object.assign(p, f(structuredClone(p)))); });

// ---------------- Understanding the person's own words (never adding to them) ----------------
const TOOLS: { label: string; re: RegExp }[] = [
  { label: 'Excel', re: /\bexcel\b/ }, { label: 'Google Sheets', re: /\bgoogle sheets?\b|\bsheets\b/ }, { label: 'Word', re: /\bms word\b|\bword\b(?! of)/ }, { label: 'PowerPoint', re: /\bpower ?point\b|\bslides\b/ },
  { label: 'SQL', re: /\bsql\b/ }, { label: 'Python', re: /\bpython\b/ }, { label: 'Power BI', re: /\bpower ?bi\b/ }, { label: 'SPSS', re: /\bspss\b/ }, { label: 'Stata', re: /\bstata\b/ },
  { label: 'Canva', re: /\bcanva\b/ }, { label: 'Google Forms', re: /\bgoogle forms?\b/ }, { label: 'Tableau', re: /\btableau\b/ },
];
export const toolsIn = (text: string) => TOOLS.filter((t) => t.re.test(text.toLowerCase())).map((t) => t.label);
/** Light tidying only: trims filler and capitalises. The words stay the person's own. */
export function tidy(text: string) {
  let s = text.trim().replace(/\s+/g, ' ');
  s = s.replace(/^(um+|uh+|erm+|so|well|ok(ay)?|hmm+|yes|yeah|i think|i guess|basically)[,.]?\s+/i, '');
  s = s.replace(/\s*(lol|haha+)\s*$/i, '');
  s = s.replace(/^i\b/, 'I').replace(/\bi\b/g, 'I');
  if (s) s = s[0].toUpperCase() + s.slice(1);
  if (s && !/[.!?]$/.test(s)) s += '.';
  return s;
}
const uidc = () => `c${Math.random().toString(36).slice(2, 8)}`;
const titleFor = (sec: 'project' | 'volunteer', t: string) => {
  const s = t.toLowerCase();
  if (sec === 'project') return /final[- ]?year|thesis|dissertation|long essay/.test(s) ? 'Final-year project' : /group/.test(s) ? 'Group project' : 'School project';
  return /treasurer/.test(s) ? 'Treasurer' : /secretary/.test(s) ? 'Secretary' : /tutor|teach/.test(s) ? 'Volunteer tutor' : /church/.test(s) ? 'Church volunteer' : /shop|business|market|stall/.test(s) ? 'Helping in a family business' : /club|society|association/.test(s) ? 'Club or society role' : 'Volunteering';
};

/** Record an answer for one section, in the person's words. Returns a short note of what was kept. */
export function applyAnswer(p: Profile, sec: Section, raw: string, source: Claim['source'] = 'CONVERSATION'): string {
  const text = tidy(raw);
  p.answers[sec] = raw;
  p.skipped = p.skipped.filter((x) => x !== sec);
  p.none = p.none.filter((x) => x !== sec);
  if (!p.answered.includes(sec)) p.answered.push(sec);
  if (!p.method) p.method = source === 'YOU' ? 'form' : 'talk';
  const addTools = (t: string) => { for (const tool of toolsIn(t)) if (!p.skills.some((s) => s.label === tool)) p.skills.push({ id: `sk_${tool.replace(/\W/g, '')}`, label: tool, state: 'claimed', note: source === 'CV' ? 'In your CV · claim' : 'You said so · claim', source }); };
  switch (sec) {
    case 'study': {
      p.study = text.replace(/\.$/, '');
      p.year = raw.match(/\b(19|20)\d{2}\b/)?.[0] ?? p.year;
      addTools(raw);
      return `Study: ${p.study}`;
    }
    case 'project': case 'volunteer': {
      const kind: ExpKind = sec === 'project' ? 'project' : 'volunteer';
      p.experience = p.experience.filter((e) => !(e.kind === kind && e.claims.every((c) => c.source === source)));
      p.experience.push({ id: `x_${kind}_${uidc()}`, kind, title: titleFor(sec, raw), org: sec === 'project' ? (p.study.split(/ at |,/)[1]?.trim() ?? '') : '', when: sec === 'project' ? p.year : '', claims: [{ id: uidc(), text, source, confidence: /\d/.test(raw) || raw.split(' ').length > 10 ? 'sure' : 'check', flagged: /\d/.test(raw) || raw.split(' ').length > 10 ? undefined : 'Short: a rough number or one result would make it clearer.' }] });
      addTools(raw);
      return text;
    }
    case 'tools': {
      const found = toolsIn(raw);
      addTools(raw);
      if (!found.length && raw.trim()) p.skills.push({ id: `sk_${uidc()}`, label: text.replace(/\.$/, ''), state: 'claimed', note: 'In your words · claim', source });
      return found.length ? found.join(', ') : text;
    }
    case 'location': {
      const loc = raw.replace(/^(i (can )?(work|live|stay|am)( from| in| based in)?|from|in|based in)\s+/i, '').replace(/\.$/, '').trim();
      p.location = loc ? loc[0].toUpperCase() + loc.slice(1) : '';
      if (/remote/i.test(raw)) p.workMode = 'remote';
      return p.location;
    }
    case 'goal': { p.goal = text.replace(/\.$/, ''); return p.goal; }
  }
}
export const missingOf = (p: Profile) => SECTIONS.filter((s) => !p.answered.includes(s) && !p.none.includes(s));
export const nextSection = (p: Profile) => SECTIONS.find((s) => !p.answered.includes(s) && !p.none.includes(s) && !p.skipped.includes(s)) ?? null;
/** Everything the person has said or uploaded about themselves, as one lowercase string (for matching only). */
export const profileText = (p: Profile) => [p.study, p.goal, ...p.experience.flatMap((e) => [e.title, ...e.claims.map((c) => c.text)]), ...p.skills.filter((s) => s.state !== 'suggested').map((s) => s.label)].join(' · ').toLowerCase();

// ---------------- Form (optional) with validation and a recovery path ----------------
export function validateForm(f: FormDraft): FormErrors {
  const e: FormErrors = {};
  const y = f.year.trim();
  if (y && !/^\d{4}$/.test(y)) e.year = /^\d{5,}$/.test(y) ? `“${y}” has ${y.length} digits. A year has four, for example ${y.slice(0, 2)}${y.slice(-2)}.` : `“${y}” doesn’t look like a year. Use four digits, for example 2026.`;
  else if (y && (Number(y) < 1970 || Number(y) > 2031)) e.year = `${y} is outside the years I’d expect. Check it, or leave it blank.`;
  if (f.location.trim() && /^\d+$/.test(f.location.trim())) e.location = 'That looks like a number. Type a city, or “Remote only”.';
  if (f.name.trim() && f.name.trim().length < 2) e.name = 'Your name looks too short.';
  return e;
}
/** Suggested correction for a field error, when one is obvious (used by Q's "did you mean"). */
export function suggestFix(field: keyof FormDraft, f: FormDraft): string | null {
  if (field === 'year') { const y = f.year.trim(); if (/^\d{5,}$/.test(y)) { const c = `${y.slice(0, 2)}${y.slice(-2)}`; return Number(c) >= 1970 && Number(c) <= 2031 ? c : null; } }
  return null;
}
export function saveForm(p: Profile): void {
  const f = p.form;
  if (f.name.trim()) p.name = f.name.trim();
  if (f.study.trim()) { applyAnswer(p, 'study', `${f.study.trim()}${f.year.trim() ? `, ${f.year.trim()}` : ''}`, 'YOU'); if (f.year.trim()) p.year = f.year.trim(); }
  if (f.project.trim()) applyAnswer(p, 'project', f.project, 'YOU');
  if (f.volunteer.trim()) applyAnswer(p, 'volunteer', f.volunteer, 'YOU');
  if (f.tools.trim()) applyAnswer(p, 'tools', f.tools, 'YOU');
  if (f.location.trim()) applyAnswer(p, 'location', f.location, 'YOU');
  p.method = p.method ?? 'form';
}

/** Onboarding output becomes Passport items: every claim stays a CLAIM, in the person's words, private
 * unless the person shared it (sharing is kept across re-syncs, never widened here). */
export function syncToPassport(w: World, pid: string, p: Profile) {
  const prev = new Map(w.evidence.filter((e) => e.ownerId === pid && e.origin === 'ONBOARDING').map((e) => [e.evidenceId, e]));
  w.evidence = w.evidence.filter((e) => !(e.ownerId === pid && e.origin === 'ONBOARDING'));
  for (const x of p.experience) for (const c of x.claims) {
    const id = `e_${pid}_${c.id}`; const old = prev.get(id);
    w.evidence.push({ evidenceId: id, ownerId: pid, kind: 'CLAIM', title: c.text, source: c.source === 'CV' ? 'Your CV' : c.source === 'CONVERSATION' ? 'Your conversation with Q' : 'Added by you', observedAt: old?.observedAt ?? now().slice(0, 10), verified: false, verification: 'UNVERIFIED', shows: `${x.title}${x.org ? `, ${x.org}` : ''}${x.when ? ` (${x.when})` : ''}`, limits: 'A claim in your words. Add a work sample, reference or credential to back it.', visibility: old?.visibility ?? 'PRIVATE', sharedWith: old?.sharedWith ?? [], origin: 'ONBOARDING' });
  }
  const person = w.people.find((x) => x.personId === pid);
  if (person) { if (p.study && p.track === 'graduate') person.headline = `${p.study.split(/,| at /)[0]} graduate${p.goal && !/not sure/i.test(p.goal) ? ` · interested in ${p.goal.toLowerCase()}` : ''}`; if (p.location) person.location = p.location; }
}
export function completeProfile(w: World, pid: string) {
  editProfile(w, pid, (p) => { p.done = true; });
  const p = readProfile(w, pid);
  emit(w, pid, 'profile.completed', `PERSON:${pid}`, `Profile set up: ${p.experience.reduce((n, x) => n + x.claims.length, 0)} claims and ${p.skills.length} skills in your Passport (private).`);
}

// ---------------- Ingestion (simulated parser) ----------------
export type ParseResult = { ok: true; file: string } | { ok: false; code: 'NO_TEXT'; message: string; recover: string[] };
export const SAMPLE_FILES: Record<string, { file: string; kind: 'pdf' | 'scan'; label: string }[]> = {
  p_amaka: [{ file: 'Amaka_Eze_CV.pdf', kind: 'pdf', label: 'Amaka_Eze_CV.pdf (sample, 2 pages)' }, { file: 'CV_photo_from_phone.jpg', kind: 'scan', label: 'CV_photo_from_phone.jpg (sample, a photo of a printed page)' }],
  p_chidi: [{ file: 'Chidi_Nwosu_CV.pdf', kind: 'pdf', label: 'Chidi_Nwosu_CV.pdf (sample)' }, { file: 'cv_scan.jpg', kind: 'scan', label: 'cv_scan.jpg (sample, a photo)' }],
};
export const samplesFor = (pid: string) => SAMPLE_FILES[pid] ?? [{ file: 'My_CV.pdf', kind: 'pdf' as const, label: 'My_CV.pdf (sample)' }, { file: 'cv_photo.jpg', kind: 'scan' as const, label: 'cv_photo.jpg (sample, a photo)' }];
/** What the sample CVs say. Only these lines are ever read from them. */
const CV_TEXT: Record<string, { study: string; project?: string; volunteer?: string; job?: { title: string; org: string; when: string; lines: string[] }; tools: string; location: string; vague?: string }> = {
  p_amaka: { study: 'BSc Economics, University of Nigeria, Nsukka, 2026', project: 'Final-year project: surveyed 120 traders at Ogbete Market about food price changes and analysed the answers in Excel.', volunteer: 'Treasurer, Economics Students’ Association (2024–2025): kept the ₦350,000 budget and the monthly accounts.', tools: 'Excel, Google Sheets, Word', location: 'Enugu', vague: 'Good communication skills.' },
  p_chidi: { study: 'BSc Marketing, University of Port Harcourt, 2020', job: { title: 'Sales executive', org: 'Bole Distributors', when: '2021–now', lines: ['Managed 40 retail accounts across Port Harcourt.', 'Grew region revenue 18% in 2025.'] }, tools: 'Excel', location: 'Port Harcourt' },
};
export function readCv(w: World, pid: string, file: string, kind: 'pdf' | 'scan'): ParseResult {
  if (kind === 'scan') return { ok: false, code: 'NO_TEXT', message: `${file} is a photo of a page, so there’s no text I can read reliably.`, recover: ['Upload a PDF or Word version', 'Tell Q about it here instead', 'Fill in the short form'] };
  const t = CV_TEXT[pid];
  editProfile(w, pid, (p) => {
    p.method = 'cv'; p.cv = { status: 'read', file, at: now() };
    if (!t) return;
    applyAnswer(p, 'study', t.study, 'CV');
    if (t.project) applyAnswer(p, 'project', t.project, 'CV');
    if (t.volunteer) applyAnswer(p, 'volunteer', t.volunteer, 'CV');
    if (t.job) { p.experience.push({ id: `x_job_${uidc()}`, kind: 'job', title: t.job.title, org: t.job.org, when: t.job.when, claims: t.job.lines.map((l) => ({ id: uidc(), text: l, source: 'CV' as const, confidence: 'sure' as const })) }); }
    if (t.vague) { const v = p.experience.find((e) => e.kind === 'volunteer'); v?.claims.push({ id: uidc(), text: t.vague, source: 'CV', confidence: 'check', flagged: 'Vague: an example would make this believable.' }); }
    applyAnswer(p, 'tools', t.tools, 'CV');
    applyAnswer(p, 'location', t.location, 'CV');
    p.method = 'cv';
  });
  return { ok: true, file };
}
