// Domain types for the AI Verified Fix Pipeline.
//
// Boundary rules — everything in this file is a plain data shape. No React,
// no UI, no zustand. Features import these types and feed concrete instances
// back through their own logic; widgets only render. Replaceable analyzers
// (static / AI / hybrid) all conform to these shapes.

type SeedKind = 'incident' | 'hotspot' | 'alert' | 'focus';

type EvidenceRef = {
  kind: 'file' | 'symbol' | 'taint-path' | 'sarif' | 'stack-frame';
  // Display label — `src/auth/session.ts:42` style. No filesystem access.
  label: string;
  // Optional pointer back to the engine node id, when available. The MVP
  // doesn't follow it, but it lets a real backend wire up later without a
  // type change.
  engineId?: string;
};

// `evidence_refs` is required: a generator that runs without it falls back
// to chat-completion behaviour and undermines every downstream proof step.
// `seedValidator` enforces this at the pipeline entry.
export type FixSeed = {
  id: string;
  kind: SeedKind;
  symptom: string;
  evidenceRefs: EvidenceRef[];
  suspectedRootCause?: string;
  blastHint?: string[];
  constraints?: {
    publicApi?: boolean;
    securityPath?: boolean;
    forbidden?: string[];
  };
};

// Three-state confidence, mirrored from feature 03 (blast-radius). Sharing
// the vocabulary is deliberate: 06's confidence_score on a candidate maps to
// the same exact / overapprox / unknown buckets the radius uses for an edge.
// Drift here means two panels disagreeing about the same patch.
export type ConfidenceLevel = 'exact' | 'overapprox' | 'unknown';

export type ConfidenceScore = {
  level: ConfidenceLevel;
  // 0..1, derived from obligation pass rates + evidence strength. Surfaced
  // numerically only on hover; the level is the primary UI signal.
  numeric: number;
  // The single reason most likely to make a reviewer reject this — what the
  // trust-signal panel highlights front-and-centre.
  weakestObligation: string;
};

export type ObligationCategory =
  | 'static'      // taint, blast, types, lints — runs without executing code
  | 'dynamic'     // tests, scans — needs an environment
  | 'stylistic'   // codebase conformance — never blocks, only nudges
  | 'policy'      // compliance, secret-scan, forbidden patterns
  | 'human';      // reviewer judgement, public-API migration

type ObligationStatus = 'pass' | 'fail' | 'unknown' | 'pending';

export type ProofObligation = {
  id: string;
  category: ObligationCategory;
  label: string;
  // Why this obligation exists for this patch. Reviewer reads this to
  // decide if the obligation itself is sensible.
  rationale: string;
  status: ObligationStatus;
  // Free-form detail — assertion result, error message, owner name, etc.
  detail?: string;
};

export type DiffHunk = {
  file: string;
  before: string;
  after: string;
};

export type FixCandidate = {
  id: string;
  seedId: string;
  title: string;
  rationale: string;
  diff: DiffHunk[];
  // Patch-level metrics drive the delivery gate's quantitative thresholds.
  metrics: {
    linesChanged: number;
    filesChanged: number;
    modulesAffected: number;
    publicApiChanged: boolean;
    securityPathTouched: boolean;
  };
  // Recommendation flag from the generator — guides UI to surface a single
  // primary candidate plus "rejected alternatives" rather than a lineup of
  // equals (the documented design rule from the feature plan).
  isRecommended: boolean;
  rejectedReason?: string;
};

// Three tiers from the spec. The numeric thresholds live in fix-pipeline's
// `lib/decideTier.ts`; this is just the vocabulary the rest of the pipeline consumes.
type DeliveryTier = 'safe-mechanical' | 'guarded' | 'human-required';

export type DeliveryDecision = {
  tier: DeliveryTier;
  reasons: string[];
  // What's blocking promotion to the next tier up. Empty when already at
  // safe-mechanical.
  blockers: string[];
};

export type ValidationResult = {
  candidateId: string;
  obligations: ProofObligation[];
  // Aggregate counts — denormalised so UI doesn't recompute on every render.
  passed: number;
  failed: number;
  unknowns: number;
  // True when at least one dynamic obligation could not be executed (no
  // sandbox, no test runner, etc). Forces human checkpoint per the spec —
  // dynamic-failure-as-pass is exactly the bug we refuse to ship.
  dynamicUnreachable: boolean;
};

export type DismissReason = 'wrong-root-cause' | 'too-broad' | 'breaks-style' | 'risky' | 'other';

export type CandidateDismissal = {
  candidateId: string;
  reason: DismissReason;
  note?: string;
  at: string;
};

// Cost telemetry — Phase 1 mandatory per the spec. Without this, we can't
// know whether the unit economics work (acceptance × value > cycles × cost).
// Numbers are stand-ins; a real impl meters the LLM tokens + CI minutes.
export type CycleCost = {
  tokensIn: number;
  tokensOut: number;
  ciSeconds: number;
  usd: number;
};

export type CostTelemetry = {
  cycles: number;
  cumulative: CycleCost;
  // Per-candidate breakdown, so the trust panel can show "this fix costs N".
  byCandidate: Record<string, CycleCost>;
};

// Bounded-agent loop state. The spec is explicit: the loop is allowed to
// stop (and prefer stopping) over chasing a fix forever. We track the
// reason because "the system gave up at iter 2 because critique repeated"
// is a much more honest signal than a silent halt.
export type LoopTerminationReason =
  | 'max-iterations'
  | 'time-budget'
  | 'token-budget'
  | 'non-progress'      // self-critique returned the same failure class
  | 'all-rejected'      // every candidate rejected by critique
  | 'success';          // obligations satisfied, ready for review

