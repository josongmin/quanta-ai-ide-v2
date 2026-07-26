// Legacy URL ↔ canonical surface identity alias (WB-405).
//
// Legacy tab URLs (`/intelligence`, `/coding`, …) are READ-ONLY aliases that
// resolve to the same canonical `{ workspaceId, surfaceId }` identity as the
// generic `/w/$workspaceId/$surfaceId` route. Resolution is one-way (legacy →
// canonical); a canonical path is not itself a legacy path, so there is no
// redirect/history loop and no double activation.
import { resolveTabKindFromPath, WORKSPACE_TAB_META, type TabKind } from '@shared/config/workspaceTabs';
import { kindForSurfaceId, surfaceIdForKind } from '@app/workbench/builtinSurfaces';

export type LegacyAlias = { readonly surfaceId: string };

// A legacy tab path (`/intelligence`, `/coding/…`) → its canonical surface id.
// Returns null for non-legacy paths (including canonical `/w/...`), which is what
// keeps the alias one-way and loop-free.
export function aliasLegacyUrl(pathname: string): LegacyAlias | null {
  if (pathname.startsWith('/w/')) return null; // already canonical — never re-alias
  const kind = resolveTabKindFromPath(pathname);
  if (kind === null) return null;
  return { surfaceId: surfaceIdForKind(kind) };
}

// Canonical route for a surface within a workspace.
export function canonicalSurfacePath(workspaceId: string, surfaceId: string): string {
  return `/w/${workspaceId}/${surfaceId}`;
}

// The legacy path for a surface, when one exists (back-compat links/redirects).
export function legacyPathForSurface(surfaceId: string): string | null {
  const kind = kindForSurfaceId(surfaceId) as TabKind;
  const meta = WORKSPACE_TAB_META[kind] as { path: string } | undefined;
  return meta?.path ?? null;
}
