export function trimMid(path: string, max: number): string {
  if (path.length <= max) return path;
  const tail = path.slice(-(max - 1));
  return `…${tail}`;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${String(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)}m`;
  return `${(m / 60).toFixed(1)}h`;
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diffMs = Date.now() - t;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${String(sec)}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${String(min)}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${String(hr)}h`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${String(days)}d`;
  return `${String(Math.round(days / 30))}mo`;
}
