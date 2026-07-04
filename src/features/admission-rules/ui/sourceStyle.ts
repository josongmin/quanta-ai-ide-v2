import {
  signalDescribe, signalUsesHint,
  type RuleSource, type RuleSeverity, type CostClass, type RuleSignal,
} from '@entities/admission';
import { primitives } from '@shared/tokens';

// Single colour axis: severity. Red=block, amber=warn, neutral=info/pass.
// Everything else (source, cost, evidence) is differentiated by *text*,
// *shape*, or *position* — not colour. Hero green is reserved for the
// admission "allow" verdict and at most one KPI. This keeps the surface
// readable when ten rules + a PR diff + a chart are on screen at once.

export const SEVERITY_COLOR: Record<RuleSeverity, string> = {
  block: primitives.colors.red[400],
  warn:  primitives.colors.amber[400],
  info:  'currentColor', // inherits — no extra hue
};

// Source labels render as small monospace text. The leading glyph is the
// only visual differentiator: ★ marks the native (engine-only) rules so
// a glance can tell "this needed our analyzer" apart from imported tools.
export const SOURCE_GLYPH: Record<RuleSource, string> = {
  native:  '★',
  eslint:  '·',
  semgrep: '·',
  codeql:  '·',
  custom:  '◇',
};

export const SOURCE_LABEL: Record<RuleSource, string> = {
  native:  'native',
  eslint:  'eslint',
  semgrep: 'semgrep',
  codeql:  'codeql',
  custom:  'custom',
};

// Cost class: text only. We use the badge component itself to communicate
// expense; no per-class colour because it competes with severity.

// Thin re-exports over the SIGNAL_META registry (entities/admission) so the
// per-kind describe/uses metadata lives in one place. Call sites keep these
// names.
export function describeSignal(signal: RuleSignal): string {
  return signalDescribe(signal);
}

export function usesHint(signal: RuleSignal): string {
  return signalUsesHint(signal);
}

export const COST_TEXT: Record<CostClass, string> = {
  instant:    'instant',
  fast:       'fast',
  medium:     'medium',
  slow:       'slow',
  background: 'bg only',
};
