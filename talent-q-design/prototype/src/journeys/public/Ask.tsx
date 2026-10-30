// SC-013 · The sample Q full page, with the accessible alternative: every sample answer as a plain list,
// readable without the conversation (and without motion). "Start over" empties the conversation.
import { Link } from '../../ui/router';
import { PageHead, Site } from './Site';
import { SampleQ } from './SampleQ';
import { ALL_ANSWERS, resetSampleQ, simulateDrop, useSampleQ } from './qsample';

export function Ask() {
  const { msgs } = useSampleQ();
  return (
    <Site dock={false}>
      <PageHead kicker="Ask Q · sample" title="Talk to a sample Q" lede="A short, honest preview. The people are fictional, the answers are written in advance, and Q can’t see anyone’s data here." />
      <div className="pa-wrap">
        <SampleQ path="/site/ask" variant="page" headingId="pq-page-h" />
        <aside className="pa-side" aria-labelledby="pa-tools">
          <h2 id="pa-tools" className="lab">This conversation</h2>
          <p className="t14 muted">{msgs.length ? `${msgs.filter((m) => m.who === 'me').length} question${msgs.filter((m) => m.who === 'me').length === 1 ? '' : 's'} so far. Kept only in this tab.` : 'Nothing asked yet.'}</p>
          <div className="pa-tools">
            <button type="button" className="ds-btn" disabled={!msgs.length} onClick={resetSampleQ}>Start over</button>
            <button type="button" className="ds-btn quiet" onClick={simulateDrop}>Simulate a dropped connection</button>
          </div>
          <p className="t14">Want the real thing? <Link to="/signup">Create an account</Link> and Q works on your own roles or profile.</p>
        </aside>
      </div>
      <section className="ps-band" aria-labelledby="pa-all">
        <h2 id="pa-all" className="voice t30">Every sample answer</h2>
        <p className="muted">The same answers as the conversation, as a list.</p>
        <dl className="pa-list">{ALL_ANSWERS.map((x) => <div key={x.q}><dt>{x.q}</dt><dd>{x.a}</dd></div>)}</dl>
      </section>
    </Site>
  );
}
