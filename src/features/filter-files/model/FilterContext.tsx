import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  Confidence, FileRecord, FilterState, Layer, PresetKey, Range, RepoData, SearchMode, SortKey, StatusKey,
} from '@entities/repo';
import { parseDsl, type RangeKey, type BoolKey } from '@entities/facet';

export type { RangeKey, BoolKey };

type Setter<T> = (v: T) => void;

type Derived = {
  matched: Uint8Array;
  matchedCount: number;
  rankByFileId: Int32Array;
  searchError: string | null;
};

type FilterApi = {
  repo: RepoData;
  state: FilterState;
  // identity
  toggleFolder: (path: string, exclusive?: boolean) => void;
  clearFolders: () => void;
  setSearch: Setter<string>;
  setSearchRegex: Setter<boolean>;
  setSearchMode: Setter<SearchMode>;
  searchError: string | null;
  toggleLanguage: (l: FileRecord['language']) => void;
  toggleLayer: (l: Layer) => void;
  toggleOwner: (o: string) => void;
  // status
  toggleStatus: (s: StatusKey) => void;
  toggleConfidence: (c: Confidence) => void;
  setUnknownOnly: Setter<boolean>;
  setIsTest: Setter<boolean | null>;
  setIsGenerated: Setter<boolean | null>;
  setIsDeprecated: Setter<boolean | null>;
  setPublicApiOnly: Setter<boolean>;
  // ranges / booleans
  setRange: (key: RangeKey, r: Range) => void;
  setBool: (key: BoolKey, v: boolean) => void;
  // ranking
  setSort: Setter<SortKey>;
  setTopN: Setter<number>;
  applyPreset: (p: PresetKey) => void;
  resetAll: () => void;
  // computed
  matched: Uint8Array;
  matchedCount: number;
  rankByFileId: Int32Array;
};

type FilterStore = FilterApi & {
  initRepo: (repo: RepoData) => void;
};

const RANGE_KEYS: RangeKey[] = [
  'complexity', 'cyclomatic', 'cognitive', 'maintainability', 'maxNesting',
  'fnCount', 'largestFnLoc', 'loc', 'fanIn', 'fanOut', 'churn',
  'daysSinceTouched', 'authors', 'recentPRs',
  'anyCount', 'tsIgnoreCount', 'unsafeAssertions',
  'lineCoverage', 'branchCoverage', 'mutationScore',
  'eslintErrors', 'eslintWarnings', 'todoCount', 'consoleCount',
  'sastFindings', 'bundleKB', 'jsdocCoverage',
  'editSafety', 'blastRadius',
];

const BOOL_KEYS: BoolKey[] = [
  'cyclicOnly', 'deadOnly', 'layerViolationOnly',
  'strictOptOutOnly', 'hasNoTest', 'secretsOnly', 'busFactor1Only',
];

