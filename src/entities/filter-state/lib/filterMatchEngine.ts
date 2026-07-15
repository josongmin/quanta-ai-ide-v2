import type {
  FilterState, RepoData, SortKey,
} from '@entities/repo';
import { parseDsl } from '@entities/facet';
import {
  CONF_RANK,
  inSelectedFolder,
  RANGE_KEYS,
} from '../model/filterState';

export type Derived = {
  matched: Uint8Array;
  matchedCount: number;
  rankByFileId: Int32Array;
  searchError: string | null;
};

type MaskSlot = { deps: readonly unknown[]; mask: Uint8Array };
export type MaskCache = {
  repo: RepoData;
  N: number;
  slots: Map<string, MaskSlot>;
};

export function makeMaskCache(repo: RepoData): MaskCache {
  return { repo, N: repo.files.length, slots: new Map() };
}

function depsEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// A user-supplied regex is compiled and run against every file on every
// keystroke, so an evil pattern is a self-DoS (ReDoS / catastrophic
// backtracking). `safeRegex` used to catch only *syntax*. Now we also reject
// over-long patterns and the classic exponential shape — a group containing an
// unbounded quantifier that is itself quantified: (a+)+, (a*)*, (\d+){2,}.
const MAX_REGEX_LEN = 200;
const REDOS_SHAPE = /\([^()]*[+*][^()]*\)\s*[+*{]/;

/** Returns an error string if the pattern is unusable/unsafe, else null. */
function regexError(p: string): string | null {
  if (p.length > MAX_REGEX_LEN) return 'Pattern too long';
  if (REDOS_SHAPE.test(p)) return 'Pattern too complex';
  try { new RegExp(p, 'i'); return null; } catch { return 'Invalid regex'; }
}

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

  const folderMask = state.selectedFolders.size === 0
    ? null
    : getMask(cache, 'folders', [state.selectedFolders], () => {
      const m = new Uint8Array(N);
      for (const f of files) if (inSelectedFolder(f, state.selectedFolders)) m[f.id] = 1;
      return m;
    });

  const searchTrim = state.search.trim();
  let searchError: string | null = null;
  const searchMask = searchTrim.length === 0
    ? null
    : getMask(cache, 'search', [searchTrim, state.searchMode], () => {
      const m = new Uint8Array(N);
      if (state.searchMode === 'regex') {
        const err = regexError(searchTrim);
        if (err) { searchError = err; return m; }
        const rx = new RegExp(searchTrim, 'i');
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
  if (searchTrim.length > 0 && searchError === null) {
    if (state.searchMode === 'regex') searchError = regexError(searchTrim);
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

  const repoRanges = repo.ranges;
  const rangeMasks: (Uint8Array | null)[] = RANGE_KEYS.map((key) => {
    const r = state[key];
    const def = repoRanges[key];
    if (r[0] === def?.[0] && r[1] === def[1]) return null;
    return getMask(cache, `range:${key}`, [r[0], r[1]], () => {
      const m = new Uint8Array(N);
      // `key` is a `RangeKey` — every member is a `number`-typed key of
      // `metrics`, so this indexes to `number` with no cast.
      for (const f of files) {
        const v = f.metrics[key];
        if (v >= r[0] && v <= r[1]) m[f.id] = 1;
      }
      return m;
    });
  });

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

// Sort comparators, hoisted to module scope so the 18-closure record isn't
// reallocated on every computeDerived call. `repo` (formerly captured) is now a
// param.
type SortCmp = (repo: RepoData, a: number, b: number) => number;
const SORT_CMP: Record<Exclude<SortKey, 'none'>, SortCmp> = {
  'loc-desc':            (repo, a, b) => repo.files[b].metrics.loc - repo.files[a].metrics.loc,
  'complexity-desc':     (repo, a, b) => repo.files[b].metrics.complexity - repo.files[a].metrics.complexity,
  'cognitive-desc':      (repo, a, b) => repo.files[b].metrics.cognitive - repo.files[a].metrics.cognitive,
  'maintainability-asc': (repo, a, b) => repo.files[a].metrics.maintainability - repo.files[b].metrics.maintainability,
  'fanIn-desc':          (repo, a, b) => repo.files[b].metrics.fanIn - repo.files[a].metrics.fanIn,
  'fanOut-desc':         (repo, a, b) => repo.files[b].metrics.fanOut - repo.files[a].metrics.fanOut,
  'churn-desc':          (repo, a, b) => repo.files[b].metrics.churn - repo.files[a].metrics.churn,
  'pagerank-desc':       (repo, a, b) => repo.files[b].metrics.pagerank - repo.files[a].metrics.pagerank,
  'coverage-asc':        (repo, a, b) => repo.files[a].metrics.lineCoverage - repo.files[b].metrics.lineCoverage,
  'eslint-desc':         (repo, a, b) => (repo.files[b].metrics.eslintErrors * 5 + repo.files[b].metrics.eslintWarnings) - (repo.files[a].metrics.eslintErrors * 5 + repo.files[a].metrics.eslintWarnings),
  'anyCount-desc':       (repo, a, b) => repo.files[b].metrics.anyCount - repo.files[a].metrics.anyCount,
  'todo-desc':           (repo, a, b) => repo.files[b].metrics.todoCount - repo.files[a].metrics.todoCount,
  'authors-desc':        (repo, a, b) => repo.files[b].metrics.authors - repo.files[a].metrics.authors,
  'staleness-desc':      (repo, a, b) => repo.files[b].metrics.daysSinceTouched - repo.files[a].metrics.daysSinceTouched,
  'safety-asc':          (repo, a, b) => repo.files[a].metrics.editSafety - repo.files[b].metrics.editSafety,
  'safety-desc':         (repo, a, b) => repo.files[b].metrics.editSafety - repo.files[a].metrics.editSafety,
  'blast-desc':          (repo, a, b) => repo.files[b].metrics.blastRadius - repo.files[a].metrics.blastRadius,
  'confidence-asc':      (repo, a, b) => CONF_RANK[repo.files[a].metrics.confidence] - CONF_RANK[repo.files[b].metrics.confidence],
};

export function computeDerived(cache: MaskCache, state: FilterState): Derived {
  const { repo, N } = cache;
  const { mask: m, searchError: parseError } = computeMatched(cache, state);

  const ids: number[] = [];
  for (let i = 0; i < N; i++) if (m[i]) ids.push(i);

  const rk = new Int32Array(N).fill(-1);
  if (state.sort !== 'none' && ids.length > 0) {
    const cmp = SORT_CMP[state.sort];
    // NaN-tolerant: a NaN/undefined metric (possible from a raw backend DTO, or
    // an unknown confidence in CONF_RANK) would otherwise return NaN and corrupt
    // the order of neighboring well-defined files. Treat as equal.
    ids.sort((a, b) => { const r = cmp(repo, a, b); return Number.isNaN(r) ? 0 : r; });
    ids.forEach((id, i) => { rk[id] = i; });
  }

  return { matched: m, matchedCount: ids.length, rankByFileId: rk, searchError: parseError };
}
