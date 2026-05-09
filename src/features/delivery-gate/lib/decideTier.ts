import type {
  DeliveryDecision,
  FixCandidate,
  PermissionLedger,
  ValidationResult,
} from '@entities/fix-pipeline';

// Quantitative tier thresholds, lifted directly from the feature plan.
// Kept as a single object so they can move to a policy-bundle later
// without scattering magic numbers across the codebase.
export const TIER_THRESHOLDS = {
  safeMechanical: {
    maxLines: 20,
    maxFiles: 2,
    maxModules: 1,
  },
  guarded: {
    maxModules: 5,
  },
} as const;

// Whitelist of patch kinds that *can* graduate to safe-mechanical when all
// other conditions hold. The MVP only labels candidates by title heuristics
// — a real implementation would tag the kind at generation time.
const MECHANICAL_KIND_PATTERNS = [
  /rename/i,
  /null[- ]?check/i,
  /typo/i,
  /deprecated/i,
];

function isMechanicalKind(title: string): boolean {
  return MECHANICAL_KIND_PATTERNS.some((re) => re.test(title));
}

export function decideTier(
  candidate: FixCandidate,
  validation: ValidationResult,
  permissions?: PermissionLedger,
): DeliveryDecision {
  const reasons: string[] = [];
  const blockers: string[] = [];

  // Hard blockers first — these collapse to human-required regardless of
  // diff size. Order matches the spec: security path, public API,
  // policy/secret violation, unknown-zone, dynamic unreachable, failed
  // obligations.

  if (candidate.metrics.securityPathTouched) {
    blockers.push('security path 영향');
  }
  if (candidate.metrics.publicApiChanged) {
    blockers.push('public API 변경 — migration 필요');
  }
  // Policy obligations are non-negotiable — secret leak, compliance
  // violation, etc. A single failing policy obligation forces human
  // review even if everything else is clean.
  const policyFailures = validation.obligations.filter(
    (ob) => ob.category === 'policy' && (ob.status === 'fail' || ob.status === 'unknown'),
  );
  if (policyFailures.length > 0) {
    blockers.push(`policy 위반 ${policyFailures.length.toString()}건`);
  }
  if (validation.failed > 0) {
    blockers.push(`${validation.failed.toString()}개 obligation 실패`);
  }
  if (validation.unknowns > 0) {
    blockers.push(`${validation.unknowns.toString()}개 obligation unknown`);
  }
  // Dynamic unreachable explicitly forces human checkpoint per the spec —
  // dynamic-failure-as-pass is the exact bug we refuse to ship.
  if (validation.dynamicUnreachable) {
    blockers.push('dynamic validation 실행 불가 — human checkpoint 강제');
  }

  // Gradual-permission mode — first N successful runs are forcibly held
  // at human-required regardless of how clean the static proof is. The
  // first false positive otherwise kills the feature.
  if (permissions && !permissions.graduated) {
    blockers.push(
      `점진적 권한 부여 모드 (${permissions.successfulRuns.toString()}/${permissions.graduationThreshold.toString()})`,
    );
  }

  if (blockers.length > 0) {
    return { tier: 'human-required', reasons: [], blockers };
  }

  // Guarded check first (it's a superset of safe-mechanical's diff-size
  // gate), then promote to safe-mechanical if all sub-conditions hold.

  if (candidate.metrics.modulesAffected > TIER_THRESHOLDS.guarded.maxModules) {
    blockers.push(`영향 모듈 ${candidate.metrics.modulesAffected.toString()}개 > ${TIER_THRESHOLDS.guarded.maxModules.toString()}`);
    return { tier: 'human-required', reasons: [], blockers };
  }

  reasons.push(`영향 모듈 ${candidate.metrics.modulesAffected.toString()} ≤ ${TIER_THRESHOLDS.guarded.maxModules.toString()}`);
  reasons.push(`static obligations ${validation.passed.toString()}개 통과`);

  // Safe-mechanical promotion gate. Every sub-condition must hold.

  const promote = (
    candidate.metrics.linesChanged <= TIER_THRESHOLDS.safeMechanical.maxLines &&
    candidate.metrics.filesChanged <= TIER_THRESHOLDS.safeMechanical.maxFiles &&
    candidate.metrics.modulesAffected <= TIER_THRESHOLDS.safeMechanical.maxModules &&
    isMechanicalKind(candidate.title) &&
    !candidate.metrics.publicApiChanged
  );

  if (promote) {
    reasons.push('mechanical-kind whitelist 매치');
    return { tier: 'safe-mechanical', reasons, blockers: [] };
  }

  // Capture *what* would have promoted to safe-mechanical, for the UI's
  // "blockers" hint on the guarded tier.
  const guardedBlockers: string[] = [];
  if (candidate.metrics.linesChanged > TIER_THRESHOLDS.safeMechanical.maxLines) {
    guardedBlockers.push(`변경 라인 ${candidate.metrics.linesChanged.toString()} > ${TIER_THRESHOLDS.safeMechanical.maxLines.toString()}`);
  }
  if (candidate.metrics.filesChanged > TIER_THRESHOLDS.safeMechanical.maxFiles) {
    guardedBlockers.push(`변경 파일 ${candidate.metrics.filesChanged.toString()} > ${TIER_THRESHOLDS.safeMechanical.maxFiles.toString()}`);
  }
  if (!isMechanicalKind(candidate.title)) {
    guardedBlockers.push('mechanical-kind whitelist 미매치');
  }

  return { tier: 'guarded', reasons, blockers: guardedBlockers };
}

export function tierLabel(tier: DeliveryDecision['tier']): string {
  switch (tier) {
    case 'safe-mechanical': return 'safe mechanical';
    case 'guarded':         return 'guarded';
    case 'human-required':  return 'human required';
  }
}
