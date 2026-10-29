// MEDIA Q skills (audit addendum §F; J11 steps 7–8). Everything the video pages do can be said to Q.
// Candidate: add a video, share only some parts with an organisation, what will Kora see, fix a transcript line,
// stop sharing, delete. Recruiter: summarise the video, where does he show X, play a part, mark the report reviewed,
// change a rating with a reason. Both: Q refuses prohibited inferences from face, voice, accent or appearance
// (AD-F-10/11), with the reason and what it can do instead. Reads go through visibleSegments, never around it.
import { registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import type { MediaEvidence, QAction } from '../../state/domain';
import type { World } from '../../mock/world';
import { visibleSegments } from '../../state/areas/media';
import { KEY_MOMENTS, type Topic } from '../../state/seeds/media';
import {
  KEEPS, NO_INFERENCE, criteriaFor, editLine, fmt, fmtDate, itemsOf, list, markReviewed, ms, orgName, overrideRating, ratingFor, reportView, roleFor, span, startDraft, topicOf, traitAsked,
} from '../../journeys/media/logic';

const reply = (text: string, extra: Partial<QReply['msgs'][number]> = {}): QReply['msgs'][number] => ({ kind: 'reply', text, ...extra });
const cand = (c: QCtx) => c.actor.side === 'candidate' && !!c.actor.personId;
const rec = (c: QCtx) => c.actor.side === 'recruiter' && !!c.actor.orgId;
const VIDEO = /\b(video|recording|walkthrough|walk-through|voice note|voice recording|clip|transcript)\b/;
const live = (w: World, pid: string) => itemsOf(w, pid).filter((m) => m.state !== 'CONSENT').slice(-1)[0] as MediaEvidence | undefined;
const frame = (stage: string, slots: Record<string, string> = {}) => ({ intent: `media.${stage}`, slots, startedAt: new Date().toISOString() });
const ORG_RE: [RegExp, string][] = [[/\bkora\b|korapay/, 'org_kora'], [/talent ?bridge|\bagency\b/, 'org_tb'], [/med ?link/, 'org_medlink']];
const orgIn = (norm: string) => ORG_RE.find(([re]) => re.test(norm))?.[1];
const PART_RE: [RegExp, string][] = [[/payment|reconcil|settle|ledger|first part|part 1|part one/, 's1'], [/dashboard|client|confidential|middle|second part|part 2|part two/, 's2'], [/postgres|database|\bsql\b|tuning|query|last part|third part|part 3|part three/, 's3']];
const partsIn = (norm: string) => PART_RE.filter(([re]) => re.test(norm)).map(([, id]) => id);
const QTOPIC: [RegExp, Topic][] = [[/reconcil|payment|settle|ledger|matching/, 'payments'], [/postgres|database|\bsql\b|query|partition|index|tuning/, 'postgres'], [/\bgo\b|golang|worker|idempoten/, 'go'], [/incident|on-?call|outage|post-?mortem|dashboard/, 'incidents'], [/mentor/, 'mentoring'], [/explain|communicat/, 'communication'], [/design|trade-?off|architect/, 'design']];
const topicIn = (norm: string) => QTOPIC.find(([re]) => re.test(norm))?.[1];

// =====================================================================================================
// Both sides: no inferences from face, voice, accent or appearance
// =====================================================================================================
registerSkill({
  id: 'media.noinference', side: 'both',
  match: (c) => {
    if (!traitAsked(c.norm) || /\b(are you|is q|q is|uncertain\w*|rating|proposed)\b/.test(c.norm)) return 0;
    if (rec(c)) return (c.ents.people.length || /\b(he|she|they|him|her|candidate|video|recording)\b/.test(c.norm) || /^\/r\/people\//.test(c.route)) ? 0.97 : 0;
    return cand(c) && /\b(my|me|i)\b/.test(c.norm) ? 0.9 : 0;
  },
  handle: (c) => {
    if (cand(c)) return { msgs: [reply(`No. ${NO_INFERENCE}: Q never judges how you look or sound, how confident you seem, your age, or anything like that. Kora’s report only uses what you say and show about your work, and you check the transcript first. If recording is hard for you, a written walkthrough counts the same, or you can ask for an adjustment without giving a reason.`, { actions: [{ label: 'Write it instead', act: { t: 'do', op: 'media.alternative', args: { kind: 'TEXT' } } }, { label: 'Ask for an adjustment', act: { t: 'do', op: 'media.alternative', args: { kind: 'ADJUSTMENT' } } }] })] };
    const pid = c.ents.people[0] ?? c.route.match(/people\/(p_\w+)/)?.[1] ?? 'p_tobi';
    const first = c.w.people.find((p) => p.personId === pid)?.name.split(' ')[0] ?? 'the candidate';
    const m = itemsOf(c.w, pid).find((x) => visibleSegments(c.w, x.id, c.actor.orgId!).length);
    const ex = m ? KEY_MOMENTS.design.moments.find((x) => visibleSegments(c.w, m.id, c.actor.orgId!).some((s) => x.t >= s.t && x.t < s.tEnd)) : undefined;
    return { msgs: [reply(`I won’t judge that. Reading confidence, honesty, personality or emotion from someone’s face, voice, accent or manner isn’t reliable, and it’s unfair to people who speak, look or move differently, including disabled candidates. It also isn’t part of the role’s rubric. What I can do: show what ${first} said and did against the criteria, with the moments to play${ex ? `, for example how he explains a design trade-off at ${fmt(ex.t)}` : ''}. If the role needs something like explaining decisions clearly, that’s judged on the content of the answer, with a written alternative.`, {
      kind: 'refusal', used: ['Fair-hiring rule: no inferences from face or voice'],
      actions: m ? [{ label: `Summarise ${first}’s video`, act: { t: 'say', text: `summarise ${first}'s video` } }, ...(ex ? [{ label: `Play ${fmt(ex.t)}`, act: { t: 'nav', to: `/r/people/${pid}/video?t=${ex.t}&play=1` } } as QAction] : [])] : [],
    })] };
  },
});

// =====================================================================================================
// Candidate
// =====================================================================================================
registerSkill({
  id: 'media.add', side: 'candidate',
  match: (c) => (cand(c) && /\b(add|upload|record|attach|put|send|submit|make)\b/.test(c.norm) && /\b(video|recording|walkthrough|walk-through|voice note|voice recording|demo)\b/.test(c.norm) && !/\b(only|parts?|section|stop|delete)\b/.test(c.norm) ? 0.92 : 0),
  handle: (c) => {
    const asked = c.w.threads.some((t) => t.personId === c.actor.personId && t.messages.some((m) => /video|walkthrough/i.test(m.body)));
    return {
      msgs: [reply(`Let’s add it. First you choose who sees it, why, and for how long: I’ve suggested Kora Pay${asked ? ' (they asked for a walkthrough)' : ''} for 90 days. Nothing is uploaded or transcribed until you agree. ${NO_INFERENCE}: I only use what you say and show. Rather not record? A written walkthrough counts the same.`, {
        actions: [{ label: 'Write it instead', act: { t: 'do', op: 'media.alternative', args: { kind: 'TEXT' } } }, { label: 'Ask for an adjustment', act: { t: 'do', op: 'media.alternative', args: { kind: 'ADJUSTMENT' } } }],
      })],
      effects: (w, a) => { startDraft(w, a.personId!); },
      nav: c.route.startsWith('/c/passport') && /media=/.test(location.hash) ? undefined : { to: '/c/passport?media=add', label: 'your Evidence Passport' },
      frame: frame('add'),
    };
  },
});

registerSkill({
  id: 'media.share', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    const m = live(c.w, c.actor.personId!); if (!m || !['REVIEW', 'READY'].includes(m.state)) return 0;
    if (/\b(stop|revoke|unshare|end|delete)\b/.test(c.norm) || /what (will|would|does|do|can)/.test(c.norm)) return 0;
    return /\b(share|show|send|give|let)\b/.test(c.norm) && (partsIn(c.norm).length || /\b(parts?|bits?|sections?)\b/.test(c.norm)) ? 0.95 : 0;
  },
  handle: (c) => {
    const m = live(c.w, c.actor.personId!)!;
    const consented = m.consent?.orgs ?? [];
    const org = orgIn(c.norm) ?? consented[0];
    if (!org || !consented.includes(org)) return { msgs: [reply(`You haven’t agreed to share this video with ${org ? orgName(c.w, org) : 'anyone'}, so I won’t. ${consented.length ? `Your consent covers ${list(consented.map((o) => orgName(c.w, o)))}.` : 'It’s set to private practice.'} To add someone, delete it and add it again with them included.`, { kind: 'refusal' })] };
    let parts = partsIn(c.norm);
    if (/\b(all|everything|whole)\b/.test(c.norm) && !parts.length) parts = m.segments.map((s) => s.id);
    if (!parts.length) return { msgs: [reply(`Which parts? ${m.segments.map((s) => `${s.label} (${span(s.t, s.tEnd)})`).join(', ')}.`, { kind: 'question' })], frame: frame('share', { org }) };
    const names = m.segments.filter((s) => parts.includes(s.id)).map((s) => s.label.replace(' (confidential)', ''));
    const conf = parts.includes('s2');
    const not = m.segments.filter((s) => !parts.includes(s.id));
    return {
      msgs: [reply(`${orgName(c.w, org)} will see ${list(names.map((n) => n.toLowerCase()))}${not.length ? `, not ${list(not.map((s) => s.label.replace(' (confidential)', '').toLowerCase()))}` : ''}: ${fmt(m.segments.filter((s) => parts.includes(s.id)).reduce((a, s) => a + s.tEnd - s.t, 0))} of ${fmt(m.duration)}, with their transcript, until ${fmtDate(m.consent!.expires!)}.${conf ? ' Careful: the client dashboard part shows a client’s real numbers. Share it only if that client allows it.' : ` Anything not shared is never shown to them or used in their report.`}`, {
        kind: 'approval',
        actions: [{ label: conf ? `Share anyway, including the client part` : `Share ${parts.length === 1 ? 'this part' : `these ${parts.length} parts`} with ${orgName(c.w, org)}`, primary: !conf, act: { t: 'do', op: 'media.share', args: { id: m.id, org, parts } } },
          ...(conf ? [{ label: 'Leave the client part out', primary: true, act: { t: 'do', op: 'media.share', args: { id: m.id, org, parts: parts.filter((p) => p !== 's2') } } } as QAction] : []),
          { label: `What ${orgName(c.w, org)} will see`, act: { t: 'nav', to: '/c/passport?media=preview' } }],
      })],
      frame: frame('share', { org }),
    };
  },
  answer: (c) => {
    if (c.frame?.intent !== 'media.share' || !partsIn(c.norm).length) return null;
    const m = live(c.w, c.actor.personId!); if (!m) return null;
    const parts = partsIn(c.norm); const org = c.frame.slots.org;
    return { msgs: [reply(`${orgName(c.w, org)} will see ${list(m.segments.filter((s) => parts.includes(s.id)).map((s) => s.label.replace(' (confidential)', '').toLowerCase()))}. Share now?`, { kind: 'approval', actions: [{ label: `Share with ${orgName(c.w, org)}`, primary: true, act: { t: 'do', op: 'media.share', args: { id: m.id, org, parts } } }] })], frame: null };
  },
});

registerSkill({
  id: 'media.viewas', side: 'candidate',
  match: (c) => {
    if (!cand(c)) return 0;
    const m = live(c.w, c.actor.personId!);
    if (!/(what|how much|which).*(see|sees|seeing|view|visible|get)|preview|view as/.test(c.norm)) return 0;
    if (VIDEO.test(c.norm)) return 0.95;
    return m && ['REVIEW', 'READY'].includes(m.state) && orgIn(c.norm) && /\bwill\b/.test(c.norm) ? 0.93 : 0;
  },
  handle: (c) => {
    const m = live(c.w, c.actor.personId!);
    if (!m) return { msgs: [reply('You haven’t added a video yet, so no one sees one. Want to add one?', { actions: [{ label: 'Add a video', act: { t: 'say', text: 'add a video' } }] })] };
    const org = orgIn(c.norm) ?? m.consent?.orgs[0] ?? 'org_kora';
    const segs = m.state === 'READY' ? visibleSegments(c.w, m.id, org) : m.segments.filter((s) => s.sharedWith.includes(org));
    const hidden = m.segments.filter((s) => !segs.includes(s));
    const lines = m.transcript.filter((l) => segs.some((s) => l.t >= s.t && l.t < s.tEnd));
    return { msgs: [reply(segs.length ? `${orgName(c.w, org)} ${m.state === 'READY' ? 'sees' : 'will see'} ${segs.length} of ${m.segments.length} parts: ${list(segs.map((s) => `${s.label.replace(' (confidential)', '')} (${span(s.t, s.tEnd)})`))}, ${lines.length} transcript lines${lines.some((l) => l.edited) ? ' including your correction' : ''}, and Q’s findings matched to the role. ${hidden.length ? `Not ${list(hidden.map((s) => s.label.replace(' (confidential)', '').toLowerCase()))}: they see a gap marked “not shared”, never what’s in it.` : ''}${m.state === 'READY' ? '' : ' Nothing is shared until you press Share.'}` : `${orgName(c.w, org)} won’t see this video at all${m.state === 'READY' ? '' : ' yet: no part is chosen for them'}.`, {
      used: ['Your video’s sharing choices'], actions: [{ label: 'Open the preview', act: { t: 'nav', to: '/c/passport?media=preview' } }],
    })] };
  },
});

registerSkill({
  id: 'media.fix', side: 'candidate',
  match: (c) => (cand(c) && /\b(fix|correct|change|edit|update)\b/.test(c.norm) && (/\btranscript\b/.test(c.norm) || /\bat \d{1,2}:\d{2}\b/.test(c.norm)) && !!live(c.w, c.actor.personId!) ? 0.96 : 0),
  handle: (c) => {
    const m = live(c.w, c.actor.personId!)!;
    const tm = c.norm.match(/(\d{1,2}):(\d{2})/);
    const to = c.text.match(/\bto\s*[:“"']?\s*(.+?)[”"']?\s*$/i)?.[1]?.trim();
    if (!tm) return { msgs: [reply('Which time? Say it like “fix the transcript at 1:40 to …”.', { kind: 'question' })] };
    const t = Number(tm[1]) * 60 + Number(tm[2]);
    let idx = 0; m.transcript.forEach((l, k) => { if (l.t <= t) idx = k; });
    const line = m.transcript[idx];
    if (!line) return { msgs: [reply('There’s no transcript to correct yet.')] };
    if (!to) return { msgs: [reply(`At ${fmt(line.t)} I have: “${line.text}”. What should it say?`, { kind: 'question' })], frame: frame('fix', { idx: String(idx) }) };
    return {
      msgs: [reply(`Corrected the line at ${fmt(line.t)}. Before: “${line.text}” Now: “${to}”. It’s marked as corrected by you, and that’s what anyone you share with reads.`, { actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }] })],
      effects: (w, a) => { const before = editLine(w, m.id, idx, to, a); if (before !== null) (w.q.undo[a.id] ??= []).push({ id: `u_${Date.now()}`, label: 'the transcript correction', at: new Date().toISOString(), inverse: { op: 'media.edit', args: { id: m.id, idx, text: before, undo: false } } }); },
      frame: null,
    };
  },
  answer: (c) => {
    if (c.frame?.intent !== 'media.fix' || !c.frame.slots.idx) return null;
    const m = live(c.w, c.actor.personId!); if (!m) return null;
    const idx = Number(c.frame.slots.idx); const to = c.text.trim().replace(/^(it should say|make it|change it to|to)\s*/i, '');
    return { msgs: [reply(`Corrected the line at ${fmt(m.transcript[idx].t)} to “${to}”.`, { actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }] })], effects: (w, a) => { const before = editLine(w, m.id, idx, to, a); if (before !== null) (w.q.undo[a.id] ??= []).push({ id: `u_${Date.now()}`, label: 'the transcript correction', at: new Date().toISOString(), inverse: { op: 'media.edit', args: { id: m.id, idx, text: before, undo: false } } }); }, frame: null };
  },
});

