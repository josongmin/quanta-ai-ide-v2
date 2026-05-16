// Public API for the filter-files feature. The store/Context lives in
// `@entities/filter-state` now (it's effectively global state — every
// route under AppShell reads from this single zustand instance); this
// feature owns only the composed `FilterBar` UI.
//
// Hook re-exports are kept here as a transitional surface so older
// consumers keep working; new code should import the hooks directly from
// `@entities/filter-state`.
export {
  FilterProvider,
  useFilter,
  useFilterStore,
  useFilterRepo,
} from '@entities/filter-state';
export { default as FilterBar } from './ui/FilterBar';
