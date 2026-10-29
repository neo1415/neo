// The Talent Q shell. Principles:
//  1. Q is present on every product page: the conversation sits beside the page on desktop (resizable,
//     collapsible) and is one tap away on phones (an "Ask Q" bar that opens Q as a sheet).
//  2. Navigation is built from the route registry, grouped, and adapts to who is signed in (employer,
//     agency or candidate). Groups past the first three are collapsible, so the rail never overwhelms.
//  3. Phones get four tabs plus More; Q is always reachable and shows its latest line as a peek.
//  4. The identity menu switches between the prototype's demo people (one per journey), each with
//     their own Q conversation, memory and preferences.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Link, navigate } from '../ui/router';
import { actorOf, resetWorld, update, useWorld } from '../mock/world';
import { allRoutes, type RouteDef } from '../routes/registry';
import { QThread, useQMood } from '../q/QThread';
import { flushOutbox, useQThread } from '../q/core/engine';
import { ICONS } from './icons';
import { QMark } from './QMark';
import { arrive } from './motion';
import { InShell, Split, useNarrow } from './Workspace';
import './ds.css';

const GROUP_ORDER = ['Q', 'Hiring', 'Agency', 'Work', 'Interviews', 'Grow', 'Evidence', 'Organisation', 'You'];
const COLLAPSIBLE = new Set(['Organisation', 'You']);

function useNav() {
  const actor = useWorld((w) => actorOf(w));
  const orgKind = useWorld((w) => w.orgs.find((o) => o.id === actorOf(w).orgId)?.kind);
  const routes = allRoutes().filter((r) => r.nav && (r.side === actor.side || r.side === 'both') && (!r.nav.orgKind || r.nav.orgKind === orgKind) && (!r.nav.orgIds || r.nav.orgIds.includes(actor.orgId ?? '')));
  const groups = GROUP_ORDER.map((g) => ({ g, items: routes.filter((r) => r.nav!.group === g).sort((a, b) => a.nav!.order - b.nav!.order) })).filter((x) => x.items.length);
  return { actor, groups, routes };
}

