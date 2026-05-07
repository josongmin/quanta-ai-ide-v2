import type { FileRecord, RepoData , PRDiff, PRChangeKind } from '@entities/repo';
import { parseDsl } from '@entities/facet';
import type {
  AdmissionDecision,
  AdmissionRule,
  GraphPattern,
  RuleEvaluation,
  RuleMatch,
  RulePreview,
  RuleSignal,
} from '../model';
import { EXTERNAL_RULE_MAP } from './sample';
import { estimateSignalCost, PREVIEW_MATCH_CAP } from './cost';

// ─────────────────────────────────────────────────────────────────────────
// Per-file predicate compiler. The output is a function that, given a file
// (and optionally PR context), returns `null` when the file does not match
// or a `RuleMatch` when it does. We keep all the branching in one place
// because the live preview calls this on every keystroke and we want the
// hot path to be a single switch.
// ─────────────────────────────────────────────────────────────────────────

type PRContext = {
  changedIds: Set<number>;
  changedKinds: Map<number, PRChangeKind>;
  testDelta: boolean;
};

function emptyPrContext(): PRContext {
  return { changedIds: new Set(), changedKinds: new Map(), testDelta: false };
}

function buildPrContext(repo: RepoData, diff: PRDiff): PRContext {
  const ids = new Set<number>();
  const kinds = new Map<number, PRChangeKind>();
  let testDelta = false;
  for (const c of diff.changes) {
    ids.add(c.id);
    kinds.set(c.id, c.kind);
    const f = repo.files[c.id];
    if (f?.isTest) testDelta = true;
  }
  return { changedIds: ids, changedKinds: kinds, testDelta };
}

// ─────────────────────────────────────────────────────────────────────────
// Compilers, one per signal kind. Each returns `(file) => RuleMatch | null`.
// Graph predicates that need PR context get it via closure.
// ─────────────────────────────────────────────────────────────────────────

type FilePredicate = (f: FileRecord) => RuleMatch | null;

function compareNum(op: string, a: number, b: number): boolean {
  switch (op) {
    case '>':  return a >  b;
    case '>=': return a >= b;
    case '<':  return a <  b;
    case '<=': return a <= b;
    case '=':  return a === b;
    case '!=': return a !== b;
    default:   return false;
  }
}

function compileMetric(signal: Extract<RuleSignal, { kind: 'metric' }>): FilePredicate {
  const { field, op, value } = signal;
  return (f) => {
    const v = (f.metrics as unknown as Record<string, number | boolean>)[field];
    if (typeof v !== 'number') return null;
    if (!compareNum(op, v, value)) return null;
    return {
      fileId: f.id,
      evidenceText: `${field} = ${v} (rule: ${op} ${value})`,
      confidence: f.metrics.confidence === 'stale' ? 'unknown' : (f.metrics.confidence),
    };
  };
}

function compileGraph(
  signal: Extract<RuleSignal, { kind: 'graph' }>,
  pr: PRContext,
): FilePredicate {
  const pattern: GraphPattern = signal.pattern;
  switch (pattern) {
    case 'import-cycle':
      return (f) =>
        f.metrics.cyclic
          ? { fileId: f.id, evidenceText: 'inside an import cycle', confidence: 'exact' }
          : null;
    case 'public-api-touched':
      return (f) => {
        if (!pr.changedIds.has(f.id)) return null;
        if (!f.metrics.publicApi) return null;
        return { fileId: f.id, evidenceText: 'public API file touched', confidence: 'exact' };
      };
    case 'public-api-without-test':
      return (f) => {
        if (!pr.changedIds.has(f.id)) return null;
        if (!f.metrics.publicApi) return null;
        if (pr.testDelta) return null;
        return {
          fileId: f.id,
          evidenceText: 'public-API touched, no test delta in PR',
          confidence: 'exact',
        };
      };
    case 'orphan-edit':
      return (f) => {
        if (!pr.changedIds.has(f.id)) return null;
        if (f.metrics.fanIn > 0) return null;
        return { fileId: f.id, evidenceText: 'edited file has no incoming refs', confidence: 'overapprox' };
      };
    case 'layer-violation':
      return (f) =>
        f.metrics.layerViolation
          ? { fileId: f.id, evidenceText: 'layer violation', confidence: 'exact' }
          : null;
    case 'unknown-region-creep':
      return (f) => {
        if (!pr.changedIds.has(f.id)) return null;
        if (f.metrics.confidence === 'exact') return null;
        return {
          fileId: f.id,
          evidenceText: `confidence: ${f.metrics.confidence} (${f.metrics.unknownReasons.slice(0, 2).join(', ') || 'no reason'})`,
          confidence: 'unknown',
        };
      };
    case 'blast-radius-spike':
      // Per-file: just flag files in PR with blastRadius >= threshold. The
      // rule-level "spike" is computed at decision time across the change set.
      return (f) => {
        if (!pr.changedIds.has(f.id)) return null;
        const threshold = signal.value ?? 25;
        if (f.metrics.blastRadius < threshold) return null;
        return {
          fileId: f.id,
          evidenceText: `blast radius ${f.metrics.blastRadius} ≥ ${threshold}`,
          confidence: 'overapprox',
        };
      };
  }
}

