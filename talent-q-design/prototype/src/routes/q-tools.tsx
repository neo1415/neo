// Q-TOOLS routes (atlas SC-124, 126, 127, 128, 130, 136). Both sides: every person's Q can make artifacts, browse the
// allowed public web, download (scanned) files and list its sources. One rail entry ("Q’s work"); the tools are tabs.
import { registerRoute } from './registry';
import { ArtifactPage, BrowsePage, DownloadsPage, Library, SourcesPage } from '../journeys/q-tools/pages';
import '../journeys/q-tools/model';
import '../journeys/q-tools/refs';

registerRoute({ path: '/q/artifacts', side: 'both', label: 'Q’s work', render: () => <Library />, nav: { group: 'Q', label: 'Q’s work', icon: 'measures', order: 3, also: ['/q'] } });
registerRoute({ path: '/q/artifacts/:id', side: 'both', label: 'an artifact from Q', render: (p) => <ArtifactPage key={p.id} id={p.id} /> });
registerRoute({ path: '/q/browse', side: 'both', label: 'secure browsing', render: () => <BrowsePage /> });
registerRoute({ path: '/q/browse/:id', side: 'both', label: 'a page Q opened', render: (p) => <BrowsePage key={p.id} id={p.id} /> });
registerRoute({ path: '/q/downloads', side: 'both', label: 'downloads', render: () => <DownloadsPage /> });
registerRoute({ path: '/q/sources', side: 'both', label: 'Q’s sources', render: () => <SourcesPage /> });