export function AppShell({ path, children }: { path: string; children: ReactNode }) {
  const { actor, groups, routes } = useNav();
  const network = useWorld((w) => w.network);
  const lite = useWorld((w) => (actor.side === 'candidate' && actor.personId ? !!w.consents[actor.personId]?.lite : false));
  const orgName = useWorld((w) => w.orgs.find((o) => o.id === actor.orgId)?.name);
  const qm = useQMood();
  const narrow = useNarrow();
  const [rail, setRail] = useState<'open' | 'collapsed'>(() => { try { return (localStorage.getItem('tq.rail') as 'open' | 'collapsed') || 'open'; } catch { return 'open'; } });
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);
  const [who, setWho] = useState(false);
  const [qOpen, setQOpen] = useState(false);
  const qOpenRef = useRef(false); qOpenRef.current = qOpen;
  // Opening the phone Q sheet moves focus into its composer; closing returns it to "Ask Q".
  useEffect(() => { if (qOpen) setTimeout(() => document.getElementById('q-ask')?.focus(), 80); }, [qOpen]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  useEffect(() => { try { localStorage.setItem('tq.rail', rail); } catch { /* ignore */ } }, [rail]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
      // "/" focuses Q's composer from anywhere (like a search box), unless typing in a field.
      if (e.key === '/' && !(e.target as HTMLElement).closest('input,textarea,[contenteditable]')) { e.preventDefault(); if (narrow) setQOpen(true); setTimeout(() => document.getElementById('q-ask')?.focus(), 30); }
      if (e.key === 'Escape' && qOpenRef.current) { setQOpen(false); setTimeout(() => document.querySelector<HTMLButtonElement>('.ds-askbar button')?.focus(), 60); }
    };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [narrow]);
  useEffect(() => { setMore(false); setWho(false); setQOpen(false); }, [path]);
  useEffect(() => { if (network === 'online') void flushOutbox(); }, [network]);
  // Remember where each person was, so returning (or switching back to them) restores their place.
  useEffect(() => { update((w) => { w.session.lastRoute[w.session.actor] = path; }); }, [path]);
  // A rail entry is current for its own path, its sub-paths, and any extra prefixes it declares (nav.also).
  const current = (r: RouteDef) => path === r.path || (r.path !== '/' && path.startsWith(r.path + '/')) || !!r.nav?.also?.some((p) => path === p || path.startsWith(p + '/'));
  const tabs = routes.filter((r) => r.nav?.tab).sort((a, b) => a.nav!.order - b.nav!.order).slice(0, 4);

  const page = <div className="ds-page" id="ds-content" tabIndex={-1}>
    {network === 'offline' && (
      <div className="ds-banner" data-k="warn" role="status" style={{ margin: '12px 16px 0' }}>
        <span aria-hidden="true">{ICONS.offline}</span>
        <span><b>You’re offline.</b> Your work is saved on this device. Q keeps your messages and reads them when you reconnect. Nothing is sent while you’re offline.</span>
        <button type="button" className="ds-btn" onClick={() => update((w) => { w.network = 'online'; })}>Reconnect</button>
      </div>
    )}
    {narrow && <p className="ds-proto-bar">Prototype · simulated data</p>}
    {/* Orientation: the new page settles in (200 ms, decelerate). Keyed by path so returning to a page with
        preserved state still reads as arriving; reduced motion makes this an instant swap. */}
    <motion.div key={path} className="ds-page-body" {...arrive}>{children}</motion.div>
  </div>;

  return (
    <MotionConfig reducedMotion={lite ? 'always' : 'user'}>
    <div className="ds ds-app" data-rail={rail} data-audience={actor.side === 'candidate' ? 'candidate' : undefined} data-lite={lite ? 'on' : undefined}>
      <a className="skip-link" href="#ds-content" onClick={(e) => { e.preventDefault(); document.getElementById('ds-content')?.focus(); }}>Skip to content</a>
      <nav className="ds-rail" aria-label="Talent Q navigation">
        <Link to={actor.side === 'recruiter' ? '/r/home' : '/c/home'} className="ds-rail-brand" aria-label="Talent Q home"><QMark mood={network === 'offline' ? 'offline' : 'idle'} size={30} /><span className="ds-hide-collapsed ds-brandname">Talent Q<span className="ds-proto">Prototype · simulated</span></span></Link>
        <div className="ds-space">
          <button type="button" className="ds-space-btn" aria-expanded={who} aria-label={`Signed in as ${actor.name}${actor.journey ? `, journey ${actor.journey}` : ''}. Switch person`} onClick={() => setWho(!who)}>
            <span className="ds-av" aria-hidden="true">{actor.initials}</span>
            <span className="who ds-hide-collapsed"><b>{actor.name}</b><span>{actor.title}{orgName ? ` · ${orgName}` : ''}</span></span>
          </button>
          {who && <WhoMenu onDone={() => setWho(false)} />}
        </div>
        {groups.map(({ g, items }) => {
          const collapsible = COLLAPSIBLE.has(g); const open = !collapsible || openGroups[g] || items.some(current);
          return (
            <div key={g} className="ds-navgroup">
              {collapsible ? <button type="button" className="ds-groupbtn ds-hide-collapsed" aria-expanded={open} onClick={() => setOpenGroups({ ...openGroups, [g]: !open })}><span className="lab">{g}</span><span aria-hidden="true">{open ? '−' : '+'}</span></button> : <span className="lab ds-hide-collapsed">{g}</span>}
              {(open || rail === 'collapsed') && items.map((r) => (
                <Link key={r.path} to={r.path} current={current(r)} className="ds-navlink" aria-label={rail === 'collapsed' ? r.nav!.label : undefined} title={rail === 'collapsed' ? r.nav!.label : undefined}>
                  {ICONS[r.nav!.icon]}<span className="ds-hide-collapsed">{r.nav!.label}</span><NavBadge kind={r.nav!.badge} />
                </Link>
              ))}
            </div>
          );
        })}
        <div className="ds-rail-foot">
          <button type="button" className="ds-railbtn" onClick={() => setPalette(true)} aria-label="Go to anything (Control K)">{ICONS.command}<span className="ds-hide-collapsed">Go to anything</span><kbd className="ds-hide-collapsed">⌘K</kbd></button>
          <button type="button" className="ds-railbtn" aria-pressed={network === 'offline'} onClick={() => update((w) => { w.network = w.network === 'online' ? 'offline' : 'online'; })}>{ICONS.offline}<span className="ds-hide-collapsed">{network === 'online' ? 'Simulate offline' : 'Reconnect'}</span></button>
          <button type="button" className="ds-railbtn" aria-label={rail === 'open' ? 'Collapse navigation' : 'Expand navigation'} onClick={() => setRail(rail === 'open' ? 'collapsed' : 'open')}>{rail === 'open' ? ICONS.collapse : ICONS.expand}<span className="ds-hide-collapsed">Collapse</span></button>
        </div>
      </nav>
      <div className="ds-main">
        {narrow ? <InShell.Provider value>{page}</InShell.Provider> : <Split id="app" thread={<QThread />} canvas={page} />}
      </div>
      {narrow && !qOpen && <AskBar onOpen={() => setQOpen(true)} />}
      <AnimatePresence>
        {narrow && qOpen && (
          <motion.div className="ds-qsheet" role="dialog" aria-modal="true" aria-label="Q" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}
            >
            <QThread onClose={() => { setQOpen(false); setTimeout(() => document.querySelector<HTMLButtonElement>('.ds-askbar button')?.focus(), 60); }} />
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="ds-tabs" aria-label="Tabs">
        <button type="button" aria-expanded={qOpen} onClick={() => setQOpen(!qOpen)} aria-current={qOpen ? 'page' : undefined}><QMark mood={qm.mood} agents={qm.agents} size={22} /><span>Q</span></button>
        {tabs.slice(0, 3).map((t) => <Link key={t.path} to={t.path} current={current(t)}>{ICONS[t.nav!.icon]}<span>{t.nav!.label.split(' ')[0]}</span></Link>)}
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)}>{ICONS.more}<span>More</span></button>
      </nav>
      {more && (
        <div className="ds-more ink" role="dialog" aria-label="More">
          {groups.map(({ g, items }) => (
            <div key={g} className="ds-navgroup"><span className="lab">{g}</span>
              {items.map((r) => <Link key={r.path} to={r.path} current={current(r)} className="ds-navlink">{ICONS[r.nav!.icon]}<span>{r.nav!.label}</span></Link>)}
            </div>
          ))}
          <div className="ds-navgroup"><span className="lab">Demo</span>
            <button type="button" className="ds-railbtn" onClick={() => { setMore(false); setWho(true); setTimeout(() => document.querySelector<HTMLButtonElement>('.ds-who button')?.focus(), 30); }}>{ICONS.people}<span>Switch person</span></button>
            <button type="button" className="ds-railbtn" onClick={() => { setMore(false); setPalette(true); }}>{ICONS.command}<span>Go to anything</span></button>
            <button type="button" className="ds-railbtn" aria-pressed={network === 'offline'} onClick={() => update((w) => { w.network = w.network === 'online' ? 'offline' : 'online'; })}>{ICONS.offline}<span>{network === 'online' ? 'Simulate offline' : 'Reconnect'}</span></button>
          </div>
          {who && <WhoMenu onDone={() => setWho(false)} />}
        </div>
      )}
      {palette && <Palette onClose={() => setPalette(false)} />}
    </div>
    </MotionConfig>
  );
}

