// P11 · SC-099 text, SC-100 form, SC-101 voice interview (same engine, same state); SC-098 mode choice;
// SC-105 pause/resume; SC-168 practice with coaching; SC-173 private practice → evidence (explicit consent).
import { useMemo, useState } from 'react';
import type { PracticeAttempt } from '@contracts';
import { log, now, uid, update, useWorld } from '../mock/world';
import { QPresence } from '../q/QPresence';
import { Banner, Button, Composer, Label, MeSays, QSays, Segmented, Sim, TextArea, toast } from '../ui/kit';
import { IPause, IPlay } from '../ui/icons';
import { Link, useRoute } from '../ui/router';

type Mode = 'TEXT' | 'FORM' | 'VOICE';
interface Q { id: string; text: string; locked?: boolean; followUp: string; cue: RegExp }

const INTERVIEW: Q[] = [
  { id: 'q1', text: 'Walk me through how your reconciliation service catches a mismatch, step by step.', followUp: 'What happens in the first minute after a mismatch is found? Who or what is told, and how?', cue: /\b(first|then|alert|page|queue|job|minute|seconds?)\b/i },
  { id: 'q2', text: 'How do you make a payment request safe to retry?', locked: true, followUp: 'Where is the idempotency key stored, and for how long?', cue: /\b(key|store|redis|table|ttl|hours?|days?)\b/i },
  { id: 'q3', text: 'Tell me about an incident you led. What did you do in the first ten minutes?', followUp: 'What did you change afterwards so it wouldn’t happen again?', cue: /\b(after|changed|post-?mortem|fix|added|prevent)\b/i },
];
const PRACTICE: Record<string, Q> = {
  c_sql_window: { id: 'p1', text: 'You have a table of app sessions (user_id, started_at). How would you find, for each user, how many days passed between their first and second session?', followUp: 'Which window function would you use, and how would you partition it?', cue: /\b(lag|lead|row_number|partition|over)\b/i },
  c_writing: { id: 'p1', text: 'In three sentences, tell a product manager what your final-year project found and what they should do about it.', followUp: 'What is the one number you would put first?', cue: /\d/ },
  c_prospecting: { id: 'p1', text: 'I’m a busy operations manager. You have 30 seconds on the phone. Go.', followUp: 'I say “we already have a supplier”. What do you say next?', cue: /\b(question|curious|how do you|what if|ask)\b/i },
  c_crm: { id: 'p1', text: 'A lead replied “maybe next quarter”. What do you record in the CRM, and what happens next?', followUp: 'When exactly will you follow up, and how will you remember?', cue: /\b(task|reminder|date|stage|follow)\b/i },
  c_oncall: { id: 'p1', text: 'Describe the March outage as if writing the first paragraph of a blameless review.', followUp: 'What was the impact, in numbers?', cue: /\d/ },
};

