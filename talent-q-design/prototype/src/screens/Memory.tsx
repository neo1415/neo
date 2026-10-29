// P12 · SC-133 memory viewer and correction, SC-177 what/why/sources, SC-178 correct/challenge/revoke,
// SC-179 context pack for a task, SC-183 candidate proof of non-sharing.
import { useState } from 'react';
import { MEMORY_LAYERS, MEMORY_LAYER_LABELS, type MemoryItem } from '@contracts';
import { actorOf, emit, log, now, uid, update, useWorld, visibleMemories, type World } from '../mock/world';
import type { Actor } from '../state/domain';
import { Banner, Button, Label, Segmented, Sheet, TextArea, toast } from '../ui/kit';
import { Link } from '../ui/router';
import { Canvas } from '../ds/Workspace';
import { openQ } from '../journeys/hire-a/ui';

/** What someone said is shown as their words, in sentence case and quoted; everything else as written (critique F8). */
const shown = (m: MemoryItem) => { const t = m.content.trim(); const c = t.charAt(0).toUpperCase() + t.slice(1); return m.truth_class === 'STATED_BY_USER' ? `“${c}”` : c; };
const TRUTH: Record<MemoryItem['truth_class'], string> = { STATED_BY_USER: 'You said this', VERIFIED_FACT: 'Verified', THIRD_PARTY_CLAIM: 'Someone else’s claim', INFERENCE: 'Q inferred this', ORG_POLICY: 'Organisation rule' };
const SCOPE: Record<MemoryItem['visibility_scope'], string> = { PERSONAL_PRIVATE: 'Only you', TEAM: 'Your hiring team', ORGANIZATION: 'Everyone at Kora Pay', SHARED_WITH_EMPLOYER: 'Shared with an employer', CANDIDATE_PRIVATE_PRACTICE: 'Private practice, only the candidate' };

type Task = 'schedule' | 'outreach' | 'compare';
const TASKS: Record<Task, { label: string; keys: string[] }> = {
  schedule: { label: 'Schedule Tobi’s interview', keys: ['recruiter.meeting.window', 'org.interview.panel.senior', 'person.p_tobi.practice.system_design'] },
  outreach: { label: 'Draft outreach to Tobi', keys: ['recruiter.outreach.signoff', 'person.p_tobi.salary_expectation', 'person.p_tobi.practice.system_design'] },
  compare: { label: 'Compare the shortlist', keys: ['mandate.m_backend.question_plan', 'person.p_tobi.salary_expectation', 'person.p_tobi.practice.system_design'] },
};

