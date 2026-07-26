// Single lazy-view assembly for a catalog entry (WB / P1-5 dedup).
//
// The ONLY place that turns a surface activator into a React view. An optional
// per-surface Provider is folded into the lazy component so a host renders one
// element. Views are cached per catalog entry so repeated mounts reuse the same
// component identity (no remount) — and so this can be called from render.
import { lazy, type ComponentType, type ReactNode } from 'react';
import type { CatalogEntry } from './surfaceCatalog';

const cache = new WeakMap<CatalogEntry, ComponentType>();

export function surfaceView(entry: CatalogEntry): ComponentType {
  const cached = cache.get(entry);
  if (cached !== undefined) return cached;
  const View = lazy(() =>
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
  cache.set(entry, View);
  return View;
}
