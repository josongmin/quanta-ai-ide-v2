// Domain types for the AI Verified Fix Pipeline (MVP, mock-only).
// See docs/plans/may-9-feature-plan/06-ai-verified-fix-pipeline.md.

export type SeedKind = 'incident' | 'hotspot' | 'alert' | 'focus';

export type DeliveryTier = 'safe-mechanical' | 'guarded' | 'human-required';

export type LoopStage =
  | 'investigate'
  | 'patch'
  | 'critique'
  | 'validate'
  | 'package'
  | 'done'
  | 'aborted';

export type ObligationCategory = 'static' | 'dynamic' | 'stylistic';

export type ObligationStatus = 'pass' | 'fail' | 'partial' | 'unknown' | 'pending';

export interface ProofObligation {
  id: string;
  label: string;
  category: ObligationCategory;
  status: ObligationStatus;
  detail: string;
}

export interface EvidenceRef {
  kind: 'taint-path' | 'sarif' | 'trace' | 'symbol' | 'test';
  label: string;
  path?: string;
}

export interface Seed {
  id: string;
  kind: SeedKind;
  title: string;
  symptom: string;
  evidenceRefs: EvidenceRef[];
  suspectedRootCause?: string;
  blastHint: string[];
  constraints: string[];
  age: string;
  severity: 'low' | 'med' | 'high' | 'crit';
}

// Counter-evidence — the "why might this be wrong" surface that we
// promised in the plan doc as primary, not decoration. Each entry is a
// reason a careful reviewer might still reject, even though the engine
// considers the candidate viable. Must render with the same visual
// weight as the proof obligations.
export interface CounterEvidence {
  id: string;
  label: string;
  detail: string;
  severity: 'note' | 'concern' | 'block';
}

export interface CandidateFix {
  id: string;
  seedId: string;
  title: string;
  rationale: string;
  pros: string[];
  cons: string[];
  diffSummary: string;
  changedLines: number;
  changedFiles: number;
  blastModules: number;
  publicApiChange: boolean;
  obligations: ProofObligation[];
  counterEvidence: CounterEvidence[];
  confidence: number; // 0..1
  weakestObligationId: string | null;
  tier: DeliveryTier;
  diffPreview: DiffHunk[];
  patchKind: string;
}

// Output of the validation step. Mock-only for now; in real wiring this
// is fed by the engine's static + dynamic validation rails.
export interface ValidationRun {
  candidateId: string;
  attempt: number;            // 1 = first pass, 2 = post-critique
  startedAt: number;
  finishedAt: number | null;
  passing: boolean;
  obligations: ProofObligation[];
  unknownCount: number;
  failingObligationIds: string[];
}

// Final delivery package. Either we ship this, or the gate routes to
// human checkpoint. Authoring done in store.buildDraftPackage().
export interface DraftPRPackage {
  candidateId: string;
  title: string;
  summary: string;
  whyThisFix: string;
  validationSummary: string;
  remainingUnknowns: string[];
  reviewerSuggestion: string;
  gateDecision: 'auto-submit' | 'needs-review' | 'blocked';
  gateReason: string;
}

export interface DiffHunk {
  file: string;
  before: string[];
  after: string[];
  startLine: number;
}

export interface LoopIteration {
  index: number;
  stage: LoopStage;
  note: string;
  costTokens: number;
  validationSeconds: number;
}

export interface FixCase {
  id: string;
  seedId: string;
  rootCause: string;
  loop: {
    iterations: LoopIteration[];
    currentStage: LoopStage;
    maxIterations: number;
    aborted: boolean;
    abortReason?: string;
  };
  candidates: CandidateFix[];
  selectedCandidateId: string | null;
  dismissedCandidateIds: string[];
  // History of validation runs against the selected candidate. Index 0
  // is the first attempt; index 1 (when present) is the post-critique
  // re-run. We keep both so the UI can show "what was wrong, what we
  // fixed" instead of replacing the result.
  validations: ValidationRun[];
  draft: DraftPRPackage | null;
}

// ─── Phase 2 surfaces ───────────────────────────────────────────────────

export interface ReanalysisDelta {
  metric: 'taint paths' | 'blast modules' | 'hotspot score' | 'policy hits' | 'unknown zone';
  before: number;
  after: number;
  unit?: string;
}

export interface ReviewerCandidate {
  handle: string;
  role: 'codeowner' | 'domain' | 'security' | 'oncall';
  loadPct: number;        // 0..100 — current PR queue load
  matchScore: number;     // 0..1 — relevance to this fix
  rationale: string;
}

// ─── Phase 3 surfaces ───────────────────────────────────────────────────

export interface PolicyThreshold {
  id: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  description: string;
}

export interface RollbackPlan {
  trigger: string;     // "p99 latency >  +5%", "error rate > baseline + 2σ", etc.
  window: string;      // "first 30 min", "next 24h"
  action: string;      // "auto-revert PR-N + reopen incident"
  owner: string;
}

export interface DismissedRecord {
  candidateId: string;
  candidateTitle: string;
  reasonTag: string;
  note: string;
  at: number;
}
