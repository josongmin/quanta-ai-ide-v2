import type { FixCandidate, RollbackPackage } from '@entities/fix-pipeline';

// Rollback package — pulled into Phase 2 alongside auto-submit. Without
// this, the "guarded one-click" path can ship a patch that nobody can
// safely revert. The pair must always ship together.
//
// MVP generates a deterministic revert plan from the candidate's diff.
// Real impl wires a `git revert <sha>` PR + branch protection rules.

export function buildRollback(candidate: FixCandidate): RollbackPackage {
  const files = Array.from(new Set(candidate.diff.map((h) => h.file)));
  const revertCommitMessage = `Revert "${candidate.title}"\n\nReason: <fill reason>\nOriginal patch: ${candidate.id}`;
  const steps = [
    `git revert <merge-sha>  # ${candidate.title}`,
    `git push origin revert/${candidate.id}`,
    'open revert PR — link to incident if any',
    'verify affected tests pass on revert branch',
    'merge with same review tier as the original (no fast-track)',
  ];
  return {
    candidateId: candidate.id,
    revertCommitMessage,
    affectedFiles: files,
    steps,
  };
}
