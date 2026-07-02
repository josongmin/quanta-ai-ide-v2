// ─────────────────────────────────────────────────────────────────────────
// dependencyGraph — pure logic for the DependencyContext SVG presenter.
//
// Lane taxonomy/tokens, graph construction (buildGraph), and the
// mid-string trim helper. No JSX — testable pure functions.
// ─────────────────────────────────────────────────────────────────────────

import type { PullRequest } from '@entities/pr';
import type { RepoData, Layer } from '@entities/repo';

// Compress the 7-way Layer union into a 4-row architectural lens.
// Reviewers think in "ui / logic / data / vendor", not in framework
// roles — so we map { view, controller } → ui (top), { service, util }
// → logic, { repository } → data, { vendor } → vendor (bottom).
// `test` is filtered out before layout (test files are surfaced
// separately in the Files scene).
export type Lane = 'ui' | 'logic' | 'data' | 'vendor';

export function laneOf(layer: Layer): Lane | null {
  if (layer === 'view' || layer === 'controller') return 'ui';
  if (layer === 'service' || layer === 'util') return 'logic';
  if (layer === 'repository') return 'data';
  if (layer === 'vendor') return 'vendor';
  return null; // 'test' — skip
}

export type Node = {
  id: number;
  name: string;
  path: string;
  lane: Lane;
  touched: boolean;     // part of the PR
  publicApi: boolean;
  blastIn: number;      // fan-in from touched
  blastOut: number;     // fan-out to neighbours
};

export type Edge = {
  from: number;
  to: number;
  bothTouched: boolean;
};

export const LANE_ORDER: Lane[] = ['ui', 'logic', 'data', 'vendor'];
export const LANE_LABEL: Record<Lane, string> = {
  ui:     'ui',
  logic:  'logic',
  data:   'data',
  vendor: 'vendor',
};
export const LANE_TONE: Record<Lane, string> = {
  ui:     'var(--fg-link)',
  logic:  'var(--fg-accent)',
  data:   'var(--intent-success-fg)',
  vendor: 'var(--intent-warn-fg)',
};

export function buildGraph(pr: PullRequest, repo: RepoData): { nodes: Node[]; edges: Edge[] } {
  const touchedIds = new Set<number>();
  for (const f of pr.files) {
    if (f.fileId !== null) touchedIds.add(f.fileId);
  }
  if (touchedIds.size === 0) return { nodes: [], edges: [] };

  // Add immediate neighbours so layered context shows even on tiny PRs.
  // Cap at 2 neighbours per touched file; keeps the SVG legible.
  const includedIds = new Set<number>(touchedIds);
  for (const id of touchedIds) {
    const file = repo.files[id];
    if (!file) continue;
    let added = 0;
    for (const dep of file.deps) {
      if (added >= 2) break;
      if (includedIds.has(dep)) continue;
      includedIds.add(dep);
      added += 1;
    }
  }

  // Precompute fan counters using the included subgraph.
  const inCount = new Map<number, number>();
  const outCount = new Map<number, number>();
  for (const id of includedIds) {
    const file = repo.files[id];
    if (!file) continue;
    for (const dep of file.deps) {
      if (!includedIds.has(dep)) continue;
      outCount.set(id, (outCount.get(id) ?? 0) + 1);
      inCount.set(dep, (inCount.get(dep) ?? 0) + 1);
    }
  }

  const nodes: Node[] = [];
  for (const id of includedIds) {
    const file = repo.files[id];
    if (!file) continue;
    const lane = laneOf(file.layer);
    if (lane === null) continue; // 'test' layer — skip
    nodes.push({
      id,
      name: file.name,
      path: file.folderPath ? `${file.folderPath}.${file.name}` : file.name,
      lane,
      touched: touchedIds.has(id),
      publicApi: file.metrics.publicApi,
      blastIn: inCount.get(id) ?? 0,
      blastOut: outCount.get(id) ?? 0,
    });
  }

  const edges: Edge[] = [];
  for (const id of includedIds) {
    const file = repo.files[id];
    if (!file) continue;
    for (const dep of file.deps) {
      if (!includedIds.has(dep)) continue;
      edges.push({
        from: id,
        to: dep,
        bothTouched: touchedIds.has(id) && touchedIds.has(dep),
      });
    }
  }
  // Sort touched-touched edges last so they paint on top.
  edges.sort((a, b) => Number(a.bothTouched) - Number(b.bothTouched));

  return { nodes, edges };
}

export function trimMid(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = s.slice(0, Math.floor((max - 1) / 2));
  const tail = s.slice(-(max - 1 - head.length));
  return `${head}…${tail}`;
}
