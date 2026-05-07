import { describe, it, expect } from 'vitest';
import {
  findShortestPath,
  topRiskLens,
  simulateBranchDiff,
} from '../analysis';
import { buildRepo } from '../build';
import type { FileRecord, RepoData } from '../../model';

// ─── Test fixtures ────────────────────────────────────────────────────
// We construct tiny RepoData fixtures by hand for the graph-shape tests
// (findShortestPath wants control over deps; topRiskLens wants control over
// metrics). For simulateBranchDiff we use buildRepo() so we exercise the
// real-shaped data path.

function mkFile(overrides: Partial<FileRecord> & { id: number }): FileRecord {
  const { id } = overrides;
  return {
    name: `f${String(id)}.ts`,
    folderPath: 'src',
    folderParts: ['src'],
    ix: 0,
    iz: 0,
    status: 'STABLE',
    language: 'ts',
    layer: 'util',
    owner: '@team-core',
    isTest: false,
    isGenerated: false,
    isDeprecated: false,
    deps: [],
    metrics: {
      complexity: 5, cyclomatic: 5, cognitive: 5, halstead: 50,
      maintainability: 80, maxNesting: 2, fnCount: 3, largestFnLoc: 10, loc: 100,
      fanIn: 0, fanOut: 0, pagerank: 0,
      churn: 0.1, daysSinceTouched: 10, authors: 2, recentPRs: 1,
      anyCount: 0, tsIgnoreCount: 0, strictOptOut: false, unsafeAssertions: 0,
      lineCoverage: 80, branchCoverage: 70, mutationScore: 60, hasTestFile: true,
      eslintErrors: 0, eslintWarnings: 0, todoCount: 0, consoleCount: 0,
      secretsLikely: false, sastFindings: 0, bundleKB: 5,
      cyclic: false, dead: false, layerViolation: false, publicApi: false,
      jsdocCoverage: 50,
      confidence: 'exact', indexState: 'fresh', unknownReasons: [],
      editSafety: 80, blastRadius: 0,
      security: false,
    },
    ...overrides,
    id,
  };
}

function emptyRanges(): RepoData['ranges'] {
  const z: [number, number] = [0, 1];
  return {
    complexity: z, cyclomatic: z, cognitive: z, halstead: z,
    maintainability: z, maxNesting: z, fnCount: z, largestFnLoc: z, loc: z,
    fanIn: z, fanOut: z, churn: z, daysSinceTouched: z,
    authors: z, recentPRs: z, anyCount: z, tsIgnoreCount: z, unsafeAssertions: z,
    lineCoverage: z, branchCoverage: z, mutationScore: z,
    eslintErrors: z, eslintWarnings: z, todoCount: z, consoleCount: z,
    sastFindings: z, bundleKB: z, jsdocCoverage: z, editSafety: z, blastRadius: z,
  };
}

function mkRepo(files: FileRecord[]): RepoData {
  return {
    files,
    folders: [],
    foldersByPath: new Map(),
    ranges: emptyRanges(),
    owners: Array.from(new Set(files.map((f) => f.owner))).sort(),
  };
}

// ─────────────────────────────────────────────────────────────────────
describe('findShortestPath', () => {
  it('returns the shortest path through a known DAG', () => {
    // 0 → 1 → 2 → 3, plus a longer detour 0 → 4 → 5 → 2
    const repo = mkRepo([
      mkFile({ id: 0, deps: [1, 4] }),
      mkFile({ id: 1, deps: [2] }),
      mkFile({ id: 2, deps: [3] }),
      mkFile({ id: 3, deps: [] }),
      mkFile({ id: 4, deps: [5] }),
      mkFile({ id: 5, deps: [2] }),
    ]);
    const path = findShortestPath(repo, 0, 3);
    expect(path).not.toBeNull();
    expect(path!.fileIds).toEqual([0, 1, 2, 3]);
    expect(path!.hopKinds).toHaveLength(3);
  });

  it('returns null for disconnected pair', () => {
    const repo = mkRepo([
      mkFile({ id: 0, deps: [1] }),
      mkFile({ id: 1, deps: [] }),
      mkFile({ id: 2, deps: [3] }),
      mkFile({ id: 3, deps: [] }),
    ]);
    expect(findShortestPath(repo, 0, 3)).toBeNull();
  });

  it('returns single-node path when from == to', () => {
    const repo = mkRepo([
      mkFile({ id: 0, deps: [] }),
    ]);
    const path = findShortestPath(repo, 0, 0);
    expect(path).toEqual({ fileIds: [0], hopKinds: [] });
  });
});