export type LoopState = {
  iteration: number;
  maxIterations: number;
  terminated: boolean;
  reason: LoopTerminationReason | null;
};

// Index freshness signal. Static analysis is only as honest as the index
// behind it; if the index is N minutes stale, every confidence number
// inherits that staleness. The spec calls this out as a missing
// perspective — we surface it explicitly rather than burying it.
export type Freshness = {
  indexedAt: string;     // ISO timestamp
  ageSeconds: number;
  stale: boolean;        // true past a threshold (mock: > 30 min)
};

// Open-PR conflict — a peer change that overlaps with this candidate's
// touched files. Shipping a "verified" patch that conflicts with an
// in-flight PR is exactly the silent-failure mode the spec warns about.
export type OpenPrConflict = {
  prNumber: number;
  title: string;
  overlappingFiles: string[];
  author: string;
};

// Per-user permission ledger. Gradual-permission mode: the first N runs
// are forced to human-required regardless of how clean the static proof
// looks. After enough successful runs, the gate relaxes. Demo only — a
// real impl persists this across sessions and per-team.
export type PermissionLedger = {
  successfulRuns: number;
  graduationThreshold: number;
  graduated: boolean;
};

// Entire pipeline state — what the store exposes, what features mutate.
// Kept here so any consumer sees the same shape; features don't ship their
// own competing definitions.
export type PipelineSnapshot = {
  seeds: FixSeed[];
  selectedSeedId: string | null;
  candidatesBySeed: Record<string, FixCandidate[]>;
  selectedCandidateId: string | null;
  validationByCandidate: Record<string, ValidationResult>;
  confidenceByCandidate: Record<string, ConfidenceScore>;
  decisionByCandidate: Record<string, DeliveryDecision>;
  dismissals: CandidateDismissal[];
  cost: CostTelemetry;
  loop: LoopState;
  freshness: Freshness;
  conflictsByCandidate: Record<string, OpenPrConflict[]>;
  permissions: PermissionLedger;
  // Pre/post taint+blast snapshots for the recommended candidate, so the
  // re-analysis panel can show "before -> after" honestly. MVP keeps it
  // simple: just two snapshots keyed by candidate id.
  reanalysisByCandidate: Record<string, ReanalysisSnapshot>;
  reviewersByCandidate: Record<string, ReviewerSuggestion>;
  rollbackByCandidate: Record<string, RollbackPackage>;
  submissions: Record<string, SubmissionRecord>;
  critiqueHistory: CritiqueIteration[];
  partialAcceptByCandidate: Record<string, PartialAcceptance>;
};

export type ReanalysisSnapshot = {
  before: { taintPaths: number; blastModules: number; hotspotScore: number };
  after: { taintPaths: number; blastModules: number; hotspotScore: number };
  ranAt: string | null;
};

// Reviewer routing — owner suggestion + escalation chain. The spec
// classifies "reviewer suggestion" as a Phase 2 product surface. We keep
// the shape minimal: who to ping primarily, and a fallback chain for
// out-of-office / escalation.
export type ReviewerSuggestion = {
  primary: ReviewerRef;
  fallbacks: ReviewerRef[];
  rationale: string;
};

export type ReviewerRef = {
  handle: string;        // "@platform-team" or "@hyejin"
  role: 'owner' | 'security' | 'platform' | 'fallback';
  load: 'low' | 'medium' | 'high';  // current open-review load
};

// Self-critique iteration — Phase 3 self-healing loop. Each iteration
// records what was wrong with the *previous* candidate and what the new
// candidate adjusted in response. The MVP's "re-patch" is a synthesised
// edit; what matters is that the audit trail is honest.
export type CritiqueIteration = {
  iteration: number;
  candidateIdBefore: string;
  candidateIdAfter: string;
  failureSummary: string;     // what made the previous iteration fail
  adjustment: string;         // what changed in the new candidate
  at: string;
};

// Submission lifecycle — Phase 2's "guarded one-click draft PR" plus
// Phase 3's "policy-aware auto submit". A candidate moves through these
// states; only `auto-submitted` and `manually-submitted` are terminal
// success states.
type SubmissionStatus =
  | 'unsubmitted'
  | 'submitting'
  | 'manually-submitted'
  | 'auto-submitted'
  | 'submission-blocked';

export type SubmissionRecord = {
  candidateId: string;
  status: SubmissionStatus;
  prNumber: number | null;     // assigned on submit
  submittedAt: string | null;
  submittedBy: 'system' | 'user' | null;
  blockerReason: string | null;
};

// Rollback package — Phase 3 explicit, but pulled into Phase 2 per the
// self-criticism: auto-submit and rollback must ship as a pair, never
// independently. A merged "verified" patch that can't be reverted is
// worse than no auto-submit at all.
export type RollbackPackage = {
  candidateId: string;
  revertCommitMessage: string;
  affectedFiles: string[];
  // Steps in plain text — UI can render as a checklist or copy-paste.
  steps: string[];
};

// Partial-accept — Phase 3 diff-aware re-planning. User accepts only a
// subset of the diff hunks; the system recomputes the residual radius
// and proposes the next slice. Demo records the accepted hunk indices
// per candidate.
export type PartialAcceptance = {
  candidateId: string;
  acceptedHunkIndices: number[];
  // Recomputed snapshot after partial accept. before = pre-accept,
  // after = residual (still un-applied).
  residual: ReanalysisSnapshot;
};
