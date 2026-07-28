import {
  RANGE_KEYS,
  type Confidence, type FileRecord, type FilterState, type Range, type RangeKey, type RepoData,
} from '@entities/repo';

// Re-exported for back-compat: callers historically imported RANGE_KEYS from
// filter-state. The SoT is now the RANGE_KEYS tuple in @entities/repo.
export { RANGE_KEYS };

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

    // One entry per filterable metric, derived from the RANGE_KEYS SoT.
    ...(Object.fromEntries(RANGE_KEYS.map((k) => [k, dup(ranges[k])])) as Record<RangeKey, Range>),

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
