import { Link } from '../ui/router';
import { QPresence } from '../q/QPresence';

export function Entry() {
  return (
    <main className="main stack gap-12" style={{ maxWidth: 880 }}>
      <div className="stack gap-6" style={{ paddingTop: 48 }}>
        <QPresence state="idle" size={72} />
        <h1 className="t-hero">Hire by talking. Grow by doing.</h1>
        <p className="t-lead muted measure">Q is the assistant inside Talent Q. It works in the background, shows its sources, and asks before it acts. This prototype runs on simulated data.</p>
      </div>
      <div className="grid-2">
        <Link to="/r/home" className="panel stack gap-2" style={{ textDecoration: 'none', color: 'var(--color-text)' }}>
          <span className="t-label q-text">For employers</span>
          <span className="t-title">I’m hiring</span>
          <span className="muted">Ada Okafor, recruiter at Kora Pay (fictional)</span>
        </Link>
        <Link to="/c/career" className="panel stack gap-2" style={{ textDecoration: 'none', color: 'var(--color-text)' }}>
          <span className="t-label q-text">For professionals</span>
          <span className="t-title">I’m building my career</span>
          <span className="muted">Amaka, Chidi or Tobi (fictional)</span>
        </Link>
      </div>
      <p><Link to="/x">Design direction review: three directions, the same three experiences →</Link></p>
      <p className="t-caption">Tip: open the hiring side and the candidate side in two tabs. They share one record and update each other live.</p>
    </main>
  );
}
