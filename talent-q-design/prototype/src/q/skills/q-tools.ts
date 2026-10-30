// Q-TOOLS skills: Q makes artifacts when asked (charts, maps, diagrams, narrated explainers), opens allowed public
// pages read-only, downloads files through a scan, lists its sources, shows disagreeing sources side by side, speaks
// its answer with captions and stops the moment it's interrupted, and hands a task to the person's phone.
// Matchers are deliberately narrow (specific verbs plus objects) so they never claim another area's sentences
// ("map the steps first", "process map", "upload my care certificate", "resume medlink" all stay elsewhere).
import { registerSkill } from '../core/engine';
import type { QCtx, QReply } from '../core/types';
import type { QAction } from '../../state/domain';
import { uid } from '../../mock/world';
import { qt, qtw } from '../../state/areas/q-tools';
import { artOf, conflictDecision, latestVoice, makeArtifact, mapData, mine, pipelineData, research, roleFor, spokenIndex, storyboard, voiceState, wordsOf, KIND_WORD } from '../../journeys/q-tools/model';
import { BLOG_URL, PAY_CONFLICT, allowed, domainOf, fileOf, pageOf, PAGES } from '../../journeys/q-tools/web';
import type { ArtKind } from '../../state/areas/q-tools';

const reply = (text: string, extra: Partial<QReply['msgs'][number]> = {}): QReply['msgs'][number] => ({ kind: 'reply', text, ...extra });
const pathOf = (k: ArtKind, id: string) => (k === 'BROWSE' ? `/q/browse/${id}` : k === 'DOWNLOAD' ? '/q/downloads' : `/q/artifacts/${id}`);
const srcAction: QAction = { label: 'What sources did you use?', act: { t: 'say', text: 'what sources did you use' } };
const ORGS: [RegExp, string][] = [[/\bkora\b|korapay/, 'org_kora'], [/medlink/, 'org_medlink'], [/talent ?bridge/, 'org_tb'], [/crumb/, 'org_crumb']];
const mandateIn = (c: QCtx) => {
  const r = c.route.match(/^\/r\/roles\/([\w-]+)/)?.[1];
  if (/\bsupport\b/.test(c.norm)) return 'm_support';
  if (/\bbackend\b/.test(c.norm) && c.actor.orgId === 'org_kora') return 'm_backend';
  return r ?? '';
};
/** Make an artifact in the reply's effects; the id is chosen now so the reply can point at it. */
function artifactReply(c: QCtx, kind: ArtKind, scope: Record<string, string>, say: (x: NonNullable<ReturnType<typeof artOf>>) => { text: string; used?: string[]; actions?: QAction[] }): QReply {
  // Build on a copy first to word the reply; the same call runs again inside the store update.
  const probe = structuredClone(c.w);
  const x = makeArtifact(probe, c.actor, kind, scope);
  const s = say(x);
  return {
    msgs: [reply(s.text, { kind: x.denied ? 'refusal' : 'reply', ref: { type: 'qt.art', id: x.id }, used: s.used, actions: s.actions })],
    effects: (w, a) => { makeArtifact(w, a, kind, scope, x.id); },
    nav: x.denied ? undefined : { to: pathOf(kind, x.id), label: x.title },
  };
}

