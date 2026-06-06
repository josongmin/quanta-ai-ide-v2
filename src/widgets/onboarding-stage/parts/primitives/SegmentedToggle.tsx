import type { ReactNode } from 'react';

// Pill-style segmented control shared by the invite default-role selector and
// the plan billing-cycle toggle. Both render the exact same chrome — a
// bg-surface-muted/border-muted track with bg-canvas + soft-shadow active
// segments — differing only in segment padding and label content, which are
// threaded through props so the rendered markup stays byte-identical.
type Props<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel: (option: T, active: boolean) => ReactNode;
  // Extra classes on the track wrapper (e.g. `self-start`).
  className?: string;
  // Horizontal padding utility for each segment (`px-2.5` vs `px-3`).
  segmentPadding: string;
};

export function SegmentedToggle<T extends string>({
  options, value, onChange, renderLabel, className, segmentPadding,
}: Props<T>) {
  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-md${className ? ` ${className}` : ''}`}
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => { onChange(opt); }}
            className={`${segmentPadding} h-7 rounded text-[11px] font-medium transition-colors`}
            style={{
              background: active ? 'var(--bg-canvas)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {renderLabel(opt, active)}
          </button>
        );
      })}
    </div>
  );
}
