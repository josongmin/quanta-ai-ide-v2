// Safe-change planner.
//
// Turns an impact graph into an ordered, reviewable plan. The algorithm is
// deliberately conservative — it errs toward inserting an adapter seam over
// a "rip the bandaid off" cut, because the cost of a too-cautious plan is a
// few extra steps, while the cost of a missed seam is a broken main branch.
//
// Algorithm shape (see docs/plans/may-9-feature-plan/03):
//   1. Find seams: any L1 node with multiple L2 children gets an adapter
//      seam, since splitting there gives the new and old paths a place to
//      coexist during rollout.
//   2. Sequence steps in canonical order: prep → adapter → migration →
//      cleanup → gate. The kinds match StackStepKind in entities/ownership
//      so feature 05 can reuse this without translation.
//   3. Group steps into PR splits by kind cluster. One adapter PR, one
//      migration PR, etc — keeps each diff cognitively load-bounded.

import type {
  ChangePlan,
  ChangeStep,
  ImpactGraph,
  ImpactNode,
  PRSplitSuggestion,
  SafeSeam,
} from '../model/types';

type StepKind = ChangeStep['kind'];

// Canonical order — every plan walks this sequence even if some steps are
// empty, because reviewers expect a stable shape per the plan doc.
const STEP_ORDER: StepKind[] = ['prep', 'adapter', 'migration', 'cleanup', 'gate'];

// Default obligations per step kind. Keep the list short and concrete — a
// reviewer should be able to map each obligation to a CI job or a manual
// checklist item without further context. See the proof-obligation taxonomy
// in entities/fix-pipeline (ProofObligation.category).
const OBLIGATIONS_BY_KIND: Record<StepKind, string[]> = {
  prep: ['unit:contract'],
  adapter: ['unit:contract', 'integration:adapter'],
  migration: ['integration:adapter', 'canary:flag'],
  cleanup: ['unit:contract'],
  gate: ['canary:flag', 'human:reviewer'],
};

// Default required-checks per kind, kept parallel to OBLIGATIONS_BY_KIND but
// phrased as CI job names so the gate panel can consume them directly.
const CHECKS_BY_KIND: Record<StepKind, string[]> = {
  prep: ['typecheck', 'unit'],
  adapter: ['typecheck', 'unit', 'contract'],
  migration: ['contract', 'integration', 'canary'],
  cleanup: ['typecheck', 'unit'],
  gate: ['canary', 'review'],
};

function findSeams(graph: ImpactGraph): SafeSeam[] {
  const seams: SafeSeam[] = [];
  // Build a quick L1-id -> L2 children index from edges. We only care about
  // edges that actually cross a ring boundary into L2; same-ring edges
  // aren't seam candidates.
  const l1Children = new Map<string, Set<string>>();
  const nodeById = new Map<string, ImpactNode>();
  for (const n of graph.nodes) nodeById.set(n.id, n);

  for (const edge of graph.edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    if (from.ring === 'L1' && to.ring === 'L2') {
      const set = l1Children.get(from.id) ?? new Set<string>();
      set.add(to.id);
      l1Children.set(from.id, set);
    }
  }

  for (const [l1Id, children] of l1Children.entries()) {
    if (children.size < 2) continue;
    const node = nodeById.get(l1Id);
    if (!node) continue;
    seams.push({
      id: `seam-${l1Id}`,
      nodeId: l1Id,
      reason: `${node.label} fans out to ${children.size} downstream modules; insert an adapter so old + new paths coexist during rollout.`,
      cutKind: 'adapter',
    });
  }

  return seams;
}

