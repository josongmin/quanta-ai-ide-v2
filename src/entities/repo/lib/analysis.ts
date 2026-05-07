// Analysis primitives shared across the new "Blast Radius", "Time-axis
// Hotspot", and "Similar Files" surfaces. Pure functions; no React, no
// three.js. Each is small enough to run on demand from a hover handler
// without memo plumbing — the repo has ~600 files in the demo.

import type { FileRecord, RepoData } from '../model';

// ─────────────────────────────────────────────────────────────────────────
// Blast radius — transitive *dependents* (who breaks if I edit `seed`?)
// ─────────────────────────────────────────────────────────────────────────

export type BlastResult = {
  /** Direct dependents (1 hop). */
  direct: number[];
  /** All transitive dependents up to `maxDepth` hops, BFS order. */
  transitive: number[];
  /** Hop number per dependent id (matches `transitive`, same order). */
  hopOf: Map<number, number>;
  /** Subset of `transitive` that expose public API. */
  publicApiHits: number[];
  /** Subset of `transitive` that are tests. */
  testHits: number[];
};

// Reverse dependency adjacency, lazily computed and cached on the repo
// object. Avoids recomputing per hover. We attach via a WeakMap so different
// RepoData instances don't share state.
const REVERSE_DEPS_CACHE = new WeakMap<RepoData, number[][]>();

function getReverseDeps(repo: RepoData): number[][] {
  const cached = REVERSE_DEPS_CACHE.get(repo);
  if (cached) return cached;
  const N = repo.files.length;
  const rev: number[][] = Array.from({ length: N }, () => []);
  for (const f of repo.files) {
    for (const d of f.deps) {
      if (d >= 0 && d < N) rev[d]?.push(f.id);
    }
  }
  REVERSE_DEPS_CACHE.set(repo, rev);
  return rev;
}

export function computeBlast(
  repo: RepoData,
  seedId: number,
  maxDepth = 4,
): BlastResult {
  const rev = getReverseDeps(repo);
  const direct = (rev[seedId] ?? []).slice();
  const transitive: number[] = [];
  const hopOf = new Map<number, number>();
  const queue: [number, number][] = [[seedId, 0]];
  const seen = new Set<number>([seedId]);
  while (queue.length > 0) {
    const [id, depth] = queue.shift()!;
    if (depth > 0) {
      transitive.push(id);
      hopOf.set(id, depth);
    }
    if (depth >= maxDepth) continue;
    for (const next of rev[id] ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([next, depth + 1]);
    }
  }
  const publicApiHits: number[] = [];
  const testHits: number[] = [];
  for (const id of transitive) {
    const f = repo.files[id];
    if (!f) continue;
    if (f.metrics.publicApi) publicApiHits.push(id);
    if (f.isTest) testHits.push(id);
  }
  return { direct, transitive, hopOf, publicApiHits, testHits };
}

// ─────────────────────────────────────────────────────────────────────────
// Time-axis hotspot — scale aggregate 90d churn down to 7d / 30d windows
// ─────────────────────────────────────────────────────────────────────────

export type TimeWindow = '7d' | '30d' | '90d';

// Heuristic scaling. Real per-bucket churn isn't in the demo data, so we
// model a recency curve: short windows weight `recentPRs` more heavily so
// a file that's been touched in the past week reads visibly hotter.
const WINDOW_WEIGHTS: Record<TimeWindow, { churn: number; recency: number }> = {
  '7d':  { churn: 0.20, recency: 0.80 },
  '30d': { churn: 0.50, recency: 0.50 },
  '90d': { churn: 1.00, recency: 0.00 },
};

/**
 * Heat score for the time-axis overlay. `recentPRs` is treated as a stand-in
 * for short-window activity (already in repo data). Falls off with
 * `daysSinceTouched` so a stale file never reads "hot" on a 7d slice even
 * if the aggregate churn was high.
 */
export function timeWindowHeat(file: FileRecord, window: TimeWindow): number {
  const w = WINDOW_WEIGHTS[window];
  const m = file.metrics;
  const recency = Math.max(0, 1 - m.daysSinceTouched / horizonDays(window));
  const recentPRsNorm = Math.min(1, m.recentPRs / 12);
  const recencySignal = recency * 0.5 + recentPRsNorm * 0.5;
  // Multiply by complexity factor — "hot" only matters where the code is
  // also hard to change.
  const complexityNorm = Math.min(1, m.cognitive / 60);
  const base = w.churn * m.churn + w.recency * recencySignal;
  return base * (0.4 + 0.6 * complexityNorm);
}

function horizonDays(window: TimeWindow): number {
  return window === '7d' ? 14 : window === '30d' ? 60 : 180;
}

// ─────────────────────────────────────────────────────────────────────────
// Similar files — k-nearest neighbours by metric vector
// ─────────────────────────────────────────────────────────────────────────

export type SimilarHit = {
  id: number;
  score: number; // 0..1, higher = more similar
};

const SIM_VECTORS_CACHE = new WeakMap<RepoData, Float32Array[]>();

