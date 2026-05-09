import type { FixCandidate, FixSeed, ReanalysisSnapshot } from '@entities/fix-pipeline';

// Mock post-patch re-analysis. Real impl re-runs taint / blast / hotspot
// against a virtual tree with the patch applied. We return a synthetic
// snapshot that's deterministic per candidate so the demo stays stable.

export function snapshotBefore(seed: FixSeed): ReanalysisSnapshot['before'] {
  // Larger evidence list ≈ more taint paths. Hotspot score is a 0-100
  // scalar we make up from blastHint count.
  return {
    taintPaths: seed.evidenceRefs.filter((r) => r.kind === 'taint-path').length || 1,
    blastModules: (seed.blastHint ?? []).length || 1,
    hotspotScore: 70,
  };
}

export function snapshotAfter(
  candidate: FixCandidate,
  before: ReanalysisSnapshot['before'],
): ReanalysisSnapshot['after'] {
  if (candidate.isRecommended) {
    return {
      taintPaths: 0,
      blastModules: Math.max(0, before.blastModules - 1),
      hotspotScore: Math.max(0, before.hotspotScore - 35),
    };
  }
  // Non-recommended candidates partially help — taint may close, but
  // blast doesn't shrink as cleanly.
  return {
    taintPaths: Math.max(0, before.taintPaths - 1),
    blastModules: before.blastModules,
    hotspotScore: Math.max(0, before.hotspotScore - 10),
  };
}

export function buildReanalysis(seed: FixSeed, candidate: FixCandidate): ReanalysisSnapshot {
  const before = snapshotBefore(seed);
  const after = snapshotAfter(candidate, before);
  return {
    before,
    after,
    ranAt: null,
  };
}

export function markRan(snap: ReanalysisSnapshot): ReanalysisSnapshot {
  return { ...snap, ranAt: new Date().toISOString() };
}