registerSkill({
  id: 'media.revoke', side: 'candidate',
  match: (c) => (cand(c) && /\b(stop|end|revoke|unshare|withdraw|take back|no longer)\b/.test(c.norm) && (VIDEO.test(c.norm) || (/\b(it|sharing)\b/.test(c.norm) && c.frame?.intent?.startsWith('media.'))) && !!live(c.w, c.actor.personId!) ? 0.96 : 0),
  handle: (c) => {
    const m = live(c.w, c.actor.personId!)!;
    const orgs = [...new Set(m.segments.flatMap((s) => s.sharedWith))];
    if (m.state !== 'READY' || !orgs.length) return { msgs: [reply('The video isn’t shared with anyone right now, so there’s nothing to stop. Want to delete it instead?', { actions: [{ label: 'Delete it', act: { t: 'say', text: 'delete the video' } }] })], frame: frame('revoke') };
    return { msgs: [reply(`${list(orgs.map((o) => orgName(c.w, o)))} will no longer be able to play the video or read the transcript, straight away. ${KEEPS(c.w, orgs)}`, {
      kind: 'approval', actions: [{ label: `Stop sharing with ${list(orgs.map((o) => orgName(c.w, o)))}`, primary: true, act: { t: 'do', op: 'media.revoke', args: { id: m.id } } }, { label: 'Keep sharing', act: { t: 'say', text: 'keep it' } }],
    })], frame: frame('revoke') };
  },
});

