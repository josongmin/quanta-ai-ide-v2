export type PersonId = string;

export interface Person {
  id: PersonId;
  name: string;
  team: string;
  initials: string;
  avatarHue: number;
  active: boolean;
  lastActiveDays: number;
}

export type OwnershipLayer = 'declared' | 'historical' | 'expertise' | 'impact';

export interface OwnershipScore {
  personId: PersonId;
  layer: OwnershipLayer;
  weight: number;
  reason: string;
}

export type OwnershipState =
  | 'orphan'
  | 'overloaded'
  | 'fragmented'
  | 'siloed'
  | 'cross-team'
  | 'healthy';

export interface ReviewerRationale {
  touchedAreaFamiliarity: number;
  recentReviewer: number;
  incidentResolver: number;
  codeOwner: number;
}

export interface ImpactNarrative {
  declaredTeam: string;
  blastTeams: string[];
  summary: string;
}

export interface OwnershipZone {
  id: string;
  label: string;
  kind: 'folder' | 'hotspot' | 'incident' | 'symbol';
  state: OwnershipState;
  scores: OwnershipScore[];
  primary: PersonId;
  backup: PersonId | null;
  recommendedReviewer: PersonId;
  escalation: PersonId | null;
  routingConfidence: number;
  reviewerRationale: ReviewerRationale;
  implementationOwner: PersonId;
  approvalOwner: PersonId;
  impactNarrative: ImpactNarrative;
}

export type StackStepKind = 'prep' | 'adapter' | 'migration' | 'cleanup' | 'gate';
export type RiskBadge = 'low' | 'medium' | 'high';

export interface StackStep {
  id: string;
  kind: StackStepKind;
  title: string;
  goal: string;
  exitCriteria: string[];
  touchedModules: string[];
  blastRadius: RiskBadge;
  requiredChecks: string[];
  suggestedReviewerId: PersonId;
  estimatedDiffLines: number;
}

export type MergeStrategy =
  | 'split-now'
  | 'keep-as-one'
  | 'land-bottom-up'
  | 'parallelizable'
  | 'risky-serial';

export interface MergeStrategyAdvice {
  strategy: MergeStrategy;
  reason: string;
  alternative?: { strategy: MergeStrategy; reason: string };
}

export interface ProofObligation {
  id: string;
  label: string;
  status: 'satisfied' | 'pending' | 'unknown' | 'placeholder';
  detail?: string;
}

export interface SafeSeamCandidate {
  id: string;
  module: string;
  reason: string;
  status: 'detected' | 'placeholder';
}

export interface RefactorStack {
  id: string;
  zoneId: string;
  rationale: string;
  steps: StackStep[];
  mergeStrategy: MergeStrategy;
  mergeStrategyAdvice: MergeStrategyAdvice;
  totalEstimatedDays: number;
  proofObligations: ProofObligation[];
  safeSeams: SafeSeamCandidate[];
  splitConfidence: number;
  splitConfidenceBasis: string[];
}

// ─── Phase 2: Cross-team hotspot detection ──────────────────────────

export interface CrossTeamHotspot {
  id: string;
  zoneId: string;
  label: string;
  teams: string[];
  reason: string;
  severity: 'low' | 'medium' | 'high';
  weeklyCommits: number;
}

// ─── Phase 3: Approval path ─────────────────────────────────────────

export interface ApprovalStep {
  personId: PersonId;
  role: string;
  reason: string;
  required: boolean;
}

export interface ApprovalPath {
  zoneId: string;
  steps: ApprovalStep[];
  estimatedDurationHours: number;
  parallelizable: boolean;
}

// ─── Phase 3: Auto-draft suggestion (no user trigger) ───────────────

export interface AutoDraftSuggestion {
  id: string;
  zoneId: string;
  hook: string;
  why: string;
  proposedAction: 'open-stack-plan' | 'reroute-reviewer' | 'flag-cross-team' | 'split-pr';
  confidence: number;
  detectedAt: string;
}
