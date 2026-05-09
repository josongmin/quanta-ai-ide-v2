import { useMemo, useState } from 'react';
import type { HotspotEntry, SignalKey } from '@entities/hotspot';

type SortKey = 'score' | 'percentile' | 'change_pressure' | 'health_deficit';

const SIGNAL_LABEL: Record<SignalKey, string> = {
  change_pressure: 'churn',
  structural_friction: 'complexity',
  health_deficit: 'health',
  coupling_pressure: 'coupling',
  criticality_proxy: 'criticality',
};

function topPctText(percentile: number): string {
  return `top ${Math.max(1, Math.round((1 - percentile) * 100))}%`;
}

export type HotspotListCardProps = {
  title: string;
  entries: HotspotEntry[];
  fileLabel?: (fileId: number) => string;
  emptyText?: string;
  initialSort?: SortKey;
  rightSlot?: (entry: HotspotEntry) => React.ReactNode;
};

export function HotspotListCard({
  title,
  entries,
  fileLabel,
  emptyText = 'No items',
  initialSort = 'score',
  rightSlot,
}: HotspotListCardProps) {
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);

  const sorted = useMemo(() => {
    const arr = [...entries];
    if (sortKey === 'score') return arr.sort((a, b) => b.score - a.score);
    if (sortKey === 'percentile') return arr.sort((a, b) => b.percentile - a.percentile);
    return arr.sort((a, b) => b.signals[sortKey] - a.signals[sortKey]);
  }, [entries, sortKey]);

  return (
    <div
      className="rounded-xl border p-3 space-y-2.5"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {title}
        </span>
        <span
          className="ml-auto text-[9px] font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {entries.length}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {(['score', 'percentile', 'change_pressure', 'health_deficit'] as SortKey[]).map((k) => {
          const active = k === sortKey;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSortKey(k)}
              className="px-1.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-[0.14em]"
              style={{
                color: active ? 'var(--fg-default)' : 'var(--fg-subtle)',
                borderColor: active ? 'var(--border-default)' : 'var(--border-muted)',
                background: active ? 'var(--bg-surface)' : 'transparent',
              }}
            >
              {k === 'score' ? 'score' : k === 'percentile' ? 'pct' : SIGNAL_LABEL[k]}
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <p className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-1">
          {sorted.map((entry) => {
            const primary = entry.contributions[0];
            const label = fileLabel ? fileLabel(entry.fileId) : `file #${entry.fileId}`;
            return (
              <li
                key={entry.fileId}
                className="flex items-center gap-2 px-1.5 py-1 rounded-md"
                style={{ background: 'var(--bg-surface)' }}
              >
                <span
                  className="text-[10px] font-mono truncate flex-1"
                  style={{ color: 'var(--fg-default)' }}
                  title={label}
                >
                  {label}
                </span>
                <span
                  className="text-[9px] font-mono tabular-nums"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {topPctText(entry.percentile)}
                </span>
                {primary ? (
                  <span
                    className="text-[9px] font-mono uppercase tracking-[0.12em]"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {SIGNAL_LABEL[primary.key]}
                  </span>
                ) : null}
                {rightSlot ? rightSlot(entry) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
