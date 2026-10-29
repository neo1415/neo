// Builds the coverage registers from the founder atlases (v2) plus registry/status.json.
// The atlases are never edited; status.json is the single place progress is recorded.
// Usage: node talent-q-design/scripts/build-registers.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const sources = join(root, '..', 'docs', 'sources');

const STATES = ['NOT STARTED', 'RESEARCHED', 'DESIGNED', 'PROTOTYPED', 'INTEGRATED', 'VERIFIED'];

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const toCsv = (cols, rows) => [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c] ?? '')).join(','))].join('\n') + '\n';

const status = JSON.parse(readFileSync(join(root, 'registry', 'status.json'), 'utf8'));
const pick = (kind, id) => ({ status: status.defaults[kind], route: '', evidence: '', note: '', ...(status[kind][id] || {}) });

function check(kind, id, s) {
  if (!STATES.includes(s.status)) throw new Error(`${kind} ${id}: unknown status "${s.status}"`);
  if (s.status === 'VERIFIED' && !s.evidence) throw new Error(`${kind} ${id}: VERIFIED needs evidence`);
  if (['PROTOTYPED', 'INTEGRATED', 'VERIFIED'].includes(s.status) && !s.route) throw new Error(`${kind} ${id}: ${s.status} needs a route`);
}

const tally = (rows) => Object.fromEntries(STATES.map((st) => [st, rows.filter((r) => r.status === st).length]));

const screens = parseCsv(readFileSync(join(sources, 'batch-2', '02_COMPLETE_SCREEN_ATLAS_v2.csv'), 'utf8')).map((r) => {
  const s = pick('screens', r.screen_id); check('screen', r.screen_id, s);
  const p = status.priority[r.screen_id];
  const primary = s.route && status.routes?.[s.route] === r.screen_id;
  const representation = !s.route ? (status.design_refs?.[r.screen_id] ? 'DESIGN EXPLORATION ONLY' : 'NOT YET REPRESENTED')
    : primary ? 'UNIQUE PAGE / ROUTE' : `STATE OR SECTION of ${s.route}`;
  return {
    screen_id: r.screen_id, section: r.section, screen_name: r.screen_name, primary_actor: r.primary_actor, priority: p ? `P${p}` : '', surface: status.surfaces[r.section] || '', ...s,
    representation,
    design_reference: s.route ? (status.d_native_routes?.includes(s.route) ? `Direction D, native (${s.route})` : `Direction D shell, legacy bridge (${s.route}); native rebuild pending`) : (status.design_refs?.[r.screen_id] || ''),
    interactive_prototype: s.route ? 'Yes' : 'No',
    production_integration: 'None (simulated)',
    verified: s.status === 'VERIFIED' ? 'Yes' : 'No',
  };
});
writeFileSync(join(root, 'screens', 'SCREEN-COVERAGE.csv'),
  toCsv(['screen_id', 'section', 'screen_name', 'primary_actor', 'priority', 'surface', 'representation', 'design_reference', 'interactive_prototype', 'production_integration', 'verified', 'status', 'route', 'evidence', 'note'], screens));

const motions = parseCsv(readFileSync(join(sources, 'batch-2', '03_MOTION_AND_VIDEO_ATLAS_v2.csv'), 'utf8')).map((r) => {
  const s = pick('motions', r.motion_id); check('motion', r.motion_id, s);
  return { motion_id: r.motion_id, name: r.name, event_trigger: r.event_trigger, primary_surface: r.primary_surface, reduced_motion_fallback: r.reduced_motion_or_text_fallback, ...s };
});
writeFileSync(join(root, 'motion', 'MOTION-COVERAGE.csv'),
  toCsv(['motion_id', 'name', 'event_trigger', 'primary_surface', 'reduced_motion_fallback', 'status', 'route', 'evidence', 'note'], motions));

const vision = parseCsv(readFileSync(join(sources, 'batch-3', '04_FOUNDER_VISION_TRACEABILITY_v2.csv'), 'utf8')).map((r) => {
  const s = pick('vision', r.vision_id); check('vision', r.vision_id, s);
  return { vision_id: r.vision_id, founder_requirement: r.founder_requirement, indicative_screen_ids: r.indicative_screen_ids, source_status: r.status, ...s };
});
writeFileSync(join(root, 'research', 'VISION-COVERAGE.csv'),
  toCsv(['vision_id', 'founder_requirement', 'indicative_screen_ids', 'source_status', 'status', 'route', 'evidence', 'note'], vision));

const line = (name, rows) => `| ${name} | ${rows.length} | ${STATES.map((st) => tally(rows)[st]).join(' | ')} |`;
const summary = `# Coverage summary

Generated by \`scripts/build-registers.mjs\` from the v2 atlases and \`registry/status.json\`. Do not edit by hand.

| Register | Total | ${STATES.join(' | ')} |
|---|---|${STATES.map(() => '---').join('|')}|
${line('Screens', screens)}
${line('Motions', motions)}
${line('Vision groups', vision)}

## How the 183 screen concepts are represented

| Representation | Count |
|---|---|
${['UNIQUE PAGE / ROUTE', 'STATE OR SECTION', 'DESIGN EXPLORATION ONLY', 'NOT YET REPRESENTED'].map((k) => `| ${k[0] + k.slice(1).toLowerCase()} | ${screens.filter((s) => s.representation.startsWith(k)).length} |`).join('\n')}
| Interactive prototype (any form) | ${screens.filter((s) => s.interactive_prototype === 'Yes').length} |
| Production integration | 0 (all simulated) |
| Verified experience | ${screens.filter((s) => s.verified === 'Yes').length} |

A route counts once. Concepts that live on the same route are states or sections of it, not standalone screens.
Reusable components are listed in \`components/COMPONENTS.md\`.

## Priority screens

| # | Screen | Name | Status | Route |
|---|---|---|---|---|
${screens.filter((s) => s.priority).sort((a, b) => parseInt(a.priority.slice(1)) - parseInt(b.priority.slice(1)) || a.screen_id.localeCompare(b.screen_id))
  .map((s) => `| ${s.priority} | ${s.screen_id} | ${s.screen_name} | ${s.status} | ${s.route ? '`' + s.route + '`' : ''} |`).join('\n')}
`;
writeFileSync(join(root, 'COVERAGE-SUMMARY.md'), summary);
console.log(summary.split('\n').slice(4, 9).join('\n'));
