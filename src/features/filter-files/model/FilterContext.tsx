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
// Kept exported for external range-check callers; intentionally retained
// even when no current call sites exist.
export function rangeOk(v: number, r: Range): boolean { return v >= r[0] && v <= r[1]; }
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

// ─── Per-predicate mask cache ─────────────────────────────────────────
// Each filter dimension (search, folders, each range, each bool, etc.)
// is computed into a Uint8Array mask of length N and cached against its
// narrow input deps. When only one dep changes — e.g. dragging the
// `complexity` range slider — only that one mask is rebuilt; the other
// ~40 stay hot. The final `matched` mask is the bitwise AND across
// non-trivial masks. Rebound on initRepo() because `repo` is a new
// reference and N changes.
type MaskSlot = { deps: readonly unknown[]; mask: Uint8Array };
type MaskCache = {
  repo: RepoData;
  N: number;
  slots: Map<string, MaskSlot>;
};

function makeMaskCache(repo: RepoData): MaskCache {
  return { repo, N: repo.files.length, slots: new Map() };
}

function depsEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Get-or-compute a mask slot. Returns null when the predicate is a no-op
// (e.g. empty Set, default range) so the intersection step can skip it.
function getMask(
  cache: MaskCache,
  key: string,
  deps: readonly unknown[],
  build: (() => Uint8Array) | null,
): Uint8Array | null {
  if (build === null) {
    cache.slots.delete(key);
    return null;
  }
  const slot = cache.slots.get(key);
  if (slot && depsEqual(slot.deps, deps)) return slot.mask;
  const mask = build();
  cache.slots.set(key, { deps, mask });
  return mask;
}

