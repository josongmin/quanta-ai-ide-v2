// ─────────────────────────────────────────────────────────────────────────
// createTtlMapStore — the shared read/write core behind pinStore,
// customViewStore, and sota's session store. All three hand-rolled the
// same routine:
//
//   readMap:  SSR guard → safeLocalGet → JSON.parse → object guard →
//             prune entries older than TTL (per-entry timestamp) via a
//             per-entry validator → swallow-on-error fallback to {}.
//   writeMap: SSR guard → safeLocalSet(JSON.stringify(map)).
//
// They differed only in: storage key, TTL days, the entry-timestamp
// field, and the per-entry validity guard. This factory captures those
// four axes and nothing else, so the semantics stay byte-for-byte
// identical to the originals (same `Date.now() - ttlDays*864e5` cutoff,
// same SSR guard, same silent fallback).
// ─────────────────────────────────────────────────────────────────────────

import { safeLocalGet, safeLocalSet } from '@shared/lib';

export type TtlMapStoreConfig<T> = {
  /** localStorage key. */
  key: string;
  /** Soft TTL in days — entries older than this are pruned on read. */
  ttlDays: number;
  /** Pull the ISO/parseable timestamp that drives TTL expiry off an entry. */
  timestampOf: (entry: T) => string;
  /** Per-entry shape guard; entries that fail are dropped on read. */
  isValid: (entry: unknown) => entry is T;
};

export type TtlMapStore<T> = {
  readMap(): Record<string, T>;
  writeMap(map: Record<string, T>): void;
};

/**
 * Prune a raw parsed record: keep only entries that pass `isValid` and
 * whose timestamp is newer than the TTL cutoff. Shared so a store with a
 * non-flat shape (e.g. pinStore's { prs, repos }) can reuse the exact
 * same per-entry semantics on each of its sub-records.
 */
export function pruneTtlRecord<T>(
  raw: unknown,
  ttlDays: number,
  timestampOf: (entry: T) => string,
  isValid: (entry: unknown) => entry is T,
): Record<string, T> {
  const cutoff = Date.now() - ttlDays * 864e5;
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries((raw ?? {}) as Record<string, unknown>)) {
    if (!isValid(v)) continue;
    if (new Date(timestampOf(v)).getTime() < cutoff) continue;
    out[k] = v;
  }
  return out;
}

/**
 * SSR-guarded JSON write — the exact write half of every store. Exposed
 * so a store with a non-flat map shape (pinStore) shares the same write
 * path as the flat-record stores.
 */
export function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  safeLocalSet(key, JSON.stringify(value));
}

export function createTtlMapStore<T>(config: TtlMapStoreConfig<T>): TtlMapStore<T> {
  const { key, ttlDays, timestampOf, isValid } = config;

  function readMap(): Record<string, T> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = safeLocalGet(key);
      if (raw === null) return {};
      const parsed: unknown = JSON.parse(raw);
      if (parsed === null || typeof parsed !== 'object') return {};
      return pruneTtlRecord(parsed, ttlDays, timestampOf, isValid);
    } catch {
      return {};
    }
  }

  function writeMap(map: Record<string, T>): void {
    writeJson(key, map);
  }

  return { readMap, writeMap };
}
