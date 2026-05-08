// Public API for the facet entity:
// facet/plan types, the canonical FACETS catalogue, and the DSL parser.
export type {
  Plan,
  FacetCategoryKey,
  FacetEntry,
  RangeKey,
  BoolKey,
  RangeFacet,
  BoolFacet,
  EnumFacet,
  ToggleFacet,
  Facet,
} from './model';
export {
  CATEGORIES,
  FACETS,
  facetsByCategory,
} from './model';
export { parseDsl } from './lib/dsl';
