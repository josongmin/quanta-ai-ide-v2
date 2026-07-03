import type { Delivery } from './data';
import { STATUS_META } from './data';

export function DeliveryRow({
  d, last, active, onClick,
}: { d: Delivery; last: boolean; active: boolean; onClick: () => void }) {
  const m = STATUS_META[d.status];
  const Icon = m.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left grid items-center px-4 h-12 transition-colors"
      style={{
        gridTemplateColumns: '0.5fr 1.6fr 1.4fr 0.6fr 0.4fr 0.6fr',
        borderBottom: last ? 'none' : '1px solid var(--border-muted)',
        background: active ? 'color-mix(in srgb, var(--fg-accent) 7%, transparent)' : 'transparent',
        boxShadow: active ? 'inset 0 0 0 1px color-mix(in srgb, var(--fg-accent) 40%, transparent)' : 'none',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: m.fg }} />
      <code className="text-sm font-mono truncate" style={{ color: 'var(--fg-strong)' }}>{d.event}</code>
      <span className="text-sm truncate" style={{ color: 'var(--fg-muted)' }}>{d.endpoint}</span>
      <span className="text-sm tabular-nums" style={{ color: d.httpStatus && d.httpStatus >= 400 ? m.fg : 'var(--fg-muted)' }}>
        {d.httpStatus ?? '—'}
      </span>
      <span className="text-sm tabular-nums text-right" style={{ color: 'var(--fg-muted)' }}>{d.durationMs}ms</span>
      <span className="text-sm tabular-nums text-right font-mono" style={{ color: 'var(--fg-subtle)' }}>{d.at}</span>
    </button>
  );
}
