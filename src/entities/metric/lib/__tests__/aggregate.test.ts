import { describe, it, expect } from 'vitest';
import { computeRepoStats, computeFolderStats } from '../aggregate';
import { buildRepo } from '@entities/repo';
import type { FileRecord, FolderRecord, RepoData } from '@entities/repo';

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

function mkFolder(path: string, fileIds: number[]): FolderRecord {
  return {
    path, parts: path.split('.'), name: path.split('.').pop() ?? path,
    fileIds, childPaths: [], parentPath: null,
    xStart: 0, zStart: 0, width: 10, height: 10, depth: 0,
  };
}

function emptyRanges(): RepoData['ranges'] {
  const z: [number, number] = [0, 0];
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

function mkRepo(files: FileRecord[], folders: FolderRecord[] = []): RepoData {
  const foldersByPath = new Map(folders.map((f) => [f.path, f]));
  const owners = Array.from(new Set(files.map((f) => f.owner))).sort();
  return { files, folders, foldersByPath, ranges: emptyRanges(), owners };
}

describe('computeRepoStats', () => {
  it('handles empty repo with safe defaults (no NaN, no division by zero)', () => {
    const repo = mkRepo([]);
    const stats = computeRepoStats(repo);

    expect(stats.files).toBe(0);
    expect(Number.isFinite(stats.avgComplexity)).toBe(true);
    expect(Number.isFinite(stats.avgCoverage)).toBe(true);
    expect(Number.isFinite(stats.avgEditSafety)).toBe(true);
    expect(Number.isFinite(stats.maintainability)).toBe(true);
    expect(Number.isFinite(stats.avgFanOut)).toBe(true);
    expect(Number.isFinite(stats.avgChurn)).toBe(true);
    expect(stats.vulnerable).toBe(0);
    expect(stats.cyclic).toBe(0);
    expect(stats.minDaysSince).toBe(0);
  });

  it('counts vulnerable files and verdict tone is critical', () => {
    const repo = mkRepo([
      mkFile({ id: 0, status: 'SECURITY_ALERT' }),
      mkFile({ id: 1 }),
    ]);
    const stats = computeRepoStats(repo);
    expect(stats.vulnerable).toBe(1);
    // Verdict is now presentation-agnostic: tone + key + params (no English).
    expect(stats.verdict.tone).toBe('critical');
    expect(stats.verdict.key).toBe('criticalBlock');
    expect(stats.verdict.params?.vulnerable).toBe(1);
  });

  it('emits noData verdict for empty repo', () => {
    const repo = mkRepo([]);
    const stats = computeRepoStats(repo);
    expect(stats.verdict.key).toBe('noData');
    expect(stats.verdict.tone).toBe('info');
  });

  it('emits shipReady verdict for clean repo', () => {
    const repo = mkRepo([
      mkFile({ id: 0 }),
      mkFile({ id: 1 }),
    ]);
    const stats = computeRepoStats(repo);
    expect(stats.verdict.tone).toBe('ok');
    expect(stats.verdict.key).toBe('shipReady');
  });

  it("emits 'highHumanReview' verdict when humanOnly% > 25%", () => {
    // 2/4 = 50% have editSafety < 40 → triggers highHumanReview
    const lowSafety = (id: number) =>
      mkFile({
        id,
        metrics: { ...mkFile({ id }).metrics, editSafety: 20 },
      });
    const repo = mkRepo([
      lowSafety(0),
      lowSafety(1),
      mkFile({ id: 2 }),
      mkFile({ id: 3 }),
    ]);
    const stats = computeRepoStats(repo);
    expect(stats.verdict.tone).toBe('warn');
    expect(stats.verdict.key).toBe('highHumanReview');
    expect(stats.verdict.params?.humanOnly).toBe(2);
    expect(stats.verdict.params?.humanOnlyPct).toBeGreaterThan(25);
  });

  it("emits 'verificationGap' verdict when untested% > 40%", () => {
    // 3/5 = 60% lack tests → verificationGap, but humanOnly stays low
    const noTest = (id: number) =>
      mkFile({
        id,
        metrics: { ...mkFile({ id }).metrics, hasTestFile: false },
      });
    const repo = mkRepo([
      noTest(0),
      noTest(1),
      noTest(2),
      mkFile({ id: 3 }),
      mkFile({ id: 4 }),
    ]);
    const stats = computeRepoStats(repo);
    expect(stats.verdict.tone).toBe('warn');
    expect(stats.verdict.key).toBe('verificationGap');
    expect(stats.verdict.params?.untested).toBe(3);
  });

  it("emits 'staleIndex' verdict when staleIndex% > 5%", () => {
    // 1/10 = 10% stale → staleIndex; nothing else trips
    const staleOne = mkFile({
      id: 0,
      metrics: { ...mkFile({ id: 0 }).metrics, indexState: 'stale' },
    });
    const rest = Array.from({ length: 9 }, (_, i) => mkFile({ id: i + 1 }));
    const repo = mkRepo([staleOne, ...rest]);
    const stats = computeRepoStats(repo);
    expect(stats.verdict.key).toBe('staleIndex');
    expect(stats.verdict.tone).toBe('info');
    expect(stats.verdict.params?.staleIndex).toBe(1);
  });

  it("verdict precedence: criticalBlock wins over warn signals", () => {
    // Repo has both vulnerability and high humanOnly%; critical takes precedence.
    const repo = mkRepo([
      mkFile({
        id: 0,
        status: 'SECURITY_ALERT',
        metrics: { ...mkFile({ id: 0 }).metrics, editSafety: 10 },
      }),
      mkFile({ id: 1, metrics: { ...mkFile({ id: 1 }).metrics, editSafety: 10 } }),
      mkFile({ id: 2, metrics: { ...mkFile({ id: 2 }).metrics, editSafety: 10 } }),
    ]);
    const stats = computeRepoStats(repo);
    expect(stats.verdict.key).toBe('criticalBlock');
  });

  it('counts cyclic files', () => {
    const repo = mkRepo([
      mkFile({ id: 0, metrics: { ...mkFile({ id: 0 }).metrics, cyclic: true } }),
      mkFile({ id: 1 }),
    ]);
    const stats = computeRepoStats(repo);
    expect(stats.cyclic).toBe(1);
  });

  it('riskFiles are sorted ascending by safety', () => {
    const repo = mkRepo([
      mkFile({ id: 0, metrics: { ...mkFile({ id: 0 }).metrics, editSafety: 90 } }),
      mkFile({ id: 1, metrics: { ...mkFile({ id: 1 }).metrics, editSafety: 30 } }),
      mkFile({ id: 2, metrics: { ...mkFile({ id: 2 }).metrics, editSafety: 50 } }),
      mkFile({ id: 3, metrics: { ...mkFile({ id: 3 }).metrics, editSafety: 10 } }),
    ]);
    const stats = computeRepoStats(repo);
    const safeties = stats.riskFiles.map((f) => f.safety);
    const sorted = [...safeties].sort((a, b) => a - b);
    expect(safeties).toEqual(sorted);
    expect(safeties[0]).toBe(10);
  });

  it('churnHotspots are sorted by churn × complexity desc', () => {
    const make = (id: number, churn: number, complexity: number) =>
      mkFile({ id, metrics: { ...mkFile({ id }).metrics, churn, complexity } });
    const repo = mkRepo([
      make(0, 0.1, 10),  // 1
      make(1, 0.5, 40),  // 20
      make(2, 0.3, 30),  // 9
      make(3, 0.9, 50),  // 45
    ]);
    const stats = computeRepoStats(repo);
    const products = stats.churnHotspots.map((f) => f.churn * f.complexity);
    for (let i = 1; i < products.length; i++) {
      expect(products[i - 1]).toBeGreaterThanOrEqual(products[i]);
    }
    expect(stats.churnHotspots[0].id).toBe(3);
  });

  it('works on a buildRepo() result without throwing', () => {
    const repo = buildRepo(123);
    const stats = computeRepoStats(repo);
    expect(stats.files).toBe(repo.files.length);
    expect(stats.folders).toBe(repo.folders.length);
    expect(Number.isFinite(stats.avgEditSafety)).toBe(true);
  });
});

describe('computeFolderStats', () => {
  it('scopes to files inside the folder path', () => {
    const folder = mkFolder('src.core', [0, 1]);
    const outsideFolder = mkFolder('src.ui', [2]);
    const repo = mkRepo(
      [
        mkFile({ id: 0, folderPath: 'src.core', folderParts: ['src', 'core'] }),
        mkFile({ id: 1, folderPath: 'src.core', folderParts: ['src', 'core'], status: 'SECURITY_ALERT' }),
        mkFile({ id: 2, folderPath: 'src.ui', folderParts: ['src', 'ui'] }),
      ],
      [folder, outsideFolder],
    );
    const stats = computeFolderStats(repo, folder);
    expect(stats.totalFiles).toBe(2);
    expect(stats.vulnerable).toBe(1);
  });

  it('handles folder with zero scoped files without NaN', () => {
    const folder = mkFolder('src.empty', []);
    const repo = mkRepo([], [folder]);
    const stats = computeFolderStats(repo, folder);
    expect(stats.totalFiles).toBe(0);
    expect(Number.isFinite(stats.avgComplexity)).toBe(true);
    expect(Number.isFinite(stats.avgEditSafety)).toBe(true);
    expect(stats.minDaysSince).toBe(0);
  });
});
