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

export interface RefactorStack {
  id: string;
  zoneId: string;
  rationale: string;
  steps: StackStep[];
  mergeStrategy: MergeStrategy;
  mergeStrategyAdvice: MergeStrategyAdvice;
  totalEstimatedDays: number;
}
