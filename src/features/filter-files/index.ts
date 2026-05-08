// Public API for the filter-files feature: the provider plus the four
// store/selector hooks that other slices need (`useFilter` for the full
// context, `useFilterStore` / `useFilterRepo` for narrow reads), and the
// composed `FilterBar`. `FolderTree` and the granular matched/facets/actions
// selectors are internal — consumed by FilterBar via deep imports.
export {
  FilterProvider,
  useFilter,
  useFilterStore,
  useFilterRepo,
} from './model/FilterContext';
export { default as FilterBar } from './ui/FilterBar';
