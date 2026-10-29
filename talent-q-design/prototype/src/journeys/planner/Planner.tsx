// SC-119 Q task planner · SC-131 multi-agent activity · SC-132 handoff approval center · SC-135 failure and
// reconnect · SC-181 paused task resume. The conversation is derived from the durable planner state, so leaving
// and returning (or reloading) shows the same thread at the same point.
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AGENTS, CONTEXT_USED, GOAL, planner, usePlanner, type Approval, type PlannerState, type Task } from '../../services/agents';
import { Glyph } from '../../ds/Glyph';
import { moodOf, type QAgent } from '../../ds/QMark';
import { Canvas, Split, Thread, useNarrow, type Entry, type ViewDef } from '../../ds/Workspace';

type View = 'plans' | 'plan' | 'agents' | 'findings' | 'approvals';

export function Planner() {
  const s = usePlanner((x) => x);
  const narrow = useNarrow();
  const [view, setView] = useState<View>(s.status === 'NONE' ? 'plans' : s.status === 'COMPLETED' ? 'approvals' : s.status === 'CLARIFYING' || s.status === 'PLANNED' ? 'plan' : 'agents');
  const [open, setOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const show = (v: View) => { setView(v); if (narrow) setOpen(true); };
  // The view follows the work unless the person has chosen one; their choice is never overridden mid-task.
  useEffect(() => { if (s.status === 'PLANNED') setView('plan'); if (s.status === 'RUNNING' && view === 'plan') setView('agents'); if (s.status === 'COMPLETED' && view === 'agents') setView('approvals'); }, [s.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const agents: QAgent[] = s.tasks.filter((t) => t.state === 'RUNNING' || t.state === 'WAITING_INPUT').map((t) => ({ label: AGENTS[t.agent].name, done: t.done, total: t.total }));
  const waitingApprovals = s.approvals.filter((a) => a.state === 'WAITING').length;
  const mood = moodOf({ agents: s.status === 'RUNNING' ? agents : [], thinking, waiting: s.status === 'WAITING_INPUT' || s.status === 'PLANNED' || (s.status === 'COMPLETED' && waitingApprovals > 0), done: s.status === 'COMPLETED' && !waitingApprovals });
  const detail = s.status === 'WAITING_INPUT' ? 'Needs your decision: LinkedIn isn’t connected'
    : s.status === 'PAUSED' ? `Paused · ${s.pausedReason ?? ''}` : s.status === 'COMPLETED' && waitingApprovals ? `${waitingApprovals} actions wait for your yes` : undefined;

  const ask = (goal: string) => { setThinking(true); planner.setGoal(goal); setTimeout(() => setThinking(false), 900); if (narrow) setOpen(false); };
  const entries = useEntries(s, thinking, { ask, show });
  const views: ViewDef<View>[] = s.status === 'NONE' ? [{ id: 'plans', label: 'Plans' }] : [
    { id: 'plans', label: 'Plans' }, { id: 'plan', label: 'Plan', ready: s.tasks.length > 0 }, { id: 'agents', label: 'Agents', ready: s.tasks.some((t) => t.state !== 'BLOCKED' && t.state !== 'READY') },
    { id: 'findings', label: `Findings${s.findings.length ? ` · ${s.findings.length}` : ''}`, ready: s.findings.length > 0 }, { id: 'approvals', label: `Approvals${waitingApprovals ? ` · ${waitingApprovals}` : ''}`, ready: s.approvals.length > 0 },
  ];
  const lastQ = [...entries].reverse().find((e) => e.who === 'q' && e.text)?.text;

  return (
    <Split id="planner"
      thread={<Thread title="Plans and agents" entries={entries} agents={s.status === 'RUNNING' ? agents : []} mood={mood} detail={detail} placeholder="Give Q a goal, or answer its question"
        onSend={(t) => { if (s.status === 'NONE' || s.status === 'COMPLETED') ask(t); else if (s.status === 'CLARIFYING') planner.answerScope(/reloc/i.test(t) ? 'Include relocation' : 'Lagos and remote only'); }} />}
      canvas={
        <Canvas title={s.goal || 'Plans and agents'} kicker={s.status === 'NONE' ? 'Q · work in progress' : `Plan · ${statusWord(s)}`} views={views} view={view} setView={setView}
          open={open} onClose={() => setOpen(false)} qLine={lastQ}
          aside={s.status === 'NONE' ? null : <div className="ds-actions">{s.status === 'RUNNING' ? <button type="button" className="ds-btn" onClick={() => planner.pause()}>Pause plan</button> : s.status === 'PAUSED' ? <button type="button" className="ds-btn primary" onClick={() => planner.resume()}>Resume</button> : null}<button type="button" className="ds-btn quiet" onClick={() => { if (confirm(s.status === 'COMPLETED' ? 'Close this plan? Approved actions and receipts are kept in the activity log.' : 'Cancel this plan? Finished steps are kept; nothing waiting for approval will be sent.')) planner.reset(); }}>{s.status === 'COMPLETED' ? 'Close plan' : 'Cancel plan'}</button></div>}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
              {s.status === 'PAUSED' && <div className="ds-banner" data-k="warn" role="status"><Glyph k="partial" /><span><b>Paused.</b> {s.pausedReason}</span><button type="button" className="ds-btn primary" onClick={() => planner.resume()}>Resume</button></div>}
              {view === 'plans' && <Plans s={s} onStart={() => ask(GOAL)} />}
              {view === 'plan' && <PlanGraph s={s} />}
              {view === 'agents' && <Lanes s={s} />}
              {view === 'findings' && <Findings s={s} />}
              {view === 'approvals' && <Approvals s={s} />}
            </motion.div>
          </AnimatePresence>
        </Canvas>
      } />
  );
}
const statusWord = (s: PlannerState) => ({ NONE: 'none', CLARIFYING: 'clarifying', PLANNED: 'ready to start', RUNNING: 'running', PAUSED: 'paused', WAITING_INPUT: 'needs you', COMPLETED: 'finished' })[s.status];

function useEntries(s: PlannerState, thinking: boolean, { ask, show }: { ask: (g: string) => void; show: (v: View) => void }): Entry[] {
  return useMemo(() => {
    const e: Entry[] = [{ id: 'hello', who: 'q', text: 'Give me a goal and I’ll plan it, split it across agents and show you the work as it happens. Anything that leaves Talent Q waits for your yes.',
      chips: s.status === 'NONE' ? [{ label: GOAL, go: true, on: () => ask(GOAL) }, ...(s.earlier.status === 'PAUSED' ? [{ label: 'Resume the paused reference check', on: () => planner.resumeEarlier() }] : [])] : undefined }];
    if (s.earlier.status === 'RESUMED') e.push({ id: 'earlier', who: 'q', text: `Picked up “${s.earlier.title}” from ${s.earlier.at} where it stopped: ${s.earlier.progress}.`, used: ['Paused task from 27 Oct'] });
    if (!s.goal) return e;
    e.push({ id: 'goal', who: 'me', text: s.goal });
    if (thinking) { e.push({ id: 'think', who: 'q', text: 'Reading your goal against what I already know…' }); return e; }
    e.push({ id: 'clarify', who: 'q', used: CONTEXT_USED, text: 'I have the approved mandate, your meeting hours and the handbook’s panel rule. One question before I plan: should I include people who would need to relocate?',
      chips: s.status === 'CLARIFYING' ? [{ label: 'Lagos and remote only', go: true, on: () => planner.answerScope('Lagos and remote only') }, { label: 'Include relocation', on: () => planner.answerScope('Include relocation') }] : undefined });
    if (!s.scope) return e;
    e.push({ id: 'scope', who: 'me', text: s.scope });
    const skipped = s.tasks.find((t) => t.optional)?.state === 'SKIPPED';
    e.push({ id: 'plan', who: 'q', text: `Here’s the plan: five tasks across five agents. Search runs first; evidence checks follow; outreach, scheduling${skipped ? '' : ' and reference requests'} run in parallel after that. About six minutes of work.`, why: 'Shown as a plan: dependencies decide what runs in parallel',
      chips: s.status === 'PLANNED' ? [{ label: 'Start the plan', go: true, on: () => { planner.start(); show('agents'); } }, { label: skipped ? 'Include reference requests' : 'Skip reference requests', on: () => planner.toggleOptional('t5') }] : undefined });
    if (s.status === 'PLANNED') return e;
    const plan = s.tasks.filter((t) => t.state !== 'SKIPPED').map((t) => ({ label: AGENTS[t.agent].name, done: t.done, total: t.total, failed: t.state === 'WAITING_INPUT' }));
    const q = s.tasks.find((t) => t.question);
    if (s.status === 'WAITING_INPUT' && q) {
      e.push({ id: 'run', who: 'q', plan, live: true, text: q.question!.prompt, chips: q.question!.options.map((o, i) => ({ label: o, go: i === 0, on: () => planner.answerQuestion(q.id, o) })) });
      return e;
    }
    const issues = s.log.filter((l) => l.kind === 'issue' || (l.kind === 'decision' && /recovered|skipped|connected/i.test(l.text))).slice(-2).map((l) => l.text);
    const waiting = s.approvals.filter((a) => a.state === 'WAITING').length;
    const done = s.status === 'COMPLETED';
    e.push({ id: 'run', who: 'q', plan, live: s.status === 'RUNNING',
      text: done ? `All agents finished. ${waiting ? `${waiting} ${waiting === 1 ? 'action waits' : 'actions wait'} for your approval. Nothing has left Talent Q.` : 'Everything you approved went out (simulated). Receipts are in Approvals.'}`
        : s.status === 'PAUSED' ? 'Paused. Every finished step is kept; resume when you’re ready.' : issues.length ? issues[issues.length - 1] : 'Working. Findings appear as each check finishes.',
      why: done ? 'Shown as an approval queue: each action and exactly what it will do' : 'Shown as agent lanes: who is doing what, with real counts',
      chips: done && waiting ? [{ label: `Review ${waiting} approvals`, go: true, on: () => show('approvals') }, { label: 'See what they found', on: () => show('findings') }] : s.status === 'RUNNING' ? [{ label: 'Pause', on: () => planner.pause() }] : s.status === 'PAUSED' ? [{ label: 'Resume', go: true, on: () => planner.resume() }] : undefined });
    if (done && !waiting) e.push({ id: 'fin', who: 'q', text: 'Plan complete. I’ll tell you when candidates reply or a hold needs confirming.', chips: [{ label: 'Start a new plan', on: () => planner.reset() }] });
    return e;
  }, [s, thinking]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------------- Plans overview (incl. a paused plan from an earlier session) ----------------
function Plans({ s, onStart }: { s: PlannerState; onStart: () => void }) {
  return (
    <section className="ds-sheet" aria-labelledby="plans-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="plans-h" className="voice t24" style={{ margin: 0 }}>{s.goal ? 'Your plans' : 'No plan is running. One is paused from Tuesday.'}</h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
        {s.goal && <li style={row}><Glyph k={s.status === 'COMPLETED' ? 'full' : 'partial'} /><div><b>{s.goal}</b><p className="t14 muted" style={{ margin: 0 }}>{statusWord(s)} · {s.tasks.filter((t) => t.state === 'DONE').length} of {s.tasks.filter((t) => t.state !== 'SKIPPED').length} tasks done</p></div><span /></li>}
        <li style={row}><Glyph k={s.earlier.status === 'PAUSED' ? 'partial' : 'full'} /><div><b>{s.earlier.title}</b><p className="t14 muted" style={{ margin: 0 }}>{s.earlier.status === 'PAUSED' ? `Paused ${s.earlier.at}` : 'Resumed today'} · {s.earlier.progress}</p></div>
          {s.earlier.status === 'PAUSED' ? <button type="button" className="ds-btn" onClick={() => planner.resumeEarlier()}>Resume</button> : <span className="ds-tag" data-k="ok">Complete</span>}</li>
      </ul>
      {!s.goal && <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={onStart}>Plan “{GOAL}”</button><span className="t14 muted">Or type any goal to Q.</span></div>}
    </section>
  );
}
const row = { display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 12, alignItems: 'center', padding: '14px 0', borderTop: '1px solid var(--rule)' } as const;

const glyphOf = (t: Task) => (t.state === 'DONE' ? 'full' : t.state === 'SKIPPED' ? 'unclear' : t.state === 'RUNNING' || t.state === 'WAITING_INPUT' ? 'partial' : 'none') as 'full' | 'unclear' | 'partial' | 'none';
const stateWord = (t: Task) => ({ BLOCKED: 'Waits for earlier steps', READY: 'Ready', RUNNING: `Running · ${t.done}/${t.total}`, WAITING_INPUT: 'Needs your decision', DONE: 'Done', SKIPPED: 'Skipped by you' })[t.state];

// ---------------- Plan graph: columns are dependency depth ----------------
function PlanGraph({ s }: { s: PlannerState }) {
  const depth = (t: Task): number => (t.deps.length ? 1 + Math.max(...t.deps.map((d) => depth(s.tasks.find((x) => x.id === d)!))) : 0);
  const cols = [0, 1, 2].map((d) => s.tasks.filter((t) => depth(t) === d));
  if (!s.tasks.length) return <section className="ds-sheet" style={{ display: 'grid', gap: 12 }}><div className="ds-skeleton" style={{ height: 24, width: '50%' }} /><div className="ds-skeleton" style={{ height: 120 }} /><p className="t14 muted" style={{ margin: 0 }}>Q drafts the plan after your answer.</p></section>;
  return (
    <section className="ds-sheet" aria-labelledby="graph-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="graph-h" className="voice t24" style={{ margin: 0 }}>Search first, then evidence, then three things at once.</h2>
      <p className="t14 muted" style={{ margin: 0 }}>Steps marked “needs your yes” prepare an action; nothing is sent, booked or contacted until you approve it.</p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 16, alignItems: 'start' }}>
        {cols.map((c, ci) => (
          <li key={ci} style={{ display: 'grid', gap: 10 }}>
            <span className="lab">{['1 · Runs first', '2 · Then', '3 · In parallel'][ci]}</span>
            {c.map((t) => (
              <motion.article key={t.id} layout style={{ border: `1px solid ${t.state === 'RUNNING' ? 'var(--gold)' : 'var(--rule)'}`, borderRadius: 14, padding: 14, display: 'grid', gap: 8, background: t.state === 'SKIPPED' ? 'var(--wash)' : 'var(--sheet)', opacity: t.state === 'SKIPPED' ? 0.7 : 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Glyph k={glyphOf(t)} /><b style={{ fontSize: 15 }}>{t.label}</b></div>
                <span className="t14 muted">{AGENTS[t.agent].name} · <code style={{ fontFamily: 'var(--data)', fontSize: 12 }}>{t.tool}</code></span>
                <Bar done={t.done} total={t.total} />
                <span className="t14">{stateWord(t)}</span>
                {t.approval && <span className="ds-tag" data-k="busy">Needs your yes · {t.approval.toLowerCase()}</span>}
                {t.optional && (s.status === 'PLANNED') && <button type="button" className="ds-filter" aria-pressed={t.state !== 'SKIPPED'} onClick={() => planner.toggleOptional(t.id)}>{t.state === 'SKIPPED' ? 'Include this step' : 'Included · skip it'}</button>}
              </motion.article>
            ))}
          </li>
        ))}
      </ol>
      {s.status === 'PLANNED' && <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => planner.start()}>Start the plan</button><span className="t14 muted">Uses 3 approved sources. Estimated cost: none (simulated budget).</span></div>}
    </section>
  );
}
function Bar({ done, total }: { done: number; total: number }) {
  return (
    <span role="img" aria-label={`${done} of ${total} units`} style={{ height: 6, background: 'var(--wash)', borderRadius: 3, overflow: 'hidden', display: 'block' }}>
      <motion.span initial={false} animate={{ width: `${(done / total) * 100}%` }} transition={{ duration: 0.25, ease: 'easeOut' }} style={{ display: 'block', height: '100%', background: done >= total ? 'var(--ink-2)' : 'var(--gold)' }} />
    </span>
  );
}

// ---------------- Agent lanes (SC-131) ----------------
function Lanes({ s }: { s: PlannerState }) {
  const narrow = useNarrow();
  const tasks = s.tasks.filter((t) => t.state !== 'SKIPPED');
  const t1 = s.tasks.find((t) => t.id === 't1');
  return (
    <section className="ds-sheet" aria-labelledby="lanes-h" style={{ display: 'grid', gap: 16 }}>
      <h2 id="lanes-h" className="voice t24" style={{ margin: 0 }}>{s.status === 'COMPLETED' ? 'Every agent has finished.' : s.status === 'WAITING_INPUT' ? 'Search is waiting for your decision. Nothing else is lost.' : s.status === 'PAUSED' ? 'Paused. Every finished unit is kept.' : (() => { const r = tasks.filter((t) => t.state === 'RUNNING').length, d = tasks.filter((t) => t.state === 'DONE').length; return `${r} ${r === 1 ? 'agent' : 'agents'} working, ${d} finished.`; })()}</h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
        {tasks.map((t) => {
          const last = [...s.log].reverse().find((l) => l.agent === t.agent);
          return (
            <li key={t.id} style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(140px, 200px) 1fr', gap: 16, padding: '14px 0', borderTop: '1px solid var(--rule)', alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: 4 }}><b style={{ fontSize: 15 }}>{AGENTS[t.agent].name}</b><span className="t14 muted">{AGENTS[t.agent].does}</span></div>
              <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><span className="t14">{t.label}</span><span className={`ds-tag`} data-k={t.state === 'DONE' ? 'ok' : t.state === 'WAITING_INPUT' ? 'warn' : t.state === 'RUNNING' ? 'busy' : undefined}>{stateWord(t)}</span></div>
                <Bar done={t.done} total={t.total} />
                {t.id === 't1' && t1?.sources && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} aria-label="Sources">
                    {t1.sources.map((x) => <span key={x.name} className="ds-tag" data-k={x.status === 'OK' ? undefined : x.status === 'SKIPPED' ? undefined : 'warn'}>{x.name} · {({ OK: 'ok', RATE_LIMITED: 'rate limited, retrying', NOT_CONNECTED: 'not connected', SKIPPED: 'skipped', RETRYING: 'retrying' })[x.status]} <span className="sr">(simulated)</span></span>)}
                  </div>
                )}
                {last && <p className="t14 muted" style={{ margin: 0 }}>{last.text}</p>}
                {t.question && (
                  <div className="ds-banner" data-k="warn" style={{ gridTemplateColumns: 'auto 1fr' }}><Glyph k="unclear" /><span>{t.question.prompt}</span>
                    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', gridColumn: '1 / -1' }}>{t.question.options.map((o, i) => <button key={o} type="button" className={`ds-btn ${i === 0 ? 'primary' : ''}`} onClick={() => planner.answerQuestion(t.id, o)}>{o}</button>)}</span></div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 32 }}>Activity and tool calls ({s.log.length})</summary>
        <ol style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
          {[...s.log].reverse().map((l) => <li key={l.id} className="t14" style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}><span className="lab">{l.agent === 'q' ? 'Q' : AGENTS[l.agent].name.split(' ')[0]} · {l.kind}</span><span>{l.text}</span></li>)}
        </ol>
      </details>
    </section>
  );
}

function Findings({ s }: { s: PlannerState }) {
  return (
    <section className="ds-sheet" aria-labelledby="find-h" style={{ display: 'grid', gap: 12 }}>
      <h2 id="find-h" className="voice t24" style={{ margin: 0 }}>{s.findings.filter((f) => f.strength === 'strong').length} strong matches so far, each checked at the source.</h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {s.findings.map((f) => <motion.li key={f.who} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={row}><Glyph k={f.strength === 'strong' ? 'verified' : 'partial'} title={f.strength === 'strong' ? 'Verified' : 'Partial'} /><div><b>{f.who}</b><p className="t14 muted" style={{ margin: 0 }}>{f.note}</p></div><span /></motion.li>)}
      </ul>
      <p className="t14 muted" style={{ margin: 0 }}>The full comparison is in People; this list updates while the evidence agent works.</p>
    </section>
  );
}

// ---------------- Handoff approval center (SC-132) ----------------
function Approvals({ s }: { s: PlannerState }) {
  const groups: [Approval['kind'], string][] = [['MESSAGE', 'Messages'], ['CALENDAR_HOLD', 'Calendar holds'], ['REFERENCE_REQUEST', 'Reference requests']];
  const waiting = s.approvals.filter((a) => a.state === 'WAITING');
  return (
    <section className="ds-sheet" aria-labelledby="ap-h" style={{ display: 'grid', gap: 18 }}>
      <h2 id="ap-h" className="voice t24" style={{ margin: 0 }}>{waiting.length ? `${waiting.length} actions are ready. None has happened yet.` : 'Everything is decided. Receipts below.'}</h2>
      <p className="t14 muted" style={{ margin: 0 }}>Each card says exactly what will happen if you approve it. Kora’s policy is “approve each send”, so there is no bulk send without reading.</p>
      {groups.map(([k, label]) => {
        const list = s.approvals.filter((a) => a.kind === k);
        if (!list.length) return null;
        return (
          <div key={k} style={{ display: 'grid', gap: 10 }}>
            <h3 className="lab" style={{ margin: 0 }}>{label}</h3>
            {list.map((a) => (
              <motion.article key={a.id} layout style={{ border: '1px solid var(--rule)', borderRadius: 14, padding: 16, display: 'grid', gap: 8, background: a.state === 'WAITING' ? 'var(--sheet)' : 'var(--paper)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><b>{a.title}</b>
                  <span className="ds-tag" data-k={a.state === 'APPROVED' ? 'ok' : a.state === 'REJECTED' ? undefined : 'busy'}>{a.state === 'WAITING' ? 'Waiting for you' : a.state === 'APPROVED' ? 'Approved · sent (simulated)' : 'Declined'}</span></div>
                <p className="ds-quote">{a.preview}</p>
                <p className="t14" style={{ margin: 0 }}><span className="muted">If you approve: </span>{a.effect}</p>
                {a.receipt && <p className="t14 muted" style={{ margin: 0 }}>Receipt <code style={{ fontFamily: 'var(--data)' }}>{a.receipt}</code> · simulated provider</p>}
                {a.state === 'WAITING' && <div className="ds-actions"><button type="button" className="ds-btn primary" onClick={() => planner.decide(a.id, 'APPROVED')}>Approve</button><button type="button" className="ds-btn quiet" onClick={() => planner.decide(a.id, 'REJECTED')}>Decline</button></div>}
              </motion.article>
            ))}
          </div>
        );
      })}
    </section>
  );
}
