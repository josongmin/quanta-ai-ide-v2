import type { UsageRow } from './data';
import { formatNumber } from '@shared/i18n';

type Props = { usage: UsageRow[] };

export function UsageGrid({ usage }: Props) {
  return (
    <div className="grid grid-cols-3 gap-x-10 gap-y-8">
      {usage.map((row) => <UsageCell key={row.key} row={row} />)}
    </div>
  );
}

function UsageCell({ row }: { row: UsageRow }) {
  const pct = row.limit == null ? 0 : Math.min(100, (row.used / row.limit) * 100);
  const fmt = (n: number) =>
    n >= 1000 ? formatNumber(n) : (Number.isInteger(n) ? String(n) : n.toFixed(1));

  // Bar tone shifts only at the >90% / >75% break — otherwise neutral. The
  // value text never colour-shifts; that lives on the bar to keep text calm.
  const barColor =
    pct >= 90 ? 'var(--intent-danger-fg)'
    : pct >= 75 ? 'var(--intent-warn-fg)'
    : 'var(--fg-default)';

  return (
    <div className="flex flex-col gap-2">
      <div
        className="text-[10px] uppercase tracking-[0.14em] font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {row.label}
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className="text-[22px] font-semibold tracking-tight tabular-nums leading-none"
          style={{ color: 'var(--fg-strong)' }}
        >
          {fmt(row.used)}
        </span>
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
          / {row.limit == null ? '∞' : fmt(row.limit)} {row.unit}
        </span>
      </div>

      <div
        className="relative h-[3px] rounded-full overflow-hidden"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] tabular-nums">
        <span style={{ color: 'var(--fg-subtle)' }}>{Math.round(pct)}% used</span>
        {row.hint && <span style={{ color: 'var(--fg-subtle)' }}>{row.hint}</span>}
      </div>
    </div>
  );
}
