// Confidence propagation for impact edges.
//
// An edge is only as trustworthy as its weakest endpoint — if either side is
// unknown, the edge is unknown; if either is overapprox, the edge is at best
// overapprox. The visual style follows the same precedence so a glance at the
// graph tells you which links you can rely on.

import type { ConfidenceState, ImpactEdge } from '../model/types';

// Confidence lattice: exact > overapprox > unknown. The edge inherits the
// minimum (worst) of its endpoints. Keeping this as a small lookup rather
// than ad-hoc comparisons makes it trivial to extend if we ever add a
// fourth state.
const RANK: Record<ConfidenceState, number> = {
  exact: 2,
  overapprox: 1,
  unknown: 0,
};

const RANK_TO_STATE: Record<number, ConfidenceState> = {
  2: 'exact',
  1: 'overapprox',
  0: 'unknown',
};

export function inferEdgeConfidence(
  fromConf: ConfidenceState,
  toConf: ConfidenceState,
): ConfidenceState {
  const min = Math.min(RANK[fromConf], RANK[toConf]);
  // Math.min over a fixed lattice always lands on a known key — the cast is
  // safe because both ranks come from the same enum.
  return RANK_TO_STATE[min] ?? 'unknown';
}

const STYLE_BY_CONFIDENCE: Record<ConfidenceState, ImpactEdge['style']> = {
  exact: 'solid',
  overapprox: 'dashed',
  unknown: 'faded',
};

export function edgeStyle(conf: ConfidenceState): ImpactEdge['style'] {
  return STYLE_BY_CONFIDENCE[conf];
}