export function Interview() {
  const { query } = useRoute();
  const practiceId = query.get('practice');
  const w = useWorld((x) => x);
  const persona = w.persona;
  const questions = useMemo(() => (practiceId && PRACTICE[practiceId] ? [PRACTICE[practiceId]] : INTERVIEW), [practiceId]);
  const isPractice = !!practiceId;
  const [mode, setMode] = useState<Mode>('TEXT');
  const [idx, setIdx] = useState(0);
  const [askedFollow, setAskedFollow] = useState(false);
  const [log2, setLog] = useState<{ who: 'q' | 'me'; text: string; locked?: boolean }[]>(() => [{ who: 'q', text: questions[0].text, locked: questions[0].locked }]);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ situation: '', action: '', result: '' });
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const q = questions[idx];

  const answer = (text: string) => {
    const next = [...log2, { who: 'me' as const, text }];
    // Adaptive: one follow-up when the answer lacks the concrete detail this question needs.
    if (!askedFollow && (!q.cue.test(text) || text.split(/\s+/).length < 18)) {
      setAskedFollow(true);
      setLog([...next, { who: 'q', text: q.followUp }]);
      return;
    }
    setAskedFollow(false);
    if (idx + 1 < questions.length) {
      const nq = questions[idx + 1];
      setIdx(idx + 1);
      setLog([...next, { who: 'q', text: nq.text, locked: nq.locked }]);
    } else {
      setLog(next);
      setDone(true);
      if (isPractice) {
        const strong = q.cue.test(next.filter((m) => m.who === 'me').map((m) => m.text).join(' '));
        setAttempt({ attemptId: uid('att'), competencyId: practiceId!, mode, rubricVersion: 'practice-2026.2', level: strong ? 3 : 2, at: now(), visibility: 'PRIVATE_PRACTICE',
          feedback: [
            { criterion: 'Concrete steps', observed: strong ? 'You named the specific technique.' : 'Your answer stayed general.', improve: strong ? 'Say why you chose it over the alternative.' : 'Name the exact function or step you would use.' },
            { criterion: 'Clarity', observed: 'Easy to follow.', improve: 'Lead with the answer, then the detail.' },
          ] });
      } else update((d) => { d.interview.done = true; log(d, 'Candidate', 'Tobi finished the Q-led interview; answers sent for human review'); });
    }
  };

  const fromForm = () => { const t = `Situation: ${form.situation}\nWhat I did: ${form.action}\nResult: ${form.result}`; setForm({ situation: '', action: '', result: '' }); answer(t); };

  return (
    <main className="main stack gap-8" style={{ maxWidth: 820 }}>
      <div className="row between wrap gap-4">
        <div className="row gap-4">
          <QPresence state={paused ? 'waiting' : done ? 'done' : mode === 'VOICE' ? 'listening' : 'idle'} size={56} level={0.4} />
          <div className="stack"><span className="t-label q-text">{isPractice ? 'Private practice · only you see this' : 'Kora Pay · Senior Backend · interview with Q'}</span>
            <h1 className="t-heading">{isPractice ? 'Practice' : `Question ${idx + 1} of ${questions.length}`}</h1></div>
        </div>
        <Segmented<Mode> label="Answer by" value={mode} onChange={setMode} options={[{ value: 'TEXT', label: 'Typing' }, { value: 'FORM', label: 'Form' }, { value: 'VOICE', label: 'Voice' }]} />
      </div>

      {!isPractice && idx === 0 && log2.length === 1 && <p className="muted measure">Q asks the questions Kora Pay agreed. You can switch between typing, a form and voice at any time without losing your place. A person at Kora Pay reviews your answers; Q does not decide.</p>}

      <div className="stack gap-6" role="log" aria-label="Interview conversation">
        {log2.map((m, i) => m.who === 'me' ? <MeSays key={i} text={m.text} /> : (
          <div key={i} className="stack gap-1">{m.locked && <span className="t-label" style={{ marginLeft: 17 }}>Required by Kora Pay</span>}<QSays text={m.text} /></div>
        ))}
      </div>

      {paused && <Banner tone="info" title="Paused" action={<Button compact variant="primary" onClick={() => setPaused(false)}><IPlay width={16} />Resume</Button>}>Your answers so far are saved. You can come back on any device within 48 hours.</Banner>}

      {!done && !paused && (
        <div className="stack gap-3">
          {mode === 'FORM' ? (
            <form className="stack gap-4 panel" onSubmit={(e) => { e.preventDefault(); fromForm(); }}>
              <TextArea label="The situation" value={form.situation} onChange={(v) => setForm({ ...form, situation: v })} rows={2} />
              <TextArea label="What you did, step by step" value={form.action} onChange={(v) => setForm({ ...form, action: v })} rows={3} />
              <TextArea label="The result" value={form.result} onChange={(v) => setForm({ ...form, result: v })} rows={2} />
              <Button type="submit" variant="primary" disabled={!form.action.trim()}>Send answer</Button>
            </form>
          ) : (
            <Composer onSend={answer} label="Your answer" placeholder={mode === 'VOICE' ? 'Press the microphone and speak, or type' : 'Type your answer'}
              suggestion={mode === 'VOICE' ? 'First the nightly job compares settlements to the ledger, then it alerts the on-call engineer within a minute' : undefined} />
          )}
          <div className="row gap-3 wrap">
            <Button variant="quiet" compact onClick={() => setPaused(true)}><IPause width={16} />Pause</Button>
            {mode === 'VOICE' && <span className="t-caption">Captions appear as you speak. Voice is optional; typing gives the same interview.</span>}
          </div>
        </div>
      )}

      {done && !isPractice && (
        <Banner tone="ok" title="Done. Thank you, Tobi.">Your answers go to Kora Pay’s panel. You’ll get feedback on what went well and what to work on, but not the panel’s private notes. <Link to="/c/career">Back to your career space</Link></Banner>
      )}

      {done && attempt && (
        <section className="panel stack gap-5" aria-labelledby="fb-h">
          <div className="row between wrap gap-3"><h2 id="fb-h" className="t-title">Feedback</h2><span className="tag">Level {attempt.level} of 5 · rubric {attempt.rubricVersion}</span></div>
          <ul className="stack gap-4">{attempt.feedback.map((f) => <li key={f.criterion} className="stack gap-1"><Label>{f.criterion}</Label><span>{f.observed}</span><span className="muted">Try: {f.improve}</span></li>)}</ul>
          <div className="stack gap-3" style={{ borderTop: '1px solid var(--color-line)', paddingTop: 16 }}>
            <p>This practice is private. Employers can’t see it, and it never affects a hiring decision.</p>
            <div className="row wrap gap-3">
              <Button variant="primary" onClick={() => { update((d) => { d.practice.push({ ...attempt, visibility: 'PROMOTED_TO_EVIDENCE' }); log(d, 'Candidate', `Added a practice result to the Evidence Passport (${persona})`); }); toast('Added to your Evidence Passport as private. Choose who sees it there.'); setAttempt({ ...attempt, visibility: 'PROMOTED_TO_EVIDENCE' }); }} disabled={attempt.visibility === 'PROMOTED_TO_EVIDENCE'}>
                {attempt.visibility === 'PROMOTED_TO_EVIDENCE' ? 'Added to your passport' : 'Add to my Evidence Passport'}</Button>
              <Button onClick={() => { setIdx(0); setDone(false); setAttempt(null); setAskedFollow(false); setLog([{ who: 'q', text: questions[0].text }]); }}>Try again</Button>
              <Link to="/c/career" className="btn btn-quiet">Back to my path</Link>
            </div>
            <Sim>Rubric scoring is simulated</Sim>
          </div>
        </section>
      )}
    </main>
  );
}
