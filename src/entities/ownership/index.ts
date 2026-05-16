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
  MOCK_CROSS_TEAM_HOTSPOTS,
  MOCK_AUTO_DRAFTS,
  findPerson,
  findStack,
  findApprovalPath,
} from './mock';

export {
  applyFreshnessDecay,
  identifyInactiveOwners,
  aggregateLayeredScores,
  scoreOwnershipZone,
  type FreshnessDecayOptions,
  type ZoneScoringResult,
} from './lib/scoring';
