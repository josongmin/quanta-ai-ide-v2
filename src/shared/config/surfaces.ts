// Host-neutral surface metadata SoT (P0-3 / WBT-A4R).
//
// The runtime keys everything on `surfaceId` — never a closed `TabKind` union.
// This module carries the serialisable metadata (title/group/icon-name) and the
// URL<->surfaceId mapping. It imports no React and no widget.
//
// A surface's DESCRIPTOR (its identity: title/group/icon/instancing/legacyPath)
// is separated from its HOST PLACEMENT (where the host shows it):
//   • firstLaunch     — opens on a fresh session; exactly one is `active`.
//   • lastTabFallback — the surface the last-tab-close guard reopens; exactly one.
//   • role            — semantic host slots; exactly one 'browse-all' (the picker).
//   • hero            — picker hero tiles (title/sub copy live with the surface).
// Cardinality is validated at module load and THROWS (fail-closed) — a
// mis-authored placement set is a hard programming error, never a silent
// wrong-default. Legacy tab paths are read-only ingress aliases; the canonical
// URL is `/w/$workspaceId/$surfaceId`.

export type SurfaceGroup = 'core' | 'more';

// How many live instances a surface may have. `singleton` (the only built-in
// policy today) means opening it again focuses the existing tab rather than
// spawning a second — the store MUST honour this (see openSurface) so the
// descriptor is the sole instancing authority, not the tab store.
export type Instancing = 'singleton' | 'multi';

// Semantic host slots a surface can fill. `browse-all` is the picker's
// "Browse all" target. Extend the union (not string literals at call sites)
// when a new slot is needed.
export type SurfaceRole = 'browse-all';

export type SurfaceMeta = {
  readonly surfaceId: string;
  readonly title: string;
  readonly group: SurfaceGroup;
  readonly icon: string; // lucide icon name (host maps to a component)
  readonly instancing: Instancing;
  readonly legacyPath: string; // read-only ingress alias
  // Host placement (identity-neutral). See the module header.
  readonly firstLaunch: { readonly order: number; readonly active?: boolean } | null;
  readonly lastTabFallback: boolean;
  readonly role: SurfaceRole | null;
  readonly hero: { readonly order: number; readonly title: string; readonly sub: string } | null;
};

const METAS: readonly SurfaceMeta[] = [
  {
    surfaceId: 'core.intelligence', title: 'Intelligence', group: 'core', icon: 'Brain', instancing: 'singleton', legacyPath: '/intelligence',
    firstLaunch: { order: 0, active: true }, lastTabFallback: true, role: null, hero: null,
  },
  {
    surfaceId: 'core.coding', title: 'Coding', group: 'core', icon: 'Code2', instancing: 'singleton', legacyPath: '/coding',
    firstLaunch: { order: 1 }, lastTabFallback: false, role: null,
    hero: { order: 1, title: 'Code Editor', sub: 'Workspace editor with engine signals and overlays.' },
  },
  {
    surfaceId: 'core.agents', title: 'Agents', group: 'core', icon: 'Bot', instancing: 'singleton', legacyPath: '/agents',
    firstLaunch: { order: 2 }, lastTabFallback: false, role: null,
    hero: { order: 0, title: 'AI Coding Agent', sub: 'Start a coding session with full engine context.' },
  },
  {
    surfaceId: 'core.reviews', title: 'Reviews', group: 'core', icon: 'GitPullRequest', instancing: 'singleton', legacyPath: '/reviews',
    firstLaunch: { order: 3 }, lastTabFallback: false, role: null,
    hero: { order: 2, title: 'PR Review', sub: 'Review pull requests with auto-fix and blast radius.' },
  },
  {
    surfaceId: 'core.admission', title: 'Admission', group: 'core', icon: 'ShieldCheck', instancing: 'singleton', legacyPath: '/admission',
    firstLaunch: { order: 4 }, lastTabFallback: false, role: null, hero: null,
  },
  {
    surfaceId: 'core.fixes', title: 'Fixes', group: 'core', icon: 'Wand2', instancing: 'singleton', legacyPath: '/fixes',
    firstLaunch: { order: 5 }, lastTabFallback: false, role: null, hero: null,
  },
  {
    surfaceId: 'core.fix-pipeline', title: 'Fix Pipeline', group: 'more', icon: 'Wrench', instancing: 'singleton', legacyPath: '/fix-pipeline',
    firstLaunch: null, lastTabFallback: false, role: null, hero: null,
  },
  {
    surfaceId: 'core.catalog', title: 'Catalog', group: 'more', icon: 'Layers', instancing: 'singleton', legacyPath: '/catalog',
    firstLaunch: null, lastTabFallback: false, role: 'browse-all', hero: null,
  },
  {
    surfaceId: 'core.inbox', title: 'Inbox', group: 'more', icon: 'Inbox', instancing: 'singleton', legacyPath: '/me/inbox',
    firstLaunch: null, lastTabFallback: false, role: null, hero: null,
  },
];

