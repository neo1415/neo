import { useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { Link, useRoute } from '../ui/router';
import { Banner, Button, IconButton, ToastHost } from '../ui/kit';
import { IMoon, ISun, IWifiOff } from '../ui/icons';
import { resetWorld, update, useWorld } from '../mock/world';
import { QPresence } from '../q/QPresence';
import { Entry } from '../screens/Entry';
import { QHome } from '../screens/QHome';
import { OrgSetup } from '../screens/OrgSetup';
import { MandateIntake } from '../screens/MandateIntake';
import { Sourcing } from '../screens/Sourcing';
import { Compare } from '../screens/Compare';
import { Outreach } from '../screens/Outreach';
import { CalendarSetup } from '../screens/CalendarSetup';
import { SlotPicker } from '../screens/SlotPicker';
import { Passport } from '../screens/Passport';
import { Career } from '../screens/Career';
import { Interview } from '../screens/Interview';
import { Memory } from '../screens/Memory';
import { Gallery } from '../screens/Gallery';

const RECRUITER = [
  { to: '/r/home', label: 'Q' },
  { to: '/r/mandate', label: 'Roles' },
  { to: '/r/compare', label: 'People' },
  { to: '/r/outreach', label: 'Approvals' },
  { to: '/r/calendar', label: 'Calendar' },
  { to: '/r/memory', label: 'What Q remembers' },
  { to: '/r/setup', label: 'Organisation' },
];
const CANDIDATE = [
  { to: '/c/career', label: 'Career' },
  { to: '/c/passport', label: 'Evidence Passport' },
  { to: '/c/slots', label: 'Interviews' },
  { to: '/c/interview', label: 'Practice and interview' },
  { to: '/c/memory', label: 'What Q remembers' },
];

const ROUTES: Record<string, () => ReactNode> = {
  '/': () => <Entry />,
  '/gallery': () => <Gallery />,
  '/r/home': () => <QHome />,
  '/r/setup': () => <OrgSetup />,
  '/r/mandate': () => <MandateIntake />,
  '/r/sourcing': () => <Sourcing />,
  '/r/compare': () => <Compare />,
  '/r/outreach': () => <Outreach />,
  '/r/calendar': () => <CalendarSetup />,
  '/r/memory': () => <Memory viewer="recruiter" />,
  '/c/career': () => <Career />,
  '/c/passport': () => <Passport />,
  '/c/slots': () => <SlotPicker />,
  '/c/interview': () => <Interview />,
  '/c/memory': () => <Memory viewer="candidate" />,
};

export function App() {
  const { path } = useRoute();
  const network = useWorld((w) => w.network);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('tq.theme') as 'dark' | 'light') || 'dark');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('tq.theme', theme); }, [theme]);

  const side = path.startsWith('/c/') ? 'candidate' : path.startsWith('/r/') ? 'recruiter' : null;
  const nav = side === 'candidate' ? CANDIDATE : side === 'recruiter' ? RECRUITER : [];
  const screen = ROUTES[path] ?? (() => <NotFound />);
  const navMatch = (to: string) => path === to || (to === '/r/mandate' && path === '/r/sourcing');

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="shell">
        <header className="topbar">
          <Link to={side === 'candidate' ? '/c/career' : side === 'recruiter' ? '/r/home' : '/'} className="brand" aria-label="Talent Q home">
            <QPresence state={network === 'offline' ? 'offline' : 'idle'} size={28} />
            <span>Talent Q</span>
          </Link>
          {nav.length > 0 && (
            <nav aria-label={side === 'candidate' ? 'Candidate' : 'Recruiter'} className="nav grow">
              {nav.map((n) => <Link key={n.to} to={n.to} current={navMatch(n.to)}>{n.label}</Link>)}
            </nav>
          )}
          <div className="row gap-2" style={{ marginLeft: 'auto' }}>
            {side && <Link to={side === 'candidate' ? '/r/home' : '/c/career'} className="btn btn-quiet btn-compact"><span><span className="hide-sm">Switch to </span>{side === 'candidate' ? 'hiring' : 'candidate'}</span></Link>}
            <IconButton label={network === 'online' ? 'Simulate going offline' : 'Reconnect'} aria-pressed={network === 'offline'}
              onClick={() => update((w) => { w.network = w.network === 'online' ? 'offline' : 'online'; })}><IWifiOff /></IconButton>
            <IconButton label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <ISun /> : <IMoon />}</IconButton>
          </div>
        </header>
        {network === 'offline' && (
          <div style={{ padding: '12px var(--gutter) 0' }}>
            <Banner tone="warn" title="You’re offline" action={<Button compact onClick={() => update((w) => { w.network = 'online'; })}>Reconnect</Button>}>
              Q keeps working on the server. When you reconnect, you’ll catch up from the last step you saw. Nothing is sent while you’re offline.
            </Banner>
          </div>
        )}
        <div id="main" tabIndex={-1} className="stack grow">{screen()}</div>
        <footer className="row wrap between gap-4" style={{ padding: '16px var(--gutter)', borderTop: '1px solid var(--color-line)' }}>
          <p className="t-caption">Design prototype. All people, companies and provider receipts are simulated. No messages are sent and no calendars are written.</p>
          <div className="row gap-2">
            <Link to="/gallery" className="btn btn-quiet btn-compact">Components</Link>
            <Button compact variant="quiet" onClick={() => { if (confirm('Reset the demo to its starting state?')) { resetWorld(); location.hash = '/'; } }}>Reset demo</Button>
          </div>
        </footer>
      </div>
      <ToastHost />
    </MotionConfig>
  );
}

function NotFound() {
  return (
    <main className="main">
      <h1 className="t-display">This page doesn’t exist.</h1>
      <p className="muted" style={{ marginTop: 12 }}><Link to="/">Go to the start</Link></p>
    </main>
  );
}