function buildSteps(graph: ImpactGraph, seams: SafeSeam[]): ChangeStep[] {
  const steps: ChangeStep[] = [];
  let order = 1;

  // 1. prep — always present. Captures the "make the change possible
  //    without breaking anything yet" work: types, helpers, fixtures.
  steps.push({
    id: `step-${order}`,
    order,
    kind: 'prep',
    title: `Prepare ${graph.seed.label} for change`,
    rationale: 'Add types, fixtures, and helpers needed by later steps without altering runtime behaviour.',
    touchedNodeIds: [graph.seed.targetId],
    requiredChecks: CHECKS_BY_KIND.prep,
    obligations: OBLIGATIONS_BY_KIND.prep,
  });
  order += 1;

  // 2. adapter — one step per seam. If we found no seams, skip; the change
  //    is small enough to land directly.
  for (const seam of seams) {
    steps.push({
      id: `step-${order}`,
      order,
      kind: 'adapter',
      title: `Insert ${seam.cutKind} at ${seam.nodeId}`,
      rationale: seam.reason,
      touchedNodeIds: [seam.nodeId],
      requiredChecks: CHECKS_BY_KIND.adapter,
      obligations: OBLIGATIONS_BY_KIND.adapter,
    });
    order += 1;
  }

  // 3. migration — one step covering every L2 node, since that's the layer
  //    that has to flip from old path to new path.
  const l2 = graph.nodes.filter((n) => n.ring === 'L2');
  if (l2.length > 0) {
    steps.push({
      id: `step-${order}`,
      order,
      kind: 'migration',
      title: `Migrate ${l2.length} downstream modules`,
      rationale: 'Switch L2 dependents from the legacy path to the new adapter-fronted path. Keep both paths green while the canary runs.',
      touchedNodeIds: l2.map((n) => n.id),
      requiredChecks: CHECKS_BY_KIND.migration,
      obligations: OBLIGATIONS_BY_KIND.migration,
    });
    order += 1;
  }

  // 4. cleanup — only emitted when we actually inserted adapters. Without
  //    seams there's nothing to remove.
  if (seams.length > 0) {
    steps.push({
      id: `step-${order}`,
      order,
      kind: 'cleanup',
      title: 'Remove legacy adapters',
      rationale: 'Once every dependent is on the new path and the canary is green, delete the temporary adapters and the feature flag.',
      touchedNodeIds: seams.map((s) => s.nodeId),
      requiredChecks: CHECKS_BY_KIND.cleanup,
      obligations: OBLIGATIONS_BY_KIND.cleanup,
    });
    order += 1;
  }

  // 5. gate — always last. This is the human checkpoint; the spec requires
  //    one even when every static check passes.
  steps.push({
    id: `step-${order}`,
    order,
    kind: 'gate',
    title: 'Final gate review',
    rationale: 'Reviewer sign-off plus canary verification before promoting the change to 100%.',
    touchedNodeIds: [graph.seed.targetId],
    requiredChecks: CHECKS_BY_KIND.gate,
    obligations: OBLIGATIONS_BY_KIND.gate,
  });

  return steps;
}

function buildPrSplits(steps: ChangeStep[]): PRSplitSuggestion[] {
  // Cluster steps by kind in the canonical order. Each non-empty cluster
  // becomes its own PR — reviewers get a focused diff scoped to one phase
  // of the rollout.
  const splits: PRSplitSuggestion[] = [];
  for (const kind of STEP_ORDER) {
    const cluster = steps.filter((s) => s.kind === kind);
    if (cluster.length === 0) continue;
    splits.push({
      id: `pr-${kind}`,
      title: `PR: ${kind}`,
      stepIds: cluster.map((s) => s.id),
      rationale: `Bundles every ${kind} step so the reviewer can evaluate one phase of the rollout in isolation.`,
    });
  }
  return splits;
}

export function planSafeChange(graph: ImpactGraph): ChangePlan {
  const seams = findSeams(graph);
  const steps = buildSteps(graph, seams);
  const prSplits = buildPrSplits(steps);

  const requiredChecks = Array.from(
    new Set(steps.flatMap((s) => s.requiredChecks)),
  );

  return {
    id: `plan-${graph.seed.id}`,
    seed: graph.seed,
    steps,
    seams,
    prSplits,
    requiredChecks,
  };
}