registerSkill({
  id: 'media.delete', side: 'candidate',
  match: (c) => {
    if (!cand(c) || !/\b(delete|remove|erase|get rid of|bin)\b/.test(c.norm) || !live(c.w, c.actor.personId!)) return 0;
    if (VIDEO.test(c.norm)) return 0.96;
    return /\b(it|that)\b/.test(c.norm) && (c.frame?.intent?.startsWith('media.') || /video|walkthrough/i.test(c.lastQ?.text ?? '')) ? 0.96 : 0;
  },
  handle: (c) => {
    const m = live(c.w, c.actor.personId!)!;
    const orgs = [...new Set([...m.segments.flatMap((s) => s.sharedWith), ...(c.w.evidence.find((e) => e.evidenceId === m.evidenceId)?.revokedFrom ?? [])])];
    return { msgs: [reply(`This deletes “${m.title}”, its transcript, your corrections and its Passport entry. It can’t be undone. ${orgs.length ? KEEPS(c.w, orgs) : 'It was never shared, so no one else keeps anything.'}`, {
      kind: 'approval', actions: [{ label: 'Delete for good', primary: true, act: { t: 'do', op: 'media.delete', args: { id: m.id } } }, { label: 'Keep it', act: { t: 'say', text: 'keep it' } }],
    })], frame: frame('delete') };
  },
});

