// Host-neutral surface metadata SoT (P0-3).
//
// The runtime keys everything on `surfaceId` — never a closed `TabKind` union.
// This module carries the serialisable metadata (title/group/icon-name/order/
// default) and the URL<->surfaceId mapping. It imports no React and no widget.
// Legacy tab paths are read-only ingress aliases; the canonical URL is
// `/w/$workspaceId/$surfaceId`.

export type SurfaceGroup = 'core' | 'more';

// How many live instances a surface may have. `singleton` (the only built-in
// policy today) means opening it again focuses the existing tab rather than
// spawning a second — the store MUST honour this (see openSurface) so the
// descriptor is the sole instancing authority, not the tab store.
export type Instancing = 'singleton' | 'multi';

export type SurfaceMeta = {
  readonly surfaceId: string;
  readonly title: string;
  readonly group: SurfaceGroup;
  readonly icon: string; // lucide icon name (host maps to a component)
  readonly legacyPath: string; // read-only ingress alias
  readonly isDefault: boolean;
  readonly instancing: Instancing;
};

const METAS: readonly SurfaceMeta[] = [
  { surfaceId: 'core.intelligence', title: 'Intelligence', group: 'core', icon: 'Brain', legacyPath: '/intelligence', isDefault: true, instancing: 'singleton' },
  { surfaceId: 'core.coding', title: 'Coding', group: 'core', icon: 'Code2', legacyPath: '/coding', isDefault: true, instancing: 'singleton' },
  { surfaceId: 'core.agents', title: 'Agents', group: 'core', icon: 'Bot', legacyPath: '/agents', isDefault: true, instancing: 'singleton' },
  { surfaceId: 'core.reviews', title: 'Reviews', group: 'core', icon: 'GitPullRequest', legacyPath: '/reviews', isDefault: true, instancing: 'singleton' },
  { surfaceId: 'core.admission', title: 'Admission', group: 'core', icon: 'ShieldCheck', legacyPath: '/admission', isDefault: true, instancing: 'singleton' },
  { surfaceId: 'core.fixes', title: 'Fixes', group: 'core', icon: 'Wand2', legacyPath: '/fixes', isDefault: true, instancing: 'singleton' },
  { surfaceId: 'core.fix-pipeline', title: 'Fix Pipeline', group: 'more', icon: 'Wrench', legacyPath: '/fix-pipeline', isDefault: false, instancing: 'singleton' },
  { surfaceId: 'core.catalog', title: 'Catalog', group: 'more', icon: 'Layers', legacyPath: '/catalog', isDefault: false, instancing: 'singleton' },
  { surfaceId: 'core.inbox', title: 'Inbox', group: 'more', icon: 'Inbox', legacyPath: '/me/inbox', isDefault: false, instancing: 'singleton' },
];

// Null-prototype lookups so a persisted/deep-linked surfaceId of `toString`,
// `constructor`, `hasOwnProperty`, … is NOT mistaken for a known surface (a
// plain object inherits those keys). Surface identity flows from persistence and
// deep links, so this guard is fail-closed, not cosmetic.
function nullProtoRecord<T>(entries: readonly (readonly [string, T])[]): Readonly<Record<string, T>> {
  return Object.assign(Object.create(null) as Record<string, T>, Object.fromEntries(entries));
}

export const SURFACE_METAS: Readonly<Record<string, SurfaceMeta>> = nullProtoRecord(METAS.map((m) => [m.surfaceId, m] as const));
export const SURFACE_IDS_ORDERED: readonly string[] = METAS.map((m) => m.surfaceId);
export const DEFAULT_SURFACE_IDS: readonly string[] = METAS.filter((m) => m.isDefault).map((m) => m.surfaceId);

export function isKnownSurface(surfaceId: string): boolean {
  // Safe against `toString`/`constructor`/… because SURFACE_METAS has a null
  // prototype — there are no inherited keys for `in` to find.
  return surfaceId in SURFACE_METAS;
}

export function getSurfaceMeta(surfaceId: string): SurfaceMeta | undefined {
  // Null-prototype record → a missing key yields `undefined`, never an inherited
  // Object.prototype member.
  return SURFACE_METAS[surfaceId];
}

// The descriptor's instancing policy for a surface. Unknown ids fail closed to
// `singleton` (the safe default — never spawn duplicates for an id we can't
// vouch for).
export function instancingFor(surfaceId: string): Instancing {
  return getSurfaceMeta(surfaceId)?.instancing ?? 'singleton';
}

export function surfaceIdsByGroup(group: SurfaceGroup): readonly string[] {
  return METAS.filter((m) => m.group === group).map((m) => m.surfaceId);
}

const LEGACY_PATH_TO_ID: Readonly<Record<string, string>> = nullProtoRecord(METAS.map((m) => [m.legacyPath, m.surfaceId] as const));

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
