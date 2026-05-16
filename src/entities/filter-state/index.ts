// Public API for the filter-state entity. This is conceptually a
// globalised slice of repo-filter state: every route under the AppShell
// reads from this single zustand instance, and FilterProvider just
// initialises it from a built `RepoData`.
//
// Consumers should pick the narrowest selector they need:
//   • useFilterRepo()    — stable repo data only
//   • useFilterMatched() — match mask + count + ranks
//   • useFilterFacets()  — current FilterState + search error
//   • useFilterActions() — reference-stable action setters
// `useFilter()` returns the full API but is deprecated; prefer the
// narrow selectors so a `setSearch` keystroke doesn't ripple to every
// subscriber.
export {
  FilterProvider,
  useFilter,
  useFilterStore,
  useFilterRepo,
  useFilterMatched,
  useFilterFacets,
  useFilterActions,
  rangeOk,
  type RangeKey,
  type BoolKey,
} from './model/FilterContext';
