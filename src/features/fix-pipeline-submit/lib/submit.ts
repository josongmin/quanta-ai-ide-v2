import { assertNever } from '@shared/lib';
import type {
  DeliveryDecision,
  PermissionLedger,
  SubmissionRecord,
} from '@entities/fix-pipeline';

// Submission action — Phase 2 ("guarded one-click draft PR") plus Phase 3
// ("policy-aware auto submit"). Whether a candidate can be submitted is a
// pure function of (tier, permissions): no UI interrogation. The store
// calls `decideSubmissionAction` to figure out what verb the button is.

export type SubmissionAction =
  | { kind: 'auto-submit'; reason: string }      // safe-mechanical + graduated
  | { kind: 'manual-submit'; reason: string }    // guarded + graduated
  | { kind: 'blocked'; reason: string };         // human-required or pre-graduation

export function decideSubmissionAction(
  decision: DeliveryDecision,
  permissions: PermissionLedger,
): SubmissionAction {
  if (decision.tier === 'human-required') {
    const why = decision.blockers[0] ?? 'human review 필요';
    return { kind: 'blocked', reason: why };
  }
  if (!permissions.graduated) {
    return {
      kind: 'blocked',
      reason: `점진적 권한 부여 모드 (${permissions.successfulRuns.toString()}/${permissions.graduationThreshold.toString()})`,
    };
  }
  if (decision.tier === 'safe-mechanical') {
    return { kind: 'auto-submit', reason: 'safe-mechanical · 권한 졸업 — 자동 제출 가능' };
  }
  if (decision.tier === 'guarded') {
    return { kind: 'manual-submit', reason: 'guarded · 명시 승인 필요' };
  }
  // Every DeliveryTier is handled above; a new tier becomes a compile error here.
  return assertNever(decision.tier);
}

// Mock submission — assigns a fake PR number and timestamps. Real impl
// hits the GitHub/GitLab API and returns the PR URL.
let nextPrNumber = 5000;

export function submit(
  candidateId: string,
  by: 'system' | 'user',
): SubmissionRecord {
  const prNumber = nextPrNumber++;
  return {
    candidateId,
    status: by === 'system' ? 'auto-submitted' : 'manually-submitted',
    prNumber,
    submittedAt: new Date().toISOString(),
    submittedBy: by,
    blockerReason: null,
  };
}

export function blockedRecord(candidateId: string, reason: string): SubmissionRecord {
  return {
    candidateId,
    status: 'submission-blocked',
    prNumber: null,
    submittedAt: null,
    submittedBy: null,
    blockerReason: reason,
  };
}

export function unsubmittedRecord(candidateId: string): SubmissionRecord {
  return {
    candidateId,
    status: 'unsubmitted',
    prNumber: null,
    submittedAt: null,
    submittedBy: null,
    blockerReason: null,
  };
}
