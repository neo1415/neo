// Q-TOOLS openers: on each tool page Q names the one thing that needs the person, from live state.
import { registerOpener } from '../core/openers';
import { artOf, conflictDecision, mine, pendingHandoff, pipelineData, scanStage, sourcesFor } from '../../journeys/q-tools/model';
import { PAY_CONFLICT, fileOf, pageOf } from '../../journeys/q-tools/web';

registerOpener({
  id: 'qt.library', side: 'both', match: (p) => p === '/q/artifacts',
  build: (w, a) => {
    const arts = mine(w, a).filter((x) => !x.denied && x.kind !== 'DOWNLOAD' && x.kind !== 'BROWSE');
    if (!arts.length) return [{ subject: 'qt.library', text: a.orgId ? 'Ask me to chart, map or draw your hiring, in your own words.' : 'Ask me to draw a process or explain a role in a short narrated storyboard.', action: { label: a.orgId ? 'Chart our pipeline by stage' : 'Draw the hiring process', primary: true, act: { t: 'say', text: a.orgId ? 'chart our pipeline by stage' : 'draw the hiring process' } } }];
    return [{ subject: `qt.lib.${arts[0].id}`, text: `Your latest is “${arts[0].title}”. Ask what I used for it.`, action: { label: 'What sources did you use?', act: { t: 'say', text: 'what sources did you use' } } }];
  },
});

registerOpener({
  id: 'qt.artifact', side: 'both', match: (p) => p.startsWith('/q/artifacts/'),
  build: (w, a, path) => {
    const x = artOf(w, path.split('/')[3]); if (!x || x.denied) return [];
    const h = pendingHandoff(w, a, x.id);
    if (h && h.pickedUpAt) return [{ subject: `qt.ho.${h.id}`, text: `You started this on your desktop. Same conversation; carry on here.`, action: { label: 'What sources did you use?', act: { t: 'say', text: 'what sources did you use' } } }];
    if ((x.kind === 'CHART' || x.kind === 'MAP') && a.orgId) { const d = pipelineData(w, a, x.scope.mandate); if (d.hidden) return [{ subject: `qt.hid.${x.id}`, text: `${d.hidden} ${d.hidden === 1 ? 'person isn’t' : 'people aren’t'} shown because of their privacy settings. They’re counted, never named.` }]; }
    if (x.kind === 'VIDEO') return [{ subject: `qt.v.${x.id}`, text: 'Want me to narrate it? Captions only; interrupt me any time.', action: { label: 'Read it out', primary: true, act: { t: 'say', text: 'read it out loud' } } }];
    return [{ subject: `qt.a.${x.id}`, text: 'Ask me to change it, or to say where each number came from.', action: { label: 'What sources did you use?', act: { t: 'say', text: 'what sources did you use' } } }];
  },
});

registerOpener({
  id: 'qt.browse', side: 'both', match: (p) => p === '/q/browse' || p.startsWith('/q/browse/'),
  build: (w, a, path) => {
    const id = path.split('/')[3]; const x = id ? artOf(w, id) : mine(w, a).find((y) => y.kind === 'BROWSE');
    if (!x) return [{ subject: 'qt.browse.none', text: 'Tell me what to look up. I open allowed sites read-only.', action: { label: 'Look up Kora’s engineering blog', primary: true, act: { t: 'say', text: 'look up Kora’s engineering blog' } } }];
    if (x.denied) return [{ subject: `qt.b.${x.id}`, text: 'That site isn’t on your allowed list, so I didn’t open it.' }];
    const p = pageOf(x.scope.url);
    if (p?.blocks.some((b) => b.injection)) return [{ subject: `qt.inj.${x.id}`, text: 'This page tries to instruct me to email CVs out. I ignored it.', action: p.links.some((l) => l.file === 'f_pci') ? { label: 'Download the certificate', primary: true, act: { t: 'say', text: 'download this certificate' } } : undefined }];
    return [{ subject: `qt.b.${x.id}`, text: 'Ask me to summarise it, or to download a file it links.' }];
  },
});

registerOpener({
  id: 'qt.downloads', side: 'both', match: (p) => p === '/q/downloads',
  build: (w, a) => {
    const dls = mine(w, a).filter((x) => x.kind === 'DOWNLOAD' && !x.denied);
    const held = dls.filter((x) => { const f = fileOf(x.scope.file); return f && ['QUARANTINED', 'BLOCKED'].includes(scanStage(x, f).stage); });
    if (held.length) return [{ subject: 'qt.held', text: `${held.length} ${held.length === 1 ? 'file is' : 'files are'} held back by the scan. The reasons are on each one.` }];
    return [{ subject: 'qt.dl', text: dls.length ? 'Every file here passed its scan before it could open.' : 'Ask me to download a file from a page; I scan it first.', action: dls.length ? undefined : { label: 'Download Kora’s PCI certificate', primary: true, act: { t: 'say', text: 'download Kora’s PCI certificate' } } }];
  },
});

registerOpener({
  id: 'qt.sources', side: 'both', match: (p) => p === '/q/sources',
  build: (w, a) => {
    const s = sourcesFor(w, a);
    const conflict = s.some((x) => x.key === `web:${PAY_CONFLICT.a.url}`) && !conflictDecision(w, a);
    if (conflict) return [{ subject: 'qt.conflict', text: 'Two pay sources disagree. Choose how I show them; I keep both.', action: { label: 'Which one is right?', act: { t: 'say', text: 'which one is right' } } }];
    return [{ subject: 'qt.src', text: s.length ? `${s.length} sources so far. Old pages are marked; I can read any again.` : 'No sources yet. Ask me to research something.', action: s.length ? undefined : { label: 'Research Lagos backend pay', primary: true, act: { t: 'say', text: 'what’s the market pay for a senior backend engineer in lagos' } } }];
  },
});
