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
// Consumers pick the narrowest selector they need so a `setSearch`
// keystroke doesn't ripple to every subscriber. (The legacy wide
// `useFilter()` hook was removed — use these narrow hooks instead.)
export {
  FilterProvider,
  useFilterStore,
  useFilterRepo,
  useFilterMatched,
  useFilterFacets,
  useFilterActions,
  rangeOk,
  type RangeKey,
  type BoolKey,
} from './model/filterStore';
