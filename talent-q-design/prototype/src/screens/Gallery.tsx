// Component gallery: every primitive and its states, rendered from the same tokens the screens use.
import { useState } from 'react';
import { QPresence, Q_STATE_LABEL, type QState } from '../q/QPresence';
import { Banner, Button, Choice, Composer, EvidenceBadge, Field, Label, QSays, RunSteps, Segmented, Sim, Switch, toast } from '../ui/kit';
import type { EvidenceState, RunStep } from '@contracts';

const STATES: QState[] = ['idle', 'listening', 'thinking', 'working', 'waiting', 'done', 'error', 'offline'];
const EV: EvidenceState[] = ['VERIFIED_CAPABILITY', 'EVIDENCED', 'NOT_EVIDENCED', 'EVIDENCE_OUTDATED', 'BELOW_TARGET_ON_ASSESSMENT', 'REQUIREMENT_UNCLEAR'];
const SWATCHES = ['bg', 'surface', 'surface-raised', 'line', 'line-strong', 'text', 'text-muted', 'text-subtle', 'q', 'q-strong', 'action', 'ok', 'warn', 'risk', 'info', 'paper'];
const STEPS: RunStep[] = [
  { stepId: 'a', stage: 'APPLYING_POLICY', label: 'Applying Kora Pay’s rules', done: 3, total: 3, result: 'DONE' },
  { stepId: 'b', stage: 'SEARCHING_SOURCES', label: 'Searching 3 permitted sources', done: 3, total: 3, result: 'DONE', failure: { code: 'RATE_LIMITED', recoverable: true, message: 'One source is rate-limiting us.' } },
  { stepId: 'c', stage: 'READING_PROFILES', label: 'Reading profiles', done: 14, total: 24, result: 'RUNNING' },
  { stepId: 'd', stage: 'CHECKING_EVIDENCE', label: 'Checking evidence', done: 0, total: null, result: 'HELD' },
];

