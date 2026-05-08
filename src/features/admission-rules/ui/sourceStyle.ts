import type { RuleSource, RuleSeverity, CostClass, RuleSignal } from '@entities/admission';

// Single colour axis: severity. Red=block, amber=warn, neutral=info/pass.
// Everything else (source, cost, evidence) is differentiated by *text*,
// *shape*, or *position* — not colour. Hero green is reserved for the
// admission "allow" verdict and at most one KPI. This keeps the surface
// readable when ten rules + a PR diff + a chart are on screen at once.

export const SEVERITY_COLOR: Record<RuleSeverity, string> = {
  block: '#c25a55',
  warn:  '#a8893a',
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

export function describeSignal(signal: RuleSignal): string {
  switch (signal.kind) {
    case 'metric':
      return `${signal.field} ${signal.op} ${signal.value}`;
    case 'graph':
      return `${signal.pattern}${signal.value !== undefined ? ` >${signal.value}` : ''}`;
    case 'taint':
      return `${signal.source} → ${signal.sink}${signal.requireSanitizer ? ' · sanitizer' : ''}`;
    case 'dsl':
      return signal.expr;
    case 'external':
      return `${signal.tool}:${signal.ruleId}`;
  }
}

export function usesHint(signal: RuleSignal): string {
  switch (signal.kind) {
    case 'metric': {
      const map: Record<string, string> = {
        blastRadius:     'graph · transitive deps',
        editSafety:      'composite · cov × complexity × blast',
        sastFindings:    'sast index',
        cognitive:       'cognitive complexity',
        cyclomatic:      'cyclomatic complexity',
        loc:             'file size',
        fanIn:           'graph · incoming refs',
        fanOut:          'graph · outgoing refs',
        churn:           'git churn 90d',
        lineCoverage:    'test coverage',
        maintainability: 'maintainability index',
        eslintErrors:    'lint count',
        todoCount:       'TODO density',
      };
      return map[signal.field] ?? signal.field;
    }
    case 'graph': {
      const map: Record<string, string> = {
        'import-cycle':            'dependency graph · cycle',
        'public-api-touched':      'PR diff ∩ public surface',
        'public-api-without-test': 'public surface ∧ no test delta',
        'orphan-edit':             'graph · zero in-refs',
        'blast-radius-spike':      'PR-wide blast aggregation',
        'unknown-region-creep':    'analyzer confidence delta',
        'layer-violation':         'architecture layer rule',
      };
      return map[signal.pattern] ?? 'graph predicate';
    }
    case 'taint':    return `dataflow · ${signal.source} → ${signal.sink}`;
    case 'dsl':      return 'facet DSL on metric index';
    case 'external': return `imported · ${signal.tool}`;
  }
}

export const COST_TEXT: Record<CostClass, string> = {
  instant:    'instant',
  fast:       'fast',
  medium:     'medium',
  slow:       'slow',
  background: 'bg only',
};
