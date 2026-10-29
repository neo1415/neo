// Q skills for hiring campaigns (audit addendum §D, AD-D-07): create, name, organise, summarise and navigate
// campaigns in ordinary language, keeping context ("archive it" means the campaign we were just talking about).
// Every change is audited (journeys/campaigns/model.ts emits campaign.* events) and undoable where it makes sense.
// Agency: Dele's outreach campaigns are a different thing (q/skills/agency.ts). These skills only claim an agency
// turn when it is clearly about a *hiring* campaign: the words "hiring campaign", a hiring campaign's name, or the
// /r/campaigns pages. A client campaign only ever holds that client's roles.
import { emit, uid, type World } from '../../mock/world';
import type { Actor, HiringCampaign, QAction, QFrame } from '../../state/domain';
import { appendQ, pushUndo, registerOp, registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import { campaigns, campaignsMut } from '../../state/areas/campaigns';
import {
  CP, addRole, campaignIn, canManage, createCampaign, forMe, isAgencyActor, isClosed, lensOf, nextActions, reqOf, reqsFor, removeRole, rename, roleIn, saveFilter, scopeFor, setStatus,
  stageCounts, visibleCampaigns, dueText, messagesFor,
} from '../../journeys/campaigns/model';
import { clientName, clientsIn, setFocus } from '../../journeys/agency/model';

const CAMPAIGN = /\bcampaigns?\b/;
const HIRING = /\bhiring campaigns?\b/;
const ROUTE_ID = (route: string) => route.match(/^\/r\/campaigns\/([^/?]+)/)?.[1];
const UI_KEY = (a: Actor) => `${a.id}|campaigns`;
const say = (text: string): QReply => ({ msgs: [{ kind: 'reply', text }] });
const ask = (label: string, text = label): QAction => ({ label, act: { t: 'say', text } });
const nav = (label: string, to: string, primary = false): QAction => ({ label, primary, act: { t: 'nav', to } });
const op = (label: string, name: string, args: Record<string, unknown>, primary = false): QAction => ({ label, primary, act: { t: 'do', op: name, args } });
const card = (id: string) => ({ type: 'campaigns.card', id });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const now = () => new Date().toISOString();

/** Remember which campaign we're talking about, so "it" resolves on the next turn (context, AD-D-07). */
const focusFx = (id: string) => (w: World, a: Actor) => { w.q.ui[UI_KEY(a)] = { ...(w.q.ui[UI_KEY(a)] ?? {}), focus: id, at: now() }; };
const focused = (c: QCtx) => c.w.q.ui[UI_KEY(c.actor)]?.focus as string | undefined;
const isAgency = (c: QCtx) => isAgencyActor(c.w, c.actor);
/** Is this turn about a hiring campaign at all? (Agency staff: only when it can't be an outreach campaign.) */
function hiringTurn(c: QCtx): boolean {
  if (c.actor.side !== 'recruiter' || !c.actor.orgId) return false;
  const onPage = c.route === CP.list || !!ROUTE_ID(c.route);
  if (!isAgency(c)) return CAMPAIGN.test(c.norm) || onPage;
  return HIRING.test(c.norm) || onPage || (CAMPAIGN.test(c.norm) && !!campaignIn(c.w, c.actor, c.norm));
}
/** The campaign a turn refers to: named, else the page you're on, else the one we just talked about. */
function target(c: QCtx): HiringCampaign | undefined {
  const named = campaignIn(c.w, c.actor, c.norm);
  if (named) return named;
  const vis = visibleCampaigns(c.w, c.actor);
  const pid = ROUTE_ID(c.route); const onPage = pid && vis.find((x) => x.id === pid);
  if (onPage) return onPage;
  const f = focused(c); return f ? vis.find((x) => x.id === f) : undefined;
}
const IT = /\b(it|this|this one|that one|that campaign|this campaign|the campaign)\b/;
const which = (c: QCtx, verb: string): QReply => {
  const vis = visibleCampaigns(c.w, c.actor);
  return { msgs: [{ kind: 'question', text: vis.length ? `Which campaign should I ${verb}?` : 'There are no campaigns yet. Want me to create one?', actions: vis.length ? vis.slice(0, 4).map((x) => ask(x.name, `${verb} ${x.name}`)) : [ask('Create a campaign', 'create a campaign')] }] };
};
const noPerm = (c: QCtx, what: string): QReply => ({ msgs: [{ kind: 'refusal', text: `You’re ${c.actor.role === 'VIEWER' ? 'a viewer' : `an ${c.actor.role?.toLowerCase().replace('_', ' ')}`} here, so you can read campaigns but not ${what}. A recruiter, hiring manager or admin can. I can tell the campaign owner what you need.`, why: 'Organising roles changes what the team sees, so it needs a recruiting role' }] });

// =========================================== Create ===========================================
const CREATE = /\b(create|start|set up|setup|make|new|open|begin|spin up)\b(?:\s+\w+){0,4}?\s+(hiring\s+)?campaign\b/;
function nameFrom(text: string): string | undefined {
  const m = text.match(/\b(?:called|named|name it|titled)\s+["“']?(.+?)["”']?\s*(?:[.!?]|$|\bwith\b|\bfor the\b|\band add\b)/i);
  const n = m?.[1]?.trim().replace(/^the\s+/i, '');
  return n && n.length >= 2 ? n.replace(/\b\w/g, (x) => x.toUpperCase()).replace(/\bQ(\d)\b/gi, 'Q$1').slice(0, 80) : undefined;
}
registerSkill({
  id: 'campaigns.create', side: 'recruiter',
  match: (c) => (hiringTurn(c) && CREATE.test(c.norm) && !/\b(outreach|message the pool|email the pool)\b/.test(c.norm) ? 0.95 : 0),
  handle: (c) => {
    if (!canManage(c.actor)) return noPerm(c, 'create them');
    const client = isAgency(c) ? (clientsIn(c.norm)[0] ?? lensOf(c.w, c.actor)) : undefined;
    const name = nameFrom(c.text);
    if (!name) return { msgs: [{ kind: 'question', text: `What should the campaign be called? A short name the team will recognise, like “Q1 Engineering”.${client ? ` It will be for ${clientName(c.w, client)} only.` : ''}` }], frame: { intent: 'campaigns.create', awaiting: 'name', slots: client ? { client } : {}, startedAt: now() } };
    return created(c, name, client);
  },
  answer: (c) => {
    const f = c.frame as QFrame;
    if (f.awaiting !== 'name') return null;
    if (c.ents.no) return { msgs: [{ kind: 'reply', text: 'Okay, no campaign created.' }], frame: null };
    if (CAMPAIGN.test(c.norm) && !CREATE.test(c.norm) && c.norm.split(' ').length > 5) return null;
    const name = nameFrom(c.text) ?? c.text.trim().replace(/^["“']|["”'.]$/g, '').slice(0, 80);
    if (!name) return null;
    return { ...created(c, name.replace(/^\w/, (x) => x.toUpperCase()), f.slots.client), frame: null };
  },
});
function created(c: QCtx, name: string, client?: string): QReply {
  const dup = visibleCampaigns(c.w, c.actor).find((x) => x.name.toLowerCase() === name.toLowerCase() && (!client || x.clientOrgId === client));
  if (dup) return { msgs: [{ kind: 'reply', text: `There’s already a campaign called “${dup.name}”. I’ve opened it rather than making a second one.`, ref: card(dup.id) }], effects: focusFx(dup.id), nav: { to: CP.one(dup.id), label: dup.name } };
  const id = uid('c');
  const loose = reqsFor(c.w, c.actor.orgId!, client).filter((r) => !isClosed(r) && !campaigns(c.w).list.some((x) => x.roles.includes(r.id)));
  return {
    msgs: [{ kind: 'reply', text: `Created “${name}”${client ? ` for ${clientName(c.w, client)}` : ''}, owned by you. It has no roles yet.${loose.length ? ` Not in any campaign yet: ${loose.map((r) => r.title).join(', ')}.` : ''}`,
      ref: card(id), actions: [...loose.slice(0, 2).map((r) => ask(`Add ${r.title}`, `add the ${r.title} role to ${name}`)), op('Undo', 'undo', {})] }],
    effects: (w, a) => {
      createCampaign(w, a, name, client, '', id);
      if (client) setFocus(w, a.id, client);
      focusFx(id)(w, a);
      pushUndo(w, a.id, `create “${name}”`, 'campaigns.delete', { id });
    },
    nav: { to: CP.one(id), label: name },
  };
}

// =========================================== Add / move / remove a role ===========================================
const ADD = /\b(add|put|move|include|attach|bring|assign|file)\b/;
const REMOVE = /\b(remove|take|drop|pull)\b.*\b(out of|from|off)\b/;
registerSkill({
  id: 'campaigns.role', side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId || c.actor.side !== 'recruiter') return 0;
    const about = hiringTurn(c) || (!!focused(c) && IT.test(c.norm) && !isAgency(c));
    if (!about || !(ADD.test(c.norm) || REMOVE.test(c.norm))) return 0;
    // "put this in the Q4 campaign" on a thread (no role named) is message routing, owned by the email area.
    const reqs = reqsFor(c.w, c.actor.orgId, lensOf(c.w, c.actor));
    const all = isAgency(c) ? [...reqsFor(c.w, c.actor.orgId, 'org_kora'), ...reqsFor(c.w, c.actor.orgId, 'org_medlink')] : reqs;
    if (!roleIn(c.w, all, c.norm) && !/\b(a|the|another) role\b/.test(c.norm)) return 0;
    if (/\b(this|thread|message|conversation|tobi|him|her)\b/.test(c.norm) && !/\brole\b/.test(c.norm)) return 0;
    return 0.95;
  },
  handle: (c) => {
    if (!canManage(c.actor)) return noPerm(c, 'change which roles are in them');
    const k = target(c);
    if (!k) return which(c, REMOVE.test(c.norm) ? 'take the role out of' : 'add the role to');
    const lens = k.clientOrgId;
    const pool = isAgency(c) ? [...reqsFor(c.w, c.actor.orgId!, 'org_kora'), ...reqsFor(c.w, c.actor.orgId!, 'org_medlink')] : reqsFor(c.w, c.actor.orgId!);
    const r = roleIn(c.w, pool.filter((x) => !REMOVE.test(c.norm) || k.roles.includes(x.id)), c.norm);
    if (!r) {
      const free = reqsFor(c.w, c.actor.orgId!, lens).filter((x) => !k.roles.includes(x.id) && !isClosed(x));
      return { msgs: [{ kind: 'question', text: `Which role should go into “${k.name}”?`, actions: free.slice(0, 4).map((x) => ask(x.title, `add the ${x.title} role to ${k.name}`)) }], effects: focusFx(k.id) };
    }
    if (REMOVE.test(c.norm)) {
      return { msgs: [{ kind: 'reply', text: `Took ${r.title} out of “${k.name}”. The role, its people and its messages are unchanged.`, actions: [op('Undo', 'undo', {})], ref: card(k.id) }],
        effects: (w, a) => { removeRole(w, a, k.id, r.id); focusFx(k.id)(w, a); pushUndo(w, a.id, `take ${r.title} out of “${k.name}”`, 'campaigns.role.add', { cid: k.id, rid: r.id, quiet: true }); } };
    }
    return addReply(c, k, r.id, /\bmove\b/.test(c.norm));
  },
});
function addReply(c: QCtx, k: HiringCampaign, rid: string, move: boolean): QReply {
  // Dry run on a copy so the reply describes exactly what will happen.
  const probe = structuredClone(c.w); const res = addRole(probe, c.actor, k.id, rid, move);
  const r = reqOf(c.w, rid)!;
  if (!res.ok) {
    if (res.code === 'CONFLICT') return { msgs: [{ kind: 'question', text: `${res.text} Move it into “${k.name}”?`, why: 'A role points to one campaign, so its counts and messages are never counted twice',
      actions: [op(`Move it to ${k.name}`, 'campaigns.role.add', { cid: k.id, rid, move: true, say: true }, true), ask(`Keep it in ${res.other!.name}`, 'leave it where it is')] }], effects: focusFx(k.id) };
    if (res.code === 'CLIENT') return { msgs: [{ kind: 'refusal', text: res.text, why: 'Tenant isolation: one client’s roles never sit in another client’s campaign' }], effects: (w, a) => emit(w, a.id, 'campaign.role.declined', scopeFor(k), `Q declined adding ${r.title} to “${k.name}” (different client).`, { campaignId: k.id }) };
    if (res.code === 'CLOSED') return { msgs: [{ kind: 'refusal', text: res.text, actions: [nav('Open the role', r.href)] }], effects: focusFx(k.id) };
    if (res.code === 'ARCHIVED') return { msgs: [{ kind: 'reply', text: res.text, actions: [op('Re-open it', 'campaigns.reopen', { id: k.id }, true)] }], effects: focusFx(k.id) };
    return { msgs: [{ kind: 'reply', text: res.text, ref: card(k.id) }], effects: focusFx(k.id) };
  }
  return { msgs: [{ kind: 'reply', text: `${res.text} Its people, messages and interviews now count towards the campaign; nothing was copied.`, ref: card(k.id), actions: [op('Undo', 'undo', {})] }],
    effects: (w, a) => { const from = campaigns(w).list.find((x) => x.id !== k.id && x.roles.includes(rid)); addRole(w, a, k.id, rid, move); focusFx(k.id)(w, a); pushUndo(w, a.id, `add ${r.title} to “${k.name}”`, 'campaigns.role.undo-add', { cid: k.id, rid, from: from?.id }); } };
}
registerSkill({
  id: 'campaigns.keep', side: 'recruiter',
  match: (c) => (c.lastQ?.text.includes('A role belongs to one campaign') && /\b(leave it|keep it|no|never mind)\b/.test(c.norm) ? 0.9 : 0),
  handle: () => say('Okay, it stays where it is. Nothing changed.'),
});

// =========================================== Summarise / what needs me ===========================================
registerSkill({
  id: 'campaigns.summary', side: 'recruiter',
  match: (c) => (hiringTurn(c) && /\b(summar\w*|overview|how is|how are|how s|status|update on|catch me up|where are we|progress)\b/.test(c.norm) && (CAMPAIGN.test(c.norm) || !!ROUTE_ID(c.route) || (!!focused(c) && IT.test(c.norm))) ? 0.95 : 0),
  handle: (c) => {
    const k = target(c); if (!k) return which(c, 'summarise');
    return { msgs: [{ kind: 'reply', text: summary(c.w, c.actor, k), ref: card(k.id), used: ['Pipeline', 'Messages', 'Interviews', 'Rubrics'], actions: ROUTE_ID(c.route) === k.id ? [ask('What needs me here?', 'what needs me in this campaign')] : [nav('Open the campaign', CP.one(k.id), true), ask('What needs me?', 'what needs me in this campaign')] }], effects: focusFx(k.id) };
  },
});
export function summary(w: World, a: Actor, k: HiringCampaign): string {
  if (!k.roles.length) return `“${k.name}” has no roles yet${k.deadline ? `; its deadline is ${dueText(w, k.deadline)}` : ''}.`;
  const parts = k.roles.map((rid) => {
    const r = reqOf(w, rid); if (!r) return '';
    const sc = stageCounts(w, rid, a.orgId!); const mm = messagesFor(w, a.orgId!, rid, k.id);
    if (r.status === 'DRAFT' && !sc.inPlay) return `${r.title}: the brief is still a draft, so nobody is searched yet`;
    const at = (['INTERVIEW', 'OFFER', 'SHORTLISTED', 'REPLIED'] as const).filter((s) => sc.counts[s]).map((s) => `${sc.counts[s]} ${s === 'INTERVIEW' ? 'at interview' : s === 'OFFER' ? 'at offer' : s.toLowerCase()}`);
    return `${r.title}: ${sc.inPlay} in play${at.length ? ` (${at.join(', ')})` : ''}${mm.awaitingReply.length ? `, ${plural(new Set(mm.awaitingReply.map((t) => t.personId)).size, 'person', 'people')} waiting for a reply` : ''}${r.status === 'DRAFT' ? '; the brief is still a draft' : ''}`;
  }).filter(Boolean);
  const acts = nextActions(w, k); const mine = forMe(acts, a).length; const appr = acts.filter((x) => x.approval).length;
  return `${k.name}${k.status === 'ARCHIVED' ? ' (archived)' : ''}. ${parts.join('. ')}. ${appr ? `${plural(appr, 'approval')} waiting` : 'No approvals waiting'}${mine ? `, ${mine} for you` : ''}. Deadline ${dueText(w, k.deadline)}.`;
}
registerSkill({
  id: 'campaigns.needs', side: 'recruiter',
  match: (c) => (hiringTurn(c) && /\b(what needs me|needs me|needs my attention|what do i need to do|what should i do next|what is waiting (on|for) me|anything for me|my next actions?)\b/.test(c.norm) && (CAMPAIGN.test(c.norm) || !!ROUTE_ID(c.route)) ? 0.97 : 0),
  handle: (c) => {
    const k = target(c); if (!k) return which(c, 'check');
    const acts = nextActions(c.w, k); const mine = forMe(acts, c.actor);
    const go = (x: (typeof acts)[number]): QAction => (x.go.to ? nav(x.go.label, x.go.to) : x.go.op ? op(x.go.label, x.go.op.name, x.go.op.args) : ask(x.go.label, x.go.say!));
    if (!mine.length) return { msgs: [{ kind: 'reply', text: `Nothing in “${k.name}” is waiting on you.${acts.length ? ` ${plural(acts.length, 'thing')} ${acts.length === 1 ? 'is' : 'are'} with others: ${acts.slice(0, 2).map((x) => x.text).join('; ')}.` : ''}` }], effects: focusFx(k.id) };
    return { msgs: [{ kind: 'reply', text: `In “${k.name}”, ${plural(mine.length, 'thing')} need${mine.length === 1 ? 's' : ''} you:\n${mine.slice(0, 5).map((x, i) => `${i + 1}. ${x.text}`).join('\n')}`, actions: mine.map(go).filter((x, i, all) => all.findIndex((y) => y.label === x.label) === i).slice(0, 3).map((x, i) => ({ ...x, primary: i === 0 })), used: ['Pipeline', 'Messages', 'Interviews', 'Briefs and rubrics'] }], effects: focusFx(k.id) };
  },
});

// =========================================== Open / list ===========================================
registerSkill({
  id: 'campaigns.open', side: 'recruiter',
  match: (c) => (hiringTurn(c) && CAMPAIGN.test(c.norm) && /\b(show|open|go to|take me|see|view|bring up|list|where is|where are|pull up)\b/.test(c.norm) && !CREATE.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    const all = /\b(my|our|all|the|every)\s+(hiring\s+)?campaigns\b/.test(c.norm) && !campaignIn(c.w, c.actor, c.norm);
    const k = all ? undefined : campaignIn(c.w, c.actor, c.norm) ?? (IT.test(c.norm) ? target(c) : undefined);
    if (!k) { const vis = visibleCampaigns(c.w, c.actor).filter((x) => x.status !== 'ARCHIVED'); return { msgs: [{ kind: 'reply', text: vis.length ? `Your ${isAgency(c) ? `${clientName(c.w, lensOf(c.w, c.actor)!)} ` : ''}campaigns: ${vis.map((x) => x.name).join(', ')}.` : 'There are no campaigns yet.' }], nav: { to: CP.list, label: 'hiring campaigns' } }; }
    if (ROUTE_ID(c.route) === k.id) return { msgs: [{ kind: 'reply', text: summary(c.w, c.actor, k), ref: card(k.id) }], effects: focusFx(k.id) };
    return { msgs: [{ kind: 'reply', text: `Opening “${k.name}”.`, ref: card(k.id) }], effects: (w, a) => { focusFx(k.id)(w, a); if (k.clientOrgId) setFocus(w, a.id, k.clientOrgId); }, nav: { to: CP.one(k.id), label: k.name } };
  },
});

// =========================================== Archive / re-open / rename ===========================================
registerSkill({
  id: 'campaigns.archive', side: 'recruiter',
  match: (c) => {
    if (!c.actor.orgId || c.actor.side !== 'recruiter') return 0;
    const about = hiringTurn(c) || (!!focused(c) && IT.test(c.norm));
    return about && /\b(archive|unarchive|re-?open|reactivate|restore|bring back|pause|resume)\b/.test(c.norm) && !/\b(search|agents?|runs?|outreach)\b/.test(c.norm) ? 0.94 : 0;
  },
  handle: (c) => {
    if (!canManage(c.actor)) return noPerm(c, 'archive or re-open them');
    const k = target(c); if (!k) return which(c, /re-?open|unarchive|restore|bring back/.test(c.norm) ? 're-open' : 'archive');
    const reopen = /\b(unarchive|re-?open|reactivate|restore|bring back|resume)\b/.test(c.norm);
    const pause = /\bpause\b/.test(c.norm);
    if (reopen) {
      if (k.status === 'ACTIVE') return { msgs: [{ kind: 'reply', text: `“${k.name}” is already active.` }], effects: focusFx(k.id) };
      return { msgs: [{ kind: 'reply', text: `Re-opened “${k.name}”. It’s back on your active list with its ${plural(k.roles.length, 'role')}.`, ref: card(k.id), actions: [op('Undo', 'undo', {})] }],
        effects: (w, a) => { const was = k.status; setStatus(w, a, k.id, 'ACTIVE'); focusFx(k.id)(w, a); pushUndo(w, a.id, `re-open “${k.name}”`, 'campaigns.status', { id: k.id, status: was }); } };
    }
    if (k.status === 'ARCHIVED') return { msgs: [{ kind: 'reply', text: `“${k.name}” is already archived.`, actions: [op('Re-open it', 'campaigns.reopen', { id: k.id })] }], effects: focusFx(k.id) };
    const open = k.roles.map((rid) => reqOf(c.w, rid)).filter((r) => r && !isClosed(r));
    const status = pause ? 'PAUSED' : 'ARCHIVED';
    return {
      msgs: [{ kind: 'reply', text: `${pause ? 'Paused' : 'Archived'} “${k.name}”.${open.length ? ` Its ${plural(open.length, 'open role')} (${open.map((r) => r!.title).join(', ')}) carry on as they are: nothing was closed, withdrawn or sent.` : ''} It’s in the history, and you can undo it.`,
        actions: [op('Undo', 'undo', {}), nav('All campaigns', CP.list)], why: 'A campaign only groups roles; archiving never changes a role or a candidate' }],
      effects: (w, a) => { setStatus(w, a, k.id, status); focusFx(k.id)(w, a); pushUndo(w, a.id, `${pause ? 'pause' : 'archive'} “${k.name}”`, 'campaigns.status', { id: k.id, status: k.status }); },
    };
  },
});
registerSkill({
  id: 'campaigns.rename', side: 'recruiter',
  match: (c) => (c.actor.orgId && (hiringTurn(c) || (!!focused(c) && IT.test(c.norm))) && /\b(rename|call it|change the name)\b/.test(c.norm) ? 0.94 : 0),
  handle: (c) => {
    if (!canManage(c.actor)) return noPerm(c, 'rename them');
    const name = c.text.match(/\b(?:to|as|call it)\s+["“']?(.+?)["”']?\s*[.!?]?$/i)?.[1]?.trim();
    const k = target(c) ?? (focused(c) ? campaigns(c.w).list.find((x) => x.id === focused(c)) : undefined);
    if (!k) return which(c, 'rename');
    if (!name) return say(`What should “${k.name}” be called instead?`);
    return { msgs: [{ kind: 'reply', text: `Renamed “${k.name}” to “${name}”.`, actions: [op('Undo', 'undo', {})] }], effects: (w, a) => { rename(w, a, k.id, name); focusFx(k.id)(w, a); pushUndo(w, a.id, `rename to “${name}”`, 'campaigns.rename', { id: k.id, name: k.name }); } };
  },
});
registerSkill({
  id: 'campaigns.explain', side: 'recruiter',
  match: (c) => (c.actor.orgId && /\b(difference|different|vs|versus|what is a)\b/.test(c.norm) && /\bcampaign/.test(c.norm) && /\b(outreach|hiring)\b/.test(c.norm) ? 0.95 : 0),
  handle: () => say('A hiring campaign groups roles, like “Q4 Engineering”, so you can see their people, messages, interviews and decisions together. An outreach campaign is narrower: it messages one talent pool about one role, within limits you approve. Outreach runs sit under a role, and the role sits in a hiring campaign.'),
});

// =========================================== Ops (buttons on the pages, chips, undo inverses) ===========================================
registerOp('campaigns.role.add', (w, a, actor) => {
  const from = campaigns(w).list.find((x) => x.id !== a.cid && x.roles.includes(String(a.rid)))?.id;
  const r = addRole(w, actor, String(a.cid), String(a.rid), !!a.move);
  if (r.ok && !a.quiet) pushUndo(w, actor.id, `add ${reqOf(w, String(a.rid))?.title ?? 'the role'}`, 'campaigns.role.undo-add', { cid: a.cid, rid: a.rid, from });
  if (a.quiet) return;
  return { say: r.text };
});
registerOp('campaigns.role.remove', (w, a, actor) => { const r = removeRole(w, actor, String(a.cid), String(a.rid)); if (r.ok) pushUndo(w, actor.id, `take ${reqOf(w, String(a.rid))?.title ?? 'the role'} out`, 'campaigns.role.add', { cid: a.cid, rid: a.rid, quiet: true }); return { say: r.text }; });
registerOp('campaigns.role.remove.quiet', (w, a, actor) => { removeRole(w, actor, String(a.cid), String(a.rid)); });
/** Undo of an add that may have been a move: put the role back where it came from. */
registerOp('campaigns.role.undo-add', (w, a, actor) => { removeRole(w, actor, String(a.cid), String(a.rid)); if (a.from) addRole(w, actor, String(a.from), String(a.rid)); return { nav: { to: CP.one(String(a.cid)), label: 'the campaign' } }; });
registerOp('campaigns.status', (w, a, actor) => { setStatus(w, actor, String(a.id), a.status as HiringCampaign['status']); return { nav: { to: CP.one(String(a.id)), label: 'the campaign' } }; });
registerOp('campaigns.archive', (w, a, actor) => {
  const k = campaigns(w).list.find((x) => x.id === a.id); if (!k) return;
  const was = k.status; setStatus(w, actor, k.id, 'ARCHIVED'); pushUndo(w, actor.id, `archive “${k.name}”`, 'campaigns.status', { id: k.id, status: was });
  appendQ(w, actor.id, { who: 'q', kind: 'reply', engine: 'rules', text: `Archived “${k.name}”. Its roles carry on; nothing was closed or sent.`, actions: [op('Undo', 'undo', {})] });
});
registerOp('campaigns.reopen', (w, a, actor) => { const k = campaigns(w).list.find((x) => x.id === a.id); if (!k) return; const was = k.status; setStatus(w, actor, k.id, 'ACTIVE'); pushUndo(w, actor.id, `re-open “${k.name}”`, 'campaigns.status', { id: k.id, status: was }); return { say: `Re-opened “${k.name}”.` }; });
registerOp('campaigns.rename', (w, a, actor) => { rename(w, actor, String(a.id), String(a.name)); });
registerOp('campaigns.delete', (w, a, actor) => {
  const s = campaignsMut(w); const k = s.list.find((x) => x.id === a.id); if (!k) return;
  if (k.roles.length) return { say: `“${k.name}” already has roles, so I won’t delete it. Archive it instead if you don’t need it.` };
  s.list = s.list.filter((x) => x.id !== a.id);
  emit(w, actor.id, 'campaign.deleted', scopeFor(k), `${actor.name} undid creating “${k.name}”.`, { campaignId: k.id });
  return { nav: { to: CP.list, label: 'hiring campaigns' } };
});
registerOp('campaigns.filter.save', (w, a, actor) => { saveFilter(w, actor, String(a.cid), String(a.label), String(a.query)); return { say: `Saved the filter “${String(a.label)}”. It’s on this campaign for everyone on the team.` }; });
/** Open a candidate's conversation in the one messages hub (no second inbox). */
registerOp('campaigns.thread', (w, a, actor) => { const k = `${actor.id}|/r/messages`; w.q.ui[k] = { ...(w.q.ui[k] ?? {}), sel: String(a.pid), filter: 'all' }; return { nav: { to: '/r/messages', label: 'messages' } }; });
