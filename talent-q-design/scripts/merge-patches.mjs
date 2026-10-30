// Merges the cluster builders' status patches (registry/patches/*.json) into registry/status.json, then the
// registers are regenerated with build-registers.mjs. Re-runnable: a patch entry replaces that id's entry.
// A patch may only move an id forward (never back to RESEARCHED) and must name a route for PROTOTYPED or above.
// Usage: node talent-q-design/scripts/merge-patches.mjs [patch names…]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = ['NOT STARTED', 'RESEARCHED', 'DESIGNED', 'PROTOTYPED', 'INTEGRATED', 'VERIFIED'];
const sp = join(root, 'registry', 'status.json'); const s = JSON.parse(readFileSync(sp, 'utf8'));
const only = process.argv.slice(2);
const files = readdirSync(join(root, 'registry', 'patches')).filter((f) => f.endsWith('.json') && (!only.length || only.includes(f.replace('.json', ''))));
for (const f of files) {
  const p = JSON.parse(readFileSync(join(root, 'registry', 'patches', f), 'utf8')); let n = 0;
  for (const kind of ['screens', 'motions', 'vision']) for (const [id, e] of Object.entries(p[kind] ?? {})) {
    const cur = s[kind][id]?.status ?? s.defaults[kind];
    if (ORDER.indexOf(e.status) < ORDER.indexOf(cur)) { console.log(`skip ${f} ${id}: ${e.status} would lower ${cur}`); continue; }
    if (ORDER.indexOf(e.status) >= 3 && !e.route) throw new Error(`${f} ${id}: ${e.status} needs a route`);
    s[kind][id] = { status: e.status, route: e.route ?? '', evidence: e.evidence ?? '', note: `${e.note ?? ''} (Cluster patch: ${f.replace('.json', '')}.)`.trim() }; n++;
  }
  console.log(`${f}: ${n} entries`);
}
writeFileSync(sp, JSON.stringify(s, null, 2) + '\n');
