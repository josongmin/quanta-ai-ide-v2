import { describe, it, expect } from 'vitest';
import { decideSubmissionAction } from '../submit';
import {
  buildDecision,
  buildPermissions,
} from '@entities/fix-pipeline/__tests__/_fixtures';

// decideSubmissionAction(tier, permissions) → the verb on the submit button.
// Gating (graduation) beats tier: a guarded patch is still blocked pre-grad.
// The exhaustive switch (assertNever) locks in coverage of every DeliveryTier.

describe('decideSubmissionAction', () => {
  it('blocks human-required with the first blocker as the reason', () => {
    const a = decideSubmissionAction(
      buildDecision({ tier: 'human-required', blockers: ['security path 영향'] }),
      buildPermissions(),
    );
    expect(a.kind).toBe('blocked');
    expect(a.reason).toBe('security path 영향');
  });

  it('blocks human-required with a fallback reason when blockers are empty', () => {
    const a = decideSubmissionAction(
      buildDecision({ tier: 'human-required', blockers: [] }),
      buildPermissions(),
    );
    expect(a.kind).toBe('blocked');
    expect(a.reason.length).toBeGreaterThan(0);
  });

  it('auto-submits a graduated safe-mechanical patch', () => {
    const a = decideSubmissionAction(buildDecision({ tier: 'safe-mechanical' }), buildPermissions());
    expect(a.kind).toBe('auto-submit');
  });

  it('requires a manual click for a graduated guarded patch', () => {
    const a = decideSubmissionAction(buildDecision({ tier: 'guarded' }), buildPermissions());
    expect(a.kind).toBe('manual-submit');
  });

  it('blocks before graduation even for an otherwise-submittable tier', () => {
    const a = decideSubmissionAction(
      buildDecision({ tier: 'guarded' }),
      buildPermissions({ graduated: false, successfulRuns: 2, graduationThreshold: 3 }),
    );
    expect(a.kind).toBe('blocked');
  });

  it('handles every delivery tier without throwing (exhaustiveness)', () => {
    for (const tier of ['safe-mechanical', 'guarded', 'human-required'] as const) {
      expect(() => decideSubmissionAction(buildDecision({ tier }), buildPermissions())).not.toThrow();
    }
  });
});
