// Persisted tab schema migration (WB-403).
//
// Converts the legacy `{ kind }` corpus into the canonical tab record keyed by a
// stable surface identity `{ id, surfaceId, stateVersion }`. Unknown/corrupt
// records are quarantined (with a reason) while every other valid tab is kept;
// pinned/order/label state is preserved. Idempotent: re-running on an
// already-canonical record is a no-op. Pure — the caller writes the canonical
// store only (no legacy/canonical dual-write).

export const TAB_STATE_VERSION = 3;

export type CanonicalTab = {
  readonly id: string;
  readonly surfaceId: string;
  readonly stateVersion: number;
  readonly label?: string;
  readonly pinned?: boolean;
  readonly lastFocusedAt?: number;
};

export type TabQuarantine = { readonly raw: unknown; readonly reason: string };

export type TabMigration = {
  readonly tabs: readonly CanonicalTab[];
  readonly quarantined: readonly TabQuarantine[];
  readonly activeId?: string;
};

function surfaceIdForKind(kind: string): string {
  return `core.${kind}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

// Accepts either the persisted `{ tabs, activeId }` envelope or a bare tab array.
function extractTabs(raw: unknown): { tabs: unknown[]; activeId?: string } {
  if (Array.isArray(raw)) return { tabs: raw };
  const record = asRecord(raw);
  if (record !== null && Array.isArray(record['tabs'])) {
    const activeId = typeof record['activeId'] === 'string' ? record['activeId'] : undefined;
    return { tabs: record['tabs'], activeId };
  }
  return { tabs: [] };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function migrateTabs(raw: unknown, knownSurfaceIds: ReadonlySet<string>): TabMigration {
  const { tabs: source, activeId } = extractTabs(raw);
  const tabs: CanonicalTab[] = [];
  const quarantined: TabQuarantine[] = [];

  for (const entry of source) {
    const record = asRecord(entry);
    if (record === null || typeof record['id'] !== 'string') {
      quarantined.push({ raw: entry, reason: 'corrupt: missing id' });
      continue;
    }
    const id = record['id'];

    // Canonical record already? (idempotent re-run)
    const existingSurfaceId = record['surfaceId'];
    const legacyKind = record['kind'];
    const surfaceId =
      typeof existingSurfaceId === 'string'
        ? existingSurfaceId
        : typeof legacyKind === 'string'
          ? surfaceIdForKind(legacyKind)
          : null;

    if (surfaceId === null) {
      quarantined.push({ raw: entry, reason: 'corrupt: no surfaceId or kind' });
      continue;
    }
    if (!knownSurfaceIds.has(surfaceId)) {
      quarantined.push({ raw: entry, reason: `unknown surface ${surfaceId}` });
      continue;
    }

    tabs.push({
      id,
      surfaceId,
      stateVersion: TAB_STATE_VERSION,
      label: optionalString(record['label']),
      pinned: record['pinned'] === true,
      lastFocusedAt: typeof record['lastFocusedAt'] === 'number' ? record['lastFocusedAt'] : undefined,
    });
  }

  const keptActive = activeId !== undefined && tabs.some((t) => t.id === activeId) ? activeId : tabs[0]?.id;
  return { tabs, quarantined, activeId: keptActive };
}