registerSkill({
  id: 'media.keep', side: 'candidate',
  match: (c) => (cand(c) && c.frame?.intent?.startsWith('media.') && /^(keep it|keep sharing|no|never mind|cancel)\b/.test(c.norm) ? 0.9 : 0),
  handle: () => ({ msgs: [reply('Okay, nothing changed.')], frame: null }),
});

// =====================================================================================================
// Recruiter
// =====================================================================================================
function personOf(c: QCtx) {
  return c.ents.people[0] ?? c.route.match(/people\/(p_\w+)/)?.[1] ?? c.frame?.slots.person ?? ms(c.w).items.find((m) => visibleSegments(c.w, m.id, c.actor.orgId!).length)?.ownerId;
}
function sharedItem(c: QCtx, pid?: string) {
  if (!pid) return undefined;
  return ms(c.w).items.filter((m) => m.ownerId === pid && visibleSegments(c.w, m.id, c.actor.orgId!).length).slice(-1)[0];
}
const first = (w: World, pid: string) => w.people.find((p) => p.personId === pid)?.name.split(' ')[0] ?? 'They';
const vidRoute = (pid: string, t?: number) => `/r/people/${pid}/video${t !== undefined ? `?t=${t}&play=1` : ''}`;
const none = (c: QCtx, pid?: string): QReply => ({ msgs: [reply(pid ? `${first(c.w, pid)} hasn’t shared a video or voice recording with you. You can ask in your messages; they can record, write it instead or ask for an adjustment.` : 'No candidate has shared a video with you yet.')] });

