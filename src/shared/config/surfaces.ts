// Host-neutral surface metadata SoT (P0-3).
//
// The runtime keys everything on `surfaceId` — never a closed `TabKind` union.
// This module carries the serialisable metadata (title/group/icon-name/order/
// default) and the URL<->surfaceId mapping. It imports no React and no widget.
// Legacy tab paths are read-only ingress aliases; the canonical URL is
// `/w/$workspaceId/$surfaceId`.

export type SurfaceGroup = 'core' | 'more';

export type SurfaceMeta = {
  readonly surfaceId: string;
  readonly title: string;
  readonly group: SurfaceGroup;
  readonly icon: string; // lucide icon name (host maps to a component)
  readonly legacyPath: string; // read-only ingress alias
  readonly isDefault: boolean;
};

const METAS: readonly SurfaceMeta[] = [
  { surfaceId: 'core.intelligence', title: 'Intelligence', group: 'core', icon: 'Brain', legacyPath: '/intelligence', isDefault: true },
  { surfaceId: 'core.coding', title: 'Coding', group: 'core', icon: 'Code2', legacyPath: '/coding', isDefault: true },
  { surfaceId: 'core.agents', title: 'Agents', group: 'core', icon: 'Bot', legacyPath: '/agents', isDefault: true },
  { surfaceId: 'core.reviews', title: 'Reviews', group: 'core', icon: 'GitPullRequest', legacyPath: '/reviews', isDefault: true },
  { surfaceId: 'core.admission', title: 'Admission', group: 'core', icon: 'ShieldCheck', legacyPath: '/admission', isDefault: true },
  { surfaceId: 'core.fixes', title: 'Fixes', group: 'core', icon: 'Wand2', legacyPath: '/fixes', isDefault: true },
  { surfaceId: 'core.fix-pipeline', title: 'Fix Pipeline', group: 'more', icon: 'Wrench', legacyPath: '/fix-pipeline', isDefault: false },
  { surfaceId: 'core.catalog', title: 'Catalog', group: 'more', icon: 'Layers', legacyPath: '/catalog', isDefault: false },
  { surfaceId: 'core.inbox', title: 'Inbox', group: 'more', icon: 'Inbox', legacyPath: '/me/inbox', isDefault: false },
];

export const SURFACE_METAS: Readonly<Record<string, SurfaceMeta>> = Object.fromEntries(METAS.map((m) => [m.surfaceId, m]));
export const SURFACE_IDS_ORDERED: readonly string[] = METAS.map((m) => m.surfaceId);
export const DEFAULT_SURFACE_IDS: readonly string[] = METAS.filter((m) => m.isDefault).map((m) => m.surfaceId);

export function isKnownSurface(surfaceId: string): boolean {
  return surfaceId in SURFACE_METAS;
}

export function getSurfaceMeta(surfaceId: string): SurfaceMeta | undefined {
  return SURFACE_METAS[surfaceId];
}

export function surfaceIdsByGroup(group: SurfaceGroup): readonly string[] {
  return METAS.filter((m) => m.group === group).map((m) => m.surfaceId);
}

const LEGACY_PATH_TO_ID: Readonly<Record<string, string>> = Object.fromEntries(METAS.map((m) => [m.legacyPath, m.surfaceId]));

// Resolve a pathname to a surfaceId. Canonical `/w/$ws/$surfaceId` is parsed
// directly; legacy tab paths alias one-way. Returns null for non-surface paths.
export function surfaceIdFromPath(pathname: string): string | null {
  const canonical = /^\/w\/[^/]+\/([^/]+)/.exec(pathname);
  if (canonical) return isKnownSurface(canonical[1]) ? canonical[1] : null;
  if (LEGACY_PATH_TO_ID[pathname]) return LEGACY_PATH_TO_ID[pathname];
  // longest legacy-prefix match (e.g. /coding/foo -> core.coding)
  const match = METAS.filter((m) => pathname.startsWith(`${m.legacyPath}/`)).sort((a, b) => b.legacyPath.length - a.legacyPath.length)[0];
  return match?.surfaceId ?? null;
}

export function legacyPathForSurface(surfaceId: string): string | null {
  return SURFACE_METAS[surfaceId]?.legacyPath ?? null;
}
