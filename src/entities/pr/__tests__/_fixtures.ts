// Test fixture builders for the entities/pr module. These keep individual
// tests readable: each spec patches a tiny subset of fields on top of these
// defaults instead of restating the whole shape.

import type { FileRecord, RepoData } from '@entities/repo';
import type {
  CheckRun, FileDiff, LineThread, PullRequest,
} from '../model';

let _idSeq = 1000;
const nextId = () => ++_idSeq;

export function makeFile(over: Partial<FileDiff> = {}): FileDiff {
  return {
    path: over.path ?? `src/sample/file-${nextId()}.ts`,
    oldPath: null,
    kind: 'modified',
    added: 10,
    removed: 5,
    viewed: false,
    fileId: null,
    hunks: [],
    ...over,
  };
}

/** Build a synthetic FileRecord with sensible defaults that can be overridden. */
export function makeFileRecord(id: number, over: Partial<FileRecord['metrics']> = {}, base: Partial<FileRecord> = {}): FileRecord {
  const baseMetrics: FileRecord['metrics'] = {
    complexity: 5,
    cyclomatic: 5,
    cognitive: 5,
    halstead: 100,
    maintainability: 70,
    maxNesting: 2,
    fnCount: 4,
    largestFnLoc: 30,
    loc: 100,
    fanIn: 0,
    fanOut: 0,
    pagerank: 0.01,
    churn: 0.1,
    daysSinceTouched: 10,
    authors: 1,
    recentPRs: 1,
    anyCount: 0,
    tsIgnoreCount: 0,
    strictOptOut: false,
    unsafeAssertions: 0,
    lineCoverage: 80,
    branchCoverage: 75,
    mutationScore: 50,
    hasTestFile: true,
    eslintErrors: 0,
    eslintWarnings: 0,
    todoCount: 0,
    consoleCount: 0,
    secretsLikely: false,
    sastFindings: 0,
    bundleKB: 10,
    cyclic: false,
    dead: false,
    layerViolation: false,
    publicApi: false,
    jsdocCoverage: 50,
    confidence: 'exact',
    indexState: 'fresh',
    unknownReasons: [],
    editSafety: 80,
    blastRadius: 1,
    security: false,
    ...over,
  };
  return {
    id,
    name: base.name ?? `file-${id}.ts`,
    folderPath: base.folderPath ?? 'src.sample',
    folderParts: base.folderParts ?? ['src', 'sample'],
    ix: base.ix ?? 0,
    iz: base.iz ?? 0,
    status: base.status ?? 'STABLE',
    language: base.language ?? 'ts',
    layer: base.layer ?? 'service',
    owner: base.owner ?? '@team-core',
    isTest: base.isTest ?? false,
    isGenerated: base.isGenerated ?? false,
    isDeprecated: base.isDeprecated ?? false,
    metrics: baseMetrics,
    deps: base.deps ?? [],
    boundaries: base.boundaries,
  };
}

/** Lightweight RepoData — only what entities/pr actually reads. */
export function makeRepo(files: FileRecord[]): RepoData {
  return {
    files,
    folders: [],
    foldersByPath: new Map(),
    owners: [],
    // ranges is unused by entities/pr functions; cast through unknown for the test surface.
  } as unknown as RepoData;
}

export function makePr(over: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 1,
    title: 'sample pr',
    description: '',
    status: 'open',
    author: 'songmin',
    reviewers: [],
    baseBranch: 'main',
    headBranch: 'feat/sample',
    repo: 'acme',
    labels: [],
    linkedIssues: [],
    createdAt: '2026-05-06T00:00:00Z',
    updatedAt: '2026-05-06T01:00:00Z',
    added: 0,
    removed: 0,
    filesChangedCount: 0,
    files: [],
    checks: [],
    conversation: [],
    threads: [],
    ahead: 0,
    behind: 0,
    hasConflicts: false,
    ...over,
  };
}

export function makeCheck(over: Partial<CheckRun>): CheckRun {
  return {
    id: over.id ?? `c-${Math.random().toString(36).slice(2, 7)}`,
    name: over.name ?? 'build',
    status: over.status ?? 'success',
    required: over.required ?? true,
    durationMs: over.durationMs ?? 1000,
    summary: over.summary ?? null,
  };
}

export function makeThread(over: Partial<LineThread>): LineThread {
  return {
    id: over.id ?? 't-1',
    filePath: over.filePath ?? 'src/sample/file.ts',
    line: over.line ?? 1,
    resolved: over.resolved ?? false,
    comments: over.comments ?? [],
  };
}

