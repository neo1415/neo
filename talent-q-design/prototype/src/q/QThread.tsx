// The one Q conversation, beside every page. One thread per person, persisted in the store, so it follows
// them across pages, reloads, tabs and sessions. Proactive notes appear at the top with a reason, and
// can be acted on, snoozed or dismissed. Replies carry actions; live parts render from state.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QMark, moodOf, type QAgent } from '../ds/QMark';
import { EntryView, getPageTask, onPageTask, useSplit, useNarrow } from '../ds/Workspace';
import { actorOf, useWorld } from '../mock/world';
import type { QMsg, Suggestion } from '../state/domain';
import { isThinking, labelFor, onThinking, runAction, sendToQ, useQThread } from './core/engine';
import { useSuggestions } from './core/proactive';
import { opening } from './core/openers';
import { gatewayConfigured } from './core/engine';
import { refRenderer } from './refs';
import { arrive } from '../ds/motion';
import { useRoute } from '../ui/router';

export const usePageTask = () => useSyncExternalStore(onPageTask, getPageTask);
export function useQMood() {
  const thinking = useSyncExternalStore(onThinking, isThinking);
  const task = usePageTask();
  const w = useWorld((x) => ({ net: x.network, plan: x.planners[x.session.actor], frame: x.q.frames[x.session.actor] }));
  const planAgents: QAgent[] = w.plan?.status === 'RUNNING' ? w.plan.tasks.filter((t) => t.state === 'RUNNING').map((t) => ({ label: t.label, done: t.done, total: t.total })) : [];
  const agents = task?.agents?.some((a) => a.done < a.total) ? task.agents : planAgents;
  const mood = task?.mood && !thinking && w.net !== 'offline' && task.mood !== 'idle' ? task.mood : moodOf({ offline: w.net === 'offline', agents, thinking, waiting: !!w.frame?.awaiting || w.plan?.status === 'WAITING_INPUT' });
  return { mood, agents, thinking };
}

export function QThread({ onClose }: { onClose?: () => void }) {
  const msgs = useQThread();
  const actor = useWorld((w) => actorOf(w));
  const { path } = useRoute();
  const { mood, agents, thinking } = useQMood();
  const { setMode } = useSplit();
  const narrow = useNarrow();
  const sugg = useSuggestions();
  const task = usePageTask();
  const log = useRef<HTMLDivElement>(null);
  const [showLimits, setShowLimits] = useState(false);
  const [allSugg, setAllSugg] = useState(false);
  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs.length, thinking, sugg.length, task?.entries.length, task?.entries[task.entries.length - 1]?.text]);
  const lastQIdx = msgs.map((m) => m.who).lastIndexOf('q');
  const state = mood === 'working' ? `Working · ${agents.length} ${agents.length === 1 ? 'agent' : 'agents'}` : mood === 'thinking' ? 'Thinking' : mood === 'waiting' ? 'Waiting for you' : mood === 'offline' ? 'Offline · your messages will wait' : 'Ready';
  return (
    <aside className="ds-thread ink" aria-label="Conversation with Q">
      <div className="ds-thread-head">
        <QMark mood={mood} agents={agents} size={40} />
        <div className="state" aria-live="polite"><b>Q</b><span><span className="sr">Q status: </span>{state}</span></div>
        <button type="button" className="ds-qsim" aria-expanded={showLimits} onClick={() => setShowLimits(!showLimits)}>{gatewayConfigured() ? 'Model gateway' : 'Simulated Q'}</button>
        {narrow ? <button type="button" className="ds-iconbtn" aria-label="Close Q" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          : <button type="button" className="ds-iconbtn" aria-label="Collapse the conversation" onClick={() => setMode('collapsed')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>}
      </div>
      {showLimits && (
        <p className="t14" style={{ margin: 0, padding: '10px 20px', borderBottom: '1px solid var(--night-3)', color: 'var(--moon-2)' }}>
          {gatewayConfigured() ? 'Open-ended replies come from the configured model gateway; actions still go through Talent Q’s rules and approvals.' : 'This prototype’s Q understands imperfect language for the hiring and career tasks it was built for, using rules, not a language model. When it doesn’t understand, it says so. Sends, bookings and verifications are simulated.'}
        </p>
      )}
      <p className="ds-context" aria-live="polite"><span className="sr">Q can see: </span>On {labelFor(path)} · {actor.first}{actor.orgId ? ` · ${actor.orgId.replace('org_', '').replace(/^\w/, (c) => c.toUpperCase())}` : ''}</p>
      <div className="ds-log" ref={log} role="log" aria-label="Messages">
        <AnimatePresence initial={false}>
          {sugg.slice(0, allSugg ? sugg.length : 1).map((s) => <SuggestionCard key={s.id} s={s} />)}
        </AnimatePresence>
        {/* One card at a time keeps the conversation in view; the rest wait one tap away, most urgent first. The count is
            the true number and expanding shows every card, so nothing Q noticed is hidden without the person knowing. */}
        {sugg.length > 1 && <button type="button" className="ds-linkbtn ds-suggest-more" aria-expanded={allSugg} onClick={() => setAllSugg(!allSugg)}>{allSugg ? 'Show fewer' : `${sugg.length - 1} more thing${sugg.length > 2 ? 's' : ''} Q noticed`}</button>}
        {msgs.length === 0 && <Welcome shown={sugg.map((s) => s.subject)} />}
        {msgs.map((m, i) => <Msg key={m.id} m={m} live={!task && i >= lastQIdx - 1 && i >= msgs.length - 3} />)}
        {task && (
          <section aria-label={`Task: ${task.title}`} style={{ display: 'grid', gap: 18 }}>
            <div className="ds-taskhead"><span className="lab">In this task · {task.title}</span></div>
            {task.entries.map((e, i) => <EntryView key={e.id} e={e} latest={i === task.entries.length - 1} />)}
          </section>
        )}
        {thinking && <motion.p {...arrive} className="t14 ds-thinking" aria-live="polite"><QMark mood="thinking" size={22} />Reading what you said…</motion.p>}
      </div>
      <Composer />
    </aside>
  );
}

