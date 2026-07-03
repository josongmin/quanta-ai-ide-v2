import { useMemo, useRef } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { STATUS_FG, historyFor, type Service, type Status } from './types';

export function ServiceRow({ service, idx }: { service: Service; idx: number }) {
  const Icon = service.icon;
  const history = useMemo(
    () => historyFor(service.id.charCodeAt(0) * 31 + service.id.length, service.status === 'degraded' ? 0.18 : 0.06),
    [service.id, service.status],
  );
  const uptime = (history.filter((d) => d === 'operational').length / history.length) * 100;

  const rowRef = useRef<HTMLDivElement>(null);
  useHoverStyle(rowRef, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={rowRef}
      className="grid items-center px-5 py-4 transition-colors"
      style={{
        gridTemplateColumns: '220px 1fr 90px 110px',
        gap: 16,
        borderTop: idx === 0 ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>{service.name}</span>
          <span className="text-xs truncate" style={{ color: 'var(--fg-subtle)' }}>{service.description}</span>
        </div>
      </div>

      <SparkBar history={history} />

      <span className="text-base tabular-nums text-right" style={{ color: 'var(--fg-muted)' }}>
        {uptime.toFixed(2)}%
      </span>

      <StatusPill status={service.status} />
    </div>
  );
}

function SparkBar({ history }: { history: Status[] }) {
  return (
    <div className="flex items-end gap-[2px] h-7 group">
      {history.map((d, i) => {
        const color = STATUS_FG[d];
        return (
          <span
            key={i}
            className="flex-1 rounded-sm transition-opacity"
            style={{
              background: color,
              minWidth: 2,
              height: d === 'operational' ? '60%' : d === 'degraded' ? '90%' : '100%',
              opacity: 0.85,
            }}
            title={`Day ${90 - i} · ${d}`}
          />
        );
      })}
    </div>
  );
}

const STATUS_BG: Record<Status, string> = {
  operational: 'var(--intent-success-bg)',
  degraded:    'var(--intent-warn-bg)',
  outage:      'var(--intent-danger-bg)',
};

const STATUS_ICON: Record<Status, React.ComponentType<{ className?: string }>> = {
  operational: CheckCircle2,
  degraded:    AlertTriangle,
  outage:      AlertTriangle,
};

const STATUS_LABEL: Record<Status, string> = {
  operational: 'Operational',
  degraded:    'Degraded',
  outage:      'Outage',
};

function StatusPill({ status }: { status: Status }) {
  const fg = STATUS_FG[status];
  const bg = STATUS_BG[status];
  const Icon = STATUS_ICON[status];
  const label = STATUS_LABEL[status];
  return (
    <span
      className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs uppercase tracking-eyebrow font-semibold w-fit ml-auto"
      style={{
        background: bg,
        color: fg,
        border: `1px solid color-mix(in srgb, ${fg} 35%, transparent)`,
      }}
    >
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
