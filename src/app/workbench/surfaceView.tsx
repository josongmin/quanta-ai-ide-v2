// Single lazy-view assembly for a catalog entry (WB / P1-5 dedup).
//
// The ONLY place that turns a surface activator into a React view. Every surface
// activates into a plain { Component }; a surface that needs providers folds them
// INSIDE its own component (see e.g. IntelligenceStage), so there is exactly one
// assembly path and no Provider slot. Views are cached per catalog entry so
// repeated mounts reuse the same component identity (no remount) — and so this
// can be called from render.
import { lazy, type ComponentType } from 'react';
import type { CatalogEntry } from './surfaceCatalog';

const cache = new WeakMap<CatalogEntry, ComponentType>();

export function surfaceView(entry: CatalogEntry): ComponentType {
  const cached = cache.get(entry);
  if (cached !== undefined) return cached;
  const View = lazy(() =>
    entry.activate().then((mod) => ({ default: mod.Component as ComponentType })),
  );
  cache.set(entry, View);
  return View;
}
