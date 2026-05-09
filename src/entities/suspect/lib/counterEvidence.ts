// "Why NOT this suspect" — first-class output of the ranking engine.
//
// The plan elevates counter-evidence to the *primary* surface alongside
// confidence. The rule of thumb baked in here: if a higher-ranked
// candidate has a stronger version of one of this suspect's signals,
// surface that as a refutation. Also surface signal absences (no stack
// hit, weak temporal proximity) so the reader gets a readable margin
// of doubt.

import type { Suspect, SuspectSignalKind } from '../model';
import { aggregateSignalWeight } from './ranking';

const SIGNAL_LABEL: Record<SuspectSignalKind, string> = {
  symbol_overlap: 'changed-symbol overlap',
  stack_match: 'stack-frame match',
  temporal_proximity: 'first-seen proximity',
  incident_history: 'past-incident pattern',
  graph_path: 'call-graph proximity',
};

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function maxWeightOf(s: Suspect, kind: SuspectSignalKind): number {
  let max = 0;
  for (const sig of s.rankingSignals) {
    if (sig.kind === kind && sig.weight > max) max = sig.weight;
  }
  return max;
}

export function buildCounterEvidence(
  suspect: Suspect,
  allSuspects: Suspect[],
): string[] {
  const out: string[] = [];
  const ownWeight = aggregateSignalWeight(suspect.rankingSignals);
  const ownKinds = new Set(suspect.rankingSignals.map((s) => s.kind));

  // 1. Other suspect has a stronger version of one of our signals.
  for (const sig of suspect.rankingSignals) {
    let bestRival: Suspect | null = null;
    let bestRivalWeight = sig.weight;
    for (const other of allSuspects) {
      if (other.id === suspect.id) continue;
      const w = maxWeightOf(other, sig.kind);
      if (w > bestRivalWeight) {
        bestRival = other;
        bestRivalWeight = w;
      }
    }
    if (bestRival) {
      out.push(
        `${shortSha(bestRival.commitSha)} has a stronger ${SIGNAL_LABEL[sig.kind]}.`,
      );
    }
  }

  // 2. No stack frame hit at all — important refutation.
  if (!ownKinds.has('stack_match')) {
    out.push('No direct stack-frame hit; ranking relies on inferred signals.');
  }

  // 3. Single-signal candidate — call out under-corroboration.
  if (suspect.rankingSignals.length <= 1) {
    out.push('Only one ranking signal supports this suspect.');
  }

  // 4. Aggregate weight low — readable "weak inferred" framing.
  if (ownWeight < 0.4) {
    out.push('Aggregated signal weight is below the strong-inference threshold.');
  }

  // 5. Temporal mismatch — if no temporal proximity but plenty of history.
  if (!ownKinds.has('temporal_proximity') && ownKinds.has('incident_history')) {
    out.push('File history matches, but commit is not near the first-seen window.');
  }

  // De-duplicate while preserving order, cap at 3 to keep the panel readable.
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const line of out) {
    if (seen.has(line)) continue;
    seen.add(line);
    dedup.push(line);
    if (dedup.length >= 3) break;
  }
  return dedup;
}