export function Gallery() {
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [sw, setSw] = useState(true);
  const [ch, setCh] = useState('one');
  const [p, setP] = useState(0.4);
  return (
    <main className="main stack gap-10">
      <header className="stack gap-3"><span className="t-label q-text">Design system</span><h1 className="t-display">Components</h1><p className="muted measure">Every part of the interface, in each of its states. Tokens: talent-q-design/tokens/tokens.json.</p></header>

      <section className="specimen" aria-labelledby="g-q"><h2 id="g-q" className="t-title">Q presence</h2>
        <div className="row wrap gap-8">{STATES.map((s) => <div key={s} className="stack gap-2" style={{ alignItems: 'center', width: 120 }}><QPresence state={s} size={64} progress={p} level={0.5} /><span className="t-caption" style={{ textAlign: 'center' }}>{s}</span></div>)}</div>
        <label className="row gap-3 t-caption">Working progress<input type="range" min={0} max={1} step={0.05} value={p} onChange={(e) => setP(Number(e.target.value))} /></label>
        <p className="t-caption">Labels for assistive tech: {STATES.map((s) => Q_STATE_LABEL[s]).join(' · ')}</p>
      </section>

      <section className="specimen" aria-labelledby="g-c"><h2 id="g-c" className="t-title">Colour tokens</h2>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>{SWATCHES.map((s) => <div key={s} className="swatch"><div className="swatch-chip" style={{ background: `var(--color-${s})` }} /><span className="t-mono">--color-{s}</span></div>)}</div>
      </section>

      <section className="specimen" aria-labelledby="g-t"><h2 id="g-t" className="t-title">Type</h2>
        <p className="t-hero">Hero · Newsreader 52</p><p className="t-display">Display · Newsreader 40</p><p className="t-heading">Heading · Newsreader 28</p><p className="t-title">Title · Geist 22</p>
        <p className="t-lead">Lead · Geist 18. Q’s spoken lines use the serif.</p><p>Body · Geist 16, the default for all reading text.</p><p className="t-caption">Caption · 14</p><p className="t-label">Label · Geist Mono 12, the minimum size</p>
      </section>

      <section className="specimen" aria-labelledby="g-b"><h2 id="g-b" className="t-title">Buttons</h2>
        <div className="row wrap gap-3"><Button variant="primary">Approve and send</Button><Button>Edit</Button><Button variant="quiet">Not now</Button><Button variant="danger">Stop messages</Button><Button variant="primary" disabled>Disabled</Button><Button compact>Compact</Button></div>
      </section>

      <section className="specimen" aria-labelledby="g-f"><h2 id="g-f" className="t-title">Fields and choices</h2>
        <div className="grid-2"><Field label="Role title" defaultValue="Senior Backend Engineer" help="Help text explains, it doesn’t repeat the label." /><Field label="Work email" defaultValue="ada@" error="Enter a full email address, like ada@korapay.example" /></div>
        <div className="row wrap gap-6"><Segmented label="Example" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'Typing' }, { value: 'b', label: 'Form' }, { value: 'c', label: 'Voice' }]} /><Switch label="Must have" checked={sw} onChange={setSw} /></div>
        <div className="stack gap-2" style={{ maxWidth: 480 }}><Choice name="g" value="one" checked={ch === 'one'} onChange={setCh} title="Approve each send" detail="Q sends only after you approve." /><Choice name="g" value="two" checked={ch === 'two'} onChange={setCh} title="Draft only" /></div>
      </section>

      <section className="specimen" aria-labelledby="g-e"><h2 id="g-e" className="t-title">Evidence states</h2>
        <div className="row wrap gap-6">{EV.map((e) => <EvidenceBadge key={e} state={e} />)}</div>
        <p className="t-caption">Each state has its own shape, so colour is never the only signal.</p>
      </section>

      <section className="specimen" aria-labelledby="g-r"><h2 id="g-r" className="t-title">Run steps</h2><div style={{ maxWidth: 560 }}><RunSteps steps={STEPS} /></div></section>

      <section className="specimen" aria-labelledby="g-m"><h2 id="g-m" className="t-title">Conversation</h2>
        <div className="stack gap-6" style={{ maxWidth: 640 }}><p className="msg-me">Who should I talk to first?</p><QSays text="Tobi first. His reconciliation work is closest to the hardest requirement." used={[{ kind: 'MEMORY', label: 'Your meeting hours' }, { kind: 'POLICY', label: 'Outreach tone v2' }, { kind: 'INFERENCE', label: 'Fit per requirement' }]} /><Composer onSend={(t) => toast(`Sent: ${t}`)} suggestion="Who should I talk to first?" /></div>
      </section>

      <section className="specimen" aria-labelledby="g-s"><h2 id="g-s" className="t-title">States: offline, error, partial, recovery, empty</h2>
        <div className="stack gap-3" style={{ maxWidth: 720 }}>
          <Banner tone="warn" title="You’re offline">Q keeps working. You’ll catch up from your last step when you reconnect.</Banner>
          <Banner tone="risk" title="Q couldn’t finish this" action={<Button compact>Try again</Button>}>Your calendar is not connected, so Q can’t see when you’re free.</Banner>
          <Banner tone="info" title="Partial results">2 of 3 sources searched. One is rate-limited; Q will retry tonight.</Banner>
          <Banner tone="ok" title="Recovered">Reconnected. Caught up on 4 steps.</Banner>
          <div className="panel stack gap-2"><Label>Needs you · 0</Label><p className="muted">Nothing is waiting on you. When Q needs a yes, it appears here first.</p></div>
          <p><Sim /> marks anything a real provider would do.</p>
        </div>
      </section>

      <section className="specimen paper panel" aria-labelledby="g-p"><h2 id="g-p" className="t-title">Paper surface (artifacts)</h2><p>Artifacts Q makes sit on paper in both themes, for long reading and printing.</p><div className="row gap-3"><Button variant="primary">Primary on paper</Button><EvidenceBadge state="EVIDENCED" /><EvidenceBadge state="EVIDENCE_OUTDATED" /></div></section>
    </main>
  );
}
