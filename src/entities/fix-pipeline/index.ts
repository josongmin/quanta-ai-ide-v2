// Public API for the fix-pipeline entity.
//
// Domain types + sample seeds + seed validator. Features are free to add
// their own mock generators on top, but the core types live here so two
// the fix-pipeline feature's several consumers (e.g. confidence scoring +
// tier/gate decisioning) cannot drift on the same shape.

export type {
  FixSeed,
  ConfidenceLevel,
  ConfidenceScore,
  ObligationCategory,
  ProofObligation,
  DiffHunk,
  FixCandidate,
  DeliveryDecision,
  ValidationResult,
  DismissReason,
  CandidateDismissal,
  // Adjacent-but-still-public model types — exported so features and
  // widgets can consume them without reaching into the model file.
  CycleCost,
  CostTelemetry,
  LoopTerminationReason,
  LoopState,
  Freshness,
  OpenPrConflict,
  PermissionLedger,
  ReanalysisSnapshot,
  ReviewerSuggestion,
  ReviewerRef,
  CritiqueIteration,
  SubmissionRecord,
  RollbackPackage,
  PartialAcceptance,
} from './model';

export { SAMPLE_SEEDS } from './lib/sample';
export { validateSeed } from './lib/seedValidator';
export { freshnessNow, describeFreshness } from './lib/freshness';
export { SAMPLE_CONFLICTS } from './lib/sampleConflicts';
