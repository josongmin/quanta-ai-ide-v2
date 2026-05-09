import type { FileRecord } from '@entities/repo';

// Synthetic git × index data feeding the SOTA++ inspector cards. The
// real product joins three sources we already have:
//   1. The dependency graph (deps, fanIn/Out, layer, pagerank).
//   2. Per-file metrics (cyclomatic, churn, authors, daysSinceTouched).
//   3. The git history (commits, PR ids, blame).
// In production the three streams are merged at index time. For the
// demo we synthesise a *deterministic* roll from the FileRecord so the
// numbers move with the file's real metrics — bigger churn → more
// commits in the timeline, deeper layer → more inbound semantic
// conflicts, etc. Same seed, same numbers, every render.

// ─── Symbol-level evolution timeline ─────────────────────────────────
// Each "tick" is one PR that touched this file's primary symbol. We
// synthesise 8–12 ticks spread across `daysSinceTouched` so a fresh
// file shows recent ticks and a stale one's tail goes far back. cyc
// values walk near the file's current metric with PRNG noise; the
// landing PR drives the sparkline's shape, including a synthetic
// bisect point where complexity *jumped* (so the UI has something to
// surface as the "regression commit").

export type SymbolTick = {
  prId: number;
  daysAgo: number;
  cyclomatic: number;
  loc: number;
  author: string;
  message: string;
  // True for the single tick that introduced the largest cyc jump in
  // the window — surfaced as the bisect target.
  isJump: boolean;
};

const AUTHORS = ['alice', 'bob', 'jin', 'sam', 'park', 'eun', 'ryu'];
const MESSAGES = [
  'Add null guard for empty input',
  'Refactor branch handling',
  'Inline session lookup',
  'Patch race in retry path',
  'Extract validation helper',
  'Fix off-by-one in pagination',
  'Tighten error mapping',
  'Cache hot lookup',
  'Wire telemetry hook',
  'Drop legacy fallback',
];

export function symbolEvolution(file: FileRecord): SymbolTick[] {
  const seed = (file.id * 9301 + 49297) % 233280;
  const rand = mulberry32(seed);
  const tickCount = 8 + Math.floor(rand() * 5); // 8..12
  const daysWindow = Math.max(60, file.metrics.daysSinceTouched);
  const ticks: SymbolTick[] = [];

  // Walk cyclomatic from a baseline that's ~70% of the current value
  // up to the current value, then place one synthetic jump in the
  // *back half* of the window so the sparkline has a story.
  const target = Math.max(4, file.metrics.cyclomatic);
  const baseline = Math.max(2, Math.round(target * 0.55));
  const jumpIdx = Math.floor(tickCount * 0.55) + Math.floor(rand() * 2);

  let cyc = baseline;
  let loc = Math.max(20, Math.round(file.metrics.loc * 0.6));
  for (let i = 0; i < tickCount; i++) {
    const isJump = i === jumpIdx;
    const stepNoise = (rand() - 0.5) * 2;
    if (isJump) cyc = Math.round(cyc * 1.6 + 4);
    else cyc = Math.max(2, Math.round(cyc + stepNoise + (target - cyc) * 0.18));
    loc += Math.round(rand() * 30 + (isJump ? 80 : 5));
    ticks.push({
      prId: 1900 + Math.floor(rand() * 800) + i * 7,
      daysAgo: Math.round(daysWindow * (1 - i / Math.max(1, tickCount - 1))),
      cyclomatic: cyc,
      loc,
      author: AUTHORS[Math.floor(rand() * AUTHORS.length)],
      message: MESSAGES[Math.floor(rand() * MESSAGES.length)],
      isJump,
    });
  }

  // Make sure the *last* tick lands on the file's current value so the
  // headline (current cyc) reads consistent with the rest of the panel.
  if (ticks.length > 0) {
    ticks[ticks.length - 1].cyclomatic = file.metrics.cyclomatic;
    ticks[ticks.length - 1].loc = file.metrics.loc;
  }
  return ticks;
}

// ─── Semantic-conflict candidates ────────────────────────────────────
// Returns 0–3 currently-open PRs whose touched files would *meet* this
// file's call graph — i.e. would land on shared callers/callees if both
// merged. We generate stable candidates per file so the demo doesn't
// strobe; production reads open PRs from the host (GitHub) and walks
// the call graph with our index.

export type ConflictCandidate = {
  prId: number;
  prTitle: string;
  author: string;
  branch: string;
  // Why we believe a conflict is possible.
  reason:
    | 'shared-caller'
    | 'shared-callee'
    | 'dataflow-overlap'
    | 'signature-touch';
  // Expected blast — overlapping files between the two PRs' transitive
  // closures.
  overlapFiles: number;
  severity: 'high' | 'medium' | 'low';
};

