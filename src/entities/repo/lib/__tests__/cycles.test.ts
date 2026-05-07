import { describe, it, expect } from 'vitest';
import { computeSCCs, cycleSCCs } from '../cycles';
import type { FileRecord } from '../../model';

// Minimal FileRecord factory — only `id` and `deps` are read by Tarjan.
// Everything else is filled with zeroes/defaults to satisfy the type.
function mk(id: number, deps: number[]): FileRecord {
  return {
    id,
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
    deps,
    metrics: {
      complexity: 0, cyclomatic: 0, cognitive: 0, halstead: 0,
      maintainability: 100, maxNesting: 0, fnCount: 1, largestFnLoc: 1, loc: 10,
      fanIn: 0, fanOut: 0, pagerank: 0,
      churn: 0, daysSinceTouched: 0, authors: 1, recentPRs: 0,
      anyCount: 0, tsIgnoreCount: 0, strictOptOut: false, unsafeAssertions: 0,
      lineCoverage: 100, branchCoverage: 100, mutationScore: 100, hasTestFile: true,
      eslintErrors: 0, eslintWarnings: 0, todoCount: 0, consoleCount: 0,
      secretsLikely: false, sastFindings: 0, bundleKB: 0,
      cyclic: false, dead: false, layerViolation: false, publicApi: false,
      jsdocCoverage: 0,
      confidence: 'exact', indexState: 'fresh', unknownReasons: [],
      editSafety: 100, blastRadius: 0,
      security: false,
    },
  };
}

function asSet(comp: number[]): Set<number> {
  return new Set(comp);
}

describe('computeSCCs / cycleSCCs', () => {
  it('returns no real cycles for a DAG', () => {
    const files = [
      mk(0, [1, 2]),
      mk(1, [2]),
      mk(2, []),
      mk(3, [0]),
    ];
    const sccs = computeSCCs(files);
    expect(sccs.length).toBe(files.length); // every node a singleton SCC
    expect(cycleSCCs(files, sccs)).toEqual([]);
  });

  it('identifies a self-loop as a cycle', () => {
    const files = [
      mk(0, [0]),
      mk(1, []),
    ];
    const sccs = computeSCCs(files);
    const cycles = cycleSCCs(files, sccs);
    expect(cycles.length).toBe(1);
    expect(cycles[0]).toEqual([0]);
  });

  it('identifies a 2-cycle (A→B→A)', () => {
    const files = [
      mk(0, [1]),
      mk(1, [0]),
      mk(2, []),
    ];
    const sccs = computeSCCs(files);
    const cycles = cycleSCCs(files, sccs);
    expect(cycles.length).toBe(1);
    expect(asSet(cycles[0])).toEqual(new Set([0, 1]));
  });

  it('identifies a 3-cycle and a separate 2-cycle as two cycles', () => {
    const files = [
      // 3-cycle: 0→1→2→0
      mk(0, [1]),
      mk(1, [2]),
      mk(2, [0]),
      // disjoint 2-cycle: 3↔4
      mk(3, [4]),
      mk(4, [3]),
      // disjoint sink
      mk(5, []),
    ];
    const sccs = computeSCCs(files);
    const cycles = cycleSCCs(files, sccs);
    expect(cycles.length).toBe(2);

    const cycleSets = cycles.map(asSet);
    const has3 = cycleSets.some((s) => s.size === 3 && s.has(0) && s.has(1) && s.has(2));
    const has2 = cycleSets.some((s) => s.size === 2 && s.has(3) && s.has(4));
    expect(has3).toBe(true);
    expect(has2).toBe(true);
  });

  it('handles a node with both a self-loop and outbound edge', () => {
    const files = [
      mk(0, [0, 1]),
      mk(1, []),
    ];
    const sccs = computeSCCs(files);
    const cycles = cycleSCCs(files, sccs);
    // Node 0 forms a self-loop SCC of size 1
    expect(cycles.length).toBe(1);
    expect(cycles[0]).toEqual([0]);
  });

  it('every file appears in exactly one SCC', () => {
    const files = [
      mk(0, [1]),
      mk(1, [2]),
      mk(2, [0, 3]),
      mk(3, []),
      mk(4, [3]),
    ];
    const sccs = computeSCCs(files);
    const seen = new Set<number>();
    for (const c of sccs) for (const id of c) {
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(seen.size).toBe(files.length);
  });
});
