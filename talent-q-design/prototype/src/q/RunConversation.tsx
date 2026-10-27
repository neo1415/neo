// The conversation side of a run: Q's completed messages, the live delta, questions Q needs answered
// (buttons and free text, equal), failures with a recovery action, and an honest stop control.
import { useState } from 'react';
import type { RunId } from '@contracts';
import { cancelRun, respond, type RunView } from '../mock/runtime';
import { Banner, Button, QSays, StageLine } from '../ui/kit';
import { IStop } from '../ui/icons';

export function RunConversation({ runId, view, onRetry }: { runId: RunId | null; view: RunView; onRetry?: () => void }) {
  const [answer, setAnswer] = useState('');
  const running = view.status !== 'IDLE' && !view.completed && !view.failure;
  return (
    <div className="stack gap-6">
      {view.messages.map((m) => <QSays key={m.id} text={m.text} used={m.used} />)}
      {view.live && <QSays text={view.live} live />}
      {view.pendingInput && runId && (
        <form className="stack gap-3" onSubmit={(e) => { e.preventDefault(); if (answer.trim()) { respond(runId, view.pendingInput!.questionId, answer.trim()); setAnswer(''); } }}>
          <QSays text={view.pendingInput.prompt} />
          {view.pendingInput.options && (
            <div className="row wrap gap-2" role="group" aria-label="Suggested answers" style={{ marginLeft: 17 }}>
              {view.pendingInput.options.map((o) => <Button key={o} compact onClick={() => respond(runId, view.pendingInput!.questionId, o)}>{o}</Button>)}
            </div>
          )}
          <div className="row gap-2" style={{ marginLeft: 17 }}>
            <label className="sr-only" htmlFor={`ans-${view.pendingInput.questionId}`}>Your answer</label>
            <input id={`ans-${view.pendingInput.questionId}`} className="input" placeholder="Or type your own answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={!answer.trim()}>Answer</Button>
          </div>
        </form>
      )}
      {view.failure && (
        <Banner tone={view.failure.status === 'CANCELLED' ? 'info' : 'risk'} title={view.failure.status === 'CANCELLED' ? 'Stopped' : 'Q couldn’t finish this'}
          action={view.failure.recoverable && onRetry ? <Button compact onClick={onRetry}>{view.failure.status === 'CANCELLED' ? 'Resume' : 'Try again'}</Button> : undefined}>
          {view.failure.message}
        </Banner>
      )}
      {running && (
        <div className="row between gap-3 wrap">
          <StageLine stage={view.stage} />
          {runId && <Button compact variant="quiet" onClick={() => cancelRun(runId)}><IStop width={16} height={16} />Stop</Button>}
        </div>
      )}
      {view.replayed > 0 && <p className="t-caption" role="status">Reconnected. Caught up on {view.replayed} step{view.replayed === 1 ? '' : 's'} from the last one you saw.</p>}
    </div>
  );
}
