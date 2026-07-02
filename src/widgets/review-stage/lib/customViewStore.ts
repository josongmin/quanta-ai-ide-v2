// ─────────────────────────────────────────────────────────────────────────
// customViewStore — user-saved query+scope recipes, persisted to
// localStorage. Mirrors pinStore's shape conventions:
//   • Single key, JSON map.
//   • Soft TTL (180 days) — saved views are "the way I work", and
//     should outlive a single sprint but not survive a year of
//     codebase rotation.
//   • Ordinal-based ordering so future drag-reorder can plug in
//     without a schema change.
//
// Why we store *recipes*, not *results*:
//
//   • Reeves & Nass (1996) — persistence builds trust. A reviewer
//     who saved "내 24h SLA" once expects it to keep matching as
//     the queue changes; storing the result list (not the predicate)
//     would break that.
//   • Linear's "favourite views" / Height's "saved filters" follow
//     the same recipe-not-result rule.
// ─────────────────────────────────────────────────────────────────────────

import { STORAGE_KEYS } from '@shared/lib';
import type { QueueScope } from '../ui/LeftQueue';
import { createTtlMapStore } from './ttlMapStore';

const STORAGE_KEY = STORAGE_KEYS.reviewCustomViews;
const TTL_DAYS = 180;

export type CustomView = {
  id: string;
  label: string;
  scope: QueueScope;
  query: string;
  ordinal: number;
  createdAt: string;
};

type StoredMap = Record<string, CustomView>;

function isView(v: unknown): v is CustomView {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Partial<CustomView>;
  return typeof o.id === 'string'
    && typeof o.label === 'string'
    && typeof o.scope === 'string'
    && typeof o.query === 'string'
    && typeof o.ordinal === 'number'
    && typeof o.createdAt === 'string';
}

const { readMap, writeMap } = createTtlMapStore<CustomView>({
  key: STORAGE_KEY,
  ttlDays: TTL_DAYS,
  timestampOf: (v) => v.createdAt,
  isValid: isView,
});

// ── Public API ───────────────────────────────────────────────────────────

export function loadCustomViews(): CustomView[] {
  const m = readMap();
  return Object.values(m).sort((a, b) => a.ordinal - b.ordinal);
}

export function addCustomView(label: string, scope: QueueScope, query: string): CustomView[] {
  const m = readMap();
  // Generate id from label hash + timestamp tail so duplicates with
  // the same label still get distinct ids.
  const id = `cv_${label.replace(/\s+/g, '_').toLowerCase().slice(0, 24)}_${String(Date.now()).slice(-5)}`;
  const ordinal = nextOrdinal(m);
  m[id] = { id, label, scope, query, ordinal, createdAt: new Date().toISOString() };
  writeMap(m);
  return Object.values(m).sort((a, b) => a.ordinal - b.ordinal);
}

export function removeCustomView(id: string): CustomView[] {
  const m = readMap();
  Reflect.deleteProperty(m, id);
  writeMap(m);
  return Object.values(m).sort((a, b) => a.ordinal - b.ordinal);
}

function nextOrdinal(m: StoredMap): number {
  let max = 0;
  for (const v of Object.values(m)) {
    if (v.ordinal > max) max = v.ordinal;
  }
  return max + 100;
}