function Welcome({ shown }: { shown: string[] }) {
  // Context-aware opening (AD-B-01): one concrete thing on this page, one action, never the card above it.
  const w = useWorld((x) => x);
  const a = actorOf(w);
  const { path } = useRoute();
  const o = opening(w, a, path, shown);
  return (
    <div className="ds-q">
      <p className="say">{o.text}</p>
      {o.action && <div className="ds-next" role="group" aria-label="Suggested next step"><button type="button" className={`ds-chip ${o.action.primary ? 'go' : ''}`} onClick={() => void runAction(o.action!)}>{o.action.label}</button></div>}
    </div>
  );
}

function Msg({ m, live }: { m: QMsg; live: boolean }) {
  if (m.who === 'me') return <motion.p className="ds-me" {...arrive}>{m.text}</motion.p>;
  const R = m.ref ? refRenderer(m.ref.type) : undefined;
  // Never offer to open the page the person is already on (critique F5: duplicate actions).
  const here = useRoute().path;
  const acts = (m.actions ?? []).filter((a) => !(a.act.t === 'nav' && a.act.to === here));
  return (
    <motion.div className="ds-q" data-kind={m.kind} {...arrive}>
      {m.used && m.used.length > 0 && <div className="ds-used" aria-label="Context Q used">{m.used.map((u) => <span key={u}>{u}</span>)}</div>}
      {m.kind === 'refusal' && <span className="lab" style={{ color: 'var(--gold-light)' }}>Declined</span>}
      {m.kind === 'notice' && <span className="lab">Update</span>}
      <p className="say">{m.text}</p>
      {R && <R id={m.ref!.id} />}
      {m.why && <span className="ds-why"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="var(--gold-light)" /></svg>{m.why}</span>}
      {live && acts.length > 0 && (
        <div className="ds-next" role="group" aria-label="Suggested next steps">
          {acts.map((a) => <button key={a.label} type="button" className={`ds-chip ${a.primary ? 'go' : ''}`} onClick={() => void runAction(a)}>{a.label}</button>)}
        </div>
      )}
    </motion.div>
  );
}

