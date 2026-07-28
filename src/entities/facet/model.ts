// ─── Plan / category / entry shape ────────────────────────────────────
// These types describe the *facet domain* itself — what categories of
// facet exist, what license tier they require, and what shape a facet
// definition takes. They're consumed by the prefs feature (to gate
// visibility) and by the filter-files feature (to render UI), so they
// belong here in the entity layer.
export type Plan = 'free' | 'pro' | 'enterprise';

export type FacetCategoryKey =
  | 'identity' | 'flow' | 'quality' | 'typeSafety' | 'coverage'
  | 'evolution' | 'lints' | 'security' | 'perf' | 'architecture' | 'docs' | 'sort';

export type FacetEntry = {
  key: string;
  category: FacetCategoryKey;
  label: string;
  hint?: string;
  source?: string;
  requiredPlan: Plan;
};

// ─── Filter state key unions ──────────────────────────────────────────
// RangeKey is the numeric-metric key universe — its SoT is the RANGE_KEYS tuple
// in the base `repo` entity (derived type), re-exported here so facet/filter
// code can name "which range a facet targets" without re-listing the keys.
export type { RangeKey } from '@entities/repo';
import type { RangeKey } from '@entities/repo';

export type BoolKey =
  | 'cyclicOnly' | 'deadOnly' | 'layerViolationOnly'
  | 'strictOptOutOnly' | 'hasNoTest' | 'secretsOnly' | 'busFactor1Only';

// ─── Facet variants ───────────────────────────────────────────────────

export type RangeFacet = FacetEntry & {
  kind: 'range';
  rangeKey: RangeKey;
  step?: number;
  format?: (n: number) => string;
};

export type BoolFacet = FacetEntry & {
  kind: 'bool';
  boolKey: BoolKey;
};

export type EnumFacet = FacetEntry & {
  kind: 'enum';
  enumKey: 'languages' | 'layers' | 'owners';
  options?: readonly string[];
};

export type ToggleFacet = FacetEntry & {
  kind: 'toggle';
  toggleKey: 'isTest' | 'isGenerated' | 'isDeprecated' | 'publicApiOnly';
};

export type Facet = RangeFacet | BoolFacet | EnumFacet | ToggleFacet;

export const CATEGORIES: { key: FacetCategoryKey; label: string }[] = [
  { key: 'identity',     label: 'Identity & Search' },
  { key: 'flow',         label: 'Flow & Dependencies' },
  { key: 'quality',      label: 'Complexity & Quality' },
  { key: 'typeSafety',   label: 'Type Safety' },
  { key: 'coverage',     label: 'Test Coverage' },
  { key: 'evolution',    label: 'Evolution & Git' },
  { key: 'lints',        label: 'Lints & Hygiene' },
  { key: 'security',     label: 'Security' },
  { key: 'perf',         label: 'Performance' },
  { key: 'architecture', label: 'Architecture' },
  { key: 'docs',         label: 'Documentation' },
];

const r = (
  rangeKey: RangeFacet['rangeKey'],
  label: string,
  category: FacetCategoryKey,
  requiredPlan: Plan,
  source: string,
  hint?: string,
  extra: Partial<RangeFacet> = {},
): RangeFacet => ({
  kind: 'range', key: `r:${rangeKey}`, rangeKey, label, category, requiredPlan, source, hint, ...extra,
});
const b = (
  boolKey: BoolFacet['boolKey'],
  label: string,
  category: FacetCategoryKey,
  requiredPlan: Plan,
  source: string,
  hint?: string,
): BoolFacet => ({
  kind: 'bool', key: `b:${boolKey}`, boolKey, label, category, requiredPlan, source, hint,
});
const t = (
  toggleKey: ToggleFacet['toggleKey'],
  label: string,
  category: FacetCategoryKey,
  requiredPlan: Plan,
  source: string,
  hint?: string,
): ToggleFacet => ({
  kind: 'toggle', key: `t:${toggleKey}`, toggleKey, label, category, requiredPlan, source, hint,
});
const e = (
  enumKey: EnumFacet['enumKey'],
  label: string,
  category: FacetCategoryKey,
  requiredPlan: Plan,
  source: string,
  options?: readonly string[],
  hint?: string,
): EnumFacet => ({
  kind: 'enum', key: `e:${enumKey}`, enumKey, label, category, requiredPlan, source, options, hint,
});

