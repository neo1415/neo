// Safe project viewer: a read-only preview of shared code and portfolio pages. Code is shown as text;
// pages render in a sandboxed frame with scripts, forms and outside requests switched off. Links show
// their domain before anything opens. Q explains, in plain words, what the work shows and doesn't.
import { useState } from 'react';
import type { Evidence } from '@contracts';
import { runAction } from '../../q/core/engine';
import { useWorld } from '../../mock/world';
import { Glyph } from '../../ds/Glyph';
import { hireB } from '../../state/areas/hire-b';
import { PROJECTS, domainOf, inertHtml, scriptCount } from './projects';
import { fmtDate, fmtTime } from './ui';

export function ProjectViewer({ items, first }: { items: Evidence[]; first: string }) {
  const projects = items.filter((e) => PROJECTS[e.evidenceId] && !e.confidential);
  const [sel, setSel] = useState(projects[0]?.evidenceId);
  const [file, setFile] = useState(0);
  const [leaving, setLeaving] = useState<string | null>(null);
  const gh = useWorld((w) => hireB(w).github);
  if (!projects.length) return (
    <section className="ds-sheet hire-b-grid" aria-labelledby="pv-h">
      <h2 id="pv-h" className="voice t24" style={{ margin: 0 }}>No projects to preview</h2>
      <p className="muted" style={{ margin: 0 }}>{first} hasn’t shared any code or portfolio pages with you. Q won’t look for them elsewhere.</p>
    </section>
  );
  const cur = projects.find((p) => p.evidenceId === sel) ?? projects[0];
  const p = PROJECTS[cur.evidenceId];
  const ghItems = projects.filter((x) => PROJECTS[x.evidenceId].github);
  const down = ghItems.length > 0 && gh.status !== 'OK';
  const checking = ghItems.length > 0 && gh.status === 'CHECKING';
  const f = p.files?.[Math.min(file, (p.files?.length ?? 1) - 1)];
  return (
    <section className="ds-sheet hire-b-grid" aria-labelledby="pv-h">
      <div className="hire-b-row">
        <h2 id="pv-h" className="voice t24" style={{ margin: 0 }}>Project viewer</h2>
        <span className="ds-tag"><Glyph k="none" size={14} />Read-only · nothing runs</span>
      </div>
      {projects.length > 1 && (
        <div className="hire-b-chips" role="group" aria-label="Choose a project">
          {projects.map((x) => <button key={x.evidenceId} type="button" className="ds-filter" aria-pressed={x.evidenceId === cur.evidenceId} onClick={() => { setSel(x.evidenceId); setFile(0); setLeaving(null); }}>{x.title}</button>)}
        </div>
      )}
      {down && (
        <div className="ds-banner" data-k="warn" role="status">
          <Glyph k="unclear" />
          <span>{checking ? 'Asking GitHub again…' : <><b>GitHub isn’t responding</b> (simulated outage); here’s what we had cached on {fmtDate(gh.cachedAt)} for {ghItems.map((x) => x.title).join(' and ')}. {gh.tries > 0 && gh.checkedAt ? `Last tried ${fmtTime(gh.checkedAt)}, still no answer. ` : ''}Until it answers, this repository stays unchecked: unknown, not weak.</>}</span>
          <button type="button" className="ds-btn" disabled={checking} onClick={() => void runAction({ label: 'Retry GitHub', act: { t: 'do', op: 'hb.github.retry' } })}>{checking ? 'Retrying…' : 'Retry'}</button>
        </div>
      )}
      {ghItems.length > 0 && gh.status === 'OK' && <p className="t14 muted" role="status" style={{ margin: 0 }}>GitHub answered {gh.checkedAt ? fmtTime(gh.checkedAt) : ''}. Showing the current copy (simulated).</p>}
      <p className="t14 muted" style={{ margin: 0 }}>{p.where}{p.github ? ` · ${down ? `cached ${fmtDate(gh.cachedAt)}` : 'live copy'}` : ''} · {cur.title}</p>

      <div className="hire-b-viewer">
        <div className="hire-b-frame" aria-busy={checking || undefined}>
          {checking && p.github ? <div className="ds-skeleton" style={{ height: 220 }} /> : p.kind === 'code' && f ? (
            <>
              {(p.files?.length ?? 0) > 1 && <div className="hire-b-chips" role="group" aria-label="Files">{p.files!.map((x, i) => <button key={x.path} type="button" className="ds-filter" aria-pressed={i === file} onClick={() => setFile(i)}>{x.path}</button>)}</div>}
              <pre className="hire-b-code" tabIndex={0} aria-label={`${f.path}, read-only code`}><code>{f.code}</code></pre>
            </>
          ) : p.html ? (
            <>
              <iframe title={`${cur.title}, sandboxed preview`} className="hire-b-iframe" sandbox="" srcDoc={inertHtml(p.html)} referrerPolicy="no-referrer" />
              {scriptCount(p.html) > 0 && <p className="t14 muted" style={{ margin: 0 }}>This page contains {scriptCount(p.html)} script{scriptCount(p.html) > 1 ? 's' : ''}. The viewer switched {scriptCount(p.html) > 1 ? 'them' : 'it'} off; nothing on the page can run.</p>}
            </>
          ) : null}
        </div>
        <section className="hire-b-explain" aria-label="Q’s explanation">
          <span className="lab hire-b-q">Q explains</span>
          <p className="ds-quote">{p.explain.summary}</p>
          <h3 className="lab" style={{ margin: 0 }}>What it shows</h3>
          <ul className="hire-b-list">{p.explain.shows.map((s) => <li key={s}><Glyph k="full" size={14} />{s}</li>)}</ul>
          <h3 className="lab" style={{ margin: 0 }}>What it doesn’t show</h3>
          <ul className="hire-b-list">{p.explain.doesNot.map((s) => <li key={s}><Glyph k="none" size={14} />{s}</li>)}</ul>
        </section>
      </div>

      {p.links.length > 0 && (
        <div className="hire-b-grid" style={{ gap: 8 }}>
          <h3 className="lab" style={{ margin: 0 }}>Links in this project</h3>
          <ul className="hire-b-links">
            {p.links.map((l) => (
              <li key={l}>
                <span><b>{domainOf(l)}</b><span className="t14 muted"> · {l.replace(/^https?:\/\/[^/]+/, '') || '/'}</span></span>
                <button type="button" className="ds-btn quiet" aria-expanded={leaving === l} onClick={() => setLeaving(leaving === l ? null : l)}>Open…</button>
                {leaving === l && (
                  <div className="ds-banner" style={{ gridColumn: '1 / -1' }} role="status">
                    <Glyph k="unclear" />
                    <span>This would leave Talent Q and open <b>{domainOf(l)}</b> in a new tab. <span className="ds-sim">Simulated</span> the address is fictional, so nothing opens.</span>
                    <button type="button" className="ds-btn" onClick={() => setLeaving(null)}>Stay here</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
