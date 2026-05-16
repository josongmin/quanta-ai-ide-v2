// Catalog-grounded synthetic surfaces for the Focus Scan panel.
//
// The dot-field demo doesn't run a real static engine, but the panel now
// presents capabilities sourced from the SOTA catalog
// (docs/catalog-algorithms-listing.md) — taint flow, concurrency, typestate,
// function summary, planner trace, proof platform. Each helper here is a
// deterministic, file-record-derived projection that *looks* like the kind
// of evidence those capabilities would emit, so the UI can wire layouts
// against stable shapes before a real engine lands.
//
// Determinism matters: the same FileRecord must always yield the same
// fabricated finding, otherwise re-renders shuffle the UI and the
// "evidence" reads as noise.
//
// Pure, no React, no async.
import type { FileRecord, RepoData } from '../model';

// ─────────────────────────────────────────────────────────────────────────
// Tiny seeded PRNG — same seed → same sequence. Used for plausible-looking
// finding counts and witness paths.
// ─────────────────────────────────────────────────────────────────────────

function lcg(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }

// ─────────────────────────────────────────────────────────────────────────
// Function summary — catalog: `function_summary`
//   I/O / heap effects / purity / cost band, per "function" in the file.
//   Synthesised from `fnCount`, `cyclomatic`, `cognitive`, `largestFnLoc`.
// ─────────────────────────────────────────────────────────────────────────

type EffectKind = 'pure' | 'io' | 'heap' | 'mutation' | 'async';
type CostBand = 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)';

export type FunctionSummaryRow = {
  name: string;
  kind: 'function' | 'method' | 'hook' | 'component';
  cyclomatic: number;
  cost: CostBand;
  effects: EffectKind[];
  pure: boolean;
};

// A small, deterministic name pool. We don't have real symbols, so we
// derive names from the file name and a few common verbs.
const VERB_POOL = ['handle', 'compute', 'load', 'render', 'parse', 'apply', 'select', 'map', 'normalize', 'flush'];

