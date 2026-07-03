import { AlertTriangle, Activity } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Spend meter

export function SpendMeter({
  pct, cap, spent, alertAt,
}: { pct: number; cap: number; spent: number; alertAt: number }) {
  const fill =
    pct >= 100 ? 'var(--intent-danger-fg)'
    : pct >= alertAt ? 'var(--intent-warn-fg)'
    : 'var(--fg-accent)';
  const triggered = pct >= alertAt;

  return (
    <div
      className="flex flex-col gap-2 px-3 py-2.5 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" style={{ color: 'var(--fg-muted)' }} />
          <span style={{ color: 'var(--fg-default)' }}>
            ${spent.toFixed(2)} of ${cap.toFixed(2)} today
          </span>
        </div>
        <span className="font-mono tabular-nums" style={{ color: fill }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="relative h-[3px] rounded-full overflow-hidden"
        style={{ background: 'var(--border-muted)' }}
      >
        {/* alert-at marker */}
        <span
          className="absolute top-[-2px] bottom-[-2px] w-px"
          style={{ left: `${alertAt}%`, background: 'var(--fg-subtle)' }}
          aria-hidden
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: fill,
            transition: 'width 240ms ease',
          }}
        />
      </div>
      {triggered && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--intent-warn-fg)' }}>
          <AlertTriangle className="w-2.5 h-2.5" />
          Crossed your alert threshold ({alertAt}% of cap). Inbox notification sent.
        </div>
      )}
    </div>
  );
}
