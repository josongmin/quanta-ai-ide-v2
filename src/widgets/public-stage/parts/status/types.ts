// Shared types + status helpers for the Status page parts.

export type Status = 'operational' | 'degraded' | 'outage';

export type Service = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  status: Status;
};

export type Region = {
  id: string;
  label: string;
  lat: number;       // 0-100 (approx for our 1080×260 svg map)
  lon: number;
  status: Status;
  latencyMs: number;
};

export type Incident = {
  id: string;
  title: string;
  status: 'monitoring' | 'investigating' | 'resolved';
  startedAt: string;
  resolvedAt?: string;
  affected: string[];
  updates: { at: string; status: string; body: string }[];
};

// Foreground (vivid) color per service/region status.
export const STATUS_FG: Record<Status, string> = {
  operational: 'var(--intent-success-fg)',
  degraded:    'var(--intent-warn-fg)',
  outage:      'var(--intent-danger-fg)',
};

export function worstOf(a: Status, b: Status): Status {
  const rank = { operational: 0, degraded: 1, outage: 2 } as const;
  return rank[b] > rank[a] ? b : a;
}

// Deterministic 90-bar history per service. Each bar is a single day.
export function historyFor(seed: number, baseFail = 0.06): Status[] {
  // simple LCG
  let s = seed * 9301 + 49297;
  const out: Status[] = [];
  for (let i = 0; i < 90; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    if (r < baseFail * 0.18) out.push('outage');
    else if (r < baseFail) out.push('degraded');
    else out.push('operational');
  }
  return out;
}
