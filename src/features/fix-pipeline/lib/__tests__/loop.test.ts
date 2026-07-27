import { describe, it, expect } from 'vitest';
import { decideTermination, currentFailureKey, LOOP_BUDGETS } from '../loop';
import {
  buildObligation,
  buildValidation,
  buildCost,
} from '@entities/fix-pipeline/__tests__/_fixtures';

// The bounded loop must stop honestly. decideTermination's priority ordering
// (success > token-budget > time-budget > max-iterations > non-progress) is the
// regression surface — reordering the ifs silently changes why the loop halts.

const passing = () => buildValidation({ obligations: [buildObligation({ status: 'pass' })] });
const failing = (label = 'types') =>
  buildValidation({ obligations: [buildObligation({ label, status: 'fail' })] });

describe('decideTermination', () => {
  it("returns 'success' when every obligation passes, even over budget/iterations", () => {
    const reason = decideTermination({
      iteration: 9,
      cumulative: buildCost({ usd: 5, ciSeconds: 9999 }),
      validation: passing(),
      prevFailureKey: null,
    });
    expect(reason).toBe('success'); // success is checked first — precedence proof
  });

  it("returns 'token-budget' when cumulative usd hits the cap", () => {
    const reason = decideTermination({
      iteration: 0,
      cumulative: buildCost({ usd: LOOP_BUDGETS.maxCumulativeUsd }),
      validation: failing(),
      prevFailureKey: null,
    });
    expect(reason).toBe('token-budget');
  });

  it("returns 'time-budget' when CI seconds hit the cap (usd below)", () => {
    const reason = decideTermination({
      iteration: 0,
      cumulative: buildCost({ ciSeconds: LOOP_BUDGETS.maxCumulativeCiSeconds }),
      validation: failing(),
      prevFailureKey: null,
    });
    expect(reason).toBe('time-budget');
  });

  it("returns 'max-iterations' at the iteration cap with budgets clear", () => {
    const reason = decideTermination({
      iteration: LOOP_BUDGETS.maxIterations,
      cumulative: buildCost(),
      validation: failing(),
      prevFailureKey: null,
    });
    expect(reason).toBe('max-iterations');
  });

  it("returns 'non-progress' when the failing set repeats", () => {
    const validation = failing('types');
    const reason = decideTermination({
      iteration: 1,
      cumulative: buildCost(),
      validation,
      prevFailureKey: currentFailureKey(validation),
    });
    expect(reason).toBe('non-progress');
  });

  it('returns null (keep looping) when failing, within budgets, no repeat', () => {
    const reason = decideTermination({
      iteration: 1,
      cumulative: buildCost(),
      validation: failing(),
      prevFailureKey: null,
    });
    expect(reason).toBeNull();
  });
});

describe('currentFailureKey', () => {
  it('is null when nothing is failing', () => {
    expect(currentFailureKey(passing())).toBeNull();
  });

  it('is order-independent (sorted join of failing obligations)', () => {
    const a = buildValidation({
      obligations: [
        buildObligation({ label: 'beta', status: 'fail' }),
        buildObligation({ label: 'alpha', status: 'unknown' }),
      ],
    });
    const b = buildValidation({
      obligations: [
        buildObligation({ label: 'alpha', status: 'unknown' }),
        buildObligation({ label: 'beta', status: 'fail' }),
      ],
    });
    expect(currentFailureKey(a)).toBe(currentFailureKey(b));
  });
});