export function functionSummary(file: FileRecord, max = 6): FunctionSummaryRow[] {
  const m = file.metrics;
  const rng = lcg(file.id * 31 + m.fnCount);
  const total = Math.max(1, Math.min(max, m.fnCount));
  const stem = file.name.replace(/\.[a-z]+$/, '').replace(/[-_]/g, '').slice(0, 12) || 'fn';
  const rows: FunctionSummaryRow[] = [];

  // Cyclomatic budget split across the displayed functions, biased so the
  // first few look heavier.
  const cycBudget = Math.max(1, m.cyclomatic);

  for (let i = 0; i < total; i++) {
    const r = rng();
    const verb = VERB_POOL[Math.floor(r * VERB_POOL.length)] ?? 'run';
    const isComponent = file.language === 'tsx' && i === 0;
    const isHook = file.name.startsWith('use') && i === 0;
    const kind: FunctionSummaryRow['kind'] =
      isComponent ? 'component' : isHook ? 'hook' : i % 3 === 0 ? 'method' : 'function';
    const name = isComponent ? stem.charAt(0).toUpperCase() + stem.slice(1)
              : isHook ? 'use' + stem.charAt(0).toUpperCase() + stem.slice(1)
              : `${verb}${stem.charAt(0).toUpperCase() + stem.slice(1)}`;
    const cyc = Math.max(1, Math.round((cycBudget / total) * (1.4 - i * 0.15) * (0.7 + r * 0.6)));
    const effects: EffectKind[] = [];
    if (file.layer === 'service' || file.layer === 'controller') effects.push('io');
    if (rng() < 0.35) effects.push('heap');
    if (file.language === 'tsx' && rng() < 0.4) effects.push('async');
    if (rng() < 0.2) effects.push('mutation');
    const pure = effects.length === 0 && cyc <= 6;
    if (pure) effects.push('pure');
    const cost: CostBand =
      cyc >= 18 ? 'O(n²)' :
      cyc >= 12 ? 'O(n log n)' :
      cyc >= 6  ? 'O(n)' :
      cyc >= 3  ? 'O(log n)' : 'O(1)';
    rows.push({ name, kind, cyclomatic: cyc, cost, effects, pure });
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────
// Risk channels — taint / race / typestate / vuln
//   Catalog: `taint_flow`, `concurrency_analysis`, `typestate_analysis`,
//   `vulnerability_scan`, `source_sink_detection`.
// ─────────────────────────────────────────────────────────────────────────

export type RiskChannelKey = 'taint' | 'race' | 'typestate' | 'vuln' | 'layer' | 'publicApi';

type RiskChannelHit = {
  /** Short witness label, e.g. "user-input → eval (depth 3)". */
  label: string;
  /** Severity in 0..1 — UI maps to color band. */
  severity: number;
  /** Source/sink or symbol pair when applicable. */
  source?: string;
  sink?: string;
  /** Approximate hop count along the witness path. */
  depth?: number;
};

export type RiskChannelSummary = {
  key: RiskChannelKey;
  count: number;
  /** Dominant severity, 0..1. */
  severity: number;
  hits: RiskChannelHit[];
};

const TAINT_SOURCES = ['req.body', 'req.query', 'window.location', 'localStorage', 'process.env', 'event.target.value'];
const TAINT_SINKS = ['eval', 'innerHTML', 'exec', 'fs.writeFile', 'res.send', 'spawn'];
const RACE_RESOURCES = ['cache', 'queue', 'session', 'connection pool', 'shared map'];
const TYPESTATE_PROTOCOLS = ['Stream::open→close', 'Lock::acquire→release', 'AbortController::abort', 'WebSocket::connect→close', 'Reader::read→close'];

export function riskChannels(file: FileRecord): RiskChannelSummary[] {
  const m = file.metrics;
  const rng = lcg(file.id * 17 + 7);
  const out: RiskChannelSummary[] = [];

  // Taint — driven by SAST findings + public API exposure.
  {
    const baseCount = m.sastFindings + (m.secretsLikely ? 1 : 0) + (file.layer === 'controller' ? 1 : 0);
    const count = Math.max(0, Math.min(5, baseCount));
    const hits: RiskChannelHit[] = [];
    for (let i = 0; i < count; i++) {
      const src = TAINT_SOURCES[Math.floor(rng() * TAINT_SOURCES.length)] ?? TAINT_SOURCES[0];
      const sink = TAINT_SINKS[Math.floor(rng() * TAINT_SINKS.length)] ?? TAINT_SINKS[0];
      const depth = 2 + Math.floor(rng() * 4);
      hits.push({
        label: `${src} → ${sink}`,
        source: src,
        sink,
        depth,
        severity: m.secretsLikely ? 0.95 : 0.6 + rng() * 0.3,
      });
    }
    const severity = hits.length === 0 ? 0 : Math.max(...hits.map((h) => h.severity));
    out.push({ key: 'taint', count, severity, hits });
  }

  // Race — concurrent access heuristic. Triggered when a file imports many
  // others (high fanOut) and is in a service/controller layer.
  {
    const triggered = (file.layer === 'service' || file.layer === 'controller') && m.fanOut >= 6;
    const count = triggered ? 1 + (m.fanOut >= 12 ? 1 : 0) : 0;
    const hits: RiskChannelHit[] = [];
    for (let i = 0; i < count; i++) {
      const r = RACE_RESOURCES[Math.floor(rng() * RACE_RESOURCES.length)] ?? RACE_RESOURCES[0];
      hits.push({
        label: `unsynchronised ${r} access`,
        severity: 0.5 + rng() * 0.3,
        depth: 1 + Math.floor(rng() * 2),
      });
    }
    out.push({
      key: 'race',
      count,
      severity: hits.length === 0 ? 0 : Math.max(...hits.map((h) => h.severity)),
      hits,
    });
  }

  // Typestate — protocol-violation heuristic from cognitive complexity +
  // any-count (loose typing tends to drop guards).
  {
    const triggered = m.cognitive >= 50 || m.anyCount >= 8 || m.unsafeAssertions >= 3;
    const count = triggered ? 1 + (m.cognitive >= 80 ? 1 : 0) : 0;
    const hits: RiskChannelHit[] = [];
    for (let i = 0; i < count; i++) {
      const proto = TYPESTATE_PROTOCOLS[Math.floor(rng() * TYPESTATE_PROTOCOLS.length)] ?? TYPESTATE_PROTOCOLS[0];
      hits.push({
        label: `${proto} — branch skips terminal state`,
        severity: 0.45 + rng() * 0.3,
      });
    }
    out.push({
      key: 'typestate',
      count,
      severity: hits.length === 0 ? 0 : Math.max(...hits.map((h) => h.severity)),
      hits,
    });
  }

  // Vulnerability — SECURITY_ALERT status drives this directly.
  {
    const count = file.status === 'SECURITY_ALERT' ? 1 + Math.min(2, Math.floor(m.sastFindings / 3)) : 0;
    const hits: RiskChannelHit[] = [];
    for (let i = 0; i < count; i++) {
      hits.push({
        label: i === 0 ? 'CWE-79: reflected XSS via untrusted sink' : 'CWE-22: path traversal candidate',
        severity: 0.85 - i * 0.1,
      });
    }
    out.push({
      key: 'vuln',
      count,
      severity: hits.length === 0 ? 0 : Math.max(...hits.map((h) => h.severity)),
      hits,
    });
  }

  // Layer / public-API channels are direct booleans, surfaced for parity.
  out.push({
    key: 'layer',
    count: m.layerViolation ? 1 : 0,
    severity: m.layerViolation ? 0.7 : 0,
    hits: m.layerViolation ? [{ label: `${file.layer} → unexpected layer import`, severity: 0.7 }] : [],
  });
  out.push({
    key: 'publicApi',
    count: m.publicApi ? 1 : 0,
    severity: m.publicApi ? 0.4 : 0,
    hits: m.publicApi ? [{ label: 'Re-exported by package barrel', severity: 0.4 }] : [],
  });

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Planner trace — catalog: `planner_selection`, `query_contract`.
//   Which algorithm did the planner pick, and what did it reject.
//   We map simple heuristics on file metrics → algorithm names that exist
//   in the catalog so the trace reads as continuous with the docs.
// ─────────────────────────────────────────────────────────────────────────

export type PlannerCandidate = {
  algorithm: string;     // e.g. "pta_precise", "memssa_canonical"
  capability: string;    // e.g. "points_to", "dataflow"
  selected: boolean;
  reason: string;        // why selected / why rejected
  precisionClass: 'exact' | 'overapprox' | 'unknown';
};

export function plannerTrace(file: FileRecord): PlannerCandidate[] {
  const m = file.metrics;
  const trace: PlannerCandidate[] = [];

  // Points-to: if cognitive is low we pick precise; otherwise fall back to
  // Andersen inclusion. If cyclic, we degrade further.
  if (m.cognitive < 40 && !m.cyclic) {
    trace.push({ algorithm: 'pta_precise', capability: 'points_to', selected: true,
      reason: 'cognitive < 40 and acyclic — context-sensitive PTA fits in budget', precisionClass: 'exact' });
    trace.push({ algorithm: 'andersen_inclusion', capability: 'points_to', selected: false,
      reason: 'rejected: lower precision than pta_precise on this seed', precisionClass: 'overapprox' });
  } else if (m.cyclic) {
    trace.push({ algorithm: 'andersen_inclusion', capability: 'points_to', selected: true,
      reason: 'import cycle present — falling back to inclusion-based PTA', precisionClass: 'overapprox' });
    trace.push({ algorithm: 'pta_precise', capability: 'points_to', selected: false,
      reason: 'rejected: cycle blows context budget', precisionClass: 'exact' });
  } else {
    trace.push({ algorithm: 'andersen_inclusion', capability: 'points_to', selected: true,
      reason: 'cognitive ≥ 40 — staying with inclusion-based PTA', precisionClass: 'overapprox' });
  }

  // Dataflow: SSA flavor depends on whether memory operations are likely.
  const memHeavy = m.fanOut >= 6 || file.layer === 'service';
  if (memHeavy) {
    trace.push({ algorithm: 'memssa_canonical', capability: 'dataflow', selected: true,
      reason: 'memory-heavy region — MemSSA chosen for heap precision', precisionClass: 'exact' });
    trace.push({ algorithm: 'ssa_braun', capability: 'dataflow', selected: false,
      reason: 'rejected: stack-only SSA insufficient for heap effects', precisionClass: 'overapprox' });
  } else {
    trace.push({ algorithm: 'ssa_braun', capability: 'dataflow', selected: true,
      reason: 'pure / stack-local — Braun SSA is sufficient', precisionClass: 'exact' });
  }

  // Call graph: PTA-based when public API, else CHA.
  if (m.publicApi || m.fanIn >= 8) {
    trace.push({ algorithm: 'points_to_based', capability: 'call_graph', selected: true,
      reason: 'public surface — PTA-based call graph for caller precision', precisionClass: 'exact' });
    trace.push({ algorithm: 'cha', capability: 'call_graph', selected: false,
      reason: 'rejected: class-hierarchy fallback over-approximates virtuals', precisionClass: 'overapprox' });
  } else {
    trace.push({ algorithm: 'cha', capability: 'call_graph', selected: true,
      reason: 'private / low fan-in — class hierarchy is good enough', precisionClass: 'overapprox' });
  }

  // Taint: only when SAST or public API; otherwise capability skipped.
  if (m.sastFindings > 0 || m.publicApi) {
    trace.push({ algorithm: 'ifds_tabulation', capability: 'taint_flow', selected: true,
      reason: 'taint sources detected — IFDS tabulation engaged', precisionClass: 'exact' });
    trace.push({ algorithm: 'backward_ifds', capability: 'taint_flow', selected: false,
      reason: 'rejected: forward direction matches sink-discovery first', precisionClass: 'exact' });
  }

  return trace;
}

// ─────────────────────────────────────────────────────────────────────────
// Edge-mode toggle — call_graph / dataflow / find_references
//   Catalog: `call_graph`, `dataflow_paths`, `find_references`.
//   We project the existing import graph into three "lenses" so the GRAPH
//   tab can switch mode without new fixtures.
// ─────────────────────────────────────────────────────────────────────────

export type GraphEdgeMode = 'imports' | 'calls' | 'dataflow' | 'references';

export type GraphEdge = {
  fileId: number;
  /** What the edge represents in this mode. */
  kind: GraphEdgeMode;
  /** Confidence dot for the row — different from file confidence. */
  confidence: 'exact' | 'overapprox' | 'unknown';
  /** Optional witness blurb (e.g. "via typeof check"). */
  note?: string;
};

export function projectEdges(
  repo: RepoData,
  file: FileRecord,
  reverseDeps: number[],
  mode: GraphEdgeMode,
): { outgoing: GraphEdge[]; incoming: GraphEdge[] } {
  const rng = lcg(file.id * 13 + mode.length);
  const project = (id: number, isOut: boolean): GraphEdge => {
    const target = repo.files[id];
    let confidence: GraphEdge['confidence'] = 'exact';
    let note: string | undefined;
    if (mode === 'calls') {
      // PTA-style: if the target is an interface-like (publicApi) or the
      // source has cyclic imports, drop confidence.
      if (file.metrics.cyclic) { confidence = 'overapprox'; note = 'PTA via cycle'; }
      else if (target?.metrics.publicApi) { confidence = 'exact'; }
      else if (rng() < 0.18) { confidence = 'overapprox'; note = 'dynamic dispatch'; }
    } else if (mode === 'dataflow') {
      const sourceLike = isOut ? file : target;
      if (!sourceLike) confidence = 'unknown';
      else if (sourceLike.metrics.anyCount >= 5) { confidence = 'overapprox'; note = 'any in flow'; }
      else if (rng() < 0.1) { confidence = 'overapprox'; note = 'phi join'; }
      else { confidence = 'exact'; note = 'def → use'; }
    } else if (mode === 'references') {
      if (target?.metrics.publicApi) { confidence = 'exact'; note = 're-export'; }
      else if (rng() < 0.15) { confidence = 'overapprox'; note = 'lexical only'; }
    }
    return { fileId: id, kind: mode, confidence, note };
  };
  return {
    outgoing: file.deps.map((id) => project(id, true)),
    incoming: reverseDeps.map((id) => project(id, false)),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Proof / freshness — catalog: `proof_platform`, `incremental_analysis`.
// ─────────────────────────────────────────────────────────────────────────

export type ProofFreshness = {
  /** Trust class colour band. */
  trust: 'green' | 'amber' | 'red';
  /** Days since last index pass. */
  ageDays: number;
  /** "evidence-present" / "fresh:Nd" / "stale" — string from catalog. */
  freshnessClass: string;
  /** Whether a verified envelope is available (proof_platform). */
  verifiedEnvelope: boolean;
  /** Replay capsule available? */
  replayAvailable: boolean;
};

export function proofFreshness(file: FileRecord): ProofFreshness {
  const m = file.metrics;
  const trust: ProofFreshness['trust'] =
    m.confidence === 'exact' && m.indexState === 'fresh' ? 'green' :
    m.confidence === 'unknown' || m.indexState === 'timeout' ? 'red' :
    'amber';
  const freshnessClass =
    m.indexState === 'fresh' ? 'evidence-present' :
    m.indexState === 'stale' ? `fresh:${m.daysSinceTouched}d` :
    m.indexState === 'indexing' ? 'partial-index' : 'evidence-stale';
  return {
    trust,
    ageDays: m.daysSinceTouched,
    freshnessClass,
    verifiedEnvelope: m.confidence === 'exact' && !m.cyclic,
    replayAvailable: m.confidence !== 'unknown',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Severity → color band helper, shared by RISK channel chips.
// ─────────────────────────────────────────────────────────────────────────

export function severityBand(s: number): 'low' | 'medium' | 'high' {
  if (s >= 0.7) return 'high';
  if (s >= 0.35) return 'medium';
  return 'low';
}

export function aggregateRiskScore(channels: RiskChannelSummary[]): number {
  // Highest single-channel severity, weighted slightly by count.
  let best = 0;
  for (const c of channels) {
    if (c.count === 0) continue;
    const w = clamp01(c.severity + Math.min(0.2, (c.count - 1) * 0.05));
    if (w > best) best = w;
  }
  return clamp01(best);
}
