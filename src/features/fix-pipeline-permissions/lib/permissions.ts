import type { PermissionLedger } from '@entities/fix-pipeline';

// Gradual-permission mode — for the first N successful runs the gate is
// forcibly held at human-required regardless of how clean the static
// proof is. The first false positive otherwise kills the feature.
//
// Demo defaults: graduate after 3 successful runs. Real impl persists
// per-user, per-team and reads from a server-side ledger.

export const GRADUATION_THRESHOLD = 3;

export const INITIAL_LEDGER: PermissionLedger = {
  successfulRuns: 0,
  graduationThreshold: GRADUATION_THRESHOLD,
  graduated: false,
};

export function recordSuccess(ledger: PermissionLedger): PermissionLedger {
  const next = ledger.successfulRuns + 1;
  return {
    ...ledger,
    successfulRuns: next,
    graduated: next >= ledger.graduationThreshold,
  };
}

// True when the user has not yet earned auto-submit permission.
export function isGated(ledger: PermissionLedger): boolean {
  return !ledger.graduated;
}
