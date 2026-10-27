// P12 · SC-133 memory viewer and correction, SC-177 what/why/sources, SC-178 correct/challenge/revoke,
// SC-179 context pack for a task, SC-183 candidate proof of non-sharing.
import { useState } from 'react';
import { MEMORY_LAYERS, MEMORY_LAYER_LABELS, type MemoryItem } from '@contracts';
import { log, now, uid, update, useWorld, visibleMemories, type World } from '../mock/world';
import { Banner, Button, Label, Segmented, Sheet, TextArea, toast } from '../ui/kit';
import { Link } from '../ui/router';

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
  const items = visibleMemories(w, viewer);
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
    });
    toast('Corrected. Q uses the new version from now on; the old one is kept in history.');
    setEditing(null);
  };
  const setStatus = (m: MemoryItem, s: 'forgotten' | 'revoked') => update((d) => {
    const x = d.memories.find((y) => y.memory_id === m.memory_id)!;
    x.lifecycle_status = s; x.delete_or_revoke_state = s === 'revoked' ? 'REVOKED' : 'DELETE_REQUESTED';
    log(d, viewer === 'recruiter' ? 'You' : 'Candidate', `${s === 'revoked' ? 'Stopped Q using' : 'Asked Q to forget'}: ${x.memory_key}`);
  });

  return (
    <main className="main stack gap-12">
      <header className="stack gap-3">
        <span className="t-label q-text">What Q remembers</span>
        <h1 className="t-display measure">{viewer === 'recruiter' ? 'Everything Q remembers for you, and where it came from.' : 'What Q keeps about you, and who can see it.'}</h1>
        <p className="t-lead muted measure">Q remembers what you tell it to, what a task needs, and your organisation’s rules. It doesn’t remember everything, and it shows you when it uses a memory.</p>
      </header>

      {MEMORY_LAYERS.filter((l) => l !== 'LIVE_STATE').map((layer) => {
        const list = items.filter((m) => m.layer === layer);
        if (!list.length && (layer === 'CONVERSATION' || layer === 'CONTEXT_PACK' || layer === 'EVALUATED_LEARNING')) return (
          <section key={layer} className="stack gap-2" aria-label={MEMORY_LAYER_LABELS[layer]}>
            <Label as="h2">{MEMORY_LAYER_LABELS[layer]}</Label>
            <p className="t-caption">{layer === 'CONVERSATION' ? 'Your conversations are kept in your history, not as memories. Search them from Q.' : layer === 'CONTEXT_PACK' ? 'Short summaries Q makes for a task. They expire with the task. See “What Q would use” below.' : 'Changes to how Q works, reviewed by people before release. Nothing from your conversations is used without consent.'}</p>
          </section>
        );
        if (!list.length) return null;
        return (
          <section key={layer} className="stack gap-4" aria-labelledby={`l-${layer}`}>
            <Label as="h2" id={`l-${layer}`}>{MEMORY_LAYER_LABELS[layer]}</Label>
            <ul className="stack gap-4">
              {list.map((m) => (
                <li key={m.memory_id} className="panel stack gap-3">
                  <p className="t-voice" style={{ fontSize: 19 }}>{m.content}</p>
                  <div className="row wrap gap-2">
                    <span className="tag">{TRUTH[m.truth_class]}</span><span className="tag">{SCOPE[m.visibility_scope]}</span>
                    {m.evidence_status === 'CONTESTED' && <span className="tag" style={{ borderColor: 'var(--color-warn)' }}>Not confirmed</span>}
                    {m.expires_at && <span className="tag">Until {m.expires_at.slice(0, 10)}</span>}
                  </div>
                  <details>
                    <summary className="t-caption" style={{ cursor: 'pointer' }}>Why Q keeps this, and the source</summary>
                    <div className="stack gap-2" style={{ marginTop: 10 }}>
                      <p>{m.importance_reason}</p>
                      {m.source_refs.map((s, i) => <p key={i} className="t-caption">{s.label} · {s.at.slice(0, 10)}{s.quote ? <> · “{s.quote}”</> : null}</p>)}
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
          <ul className="stack gap-1">{history.map((h) => <li key={h.memory_id} className="t-caption"><s>{h.content}</s> · replaced by your correction</li>)}</ul>
        </section>
      )}

      {viewer === 'recruiter' ? <ContextPack w={w} task={task} setTask={setTask} /> : <NonSharing w={w} />}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Correct this memory" side="center">
        <form className="stack gap-4" onSubmit={(e) => { e.preventDefault(); correct(); }}>
          <TextArea label="What should Q remember instead?" value={text} onChange={setText} rows={4} help="Q keeps the old version in history and uses yours from now on." />
          <div className="row gap-3"><Button type="submit" variant="primary">Save correction</Button><Button variant="quiet" onClick={() => setEditing(null)}>Cancel</Button></div>
        </form>
      </Sheet>
    </main>
  );
}

function ContextPack({ w, task, setTask }: { w: World; task: Task; setTask: (t: Task) => void }) {
  const keys = TASKS[task].keys;
  const rows = keys.map((k) => {
    const all = w.memories.filter((m) => m.memory_key === k);
    const live = all.find((m) => m.lifecycle_status === 'active');
    const any = all[0];
    if (any?.visibility_scope === 'CANDIDATE_PRIVATE_PRACTICE') return { k, item: any, use: false, why: 'Candidate’s private practice. Never available to employers.' };
    if (!live) return { k, item: any, use: false, why: any?.lifecycle_status === 'revoked' ? 'You told Q not to use this.' : 'Forgotten.' };
    return { k, item: live, use: true, why: live.importance_reason };
  });
  return (
    <section className="stack gap-4" aria-labelledby="cp-h">
      <h2 id="cp-h" className="t-heading">What Q would use</h2>
      <p className="muted measure">Pick a task to see the memories Q would bring to it, and the ones it must leave out.</p>
      <Segmented<Task> label="Task" value={task} onChange={setTask} options={(Object.keys(TASKS) as Task[]).map((k) => ({ value: k, label: TASKS[k].label }))} />
      <ul className="stack">
        {rows.map((r) => (
          <li key={r.k} className="row wrap gap-4" style={{ padding: '14px 0', borderTop: '1px solid var(--color-line)' }}>
            <span className="tag" style={{ borderColor: r.use ? 'var(--color-ok)' : 'var(--color-line-strong)', minWidth: 88, justifyContent: 'center' }}>{r.use ? 'Used' : 'Left out'}</span>
            <span className="grow stack"><span>{r.use ? r.item?.content : <span className="muted">{r.k.startsWith('person.p_tobi.practice') ? 'Something private to the candidate' : 'A memory you told Q not to use (content hidden)'}</span>}</span><span className="t-caption">{r.why}</span></span>
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
