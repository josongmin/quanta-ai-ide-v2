// Shared builders for fix-pipeline domain shapes, used by the pure-logic tests
// (decideTier, loop, submit, permissions, buildObligations, computeConfidence) that all consume the same
// FixCandidate / ValidationResult / PermissionLedger / DeliveryDecision types.
//
// Defaults-with-overrides: every builder returns a valid "clean baseline" and
// takes a Partial to tweak the fields a given test cares about. buildValidation
// derives the aggregate counts from its obligations by default so a test can't
// accidentally assert against inconsistent tallies.

import type {
  CycleCost,
  DeliveryDecision,
  FixCandidate,
  PermissionLedger,
  ProofObligation,
  ValidationResult,
} from '../model';

export function buildObligation(o: Partial<ProofObligation> = {}): ProofObligation {
  return {
    id: 'ob-static-1',
    category: 'static',
    label: 'types',
    rationale: 'type-check must pass',
    status: 'pass',
    ...o,
  };
}

export function buildValidation(
  o: Partial<ValidationResult> = {},
): ValidationResult {
  const obligations = o.obligations ?? [buildObligation()];
  // Derive the denormalised counts from the obligations unless explicitly set.
  const passed = o.passed ?? obligations.filter((x) => x.status === 'pass').length;
  const failed = o.failed ?? obligations.filter((x) => x.status === 'fail').length;
  const unknowns = o.unknowns ?? obligations.filter((x) => x.status === 'unknown').length;
  return {
    candidateId: o.candidateId ?? 'cand-1',
    obligations,
    passed,
    failed,
    unknowns,
    dynamicUnreachable: o.dynamicUnreachable ?? false,
  };
}

export function buildCandidate(
  o: Partial<Omit<FixCandidate, 'metrics'>> & {
    metrics?: Partial<FixCandidate['metrics']>;
  } = {},
): FixCandidate {
  return {
    id: 'cand-1',
    seedId: 'seed-1',
    // "fix typo …" matches the mechanical-kind whitelist → clean safe-mechanical
    // baseline; tests override the title to fall out of that class.
    title: 'fix typo in foo',
    rationale: 'straightforward correction',
    diff: [],
    isRecommended: true,
    ...o,
    metrics: {
      linesChanged: 10,
      filesChanged: 1,
      modulesAffected: 1,
      publicApiChanged: false,
      securityPathTouched: false,
      ...o.metrics,
    },
  };
}

export function buildPermissions(
  o: Partial<PermissionLedger> = {},
): PermissionLedger {
  // Graduated by default so the permission gate is OPEN; tests opt into the
  // pre-graduation path explicitly.
  return {
    successfulRuns: 10,
    graduationThreshold: 5,
    graduated: true,
    ...o,
  };
}

export function buildDecision(
  o: Partial<DeliveryDecision> = {},
): DeliveryDecision {
  return {
    tier: 'safe-mechanical',
    reasons: [],
    blockers: [],
    ...o,
  };
}

export function buildCost(o: Partial<CycleCost> = {}): CycleCost {
  return {
    tokensIn: 0,
    tokensOut: 0,
    ciSeconds: 0,
    usd: 0,
    ...o,
  };
}
