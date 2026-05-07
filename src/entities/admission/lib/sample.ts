import type { AdmissionRule } from '../model';

// Seed rule set. Mixes native (engine-only), 3rd-party (imported findings),
// and a couple of custom DSL rules so the board demos all three lanes.
//
// Native rules are intentionally things lint/semgrep *can't* do: they read
// graph metrics (blast radius, public API), PR-shape predicates
// (public-API-without-test), and analyzer confidence (unknown-region-creep).
// That's the message the board has to make obvious.

export const SAMPLE_RULES: AdmissionRule[] = [
  // ── Native — graph & metric driven ────────────────────────────────────
  {
    id: 'native.blast-cap',
    name: 'Blast radius cap',
    description:
      'Block when a changed file fans out to more than 50 transitively-dependent files.',
    source: 'native',
    severity: 'block',
    enabled: true,
    signal: { kind: 'metric', field: 'blastRadius', op: '>', value: 50 },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: false, requiresApproverRole: 'maintainer' },
    evidence: 'exact',
  },
  {
    id: 'native.public-api-without-test',
    name: 'Public API touched without test delta',
    description:
      'Public surface changed but the PR does not add or modify a test file. Lint can\'t see this — needs the call graph + PR diff.',
    source: 'native',
    severity: 'block',
    enabled: true,
    signal: { kind: 'graph', pattern: 'public-api-without-test' },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: false, requiresApproverRole: 'maintainer' },
    evidence: 'exact',
  },
  {
    id: 'native.import-cycle',
    name: 'Introduces an import cycle',
    description:
      'File belongs to a freshly-formed import cycle. Architecture-level signal, computed from the dependency graph.',
    source: 'native',
    severity: 'warn',
    enabled: true,
    signal: { kind: 'graph', pattern: 'import-cycle' },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: true, requiresApproverRole: null },
    evidence: 'exact',
  },
  {
    id: 'native.unknown-region-creep',
    name: 'Unknown-confidence region grew',
    description:
      'PR adds or expands files the analyzer can\'t resolve precisely (reflection, dynamic dispatch, missing types). The Honesty layer surfaced via admission.',
    source: 'native',
    severity: 'warn',
    enabled: true,
    signal: { kind: 'graph', pattern: 'unknown-region-creep' },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: true, requiresApproverRole: null },
    evidence: 'overapprox',
  },
  {
    id: 'native.taint-env-fs',
    name: 'Taint: env → fs.write',
    description:
      'Environment-derived data reaches a filesystem write without sanitization. Inter-procedural dataflow result.',
    source: 'native',
    severity: 'block',
    enabled: true,
    signal: { kind: 'taint', source: 'env', sink: 'fs.write', requireSanitizer: true },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: false, requiresApproverRole: 'security' },
    evidence: 'overapprox',
  },
  {
    id: 'native.edit-safety-floor',
    name: 'Edit-safety floor',
    description:
      'Block edits to files with edit-safety < 25. Composite of coverage, complexity, and blast radius.',
    source: 'native',
    severity: 'warn',
    enabled: true,
    signal: { kind: 'metric', field: 'editSafety', op: '<', value: 25 },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: true, requiresApproverRole: null },
    evidence: 'overapprox',
  },

  // ── Third-party imported ─────────────────────────────────────────────
  {
    id: 'eslint.no-eval',
    name: 'eslint: no-eval',
    description: 'Disallow `eval()` calls. Imported from the ESLint config.',
    source: 'eslint',
    severity: 'block',
    enabled: true,
    signal: { kind: 'external', tool: 'eslint', ruleId: 'no-eval' },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: false, requiresApproverRole: null },
    evidence: 'exact',
  },
  {
    id: 'semgrep.hardcoded-secret',
    name: 'semgrep: hardcoded-secret',
    description: 'Pattern-matched hardcoded credential. Imported from the Semgrep CI run.',
    source: 'semgrep',
    severity: 'block',
    enabled: true,
    signal: { kind: 'external', tool: 'semgrep', ruleId: 'hardcoded-secret' },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: false, requiresApproverRole: 'security' },
    evidence: 'exact',
  },
  {
    id: 'codeql.sql-injection',
    name: 'codeql: sql-injection',
    description: 'CodeQL taint query for SQL injection. Re-exposed here for one-pane review.',
    source: 'codeql',
    severity: 'block',
    enabled: false,
    signal: { kind: 'external', tool: 'codeql', ruleId: 'js/sql-injection' },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: false, requiresApproverRole: 'security' },
    evidence: 'overapprox',
  },

  // ── Custom DSL ────────────────────────────────────────────────────────
  {
    id: 'custom.no-deprecated-touch',
    name: 'No edits to deprecated modules',
    description:
      'Block PR edits to files marked deprecated. Authored as DSL on top of the facet engine.',
    source: 'custom',
    severity: 'warn',
    enabled: true,
    signal: { kind: 'dsl', expr: '+deprecated' },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: true, requiresApproverRole: null },
    evidence: 'exact',
  },
  {
    id: 'custom.busfactor-coverage',
    name: 'Bus-factor 1 with low coverage',
    description:
      'Files maintained by a single author and below 50% line coverage are too risky to merge unreviewed.',
    source: 'custom',
    severity: 'warn',
    enabled: true,
    signal: { kind: 'dsl', expr: '+busFactor1 coverage:<50' },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: false, requiresApproverRole: null },
    evidence: 'exact',
  },
];

/** Synthetic external-finding lookup. Maps `${tool}:${ruleId}` → file ids
 *  that "matched" the imported rule. In production this would come from the
 *  CI run artifact; for the demo we derive plausible hits from existing
 *  metric flags (secrets, sast, eslint). The mapping is built once per
 *  `RepoData` so the live preview stays O(1) per rule. */
export const EXTERNAL_RULE_MAP: Record<string, (m: {
  metrics: { sastFindings: number; secretsLikely: boolean; eslintErrors: number };
}) => boolean> = {
  'eslint:no-eval':              (f) => f.metrics.eslintErrors >= 3,
  'semgrep:hardcoded-secret':    (f) => f.metrics.secretsLikely,
  'codeql:js/sql-injection':     (f) => f.metrics.sastFindings >= 2,
  'bandit:B602':                 (f) => f.metrics.sastFindings >= 1,
  'ruff:S105':                   (f) => f.metrics.secretsLikely,
};
