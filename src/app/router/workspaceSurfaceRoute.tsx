// Generic workspace surface route (WB-402).
//
// One route resolves ANY surface from the catalog — adding a surface needs no
// router edit. The loader turns catalog + admission into a typed surface state;
// an invalid deep link renders a typed error surface (unknown/disabled/
// untrusted), never a silent redirect to a default. Activation is lazy, so a
// cancelled navigation (unmount before the chunk loads) leaves no orphan.
import { type ReactNode } from 'react';
import { builtinCatalog } from '@app/workbench/builtinSurfaces';
import type { CatalogEntry, SurfaceCatalog, SurfaceManifest } from '@app/workbench/surfaceCatalog';

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
// tab's WebGL context + per-tab state survive tab switches; the view assembly
// lives in surfaceView, keyed by SURFACE_RUNTIME). This route must NOT also
// mount, or the surface's provider/effect/scope tree is created twice. So the
// guard only validates the deep link: an invalid surfaceId renders a typed
// error surface; a valid one renders nothing and lets the host paint it —
// exactly one mount per (workspaceId, surfaceId).
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
