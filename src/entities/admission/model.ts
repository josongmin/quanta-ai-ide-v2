// Admission rules — gate PRs on signals from the static engine, third-party
// linters, and user-authored DSL. Same shape across all three sources so the
// rules board can render them uniformly. The engine signals are what makes
// this different from "another lint config": rules can talk about blast
// radius, public-API surface, taint paths, and analyzer confidence — things
// text-only linters can't see.

export type RuleSource = 'native' | 'eslint' | 'semgrep' | 'codeql' | 'custom';

export type RuleSeverity = 'block' | 'warn' | 'info';

// Cost class for the live preview. Drives both the badge ("can I run this on
// every keystroke?") and which buttons we expose ("preview" vs "run in
// background"). See `cost.ts` for the assignment table.
export type CostClass = 'instant' | 'fast' | 'medium' | 'slow' | 'background';

// Honesty layer carry-over (Spec §4, §11). When a rule's signal can only be
// computed via overapproximation we want that visible at preview time, not
// hidden behind a green checkmark.
export type EvidenceLevel = 'exact' | 'overapprox' | 'unknown';

// ─────────────────────────────────────────────────────────────────────────
// Signals — the "what does this rule look at" union.
// Each branch maps to one evaluator in `evaluate.ts`.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Numeric metric thresholds. Everything in `FileRecord.metrics` that is a
 * number is fair game; the field name is a string union of the keys that
 * make sense as gating signals (see MetricField below).
 */
export type MetricField =
  | 'blastRadius'
  | 'editSafety'
  | 'sastFindings'
  | 'cognitive'
  | 'cyclomatic'
  | 'loc'
  | 'fanIn'
  | 'fanOut'
  | 'churn'
  | 'lineCoverage'
  | 'maintainability'
  | 'eslintErrors'
  | 'todoCount';

export type CompareOp = '>' | '>=' | '<' | '<=' | '=' | '!=';

export type MetricSignal = {
  kind: 'metric';
  field: MetricField;
  op: CompareOp;
  value: number;
};

/**
 * Graph-shaped predicates. These can't be expressed as a single metric
 * because they depend on relationships between files (the call/import
 * graph, PR change set, etc.). This is the actual differentiator vs
 * text-based linters.
 */
export type GraphPattern =
  | 'import-cycle'             // file is part of a cycle (`metrics.cyclic`)
  | 'public-api-touched'       // PR modifies a `metrics.publicApi` file
  | 'public-api-without-test'  // public-API touched AND no test delta in PR
  | 'orphan-edit'              // PR edits file with no incoming refs
  | 'blast-radius-spike'       // sum of blast across PR > value
  | 'unknown-region-creep'     // PR adds files w/ confidence != exact
  | 'layer-violation';         // file has layerViolation flag

export type GraphSignal = {
  kind: 'graph';
  pattern: GraphPattern;
  /** Optional numeric parameter (e.g. spike threshold). */
  value?: number;
};

/**
 * Taint flow signals. Source/sink are coarse categories — a real engine
 * would resolve them to concrete API symbols, but for the demo we map them
 * onto the `metrics.secretsLikely` and `metrics.sastFindings` heuristics
 * already produced by the analyzer.
 */
export type TaintSource = 'env' | 'http' | 'user-input' | 'config' | 'secret';
export type TaintSink = 'fs.write' | 'exec' | 'sql' | 'network' | 'log';

export type TaintSignal = {
  kind: 'taint';
  source: TaintSource;
  sink: TaintSink;
  /** Whether a sanitizer is required on the path. */
  requireSanitizer: boolean;
};

/**
 * Free-form DSL. Reuses the existing facet DSL so authors can write
 * `safety:<40 +publicApi` and have it act as a rule. Compiled lazily.
 */
export type DslSignal = {
  kind: 'dsl';
  expr: string;
};

