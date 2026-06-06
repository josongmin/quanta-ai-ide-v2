// Single integration surface for the fix-pipeline orchestrator store.
// Sub-features stay isolated slices; the store imports only from here.

export { simulateGenerate } from '@features/fix-candidate-generator';
export {
  buildObligations,
  simulateRunValidation,
  summariseObligations,
} from '@features/verification-checklist';
export { decideTier } from '@features/delivery-gate';
export { computeConfidence } from '@features/trust-signal';
export { addCost, estimateCycleCost, ZERO_COST } from '@features/fix-pipeline-cost';
export { currentFailureKey, decideTermination, INITIAL_LOOP } from '@features/fix-pipeline-loop';
export { INITIAL_LEDGER, recordSuccess } from '@features/fix-pipeline-permissions';
export { buildReanalysis, markRan } from '@features/fix-pipeline-reanalysis';
export { critiqueAndRepatch } from '@features/fix-pipeline-self-critique';
export { suggestReviewer } from '@features/fix-pipeline-routing';
export { buildRollback } from '@features/fix-pipeline-rollback';
export {
  blockedRecord,
  decideSubmissionAction,
  submit,
  unsubmittedRecord,
} from '@features/fix-pipeline-submit';
export { applyPartialAccept, toggleHunk } from '@features/fix-pipeline-partial-accept';
