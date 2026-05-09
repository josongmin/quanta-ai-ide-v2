import type {
  ConfidenceLevel,
  ConfidenceScore,
  FixCandidate,
  ProofObligation,
  ValidationResult,
} from '@entities/fix-pipeline';

// Confidence model — shared with feature 03 (blast-radius). The 3-state
// vocabulary is deliberate: a candidate's score and a blast-radius edge's
// score must collapse to the same bucket for the same situation. Drift
// here means the two panels disagreeing about the same patch, which is the
// failure mode the docs warn about.
//
// Mapping (MVP):
//   exact      — every static obligation passed AND no dynamic unknowns AND
//                no public-API churn AND security path explicitly verified
//   overapprox — static passes but dynamic still pending OR pure-static
//                fix on a non-recommended candidate
//   unknown    — failures present, dynamic unreachable, or required human
//                obligations unresolved

export function computeConfidence(
  candidate: FixCandidate,
  validation: ValidationResult,
): ConfidenceScore {
  const level = decideLevel(candidate, validation);
  const numeric = scoreNumeric(level, validation);
  const weakest = pickWeakest(validation.obligations);
  return { level, numeric, weakestObligation: weakest };
}

function decideLevel(
  candidate: FixCandidate,
  validation: ValidationResult,
): ConfidenceLevel {
  if (validation.failed > 0) return 'unknown';
  if (validation.dynamicUnreachable) return 'unknown';

  const dynamicResolved = validation.obligations
    .filter((ob) => ob.category === 'dynamic')
    .every((ob) => ob.status === 'pass');

  const humanResolved = validation.obligations
    .filter((ob) => ob.category === 'human')
    .every((ob) => ob.status === 'pass');

  if (dynamicResolved && humanResolved && !candidate.metrics.publicApiChanged) {
    return 'exact';
  }
  return 'overapprox';
}

function scoreNumeric(level: ConfidenceLevel, validation: ValidationResult): number {
  const total = validation.obligations.length;
  if (total === 0) return 0;
  const base = validation.passed / total;
  // Damp by level so the numeric never overstates the bucket.
  const cap = level === 'exact' ? 1.0 : level === 'overapprox' ? 0.75 : 0.4;
  return Math.min(base, cap);
}

function pickWeakest(obligations: ProofObligation[]): string {
  // Order of severity: failed > unknown > pending > pass.
  const failed = obligations.find((ob) => ob.status === 'fail');
  if (failed) return failed.label;
  const unknown = obligations.find((ob) => ob.status === 'unknown');
  if (unknown) return unknown.label;
  const pending = obligations.find((ob) => ob.status === 'pending');
  if (pending) return pending.label;
  return obligations[obligations.length - 1]?.label ?? '없음';
}

export function levelLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'exact':      return '정확 (exact)';
    case 'overapprox': return '근사 (overapprox)';
    case 'unknown':    return '불명 (unknown)';
  }
}