function NavBadge({ kind }: { kind?: string }) {
  const n = useWorld((w) => {
    if (kind === 'approvals') return w.threads.flatMap((t) => t.messages).filter((m) => m.status === 'AWAITING_APPROVAL' && w.threads.find((t) => t.messages.includes(m))?.orgId === actorOf(w).orgId).length + w.proposals.filter((p) => p.status === 'AWAITING_APPROVAL').length;
    if (kind === 'plan') return (w.planners[w.session.actor]?.approvals ?? []).filter((a) => a.state === 'WAITING').length;
    if (kind === 'apps') return w.applications.filter((a) => a.personId === actorOf(w).personId && a.status === 'INTERVIEW').length;
    return 0;
  });
  return n ? <span className="badge num ds-hide-collapsed" aria-label={`${n} waiting`}>{n}</span> : null;
}

/** Peek of Q's latest line + a big target that opens Q. Phones only. */
function AskBar({ onOpen }: { onOpen: () => void }) {
  const msgs = useQThread();
  const last = [...msgs].reverse().find((m) => m.who !== 'me');
  const { mood, agents } = useQMood();
  return (
    <div className="ds-askbar ink">
      <QMark mood={mood} agents={agents} size={36} />
      <button type="button" onClick={onOpen} aria-label={last ? `Q: ${last.text}. Open Q` : 'Ask Q'}>
        {last ? <span className="peek">{last.text}</span> : <span>Ask Q anything…</span>}
      </button>
    </div>
  );
}

