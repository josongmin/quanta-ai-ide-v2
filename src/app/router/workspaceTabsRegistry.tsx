import { lazy, type ComponentType, type ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  DEFAULT_TAB_KINDS,
  getKindsByGroup,
  PATH_TO_KIND,
  resolveTabKindFromPath,
  TAB_KINDS_ORDERED,
  WORKSPACE_TAB_META,
  type TabKind,
  type TabKindGroup,
  type TabMeta,
} from '@shared/config/workspaceTabs';
import type { TabKindDef } from '@features/workspace-tabs';
import { builtinCatalog, surfaceIdForKind } from '@app/workbench/builtinSurfaces';
import { SURFACE_ICONS } from '@app/workbench/icons';

// App-layer composition: the built-in surface catalog is the authority for a
// tab's view and icon. This module derives the legacy `TabKindDef` projection
// from that catalog — there is no hand-maintained `Record<TabKind, Component>`
// central switch anymore. Features consume the result via
// WorkspaceTabsRegistryProvider.

export type { TabKind, TabKindGroup, TabMeta };
export {
  DEFAULT_TAB_KINDS,
  getKindsByGroup,
  PATH_TO_KIND,
  resolveTabKindFromPath,
  TAB_KINDS_ORDERED,
  WORKSPACE_TAB_META,
};

// Lazy view for a kind, resolved from the catalog. An optional per-surface
// Provider is folded into the component so the host renders one element.
function deriveComponent(kind: TabKind): ComponentType {
  const entry = builtinCatalog.resolve(surfaceIdForKind(kind));
  if (entry === undefined) throw new Error(`no built-in surface for tab kind ${kind}`);
  return lazy(() =>
    entry.activate().then((mod) => {
      const Component = mod.Component as ComponentType;
      const Provider = mod.Provider as ComponentType<{ children: ReactNode }> | undefined;
      if (Provider === undefined) return { default: Component };
      const Wrapped = (): ReactNode => (
        <Provider>
          <Component />
        </Provider>
      );
      return { default: Wrapped };
    }),
  );
}

function deriveIcon(kind: TabKind): ComponentType<LucideProps> {
  const entry = builtinCatalog.resolve(surfaceIdForKind(kind));
  const name = entry?.manifest.icon ?? '';
  const icon = SURFACE_ICONS[name];
  if (icon === undefined) throw new Error(`no icon '${name}' for tab kind ${kind}`);
  return icon;
}

export const TAB_REGISTRY: Record<TabKind, TabKindDef> = (() => {
  const out = {} as Record<TabKind, TabKindDef>;
  for (const kind of TAB_KINDS_ORDERED) {
    const meta = WORKSPACE_TAB_META[kind];
    out[kind] = {
      ...meta,
      icon: deriveIcon(kind),
      Component: deriveComponent(kind),
    };
  }
  return out;
})();

export function getKindDef(kind: TabKind): TabKindDef {
  return TAB_REGISTRY[kind];
}

export type { LucideProps, TabKindDef };
