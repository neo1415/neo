// Product navigation for the whole of Talent Q.
// Principles: (1) two workspaces, Hiring and Career, switched at the top, so each person sees only their
// side; (2) at most four groups and nine items per workspace in the rail, everything else reachable from
// the command palette (Ctrl/⌘ K) and from Q itself; (3) phones get four tabs plus "More"; (4) items appear
// only for areas that exist, so navigation never leads to a placeholder.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, navigate } from '../ui/router';
import { resetWorld, update, useWorld, type World } from '../mock/world';
import { usePlanner } from '../services/agents';
import { ICONS, type IconName } from './icons';
import { QMark } from './QMark';
import './ds.css';

type SpaceId = 'hiring' | 'career';
interface Item { to: string; label: string; icon: IconName; tab?: boolean; badge?: number; also?: string[] }
interface Group { label: string; items: Item[] }

function useSpaces(): Record<SpaceId, { label: string; who: string; sub: string; av: string; groups: Group[] }> {
  const pending = useWorld((w: World) => w.proposals.filter((p) => p.status === 'AWAITING_APPROVAL').length);
  const plannerWaiting = usePlanner((p) => p.approvals.filter((a) => a.state === 'WAITING').length);
  return {
    hiring: {
      label: 'Hiring', who: 'Ada Okafor', sub: 'Kora Pay · recruiter', av: 'AO',
      groups: [
        { label: 'Q', items: [{ to: '/r/home', label: 'Home', icon: 'q', tab: true }, { to: '/r/plan', label: 'Plans and agents', icon: 'agents', tab: true, badge: plannerWaiting || undefined }] },
        { label: 'Hiring', items: [{ to: '/r/mandate', label: 'Roles', icon: 'roles' }, { to: '/r/sourcing', label: 'Search', icon: 'search' }, { to: '/r/compare', label: 'People', icon: 'people', tab: true }, { to: '/r/outreach', label: 'Approvals', icon: 'approvals', badge: pending || undefined }, { to: '/r/calendar', label: 'Calendar', icon: 'calendar', tab: true }] },
        { label: 'Knowledge', items: [{ to: '/r/memory', label: 'What Q remembers', icon: 'memory' }, { to: '/r/setup', label: 'Organisation and policy', icon: 'org' }] },
      ],
    },
    career: {
      label: 'Career', who: 'Amaka Eze', sub: 'Building a career', av: 'AE',
      groups: [
        { label: 'Q', items: [{ to: '/c/career', label: 'Career atlas', icon: 'atlas', tab: true }, { to: '/c/welcome', label: 'Getting started', icon: 'welcome' }] },
        { label: 'Grow', items: [{ to: '/c/growth', label: 'Readiness to apply', icon: 'measures' }, { to: '/c/interview', label: 'Practice and interview', icon: 'practice', tab: true }] },
        { label: 'Evidence', items: [{ to: '/c/passport', label: 'Evidence Passport', icon: 'passport', tab: true }, { to: '/c/slots', label: 'Interviews', icon: 'interview', tab: true }, { to: '/c/memory', label: 'What Q remembers', icon: 'memory' }] },
      ],
    },
  };
}

