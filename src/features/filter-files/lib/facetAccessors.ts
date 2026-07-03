// Facet → filter-state accessors for the FacetRenderer rows.
//
// These small hooks/helpers replace the getter/setter ternary chains that
// used to live inline in FacetRenderer's TriToggleRow / EnumRow. They keep
// the facetKey → {value, setter, options} mapping in one place so:
//   - toggle rows are modelled as a discriminated union (binary vs tri-state)
//     and the type system enforces the correct facet+state pairing, and
//   - adding an enum is a single registry entry (OCP), not another ternary.
//
// Per the feature's boundary rules these accessors stay inside filter-files
// rather than in entities/filter-state.
import { useFilterFacets, useFilterRepo, useFilterActions } from '@entities/filter-state';
import type { Layer } from '@entities/repo';
import type { EnumFacet, ToggleFacet } from '@entities/facet';

// Combine the narrow filter-state selectors into the `{ state, repo, ...actions }`
// shape these accessor registries expect. Replaces the deprecated wide
// `useFilter()`; each underlying hook subscribes to only its slice, so a search
// keystroke no longer re-renders every facet row.
function useFacetApi() {
  const { state } = useFilterFacets();
  const repo = useFilterRepo();
  const actions = useFilterActions();
  return { state, repo, ...actions };
}
type FacetApi = ReturnType<typeof useFacetApi>;

// ─── Toggle facets ────────────────────────────────────────────────────
// The shared `ToggleFacet` lumps a binary toggle (`publicApiOnly`) together
// with tri-state toggles (`isTest` / `isGenerated` / `isDeprecated`). We
// narrow it into a *local* discriminated union so each row component only
// accepts the facet shape it can actually handle.

export type BinaryToggleKey = 'publicApiOnly';
export type TriToggleKey = Exclude<ToggleFacet['toggleKey'], BinaryToggleKey>;

export type BinaryToggleFacet = ToggleFacet & { toggleKey: BinaryToggleKey };
export type TriToggleFacet = ToggleFacet & { toggleKey: TriToggleKey };

export function isBinaryToggle(facet: ToggleFacet): facet is BinaryToggleFacet {
  return facet.toggleKey === 'publicApiOnly';
}

/** Read + write the binary `publicApiOnly` toggle (value is a plain bool). */
export function useBinaryToggle(facet: BinaryToggleFacet): {
  value: boolean;
  setValue: (v: boolean) => void;
} {
  const f = useFacetApi();
  // Single binary key today; index kept generic so future binary toggles
  // resolve through the same accessor instead of another inline branch.
  const value = f.state[facet.toggleKey];
  const setValue = f.setPublicApiOnly;
  return { value, setValue };
}

// Registry keyed by tri-state toggleKey — adding a tri-state toggle is one
// entry here, not another arm of a getter/setter ternary.
type TriAccessor = {
  read: (f: FacetApi) => boolean | null;
  write: (f: FacetApi) => (v: boolean | null) => void;
};

const TRI_TOGGLES: Record<TriToggleKey, TriAccessor> = {
  isTest: { read: (f) => f.state.isTest, write: (f) => f.setIsTest },
  isGenerated: { read: (f) => f.state.isGenerated, write: (f) => f.setIsGenerated },
  isDeprecated: { read: (f) => f.state.isDeprecated, write: (f) => f.setIsDeprecated },
};

/** Read + write a tri-state toggle (null = any, true = only, false = exclude). */
export function useTriToggle(facet: TriToggleFacet): {
  value: boolean | null;
  setValue: (v: boolean | null) => void;
} {
  const f = useFacetApi();
  const accessor = TRI_TOGGLES[facet.toggleKey];
  return { value: accessor.read(f), setValue: accessor.write(f) };
}

// ─── Enum facets ──────────────────────────────────────────────────────
// Registry keyed by enumKey — `options`, current selection and the toggle
// action all resolve through one entry, so a new enum facet is a single
// addition here (OCP) rather than three more ternary arms.
type EnumAccessor = {
  options: (f: FacetApi, facet: EnumFacet) => readonly string[];
  selected: (f: FacetApi) => Set<string>;
  toggle: (f: FacetApi) => (v: string) => void;
};

const DEFAULT_LANGUAGE_OPTIONS = ['ts', 'tsx', 'js'] as const;
const DEFAULT_LAYER_OPTIONS = ['view', 'controller', 'service', 'repository', 'util', 'test', 'vendor'] as const;

const ENUMS: Record<EnumFacet['enumKey'], EnumAccessor> = {
  owners: {
    options: (f) => f.repo.owners,
    selected: (f) => f.state.owners,
    toggle: (f) => f.toggleOwner,
  },
  languages: {
    options: (_f, facet) => facet.options ?? DEFAULT_LANGUAGE_OPTIONS,
    selected: (f) => f.state.languages,
    toggle: (f) => (v: string) => { f.toggleLanguage(v as never); },
  },
  layers: {
    options: (_f, facet) => facet.options ?? DEFAULT_LAYER_OPTIONS,
    selected: (f) => f.state.layers,
    toggle: (f) => (v: string) => { f.toggleLayer(v as Layer); },
  },
};

/** Read options, current selection and the toggle action for an enum facet. */
export function useEnumFacet(facet: EnumFacet): {
  options: readonly string[];
  selected: Set<string>;
  toggle: (v: string) => void;
} {
  const f = useFacetApi();
  const accessor = ENUMS[facet.enumKey];
  return {
    options: accessor.options(f, facet),
    selected: accessor.selected(f),
    toggle: accessor.toggle(f),
  };
}
