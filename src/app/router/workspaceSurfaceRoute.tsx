// Generic workspace surface route (WB-402).
//
// One route resolves ANY surface from the catalog — adding a surface needs no
// router edit. The loader turns catalog + admission into a typed surface state;
// an invalid deep link renders a typed error surface (unknown/disabled/
// untrusted), never a silent redirect to a default. Activation is lazy, so a
// cancelled navigation (unmount before the chunk loads) leaves no orphan.
import { type ReactNode } from 'react';
import { SurfaceHost } from '@shared/workbench/react';
import type { ScopeIdentity } from '@shared/workbench';
import { builtinCatalog } from '@app/workbench/builtinSurfaces';
import type { CatalogEntry, SurfaceCatalog, SurfaceManifest } from '@app/workbench/surfaceCatalog';
import { surfaceView } from '@app/workbench/surfaceView';

export type SurfaceAdmission = 'ok' | 'disabled' | 'untrusted';
export type AdmissionPolicy = (manifest: SurfaceManifest) => SurfaceAdmission;

// Built-ins are all enabled and trusted; external/plugin surfaces gate here.
export const builtinAdmission: AdmissionPolicy = () => 'ok';

export type SurfaceRouteState =
  | { readonly status: 'ok'; readonly workspaceId: string; readonly surfaceId: string; readonly entry: CatalogEntry }
  | { readonly status: 'unknown'; readonly workspaceId: string; readonly surfaceId: string }
  | { readonly status: 'disabled'; readonly workspaceId: string; readonly surfaceId: string }
  | { readonly status: 'untrusted'; readonly workspaceId: string; readonly surfaceId: string };

// Pure resolver. Deterministic; never falls back to a default surface.
export function resolveSurfaceRoute(
  catalog: SurfaceCatalog,
  admit: AdmissionPolicy,
  workspaceId: string,
  surfaceId: string,
): SurfaceRouteState {
  const entry = catalog.resolve(surfaceId);
  if (entry === undefined) return { status: 'unknown', workspaceId, surfaceId };
  const verdict = admit(entry.manifest);
  if (verdict === 'disabled') return { status: 'disabled', workspaceId, surfaceId };
  if (verdict === 'untrusted') return { status: 'untrusted', workspaceId, surfaceId };
  return { status: 'ok', workspaceId, surfaceId, entry };
}

export function SurfaceErrorView({ state }: { state: Exclude<SurfaceRouteState, { status: 'ok' }> }): ReactNode {
  return (
    <div role="alert" data-surface-error={state.status}>
      {state.status === 'unknown' && `No such surface: ${state.surfaceId}`}
      {state.status === 'disabled' && `Surface is disabled: ${state.surfaceId}`}
      {state.status === 'untrusted' && `Surface is not trusted: ${state.surfaceId}`}
    </div>
  );
}

// Route-wired deep-link guard — the FORM actually mounted by the `/w/...` route.
//
// The keep-mounted WorkspaceTabsHost is the single surface MOUNT authority (so a
// tab's WebGL context + per-tab state survive tab switches). This route must NOT
// also mount, or the surface's provider/effect/scope tree is created twice. So
// the guard only validates the deep link: an invalid surfaceId renders a typed
// error surface; a valid one renders nothing and lets the host paint it —
// exactly one mount per (workspaceId, surfaceId). `WorkspaceSurface` below stays
// the generic router-owned mounter (exercised by tests) — the drop-in for a
// future router-owned lifecycle, deliberately not wired as the active path.
export function WorkspaceSurfaceGuard({
  workspaceId,
  surfaceId,
  admit = builtinAdmission,
  catalog = builtinCatalog,
}: {
  workspaceId: string;
  surfaceId: string;
  admit?: AdmissionPolicy;
  catalog?: SurfaceCatalog;
}): ReactNode {
  const state = resolveSurfaceRoute(catalog, admit, workspaceId, surfaceId);
  if (state.status !== 'ok') return <SurfaceErrorView state={state} />;
  return null;
}

// Presentational surface route — router-agnostic so it is fully testable. The
// generic MOUNTER for any catalog entry (built-in or injected/plugin). It is the
// building block for a future router-owned mount mode; today the keep-mounted
// host owns mounting, so this is not the active route path (see
// WorkspaceSurfaceGuard) but remains covered by tests.
export function WorkspaceSurface({
  workspaceId,
  surfaceId,
  admit = builtinAdmission,
  catalog = builtinCatalog,
}: {
  workspaceId: string;
  surfaceId: string;
  admit?: AdmissionPolicy;
  catalog?: SurfaceCatalog;
}): ReactNode {
  const state = resolveSurfaceRoute(catalog, admit, workspaceId, surfaceId);
  if (state.status !== 'ok') return <SurfaceErrorView state={state} />;
  return <MountedSurface entry={state.entry} workspaceId={workspaceId} surfaceId={surfaceId} />;
}

// Mounts the resolved surface. Split out so the view is resolved for ANY catalog
// entry (not a builtins-only map) with hooks living in one place.
function MountedSurface({ entry, workspaceId, surfaceId }: { entry: CatalogEntry; workspaceId: string; surfaceId: string }): ReactNode {
  // owner/trust come from the descriptor — never parsed from the id string.
  const identity: ScopeIdentity = {
    id: `${surfaceId}@${workspaceId}`,
    kind: 'surface',
    owner: { owner: entry.manifest.owner, trust: entry.manifest.trust },
  };
  // surfaceView caches per catalog entry (WeakMap) — the returned component has a
  // STABLE identity across renders, so the "reset state each render" concern does
  // not apply here.
  const View = surfaceView(entry);
  return (
    <SurfaceHost identity={identity} state="mounted">
      {/* eslint-disable-next-line react-hooks/static-components -- View is cached per entry (stable identity) */}
      <View />
    </SurfaceHost>
  );
}
