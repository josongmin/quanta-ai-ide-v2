import type { Freshness } from '../model';

// 30 minutes is the demo threshold. Real impl reads from the index
// service's last-completed-scan timestamp.
const STALE_AFTER_SECONDS = 30 * 60;

export function freshnessNow(indexedAtIso: string): Freshness {
  const ageSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(indexedAtIso).getTime()) / 1000),
  );
  return {
    indexedAt: indexedAtIso,
    ageSeconds,
    stale: ageSeconds > STALE_AFTER_SECONDS,
  };
}

export function describeFreshness(f: Freshness): string {
  const m = Math.floor(f.ageSeconds / 60);
  if (m < 1) return '< 1m';
  if (m < 60) return `${m.toString()}m`;
  const h = Math.floor(m / 60);
  return `${h.toString()}h ${(m % 60).toString()}m`;
}