function computeMatched(cache: MaskCache, state: FilterState): { mask: Uint8Array; searchError: string | null } {
  const { repo, N } = cache;
  const files = repo.files;

  // ─── Predicate masks ────────────────────────────────────────────────
  // Folder mask
  const folderMask = state.selectedFolders.size === 0
    ? null
    : getMask(cache, 'folders', [state.selectedFolders], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (inSelectedFolder(f, state.selectedFolders)) m[f.id] = 1;
      return m;
    });

  // Search mask (text / regex / dsl)
  const searchTrim = state.search.trim();
  let searchError: string | null = null;
  const searchMask = searchTrim.length === 0
    ? null
    : getMask(cache, 'search', [searchTrim, state.searchMode], () => {
      const m = new Uint8Array(N);
      if (state.searchMode === 'regex') {
        const rx = safeRegex(searchTrim);
        if (!rx) { searchError = 'Invalid regex'; return m; }
        for (const f of files) if (rx.test(`${f.name} ${f.folderPath}`)) m[f.id] = 1;
      } else if (state.searchMode === 'dsl') {
        const r = parseDsl(searchTrim);
        if (!r.ok) { searchError = r.error; return m; }
        const pred = r.predicate;
        for (const f of files) if (pred(f)) m[f.id] = 1;
      } else {
        const needle = searchTrim.toLowerCase();
        for (const f of files) {
          if (`${f.name} ${f.folderPath}`.toLowerCase().includes(needle)) m[f.id] = 1;
        }
      }
      return m;
    });
  // If the cached mask was reused, we lost the chance to set searchError
  // inside the closure — re-derive it cheaply from the inputs:
  if (searchTrim.length > 0 && searchError === null) {
    if (state.searchMode === 'regex' && !safeRegex(searchTrim)) searchError = 'Invalid regex';
    else if (state.searchMode === 'dsl') {
      const r = parseDsl(searchTrim);
      if (!r.ok) searchError = r.error;
    }
  }

  const langMask = state.languages.size === 0
    ? null
    : getMask(cache, 'languages', [state.languages], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (state.languages.has(f.language)) m[f.id] = 1;
      return m;
    });

  const layerMask = state.layers.size === 0
    ? null
    : getMask(cache, 'layers', [state.layers], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (state.layers.has(f.layer)) m[f.id] = 1;
      return m;
    });

  const ownerMask = state.owners.size === 0
    ? null
    : getMask(cache, 'owners', [state.owners], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (state.owners.has(f.owner)) m[f.id] = 1;
      return m;
    });

  const statusMask = state.statuses.size === 0
    ? null
    : getMask(cache, 'statuses', [state.statuses], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (state.statuses.has(f.status)) m[f.id] = 1;
      return m;
    });

  const confMask = state.confidences.size === 0
    ? null
    : getMask(cache, 'confidences', [state.confidences], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (state.confidences.has(f.metrics.confidence)) m[f.id] = 1;
      return m;
    });

  const unknownMask = !state.unknownOnly
    ? null
    : getMask(cache, 'unknownOnly', [true], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.metrics.unknownReasons.length > 0) m[f.id] = 1;
      return m;
    });

  const isTestMask = state.isTest === null
    ? null
    : getMask(cache, 'isTest', [state.isTest], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.isTest === state.isTest) m[f.id] = 1;
      return m;
    });

  const isGenMask = state.isGenerated === null
    ? null
    : getMask(cache, 'isGenerated', [state.isGenerated], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.isGenerated === state.isGenerated) m[f.id] = 1;
      return m;
    });

  const isDepMask = state.isDeprecated === null
    ? null
    : getMask(cache, 'isDeprecated', [state.isDeprecated], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.isDeprecated === state.isDeprecated) m[f.id] = 1;
      return m;
    });

  const publicApiMask = !state.publicApiOnly
    ? null
    : getMask(cache, 'publicApiOnly', [true], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.metrics.publicApi) m[f.id] = 1;
      return m;
    });

  // Boolean predicates — each gets its own slot so a single toggle
  // doesn't invalidate the others.
  const boolMasks: (Uint8Array | null)[] = [
    !state.cyclicOnly ? null : getMask(cache, 'cyclicOnly', [true], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.metrics.cyclic) m[f.id] = 1;
      return m;
    }),
    !state.deadOnly ? null : getMask(cache, 'deadOnly', [true], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.metrics.dead) m[f.id] = 1;
      return m;
    }),
    !state.layerViolationOnly ? null : getMask(cache, 'layerViolationOnly', [true], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.metrics.layerViolation) m[f.id] = 1;
      return m;
    }),
    !state.strictOptOutOnly ? null : getMask(cache, 'strictOptOutOnly', [true], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.metrics.strictOptOut) m[f.id] = 1;
      return m;
    }),
    !state.hasNoTest ? null : getMask(cache, 'hasNoTest', [true], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (!f.metrics.hasTestFile) m[f.id] = 1;
      return m;
    }),
    !state.secretsOnly ? null : getMask(cache, 'secretsOnly', [true], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.metrics.secretsLikely) m[f.id] = 1;
      return m;
    }),
    !state.busFactor1Only ? null : getMask(cache, 'busFactor1Only', [true], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (f.metrics.authors === 1) m[f.id] = 1;
      return m;
    }),
  ];

  // Range masks — one per metric. A range is a no-op if it's identical
  // (by reference) to repo.ranges[key], which is the default tuple set
  // by defaultState(). After setRange() it's a fresh tuple, so the
  // reference check is safe.
  const repoRanges = repo.ranges;
  const rangeMasks: (Uint8Array | null)[] = RANGE_KEYS.map((key) => {
    const r = state[key];
    const def = repoRanges[key];
    if (r[0] === def?.[0] && r[1] === def[1]) return null;
    return getMask(cache, `range:${key}`, [r[0], r[1]], () => {
      const m = new Uint8Array(N);
      for (const f of files) {
        const v = (f.metrics as unknown as Record<string, number>)[key];
        if (v >= r[0] && v <= r[1]) m[f.id] = 1;
      }
      return m;
    });
  });

  // ─── Intersection ───────────────────────────────────────────────────
  const masks: Uint8Array[] = [];
  if (folderMask) masks.push(folderMask);
  if (searchMask) masks.push(searchMask);
  if (langMask) masks.push(langMask);
  if (layerMask) masks.push(layerMask);
  if (ownerMask) masks.push(ownerMask);
  if (statusMask) masks.push(statusMask);
  if (confMask) masks.push(confMask);
  if (unknownMask) masks.push(unknownMask);
  if (isTestMask) masks.push(isTestMask);
  if (isGenMask) masks.push(isGenMask);
  if (isDepMask) masks.push(isDepMask);
  if (publicApiMask) masks.push(publicApiMask);
  for (const b of boolMasks) if (b) masks.push(b);
  for (const r of rangeMasks) if (r) masks.push(r);

  const out = new Uint8Array(N);
  if (masks.length === 0) {
    out.fill(1);
  } else {
    const first = masks[0];
    out.set(first);
    for (let mi = 1; mi < masks.length; mi++) {
      const m = masks[mi];
      for (let i = 0; i < N; i++) out[i] &= m[i];
    }
  }

  return { mask: out, searchError };
}

function computeDerived(cache: MaskCache, state: FilterState): Derived {
  const { repo, N } = cache;
  const { mask: m, searchError: parseError } = computeMatched(cache, state);

  const ids: number[] = [];
  for (let i = 0; i < N; i++) if (m[i]) ids.push(i);

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
const EMPTY_CACHE = makeMaskCache(EMPTY_REPO);
const EMPTY_DERIVED = computeDerived(EMPTY_CACHE, EMPTY_STATE);

export const useFilterStore = create<FilterStore>()(
  subscribeWithSelector((set, get) => {
    // Per-store mask cache. Rebound on initRepo() because masks are
    // length-N typed arrays tied to the current repo.
    let maskCache: MaskCache = EMPTY_CACHE;

    // Apply a state mutation, then recompute derived values from the new state.
    const updateState = (mutator: (s: FilterState) => FilterState): void => {
      const { state } = get();
      const nextState = mutator(state);
      const derived = computeDerived(maskCache, nextState);
      set({ state: nextState, ...derived });
    };

    return {
      repo: EMPTY_REPO,
      state: EMPTY_STATE,
      ...EMPTY_DERIVED,

      initRepo: (repo) => {
        maskCache = makeMaskCache(repo);
        const state = defaultState(repo);
        const derived = computeDerived(maskCache, state);
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
        const derived = computeDerived(maskCache, nextState);
        set({ state: nextState, ...derived });
      },

      resetAll: () => {
        const { repo } = get();
        const state = defaultState(repo);
        const derived = computeDerived(maskCache, state);
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