export function Memory({ viewer }: { viewer: 'recruiter' | 'candidate' }) {
  const w = useWorld((x) => x);
  const actor = actorOf(w);
  const items = viewer === 'recruiter' ? recruiterMemories(w, actor) : visibleMemories(w, viewer);
  const history = w.memories.filter((m) => m.lifecycle_status === 'superseded' && items.some((i) => i.supersedes_id === m.memory_id));
  const [editing, setEditing] = useState<MemoryItem | null>(null);
  const [text, setText] = useState('');
  const [task, setTask] = useState<Task>('schedule');

  const correct = () => {
    if (!editing || !text.trim()) return;
    const id = editing.memory_id;
    update((d) => {
      const old = d.memories.find((m) => m.memory_id === id)!;
      old.lifecycle_status = 'superseded';
      const nid = uid('mem');
      const sv = { ...old.structured_value };
      const t = text.match(/(\d{1,2})[:.](\d{2})/);
      if (old.memory_key === 'recruiter.meeting.window' && t) sv.earliestLocal = `${t[1].padStart(2, '0')}:${t[2]}`;
      d.memories.unshift({ ...old, memory_id: nid, content: text.trim(), structured_value: sv, supersedes_id: id, lifecycle_status: 'active', truth_class: 'STATED_BY_USER', write_mode: 'USER_CONFIRMED', evidence_status: 'SUPPORTED',
        recorded_at: now(), last_confirmed_at: now(), source_refs: [{ kind: 'MESSAGE', ref: nid, label: 'Your correction', quote: text.trim(), at: now() }, ...old.source_refs] });
      log(d, viewer === 'recruiter' ? 'You' : 'Candidate', `Corrected a memory: ${old.memory_key}`);
      if (viewer === 'recruiter' && actor.orgId) emit(d, actor.id, 'memory.corrected', `ORG:${actor.orgId}`, `${actor.name} corrected what Q remembered: “${old.content}” is replaced by “${text.trim()}”.`);
    });
    toast('Corrected. Q uses the new version from now on; the old one is kept in history.');
    setEditing(null);
  };
  const setStatus = (m: MemoryItem, s: 'forgotten' | 'revoked') => update((d) => {
    const x = d.memories.find((y) => y.memory_id === m.memory_id)!;
    x.lifecycle_status = s; x.delete_or_revoke_state = s === 'revoked' ? 'REVOKED' : 'DELETE_REQUESTED';
    log(d, viewer === 'recruiter' ? 'You' : 'Candidate', `${s === 'revoked' ? 'Stopped Q using' : 'Asked Q to forget'}: ${x.memory_key}`);
  });

  const org = actor.orgId ? w.orgs.find((o) => o.id === actor.orgId)?.name : undefined;
  const EMPTY_NOTE: Partial<Record<string, string>> = { CONVERSATION: 'Kept in your conversation history, not as memories. Search them from Q.', CONTEXT_PACK: 'Short summaries Q makes for one task; they expire with it. See “What Q would use” above.', EVALUATED_LEARNING: 'Changes to how Q works, reviewed by people before release. Nothing from your conversations is used without consent.' };
  const notKept = MEMORY_LAYERS.filter((l) => l !== 'LIVE_STATE' && EMPTY_NOTE[l] && !items.some((m) => m.layer === l));
  return (
    <Canvas title={viewer === 'recruiter' ? 'What Q remembers' : 'What Q keeps about you'} kicker={viewer === 'recruiter' ? (org ? `Memory · ${org}` : 'Memory') : 'Memory · only you and Q'} open onClose={openQ}
      aside={<span className="tag num">{items.length} in use</span>}>
      <p className="muted measure" style={{ margin: 0 }}>{viewer === 'recruiter' ? 'What Q keeps for you, where each item came from, and who can see it. Correct or remove anything; Q shows you when it uses a memory.' : 'Who can see each item, and where it came from. Correct or remove anything.'}</p>

      {viewer === 'recruiter' && items.length === 0 && <Banner tone="info" title="Nothing remembered yet">Q hasn’t saved anything for you yet. When it does (a preference you state, or your organisation’s rules), it appears here with its source.</Banner>}
      {MEMORY_LAYERS.filter((l) => l !== 'LIVE_STATE').map((layer) => {
        const list = items.filter((m) => m.layer === layer);
        if (!list.length) return null;
        return (
          <section key={layer} className="stack gap-3" aria-labelledby={`l-${layer}`}>
            <Label as="h2" id={`l-${layer}`}>{MEMORY_LAYER_LABELS[layer]} · {list.length}</Label>
            <ul className="panel" style={{ listStyle: 'none', margin: 0, paddingTop: 4, paddingBottom: 4 }}>
              {list.map((m, i) => (
                <li key={m.memory_id} className="stack gap-2" style={{ padding: '16px 0', borderTop: i ? '1px solid var(--color-line)' : 0 }}>
                  <p className="t-voice" style={{ fontSize: 18, margin: 0 }}>{shown(m)}</p>
                  <div className="row wrap gap-2" style={{ alignItems: 'center' }}>
                    <span className="tag">{TRUTH[m.truth_class]}</span><span className="tag">{SCOPE[m.visibility_scope]}</span>
                    {m.evidence_status === 'CONTESTED' && <span className="tag" style={{ borderColor: 'var(--color-warn)' }}>Not confirmed</span>}
                    {m.expires_at && <span className="tag">Until {new Date(m.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  </div>
                  <details>
                    <summary className="t-caption" style={{ cursor: 'pointer', padding: '6px 0' }}>Why Q keeps this, and the source</summary>
                    <div className="stack gap-2" style={{ marginTop: 6 }}>
                      <p style={{ margin: 0 }}>{m.importance_reason}</p>
                      {m.source_refs.map((s, j) => <p key={j} className="t-caption" style={{ margin: 0 }}>{s.label} · {s.at.slice(0, 10)}{s.quote ? <> · “{s.quote}”</> : null}</p>)}
                    </div>
                  </details>
                  <div className="row wrap gap-2">
                    {m.truth_class === 'ORG_POLICY' ? <span className="t-caption">An organisation rule. An admin can change it in <Link to="/r/setup">Organisation</Link>.</span> : <>
                      <Button compact onClick={() => { setEditing(m); setText(m.content); }}>Correct</Button>
                      {m.truth_class === 'THIRD_PARTY_CLAIM' ? <Button compact variant="quiet" onClick={() => { setStatus(m, 'revoked'); toast('Q will no longer use this. It has been removed from every task immediately.'); }}>Don’t use this</Button>
                        : <Button compact variant="quiet" onClick={() => { setStatus(m, 'forgotten'); toast('Forgotten. Q no longer uses it.'); }}>Forget</Button>}
                    </>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {history.length > 0 && (
        <section className="stack gap-2" aria-label="Earlier versions">
          <Label as="h2">Earlier versions</Label>
          <ul className="stack gap-1">{history.map((h) => <li key={h.memory_id} className="t-caption"><s>{h.content}</s> · replaced by a correction{h.source_refs[0] ? ` · was from ${h.source_refs[0].label}` : ''}</li>)}</ul>
        </section>
      )}

      {viewer === 'recruiter' ? (actor.orgId === 'org_kora' && <ContextPack w={w} task={task} setTask={setTask} actor={actor} />) : <NonSharing w={w} />}

      {notKept.length > 0 && (
        <section className="stack gap-2" aria-labelledby="nk-h">
          <Label as="h2" id="nk-h">Not kept as memories</Label>
          <dl className="stack gap-2" style={{ margin: 0 }}>{notKept.map((l) => <div key={l}><dt style={{ fontWeight: 600 }}>{MEMORY_LAYER_LABELS[l]}</dt><dd className="t-caption" style={{ margin: 0 }}>{EMPTY_NOTE[l]}</dd></div>)}</dl>
        </section>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Correct this memory" side="center">
        <form className="stack gap-4" onSubmit={(e) => { e.preventDefault(); correct(); }}>
          <TextArea label="What should Q remember instead?" value={text} onChange={setText} rows={4} help="Q keeps the old version in history and uses yours from now on." />
          <div className="row gap-3"><Button type="submit" variant="primary">Save correction</Button><Button variant="quiet" onClick={() => setEditing(null)}>Cancel</Button></div>
        </form>
      </Sheet>
    </Canvas>
  );
}

function ContextPack({ w, task, setTask, actor }: { w: World; task: Task; setTask: (t: Task) => void; actor: Actor }) {
  const keys = TASKS[task].keys;
  const rows = keys.map((k) => {
    const all = w.memories.filter((m) => m.memory_key === k);
    const live = all.find((m) => m.lifecycle_status === 'active');
    const any = all[0];
    if (any?.visibility_scope === 'CANDIDATE_PRIVATE_PRACTICE') return { k, item: any, use: false, why: 'Candidate’s private practice. Never available to employers.' };
    if (any?.visibility_scope === 'PERSONAL_PRIVATE' && any.owner_id !== actor.id && any.owner_id !== actor.id.replace(/^u_/, 'p_')) return { k, item: undefined, use: false, why: 'A colleague’s private preference. Q uses it only for them.' };
    if (!live) return { k, item: any, use: false, why: any?.lifecycle_status === 'revoked' ? 'You told Q not to use this.' : 'Forgotten.' };
    return { k, item: live, use: true, why: live.importance_reason };
  });
  return (
    <section className="stack gap-4" aria-labelledby="cp-h">
      <Label as="h2" id="cp-h">What Q would use for a task</Label>
      <p className="muted measure" style={{ margin: 0 }}>Pick a task to see what Q would bring to it, and what it must leave out.</p>
      <Segmented<Task> label="Task" value={task} onChange={setTask} options={(Object.keys(TASKS) as Task[]).map((k) => ({ value: k, label: TASKS[k].label }))} />
      <ul className="stack">
        {rows.map((r) => (
          <li key={r.k} style={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', gap: 16, alignItems: 'start', padding: '14px 0', borderTop: '1px solid var(--color-line)' }}>
            <span className="tag" style={{ borderColor: r.use ? 'var(--color-ok)' : 'var(--color-line-strong)', justifyContent: 'center' }}>{r.use ? 'Used' : 'Left out'}</span>
            <span className="grow stack"><span>{r.use ? r.item?.content : <span className="muted">{r.k.startsWith('person.p_tobi.practice') ? 'Something private to the candidate' : !r.item ? 'Someone else’s private preference (content hidden)' : 'A memory you told Q not to use (content hidden)'}</span>}</span><span className="t-caption">{r.why}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NonSharing({ w }: { w: World }) {
  const practice = w.memories.filter((m) => m.visibility_scope === 'CANDIDATE_PRIVATE_PRACTICE');
  const promoted = w.practice.filter((p) => p.visibility === 'PROMOTED_TO_EVIDENCE').length;
  return (
    <section className="stack gap-4" aria-labelledby="ns-h">
      <h2 id="ns-h" className="t-heading">What employers can’t see</h2>
      <Banner tone="ok" title={`${practice.length} private practice record${practice.length === 1 ? '' : 's'} · 0 visible to employers`}>
        Kora Pay’s Q cannot retrieve your practice. When Ada’s Q prepares any task, these records are left out before anything else happens.{promoted ? ` You chose to add ${promoted} practice result${promoted === 1 ? '' : 's'} to your passport, where you control who sees ${promoted === 1 ? 'it' : 'them'}.` : ''}
      </Banner>
      <Link to="/c/passport">See exactly what Kora Pay sees</Link>
    </section>
  );
}

/** A recruiter sees their organisation's shared memories and their own private ones, never a colleague's private
 * preferences, another organisation's, or a candidate's private practice. (Seed owners use p_ ids for staff.) */
function recruiterMemories(w: World, a: Actor) {
  const mine = (owner: string) => owner === a.id || owner === a.id.replace(/^u_/, 'p_');
  return w.memories.filter((m) => m.lifecycle_status !== 'revoked' && m.lifecycle_status !== 'forgotten' && m.lifecycle_status !== 'superseded'
    && m.visibility_scope !== 'CANDIDATE_PRIVATE_PRACTICE' && m.tenant_id === a.orgId && (m.visibility_scope !== 'PERSONAL_PRIVATE' || mine(m.owner_id)));
}
