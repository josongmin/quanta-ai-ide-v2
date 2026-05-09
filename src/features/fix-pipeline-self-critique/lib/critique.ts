import type {
  CritiqueIteration,
  FixCandidate,
  ValidationResult,
} from '@entities/fix-pipeline';

// Self-healing loop — Phase 3. After a validation iteration fails, the
// system synthesises a *next* candidate that incorporates the failure
// summary as a constraint. The MVP fakes the re-patch by tweaking the
// existing candidate's metrics (smaller diff, less ambitious) and tagging
// it as a follow-up iteration. A real impl re-prompts the LLM with the
// failure as context.
//
// Bounded by `fix-pipeline-loop` — this module just builds the *what*,
// the store decides *whether* to actually run another iteration.

export type CritiqueResult = {
  nextCandidate: FixCandidate;
  history: CritiqueIteration;
};

export function critiqueAndRepatch(input: {
  prev: FixCandidate;
  validation: ValidationResult;
  iteration: number;
}): CritiqueResult | null {
  const { prev, validation, iteration } = input;
  // Pick the most material failure to drive the adjustment narrative.
  const failing = validation.obligations.filter(
    (ob) => ob.status === 'fail' || ob.status === 'unknown',
  );
  if (failing.length === 0) return null;

  const worst = failing[0];
  const failureSummary = `${worst.category}/${worst.label} → ${worst.detail ?? worst.rationale}`;

  // The repatched candidate. We retag the id with the new iteration so
  // the audit trail shows distinct entries. The diff intentionally
  // narrows: a failed iteration is the cue to take *less* not more.
  const nextId = `${prev.id}::iter-${iteration.toString()}`;
  const nextCandidate: FixCandidate = {
    ...prev,
    id: nextId,
    title: `${prev.title} (iter ${iteration.toString()})`,
    rationale: `${prev.rationale}\n\n[iter ${iteration.toString()}] ${describeAdjustment(worst.category)}`,
    metrics: {
      ...prev.metrics,
      // Narrow the patch — the canonical "less ambitious second try" move.
      linesChanged: Math.max(1, Math.floor(prev.metrics.linesChanged * 0.6)),
      filesChanged: Math.max(1, Math.min(prev.metrics.filesChanged, 1)),
      modulesAffected: Math.max(1, Math.min(prev.metrics.modulesAffected, 1)),
      publicApiChanged: false,
    },
    isRecommended: true,
    rejectedReason: undefined,
  };

  const adjustment = describeAdjustment(worst.category);

  return {
    nextCandidate,
    history: {
      iteration,
      candidateIdBefore: prev.id,
      candidateIdAfter: nextId,
      failureSummary,
      adjustment,
      at: new Date().toISOString(),
    },
  };
}

function describeAdjustment(category: string): string {
  switch (category) {
    case 'static':    return 'static obligation 통과 못한 영역 회피 — diff 축소';
    case 'dynamic':   return 'dynamic check 실패 영역의 변경 제거';
    case 'policy':    return 'policy 위반 패턴 우회 — 안전한 대안 적용';
    case 'stylistic': return '컨벤션 일치하도록 helper 재사용';
    case 'human':     return 'public API surface 미변경으로 후퇴';
    default:          return '범위 축소';
  }
}