function compileTaint(signal: Extract<RuleSignal, { kind: 'taint' }>): FilePredicate {
  // Without a real taint engine we approximate: a file is "on a taint path"
  // when it has SAST findings *and* matches the source/sink heuristic that
  // shows up on existing metrics. The honesty here is the `overapprox`
  // confidence stamped on every match.
  const sourceHits = (f: FileRecord) => {
    if (signal.source === 'env' || signal.source === 'config') return f.metrics.secretsLikely || f.metrics.consoleCount > 4;
    if (signal.source === 'secret') return f.metrics.secretsLikely;
    if (signal.source === 'http' || signal.source === 'user-input') return f.metrics.sastFindings > 0;
    return false;
  };
  const sinkHits = (f: FileRecord) => {
    if (signal.sink === 'fs.write' || signal.sink === 'log') return f.metrics.consoleCount > 0 || f.metrics.sastFindings > 0;
    if (signal.sink === 'exec' || signal.sink === 'sql') return f.metrics.sastFindings > 0;
    if (signal.sink === 'network') return f.metrics.fanOut > 8;
    return false;
  };
  return (f) => {
    if (!sourceHits(f) || !sinkHits(f)) return null;
    return {
      fileId: f.id,
      evidenceText: `${signal.source} → ${signal.sink}${signal.requireSanitizer ? ' (sanitizer required)' : ''}`,
      confidence: 'overapprox',
    };
  };
}

function compileDsl(signal: Extract<RuleSignal, { kind: 'dsl' }>): FilePredicate {
  const parsed = parseDsl(signal.expr);
  if (!parsed.ok) {
    // Bad DSL → never matches; the editor shows the parse error separately.
    return () => null;
  }
  const pred = parsed.predicate;
  return (f) => {
    if (!pred(f)) return null;
    return {
      fileId: f.id,
      evidenceText: `dsl: ${signal.expr}`,
      confidence: 'exact',
    };
  };
}

function compileExternal(signal: Extract<RuleSignal, { kind: 'external' }>): FilePredicate {
  const key = `${signal.tool}:${signal.ruleId}`;
  const matcher = EXTERNAL_RULE_MAP[key];
  if (!matcher) return () => null;
  return (f) => {
    if (!matcher(f)) return null;
    return {
      fileId: f.id,
      evidenceText: `${signal.tool}:${signal.ruleId} matched`,
      confidence: 'exact',
    };
  };
}