function defaultState(repo: RepoData): FilterState {
  const ranges = repo.ranges;
  // Tolerate the EMPTY_REPO sentinel below (`ranges: {}`) — module evaluation
  // happens before initRepo() runs, so any real ranges are filled in by the
  // time the user can interact. Falling back to [0, 0] keeps the shape valid
  // without faking data.
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

function inSelectedFolder(file: FileRecord, selected: Set<string>): boolean {
  if (selected.size === 0) return true;
  const parts = file.folderParts;
  for (let i = parts.length; i > 0; i--) {
    if (selected.has(parts.slice(0, i).join('.'))) return true;
  }
  if (selected.has('')) return true;
  return false;
}
function rangeOk(v: number, r: Range): boolean { return v >= r[0] && v <= r[1]; }
function safeRegex(p: string): RegExp | null {
  try { return new RegExp(p, 'i'); } catch { return null; }
}

// confidence ranking — unknown first when sorted ascending
const CONF_RANK: Record<Confidence, number> = {
  unknown: 0,
  stale: 1,
  overapprox: 2,
  exact: 3,
};

function computeDerived(repo: RepoData, state: FilterState): Derived {
  const N = repo.files.length;
  const m = new Uint8Array(N);
  const ids: number[] = [];
  const search = state.search.trim();

  let regex: RegExp | null = null;
  let dslPredicate: ((f: FileRecord) => boolean) | null = null;
  let parseError: string | null = null;

  if (search.length > 0) {
    if (state.searchMode === 'regex') {
      regex = safeRegex(search);
      if (!regex) parseError = 'Invalid regex';
    } else if (state.searchMode === 'dsl') {
      const r = parseDsl(search);
      if (r.ok) dslPredicate = r.predicate;
      else parseError = r.error;
    }
  }
  const searchLower = state.searchMode === 'text' ? search.toLowerCase() : '';

  for (const f of repo.files) {
    const mm = f.metrics;

    if (!inSelectedFolder(f, state.selectedFolders)) continue;
    if (search) {
      if (state.searchMode === 'regex') {
        if (!regex) continue;
        if (!regex.test(`${f.name} ${f.folderPath}`)) continue;
      } else if (state.searchMode === 'dsl') {
        if (!dslPredicate) continue;
        if (!dslPredicate(f)) continue;
      } else {
        const hay = `${f.name} ${f.folderPath}`.toLowerCase();
        if (!hay.includes(searchLower)) continue;
      }
    }
    if (state.languages.size > 0 && !state.languages.has(f.language)) continue;
    if (state.layers.size > 0 && !state.layers.has(f.layer)) continue;
    if (state.owners.size > 0 && !state.owners.has(f.owner)) continue;

    if (state.statuses.size > 0 && !state.statuses.has(f.status)) continue;
    if (state.confidences.size > 0 && !state.confidences.has(mm.confidence)) continue;
    if (state.unknownOnly && mm.unknownReasons.length === 0) continue;
    if (state.isTest !== null && f.isTest !== state.isTest) continue;
    if (state.isGenerated !== null && f.isGenerated !== state.isGenerated) continue;
    if (state.isDeprecated !== null && f.isDeprecated !== state.isDeprecated) continue;
    if (state.publicApiOnly && !mm.publicApi) continue;

    if (state.cyclicOnly && !mm.cyclic) continue;
    if (state.deadOnly && !mm.dead) continue;
    if (state.layerViolationOnly && !mm.layerViolation) continue;
    if (state.strictOptOutOnly && !mm.strictOptOut) continue;
    if (state.hasNoTest && mm.hasTestFile) continue;
    if (state.secretsOnly && !mm.secretsLikely) continue;
    if (state.busFactor1Only && mm.authors !== 1) continue;

    if (!rangeOk(mm.complexity, state.complexity)) continue;
    if (!rangeOk(mm.cyclomatic, state.cyclomatic)) continue;
    if (!rangeOk(mm.cognitive, state.cognitive)) continue;
    if (!rangeOk(mm.maintainability, state.maintainability)) continue;
    if (!rangeOk(mm.maxNesting, state.maxNesting)) continue;
    if (!rangeOk(mm.fnCount, state.fnCount)) continue;
    if (!rangeOk(mm.largestFnLoc, state.largestFnLoc)) continue;
    if (!rangeOk(mm.loc, state.loc)) continue;
    if (!rangeOk(mm.fanIn, state.fanIn)) continue;
    if (!rangeOk(mm.fanOut, state.fanOut)) continue;
    if (!rangeOk(mm.churn, state.churn)) continue;
    if (!rangeOk(mm.daysSinceTouched, state.daysSinceTouched)) continue;
    if (!rangeOk(mm.authors, state.authors)) continue;
    if (!rangeOk(mm.recentPRs, state.recentPRs)) continue;
    if (!rangeOk(mm.anyCount, state.anyCount)) continue;
    if (!rangeOk(mm.tsIgnoreCount, state.tsIgnoreCount)) continue;
    if (!rangeOk(mm.unsafeAssertions, state.unsafeAssertions)) continue;
    if (!rangeOk(mm.lineCoverage, state.lineCoverage)) continue;
    if (!rangeOk(mm.branchCoverage, state.branchCoverage)) continue;
    if (!rangeOk(mm.mutationScore, state.mutationScore)) continue;
    if (!rangeOk(mm.eslintErrors, state.eslintErrors)) continue;
    if (!rangeOk(mm.eslintWarnings, state.eslintWarnings)) continue;
    if (!rangeOk(mm.todoCount, state.todoCount)) continue;
    if (!rangeOk(mm.consoleCount, state.consoleCount)) continue;
    if (!rangeOk(mm.sastFindings, state.sastFindings)) continue;
    if (!rangeOk(mm.bundleKB, state.bundleKB)) continue;
    if (!rangeOk(mm.jsdocCoverage, state.jsdocCoverage)) continue;
    if (!rangeOk(mm.editSafety, state.editSafety)) continue;
    if (!rangeOk(mm.blastRadius, state.blastRadius)) continue;

    m[f.id] = 1;
    ids.push(f.id);
  }

  const rk = new Int32Array(N).fill(-1);
  if (state.sort !== 'none' && ids.length > 0) {
    const cmp: Record<Exclude<SortKey, 'none'>, (a: number, b: number) => number> = {
      'loc-desc':           (a, b) => repo.files[b].metrics.loc - repo.files[a].metrics.loc,
      'complexity-desc':    (a, b) => repo.files[b].metrics.complexity - repo.files[a].metrics.complexity,
      'cognitive-desc':     (a, b) => repo.files[b].metrics.cognitive - repo.files[a].metrics.cognitive,
      'maintainability-asc':(a, b) => repo.files[a].metrics.maintainability - repo.files[b].metrics.maintainability,
      'fanIn-desc':         (a, b) => repo.files[b].metrics.fanIn - repo.files[a].metrics.fanIn,
      'fanOut-desc':        (a, b) => repo.files[b].metrics.fanOut - repo.files[a].metrics.fanOut,
      'churn-desc':         (a, b) => repo.files[b].metrics.churn - repo.files[a].metrics.churn,
      'pagerank-desc':      (a, b) => repo.files[b].metrics.pagerank - repo.files[a].metrics.pagerank,
      'coverage-asc':       (a, b) => repo.files[a].metrics.lineCoverage - repo.files[b].metrics.lineCoverage,
      'eslint-desc':        (a, b) => (repo.files[b].metrics.eslintErrors * 5 + repo.files[b].metrics.eslintWarnings) - (repo.files[a].metrics.eslintErrors * 5 + repo.files[a].metrics.eslintWarnings),
      'anyCount-desc':      (a, b) => repo.files[b].metrics.anyCount - repo.files[a].metrics.anyCount,
      'todo-desc':          (a, b) => repo.files[b].metrics.todoCount - repo.files[a].metrics.todoCount,
      'authors-desc':       (a, b) => repo.files[b].metrics.authors - repo.files[a].metrics.authors,
      'staleness-desc':     (a, b) => repo.files[b].metrics.daysSinceTouched - repo.files[a].metrics.daysSinceTouched,
      'safety-asc':         (a, b) => repo.files[a].metrics.editSafety - repo.files[b].metrics.editSafety,
      'safety-desc':        (a, b) => repo.files[b].metrics.editSafety - repo.files[a].metrics.editSafety,
      'blast-desc':         (a, b) => repo.files[b].metrics.blastRadius - repo.files[a].metrics.blastRadius,
      'confidence-asc':     (a, b) => CONF_RANK[repo.files[a].metrics.confidence] - CONF_RANK[repo.files[b].metrics.confidence],
    };
    ids.sort(cmp[state.sort]);
    ids.forEach((id, i) => { rk[id] = i; });
  }

  return { matched: m, matchedCount: ids.length, rankByFileId: rk, searchError: parseError };
}

// Sentinel repo so the store has a coherent shape before initRepo() runs.
// Every range/owners/folder field is filled with a safe default so that
// consumers can render without null-checks during the brief pre-init frame.
const ZERO_RANGE: [number, number] = [0, 0];
// We previously used a Proxy that returned ZERO_RANGE for any access, but
// it serialised as `{}` in the React devtools / console which made debugging
// pre-init renders confusing. An explicit object enumerates every key so
// the structure matches the real `RepoData['ranges']` shape verbatim. The
// `halstead` key is also seeded here (RANGE_KEYS doesn't include it because
// it has no facet UI, but the type requires it).
// Object.fromEntries widens the value type to `[number, number]` and the
// key type to `string`, so a single cast at the end is necessary to assert
// the exhaustive `RepoData['ranges']` shape. The `halstead` key is added
// explicitly because RANGE_KEYS only lists keys that have a facet UI.
const EMPTY_RANGES = {
  ...Object.fromEntries(RANGE_KEYS.map((k) => [k, ZERO_RANGE])),
  halstead: ZERO_RANGE,
} as RepoData['ranges'];
const EMPTY_ROOT_FOLDER = {
  path: '', parts: [], name: 'root', fileIds: [], childPaths: [], parentPath: null,
  xStart: 0, zStart: 0, width: 0, height: 0, depth: 0,
} satisfies RepoData['folders'][number];
const EMPTY_REPO: RepoData = {
  files: [],
  folders: [EMPTY_ROOT_FOLDER],
  foldersByPath: new Map([['', EMPTY_ROOT_FOLDER]]),
  ranges: EMPTY_RANGES,
  owners: [],
};

const EMPTY_STATE = defaultState(EMPTY_REPO);
const EMPTY_DERIVED = computeDerived(EMPTY_REPO, EMPTY_STATE);

export const useFilterStore = create<FilterStore>()(
  subscribeWithSelector((set, get) => {
    // Apply a state mutation, then recompute derived values from the new state.
    const updateState = (mutator: (s: FilterState) => FilterState): void => {
      const { repo, state } = get();
      const nextState = mutator(state);
      const derived = computeDerived(repo, nextState);
      set({ state: nextState, ...derived });
    };

    return {
      repo: EMPTY_REPO,
      state: EMPTY_STATE,
      ...EMPTY_DERIVED,

      initRepo: (repo) => {
        const state = defaultState(repo);
        const derived = computeDerived(repo, state);
        set({ repo, state, ...derived });
      },

      toggleFolder: (path, exclusive = false) => { updateState((s) => {
        const next = new Set(s.selectedFolders);
        if (exclusive) { next.clear(); next.add(path); }
        else if (next.has(path)) next.delete(path);
        else next.add(path);
        return { ...s, selectedFolders: next, preset: null };
      }); },
      clearFolders: () => { updateState((s) => ({ ...s, selectedFolders: new Set(), preset: null })); },
      setSearch: (q) => { updateState((s) => ({ ...s, search: q, preset: null })); },
      setSearchRegex: (b) => { updateState((s) => ({ ...s, searchRegex: b, searchMode: b ? 'regex' : 'text' })); },
      setSearchMode: (m) => { updateState((s) => ({ ...s, searchMode: m, searchRegex: m === 'regex' })); },
      toggleLanguage: (l) => { updateState((s) => {
        const next = new Set(s.languages);
        if (next.has(l)) next.delete(l); else next.add(l);
        return { ...s, languages: next, preset: null };
      }); },
      toggleLayer: (l) => { updateState((s) => {
        const next = new Set(s.layers);
        if (next.has(l)) next.delete(l); else next.add(l);
        return { ...s, layers: next, preset: null };
      }); },
      toggleOwner: (o) => { updateState((s) => {
        const next = new Set(s.owners);
        if (next.has(o)) next.delete(o); else next.add(o);
        return { ...s, owners: next, preset: null };
      }); },

      toggleStatus: (st) => { updateState((s) => {
        const next = new Set(s.statuses);
        if (next.has(st)) next.delete(st); else next.add(st);
        return { ...s, statuses: next, preset: null };
      }); },
      toggleConfidence: (c) => { updateState((s) => {
        const next = new Set(s.confidences);
        if (next.has(c)) next.delete(c); else next.add(c);
        return { ...s, confidences: next, preset: null };
      }); },
      setUnknownOnly: (v) => { updateState((s) => ({ ...s, unknownOnly: v, preset: null })); },
      setIsTest: (v) => { updateState((s) => ({ ...s, isTest: v, preset: null })); },
      setIsGenerated: (v) => { updateState((s) => ({ ...s, isGenerated: v, preset: null })); },
      setIsDeprecated: (v) => { updateState((s) => ({ ...s, isDeprecated: v, preset: null })); },
      setPublicApiOnly: (v) => { updateState((s) => ({ ...s, publicApiOnly: v, preset: null })); },

      setRange: (key, r) => { updateState((s) => ({ ...s, [key]: r, preset: null })); },
      setBool: (key, v) => { updateState((s) => ({ ...s, [key]: v, preset: null })); },

      setSort: (k) => { updateState((s) => ({
        ...s, sort: k, topNHighlight: k === 'none' ? 0 : Math.max(s.topNHighlight, 10),
      })); },
      setTopN: (n) => { updateState((s) => ({ ...s, topNHighlight: n })); },

      applyPreset: (p) => {
        const { repo } = get();
        const base = defaultState(repo);
        let nextState: FilterState;
        if (p === null) {
          nextState = base;
        } else {
          switch (p) {
            case 'hotspot':
              nextState = {
                ...base,
                churn: [Math.max(base.churn[0], 0.5), base.churn[1]],
                cyclomatic: [Math.max(base.cyclomatic[0], 25), base.cyclomatic[1]],
                sort: 'churn-desc', topNHighlight: 10, preset: 'hotspot',
              };
              break;
            case 'vulnerable-hub':
              nextState = {
                ...base,
                statuses: new Set<StatusKey>(['SECURITY_ALERT']),
                fanIn: [Math.max(base.fanIn[0], 5), base.fanIn[1]],
                sort: 'fanIn-desc', topNHighlight: 10, preset: 'vulnerable-hub',
              };
              break;
            case 'stale':
              nextState = {
                ...base,
                statuses: new Set<StatusKey>(['STABLE']),
                churn: [base.churn[0], Math.min(base.churn[1], 0.05)],
                daysSinceTouched: [180, base.daysSinceTouched[1]],
                sort: 'staleness-desc', preset: 'stale',
              };
              break;
            case 'long-files':
              nextState = {
                ...base,
                loc: [Math.max(base.loc[0], 500), base.loc[1]],
                sort: 'loc-desc', topNHighlight: 10, preset: 'long-files',
              };
              break;
          }
        }
        const derived = computeDerived(repo, nextState);
        set({ state: nextState, ...derived });
      },

      resetAll: () => {
        const { repo } = get();
        const state = defaultState(repo);
        const derived = computeDerived(repo, state);
        set({ state, ...derived });
      },
    };
  }),
);

// Public Provider — no Context, just an initialiser keyed on `repo`.
export function FilterProvider({ repo, children }: { repo: RepoData; children: ReactNode }) {
  useEffect(() => {
    useFilterStore.getState().initRepo(repo);
  }, [repo]);
  return <>{children}</>;
}

// Public hook — preserves the legacy `useFilter()` shape via a shallow-equality
// selector so consumers continue to destructure { repo, state, matched, ... }.
//
// @deprecated Prefer the narrow hooks below — `useFilterRepo`,
// `useFilterMatched`, `useFilterFacets`, `useFilterActions`. Subscribing
// to the entire API forces a re-render on every keystroke (setSearch),
// every range tweak, every preset change. The narrow hooks slice the
// store so a `setSearch` doesn't force a Stage re-mount or a FocusScan
// re-render that only reads `repo`.
export function useFilter(): FilterApi {
  return useFilterStore(
    useShallow((s) => ({
      repo: s.repo,
      state: s.state,
      toggleFolder: s.toggleFolder,
      clearFolders: s.clearFolders,
      setSearch: s.setSearch,
      setSearchRegex: s.setSearchRegex,
      setSearchMode: s.setSearchMode,
      searchError: s.searchError,
      toggleLanguage: s.toggleLanguage,
      toggleLayer: s.toggleLayer,
      toggleOwner: s.toggleOwner,
      toggleStatus: s.toggleStatus,
      toggleConfidence: s.toggleConfidence,
      setUnknownOnly: s.setUnknownOnly,
      setIsTest: s.setIsTest,
      setIsGenerated: s.setIsGenerated,
      setIsDeprecated: s.setIsDeprecated,
      setPublicApiOnly: s.setPublicApiOnly,
      setRange: s.setRange,
      setBool: s.setBool,
      setSort: s.setSort,
      setTopN: s.setTopN,
      applyPreset: s.applyPreset,
      resetAll: s.resetAll,
      matched: s.matched,
      matchedCount: s.matchedCount,
      rankByFileId: s.rankByFileId,
    })),
  );
}

// ─── Narrow selectors ─────────────────────────────────────────────────
// Prefer these in new code. Each subscribes to a small, semantically
// related slice of the store so `setSearch` doesn't ripple into every
// consumer that only needs `repo`.

/** Read the repo data only. Stable across filter/search interactions. */
export function useFilterRepo(): RepoData {
  return useFilterStore((s) => s.repo);
}

/** Read the derived match state (matched mask, count, ranks). */
export function useFilterMatched(): {
  matched: Uint8Array;
  matchedCount: number;
  rankByFileId: Int32Array;
} {
  return useFilterStore(
    useShallow((s) => ({
      matched: s.matched,
      matchedCount: s.matchedCount,
      rankByFileId: s.rankByFileId,
    })),
  );
}

/** Read facet inputs (search query, mode, error) — the typing-hot slice. */
export function useFilterFacets(): {
  state: FilterState;
  searchError: string | null;
} {
  return useFilterStore(
    useShallow((s) => ({
      state: s.state,
      searchError: s.searchError,
    })),
  );
}

// Action setters in zustand are reference-stable across renders, so a
// component that only needs setters never re-renders due to data churn.
type FilterActions = Omit<
  FilterApi,
  'repo' | 'state' | 'matched' | 'matchedCount' | 'rankByFileId' | 'searchError'
>;

/** Read every action setter. Stable identity, never causes re-renders. */
export function useFilterActions(): FilterActions {
  return useFilterStore(
    useShallow((s) => ({
      toggleFolder: s.toggleFolder,
      clearFolders: s.clearFolders,
      setSearch: s.setSearch,
      setSearchRegex: s.setSearchRegex,
      setSearchMode: s.setSearchMode,
      toggleLanguage: s.toggleLanguage,
      toggleLayer: s.toggleLayer,
      toggleOwner: s.toggleOwner,
      toggleStatus: s.toggleStatus,
      toggleConfidence: s.toggleConfidence,
      setUnknownOnly: s.setUnknownOnly,
      setIsTest: s.setIsTest,
      setIsGenerated: s.setIsGenerated,
      setIsDeprecated: s.setIsDeprecated,
      setPublicApiOnly: s.setPublicApiOnly,
      setRange: s.setRange,
      setBool: s.setBool,
      setSort: s.setSort,
      setTopN: s.setTopN,
      applyPreset: s.applyPreset,
      resetAll: s.resetAll,
    })),
  );
}

export const ALL_RANGE_KEYS = RANGE_KEYS;
export const ALL_BOOL_KEYS = BOOL_KEYS;
