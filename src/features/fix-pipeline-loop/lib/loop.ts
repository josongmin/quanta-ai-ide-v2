import type {
  CycleCost,
  LoopState,
  LoopTerminationReason,
  ValidationResult,
} from '@entities/fix-pipeline';

// Bounded agent loop — the spec is explicit that the system must stop,
// and stop *honestly*. We track the reason we halted so the UI can show
// "stopped at iter 2 because critique repeated" rather than a silent
// halt.
//
// Budgets are intentionally small for the MVP. A real impl moves these
// into the policy bundle.

export const LOOP_BUDGETS = {
  maxIterations: 2,
  maxCumulativeUsd: 1.0,
  maxCumulativeCiSeconds: 600,
} as const;

export const INITIAL_LOOP: LoopState = {
  iteration: 0,
  maxIterations: LOOP_BUDGETS.maxIterations,
  terminated: false,
  reason: null,
};

// Decide whether the loop should stop after the latest validation, given
// the cumulative cost and the previous iteration's failure summary. The
// MVP doesn't actually re-prompt the model; it just demonstrates the
// stopping rules so the loop UI is honest.
export function decideTermination(input: {
  iteration: number;
  cumulative: CycleCost;
  validation: ValidationResult;
  prevFailureKey: string | null;
}): LoopTerminationReason | null {
  const { iteration, cumulative, validation, prevFailureKey } = input;

  // Success — every obligation pass. (Pending counts as not-yet-success;
  // the user has to click "run" to advance.)
  if (validation.failed === 0 && validation.unknowns === 0 && validation.obligations.every((o) => o.status === 'pass')) {
    return 'success';
  }

  if (cumulative.usd >= LOOP_BUDGETS.maxCumulativeUsd) return 'token-budget';
  if (cumulative.ciSeconds >= LOOP_BUDGETS.maxCumulativeCiSeconds) return 'time-budget';

  if (iteration >= LOOP_BUDGETS.maxIterations) return 'max-iterations';

  // Non-progress — same failing-obligation set as last iteration. The
  // canonical signal that the LLM is stuck in a loop.
  const failureKey = currentFailureKey(validation);
  if (failureKey && prevFailureKey === failureKey) return 'non-progress';

  return null;
}

// A stable key identifying the failure mode this iteration. If two
// iterations produce the same key, the loop is making no progress.
export function currentFailureKey(v: ValidationResult): string | null {
  const failing = v.obligations
    .filter((ob) => ob.status === 'fail' || ob.status === 'unknown')
    .map((ob) => `${ob.category}:${ob.label}`)
    .sort();
  if (failing.length === 0) return null;
  return failing.join('|');
}

export function describeReason(reason: LoopTerminationReason): string {
  switch (reason) {
    case 'max-iterations': return 'max iterations 도달';
    case 'time-budget':    return 'CI 시간 budget 초과';
    case 'token-budget':   return 'token / cost budget 초과';
    case 'non-progress':   return '같은 실패 반복 — 진전 없음';
    case 'all-rejected':   return '모든 candidate 거절됨';
    case 'success':        return 'obligations 모두 통과';
  }
}
