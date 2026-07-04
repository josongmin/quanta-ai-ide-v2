import { describe, it, expect } from 'vitest';
import { recordSuccess, isGated, INITIAL_LEDGER, GRADUATION_THRESHOLD } from '../permissions';

// Gradual-permission gate: the first N successful runs are held at
// human-required. A boundary bug here would auto-submit before the user has
// earned it — exactly what this gate prevents.

describe('permissions', () => {
  it('starts gated', () => {
    expect(INITIAL_LEDGER.graduated).toBe(false);
    expect(isGated(INITIAL_LEDGER)).toBe(true);
  });

  it('graduates exactly at the threshold, not before', () => {
    let ledger = INITIAL_LEDGER;
    for (let i = 1; i < GRADUATION_THRESHOLD; i++) {
      ledger = recordSuccess(ledger);
      expect(ledger.graduated).toBe(false);
      expect(ledger.successfulRuns).toBe(i);
    }
    ledger = recordSuccess(ledger); // the Nth success
    expect(ledger.successfulRuns).toBe(GRADUATION_THRESHOLD);
    expect(ledger.graduated).toBe(true);
    expect(isGated(ledger)).toBe(false);
  });

  it('is immutable (returns a new ledger)', () => {
    const next = recordSuccess(INITIAL_LEDGER);
    expect(INITIAL_LEDGER.successfulRuns).toBe(0);
    expect(next).not.toBe(INITIAL_LEDGER);
  });
});
