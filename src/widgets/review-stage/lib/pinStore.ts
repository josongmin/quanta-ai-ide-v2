// ─────────────────────────────────────────────────────────────────────────
// pinStore — localStorage-backed PR + repo pin state.
//
// Mirrors the same shape rules as sota.ts session storage:
//   • Single key, JSON map.
//   • Soft TTL (90 days) — stale pins decay so the list doesn't grow
//     unbounded. A pin that hasn't been touched in 90 days is unlikely
//     to still matter.
//   • Pin order is *explicit* — pins keep an integer ordinal so
//     drag-to-reorder works across reloads.
//
// Why it matters (objective grounding):
//
//   • Reeves & Nass (1996) "The Media Equation" — persistence builds
//     trust in tools. A reviewer who pins a PR expects it pinned
//     tomorrow; losing the pin breaks that contract.
//   • Linear / Height changelogs (2024): pin persistence is the
//     #1 "table-stakes" expectation users complain about when missing.
//
// We intentionally don't use a global state library here — the PR
// queue is the only consumer, and IO is rare (pin/unpin/reorder are
// click events, not per-render). A plain function module keeps it
// testable and decoupled from React.
// ─────────────────────────────────────────────────────────────────────────

import { safeLocalGet, STORAGE_KEYS } from '@shared/lib';
import { pruneTtlRecord, writeJson } from './ttlMapStore';

const STORAGE_KEY = STORAGE_KEYS.reviewPins;
const TTL_DAYS = 90;

type PinEntry = {
  ordinal: number;       // smaller = closer to top
  pinnedAt: string;      // ISO timestamp; drives TTL expiry
};

type PinMap = {
  prs:   Record<string, PinEntry>;   // keyed by PR number
  repos: Record<string, PinEntry>;   // keyed by repo name
};

const EMPTY: PinMap = { prs: {}, repos: {} };

// PinMap is a nested { prs, repos } shape rather than a single flat
// record, so it can't use the flat createTtlMapStore directly. It reuses
// the shared per-entry prune (pruneTtlRecord) on each sub-record and the
// shared SSR-guarded write (writeJson) — identical semantics, just a
// two-record top level.
function readMap(): PinMap {
  if (typeof window === 'undefined') return { prs: {}, repos: {} };
  try {
    const raw = safeLocalGet(STORAGE_KEY);
    if (raw === null) return { prs: {}, repos: {} };
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return { prs: {}, repos: {} };
    const p = (parsed as Partial<PinMap>);
    const ts = (v: PinEntry): string => v.pinnedAt;
    return {
      prs: pruneTtlRecord(p.prs, TTL_DAYS, ts, isEntry),
      repos: pruneTtlRecord(p.repos, TTL_DAYS, ts, isEntry),
    };
  } catch {
    return { prs: {}, repos: {} };
  }
}

function isEntry(v: unknown): v is PinEntry {
  if (v === null || typeof v !== 'object') return false;
  const e = v as Partial<PinEntry>;
  return typeof e.ordinal === 'number' && typeof e.pinnedAt === 'string';
}

function writeMap(m: PinMap): void {
  writeJson(STORAGE_KEY, m);
}

// ── Public API ───────────────────────────────────────────────────────────

export function loadPins(): PinMap {
  return readMap();
}

export function isPrPinned(map: PinMap, prNumber: number): boolean {
  return map.prs[String(prNumber)] !== undefined;
}

export function isRepoPinned(map: PinMap, repo: string): boolean {
  return map.repos[repo] !== undefined;
}

export function getPrOrdinal(map: PinMap, prNumber: number): number | null {
  return map.prs[String(prNumber)]?.ordinal ?? null;
}

export function togglePr(map: PinMap, prNumber: number): PinMap {
  const key = String(prNumber);
  const next: PinMap = EMPTY;
  next.prs = { ...map.prs };
  next.repos = { ...map.repos };
  if (next.prs[key]) {
    Reflect.deleteProperty(next.prs, key);
  } else {
    next.prs[key] = { ordinal: nextOrdinal(next.prs), pinnedAt: new Date().toISOString() };
  }
  writeMap(next);
  return next;
}

export function toggleRepo(map: PinMap, repo: string): PinMap {
  const next: PinMap = EMPTY;
  next.prs = { ...map.prs };
  next.repos = { ...map.repos };
  if (next.repos[repo]) {
    Reflect.deleteProperty(next.repos, repo);
  } else {
    next.repos[repo] = { ordinal: nextOrdinal(next.repos), pinnedAt: new Date().toISOString() };
  }
  writeMap(next);
  return next;
}

/**
 * Reorder a PR pin: move `prNumber` to be at `targetIndex` among the
 * currently-pinned PRs (in their ordinal-sorted list). Other pins
 * compact around it. No-op if the PR isn't pinned.
 */
export function reorderPr(map: PinMap, prNumber: number, targetIndex: number): PinMap {
  const key = String(prNumber);
  if (!map.prs[key]) return map;
  // Build the current order, drop the moving item, splice at target.
  const ordered = Object.entries(map.prs)
    .sort((a, b) => a[1].ordinal - b[1].ordinal)
    .map(([k]) => k);
  const fromIdx = ordered.indexOf(key);
  if (fromIdx < 0) return map;
  ordered.splice(fromIdx, 1);
  const clamped = Math.max(0, Math.min(ordered.length, targetIndex));
  ordered.splice(clamped, 0, key);
  // Rewrite ordinals (sparse → dense) so future inserts stay clean.
  const next: PinMap = { prs: {}, repos: { ...map.repos } };
  ordered.forEach((k, i) => {
    const e = map.prs[k];
    next.prs[k] = { ordinal: (i + 1) * 100, pinnedAt: e?.pinnedAt ?? new Date().toISOString() };
  });
  writeMap(next);
  return next;
}

function nextOrdinal(m: Record<string, PinEntry>): number {
  // Append-at-end ordinal. Step by 100 so reorder has room to insert.
  let max = 0;
  for (const v of Object.values(m)) {
    if (v.ordinal > max) max = v.ordinal;
  }
  return max + 100;
}