export function semanticConflicts(file: FileRecord): ConflictCandidate[] {
  // Files with high fanIn / churn are more likely to clash with active
  // work. Quiet leaves get an empty list, which is the right answer.
  const stress = file.metrics.fanIn + file.metrics.churn * 8;
  if (stress < 6) return [];

  const seed = file.id * 7919;
  const rand = mulberry32(seed);
  const count = stress > 18 ? 3 : stress > 11 ? 2 : 1;
  const reasons: ConflictCandidate['reason'][] = [
    'shared-callee',
    'shared-caller',
    'signature-touch',
    'dataflow-overlap',
  ];
  const titles = [
    'Refactor session token plumbing',
    'Migrate billing to v2 pipeline',
    'Drop legacy retry middleware',
    'Tighten input validation across boundary',
    'Restructure cache layer',
    'Untangle circular import',
  ];
  const branches = [
    'feat/billing-v2', 'refactor/auth-middleware',
    'fix/cache-stale', 'feat/strict-validation',
  ];

  const out: ConflictCandidate[] = [];
  for (let i = 0; i < count; i++) {
    const reason = reasons[Math.floor(rand() * reasons.length)];
    const overlapFiles = Math.max(
      1,
      Math.round(file.metrics.blastRadius * (0.10 + rand() * 0.25)),
    );
    const severity: ConflictCandidate['severity'] =
      overlapFiles > 12 ? 'high' :
      overlapFiles > 4  ? 'medium' :
                          'low';
    out.push({
      prId: 2100 + Math.floor(rand() * 600),
      prTitle: titles[Math.floor(rand() * titles.length)],
      author: AUTHORS[Math.floor(rand() * AUTHORS.length)],
      branch: branches[Math.floor(rand() * branches.length)],
      reason,
      overlapFiles,
      severity,
    });
  }
  // Sort severity desc.
  out.sort((a, b) => weight(b.severity) - weight(a.severity));
  return out;
}

function weight(s: ConflictCandidate['severity']): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
}

// ─── Safe-rename confidence breakdown ────────────────────────────────
// We score a hypothetical rename of *this file's primary symbol* by
// summing four axes. The output reads like a calibration breakdown —
// each axis green/yellow/red, with a per-axis explanation. Confidence
// model maps 1:1 onto our existing entity-level Confidence type so the
// "exact / overapprox / unknown" language is consistent across the app.

export type RenameAxis = {
  id: 'ast' | 'dispatch' | 'strings' | 'public';
  label: string;
  score: number;       // 0..1
  detail: string;
};

export type SafeRenameResult = {
  axes: RenameAxis[];
  composite: number;   // 0..1
  unsafeCallsites: number;
  totalCallsites: number;
};

export function safeRename(file: FileRecord): SafeRenameResult {
  const m = file.metrics;
  const totalCallsites = m.fanIn;

  // ── AST-level reachability. If we have static dispatch + types,
  // 100%. unknownReasons["dynamic dispatch"] drops it sharply.
  const dynamic = m.unknownReasons.includes('dynamic dispatch');
  const reflection = m.unknownReasons.includes('reflection');
  const astScore = dynamic ? 0.55 : reflection ? 0.70 : 0.99;

  // ── Dispatch model. Same dynamic flag again, but here it's framed
  // as "how many callsites are we *not sure* we caught."
  const dispatchScore = dynamic ? 0.60 : 0.97;

  // ── String-literal references. We don't have a real string-search
  // index in the demo, so we model "this symbol may appear in
  // configs / DSLs / templates" with a heuristic on layer + publicApi.
  const stringRisk = m.publicApi ? 0.20 : 0.06;
  const stringScore = 1 - stringRisk;

  // ── Public-API exposure. publicApi true → external consumers
  // potentially affected, lowering rename confidence.
  const publicScore = m.publicApi ? 0.55 : 0.95;

  const axes: RenameAxis[] = [
    {
      id: 'ast',
      label: 'AST resolved',
      score: astScore,
      detail: dynamic
        ? 'Dynamic dispatch in callsite — some refs may be missed'
        : reflection
          ? 'Reflection use detected — manual verification recommended'
          : 'All callsites resolved by the type checker',
    },
    {
      id: 'dispatch',
      label: 'Static dispatch',
      score: dispatchScore,
      detail: dynamic
        ? 'Indirect calls via runtime lookup'
        : 'Direct calls only',
    },
    {
      id: 'strings',
      label: 'Stringly refs',
      score: stringScore,
      detail: m.publicApi
        ? 'Symbol is publicly re-exported — config / DSL refs likely'
        : 'No public surface — unlikely to appear as a string',
    },
    {
      id: 'public',
      label: 'Public surface',
      score: publicScore,
      detail: m.publicApi
        ? 'Re-exported from package barrel — external consumers exposed'
        : 'Internal symbol — rename stays inside the package',
    },
  ];

  // Composite = product of the individual probabilities. Penalises
  // any single low axis sharply, which is the right behaviour for a
  // safety check (one risky axis should reduce overall confidence,
  // not get averaged out).
  const composite = axes.reduce((a, x) => a * x.score, 1);
  const unsafeCallsites = Math.max(
    0,
    Math.round(totalCallsites * (1 - composite)),
  );

  return { axes, composite, unsafeCallsites, totalCallsites };
}

// ─── Cheap deterministic PRNG (mulberry32) ───────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