function SuggestionCard({ s }: { s: Suggestion }) {
  const [why, setWhy] = useState(false);
  return (
    <motion.div className="ds-suggest" layout {...arrive} role="note" aria-label="Q noticed">
      <span className="lab" style={{ color: 'var(--gold-light)' }}>Q noticed</span>
      <p style={{ margin: 0 }}>{s.text}</p>
      {why && <p className="t14" style={{ margin: 0, color: 'var(--moon-2)' }}>{s.why}</p>}
      <div className="ds-next">
        {s.actions.map((a) => <button key={a.label} type="button" className={`ds-chip ${a.primary ? 'go' : ''}`} onClick={() => { void runAction({ label: 'done', act: { t: 'do', op: 'suggestion.done', args: { id: s.id } } }); void runAction(a); }}>{a.label}</button>)}
      </div>
      <div className="ds-suggest-foot">
        <button type="button" className="ds-linkbtn" aria-expanded={why} onClick={() => setWhy(!why)}>{why ? 'Hide why' : 'Why am I seeing this?'}</button>
        <span className="sp" />
        <button type="button" className="ds-chip quiet" onClick={() => void runAction({ label: 'Later', act: { t: 'do', op: 'suggestion.snooze', args: { id: s.id, hours: 24 } } })}>Later</button>
        <button type="button" className="ds-chip quiet" aria-label={`Dismiss: ${s.text}`} onClick={() => void runAction({ label: 'Dismiss', act: { t: 'do', op: 'suggestion.dismiss', args: { id: s.id } } })}>Dismiss</button>
      </div>
    </motion.div>
  );
}

// ---------------- Composer: text and voice (with honest fallback) ----------------
type Rec = { start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; interimResults: boolean; lang: string };
function Composer() {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const prefs = useWorld((w) => w.q.prefs[w.session.actor]);
  const offline = useWorld((w) => w.network === 'offline');
  const rec = useRef<Rec | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const f = (e: Event) => { const d = (e as CustomEvent<string>).detail; if (d) setText(d); input.current?.focus(); }; window.addEventListener('tq-compose', f); return () => window.removeEventListener('tq-compose', f); }, []);
  const send = () => { const t = text.trim(); if (!t) return; void sendToQ(t); setText(''); };
  const voice = () => {
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!prefs?.voice) { setVoiceNote('Voice is turned off for you. Type here, or turn it on in Settings.'); return; }
    if (!Ctor) { setVoiceNote('Voice isn’t available on this device or browser. You can type instead; short answers are fine.'); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new Ctor(); r.lang = 'en-NG'; r.interimResults = true;
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
    r.onend = () => setListening(false);
    r.onerror = (e) => { setListening(false); setVoiceNote(e.error === 'not-allowed' ? 'Microphone permission was declined. You can type instead.' : 'Voice stopped. You can type instead.'); };
    rec.current = r; setListening(true); setVoiceNote(''); r.start();
  };
  return (
    <div style={{ margin: '8px 16px 16px', display: 'grid', gap: 6 }}>
      {voiceNote && <p className="t14" role="status" style={{ margin: 0, color: 'var(--moon-2)' }}>{voiceNote}</p>}
      <form className="ds-compose" style={{ margin: 0 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label htmlFor="q-ask" className="sr">Message Q</label>
        <input ref={input} id="q-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder={offline ? 'Offline: Q will read this when you reconnect' : listening ? 'Listening…' : 'Ask Q anything, in your own words'} autoComplete="off" />
        <button type="button" className={`ds-send ${listening ? 'go' : ''}`} aria-pressed={listening} aria-label={listening ? 'Stop voice input' : 'Speak to Q'} onClick={voice}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
        </button>
        <button className={`ds-send ${text.trim() ? 'go' : ''}`} type="submit" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
    </div>
  );
}
/** Pages can prefill the composer (e.g. "Ask Q about this candidate"). */
export const prefillQ = (text: string) => window.dispatchEvent(new CustomEvent('tq-compose', { detail: text }));