/**
 * Externally-imported finding (Semgrep / ESLint / CodeQL). We don't author
 * the rule — we just keep it on the same board and respect its severity.
 * `tool` + `ruleId` is the join key against the synthetic `findings` field
 * on the file record (see `entities/admission/sample.ts`).
 */
export type ExternalSignal = {
  kind: 'external';
  tool: 'eslint' | 'semgrep' | 'codeql' | 'bandit' | 'ruff';
  ruleId: string;
};

export type RuleSignal =
  | MetricSignal
  | GraphSignal
  | TaintSignal
  | DslSignal
  | ExternalSignal;

// ─────────────────────────────────────────────────────────────────────────
// Scope — narrow which files / PRs the rule applies to.
// Empty arrays mean "all". Path patterns are simple substring matches; we
// avoid full glob to keep the live preview O(N) and predictable.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Where the rule lives in the policy hierarchy.
 *  - 'workspace' = applies to every repo (org-wide policy)
 *  - 'repo'      = applies only to the current repo
 */
export type RuleAppliesTo = 'workspace' | 'repo';

export type RuleScope = {
  /** Path substrings; a file matches if any substring is in `folderPath` or `name`. */
  pathIncludes: string[];
  /** Path substrings to exclude. Takes precedence over `pathIncludes`. */
  pathExcludes: string[];
  /** PR labels; if non-empty, rule only applies when PR has at least one. */
  labels: string[];
};

export type RuleOverride = {
  /** PR author can self-override (sets the violation to `info`). */
  allowAuthor: boolean;
  /** If set, override requires an approver with this role. */
  requiresApproverRole: string | null;
};

// ─────────────────────────────────────────────────────────────────────────
// Rule
// ─────────────────────────────────────────────────────────────────────────

export type AdmissionRule = {
  id: string;
  name: string;
  description: string;
  source: RuleSource;
  severity: RuleSeverity;
  enabled: boolean;
  signal: RuleSignal;
  scope: RuleScope;
  /** Policy tier — workspace-wide vs repo-local. */
  appliesTo?: RuleAppliesTo;
  override: RuleOverride;
  /** Author-declared evidence level. Preview can downgrade this if the
      actual matched files disagree (e.g. all matches are overapprox). */
  evidence: EvidenceLevel;
};

// ─────────────────────────────────────────────────────────────────────────
// Match results — what the evaluator hands back
// ─────────────────────────────────────────────────────────────────────────

/** A single file that matched the rule's signal. */
export type RuleMatch = {
  fileId: number;
  /** Which value tripped the rule, for tooltips. */
  evidenceText: string;
  /** Per-match confidence; rule-level evidence is the worst across matches. */
  confidence: EvidenceLevel;
};

export type RulePreview = {
  ruleId: string;
  /** Files matched against the *current repo*. */
  matches: RuleMatch[];
  /** Sampled cap. If true, `matches` is truncated. */
  truncated: boolean;
  /** Cost class used for this preview run. */
  cost: CostClass;
  /** Wall-clock ms (approximate; we do this in-thread). */
  elapsedMs: number;
  /** Distribution of evidence levels across `matches`. */
  confidenceMix: { exact: number; overapprox: number; unknown: number };
};

/** PR-level admission decision after evaluating a rule set. */
export type AdmissionDecision = {
  outcome: 'allow' | 'warn' | 'block';
  /** Per-rule outcomes, in rule order. */
  ruleResults: RuleEvaluation[];
  /** Convenience flatteners. */
  blockingCount: number;
  warningCount: number;
  passingCount: number;
};

export type RuleEvaluation = {
  ruleId: string;
  ruleName: string;
  source: RuleSource;
  severity: RuleSeverity;
  status: 'pass' | 'warn' | 'block' | 'skip';
  /** File-level matches inside the PR's change set. Empty when status=pass. */
  hits: RuleMatch[];
  /** Short reason string for the decision panel. */
  reason: string;
};
