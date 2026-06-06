export function HealthStrip() {
  // 24 hourly buckets, deterministic
  const buckets = Array.from({ length: 24 }, (_, i) => {
    const r = (Math.sin(i * 1.37) + 1) / 2;
    const p50 = 12 + r * 8;
    const p99 = 38 + r * 18 + (i === 14 ? 22 : 0);
    return { hour: i, p50, p99 };
  });
  const max = Math.max(...buckets.map((b) => b.p99));
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
            p50 latency
          </span>
          <span className="text-[20px] font-semibold tracking-tight tabular-nums" style={{ color: 'var(--fg-strong)' }}>
            18<span className="text-[12px] font-normal" style={{ color: 'var(--fg-muted)' }}>ms</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Stat label="p99" value="74ms" />
          <Stat label="success" value="99.98%" tone="success" />
          <Stat label="requests" value="4.2M / day" />
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-14">
        {buckets.map((b) => (
          <div
            key={b.hour}
            title={`${b.hour}:00 · p50 ${b.p50.toFixed(0)}ms · p99 ${b.p99.toFixed(0)}ms`}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(8, (b.p99 / max) * 100)}%`,
              background: `linear-gradient(to top, color-mix(in srgb, var(--fg-accent) ${20 + (b.p99 / max) * 50}%, transparent), var(--fg-accent))`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex flex-col gap-0.5 text-right">
      <span className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <span
        className="text-[12px] font-semibold tabular-nums"
        style={{ color: tone === 'success' ? 'var(--intent-success-fg)' : 'var(--fg-strong)' }}
      >
        {value}
      </span>
    </div>
  );
}
