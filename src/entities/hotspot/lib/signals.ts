import type { FileRecord, RepoData } from '@entities/repo';
import type { HotspotSignals } from '../model';

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function range(repo: RepoData, key: keyof RepoData['ranges']): number {
  const [, hi] = repo.ranges[key];
  return hi <= 0 ? 1 : hi;
}

export function computeSignals(file: FileRecord, repo: RepoData, jitter: number): HotspotSignals {
  const m = file.metrics;

  const change_pressure = clamp01(
    0.5 * clamp01(m.churn)
    + 0.3 * clamp01(m.recentPRs / range(repo, 'recentPRs'))
    + 0.2 * clamp01(1 - m.daysSinceTouched / 365),
  );

  const structural_friction = clamp01(
    0.4 * clamp01(m.cyclomatic / 50)
    + 0.3 * clamp01(m.cognitive / 120)
    + 0.2 * clamp01(m.maxNesting / 12)
    + 0.1 * (m.cyclic ? 1 : 0),
  );

  const health_deficit = clamp01(
    0.4 * clamp01(1 - m.lineCoverage / 100)
    + 0.3 * clamp01(m.eslintErrors / 20)
    + 0.2 * clamp01(m.anyCount / 60)
    + 0.1 * clamp01(1 - m.maintainability / 100),
  );

  const coupling_pressure = clamp01(
    0.5 * clamp01(m.fanOut / range(repo, 'fanOut'))
    + 0.3 * clamp01(m.fanIn / range(repo, 'fanIn'))
    + 0.2 * (m.layerViolation ? 1 : 0),
  );

  const entryBoundary = file.boundaries?.some((b) => b.kind === 'entry') ? 1 : 0;
  const pagerankScale = 1 / 0.02;
  const criticality_proxy = clamp01(
    0.4 * (m.publicApi ? 1 : 0)
    + 0.3 * clamp01(m.blastRadius / range(repo, 'blastRadius'))
    + 0.2 * clamp01(m.pagerank * pagerankScale)
    + 0.1 * entryBoundary
    + jitter,
  );

  return {
    change_pressure,
    structural_friction,
    health_deficit,
    coupling_pressure,
    criticality_proxy,
  };
}