export const FACETS: Facet[] = [
  // Identity
  e('languages', 'Language',  'identity', 'free', 'tsc',  ['ts', 'tsx', 'js', 'css', 'md'] as const),
  e('layers',    'Layer',     'identity', 'pro',  'arch-tags', ['view', 'controller', 'service', 'repository', 'util', 'test', 'vendor'] as const),
  e('owners',    'Owner',     'identity', 'pro',  'CODEOWNERS'),

  // Flow
  r('fanIn',  'Fan-in',          'flow', 'free', 'static-analyzer', 'Incoming references'),
  r('fanOut', 'Fan-out',         'flow', 'free', 'static-analyzer', 'Outgoing imports'),
  b('cyclicOnly', 'Cyclic dependency only', 'flow', 'pro', 'madge', 'Files participating in import cycles'),
  b('deadOnly',   'Dead code only',         'flow', 'pro', 'static-analyzer', 'No incoming refs, not a public API'),
  b('layerViolationOnly', 'Layer violations only', 'flow', 'enterprise', 'arch-rules'),

  // Quality
  r('cyclomatic',     'Cyclomatic',     'quality', 'free', 'eslint-cc'),
  r('cognitive',      'Cognitive',      'quality', 'pro',  'sonarjs'),
  r('maintainability','Maintainability','quality', 'pro',  'plato', 'Higher = better'),
  r('maxNesting',     'Max nesting',    'quality', 'pro',  'eslint'),
  r('fnCount',        'Function count', 'quality', 'pro',  'tsc'),
  r('largestFnLoc',   'Largest fn LOC', 'quality', 'pro',  'tsc'),
  r('loc',            'LOC',            'quality', 'free', 'cloc'),

  // Type Safety
  r('anyCount',         'any count',         'typeSafety', 'free', 'tsc'),
  r('tsIgnoreCount',    '@ts-ignore count',  'typeSafety', 'pro',  'tsc'),
  r('unsafeAssertions', 'Unsafe `as` casts', 'typeSafety', 'pro',  'tsc'),
  b('strictOptOutOnly', 'Strict-mode opt-out', 'typeSafety', 'pro', 'tsc'),

  // Coverage
  r('lineCoverage',   'Line coverage %',   'coverage', 'free', 'jest --coverage'),
  r('branchCoverage', 'Branch coverage %', 'coverage', 'pro',  'jest --coverage'),
  r('mutationScore',  'Mutation score',    'coverage', 'enterprise', 'stryker'),
  b('hasNoTest',      'Has no co-located test', 'coverage', 'pro', 'analyzer'),

  // Evolution
  r('churn',           'Churn (90d)',     'evolution', 'free', 'git log'),
  r('daysSinceTouched','Days since touch','evolution', 'free', 'git log'),
  r('authors',         'Author count',    'evolution', 'pro',  'git log'),
  r('recentPRs',       'Recent PRs',      'evolution', 'pro',  'github-api'),
  b('busFactor1Only',  'Bus factor = 1',  'evolution', 'enterprise', 'git log', 'Only one author has touched this file'),

  // Lints & hygiene
  r('eslintErrors',   'ESLint errors',   'lints', 'free', 'eslint'),
  r('eslintWarnings', 'ESLint warnings', 'lints', 'free', 'eslint'),
  r('todoCount',      'TODO/FIXME',      'lints', 'free', 'rg'),
  r('consoleCount',   'console.* calls', 'lints', 'pro',  'eslint'),

  // Security
  r('sastFindings', 'SAST findings', 'security', 'pro',        'codeql'),
  b('secretsOnly',  'Likely secrets only', 'security', 'enterprise', 'gitleaks'),

  // Perf
  r('bundleKB', 'Bundle KB contribution', 'perf', 'enterprise', 'rollup-plugin-visualizer'),

  // Architecture toggles
  t('publicApiOnly',  'Public API surface only', 'architecture', 'pro', 'package barrels'),
  t('isTest',         'Test files',              'architecture', 'free', 'pattern'),
  t('isGenerated',    'Generated files',         'architecture', 'pro',  'codegen markers'),
  t('isDeprecated',   '@deprecated',             'architecture', 'pro',  'tsc/JSDoc'),

  // Docs
  r('jsdocCoverage', 'JSDoc coverage %', 'docs', 'enterprise', 'typedoc'),
];

export function facetsByCategory(category: FacetCategoryKey): Facet[] {
  return FACETS.filter((f) => f.category === category);
}
