export type {
  PersonId,
  Person,
  OwnershipLayer,
  OwnershipScore,
  OwnershipState,
  ReviewerRationale,
  ImpactNarrative,
  OwnershipZone,
  StackStepKind,
  RiskBadge,
  StackStep,
  MergeStrategy,
  MergeStrategyAdvice,
  ProofObligation,
  SafeSeamCandidate,
  RefactorStack,
  CrossTeamHotspot,
  ApprovalStep,
  ApprovalPath,
  AutoDraftSuggestion,
} from './model';

export {
  MOCK_PEOPLE,
  MOCK_ZONES,
  MOCK_STACKS,
  MOCK_CROSS_TEAM_HOTSPOTS,
  findPerson,
  findZone,
  findStack,
} from './mock';

export {
  applyFreshnessDecay,
  identifyInactiveOwners,
  aggregateLayeredScores,
  scoreOwnershipZone,
} from './lib/scoring';
export type {
  FreshnessDecayOptions,
  ZoneScoringResult,
} from './lib/scoring';
