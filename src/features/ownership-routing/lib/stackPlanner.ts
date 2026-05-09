import type {
  MergeStrategyAdvice,
  OwnershipZone,
  Person,
  RefactorStack,
  RiskBadge,
  StackStep,
  StackStepKind,
} from '@entities/ownership';
import { selectPrimaryOwner, selectRecommendedReviewer } from './policy';

export interface RefactorStackInput {
  zoneId: string;
  touchedModules: string[];
  couplingClusters: string[][];
  rationale: string;
}

const STEP_BLUEPRINT: Array<{
  kind: StackStepKind;
  title: string;
  goal: string;
  exitCriteria: string[];
  requiredChecks: string[];
}> = [
  {
    kind: 'prep',
    title: 'Prep: extract pure modules and tighten boundaries',
    goal: 'Reduce behavioural risk by isolating logic before any rewiring.',
    exitCriteria: [
      'Unit tests cover extracted units',
      'No callers depend on internal shape',
    ],
    requiredChecks: ['type', 'unit-tests'],
  },
  {
    kind: 'adapter',
    title: 'Adapter: introduce a stable boundary',
    goal: 'Allow legacy and new shapes to coexist behind a single import path.',
    exitCriteria: [
      'Adapter passes contract tests against legacy baseline',
      'Feature flag default = legacy',
    ],
    requiredChecks: ['type', 'integration-tests'],
  },
  {
    kind: 'migration',
    title: 'Migration: switch in-repo callers to the new shape',
    goal: 'Move callers onto the adapter without touching external contracts.',
    exitCriteria: [
      'All in-repo callers on new shape',
      'Canary error rate within budget',
    ],
    requiredChecks: ['type', 'integration-tests', 'canary'],
  },
  {
    kind: 'cleanup',
    title: 'Cleanup: remove legacy branches',
    goal: 'Delete legacy code paths once migration is stable.',
    exitCriteria: [
      'No references to legacy types in repo',
      'Dead-code scanner clean',
    ],
    requiredChecks: ['type', 'unit-tests'],
  },
  {
    kind: 'gate',
    title: 'Gate: extended canary and on-call sign-off',
    goal: 'Verify health metrics before considering the change complete.',
    exitCriteria: [
      'Canary green for 24h',
      'On-call sign-off recorded',
    ],
    requiredChecks: ['canary', 'on-call-ack'],
  },
];

export function estimateBlastRadius(touchedModules: string[]): RiskBadge {
  const n = touchedModules.length;
  if (n < 3) return 'low';
  if (n < 8) return 'medium';
  return 'high';
}

function distributeModules(
  touched: string[],
  clusters: string[][],
): string[][] {
  const buckets: string[][] = [[], [], [], [], []];
  if (touched.length === 0) return buckets;

  const seen = new Set<string>();
  const clusterAssignments: string[][] = [];

  for (const cluster of clusters) {
    const filtered = cluster.filter((m) => touched.includes(m) && !seen.has(m));
    if (filtered.length === 0) continue;
    filtered.forEach((m) => seen.add(m));
    clusterAssignments.push(filtered);
  }

  const remaining = touched.filter((m) => !seen.has(m));
  if (remaining.length > 0) clusterAssignments.push(remaining);

  // Distribute across the 5 steps preferring prep/adapter/migration/cleanup/gate order.
  // Step indices: 0=prep, 1=adapter, 2=migration, 3=cleanup, 4=gate
  // Bias: largest cluster -> migration (2); secondary -> adapter (1); smallest -> prep (0); cleanup (3) gets dupes; gate (4) gets a config sentinel if any.
  const sorted = [...clusterAssignments].sort((a, b) => b.length - a.length);

  const targetOrder: number[] = [2, 1, 0, 3, 4];
  sorted.forEach((group, i) => {
    const target = targetOrder[i % targetOrder.length];
    buckets[target].push(...group);
  });

  // Cleanup step touches a subset of migration-step modules (legacy paths).
  if (buckets[3].length === 0 && buckets[2].length > 0) {
    buckets[3].push(buckets[2][0]);
  }

  return buckets;
}

function estimateDiffLines(modules: string[], kind: StackStepKind): number {
  const base = modules.length * 80;
  const multiplier =
    kind === 'migration' ? 1.6 :
    kind === 'adapter' ? 1.2 :
    kind === 'cleanup' ? 0.8 :
    kind === 'gate' ? 0.4 :
    1.0;
  return Math.max(40, Math.round(base * multiplier));
}

export function generateRefactorStack(input: RefactorStackInput): RefactorStack {
  const { zoneId, touchedModules, couplingClusters, rationale } = input;
  const buckets = distributeModules(touchedModules, couplingClusters);

  const steps: StackStep[] = STEP_BLUEPRINT.map((bp, i) => {
    const modules = buckets[i] ?? [];
    return {
      id: `${zoneId}_step_${i + 1}`,
      kind: bp.kind,
      title: bp.title,
      goal: bp.goal,
      exitCriteria: bp.exitCriteria,
      touchedModules: modules,
      blastRadius: estimateBlastRadius(modules),
      requiredChecks: bp.requiredChecks,
      suggestedReviewerId: '',
      estimatedDiffLines: estimateDiffLines(modules, bp.kind),
    };
  });

  const totalEstimatedDays = Math.max(
    1,
    Math.round(steps.reduce((s, st) => s + st.estimatedDiffLines, 0) / 200),
  );

  const stack: RefactorStack = {
    id: `stack_${zoneId}`,
    zoneId,
    rationale,
    steps,
    mergeStrategy: 'land-bottom-up',
    mergeStrategyAdvice: {
      strategy: 'land-bottom-up',
      reason: 'Default: each step is a precondition for the next.',
    },
    totalEstimatedDays,
    proofObligations: [],
    safeSeams: [],
  };

  const advice = suggestMergeStrategy(stack);
  return {
    ...stack,
    mergeStrategy: advice.strategy,
    mergeStrategyAdvice: advice,
  };
}

export function assignStepReviewers(
  stack: RefactorStack,
  zone: OwnershipZone,
  people: Person[],
): RefactorStack {
  const primary = selectPrimaryOwner(zone, people);
  const reviewer = selectRecommendedReviewer(zone, people);

  const steps = stack.steps.map((step) => {
    const reviewerId =
      step.kind === 'migration' || step.kind === 'adapter'
        ? primary
        : step.kind === 'gate'
          ? zone.escalation ?? primary
          : reviewer;
    return { ...step, suggestedReviewerId: reviewerId };
  });

  return { ...stack, steps };
}

export function suggestMergeStrategy(stack: RefactorStack): MergeStrategyAdvice {
  const hasHigh = stack.steps.some((s) => s.blastRadius === 'high');
  if (hasHigh) {
    return {
      strategy: 'risky-serial',
      reason:
        'At least one step has high blast radius — land each step serially behind a canary to preserve a clean rollback boundary.',
      alternative: {
        strategy: 'split-now',
        reason:
          'If review bandwidth allows, split the high-risk step into smaller PRs before landing.',
      },
    };
  }

  return {
    strategy: 'land-bottom-up',
    reason:
      'No step exceeds medium blast radius; sequencing keeps each PR reviewable without forcing a split.',
    alternative: {
      strategy: 'parallelizable',
      reason:
        'Prep and adapter steps share no state and can land in parallel if needed.',
    },
  };
}