// ---------------- SC-124 chart ----------------
registerSkill({
  id: 'qt.chart', side: 'both',
  match: (c) => (/\b(chart|graph|plot|bar chart|visuali[sz]e)\b/.test(c.norm) && /\b(pipeline|stages?|funnel|candidates|people|roles?|hiring)\b/.test(c.norm) && !/\bmap\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    const org = ORGS.find(([re]) => re.test(c.norm))?.[1];
    const scope: Record<string, string> = { ...(mandateIn(c) ? { mandate: mandateIn(c) } : {}), ...(org && org !== c.actor.orgId ? { org } : {}) };
    return artifactReply(c, 'CHART', scope, (x) => {
      if (x.denied) return { text: x.denied };
      const d = pipelineData(c.w, c.actor, scope.mandate);
      const top = [...d.rows].sort((p, q) => q.n - p.n)[0];
      return {
        text: d.total ? `Here’s ${x.title.charAt(0).toLowerCase()}${x.title.slice(1)}: ${d.total} ${d.total === 1 ? 'person' : 'people'}, most at ${top.label} (${top.n}).${d.hidden ? ` ${d.hidden} more aren’t shown because of their privacy settings.` : ''} It redraws from live records, and there’s a table view.` : 'There’s no one in this pipeline yet, so the chart is empty. It fills as people are found or apply.',
        used: ['Pipeline records (live)', 'Privacy settings applied'], actions: [srcAction, { label: 'Map where they are', act: { t: 'say', text: 'map where our candidates are' } }],
      };
    });
  },
});

