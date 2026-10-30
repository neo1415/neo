// Live cards inside Q's replies (global thread). The reply says the finding in a sentence; the card shows the artifact
// itself, read live from the store, with one way to open it on the canvas. The voice card is MO-004/MO-005: Q speaks
// (simulated, captions only) and stops the moment the person types, taps the microphone, presses Stop or says anything.
import { useEffect } from 'react';
import { actorOf, useWorld } from '../../mock/world';
import { registerRef } from '../../q/refs';
import { runAction } from '../../q/core/engine';
import { QMark } from '../../ds/QMark';
import { Link } from '../../ui/router';
import { qt } from '../../state/areas/q-tools';
import { KIND_WORD, amplitude, artOf, canOpen, freshness, latestVoice, orgName, sourcesFor, spokenIndex, voiceState, wordsOf } from './model';
import { ArtifactBody, useTick } from './views';
import { ConflictPanel } from './pages';
import './q-tools.css';

const act = (op: string, args: Record<string, unknown> = {}) => void runAction({ label: op, act: { t: 'do', op, args } });
const pathOf = (kind: string, id: string) => kind === 'BROWSE' ? `/q/browse/${id}` : kind === 'DOWNLOAD' ? '/q/downloads' : `/q/artifacts/${id}`;

function ArtCard({ id }: { id: string }) {
  const w = useWorld((x) => x); const a = actorOf(w);
  const x = artOf(w, id);
  // A refusal is said in Q's words; an empty "not made" card would only repeat it.
  if (!x || !canOpen(a, x) || x.denied) return null;
  return (
    <div className="hire-b-qcard qt-qcard" role="group" aria-label={`${KIND_WORD[x.kind]}: ${x.title}`}>
      <div className="hire-b-qcard-head"><span className="lab">{KIND_WORD[x.kind]}{x.denied ? ' · not made' : ''}</span><Link to={pathOf(x.kind, x.id)} className="qt-open">Open</Link></div>
      {!x.denied && <b className="qt-qcard-title">{x.title}</b>}
      <ArtifactBody w={w} art={x} compact />
    </div>
  );
}

function SourcesCard({ id }: { id: string }) {
  const w = useWorld((x) => x); const a = actorOf(w);
  const art = id === 'all' ? null : artOf(w, id);
  const list = sourcesFor(w, a).filter((s) => !art || s.usedIn.includes(art.id));
  if (!list.length) return null;
  return (
    <div className="hire-b-qcard qt-qcard" role="group" aria-label="Sources Q used">
      <div className="hire-b-qcard-head"><span className="lab">Sources{art ? ` · ${art.title}` : ''}</span><Link to="/q/sources" className="qt-open">All sources</Link></div>
      <ul className="qt-srclist">{list.map((s) => <li key={s.id}><b>{s.title}</b><span className="t14 muted">{freshness(w, s).word} · {s.licence} · {s.visibility === 'TEAM' ? `${orgName(w, a.orgId)} can see it` : 'only you'}</span></li>)}</ul>
    </div>
  );
}

function ConflictCard() {
  const w = useWorld((x) => x); const a = actorOf(w);
  return <div className="hire-b-qcard qt-qcard"><ConflictPanel w={w} a={a} /></div>;
}

function VoiceCard({ id }: { id: string }) {
  const w = useWorld((x) => x); const a = actorOf(w);
  const v = qt(w).voice.find((x) => x.id === id && x.owner === a.id);
  const latest = latestVoice(w, a)?.id === id;
  const state = v ? voiceState(v) : 'DONE';
  useTick(!!v && state === 'SPEAKING', 120);
  const speaking = !!v && latest && state === 'SPEAKING';
  // MO-005: anything the person starts to say interrupts Q at once (typing, the microphone, Escape, or a new message).
  useEffect(() => {
    if (!speaking) return;
    const stop = (reason: string) => act('qt.voice.stop', { id, reason });
    const onInput = (e: Event) => { if ((e.target as HTMLElement)?.id === 'q-ask') stop('You started typing'); };
    const onClick = (e: Event) => { if ((e.target as HTMLElement)?.closest?.('button[aria-label="Speak to Q"]')) stop('You started speaking'); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') stop('You pressed Escape'); };
    document.addEventListener('input', onInput, true); document.addEventListener('click', onClick, true); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('input', onInput, true); document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey); };
  }, [speaking, id]);
  const thread = w.q.threads[a.id] ?? [];
  const spokeOver = speaking && thread.some((m) => m.who === 'me' && m.at > v!.startedAt && (!v!.resumedAt || m.at > v!.resumedAt));
  useEffect(() => { if (spokeOver) act('qt.voice.stop', { id, reason: 'You said something' }); }, [spokeOver, id]);
  if (!v) return null;
  const words = wordsOf(v.text); const i = spokenIndex(v);
  const mood = state === 'SPEAKING' ? 'speaking' : state === 'INTERRUPTED' ? 'listening' : 'done';
  const line = state === 'SPEAKING' ? 'Speaking · simulated voice, captions only' : state === 'INTERRUPTED' ? `Stopped · listening to you (${v.stopReason?.toLowerCase() ?? 'you stopped me'})` : 'Finished speaking';
  return (
    <div className="qt-voice" data-state={state} role="group" aria-label="Q speaking">
      <div className="qt-voice-head">
        <QMark mood={mood} level={state === 'SPEAKING' ? amplitude(words[Math.max(0, i - 1)] ?? '') : 0} size={30} title={line} />
        <span className="qt-voice-state" aria-live="polite">{line}</span>
        {speaking && <button type="button" className="ds-chip" onClick={() => act('qt.voice.stop', { id, reason: 'You pressed Stop' })}>Stop</button>}
        {latest && state === 'INTERRUPTED' && <button type="button" className="ds-chip go" onClick={() => act('qt.voice.resume', { id })}>Resume from there</button>}
      </div>
      <p className="qt-voice-cap" aria-live="off">{words.slice(Math.max(0, i - 24), i).join(' ')}{state === 'INTERRUPTED' && <span className="qt-voice-cut"> — stopped here</span>}</p>
      {state === 'INTERRUPTED' && <p className="t14 qt-voice-left">{words.length - i} words not said. Nothing was lost: the full answer is in the message above.</p>}
    </div>
  );
}

registerRef('qt.art', ArtCard);
registerRef('qt.sources', SourcesCard);
registerRef('qt.conflict', ConflictCard);
registerRef('qt.voice', VoiceCard);
