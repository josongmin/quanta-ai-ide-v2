// App-layer surface runtime composition (P0-3/P1).
//
// Builds the surfaceId-keyed { view, icon } map from the built-in catalog and
// injects it into features via SurfaceRuntimeProvider. Replaces the closed
// TabKind TAB_REGISTRY switch.
import { builtinCatalog } from '@app/workbench/builtinSurfaces';
import { SURFACE_ICONS } from '@app/workbench/icons';
import { surfaceView } from '@app/workbench/surfaceView';
import type { SurfaceRuntimeEntry } from '@features/workspace-tabs';

export const SURFACE_RUNTIME: Readonly<Record<string, SurfaceRuntimeEntry>> = Object.fromEntries(
  builtinCatalog.entries.map((entry) => [
    entry.manifest.id,
    { Component: surfaceView(entry), icon: SURFACE_ICONS[entry.manifest.icon] } satisfies SurfaceRuntimeEntry,
  ]),
);
