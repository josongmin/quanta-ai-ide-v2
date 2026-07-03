import { primitives } from '@shared/tokens';
import type { AdmissionRule, CostClass, RuleSignal } from '../model';

// Cost classifier — runs in O(1), called on every keystroke in the rule
// editor. Driven entirely by the signal kind because that's what determines
// which evaluator we have to invoke.
//
// The thresholds line up with the badges in the rule editor:
//   instant   < 200ms   green     metric/external join
//   fast      < 2s      blue      1-hop graph predicates
//   medium    2–10s     yellow    multi-hop graph / DSL with no index hint
//   slow      10s–1m    orange    taint dataflow
//   background  > 1m    red       PTA / mutation — preview shows samples only

export function estimateCost(rule: AdmissionRule): CostClass {
  return estimateSignalCost(rule.signal);
}

export function estimateSignalCost(signal: RuleSignal): CostClass {
  switch (signal.kind) {
    case 'metric':
      return 'instant';
    case 'external':
      return 'fast';
    case 'graph':
      return graphCost(signal.pattern);
    case 'dsl':
      return classifyDslCost(signal.expr);
    case 'taint':
      // Source-to-sink with sanitizer search = inter-procedural dataflow.
      return signal.requireSanitizer ? 'background' : 'slow';
  }
}

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

function graphCost(pattern: string): CostClass {
  return GRAPH_COST[pattern] ?? 'medium';
}

// DSL cost is heuristic. If the expression touches only metric/flag fields
// (which we already have on every file) it's instant; if it implies graph
// traversal (substring "blast", "fan", "cycle") it's fast.
function classifyDslCost(expr: string): CostClass {
  const lo = expr.toLowerCase();
  if (lo.includes('blast') || lo.includes('fan') || lo.includes('cyclic')) {
    return 'fast';
  }
  return 'instant';
}

// Display metadata — used by the editor badge and the preview panel.
export const COST_LABEL: Record<CostClass, string> = {
  instant: 'Instant',
  fast: 'Fast',
  medium: 'Medium',
  slow: 'Slow',
  background: 'Background only',
};

export const COST_HINT: Record<CostClass, string> = {
  instant: '< 200ms · index lookup',
  fast: '< 2s · 1-hop graph',
  medium: '2–10s · multi-hop / scan',
  slow: '10s–1m · dataflow',
  background: '> 1m · run async',
};

export const COST_COLOR: Record<CostClass, string> = {
  instant: primitives.colors.green[400],
  fast: '#7aa7d4',      // not in the primitive blue scale (blue[400]=#5a8fce) — left as-is
  medium: primitives.colors.amber[400],
  slow: '#db6d28',      // not in the primitive scales (orange, no orange primitive) — left as-is
  background: primitives.colors.red[400],
};

/** Soft cap for live-preview match counts. Beyond this we set `truncated`. */
export const PREVIEW_MATCH_CAP = 200;

/** Whether we should attempt an inline preview at all. */
export function canPreviewInline(cost: CostClass): boolean {
  return cost === 'instant' || cost === 'fast' || cost === 'medium';
}
