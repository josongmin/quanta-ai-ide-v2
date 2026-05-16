import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  Confidence, FileRecord, FilterState, Layer, PresetKey, Range, RepoData, SearchMode, SortKey, StatusKey,
} from '@entities/repo';
import { type RangeKey, type BoolKey } from '@entities/facet';
import {
  computeDerived,
  makeMaskCache,
  type MaskCache,
} from './filterMatchEngine';
import {
  defaultState,
  EMPTY_REPO,
} from './filterState';

export type { RangeKey, BoolKey };
export { rangeOk } from './filterState';

type Setter<T> = (v: T) => void;

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