function buildVectors(repo: RepoData): Float32Array[] {
  const cached = SIM_VECTORS_CACHE.get(repo);
  if (cached) return cached;
  // Vector dims: shape × graph × evolution × hygiene. Ranges normalised
  // against the repo's own min/max so each axis weighs evenly.
  const r = repo.ranges;
  const norm = (v: number, range: [number, number]) => {
    const span = range[1] - range[0];
    if (span <= 0) return 0;
    return (v - range[0]) / span;
  };
  const vectors = repo.files.map((f) => {
    const m = f.metrics;
    return new Float32Array([
      norm(m.cognitive,       r.cognitive),
      norm(m.cyclomatic,      r.cyclomatic),
      norm(m.loc,             r.loc),
      norm(m.fanIn,           r.fanIn),
      norm(m.fanOut,          r.fanOut),
      norm(m.churn,           r.churn),
      norm(m.maintainability, r.maintainability),
      norm(m.fnCount,         r.fnCount),
    ]);
  });
  SIM_VECTORS_CACHE.set(repo, vectors);
  return vectors;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * Returns up to `k` files most similar to `seedId` by metric profile.
 * Filters: same language preferred, same layer preferred, never the seed
 * itself, never test scaffolding when the seed isn't a test.
 */
export function findSimilar(
  repo: RepoData,
  seedId: number,
  k = 8,
): SimilarHit[] {
  const seed = repo.files[seedId];
  if (!seed) return [];
  const vectors = buildVectors(repo);
  const seedVec = vectors[seedId];
  if (!seedVec) return [];

  const hits: SimilarHit[] = [];
  for (let i = 0; i < repo.files.length; i++) {
    if (i === seedId) continue;
    const f = repo.files[i];
    const v = vectors[i];
    if (!f || !v) continue;
    if (seed.isTest !== f.isTest) continue;
    let score = cosine(seedVec, v);
    // Soft boosts: same language, same layer.
    if (f.language === seed.language) score += 0.04;
    if (f.layer === seed.layer) score += 0.04;
    hits.push({ id: i, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, k);
}

// ─────────────────────────────────────────────────────────────────────────
// Path witness — shortest dependency path from A → B
// ─────────────────────────────────────────────────────────────────────────

export type PathHopKind = 'import' | 'call' | 'type';

export type PathWitness = {
  fileIds: number[];                         // [from, …intermediate, to]
  hopKinds: PathHopKind[];                   // length == fileIds.length - 1
};

/**
 * BFS over the *forward* dep graph. Returns null if no path exists. Hop
 * kinds are inferred deterministically from file metadata so a re-render
 * doesn't shuffle them: a hop into a public-API file reads as 'import',
 * into a test as 'call', otherwise 'type'.
 */
export function findShortestPath(
  repo: RepoData,
  fromId: number,
  toId: number,
  maxDepth = 8,
): PathWitness | null {
  if (fromId === toId) return { fileIds: [fromId], hopKinds: [] };
  const N = repo.files.length;
  const prev = new Int32Array(N).fill(-1);
  const seen = new Uint8Array(N);
  seen[fromId] = 1;
  const queue: number[] = [fromId];
  const depth = new Int16Array(N);
  let found = false;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (depth[cur] >= maxDepth) continue;
    const f = repo.files[cur];
    if (!f) continue;
    for (const next of f.deps) {
      if (seen[next]) continue;
      seen[next] = 1;
      prev[next] = cur;
      depth[next] = depth[cur] + 1;
      if (next === toId) { found = true; break; }
      queue.push(next);
    }
    if (found) break;
  }
  if (!found) return null;
  const fileIds: number[] = [];
  for (let cur = toId; cur !== -1; cur = prev[cur]!) {
    fileIds.unshift(cur);
    if (cur === fromId) break;
  }
  const hopKinds: PathHopKind[] = [];
  for (let i = 1; i < fileIds.length; i++) {
    const target = repo.files[fileIds[i]];
    if (!target) { hopKinds.push('type'); continue; }
    if (target.metrics.publicApi) hopKinds.push('import');
    else if (target.isTest) hopKinds.push('call');
    else hopKinds.push('type');
  }
  return { fileIds, hopKinds };
}

// ─────────────────────────────────────────────────────────────────────────
// Risk lens — pre-baked overlay presets that pair a metric weighting with
// a curated top-N list. Each lens is "one knob, one decision".
// ─────────────────────────────────────────────────────────────────────────

export type RiskLensKey =
  | 'security'    // SAST + secrets + vulnerable status
  | 'testGaps'   // big files + low coverage + no test sibling
  | 'busFactor'  // single-author files with high fanIn
  | 'techDebt';  // editSafety low + complexity high + churn

export type RiskLensHit = {
  id: number;
  score: number;   // 0..1
  /** Per-component contributions for tooltip / explainability. */
  breakdown: { label: string; value: number }[];
};

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }

export function riskLensScore(
  file: FileRecord,
  repo: RepoData,
  lens: RiskLensKey,
): RiskLensHit {
  const m = file.metrics;
  const breakdown: { label: string; value: number }[] = [];
  let score = 0;
  if (lens === 'security') {
    const sast = clamp01(m.sastFindings / 8);
    const secrets = m.secretsLikely ? 0.4 : 0;
    const vuln = file.status === 'SECURITY_ALERT' ? 0.6 : 0;
    breakdown.push({ label: 'SAST', value: sast });
    breakdown.push({ label: 'secrets', value: secrets });
    breakdown.push({ label: 'vuln status', value: vuln });
    score = clamp01(sast * 0.5 + secrets + vuln);
  } else if (lens === 'testGaps') {
    const sizeMax = repo.ranges.loc[1] || 1;
    const sizeWeight = clamp01(file.metrics.loc / sizeMax);
    const cov = clamp01(1 - m.lineCoverage / 100);
    const noTest = m.hasTestFile ? 0 : 0.4;
    breakdown.push({ label: 'size', value: sizeWeight });
    breakdown.push({ label: 'coverage gap', value: cov });
    breakdown.push({ label: 'no test', value: noTest });
    score = clamp01(Math.sqrt(sizeWeight * cov) + noTest * 0.4);
  } else if (lens === 'busFactor') {
    const single = m.authors <= 1 ? 1 : 0;
    const fanInMax = repo.ranges.fanIn[1] || 1;
    const importance = clamp01(m.fanIn / fanInMax);
    breakdown.push({ label: 'single author', value: single });
    breakdown.push({ label: 'incoming refs', value: importance });
    score = clamp01(single * 0.6 + importance * 0.6);
  } else {
    // techDebt
    const complexity = clamp01(m.cognitive / 80);
    const safety = clamp01(1 - m.editSafety / 100);
    const churn = clamp01(m.churn);
    breakdown.push({ label: 'complexity', value: complexity });
    breakdown.push({ label: 'edit safety gap', value: safety });
    breakdown.push({ label: 'churn', value: churn });
    score = clamp01(complexity * 0.4 + safety * 0.35 + churn * 0.25);
  }
  return { id: file.id, score, breakdown };
}

export function topRiskLens(
  repo: RepoData,
  lens: RiskLensKey,
  n = 10,
): RiskLensHit[] {
  const hits: RiskLensHit[] = [];
  for (const f of repo.files) {
    const h = riskLensScore(f, repo, lens);
    if (h.score > 0.05) hits.push(h);
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, n);
}

// ─────────────────────────────────────────────────────────────────────────
// PR preview — synthesize a "before/after" diff from a deterministic seed
// ─────────────────────────────────────────────────────────────────────────

export type PRChangeKind = 'added' | 'modified' | 'deleted';

export type PRDiff = {
  changes: { id: number; kind: PRChangeKind }[];
  /** Files transitively affected by the diff (excluding the changes themselves). */
  affected: number[];
  /** Stable identifier for memoization / display. */
  seed: number;
};

/**
 * Picks a small, deterministic set of "changed" files keyed by `seed` plus
 * everything they touch transitively (via reverse-deps). Real PR data isn't
 * available in the demo, so we surface the *shape* of a PR review: which
 * files moved, and where the ripple lands.
 */
export function simulateBranchDiff(repo: RepoData, seed: number): PRDiff {
  const files = repo.files;
  const N = files.length;
  if (N === 0) return { changes: [], affected: [], seed };
  // Linear-congruential generator — deterministic per seed.
  let s = (seed * 9301 + 49297) % 233280;
  const next = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  // Pick 4–8 changes biased toward high-churn files so the diff "looks" plausible.
  const candidates = files
    .map((f) => ({ id: f.id, weight: 0.2 + f.metrics.churn * 0.8 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, Math.max(20, Math.floor(N * 0.05)));
  const target = 4 + Math.floor(next() * 5);
  const changes: { id: number; kind: PRChangeKind }[] = [];
  const used = new Set<number>();
  while (changes.length < target && candidates.length > 0) {
    const idx = Math.floor(next() * candidates.length);
    const cand = candidates[idx];
    if (!cand || used.has(cand.id)) continue;
    used.add(cand.id);
    const r = next();
    const kind: PRChangeKind = r < 0.6 ? 'modified' : r < 0.85 ? 'added' : 'deleted';
    changes.push({ id: cand.id, kind });
  }
  // Fan-out the blast for each changed file (1 hop only, to keep the
  // ripple visually digestible). Reuse the cached reverse-deps.
  const rev = getReverseDeps(repo);
  const affectedSet = new Set<number>();
  for (const c of changes) {
    for (const dep of rev[c.id] ?? []) {
      if (!used.has(dep)) affectedSet.add(dep);
    }
  }
  return { changes, affected: Array.from(affectedSet), seed };
}

// ─────────────────────────────────────────────────────────────────────────
// Public API ring — "external fanIn" approximation
// ─────────────────────────────────────────────────────────────────────────

/**
 * Heuristic external-caller weight for the public-API ring. A file with
 * `publicApi: true` and a high fanIn is more "external-facing" than one
 * with the same fanIn but only internal callers. Returns 0..1.
 */
export function publicApiRing(file: FileRecord, repo: RepoData): number {
  if (!file.metrics.publicApi) return 0;
  const fanInMax = repo.ranges.fanIn[1] || 1;
  return clamp01(file.metrics.fanIn / fanInMax);
}
