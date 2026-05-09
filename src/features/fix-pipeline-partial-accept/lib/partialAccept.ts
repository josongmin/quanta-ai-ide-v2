import type {
  FixCandidate,
  PartialAcceptance,
  ReanalysisSnapshot,
} from '@entities/fix-pipeline';

// Partial-accept — Phase 3 diff-aware re-planning. The user accepts only
// some hunks of a candidate's diff; the system recomputes "what's still
// left to do" so the next iteration sees the residual radius, not the
// original.
//
// MVP semantics: each accepted hunk linearly closes 1 taint path, 1 blast
// module, drops the hotspot score by `original/total_hunks`. Real impl
// re-runs the static engine against the partially-applied tree.

export function applyPartialAccept(
  candidate: FixCandidate,
  prev: ReanalysisSnapshot,
  acceptedHunkIndices: number[],
): PartialAcceptance {
  const totalHunks = candidate.diff.length || 1;
  const acceptedCount = Math.min(acceptedHunkIndices.length, totalHunks);
  const ratio = acceptedCount / totalHunks;

  // Residual = what's left after partial accept. We diff *down* from the
  // pre-accept "before" snapshot — so the residual `before` is the
  // post-original-before-accept, and `after` is what'd be left if the
  // user accepts the rest.
  const residualBefore = {
    taintPaths: Math.max(0, Math.round(prev.before.taintPaths * (1 - ratio))),
    blastModules: Math.max(0, Math.round(prev.before.blastModules * (1 - ratio))),
    hotspotScore: Math.max(0, Math.round(prev.before.hotspotScore * (1 - ratio))),
  };
  const residualAfter = {
    taintPaths: Math.max(0, prev.after.taintPaths),
    blastModules: Math.max(0, prev.after.blastModules),
    hotspotScore: Math.max(0, prev.after.hotspotScore),
  };

  return {
    candidateId: candidate.id,
    acceptedHunkIndices: [...acceptedHunkIndices].sort((a, b) => a - b),
    residual: {
      before: residualBefore,
      after: residualAfter,
      ranAt: new Date().toISOString(),
    },
  };
}

// Toggle helper — UI passes the current acceptance and a hunk index, gets
// the next acceptance back.
export function toggleHunk(current: number[], index: number): number[] {
  const set = new Set(current);
  if (set.has(index)) set.delete(index);
  else set.add(index);
  return Array.from(set).sort((a, b) => a - b);
}
