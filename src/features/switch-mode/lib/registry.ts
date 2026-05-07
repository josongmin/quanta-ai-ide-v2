// Mode registry — the single place that knows the full set of view modes.
//
// Why this exists
// ───────────────
// Adding a new 3D mode used to require editing:
//   1. ViewModeId in entities/viz-mode/model.ts
//   2. ModeSwitcher.tsx (button list)
//   3. Stage.tsx (if/else chain in `useMemo`)
//   4. switch-mode/index.ts (a new named factory export)
// Steps 3-4 are mechanical OCP violations: every additional mode meant
// modifying an unrelated open-and-stable consumer (Stage). Lifting the
// factories into an id-keyed map keeps Stage closed to mode additions —
// only this file changes.
//
// The factories are loaded **dynamically** so the heavy three.js bundle is
// kept off the initial critical path. Stage awaits `createMode(id)` and
// only then mounts the scene; switching modes triggers another small
// dynamic import (which Vite resolves to a single shared `viz-modes`
// chunk because all four files live next to each other).

import type { ViewMode, ViewModeId } from '@entities/viz-mode';

type LazyFactory = () => Promise<() => ViewMode>;

const LAZY_FACTORIES: Record<ViewModeId, LazyFactory> = {
  'dot-field': () => import('./DotFieldMode').then((m) => m.createDotFieldMode),
  universe:    () => import('./UniverseMode').then((m) => m.createUniverseMode),
};

// Convenience: instantiate by id. Stage uses this; useMemo deps stay tiny.
export async function createMode(id: ViewModeId): Promise<ViewMode> {
  const factory = await LAZY_FACTORIES[id]();
  return factory();
}