// ─────────────────────────────────────────────────────────────────────
describe('topRiskLens', () => {
  it("'security' lens returns top files in score-descending order", () => {
    // Build a synthetic repo with varying security signals.
    const a = mkFile({
      id: 0,
      status: 'SECURITY_ALERT',
      metrics: {
        ...mkFile({ id: 0 }).metrics,
        sastFindings: 6,
        secretsLikely: true,
      },
    });
    const b = mkFile({
      id: 1,
      metrics: { ...mkFile({ id: 1 }).metrics, sastFindings: 4 },
    });
    const c = mkFile({
      id: 2,
      metrics: { ...mkFile({ id: 2 }).metrics, sastFindings: 1 },
    });
    const clean = mkFile({ id: 3 });
    const repo = mkRepo([a, b, c, clean]);

    const hits = topRiskLens(repo, 'security', 3);
    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.id).toBe(0);
    // Scores must be monotonically non-increasing.
    for (let i = 1; i < hits.length; i++) {
      const prev = hits[i - 1];
      const cur = hits[i];
      if (prev && cur) expect(prev.score).toBeGreaterThanOrEqual(cur.score);
    }
    // Each hit must include a breakdown for tooltip explainability.
    expect(hits[0]?.breakdown.length ?? 0).toBeGreaterThan(0);
  });

  it("'techDebt' lens orders by complexity/safety/churn composite", () => {
    // For techDebt: high cognitive + low editSafety + high churn.
    // We need ranges set up sensibly so the score is not trivially zero
    // for clean files; build a small repo where the worst offender wins.
    const heavy = mkFile({
      id: 0,
      metrics: {
        ...mkFile({ id: 0 }).metrics,
        cognitive: 70,
        editSafety: 10,
        churn: 0.9,
      },
    });
    const mid = mkFile({
      id: 1,
      metrics: {
        ...mkFile({ id: 1 }).metrics,
        cognitive: 30,
        editSafety: 50,
        churn: 0.4,
      },
    });
    const clean = mkFile({ id: 2 });
    const repo = mkRepo([heavy, mid, clean]);

    const hits = topRiskLens(repo, 'techDebt', 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.id).toBe(0);
  });

  it('returns empty array on empty repo', () => {
    const repo = mkRepo([]);
    expect(topRiskLens(repo, 'security')).toEqual([]);
    expect(topRiskLens(repo, 'techDebt')).toEqual([]);
    expect(topRiskLens(repo, 'busFactor')).toEqual([]);
    expect(topRiskLens(repo, 'testGaps')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
describe('simulateBranchDiff', () => {
  it('is deterministic for a given seed', () => {
    const repo = buildRepo(123);
    const diffA = simulateBranchDiff(repo, 42);
    const diffB = simulateBranchDiff(repo, 42);
    expect(diffA.changes).toEqual(diffB.changes);
    expect(diffA.affected).toEqual(diffB.affected);
    expect(diffA.seed).toBe(42);
  });

  it('different seeds produce different diffs', () => {
    const repo = buildRepo(123);
    const a = simulateBranchDiff(repo, 1);
    const b = simulateBranchDiff(repo, 999);
    // Either the change set or the affected set must differ in practice.
    const aKey = a.changes.map((c) => `${String(c.id)}:${c.kind}`).join(',');
    const bKey = b.changes.map((c) => `${String(c.id)}:${c.kind}`).join(',');
    expect(aKey).not.toBe(bKey);
  });

  it('every change has a known kind: added | modified | deleted', () => {
    const repo = buildRepo(7);
    const diff = simulateBranchDiff(repo, 17);
    expect(diff.changes.length).toBeGreaterThan(0);
    for (const c of diff.changes) {
      expect(['added', 'modified', 'deleted']).toContain(c.kind);
    }
  });

  it('returned ids are within repo bounds (changes + affected)', () => {
    const repo = buildRepo(7);
    const N = repo.files.length;
    const diff = simulateBranchDiff(repo, 17);
    for (const c of diff.changes) {
      expect(c.id).toBeGreaterThanOrEqual(0);
      expect(c.id).toBeLessThan(N);
    }
    for (const id of diff.affected) {
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(N);
    }
  });

  it('returns an empty diff for an empty repo', () => {
    const repo: RepoData = mkRepo([]);
    const diff = simulateBranchDiff(repo, 1);
    expect(diff.changes).toEqual([]);
    expect(diff.affected).toEqual([]);
    expect(diff.seed).toBe(1);
  });
});