registerSkill({
  id: 'media.summary', side: 'recruiter',
  match: (c) => (rec(c) && /\b(summar\w*|recap|overview|tl ?dr|what (is|does|did)|tell me about|brief me)\b/.test(c.norm) && /\b(video|recording|walkthrough|walk-through|demo)\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    const pid = personOf(c); const m = sharedItem(c, pid);
    if (!m || !pid) return none(c, pid);
    const org = c.actor.orgId!;
    const segs = visibleSegments(c.w, m.id, org);
    const mandateId = roleFor(c.w, pid, org) ?? '';
    const cf = criteriaFor(c.w, mandateId);
    const r = ms(c.w).reviews.filter((x) => x.mediaId === m.id && x.orgId === org).sort((a, b) => b.v - a.v)[0];
    const view = r ? reportView(c.w, r) : null;
    const label = (id: string) => cf.crit.find((x) => x.id === id)?.label ?? id;
    const finds = view?.findings ?? [];
    const text = `${first(c.w, pid)} shared ${segs.length} of ${m.segments.length} parts (${fmt(segs.reduce((a, s) => a + s.tEnd - s.t, 0))} of ${fmt(m.duration)}): ${list(segs.map((s) => s.label.toLowerCase()))}. ${finds.length ? `It shows ${list(finds.map((f) => `${label(f.criterionId).toLowerCase()} (${f.moments.map((x) => fmt(x.t)).slice(0, 2).join(', ')})`))}.` : ''} ${view?.notShown.length ? `Not shown: ${list(view.notShown.map(label).map((s) => s.toLowerCase()))}, so not scored.` : ''} ${r ? (r.state === 'HUMAN_REVIEWED' ? 'You’ve reviewed it.' : 'Q’s draft, not reviewed by a person yet.') : 'Q will prepare the report when you open it.'}`;
    return { msgs: [reply(text.replace(/\s+/g, ' ').trim(), {
      used: ['Shared parts only', r ? `Rubric v${r.v}` : 'Role brief'],
      actions: [...finds.slice(0, 2).map((f) => ({ label: `Play ${fmt(f.moments[0].t)} · ${label(f.criterionId)}`, act: { t: 'nav', to: vidRoute(pid, f.moments[0].t) } } as QAction)), ...(r && r.state !== 'HUMAN_REVIEWED' ? [{ label: 'Mark the report reviewed', act: { t: 'say', text: 'mark the report reviewed' } } as QAction] : [])],
    })], nav: c.route.startsWith(`/r/people/${pid}/video`) ? undefined : { to: vidRoute(pid), label: `${first(c.w, pid)}’s video` }, frame: frame('report', { person: pid }) };
  },
});