function compileRule(rule: AdmissionRule, pr: PRContext): FilePredicate {
  const inner: FilePredicate = (() => {
    switch (rule.signal.kind) {
      case 'metric':   return compileMetric(rule.signal);
      case 'graph':    return compileGraph(rule.signal, pr);
      case 'taint':    return compileTaint(rule.signal);
      case 'dsl':      return compileDsl(rule.signal);
      case 'external': return compileExternal(rule.signal);
    }
  })();

  // Apply scope filter on top.
  const { pathIncludes, pathExcludes } = rule.scope;
  if (pathIncludes.length === 0 && pathExcludes.length === 0) return inner;
  return (f) => {
    const path = `${f.folderPath}.${f.name}`.toLowerCase();
    if (pathExcludes.some((p) => path.includes(p.toLowerCase()))) return null;
    if (pathIncludes.length > 0 && !pathIncludes.some((p) => path.includes(p.toLowerCase()))) return null;
    return inner(f);
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Live preview — run a single rule against the whole repo
// ─────────────────────────────────────────────────────────────────────────

export function previewRule(rule: AdmissionRule, repo: RepoData, prDiff: PRDiff | null = null): RulePreview {
  const t0 = performance.now();
  const ctx = prDiff ? buildPrContext(repo, prDiff) : emptyPrContext();
  const pred = compileRule(rule, ctx);
  const matches: RuleMatch[] = [];
  const mix = { exact: 0, overapprox: 0, unknown: 0 };
  let truncated = false;
  for (const f of repo.files) {
    const m = pred(f);
    if (!m) continue;
    if (matches.length >= PREVIEW_MATCH_CAP) { truncated = true; continue; }
    matches.push(m);
    mix[m.confidence]++;
  }
  return {
    ruleId: rule.id,
    matches,
    truncated,
    cost: estimateSignalCost(rule.signal),
    elapsedMs: Math.max(0, performance.now() - t0),
    confidenceMix: mix,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// PR admission decision — run all enabled rules against a PR diff
// ─────────────────────────────────────────────────────────────────────────

export function evaluateAdmission(
  rules: AdmissionRule[],
  repo: RepoData,
  prDiff: PRDiff,
): AdmissionDecision {
  const ctx = buildPrContext(repo, prDiff);
  const ruleResults: RuleEvaluation[] = [];
  let blockingCount = 0;
  let warningCount = 0;
  let passingCount = 0;

  for (const rule of rules) {
    if (!rule.enabled) {
      ruleResults.push({
        ruleId: rule.id,
        ruleName: rule.name,
        source: rule.source,
        severity: rule.severity,
        status: 'skip',
        hits: [],
        reason: 'disabled',
      });
      continue;
    }
    const pred = compileRule(rule, ctx);
    const hits: RuleMatch[] = [];
    // Restrict hits to the change set for PR-scoped rules; metric/dsl/taint
    // rules without PR context still scope to changed files for the
    // decision panel (we already preview the global view separately).
    for (const f of repo.files) {
      if (!ctx.changedIds.has(f.id)) {
        // Metric/DSL rules can also flag files *outside* the change set
        // (e.g. "unknown-region-creep" we already filter inside compileGraph).
        // For metric/dsl/taint we narrow to changed files for admission so
        // the decision is about *this PR*, not the whole repo.
        if (rule.signal.kind === 'metric' || rule.signal.kind === 'dsl' ||
            rule.signal.kind === 'taint' || rule.signal.kind === 'external') {
          continue;
        }
      }
      const m = pred(f);
      if (m) hits.push(m);
    }

    // Special-case: blast-radius spike compares the SUM across PR.
    if (rule.signal.kind === 'graph' && rule.signal.pattern === 'blast-radius-spike') {
      const threshold = rule.signal.value ?? 100;
      let sum = 0;
      for (const id of ctx.changedIds) {
        const f = repo.files[id];
        if (f) sum += f.metrics.blastRadius;
      }
      if (sum < threshold) hits.length = 0;
    }

    let status: RuleEvaluation['status'];
    let reason: string;
    if (hits.length === 0) {
      status = 'pass';
      reason = 'no matches in change set';
      passingCount++;
    } else if (rule.severity === 'block') {
      status = 'block';
      reason = `${hits.length} file${hits.length > 1 ? 's' : ''} violate this rule`;
      blockingCount++;
    } else if (rule.severity === 'warn') {
      status = 'warn';
      reason = `${hits.length} file${hits.length > 1 ? 's' : ''} flagged`;
      warningCount++;
    } else {
      status = 'pass';
      reason = `${hits.length} info-level match${hits.length > 1 ? 'es' : ''}`;
      passingCount++;
    }

    ruleResults.push({
      ruleId: rule.id,
      ruleName: rule.name,
      source: rule.source,
      severity: rule.severity,
      status,
      hits,
      reason,
    });
  }

  const outcome: AdmissionDecision['outcome'] =
    blockingCount > 0 ? 'block' : warningCount > 0 ? 'warn' : 'allow';

  return { outcome, ruleResults, blockingCount, warningCount, passingCount };
}

// ─────────────────────────────────────────────────────────────────────────
// Retroactive simulation — "if this rule were on, how many recent PRs
// would have been blocked?". Replays a deterministic sample of seeds
// against the repo. Cheap because the simulator is in-memory.
// ─────────────────────────────────────────────────────────────────────────

export type RetroResult = {
  simulated: number;
  wouldBlock: number;
  wouldWarn: number;
  wouldPass: number;
};

export function retroactiveImpact(
  rule: AdmissionRule,
  repo: RepoData,
  prDiffs: PRDiff[],
): RetroResult {
  const out: RetroResult = { simulated: prDiffs.length, wouldBlock: 0, wouldWarn: 0, wouldPass: 0 };
  for (const diff of prDiffs) {
    const decision = evaluateAdmission([rule], repo, diff);
    if (decision.blockingCount > 0) out.wouldBlock++;
    else if (decision.warningCount > 0) out.wouldWarn++;
    else out.wouldPass++;
  }
  return out;
}