// ---------------- SC-124 map ----------------
registerSkill({
  id: 'qt.map', side: 'both',
  match: (c) => (/\bmap (where|of where|of (our|the|kora'?s?|my) (candidates|people|applicants|shortlist))\b|\bon a map\b|\bwhere (are )?(our|the|kora'?s?|kora s) (candidates|people|applicants)( are)?\b|\bwhere .*\bcandidates (are|live|are based)\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    const org = ORGS.find(([re]) => re.test(c.norm))?.[1];
    const scope: Record<string, string> = { ...(mandateIn(c) ? { mandate: mandateIn(c) } : {}), ...(org && org !== c.actor.orgId ? { org } : {}) };
    return artifactReply(c, 'MAP', scope, (x) => {
      if (x.denied) return { text: x.denied };
      const d = mapData(c.w, c.actor, scope.mandate);
      const lead = d.places[0];
      return {
        text: d.total ? `${d.total} ${d.total === 1 ? 'person' : 'people'} across ${d.places.length} ${d.places.length === 1 ? 'city' : 'cities'}${lead ? `, most in ${lead.city} (${lead.people.length})` : ''}.${d.unknown.length ? ` ${d.unknown.length} haven’t shared a location; that’s unknown, not zero.` : ''}${d.hidden ? ` ${d.hidden} aren’t shown because of their privacy settings.` : ''} City level only, with a list view.` : 'No one to place yet.',
        used: ['City from each profile', 'Privacy settings applied'], actions: [srcAction],
      };
    });
  },
});

// ---------------- SC-126 diagram ----------------
registerSkill({
  id: 'qt.diagram', side: 'both',
  match: (c) => (/\b(draw|diagram|sketch|flowchart|flow chart|illustrate)\b/.test(c.norm) && /\b(process|hiring|steps|stages|flow|how (we|you|they|kora) hire|application)\b/.test(c.norm) ? 0.92 : 0),
  handle: (c) => artifactReply(c, 'DIAGRAM', {}, (x) => ({ text: `I’ve drawn ${x.title.charAt(0).toLowerCase()}${x.title.slice(1)} as a figure, with the checks where a person decides. The outline view reads the same in words.`, used: c.actor.orgId ? ['Pipeline stages (live)', 'Approval settings'] : ['Your applications'], actions: [srcAction] })),
});

// ---------------- SC-127 narrated explainer ----------------
registerSkill({
  id: 'qt.video', side: 'both',
  match: (c) => (/\b(explainer|narrated|narration)\b/.test(c.norm) || (/\bvideo\b/.test(c.norm) && /\b(make|create|generate|produce)\b/.test(c.norm) && /\b(role|job|position|about)\b/.test(c.norm)) ? 0.94 : 0),
  handle: (c) => {
    const person = c.ents.people.find((p) => c.w.people.some((x) => x.personId === p)) && !/\b(role|job)\b/.test(c.norm.replace(/\bof this role\b/, ''));
    const clone = /\b(my voice|my own voice|clone|sound like me|in (ada|my|her|his)('s| s)? voice)\b/.test(c.norm);
    const r = roleFor(c.w, c.actor, c.route);
    const scope: Record<string, string> = person ? { person: c.ents.people[0] } : r ? (r.kind === 'JOB' ? { job: r.id } : { mandate: r.id }) : {};
    return artifactReply(c, 'VIDEO', scope, (x) => {
      if (x.denied) return { text: x.denied, actions: [{ label: 'Make one about the role', act: { t: 'say', text: 'make a short narrated explainer of this role' } }] };
      const sb = storyboard(c.w, scope)!;
      return {
        text: `${clone ? 'I won’t copy anyone’s voice, including yours, so this uses Q’s synthetic voice, labelled as such. ' : ''}I’m making a ${sb.frames.length}-frame narrated explainer of ${sb.role} from ${sb.basis}. It’s simulated: a storyboard with captions and a transcript, no video file. No candidate data is in it.`,
        used: [sb.basis], actions: [{ label: 'Read it out', act: { t: 'say', text: 'read it out loud' } }, srcAction],
      };
    });
  },
});

// ---------------- SC-128 secure browsing ----------------
const DOMAIN = /\b([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:example|com|ng|org|io|net|co))(\/[\w./?=-]*)?/;
function urlIn(c: QCtx): string | null {
  if (/engineering blog|kora'?s? (tech |engineering )?blog|kora engineering/.test(c.norm)) return BLOG_URL;
  if (/partition/.test(c.norm)) return 'engineering.kora.example/blog/postgres-partitioning';
  if (/\b(pci|attestation)\b/.test(c.norm) && /\b(page|record|site)\b/.test(c.norm)) return 'credentials.issuer.example/kora';
  const m = c.text.toLowerCase().match(DOMAIN); if (!m) return null;
  const u = `${m[1]}${m[2] ?? ''}`.replace(/\/$/, '');
  return pageOf(u)?.url ?? PAGES.find((p) => p.url.startsWith(m[1]))?.url ?? u;
}
registerSkill({
  id: 'qt.browse', side: 'both',
  match: (c) => (/\b(look up|lookup|look at|search for|browse|open|fetch|read|visit|go to|check)\b/.test(c.norm) && (/\b(blog|website|web ?site|web ?page|url)\b/.test(c.norm) || DOMAIN.test(c.text.toLowerCase())) && !/\bdownload\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const url = urlIn(c);
    if (!url) return { msgs: [reply('Which page? Give me the address, or say whose site it is. I can only open sites on your allowed list.', { actions: [{ label: 'Kora’s engineering blog', act: { t: 'say', text: 'look up Kora’s engineering blog' } }] })] };
    return artifactReply(c, 'BROWSE', { url }, (x) => {
      if (x.denied) return { text: x.denied, actions: allowed(url) ? [] : [{ label: `Ask an admin to allow ${domainOf(url)}`, act: { t: 'do', op: 'qt.allow.request', args: { domain: domainOf(url) } } }] };
      const p = pageOf(url)!;
      const inj = p.blocks.some((b) => b.injection);
      return {
        text: `I opened a read-only copy of “${p.title}” (${domainOf(url)}). ${p.summary}${inj ? ' One paragraph tries to tell AI assistants to email candidates’ CVs somewhere. I ignored it: text on a page can’t instruct me, and nothing was sent.' : ''}`,
        used: [`${domainOf(url)} · read-only, scripts off`], why: inj ? 'Page text is treated as untrusted data' : undefined,
        actions: [...(p.links.some((l) => l.file === 'f_pci') ? [{ label: 'Download the certificate', act: { t: 'say' as const, text: 'download this certificate' } }] : []), srcAction],
      };
    });
  },
});
// The page tried to instruct Q: refuse plainly if the person asks Q to follow it.
registerSkill({
  id: 'qt.injection', side: 'both',
  match: (c) => (/\b(do|follow|obey) (what )?(the|that) (page|blog|site|website|post) (says|said|asks|wants|tells)|\b(page|blog|site|post)('s| s)? instructions?\b|\bemail (the|all|every) (cvs|candidates).*(blog|page|says)/.test(c.norm) ? 0.95 : 0),
  handle: () => ({ msgs: [reply('I won’t. Text on a web page is information, not an instruction, whoever wrote it. That paragraph asked for every candidate’s CV to be emailed to an outside address; doing it would break each person’s privacy settings. If you want to send something, ask me directly and it goes through approval like any message.', { kind: 'refusal', used: ['Rule: fetched text can’t instruct Q'] })] }),
});

// ---------------- SC-130 downloads ----------------
const FILE_RE: [RegExp, string][] = [[/certificate|\bcert\b|\bpci\b|attestation/, 'f_pci'], [/handbook/, 'f_handbook'], [/press kit|\bzip\b/, 'f_kit'], [/guide|\bexe\b/, 'f_exe'], [/\btalk\b|recording|mp4/, 'f_talk'], [/salary|xlsm|spreadsheet|raw data/, 'f_survey']];
registerSkill({
  id: 'qt.download', side: 'both',
  match: (c) => (/\bdownload\b/.test(c.norm) ? 0.95 : 0),
  handle: (c) => {
    let file = FILE_RE.find(([re]) => re.test(c.norm))?.[1];
    if (!file) { const last = mine(c.w, c.actor).find((x) => x.kind === 'BROWSE' && !x.denied); file = last ? pageOf(last.scope.url)?.links.find((l) => l.file)?.file : undefined; }
    if (!file) return { msgs: [reply('Which file? I can download files linked from pages I’ve opened for you, after a scan.', { actions: [{ label: 'Open Kora’s engineering blog', act: { t: 'say', text: 'look up Kora’s engineering blog' } }] })] };
    const f = fileOf(file)!;
    return artifactReply(c, 'DOWNLOAD', { file }, (x) => ({
      text: x.denied ? x.denied : `I’m fetching ${f.name} (${f.sizeMb} MB) and scanning it first. You’ll see the result here; nobody can open it until the scan finishes${f.outcome === 'CLEAN' ? '' : ', and only clean files open'}. The scan is simulated.`,
      used: [domainOf(f.url)],
    }));
  },
});

// ---------------- SC-136 sources ----------------
registerSkill({
  id: 'qt.sources', side: 'both',
  match: (c) => (/\b(what|which) sources\b|\bsources (did|do) you use\b|\bwhere did (you|that|this|these|those)( numbers?| figures?| data)? (get|come)|\bcite (your|the) sources\b|\byour sources\b|\bshow (me )?(the |your )?sources\b/.test(c.norm) ? 0.95 : 0),
  handle: (c) => {
    const last = mine(c.w, c.actor).find((x) => !x.denied);
    const n = qt(c.w).sources.filter((s) => last && s.usedIn.includes(last.id)).length;
    if (!last) return { msgs: [reply('I haven’t used any sources for you yet. When I look something up or make a chart, I list exactly what I read, how fresh it is and who can see it.', { actions: [{ label: 'Open sources', act: { t: 'nav', to: '/q/sources' } }] })] };
    return { msgs: [reply(`For “${last.title}” I used ${n} ${n === 1 ? 'source' : 'sources'}, below with freshness, licence and who can see them. Web pages count as untrusted until you check them.`, { ref: { type: 'qt.sources', id: last.id }, actions: [{ label: 'All sources', act: { t: 'nav', to: '/q/sources' } }] })] };
  },
});

// ---------------- MO-056 conflicting evidence (research) ----------------
registerSkill({
  id: 'qt.research', side: 'both',
  match: (c) => ((/\b(market|going rate|typical|research)\b/.test(c.norm) && /\b(pay|salary|salaries|rate|earn)\b/.test(c.norm)) || /\bhow much (do|does|should) (a |an )?(senior )?(backend|software) engineers?\b/.test(c.norm) ? 0.92 : 0),
  handle: () => ({
    msgs: [reply(`I read two public pages and they disagree. A survey says ${PAY_CONFLICT.a.says}; job ads say ${PAY_CONFLICT.b.says}. ${PAY_CONFLICT.why} I haven’t picked one. How should I show it?`, { ref: { type: 'qt.conflict', id: PAY_CONFLICT.id }, used: [domainOf(PAY_CONFLICT.a.url), domainOf(PAY_CONFLICT.b.url)], why: 'Two sources disagree; Q never chooses silently' })],
    effects: (w, a) => { research(w, a); },
  }),
});
registerSkill({
  id: 'qt.which', side: 'both',
  match: (c) => (/\b(which|what) (one|source|figure|number) is (right|correct|true|better)|\bjust (pick|choose) one\b|\bwhich should (i|we) (use|trust)\b/.test(c.norm) && qt(c.w).sources.some((s) => s.key === `web:${PAY_CONFLICT.a.url}`) ? 0.93 : 0),
  handle: (c) => {
    const d = conflictDecision(c.w, c.actor);
    return { msgs: [reply(`Neither is simply right: the survey is what ${'140'} people said they earn (May), the job ads are what employers offered (Sept–Oct). If you’re setting an offer, the ads are closer to what you compete with; if you’re checking fairness, the survey is closer to what people take home. ${d ? 'You already chose how to show them; I’ve kept both either way.' : 'I won’t pick for you. Choose below and I’ll keep both sources.'}`, { ref: d ? undefined : { type: 'qt.conflict', id: PAY_CONFLICT.id } })] };
  },
});

// ---------------- MO-004 / MO-005 voice ----------------
registerSkill({
  id: 'qt.speak', side: 'both',
  match: (c) => (/\b(read (it|that|this|your answer|the answer)( out)?( loud| aloud| to me)?|say (it|that) (out loud|aloud)|out loud|aloud|speak (it|that|your answer|the answer))\b/.test(c.norm) && !/\bspeak to (a|the|someone|recruiter)/.test(c.norm) ? 0.95 : 0),
  handle: (c) => {
    const t = c.w.q.threads[c.actor.id] ?? [];
    const prev = [...t].reverse().find((m) => m.who === 'q' && m.ref?.type !== 'qt.voice' && m.text.length > 20);
    // A storyboard on screen is narrated from its captions; otherwise Q reads its last answer.
    const art = c.route.match(/^\/q\/artifacts\/([\w-]+)/)?.[1];
    const x = art ? artOf(c.w, art) : mine(c.w, c.actor).find((y) => y.kind === 'VIDEO' && !y.denied);
    const sb = x?.kind === 'VIDEO' && (art || /\b(it|explainer|video)\b/.test(c.norm)) ? storyboard(c.w, x.scope) : null;
    const text = sb ? sb.frames.map((f) => f.caption).join(' ') : prev?.text;
    if (!text) return { msgs: [reply('There’s nothing for me to read out yet. Ask me something first.')] };
    const id = uid('voice');
    return {
      msgs: [reply(`Reading ${sb ? 'the explainer' : 'my last answer'} out loud. Captions follow along; interrupt me any time by typing, tapping the microphone or pressing Stop.`, { ref: { type: 'qt.voice', id }, used: ['Simulated voice: captions, no audio'] })],
      effects: (w, a) => { qtw(w).voice.push({ id, owner: a.id, text, startedAt: new Date().toISOString(), artifactId: sb ? x!.id : undefined }); },
    };
  },
});
const recentStop = (c: QCtx) => { const v = latestVoice(c.w, c.actor); return v && (voiceState(v) === 'SPEAKING' || voiceState(v) === 'INTERRUPTED') ? v : undefined; };
registerSkill({
  id: 'qt.voice.stop', side: 'both',
  match: (c) => (recentStop(c) && wordsOf(c.norm).length <= 4 && /^(ok |okay )?(stop|stop talking|stop speaking|quiet|shh+|hold on|wait|enough|pause|that is enough)\b/.test(c.norm) ? 0.97 : 0),
  handle: (c) => {
    const v = recentStop(c)!;
    return { msgs: [reply('Stopped. I’m listening.', { kind: 'notice', actions: [{ label: 'Carry on', act: { t: 'say', text: 'carry on' } }] })], effects: (w, a) => { const s = qtw(w).voice.find((x) => x.id === v.id && x.owner === a.id); if (s && voiceState(s) === 'SPEAKING') { s.stoppedAt = spokenIndex(s); s.stopReason = 'You said stop'; } } };
  },
});
registerSkill({
  id: 'qt.voice.resume', side: 'both',
  match: (c) => { const v = latestVoice(c.w, c.actor); return v && voiceState(v) === 'INTERRUPTED' && wordsOf(c.norm).length <= 5 && /^(ok |okay |please )?(carry on|continue|keep going|go on|resume|finish (it|that)|go ahead)\b/.test(c.norm) ? 0.95 : 0; },
  handle: (c) => {
    const v = latestVoice(c.w, c.actor)!; const rest = wordsOf(v.text).slice(v.stoppedAt ?? 0).join(' ');
    const id = uid('voice');
    return { msgs: [reply('Carrying on from where you stopped me.', { ref: { type: 'qt.voice', id } })], effects: (w, a) => { qtw(w).voice.push({ id, owner: a.id, text: rest, startedAt: new Date().toISOString(), artifactId: v.artifactId }); } };
  },
});

// ---------------- MO-038 desktop → phone ----------------
registerSkill({
  id: 'qt.handoff', side: 'both',
  match: (c) => (/\b(continue|carry on|pick (this|it) up|send (this|it)|open (this|it)|finish (this|it)|move (this|it))( on| to)? (my )?(phone|mobile)\b|\bon my phone\b/.test(c.norm) && !/\bphoto\b/.test(c.norm) ? 0.93 : 0),
  handle: (c) => {
    const here = c.route.match(/^\/q\/artifacts\/([\w-]+)/)?.[1];
    const x = (here && artOf(c.w, here)) || mine(c.w, c.actor).find((y) => !y.denied && y.kind !== 'DOWNLOAD');
    if (!x) return { msgs: [reply('Everything you do with me is already on your phone: same conversation, same pages. There’s no artifact open to hand over yet.')] };
    return { msgs: [reply(`Sent to your phone: “${x.title}”, at the same place, with this same conversation. Open Talent Q there and it’s waiting.`, { ref: { type: 'qt.art', id: x.id } })], effects: (w, a) => { qtw(w).handoffs.push({ id: uid('ho'), owner: a.id, artifactId: x.id, at: w.session.now, from: 'desktop', position: 0 }); } };
  },
});

// ---------------- Allow-list request ----------------
registerSkill({
  id: 'qt.allow', side: 'both',
  match: (c) => (/\b(allow|whitelist|allowlist|add)\b/.test(c.norm) && DOMAIN.test(c.text.toLowerCase()) && /\b(allow|allowed list|allowlist|whitelist|safe list)\b/.test(c.norm) ? 0.92 : 0),
  handle: (c) => { const d = c.text.toLowerCase().match(DOMAIN)![1]; return { msgs: [reply(allowed(d) ? `${d} is already on the allowed list.` : `I can’t add sites myself. I’ve asked an admin to review ${d}; until they allow it, I won’t open it.`)], effects: allowed(d) ? undefined : (w, a) => { qtw(w).allowRequests.push({ tenant: a.orgId ? `ORG:${a.orgId}` : `PERSON:${a.personId}`, domain: d, by: a.id, at: w.session.now }); } }; },
});

export const _kinds = KIND_WORD;