function WhoMenu({ onDone }: { onDone: () => void }) {
  const actors = useWorld((w) => w.actors.filter((a) => a.journey));
  const cur = useWorld((w) => w.session.actor);
  const last = useWorld((w) => w.session.lastRoute);
  const [sure, setSure] = useState(false);
  const sw = (id: string) => {
    const a = actors.find((x) => x.id === id)!;
    update((w) => { w.session.actor = id; });
    onDone();
    navigate(last[id] ?? (a.side === 'recruiter' ? (a.signedUp ? '/r/home' : '/signup') : (a.signedUp ? '/c/home' : '/signup')));
  };
  return (
    <div className="ds-who" role="group" aria-label="Switch person (demo)">
      {(['recruiter', 'candidate'] as const).map((side) => (
        <div key={side} style={{ display: 'grid', gap: 2 }}>
          <span className="lab" style={{ padding: '6px 10px 2px' }}>{side === 'recruiter' ? 'Hiring' : 'Candidates'}</span>
          {actors.filter((a) => a.side === side).map((a) => (
            <button key={a.id} type="button" className="ds-railbtn" aria-current={a.id === cur ? 'true' : undefined} onClick={() => sw(a.id)}>
              <span className="ds-av" aria-hidden="true" style={{ width: 24, height: 24, fontSize: 10 }}>{a.initials}</span>
              <span>{a.name} <span className="muted">· {a.journey}</span></span>
            </button>
          ))}
        </div>
      ))}
      {/* Confirmed in place, not with confirm(): embedded viewers block browser dialogs. */}
      {!sure ? <button type="button" className="ds-railbtn" onClick={() => setSure(true)}>{ICONS.reset}<span>Reset the demo</span></button>
        : <div role="group" aria-label="Confirm reset" style={{ display: 'grid', gap: 6, padding: '6px 10px' }}>
          <span className="t14">Reset everyone’s conversations and work to the start?</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="ds-chip go" onClick={() => { resetWorld(); onDone(); navigate('/'); }}>Reset everything</button>
            <button type="button" className="ds-chip quiet" onClick={() => setSure(false)}>Cancel</button>
          </span>
        </div>}
    </div>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const { routes } = useNav();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const all = useMemo(() => [
    { label: `Ask Q: “${q || '…'}”`, grp: 'Q', run: () => { if (q) window.dispatchEvent(new CustomEvent('tq-compose', { detail: q })); } },
    ...routes.map((r) => ({ label: r.nav!.label, grp: r.nav!.group, run: () => navigate(r.path) })),
    { label: 'Settings', grp: 'You', run: () => navigate('/settings') },
    { label: 'Interaction gallery (all states)', grp: 'Prototype', run: () => navigate('/gallery/states') },
    { label: 'Components and tokens', grp: 'Prototype', run: () => navigate('/gallery') },
    { label: 'Design direction archive (A–D)', grp: 'Prototype', run: () => navigate('/x') },
  ], [routes, q]);
  const list = all.filter((x, k) => k === 0 || `${x.label} ${x.grp}`.toLowerCase().includes(q.toLowerCase()));
  const go = (k: number) => { const x = list[k]; if (!x) return; onClose(); x.run(); };
  return (
    <div className="ds-scrim" onClick={onClose}>
      <div className="ds-palette" role="dialog" aria-modal="true" aria-label="Go to anything" onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(list.length - 1, i + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, i - 1)); } if (e.key === 'Enter') { e.preventDefault(); go(i); } }}>
        <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(q ? 1 : 0); }} placeholder="Go to a page, or ask Q…" aria-label="Search pages or ask Q" aria-controls="ds-pal-list" aria-activedescendant={list[i] ? `pal-${i}` : undefined} role="combobox" aria-expanded="true" />
        <ul id="ds-pal-list" role="listbox" aria-label="Results">
          {list.map((x, k) => <li key={x.grp + x.label} role="none"><button type="button" role="option" id={`pal-${k}`} aria-selected={k === i} data-active={k === i} onMouseEnter={() => setI(k)} onClick={() => go(k)}><span>{x.label}</span><span className="grp">{x.grp}</span></button></li>)}
        </ul>
      </div>
    </div>
  );
}
