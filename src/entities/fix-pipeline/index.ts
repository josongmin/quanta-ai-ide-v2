// Public API for the fix-pipeline entity.
//
// Domain types + sample seeds + seed validator. Features are free to add
// their own mock generators on top, but the core types live here so two
// features (e.g. confidence + delivery-gate) cannot drift on the same shape.

export type {
  SeedKind,
  EvidenceRef,
  FixSeed,
  ConfidenceLevel,
  ConfidenceScore,
  ObligationCategory,
  ObligationStatus,
  ProofObligation,
  DiffHunk,
  FixCandidate,
  DeliveryTier,
  DeliveryDecision,
  ValidationResult,
  DismissReason,
  CandidateDismissal,
  PipelineSnapshot,
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
} from './model';

export { SAMPLE_SEEDS } from './lib/sample';
export { validateSeed, describeError, type SeedValidationError } from './lib/seedValidator';
export { freshnessNow, describeFreshness } from './lib/freshness';
export { SAMPLE_CONFLICTS } from './lib/sampleConflicts';
