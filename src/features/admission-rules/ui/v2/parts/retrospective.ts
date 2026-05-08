// 30-day retro replay seeds — synthetic deterministic PR stream that
// every page (Health / Rules / Gate) replays through the current ruleset
// to compute "if today ran" style aggregates.
export const RETRO_SEEDS = Array.from({ length: 30 }, (_, i) => 900_000 + i);

export function statusRank(s: string): number {
  return s === 'block' ? 4 : s === 'warn' ? 3 : s === 'pass' ? 2 : 1;
}

export function timeAgo(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return 'just now';
  if (d < 3600_000) return `${Math.round(d / 60_000)}m ago`;
  if (d < 86400_000) return `${Math.round(d / 3600_000)}h ago`;
  return `${Math.round(d / 86400_000)}d ago`;
}
