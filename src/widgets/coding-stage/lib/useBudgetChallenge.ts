import { useState } from 'react';
import type { ComposerModelId } from '../parts/Composer';

// Soft-cap budget challenge state, extracted from CodingStage without
// behavioural change.
//
// `budgetChallenge`: null = no challenge; set = block-or-choose modal
// shown when the user attempts to submit while cost already exceeds the
// project's soft cap. Pattern: ATM "you're about to overdraft" challenge
// — present 3 paths, never silent failure.
//
// `softCapOverridden`: per-task soft-cap override — once raised, that
// task's threshold is bumped to hardCap so the user can finish the work
// without being re-prompted on every turn.
//
// The actual submit-intercept logic and the auto-downgrade / override /
// stop handlers stay in the composition root because they close over
// onSubmitComposer, cost and model.
export type BudgetChallenge = {
  used: number;
  cap: number;
  primary: ComposerModelId;
  downgrade: ComposerModelId;
};

export function useBudgetChallenge() {
  const [budgetChallenge, setBudgetChallenge] = useState<null | BudgetChallenge>(null);
  const [softCapOverridden, setSoftCapOverridden] = useState<Record<string, boolean>>({});

  return {
    budgetChallenge, setBudgetChallenge,
    softCapOverridden, setSoftCapOverridden,
  };
}
