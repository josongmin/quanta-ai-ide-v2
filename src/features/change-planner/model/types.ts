// Domain types for Feature 03 — Blast-Radius Safe-Change Planner.
//
// These shapes describe a pre-commit "what if I change this seed?" graph and
// the safe-by-default plan that comes out of it. Everything here is plain
// data — no React, no stores, no engine handles. The lib/ functions in this
// feature consume and produce these shapes; ui/ only renders them.

// What kind of thing the user picked as the change seed. The kind hints the
// builder at how to interpret adjacency edges (e.g. 'route' implies behavioral
// downstream impact).
export type SeedKind = 'file' | 'symbol' | 'route' | 'api' | 'config_key';

export type ChangeSeed = {
  id: string;
  kind: SeedKind;
  // Engine-side identifier (path, fully-qualified symbol, route key, etc).
  // Display layer must use `label`; engines must use `targetId`.
  targetId: string;
  label: string;
}

// Concentric impact rings. L1 = direct dependents (1 hop), L2 = 2-hop fanout,
// L3 = anything beyond. Mirrors the 3-ring radar visual the spec calls for.
export type ImpactRing = 'L1' | 'L2' | 'L3';

// Layer of the architecture an impact lives in. Drives how the planner groups
// nodes when proposing PR splits — you don't want to mix structural changes
// and verification additions in the same PR.
export type ImpactLayer =
  | 'structural'    // module wiring, types, internal APIs
  | 'behavioral'    // user-visible routes / APIs
  | 'verification'  // tests, contract checks
  | 'delivery';     // flags, configs, rollout knobs

// Three-state confidence shared with the fix pipeline (entities/fix-pipeline).
// Drift between "the radius said overapprox" and "the fix said overapprox" is
// exactly the bug we're trying to avoid by sharing the vocabulary.
export type ConfidenceState = 'exact' | 'overapprox' | 'unknown';

export type ImpactNode = {
  id: string;
  label: string;
  ring: ImpactRing;
  layer: ImpactLayer;
  confidence: ConfidenceState;
  // Why this node was pulled in — shown on hover so reviewers can sanity-check
  // the inclusion without leaving the panel.
  reason: string;
}

export type ImpactEdge = {
  from: string;
  to: string;
  ring: ImpactRing;
  confidence: ConfidenceState;
  // Visual style derived from confidence (see lib/confidenceModel.ts). We
  // serialise it on the edge so the renderer doesn't recompute, and so any
  // exporter (PR comment, JSON snapshot) preserves the styling.
  style: 'solid' | 'dashed' | 'faded';
}

export type ImpactGraph = {
  seed: ChangeSeed;
  nodes: ImpactNode[];
  edges: ImpactEdge[];
}

// A "safe seam" is a place to insert a backwards-compatible interface so the
// change can be split into smaller, individually-deployable steps. The
// canonical seam types correspond to standard refactor moves.
export type SafeSeam = {
  id: string;
  nodeId: string;
  reason: string;
  cutKind: 'adapter' | 'interface' | 'flag' | 'data_migration';
}

// One ordered step in the change plan. `kind` matches the StackStepKind in
// entities/ownership so feature 05 (refactor stack) can adopt the same plans
// without a translation layer.
export type ChangeStep = {
  id: string;
  order: number;
  kind: 'prep' | 'adapter' | 'migration' | 'cleanup' | 'gate';
  title: string;
  rationale: string;
  touchedNodeIds: string[];
  // CI / human checks that must pass before this step ships.
  requiredChecks: string[];
  // Free-form proof obligation ids — e.g. 'unit:contract', 'canary:flag'.
  // Stays as plain strings so the planner doesn't need to import the full
  // ProofObligation shape; pipelines can map these into rich obligations.
  obligations: string[];
}

export type PRSplitSuggestion = {
  id: string;
  title: string;
  stepIds: string[];
  rationale: string;
}

export type ChangePlan = {
  id: string;
  seed: ChangeSeed;
  steps: ChangeStep[];
  seams: SafeSeam[];
  prSplits: PRSplitSuggestion[];
  // Aggregate of every step's requiredChecks, deduped — handy for the gate
  // panel which wants the full list without walking the tree.
  requiredChecks: string[];
}
