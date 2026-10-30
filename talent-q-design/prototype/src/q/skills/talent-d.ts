// TALENT-D ops and Q skills: work authorisation (SC-071), critique and versions of the candidate's own work
// (SC-076, SC-077), cover notes (SC-087), the learning player (SC-092), the improvement wizard (SC-172) and
// recovery after a rejection (SC-175). Every page task can be done by asking Q. Sharing evidence goes through the
// Passport's own ops (tb.share / tb.revoke); nothing here is a second implementation of them.
import { registerOp, registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import type { QAction } from '../../state/domain';
import { emit, now, uid } from '../../mock/world';
import { td, newAuth, type AuthStatus, type Critique } from '../../state/areas/talent-d';
import {
  AUTH_LABEL, AUTH_SHORT, COUNTRIES, EMPLOYER_FEEDBACK, authOf, authOrgs, draftLetter, inventedIn, latest, letterKey, letterOf, makeCritique, orgNm,
  receiptId, resourceById, resourcesFor, wizardFor, worksOf,
} from '../../journeys/talent-d/logic';
import { j7, personaFor, sampleFor, submitSample } from '../../journeys/career/j7';
import { orgIn } from './talent-b';

const cand = (c: QCtx) => c.actor.side === 'candidate' && !!c.actor.personId;
const pidOf = (c: QCtx) => c.actor.personId!;
const reply = (text: string, extra: Partial<QReply['msgs'][number]> = {}): QReply['msgs'][number] => ({ kind: 'reply', text, ...extra });
const P = (pid: string) => `PERSON:${pid}`;
const S = (org: string, pid: string) => `SHARED:${org}:${pid}`;

// =====================================================================================================
// SC-071 · Work authorisation
// =====================================================================================================
registerOp('td.auth.set', (w, a, actor) => {
  const pid = actor.personId!; const s = td(w); const au = (s.auth[pid] ??= newAuth());
  const country = String(a.country ?? '').trim(); const status = String(a.status ?? '') as AuthStatus;
  if (!country || !(status in AUTH_LABEL)) return { say: 'Pick a country and what applies to you. Nothing was saved.' };
  const detail = String(a.detail ?? '').trim();
  au.entries = [...au.entries.filter((e) => e.country !== country), { country, status, ...(detail ? { detail } : {}), at: now() }];
  au.updatedAt = now();
  emit(w, actor.id, 'workauth.stated', P(pid), `You stated your right to work in ${country}: ${AUTH_SHORT[status].toLowerCase()}.`);
  for (const r of Object.values(au.shares).filter((r) => !r.endedAt)) emit(w, actor.id, 'workauth.updated', S(r.org, pid), `${actor.name} updated their work authorisation statement.`);
  const live = Object.values(au.shares).filter((r) => !r.endedAt).map((r) => orgNm(w, r.org));
  return { say: `Saved: ${country}, ${AUTH_SHORT[status].toLowerCase()}. ${live.length ? `${live.join(' and ')} see${live.length === 1 ? 's' : ''} the update, because you shared it with them.` : 'It’s private: no employer sees it until you choose.'} It never hides jobs from you.` };
});
registerOp('td.auth.remove', (w, a, actor) => {
  const au = td(w).auth[actor.personId!]; if (!au) return;
  au.entries = au.entries.filter((e) => e.country !== String(a.country)); au.updatedAt = now();
  return { say: `Removed ${String(a.country)}.` };
});
registerOp('td.auth.share', (w, a, actor) => {
  const pid = actor.personId!; const org = String(a.org); const au = (td(w).auth[pid] ??= newAuth());
  if (!au.entries.length) return { say: 'There’s nothing to share yet. Say where you can work first.' };
  if (!authOrgs(w, pid).includes(org)) return { say: `You haven’t applied to or shared anything with ${orgNm(w, org)}, so I won’t share this with them.` };
  const r = { id: receiptId(w), what: 'Work authorisation statement', org, at: now() };
  au.shares[org] = r;
  emit(w, actor.id, 'workauth.shared', S(org, pid), `${actor.name} shared their work authorisation statement (receipt ${r.id}).`, { receipt: r.id });
  emit(w, actor.id, 'consent.updated', P(pid), `You let ${orgNm(w, org)} see your work authorisation. Receipt ${r.id}.`);
  return { say: `${orgNm(w, org)} can now see your statement. Receipt ${r.id}. Nobody else can, and you can end it any time.` };
});
registerOp('td.auth.unshare', (w, a, actor) => {
  const pid = actor.personId!; const org = String(a.org); const au = td(w).auth[pid]; const r = au?.shares[org];
  if (!au || !r || r.endedAt) return;
  r.endedAt = now();
  if (au.doc) au.doc.sharedWith = au.doc.sharedWith.filter((o) => o !== org);
  emit(w, actor.id, 'workauth.access_ended', S(org, pid), `${actor.name} ended access to their work authorisation.`);
  emit(w, actor.id, 'consent.updated', P(pid), `You ended ${orgNm(w, org)}’s access to your work authorisation (receipt ${r.id}).`);
  return { say: `Done. ${orgNm(w, org)} can no longer see your work authorisation or any document with it. They’re told only that access ended.` };
});
registerOp('td.auth.doc', (w, a, actor) => {
  const pid = actor.personId!; const au = (td(w).auth[pid] ??= newAuth());
  if (a.remove) { au.doc = null; return { say: 'Removed the document. Anyone you’d shared it with can no longer open it.' }; }
  if (a.org) {
    const org = String(a.org); if (!au.doc) return; const on = a.on === true;
    if (on && !(au.shares[org] && !au.shares[org].endedAt)) return { say: `Share your statement with ${orgNm(w, org)} first; the document goes with it, never on its own.` };
    au.doc.sharedWith = on ? [...new Set([...au.doc.sharedWith, org])] : au.doc.sharedWith.filter((o) => o !== org);
    emit(w, actor.id, on ? 'workauth.doc_shared' : 'workauth.doc_unshared', S(org, pid), on ? `${actor.name} let you see their right-to-work document, for your own check.` : `${actor.name} ended access to their right-to-work document.`);
    return { say: on ? `${orgNm(w, org)} can open the document to do their own check. Talent Q doesn’t check it.` : `${orgNm(w, org)} can no longer open the document.` };
  }
  au.doc = { name: String(a.name || 'Passport bio page (simulated).pdf'), at: now(), sharedWith: [] };
  return { say: 'Attached, privately. It is not checked: Talent Q doesn’t check right-to-work documents. An employer you share it with checks it themselves.' };
});

const AUTH_RE = /(work (permit|authori[sz]ation|visa)|right to work|visa|permit|allowed to work|can i work in|sponsor)/;
registerSkill({
  id: 'td.auth', side: 'candidate',
  match: (c) => (cand(c) && AUTH_RE.test(c.norm) ? 0.86 : 0),
  handle: (c) => {
    const pid = pidOf(c); const au = authOf(c.w, pid); const org = orgIn(c.norm);
    const country = COUNTRIES.find((x) => c.norm.includes(x.toLowerCase())) ?? (/\buk\b|britain|england/.test(c.norm) ? 'United Kingdom' : undefined);
    const live = Object.values(au.shares).filter((r) => !r.endedAt);
    if (org && /(stop|end|remove|revoke|hide|unshare|no longer)/.test(c.norm)) {
      if (!au.shares[org] || au.shares[org].endedAt) return { msgs: [reply(`${orgNm(c.w, org)} can’t see your work authorisation now. Nothing to end.`)] };
      return { msgs: [reply(`End ${orgNm(c.w, org)}’s access to your work authorisation? It takes effect straight away.`, { kind: 'approval', actions: [{ label: `End ${orgNm(c.w, org)}’s access`, primary: true, act: { t: 'do', op: 'td.auth.unshare', args: { org } } }, { label: 'Keep it', act: { t: 'say', text: 'keep it' } }] })] };
    }
    if (org && /\b(share|show|send|give|let)\b/.test(c.norm)) {
      if (!au.entries.length) return { msgs: [reply('You haven’t said where you can work yet, so there’s nothing to share. Tell me, or fill it in on the page.', { actions: [{ label: 'Open work authorisation', primary: true, act: { t: 'nav', to: '/c/work-permit' } }] })] };
      return { msgs: [reply(`Share your statement (${au.entries.map((e) => `${e.country}: ${AUTH_SHORT[e.status].toLowerCase()}`).join('; ')}) with ${orgNm(c.w, org)} only? You’ll get a receipt and can end it any time.`, { kind: 'approval', actions: [{ label: `Share with ${orgNm(c.w, org)}`, primary: true, act: { t: 'do', op: 'td.auth.share', args: { org } } }, { label: 'Not now', act: { t: 'say', text: 'keep it' } }] })] };
    }
    if (country && /(citizen|national|passport|need|would need|have a|hold|not sure)/.test(c.norm)) {
      const status: AuthStatus = /not sure|don t know|unsure/.test(c.norm) ? 'NOT_SURE' : /would need|need a|need to get|no (permit|visa)/.test(c.norm) ? 'NEEDS_PERMIT' : /citizen|national|born|passport/.test(c.norm) ? 'CITIZEN' : 'HOLDS_PERMIT';
      return { msgs: [reply(`I’ll note: ${country}, “${AUTH_LABEL[status]}”. It stays private, and it never hides jobs.`, { actions: [{ label: 'Save it', primary: true, act: { t: 'do', op: 'td.auth.set', args: { country, status } } }, { label: 'Open the page', act: { t: 'nav', to: '/c/work-permit' } }] })] };
    }
    if (/(filter|hide|hidden|block|stop me|jobs)/.test(c.norm)) return { msgs: [reply('No. Your work authorisation never filters jobs or search, and no employer sees it unless you share it with them. It’s there so you can tell an employer early, if you want to.')] };
    return { msgs: [reply(au.entries.length ? `You’ve said: ${au.entries.map((e) => `${e.country}, ${AUTH_SHORT[e.status].toLowerCase()}`).join('; ')}. ${live.length ? `Shared with ${live.map((r) => orgNm(c.w, r.org)).join(' and ')}.` : 'Nobody sees it yet.'}` : 'You haven’t said where you can work. It’s optional and private. If you add it, you choose which employers see it, and it never hides jobs.', {
      used: au.entries.length ? ['Your work authorisation statement'] : undefined, ref: { type: 'td.auth', id: pid }, actions: [{ label: 'Open work authorisation', primary: true, act: { t: 'nav', to: '/c/work-permit' } }],
    })] };
  },
});

// =====================================================================================================
// SC-076 / SC-077 · Critique and versions of the candidate's own work
// =====================================================================================================
registerOp('td.work.critique', (w, a, actor) => {
  const x = td(w).works[String(a.id)]; if (!x || x.personId !== actor.personId) return;
  const c = makeCritique(x.id, latest(x).v, (String(a.focus || 'ALL') as Critique['focus']), now()); if (!c) return;
  x.critique = c;
  emit(w, actor.id, 'work.critique.ready', P(x.personId), `Q read “${x.title}” (version ${c.forV}) and left ${c.points.length} suggestions. Private to you.`);
  return { say: `I read version ${c.forV}. ${c.strengths.length} things already work, and ${c.points.length} could make it stronger. It’s all private, and you decide what to change.` };
});
registerOp('td.work.point', (w, a, actor) => {
  const x = td(w).works[String(a.id)]; if (!x || x.personId !== actor.personId || !x.critique) return;
  const p = x.critique.points.find((y) => y.id === String(a.point)); if (!p) return;
  p.state = (String(a.state) as typeof p.state);
  if (p.state === 'NOT_FOR_ME') return { say: 'Left as you wrote it. It’s your work.' };
});
registerOp('td.work.apply', (w, a, actor) => {
  const x = td(w).works[String(a.id)]; if (!x || x.personId !== actor.personId) return;
  const cur = latest(x); const para = Number(a.para); const text = String(a.text ?? '').trim();
  if (!text || Number.isNaN(para) || para < 0 || para >= cur.paras.length) return { say: 'Nothing changed: the new wording was empty.' };
  if (text === cur.paras[para]) return { say: 'That’s the same as now, so I didn’t make a new version.' };
  const byQ = a.by === 'Q';
  const paras = cur.paras.map((p, i) => (i === para ? text : p));
  const point = x.critique?.points.find((p) => p.id === String(a.point));
  x.versions.push({ v: cur.v + 1, at: now(), by: byQ ? 'YOU_WITH_Q' : 'YOU', note: point ? `Answering “${point.title}”.` : 'You edited a paragraph.', paras,
    changes: [{ kind: 'REWORDED', para, what: `Paragraph ${para + 1} reworded.`, source: byQ ? 'Q’s wording, which you accepted (your facts only)' : 'Your own words' }] });
  if (point) point.state = 'DONE';
  emit(w, actor.id, 'work.version.saved', P(x.personId), `Version ${cur.v + 1} of “${x.title}” saved. Private until you share it.`);
  const shared = Object.keys(x.sharedV).filter((o) => w.evidence.find((e) => e.evidenceId === x.evidenceId)?.sharedWith.includes(o));
  return { say: `Saved as version ${cur.v + 1}.${shared.length ? ` ${shared.map((o) => orgNm(w, o)).join(' and ')} still ${shared.length === 1 ? 'has' : 'have'} version ${x.sharedV[shared[0]]} until you share the new one.` : ' Only you can see it.'}` };
});
registerOp('td.work.restore', (w, a, actor) => {
  const x = td(w).works[String(a.id)]; if (!x || x.personId !== actor.personId) return;
  const from = x.versions.find((v) => v.v === Number(a.v)); const cur = latest(x); if (!from || from.v === cur.v) return;
  x.versions.push({ v: cur.v + 1, at: now(), by: 'YOU', note: `Restored version ${from.v}.`, paras: [...from.paras], changes: [{ kind: 'RESTORED', what: `Brought back version ${from.v}. Nothing was deleted.`, source: `Your version ${from.v}` }] });
  return { say: `Restored version ${from.v} as version ${cur.v + 1}. Every earlier version is still here.` };
});
registerOp('td.work.sharedv', (w, a, actor) => {
  const x = td(w).works[String(a.id)]; if (!x || x.personId !== actor.personId) return;
  x.sharedV[String(a.org)] = latest(x).v;
  emit(w, actor.id, 'work.version.shared', S(String(a.org), x.personId), `${actor.name} shared version ${latest(x).v} of a work sample.`);
});

registerSkill({
  id: 'td.critique', side: 'candidate',
  match: (c) => (cand(c) && worksOf(c.w, pidOf(c)).length > 0 && /(critique|feedback on|review|improve|better|stronger|what.*(wrong|weak)|look at|read)/.test(c.norm) && /(write ?up|my work|paper|project|essay|summary|brief|sample|mile 12|draft)/.test(c.norm) && !/\b(cv|resume|cover)\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const pid = pidOf(c); const x = worksOf(c.w, pid).find((y) => (/brief/.test(c.norm) ? /brief/i.test(y.title) : true)) ?? worksOf(c.w, pid)[0];
    if (/(improve|stronger|better).*(brief)|brief.*(improve|stronger)/.test(c.norm) && pid === 'p_chidi') return { msgs: [reply('Your brief is part of your career plan, so the improvement wizard can take it through review and, only if you choose, into your Passport.', { actions: [{ label: 'Open the wizard', primary: true, act: { t: 'nav', to: '/c/career/improve' } }, { label: 'Just critique it', act: { t: 'do', op: 'td.work.critique', args: { id: x.id } } }] })] };
    return { msgs: [reply(`I’ll read “${x.title}” (version ${latest(x).v}) and tell you what already works and what could be stronger, with reasons. It stays private.`, { actions: [{ label: 'Critique it', primary: true, act: { t: 'do', op: 'td.work.critique', args: { id: x.id } } }, { label: 'Open the page', act: { t: 'nav', to: `/c/work/critique?w=${x.id}` } }] })], nav: { to: `/c/work/critique?w=${x.id}`, label: 'Q’s critique' } };
  },
});
registerSkill({
  id: 'td.versions', side: 'candidate',
  match: (c) => (cand(c) && worksOf(c.w, pidOf(c)).length > 0 && /(version|revision|history|what changed|restore|go back to|undo my edit)/.test(c.norm) && !/\b(cv|resume)\b/.test(c.norm) ? 0.88 : 0),
  handle: (c) => {
    const x = worksOf(c.w, pidOf(c))[0]; const n = Number(c.norm.match(/version (\d+)|v(\d+)/)?.slice(1).find(Boolean));
    if (/restore|go back/.test(c.norm) && n) return { msgs: [reply(`Restore version ${n} of “${x.title}”? It comes back as a new version; nothing is deleted.`, { kind: 'approval', actions: [{ label: `Restore version ${n}`, primary: true, act: { t: 'do', op: 'td.work.restore', args: { id: x.id, v: n } } }, { label: 'Keep it', act: { t: 'say', text: 'keep it' } }] })] };
    const sharedTxt = Object.entries(x.sharedV).map(([o, v]) => `${orgNm(c.w, o)} has version ${v}`).join('; ');
    return { msgs: [reply(`“${x.title}” has ${x.versions.length} versions. The latest is ${latest(x).v}: ${latest(x).note}${sharedTxt ? ` ${sharedTxt}.` : ' Nobody else has seen any of them.'}`, { used: ['Your work and its versions'], actions: [{ label: 'See what changed', primary: true, act: { t: 'nav', to: `/c/work/versions?w=${x.id}` } }] })] };
  },
});

// =====================================================================================================
// SC-087 · Cover notes
// =====================================================================================================
registerOp('td.letter.draft', (w, a, actor) => {
  const pid = actor.personId!; const jobId = String(a.jobId); const d = draftLetter(w, pid, jobId, (a.length === 'LETTER' ? 'LETTER' : 'NOTE'), now());
  if (!d) return { say: 'I don’t have enough of your own facts to write from yet. Add something to your Passport, and I’ll only use what’s there.' };
  td(w).letters[letterKey(pid, jobId)] = d;
  emit(w, actor.id, 'letter.draft.created', P(pid), `Q drafted a ${d.length === 'NOTE' ? 'short note' : 'cover letter'} from your own facts. Not sent; waiting for you.`);
  return { say: 'Here’s a draft from your own facts only. Each line shows where it comes from. Edit anything; nothing is sent.' };
});
registerOp('td.letter.edit', (w, a, actor) => {
  const l = td(w).letters[letterKey(actor.personId!, String(a.jobId))]; if (!l) return;
  const i = Number(a.i);
  if (a.remove) { l.lines.splice(i, 1); l.state = 'DRAFT'; return; }
  if (a.add) { l.lines.splice(l.lines.length - 1, 0, { text: String(a.text ?? ''), source: null, by: 'YOU' }); l.state = 'DRAFT'; return; }
  const line = l.lines[i]; if (!line) return; const t = String(a.text ?? '');
  if (t === line.text) return;
  l.lines[i] = { text: t, source: line.by === 'Q' && line.source ? `${line.source}, edited by you` : line.source, by: 'YOU' }; l.state = 'DRAFT';
});
registerOp('td.letter.approve', (w, a, actor) => {
  const pid = actor.personId!; const jobId = String(a.jobId); const l = td(w).letters[letterKey(pid, jobId)]; if (!l) return;
  const qAdded = l.lines.filter((x) => x.by === 'Q').flatMap((x) => inventedIn(w, pid, jobId, x.text));
  if (qAdded.length) return { say: `I can’t approve this: Q’s lines contain words that aren’t in your sources (${qAdded.join(', ')}).` };
  l.state = 'APPROVED'; l.approvedAt = now();
  emit(w, actor.id, 'letter.approved', P(pid), `You approved a cover note for ${w.jobs.find((j) => j.id === jobId)?.title}. Not sent.`);
  return { say: 'Approved and saved. Nothing was sent: when you apply, you choose whether to include it.' };
});
registerOp('td.letter.reopen', (w, a, actor) => { const l = td(w).letters[letterKey(actor.personId!, String(a.jobId))]; if (l) l.state = 'DRAFT'; });
registerOp('td.letter.discard', (w, a, actor) => { delete td(w).letters[letterKey(actor.personId!, String(a.jobId))]; return { say: 'Draft removed.' }; });

registerSkill({
  id: 'td.letter', side: 'candidate',
  match: (c) => (cand(c) && /(cover (letter|note)|covering letter|application (letter|message)|letter to|note to (the )?employer|motivation letter)/.test(c.norm) && !/(stop|do not|don t|never|not for me|hate)/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const pid = pidOf(c); const org = orgIn(c.norm);
    const routeJob = c.route.match(/^\/c\/jobs\/([\w-]+)/)?.[1];
    const job = (routeJob && c.w.jobs.find((j) => j.id === routeJob)) || c.w.jobs.find((j) => j.status === 'OPEN' && (org ? j.orgId === org : c.norm.includes(j.title.toLowerCase().split(' ')[0]) && /coordinator|analyst|engineer|manager|lead/.test(c.norm) && c.norm.includes(j.title.toLowerCase().split(' ').slice(-1)[0])))
      || (pid === 'p_grace' ? c.w.jobs.find((j) => j.id === 'j_care_coord') : pid === 'p_chidi' ? c.w.jobs.find((j) => j.id === 'j_medlink_ba') : undefined);
    if (!job) return { msgs: [reply('Which job is it for? Open the job and ask me there, or name the employer.', { actions: [{ label: 'Find jobs', primary: true, act: { t: 'nav', to: '/c/jobs' } }] })] };
    const l = letterOf(c.w, pid, job.id);
    if (/approve|looks good|that is fine|use it/.test(c.norm) && l) return { msgs: [reply('Approve this version? Nothing is sent.', { kind: 'approval', actions: [{ label: 'Approve', primary: true, act: { t: 'do', op: 'td.letter.approve', args: { jobId: job.id } } }] })] };
    return {
      msgs: [reply(`I’ll write a ${/long|full|letter/.test(c.norm) && !/note/.test(c.norm) ? 'cover letter' : 'short note'} for ${job.title} at ${orgNm(c.w, job.orgId)} from your own facts only, with a source on every line. Nothing is sent.`, { used: ['Your profile', 'Your Passport'], ref: { type: 'td.letter', id: `${pid}|${job.id}` }, actions: [{ label: 'Open the draft', primary: true, act: { t: 'nav', to: `/c/jobs/${job.id}/letter` } }] })],
      effects: (w, a) => { if (!letterOf(w, pid, job.id)) { const d = draftLetter(w, pid, job.id, /long|full/.test(c.norm) ? 'LETTER' : 'NOTE', now()); if (d) { td(w).letters[letterKey(pid, job.id)] = d; emit(w, a.id, 'letter.draft.created', P(pid), 'Q drafted a cover note from your own facts. Not sent.'); } } },
      nav: { to: `/c/jobs/${job.id}/letter`, label: 'cover note' },
    };
  },
});
registerSkill({
  id: 'td.letter.add', side: 'candidate',
  match: (c) => (cand(c) && /(cover|letter|note)/.test(c.norm) && /\b(say|add|put|claim|write)\b/.test(c.norm) && /(certified|licensed|degree|qualified|manager|expert|years|nurse)/.test(c.norm) ? 0.95 : 0),
  handle: () => ({ msgs: [reply('I won’t write that for you: it isn’t in your profile or Passport. You can type it yourself, and it will show as your own words, which employers read as a claim. If you have proof, add it to your Passport and I’ll use it.', { kind: 'refusal', actions: [{ label: 'Add proof to my Passport', primary: true, act: { t: 'nav', to: '/c/passport' } }] })] }),
});

// =====================================================================================================
// SC-092 · Learning player
// =====================================================================================================
registerOp('td.learn.set', (w, a, actor) => {
  const pid = actor.personId!; const id = String(a.id); if (!resourceById(id)) return;
  const m = ((td(w).learn[pid] ??= {})[id] ??= { mode: 'VIDEO', pos: 0, captions: true, transcript: false, answer: '', done: false });
  const p = (a.patch ?? {}) as Partial<typeof m>;
  Object.assign(m, p); m.at = now();
});
registerOp('td.learn.done', (w, a, actor) => {
  const pid = actor.personId!; const r = resourceById(String(a.id)); if (!r) return;
  const m = ((td(w).learn[pid] ??= {})[r.id] ??= { mode: 'VIDEO', pos: 0, captions: true, transcript: false, answer: '', done: false });
  m.done = true; m.at = now();
  emit(w, actor.id, 'learning.completed', P(pid), `You finished “${r.title}”. Learning is private and isn’t proof.`);
  return { say: 'Finished. That stays private, and it isn’t proof: a practice question or a reviewed sample is what an employer could see, if you choose.' };
});
registerSkill({
  id: 'td.learn', side: 'candidate',
  match: (c) => (cand(c) && resourcesFor(c.actor.personId ?? '').length > 0 && (/(teach me|learn|lesson|course|resource|video|transcript|captions|read about|how do i (lead|write))/.test(c.norm)) && !/(cv|cover)/.test(c.norm) ? 0.84 : 0),
  handle: (c) => {
    const pid = pidOf(c); const rs = resourcesFor(pid); const r = rs.find((x) => c.norm.includes(x.comp === 'incident' ? 'incident' : 'brief')) ?? rs[0];
    const onPage = c.route === `/c/learn/${r.id}`;
    if (onPage && /transcript/.test(c.norm)) return { msgs: [reply('Transcript shown below the video. Select any line to jump there.')], effects: (w) => { const m = ((td(w).learn[pid] ??= {})[r.id] ??= { mode: 'VIDEO', pos: 0, captions: true, transcript: false, answer: '', done: false }); m.transcript = true; } };
    if (onPage && /caption/.test(c.norm)) return { msgs: [reply(/off|hide/.test(c.norm) ? 'Captions off.' : 'Captions on.')], effects: (w) => { const m = ((td(w).learn[pid] ??= {})[r.id] ??= { mode: 'VIDEO', pos: 0, captions: true, transcript: false, answer: '', done: false }); m.captions = !/off|hide/.test(c.norm); } };
    if (onPage && /(read|article|text)/.test(c.norm)) return { msgs: [reply('Switched to the article. Same lesson, as text.')], effects: (w) => { const m = ((td(w).learn[pid] ??= {})[r.id] ??= { mode: 'VIDEO', pos: 0, captions: true, transcript: false, answer: '', done: false }); m.mode = 'ARTICLE'; } };
    return { msgs: [reply(`“${r.title}”: about ${r.minutes} minutes, a short video with captions and a transcript, or the same as text, then one exercise. ${r.gapLine}`, { used: ['Your career plan'], actions: [{ label: 'Open the lesson', primary: true, act: { t: 'nav', to: `/c/learn/${r.id}` } }] })], nav: { to: `/c/learn/${r.id}`, label: 'a lesson' } };
  },
});

// =====================================================================================================
// SC-172 · Improvement wizard
// =====================================================================================================
const wiz = (w: Parameters<Parameters<typeof registerOp>[1]>[0], pid: string) => (td(w).wizard[pid] ??= { step: 0, comp: 'writing', picks: {}, fact: '', review: null, choice: null, receipt: null });
registerOp('td.wiz.start', (w, a, actor) => { const pid = actor.personId!; const comp = String(a.comp || 'writing'); if (!wizardFor(comp)) return; td(w).wizard[pid] = { step: 0, comp, picks: {}, fact: '', review: null, choice: null, receipt: null }; });
registerOp('td.wiz.first', (w, _a, actor) => {
  const pid = actor.personId!; const s = wiz(w, pid); const r = submitSample(w, pid, s.comp); if (!r) return;
  return { say: `The reviewer read your original (simulated): level ${r.level} of 4. ${r.advice ?? ''} Their notes are the starting point for the suggestions.` };
});
registerOp('td.wiz.step', (w, a, actor) => { const s = wiz(w, actor.personId!); const n = Number(a.step); if (n >= 0 && n <= 4) s.step = n as typeof s.step; });
registerOp('td.wiz.pick', (w, a, actor) => { const s = wiz(w, actor.personId!); s.picks[String(a.id)] = a.on === true; s.review = null; s.choice = null; });
registerOp('td.wiz.fact', (w, a, actor) => { const s = wiz(w, actor.personId!); s.fact = String(a.text ?? ''); s.picks.fact = !!s.fact.trim(); s.review = null; s.choice = null; });
registerOp('td.wiz.review', (w, _a, actor) => {
  const pid = actor.personId!; const s = wiz(w, pid); const data = wizardFor(s.comp); const x = data && td(w).works[data.workId]; if (!data || !x) return;
  const picked = data.edits.filter((e) => s.picks[e.id] && (e.kind === 'Q_WORDING' || s.fact.trim()));
  if (!picked.length) return { say: 'Choose at least one change first. Nothing was sent.' };
  // The improved version becomes a new version of the person's work (SC-077), then goes to the simulated reviewer.
  const cur = latest(x); const paras = [...cur.paras];
  for (const e of picked) paras[e.para] = e.kind === 'YOUR_FACT' ? `${paras[e.para]} ${s.fact.trim()}` : e.after;
  x.versions.push({ v: cur.v + 1, at: now(), by: picked.some((e) => e.kind === 'Q_WORDING') ? 'YOU_WITH_Q' : 'YOU', note: 'Improved in the wizard, for review.', paras,
    changes: picked.map((e) => ({ kind: e.kind === 'YOUR_FACT' ? 'ADDED' as const : 'REWORDED' as const, para: e.para, what: e.title, source: e.source })) });
  const sm = sampleFor(personaFor(pid), s.comp);
  const fixesKey = picked.some((e) => e.kind === 'YOUR_FACT');
  const res = sm ? (fixesKey ? sm.improved : sm.first) : null;
  s.review = res ? { at: now(), level: res.level, rubric: res.rubric } : null; s.step = 3; s.choice = null;
  emit(w, actor.id, 'j7.sample.improved_reviewed', P(pid), `Your improved ${sm?.title ?? 'sample'} was reviewed (simulated): level ${res?.level} of 4. Not evidence until you choose.`);
  return { say: `Reviewed (simulated reviewer): level ${res?.level} of 4. It isn’t evidence yet. You choose whether it replaces the earlier result in your Passport.` };
});
registerOp('td.wiz.choose', (w, a, actor) => {
  const pid = actor.personId!; const s = wiz(w, pid); if (!s.review) return;
  if (a.use === true) {
    const sm = sampleFor(personaFor(pid), s.comp);
    if (!sm || s.review.level <= sm.first.level) return { say: 'There’s no improvement to use: the reviewer saw the same as before. Your earlier result stays.' };
    const S0 = j7(w, pid); if (!S0.assessments.some((x) => x.comp === s.comp)) submitSample(w, pid, s.comp); // the original's review, if missing
    submitSample(w, pid, s.comp); s.choice = 'USED'; s.step = 4;
    return { say: 'Done. The improved result is now in your Passport, private. Share it only if you want to.' };
  }
  s.choice = 'KEPT_OLD'; s.step = 4;
  return { say: 'Kept your earlier result. The improved version stays in your work history, private.' };
});
registerOp('td.wiz.consent', (w, a, actor) => {
  const pid = actor.personId!; const s = wiz(w, pid); const org = String(a.org);
  if (s.choice !== 'USED') return { say: 'There’s nothing new to share yet: the improved result isn’t in your Passport.' };
  s.receipt = { id: receiptId(w), what: `Improved ${sampleFor(personaFor(pid), s.comp)?.title ?? 'work sample'}`, org, at: now() };
  emit(w, actor.id, 'consent.receipt', P(pid), `Consent receipt ${s.receipt.id}: you agreed to share your improved sample with ${orgNm(w, org)}.`, { org, receipt: s.receipt.id });
});
registerSkill({
  id: 'td.improve', side: 'candidate',
  match: (c) => (cand(c) && pidOf(c) === 'p_chidi' && /(improve|stronger|better|fix|polish|wizard|redo|resubmit)/.test(c.norm) && /(brief|sample|work|writing)/.test(c.norm) && !/(cv|cover)/.test(c.norm) ? 0.92 : 0),
  handle: () => ({ msgs: [reply('The wizard shows the reviewer’s notes, suggests changes with their sources, and sends your improved brief for review. It becomes evidence only if you choose, and it’s shared only if you approve.', { actions: [{ label: 'Open the wizard', primary: true, act: { t: 'nav', to: '/c/career/improve' } }] })], nav: { to: '/c/career/improve', label: 'improve your sample' } }),
});

// =====================================================================================================
// SC-175 · Recovery after a rejection
// =====================================================================================================
const rec = (w: Parameters<Parameters<typeof registerOp>[1]>[0], appId: string) => (td(w).recovery[appId] ??= { asked: null, feedback: null, steps: [] });
const appOrg = (w: Parameters<Parameters<typeof registerOp>[1]>[0], appId: string) => { const app = w.applications.find((x) => x.id === appId); const job = app && w.jobs.find((j) => j.id === app.jobId); return { app, job, org: job?.orgId }; };
registerOp('td.rec.ask', (w, a, actor) => {
  const appId = String(a.appId); const { app, job, org } = appOrg(w, appId); if (!app || app.personId !== actor.personId || !org || !job) return;
  const r = rec(w, appId); if (r.asked?.state === 'SENT_SIMULATED') return;
  let t = w.threads.find((x) => x.personId === actor.personId && x.orgId === org);
  if (!t) { t = { id: uid('t'), orgId: org, personId: actor.personId!, messages: [] }; w.threads.push(t); }
  const id = uid('m');
  t.messages.push({ id, from: actor.personId!, to: org, subject: `Feedback on my ${job.title} application`, body: `Hello ${orgNm(w, org)} team, thank you for considering my application for ${job.title}. If you’re able to share anything that would help me next time, I’d be grateful. ${actor.name}`, at: now(), status: 'DRAFT', channel: 'IN_APP' });
  r.asked = { at: now(), msgId: id, state: 'DRAFT' };
});
registerOp('td.rec.send', (w, a, actor) => {
  const appId = String(a.appId); const { org } = appOrg(w, appId); const r = rec(w, appId); if (!org || !r.asked) return;
  const m = w.threads.flatMap((t) => t.messages).find((x) => x.id === r.asked!.msgId); if (!m) return;
  m.status = 'SENT_SIMULATED'; m.at = now(); m.approvedBy = actor.id; r.asked.state = 'SENT_SIMULATED';
  emit(w, actor.id, 'candidate.feedback_requested', S(org, actor.personId!), `${actor.name} asked for feedback on their application.`);
  return { say: `Sent to ${orgNm(w, org)} (simulated). Sent isn’t read: they may not reply, and that’s their choice, not a verdict on you.` };
});
registerOp('td.rec.cancel', (w, a) => {
  const r = rec(w, String(a.appId)); if (!r.asked || r.asked.state !== 'DRAFT') return;
  for (const t of w.threads) t.messages = t.messages.filter((m) => m.id !== r.asked!.msgId);
  r.asked = null;
});
/** Reviewer control: the employer replies with feedback they chose to share (simulated employer event). */
registerOp('td.rec.employer', (w, a) => {
  const appId = String(a.appId); const { app, org } = appOrg(w, appId); const text = EMPLOYER_FEEDBACK[appId]; if (!app || !org || !text) return;
  const r = rec(w, appId); if (r.feedback) return;
  const t = w.threads.find((x) => x.personId === app.personId && x.orgId === org); if (!t) return;
  const id = uid('m');
  t.messages.push({ id, from: org, to: app.personId, subject: 'Re: feedback', body: text, at: now(), status: 'RECEIVED', channel: 'IN_APP' });
  r.feedback = { at: now(), text, msgId: id };
  app.timeline.push({ at: now().slice(0, 10), text: `${orgNm(w, org)} shared feedback with you`, by: 'EMPLOYER' });
  emit(w, app.personId, 'employer.feedback_shared', S(org, app.personId), `${orgNm(w, org)} shared feedback on the application.`);
});
registerOp('td.rec.step', (w, a) => { const r = rec(w, String(a.appId)); const id = String(a.id); r.steps = r.steps.includes(id) ? r.steps.filter((x) => x !== id) : [...r.steps, id]; });

const notProgressing = (c: QCtx) => c.w.applications.filter((x) => x.personId === pidOf(c) && x.status === 'NOT_PROGRESSING');
registerSkill({
  id: 'td.recovery', side: 'candidate',
  match: (c) => (cand(c) && notProgressing(c).length > 0 && (/(rejected|rejection|turned (me )?down|not progressing|did not get|didn t get|why (was|did) .*(not|reject)|why not me|feedback)/.test(c.norm)) ? 0.9 : 0),
  handle: (c) => {
    const org = orgIn(c.norm);
    const app = notProgressing(c).find((x) => !org || c.w.jobs.find((j) => j.id === x.jobId)?.orgId === org) ?? notProgressing(c)[0];
    const job = c.w.jobs.find((j) => j.id === app.jobId)!; const r = (c.w.areas['talent-d'] as { recovery?: Record<string, { feedback: { text: string } | null }> } | undefined)?.recovery?.[app.id];
    const name = orgNm(c.w, job.orgId);
    if (/ask|request|email|message/.test(c.norm) && /feedback/.test(c.norm)) return { msgs: [reply(`I’ll draft a short, polite request to ${name}. You see it before anything is sent.`, { actions: [{ label: 'Draft it', primary: true, act: { t: 'do', op: 'td.rec.ask', args: { appId: app.id } } }, { label: 'Open the page', act: { t: 'nav', to: `/c/applications/${app.id}/recovery` } }] })] };
    const actions: QAction[] = [{ label: 'Talk it through', primary: true, act: { t: 'nav', to: `/c/applications/${app.id}/recovery` } }];
    if (r?.feedback) return { msgs: [reply(`${name} shared this, in their words: “${r.feedback.text}” That’s all I know about their decision; I won’t add reasons of my own.`, { used: [`Feedback ${name} shared with you`], actions })] };
    return { msgs: [reply(`I’m sorry, ${c.actor.first}. ${name} didn’t say why, and I won’t guess: anything I said would be made up. You can ask them, politely, and they may or may not reply.`, { used: [`Your ${job.title} application`], actions: [...actions, { label: `Ask ${name} for feedback`, act: { t: 'say', text: `ask ${name} for feedback` } }] })] };
  },
});
