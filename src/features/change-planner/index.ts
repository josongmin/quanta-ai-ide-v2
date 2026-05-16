// Public surface for the change-planner feature. Keeping this thin and
// re-export-only matches the convention in features/verified-fix and
// features/fix-pipeline-cost.

export type {
  ChangePlan,
  ChangeSeed,
  ChangeStep,
  ConfidenceState,
  ImpactEdge,
  ImpactGraph,
  ImpactLayer,
  ImpactNode,
  ImpactRing,
  PRSplitSuggestion,
  SafeSeam,
  SeedKind,
} from './model/types';

export { buildImpactGraph } from './lib/impactGraphBuilder';
export { planSafeChange } from './lib/safeChangePlanner';
export { MOCK_ADJACENCY, MOCK_SEEDS } from './lib/fixtures';

export { ChangeSeedPanel } from './ui/ChangeSeedPanel';
export { BlastRadiusMap } from './ui/BlastRadiusMap';
export { PlanTab } from './ui/PlanTab';
