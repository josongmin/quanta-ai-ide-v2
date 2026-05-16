import type {
  Confidence, FileRecord, FilterState, Range, RepoData,
} from '@entities/repo';
import type { RangeKey } from '@entities/facet';

export const RANGE_KEYS: RangeKey[] = [
  'complexity', 'cyclomatic', 'cognitive', 'maintainability', 'maxNesting',
  'fnCount', 'largestFnLoc', 'loc', 'fanIn', 'fanOut', 'churn',
  'daysSinceTouched', 'authors', 'recentPRs',
  'anyCount', 'tsIgnoreCount', 'unsafeAssertions',
  'lineCoverage', 'branchCoverage', 'mutationScore',
  'eslintErrors', 'eslintWarnings', 'todoCount', 'consoleCount',
  'sastFindings', 'bundleKB', 'jsdocCoverage',
  'editSafety', 'blastRadius',
];

export function defaultState(repo: RepoData): FilterState {
  const ranges = repo.ranges;
  const dup = (r: Range | undefined): Range => (r ? [r[0], r[1]] : [0, 0]);
  return {
    selectedFolders: new Set(),
    search: '',
    searchRegex: false,
    searchMode: 'text',
    languages: new Set(),
    layers: new Set(),
    owners: new Set(),

    statuses: new Set(),
    isTest: null,
    isGenerated: null,
    isDeprecated: null,
    publicApiOnly: false,

    complexity: dup(ranges.complexity),
    cyclomatic: dup(ranges.cyclomatic),
    cognitive: dup(ranges.cognitive),
    maintainability: dup(ranges.maintainability),
    maxNesting: dup(ranges.maxNesting),
    fnCount: dup(ranges.fnCount),
    largestFnLoc: dup(ranges.largestFnLoc),
    loc: dup(ranges.loc),
    fanIn: dup(ranges.fanIn),
    fanOut: dup(ranges.fanOut),
    churn: dup(ranges.churn),
    daysSinceTouched: dup(ranges.daysSinceTouched),
    authors: dup(ranges.authors),
    recentPRs: dup(ranges.recentPRs),
    anyCount: dup(ranges.anyCount),
    tsIgnoreCount: dup(ranges.tsIgnoreCount),
    unsafeAssertions: dup(ranges.unsafeAssertions),
    lineCoverage: dup(ranges.lineCoverage),
    branchCoverage: dup(ranges.branchCoverage),
    mutationScore: dup(ranges.mutationScore),
    eslintErrors: dup(ranges.eslintErrors),
    eslintWarnings: dup(ranges.eslintWarnings),
    todoCount: dup(ranges.todoCount),
    consoleCount: dup(ranges.consoleCount),
    sastFindings: dup(ranges.sastFindings),
    bundleKB: dup(ranges.bundleKB),
    jsdocCoverage: dup(ranges.jsdocCoverage),
    editSafety: dup(ranges.editSafety),
    blastRadius: dup(ranges.blastRadius),

    confidences: new Set(),
    unknownOnly: false,

    cyclicOnly: false,
    deadOnly: false,
    layerViolationOnly: false,
    strictOptOutOnly: false,
    hasNoTest: false,
    secretsOnly: false,
    busFactor1Only: false,

    sort: 'none',
    topNHighlight: 0,
    preset: null,
  };
}

export function inSelectedFolder(file: FileRecord, selected: Set<string>): boolean {
  if (selected.size === 0) return true;
  const parts = file.folderParts;
  for (let i = parts.length; i > 0; i--) {
    if (selected.has(parts.slice(0, i).join('.'))) return true;
  }
  if (selected.has('')) return true;
  return false;
}

export function rangeOk(v: number, r: Range): boolean {
  return v >= r[0] && v <= r[1];
}

export const CONF_RANK: Record<Confidence, number> = {
  unknown: 0,
  stale: 1,
  overapprox: 2,
  exact: 3,
};

const ZERO_RANGE: [number, number] = [0, 0];

const EMPTY_RANGES = {
  ...Object.fromEntries(RANGE_KEYS.map((k) => [k, ZERO_RANGE])),
  halstead: ZERO_RANGE,
} as RepoData['ranges'];

const EMPTY_ROOT_FOLDER = {
  path: '', parts: [], name: 'root', fileIds: [], childPaths: [], parentPath: null,
  xStart: 0, zStart: 0, width: 0, height: 0, depth: 0,
} satisfies RepoData['folders'][number];

export const EMPTY_REPO: RepoData = {
  files: [],
  folders: [EMPTY_ROOT_FOLDER],
  foldersByPath: new Map([['', EMPTY_ROOT_FOLDER]]),
  ranges: EMPTY_RANGES,
  owners: [],
};