function momentsFor(c: QCtx, pid: string, topic: Topic) {
  const m = sharedItem(c, pid); if (!m) return { m, hits: [] as { t: number; tEnd: number; text: string }[], hidden: false };
  const segs = visibleSegments(c.w, m.id, c.actor.orgId!);
  const all = KEY_MOMENTS[topic].moments;
  const hits = all.filter((x) => segs.some((s) => x.t >= s.t && x.t < s.tEnd)).map((x) => ({ ...x, text: m.transcript.find((l) => l.t === x.t)?.text ?? '' }));
  return { m, hits, hidden: !hits.length && all.length > 0 };
}
const TOPIC_WORD: Record<Topic, string> = { payments: 'reconciliation', go: 'Go', postgres: 'Postgres', incidents: 'incident handling', mentoring: 'mentoring', communication: 'explaining decisions', design: 'design trade-offs' };

registerSkill({
  id: 'media.where', side: 'recruiter',
  match: (c) => (rec(c) && /\b(where|when|which part|what part|at what point)\b/.test(c.norm) && /\b(show|shows|talk|talks|mention|mentions|explain|explains|demonstrat\w*|cover|covers|discuss\w*|do|does)\b/.test(c.norm) && !!topicIn(c.norm) && (VIDEO.test(c.norm) || /^\/r\/people\/p_\w+\/video/.test(c.route) || c.frame?.intent === 'media.report' || !!sharedItem(c, personOf(c))) ? 0.94 : 0),
  handle: (c) => {
    const pid = personOf(c); if (!pid) return none(c);
    const topic = topicIn(c.norm)!;
    const { m, hits } = momentsFor(c, pid, topic);
    if (!m) return none(c, pid);
    if (!hits.length) return { msgs: [reply(`${first(c.w, pid)} doesn’t show ${TOPIC_WORD[topic]} in the parts shared with you, so I can’t point to it, and it isn’t scored. Ask about it in the interview.`)] };
    return { msgs: [reply(`${first(c.w, pid)} shows ${TOPIC_WORD[topic]} at ${list(hits.map((x) => span(x.t, x.tEnd)))}. For example: “${hits[0].text}”`, {
      used: ['Shared parts only'], actions: hits.slice(0, 3).map((x) => ({ label: `Play ${fmt(x.t)}`, act: { t: 'nav', to: vidRoute(pid, x.t) } } as QAction)),
    })], frame: frame('report', { person: pid }) };
  },
});

