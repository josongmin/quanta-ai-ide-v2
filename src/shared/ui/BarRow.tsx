import { memo } from 'react';

// All props are primitives so the default shallow comparator is a perfect
// fit. BarRow is rendered in lists (top owners, layers) where the list
// often re-renders even though individual rows haven't changed.
export const BarRow = memo(function BarRow({
  label, value, max, mono = false,
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  // The fill derives from currentColor so it tracks `--fg-default`, which is
  // alpha-on-foreground in both themes — preserves the original ordinal feel.
  isDark: _isDark,
}: {
  label: string; value: number; max: number; isDark?: boolean; mono?: boolean;
}) {
  // Sequential single-hue: bar opacity tracks magnitude, color stays neutral.
  // Categorical palettes would mislead — this is purely ordinal data.
  const ratio = Math.min(1, value / max);
  const barAlpha = 0.25 + ratio * 0.55; // 0.25 → 0.80
  return (
    <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--fg-default)' }}>
      <span
        className={`w-[78px] shrink-0 truncate ${mono ? 'font-mono text-[10px]' : ''}`}
        style={{ color: 'var(--fg-default)' }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        <div
          style={{
            width: `${ratio * 100}%`,
            background: `color-mix(in srgb, currentColor ${Math.round(barAlpha * 100)}%, transparent)`,
          }}
          className="h-full rounded-full"
        />
      </div>
      <span
        className="w-7 text-right tabular-nums font-bold text-[11px]"
        style={{ color: 'var(--fg-default)' }}
      >
        {value}
      </span>
    </div>
  );
});
