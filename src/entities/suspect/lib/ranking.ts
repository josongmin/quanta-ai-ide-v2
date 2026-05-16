// Pure ranking helpers. No React, no fixtures — `fixtures.ts` consumes
// these to materialise mock rankings, and the UI consumes the resulting
// shape. Keeping them split lets us unit-test ranking without dragging
// fixture data along.

import type {
  Suspect,
  SuspectConfidence,
  SuspectSignal,
} from '../model';

// ─────────────────────────────────────────────────────────────────────────
// Aggregation — sum of signal weights, capped to 1. Cap matters because
// multiple weak signals shouldn't masquerade as a strong inference.
// ─────────────────────────────────────────────────────────────────────────

export function aggregateSignalWeight(signals: SuspectSignal[]): number {
  let total = 0;
  for (const s of signals) total += s.weight;
  return Math.min(1, total);
}

// ─────────────────────────────────────────────────────────────────────────
// Confidence — the calibration rule from the plan:
//   exact           : stack_match present AND symbol_overlap present
//   strong_inferred : 2+ corroborating signals (no stack hit needed)
//   weak_inferred   : single signal or under-corroborated
// ─────────────────────────────────────────────────────────────────────────

function inferConfidence(signals: SuspectSignal[]): SuspectConfidence {
  const kinds = new Set(signals.map((s) => s.kind));
  if (kinds.has('stack_match') && kinds.has('symbol_overlap')) {
    return 'exact';
  }
  if (signals.length >= 2 && aggregateSignalWeight(signals) >= 0.55) {
    return 'strong_inferred';
  }
  return 'weak_inferred';
}

// ─────────────────────────────────────────────────────────────────────────
// rankSuspects — sort descending by aggregated weight, re-stamp confidence
// from the underlying signals (callers can pass in candidates with stale
// or missing confidence and trust the output).
// ─────────────────────────────────────────────────────────────────────────

export function rankSuspects(candidates: Suspect[]): Suspect[] {
  const enriched = candidates.map((c) => ({
    ...c,
    confidence: inferConfidence(c.rankingSignals),
  }));
  enriched.sort((a, b) => {
    const wa = aggregateSignalWeight(a.rankingSignals);
    const wb = aggregateSignalWeight(b.rankingSignals);
    if (wa !== wb) return wb - wa;
    // Tie-break: more recent commit first — fresher changes are usually
    // the more interesting suspect when weights match.
    return b.createdAt.localeCompare(a.createdAt);
  });
  return enriched;
}