registerSkill({
  id: 'media.play', side: 'recruiter',
  match: (c) => (rec(c) && /\b(play|jump to|skip to|go to|watch|start (it )?(at|from))\b/.test(c.norm) && (!!topicIn(c.norm) || /\d{1,2}:\d{2}/.test(c.norm)) && (VIDEO.test(c.norm) || /\bpart\b/.test(c.norm) || /^\/r\/people\/p_\w+\/video/.test(c.route) || c.frame?.intent === 'media.report') ? 0.95 : 0),
  handle: (c) => {
    const pid = personOf(c); if (!pid) return none(c);
    const tm = c.norm.match(/(\d{1,2}):(\d{2})/);
    const m = sharedItem(c, pid); if (!m) return none(c, pid);
    let t: number | undefined;
    if (tm) t = Number(tm[1]) * 60 + Number(tm[2]);
    else {
      const topic = topicIn(c.norm)!;
      const seg = m.segments.find((s) => new RegExp(topic === 'payments' ? 'reconcil|payment' : topic === 'postgres' ? 'postgres' : topic === 'incidents' ? 'dashboard' : '^$', 'i').test(s.label));
      const vis = visibleSegments(c.w, m.id, c.actor.orgId!);
      if (seg && vis.some((s) => s.id === seg.id)) t = seg.t;
      else { const { hits } = momentsFor(c, pid, topic); t = hits[0]?.t; }
      if (t === undefined) return { msgs: [reply(`That part isn’t in what ${first(c.w, pid)} shared with you, so I can’t play or describe it.`)] };
    }
    const vis = visibleSegments(c.w, m.id, c.actor.orgId!);
    if (!vis.some((s) => t! >= s.t && t! < s.tEnd)) return { msgs: [reply(`${fmt(t)} is in a part ${first(c.w, pid)} didn’t share with you, so I can’t play it. The shared parts are ${list(vis.map((s) => `${s.label.toLowerCase()} (${span(s.t, s.tEnd)})`))}.`)] };
    const s = vis.find((x) => t! >= x.t && t! < x.tEnd)!;
    return { msgs: [reply(`Playing ${s.label.toLowerCase()} from ${fmt(t)}.`)], nav: { to: vidRoute(pid, t), label: `${first(c.w, pid)}’s video` }, frame: frame('report', { person: pid }) };
  },
});

