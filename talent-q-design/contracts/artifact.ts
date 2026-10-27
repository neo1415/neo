// Typed artifacts Q can produce. Mirrors neo1415/q result-block (table/chart) and artifact version shapes.
// Rendered only by known renderers: no generated client code from untrusted sources.
import type { EvidenceState } from './talent';

export type ArtifactKind = 'COMPARISON' | 'TABLE' | 'DOCUMENT' | 'PLAN' | 'SCHEDULE' | 'CHART' | 'ROLE_MAP' | 'EVIDENCE_PREVIEW';

interface Base<K extends ArtifactKind, C> { artifactId: string; kind: K; title: string; version: number; createdByRunId: string; sources: string[]; simulated: boolean; content: C }

export type ComparisonArtifact = Base<'COMPARISON', {
  mandateId: string;
  columns: { personId: string; name: string; headline: string }[];
  rows: { reqId: string; label: string; mustHave: boolean; cells: { state: EvidenceState; evidenceIds: string[]; note: string }[] }[];
}>;
export type TableArtifact = Base<'TABLE', { columns: { key: string; label: string; numeric?: boolean }[]; rows: Record<string, string | number>[] }>;
export type DocumentArtifact = Base<'DOCUMENT', { blocks: ({ t: 'h'; text: string } | { t: 'p'; text: string } | { t: 'list'; items: string[] })[]; confirmedFacts: string[] }>;
export type PlanArtifact = Base<'PLAN', { steps: { stepId: string; label: string; detail: string; minutes?: number; done: boolean }[] }>;
export type ChartArtifact = Base<'CHART', { kind: 'line' | 'bar'; unit: string; series: { label: string; points: { x: string; y: number }[] }[] }>;
export type RoleMapArtifact = Base<'ROLE_MAP', { nodes: { id: string; label: string; current?: boolean; target?: boolean }[]; edges: { from: string; to: string; gaps: number }[] }>;

export type Artifact = ComparisonArtifact | TableArtifact | DocumentArtifact | PlanArtifact | ChartArtifact | RoleMapArtifact;
