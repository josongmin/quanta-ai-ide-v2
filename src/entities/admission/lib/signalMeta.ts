import type { RuleSignal, CostClass } from '../model';

// Single per-kind metadata registry for RuleSignal — the OCP counterpart to
// SIGNAL_EDITORS. Adding a signal kind means adding ONE entry here (a compile
// error until you do), instead of editing scattered switches in cost.ts and
// sourceStyle.ts. (Evaluation stays a switch — it needs PR/repo context.)

export type SignalOfKind<K extends RuleSignal['kind']> = Extract<RuleSignal, { kind: K }>;

const GRAPH_COST: Record<string, CostClass> = {
  'import-cycle': 'fast',
  'public-api-touched': 'fast',
  'orphan-edit': 'fast',
  'layer-violation': 'fast',
  'public-api-without-test': 'fast',
  'unknown-region-creep': 'fast',
  // Already precomputed on each file; aggregation is O(PR).
  'blast-radius-spike': 'instant',
};

// DSL cost is heuristic: metric/flag-only expressions are instant; graph-ish
// substrings ("blast"/"fan"/"cyclic") imply traversal → fast.
function classifyDslCost(expr: string): CostClass {
  const lo = expr.toLowerCase();
  if (lo.includes('blast') || lo.includes('fan') || lo.includes('cyclic')) return 'fast';
  return 'instant';
}

const METRIC_HINTS: Record<string, string> = {
  blastRadius: 'graph · transitive deps',
  editSafety: 'composite · cov × complexity × blast',
  sastFindings: 'sast index',
  cognitive: 'cognitive complexity',
  cyclomatic: 'cyclomatic complexity',
  loc: 'file size',
  fanIn: 'graph · incoming refs',
  fanOut: 'graph · outgoing refs',
  churn: 'git churn 90d',
  lineCoverage: 'test coverage',
  maintainability: 'maintainability index',
  eslintErrors: 'lint count',
  todoCount: 'TODO density',
};

const GRAPH_HINTS: Record<string, string> = {
  'import-cycle': 'dependency graph · cycle',
  'public-api-touched': 'PR diff ∩ public surface',
  'public-api-without-test': 'public surface ∧ no test delta',
  'orphan-edit': 'graph · zero in-refs',
  'blast-radius-spike': 'PR-wide blast aggregation',
  'unknown-region-creep': 'analyzer confidence delta',
  'layer-violation': 'architecture layer rule',
};

type SignalMetaEntry<K extends RuleSignal['kind']> = {
  /** O(1) cost class the evaluator for this kind implies. */
  cost: (s: SignalOfKind<K>) => CostClass;
  /** One-line human description of the signal's predicate. */
  describe: (s: SignalOfKind<K>) => string;
  /** What index/analysis this kind reads (editor "uses" hint). */
  usesHint: (s: SignalOfKind<K>) => string;
};

export const SIGNAL_META: { [K in RuleSignal['kind']]: SignalMetaEntry<K> } = {
  metric: {
    cost: () => 'instant',
    describe: (s) => `${s.field} ${s.op} ${s.value.toString()}`,
    usesHint: (s) => METRIC_HINTS[s.field] ?? s.field,
  },
  graph: {
    cost: (s) => GRAPH_COST[s.pattern] ?? 'medium',
    describe: (s) => `${s.pattern}${s.value !== undefined ? ` >${s.value.toString()}` : ''}`,
    usesHint: (s) => GRAPH_HINTS[s.pattern] ?? 'graph predicate',
  },
  taint: {
    cost: (s) => (s.requireSanitizer ? 'background' : 'slow'),
    describe: (s) => `${s.source} → ${s.sink}${s.requireSanitizer ? ' · sanitizer' : ''}`,
    usesHint: (s) => `dataflow · ${s.source} → ${s.sink}`,
  },
  dsl: {
    cost: (s) => classifyDslCost(s.expr),
    describe: (s) => s.expr,
    usesHint: () => 'facet DSL on metric index',
  },
  external: {
    cost: () => 'fast',
    describe: (s) => `${s.tool}:${s.ruleId}`,
    usesHint: (s) => `imported · ${s.tool}`,
  },
};

// Dispatchers. The `as never` bridges the union-of-functions call the mapped
// type produces (same idiom SIGNAL_EDITORS uses at its dispatch site).
export const signalCost = (s: RuleSignal): CostClass => SIGNAL_META[s.kind].cost(s as never);
export const signalDescribe = (s: RuleSignal): string => SIGNAL_META[s.kind].describe(s as never);
export const signalUsesHint = (s: RuleSignal): string => SIGNAL_META[s.kind].usesHint(s as never);