// Fail-closed cardinality/uniqueness validation at module load. A mis-authored
// placement set (two "active" first-launch tabs, two fallbacks, two browse-all
// slots, duplicate ids/paths/orders) is a hard programming error — throw rather
// than boot with a silently-wrong default.
(function validateSurfaceMetas(metas: readonly SurfaceMeta[]): void {
  function assertOne(count: number, what: string): void {
    if (count !== 1) throw new Error(`surface metadata invalid: expected exactly one ${what}, found ${count}`);
  }
  function assertNoDupes(values: readonly (string | number)[], what: string): void {
    const seen = new Set<string | number>();
    for (const v of values) {
      if (seen.has(v)) throw new Error(`surface metadata invalid: duplicate ${what} ${String(v)}`);
      seen.add(v);
    }
  }
  assertOne(metas.filter((m) => m.firstLaunch?.active === true).length, 'first-launch active surface');
  assertOne(metas.filter((m) => m.lastTabFallback).length, 'last-tab fallback surface');
  assertOne(metas.filter((m) => m.role === 'browse-all').length, "'browse-all' role surface");
  assertNoDupes(metas.map((m) => m.surfaceId), 'surfaceId');
  assertNoDupes(metas.map((m) => m.legacyPath), 'legacyPath');
  assertNoDupes(metas.filter((m) => m.firstLaunch !== null).map((m) => m.firstLaunch!.order), 'firstLaunch.order');
  assertNoDupes(metas.filter((m) => m.hero !== null).map((m) => m.hero!.order), 'hero.order');
})(METAS);

// Null-prototype lookups so a persisted/deep-linked surfaceId of `toString`,
// `constructor`, `hasOwnProperty`, … is NOT mistaken for a known surface (a
// plain object inherits those keys). Surface identity flows from persistence and
// deep links, so this guard is fail-closed, not cosmetic.
function nullProtoRecord<T>(entries: readonly (readonly [string, T])[]): Readonly<Record<string, T>> {
  return Object.assign(Object.create(null) as Record<string, T>, Object.fromEntries(entries));
}

export const SURFACE_METAS: Readonly<Record<string, SurfaceMeta>> = nullProtoRecord(METAS.map((m) => [m.surfaceId, m] as const));
export const SURFACE_IDS_ORDERED: readonly string[] = METAS.map((m) => m.surfaceId);

// Surfaces that open on a fresh session, in first-launch order.
export const FIRST_LAUNCH_SURFACE_IDS: readonly string[] = METAS
  .filter((m) => m.firstLaunch !== null)
  .sort((a, b) => a.firstLaunch!.order - b.firstLaunch!.order)
  .map((m) => m.surfaceId);

// Picker hero tiles (title/sub copy travels with the surface), in hero order.
export const HERO_SURFACES: readonly { readonly surfaceId: string; readonly title: string; readonly sub: string }[] = METAS
  .filter((m) => m.hero !== null)
  .sort((a, b) => a.hero!.order - b.hero!.order)
  .map((m) => ({ surfaceId: m.surfaceId, title: m.hero!.title, sub: m.hero!.sub }));

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

// The first-launch tab that boots focused. Cardinality is enforced above, so
// the find is guaranteed to hit exactly one.
export function firstLaunchActiveSurfaceId(): string {
  return METAS.find((m) => m.firstLaunch?.active === true)!.surfaceId;
}

// The surface the last-tab-close guard reopens. Cardinality enforced above.
export function lastTabFallbackSurfaceId(): string {
  return METAS.find((m) => m.lastTabFallback)!.surfaceId;
}

// The picker's "Browse all" target. Cardinality enforced above.
export function browseAllSurfaceId(): string {
  return METAS.find((m) => m.role === 'browse-all')!.surfaceId;
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
