import type { FileRecord, RepoData } from '@entities/repo';
import { computeHotspots, HOTSPOT_VISIBLE_PERCENTILE } from '@entities/hotspot';
import type { HeatMetricKey } from '../model';

// "Heat overlay" — Spec §1 (rough risk) + §5 (Engineering Health) + §10
// (Refactor ROI). The map *itself* renders results; this layer paints a
// glow halo around files whose score is high for the chosen metric, so a
// person can see clusters without inspecting each cell.
//
// Each metric returns a 0..1 score per file. The DotField renderer scales
// halo radius + alpha by score (alpha ~ score² so weak signals dim out).

export type HeatMetric = {
  key: HeatMetricKey;
  label: string;
  hint: string;
  // CSS hex for the inner core of the halo. Outer halo lerps to this.
  hue: string;
  // Pure score function — 0 means "ignore this file", 1 means "max heat".
  // Receives full repo so the implementer can compute global percentiles or ratios.
  score: (f: FileRecord, repo: RepoData) => number;
};

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }

// Single warm-sequential hue for "high = bad" metrics. Spec / Healey 1996:
// keep hue stable, encode intensity via alpha + size. Cool blue is reserved
// for "stale" since its meaning (low energy, long-untouched) reads opposite.
const WARM_HUE = '#d98a85';
const COOL_HUE = '#5a8fce';
const NEUTRAL_HUE = '#6e7681';

export const HEAT_METRICS: HeatMetric[] = [
  { key: 'none',          label: 'Off',                hint: 'No heat overlay',                                  hue: NEUTRAL_HUE, score: () => 0 },
  {
    key: 'hotspot', label: 'Hotspot', hint: 'High churn × high complexity (Michael Feathers)', hue: WARM_HUE,
    score: (f) => Math.sqrt(clamp01(f.metrics.churn) * clamp01(f.metrics.complexity / 50)),
  },
  {
    key: 'hotspot-v2', label: 'Hotspot v2', hint: 'Top 10% — change × structure × health × coupling × criticality', hue: WARM_HUE,
    score: (f, repo) => {
      const entry = computeHotspots(repo).get(f.id);
      if (!entry) return 0;
      return entry.percentile >= HOTSPOT_VISIBLE_PERCENTILE ? entry.score : 0;
    },
  },
  {
    // Score is computed by the renderer from `overlay.timeWindow` because
    // the time slice isn't visible to a (file, repo)-only score function.
    // Picker still routes through this entry so the metric dropdown UI
    // stays uniform.
    key: 'time-hotspot', label: 'Hotspot (time)', hint: 'Recency × complexity, scrub the time window with the slider', hue: WARM_HUE,
    score: () => 0,
  },
  {
    key: 'complexity', label: 'Complexity', hint: 'Cyclomatic + cognitive density', hue: WARM_HUE,
    score: (f) => clamp01(clamp01(f.metrics.cyclomatic / 50) * 0.5 + clamp01(f.metrics.cognitive / 120) * 0.5),
  },
  {
    key: 'blast', label: 'Blast radius', hint: 'Files transitively impacted by edits', hue: WARM_HUE,
    score: (f, repo) => clamp01(f.metrics.blastRadius / (repo.ranges.blastRadius[1] || 1)),
  },
  {
    key: 'churn', label: 'Churn', hint: 'Recent activity (last 90 days)', hue: WARM_HUE,
    score: (f) => clamp01(f.metrics.churn),
  },
  {
    key: 'vulnerability', label: 'Vulnerability', hint: 'Vulnerable status + SAST findings + secret risk', hue: WARM_HUE,
    score: (f) => {
      let s = 0;
      if (f.metrics.security) s += 0.6;
      if (f.metrics.secretsLikely) s += 0.3;
      s += clamp01(f.metrics.sastFindings / 8) * 0.5;
      return clamp01(s);
    },
  },
  {
    key: 'aiRisk', label: 'AI risk', hint: 'Files an AI agent should not touch (low edit-safety)', hue: WARM_HUE,
    score: (f) => clamp01(1 - f.metrics.editSafety / 100),
  },
  {
    key: 'coverageGap', label: 'Coverage gap', hint: 'Big files with low test coverage', hue: WARM_HUE,
    score: (f, repo) => {
      const sizeMax = repo.ranges.loc[1] || 1;
      const sizeWeight = clamp01(f.metrics.loc / sizeMax);
      const gap = clamp01(1 - f.metrics.lineCoverage / 100);
      return clamp01(Math.sqrt(sizeWeight * gap));
    },
  },
  {
    // Cool blue — different valence from "high = bad" warm metrics.
    key: 'stale', label: 'Stale × important', hint: 'Important files (high PageRank) that are no longer touched', hue: COOL_HUE,
    score: (f, repo) => {
      const prMax = repo.ranges.fanIn[1] || 1;
      const importance = clamp01(f.metrics.fanIn / prMax);
      const age = clamp01(f.metrics.daysSinceTouched / 365);
      return clamp01(Math.sqrt(importance * age));
    },
  },
  {
    // Confidence overlay — analyzer wasn't sure about these files. Higher
    // score = more reasons to doubt. Replaces the dedicated UnknownMode.
    key: 'unknown', label: 'Confidence', hint: 'Files the analyzer is unsure about (overapprox / unknown / stale index)', hue: COOL_HUE,
    score: (f) => {
      const c = f.metrics.confidence;
      let s = 0;
      if (c === 'unknown') s = 1;
      else if (c === 'stale') s = 0.65;
      else if (c === 'overapprox') s = 0.4;
      // Boost when the analyzer logged explicit reasons.
      s += Math.min(0.3, f.metrics.unknownReasons.length * 0.1);
      return clamp01(s);
    },
  },
  {
    // Import-cycle overlay — paired with SCC hull rendering inside
    // DotFieldMode (`metric === 'cycles'` triggers extra geometry).
    // Replaces the dedicated CycleMode.
    key: 'cycles', label: 'Import cycles', hint: 'Files inside a strongly-connected import cycle (Tarjan SCCs)', hue: WARM_HUE,
    score: (f) => (f.metrics.cyclic ? 1 : 0),
  },
];

export function findMetric(key: HeatMetricKey): HeatMetric {
  return HEAT_METRICS.find((m) => m.key === key) ?? HEAT_METRICS[0];
}