registerSkill({
  id: 'media.reviewed', side: 'recruiter',
  match: (c) => (rec(c) && /\b(mark|set|flag)\b.*\b(reviewed|checked|done|looked at)\b|\bi (have )?(reviewed|checked) (the|his|her|their) (report|video|findings)\b/.test(c.norm) && (/\b(report|video|findings|evidence)\b/.test(c.norm)) ? 0.94 : 0),
  handle: (c) => {
    const pid = personOf(c); const m = sharedItem(c, pid);
    if (!m || !pid) return none(c, pid);
    const org = c.actor.orgId!;
    const r = ms(c.w).reviews.filter((x) => x.mediaId === m.id && x.orgId === org).sort((a, b) => b.v - a.v)[0];
    if (!r) return { msgs: [reply('Q hasn’t prepared the report yet. Open it first, then mark it reviewed.', { actions: [{ label: 'Open the report', act: { t: 'nav', to: vidRoute(pid) } }] })] };
    if (r.state === 'HUMAN_REVIEWED') return { msgs: [reply(`Already reviewed by ${c.w.actors.find((a) => a.id === r.reviewedBy)?.first ?? 'someone on your team'}.`)] };
    const n = reportView(c.w, r).findings.length;
    return { msgs: [reply(`Marked ${first(c.w, pid)}’s video report as reviewed by you: ${n} finding${n === 1 ? '' : 's'}, with their ratings now shown as reviewed on the scorecard. Recorded in the audit log.`, { actions: [{ label: 'Undo', act: { t: 'do', op: 'undo' } }] })],
      effects: (w, a) => { const rr = ms(w).reviews.find((x) => x.id === r.id); if (rr) { markReviewed(w, rr, a); (w.q.undo[a.id] ??= []).push({ id: `u_${Date.now()}`, label: 'marking the report reviewed', at: new Date().toISOString(), inverse: { op: 'media.unreview', args: { id: r.id } } }); } },
      frame: frame('report', { person: pid }) };
  },
});

/** Fallback for "lower postgres to 2, the tuning was on synthetic data" on the video page. The RUBRIC area's own
 *  scorecard skill (if registered with a higher score) wins; both write the same Rating record with a reason. */
registerSkill({
  id: 'media.override', side: 'recruiter',
  match: (c) => (rec(c) && /\b(lower|raise|change|set|drop|bump|move|reduce|increase|make)\b/.test(c.norm) && /\b(to|=)\s*[0-4]\b/.test(c.norm) && !!topicIn(c.norm) && (/^\/r\/people\/p_\w+\/video/.test(c.route) || c.frame?.intent === 'media.report') ? 0.6 : 0),
  handle: (c) => {
    const pid = personOf(c); const m = sharedItem(c, pid);
    if (!m || !pid) return none(c, pid);
    const org = c.actor.orgId!;
    const r = ms(c.w).reviews.filter((x) => x.mediaId === m.id && x.orgId === org).sort((a, b) => b.v - a.v)[0];
    const topic = topicIn(c.norm)!;
    const cf = criteriaFor(c.w, roleFor(c.w, pid, org) ?? '');
    const crit = cf.crit.find((x) => topicOf(x) === topic);
    if (!r || r.rubricId === 'brief' || !crit) return { msgs: [reply('There’s no rubric rating for that yet. Ratings exist once a rubric is approved and the report is prepared.')] };
    const rt = ratingFor(c.w, r, crit.id);
    if (!rt) return { msgs: [reply(`I didn’t rate ${crit.label} from this video, because it isn’t shown in the shared parts.`)] };
    const to = Number(c.norm.match(/\b(?:to|=)\s*([0-4])\b/)![1]);
    const reason = c.text.split(/,|;|\bbecause\b|\bas\b|\bsince\b| - /i).slice(1).join(',').trim();
    if (!reason) return { msgs: [reply(`Why change ${crit.label} from ${rt.rating} to ${to}? A reason is recorded with every change.`, { kind: 'question' })], frame: frame('override', { person: pid, crit: crit.id, to: String(to), review: r.id }) };
    return { msgs: [reply(`Changed ${crit.label} for ${first(c.w, pid)} from ${rt.rating} to ${to}: “${reason}”. Q’s proposal stays visible beside it, and the change is in the audit log.`, { actions: [{ label: 'See the scorecard', act: { t: 'nav', to: `/r/people/${pid}` } }] })],
      effects: (w, a) => { const rr = ms(w).reviews.find((x) => x.id === r.id); if (rr) overrideRating(w, rr, crit.id, to, reason, a); } };
  },
  answer: (c) => {
    if (c.frame?.intent !== 'media.override') return null;
    const { crit, to, review, person } = c.frame.slots;
    const reason = c.text.trim(); if (reason.length < 3) return null;
    return { msgs: [reply(`Changed it to ${to}: “${reason}”. Recorded in the audit log.`)], effects: (w, a) => { const rr = ms(w).reviews.find((x) => x.id === review); if (rr) overrideRating(w, rr, crit, Number(to), reason, a); }, frame: frame('report', { person }) };
  },
});