export function AppShell({ path, children }: { path: string; children: ReactNode }) {
  const spaces = useSpaces();
  const space: SpaceId = path.startsWith('/c/') ? 'career' : 'hiring';
  const S = spaces[space];
  const network = useWorld((w) => w.network);
  const [rail, setRail] = useState<'open' | 'collapsed'>(() => { try { return (localStorage.getItem('tq.rail') as 'open' | 'collapsed') || 'open'; } catch { return 'open'; } });
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  useEffect(() => { try { localStorage.setItem('tq.rail', rail); } catch { /* ignore */ } }, [rail]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, []);
  useEffect(() => { setMore(false); setSwitcher(false); }, [path]);
  const items = S.groups.flatMap((g) => g.items);
  const current = (it: Item) => path === it.to || (it.to === '/r/mandate' && path === '/r/mandate');
  const tabs = items.filter((i) => i.tab).slice(0, 4);
  const other: SpaceId = space === 'hiring' ? 'career' : 'hiring';

  return (
    <div className="ds ds-app" data-rail={rail} data-audience={space === 'career' ? 'candidate' : undefined}>
      <a className="skip-link" href="#ds-content">Skip to content</a>
      <nav className="ds-rail" aria-label={`${S.label} navigation`}>
        <Link to={space === 'hiring' ? '/r/home' : '/c/career'} className="ds-rail-brand" aria-label="Talent Q home"><QMark mood={network === 'offline' ? 'offline' : 'idle'} size={30} /><span className="ds-hide-collapsed">Talent Q</span></Link>
        <div className="ds-space">
          <button type="button" className="ds-space-btn" aria-expanded={switcher} aria-label={`Workspace: ${S.label}, ${S.who}. Switch workspace`} onClick={() => setSwitcher(!switcher)}>
            <span className="ds-av" aria-hidden="true">{S.av}</span>
            <span className="who ds-hide-collapsed"><b>{S.label}</b><span>{S.who}</span></span>
          </button>
          {switcher && (
            <Link to={other === 'hiring' ? '/r/home' : '/c/career'} className="ds-navlink"><span className="ds-av" aria-hidden="true" style={{ width: 22, height: 22, fontSize: 10, background: 'var(--night-4)', color: 'var(--moon)' }}>{spaces[other].av}</span><span className="ds-hide-collapsed">Switch to {spaces[other].label.toLowerCase()} · {spaces[other].who}</span></Link>
          )}
        </div>
        {S.groups.map((g) => (
          <div key={g.label} className="ds-navgroup">
            <span className="lab ds-hide-collapsed">{g.label}</span>
            {g.items.map((it) => (
              <Link key={it.to} to={it.to} current={current(it)} className="ds-navlink" aria-label={rail === 'collapsed' ? it.label : undefined} title={rail === 'collapsed' ? it.label : undefined}>
                {ICONS[it.icon]}<span className="ds-hide-collapsed">{it.label}</span>{it.badge ? <span className="badge num ds-hide-collapsed" aria-label={`${it.badge} waiting`}>{it.badge}</span> : null}
              </Link>
            ))}
          </div>
        ))}
        <div className="ds-rail-foot">
          <button type="button" className="ds-railbtn" onClick={() => setPalette(true)} aria-label="Go to anything (Control K)">{ICONS.command}<span className="ds-hide-collapsed">Go to anything</span><kbd className="ds-hide-collapsed">⌘K</kbd></button>
          <button type="button" className="ds-railbtn" aria-pressed={network === 'offline'} onClick={() => update((w) => { w.network = w.network === 'online' ? 'offline' : 'online'; })}>{ICONS.offline}<span className="ds-hide-collapsed">{network === 'online' ? 'Simulate offline' : 'Reconnect'}</span></button>
          <button type="button" className="ds-railbtn" aria-label={rail === 'open' ? 'Collapse navigation' : 'Expand navigation'} onClick={() => setRail(rail === 'open' ? 'collapsed' : 'open')}>{rail === 'open' ? ICONS.collapse : ICONS.expand}<span className="ds-hide-collapsed">Collapse</span></button>
        </div>
      </nav>
      <div className="ds-main" id="ds-content" tabIndex={-1}>
        {network === 'offline' && (
          <div className="ds-banner" data-k="warn" role="status" style={{ margin: '12px 16px 0' }}>
            <span aria-hidden="true">{ICONS.offline}</span>
            <span><b>You’re offline.</b> Q keeps working on the server; you’ll catch up from your last step when you reconnect. Nothing is sent while you’re offline.</span>
            <button type="button" className="ds-btn" onClick={() => update((w) => { w.network = 'online'; })}>Reconnect</button>
          </div>
        )}
        {children}
      </div>
      <nav className="ds-tabs" aria-label={`${S.label} tabs`}>
        {tabs.map((t) => <Link key={t.to} to={t.to} current={current(t)}>{ICONS[t.icon]}<span>{t.label.split(' ')[0]}</span></Link>)}
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)}>{ICONS.more}<span>More</span></button>
      </nav>
      {more && (
        <div className="ds-more ink" role="dialog" aria-label="More">
          {S.groups.map((g) => (
            <div key={g.label} className="ds-navgroup">
              <span className="lab">{g.label}</span>
              {g.items.map((it) => <Link key={it.to} to={it.to} current={current(it)} className="ds-navlink">{ICONS[it.icon]}<span>{it.label}</span>{it.badge ? <span className="badge num">{it.badge}</span> : null}</Link>)}
            </div>
          ))}
          <div className="ds-navgroup">
            <Link to={other === 'hiring' ? '/r/home' : '/c/career'} className="ds-navlink">{ICONS.people}<span>Switch to {spaces[other].label.toLowerCase()}</span></Link>
            <button type="button" className="ds-railbtn" onClick={() => { setMore(false); setPalette(true); }}>{ICONS.command}<span>Go to anything</span></button>
          </div>
        </div>
      )}
      {palette && <Palette onClose={() => setPalette(false)} spaces={spaces} />}
    </div>
  );
}

function Palette({ onClose, spaces }: { onClose: () => void; spaces: ReturnType<typeof useSpaces> }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const all = useMemo(() => [
    ...(Object.entries(spaces) as [SpaceId, ReturnType<typeof useSpaces>[SpaceId]][]).flatMap(([, s]) => s.groups.flatMap((g) => g.items.map((it) => ({ label: it.label, grp: `${s.label} · ${g.label}`, run: () => navigate(it.to) })))),
    { label: 'Components and tokens', grp: 'Design system', run: () => navigate('/gallery') },
    { label: 'Design direction archive (A–D)', grp: 'Design system', run: () => navigate('/x') },
    { label: 'Start page', grp: 'Talent Q', run: () => navigate('/') },
    { label: 'Reset the demo', grp: 'Prototype', run: () => { if (confirm('Reset the demo to its starting state?')) { resetWorld(); navigate('/'); } } },
  ], [spaces]);
  const list = all.filter((x) => `${x.label} ${x.grp}`.toLowerCase().includes(q.toLowerCase()));
  const go = (k: number) => { const x = list[k]; if (!x) return; onClose(); x.run(); };
  return (
    <div className="ds-scrim" onClick={onClose}>
      <div className="ds-palette" role="dialog" aria-modal="true" aria-label="Go to anything" onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(list.length - 1, i + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, i - 1)); } if (e.key === 'Enter') { e.preventDefault(); go(i); } }}>
        <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder="Go to a page or action…" aria-label="Search pages and actions" aria-controls="ds-pal-list" aria-activedescendant={list[i] ? `pal-${i}` : undefined} role="combobox" aria-expanded="true" />
        <ul id="ds-pal-list" role="listbox" aria-label="Results">
          {list.map((x, k) => <li key={x.grp + x.label} role="none"><button type="button" role="option" id={`pal-${k}`} aria-selected={k === i} data-active={k === i} onMouseEnter={() => setI(k)} onClick={() => go(k)}><span>{x.label}</span><span className="grp">{x.grp}</span></button></li>)}
          {!list.length && <li className="muted" style={{ padding: 12 }}>Nothing matches “{q}”. Try asking Q instead.</li>}
        </ul>
      </div>
    </div>
  );
}
