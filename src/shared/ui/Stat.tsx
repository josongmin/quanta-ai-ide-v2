import { memo } from 'react';
import { C, type Tone } from '../lib/color';

// Stat is one of the densest leaf primitives — every tab body renders 4–8
// of them in grids. Props are all primitives, so default shallow equality
// short-circuits the rerender cleanly.
export const Stat = memo(function Stat({
  label, sublabel, value, suffix, tone = 'neutral',
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  isDark: _isDark,
}: {
  label: string;
  sublabel?: string;
  value: string | number;
  suffix?: string;
  isDark?: boolean;
  tone?: Tone;
}) {
  // - neutral:  full-strength text, no hue
  // - ok:       small green dot (positive signal — used sparingly)
  // - warn:     amber dot prefix, value stays bold but uncolored
  // - critical: red dot + red value (rare, so it pops)
  const dot =
    tone === 'critical' ? C.critical :
    tone === 'warn'     ? C.warning  :
    tone === 'ok'       ? C.ok       : null;
  const valueColor = tone === 'critical' ? C.critical : 'var(--fg-default)';

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex flex-col min-w-0 flex-1">
        <span className="truncate" style={{ color: 'var(--fg-muted)' }}>{label}</span>
        {sublabel && (
          <span
            className="text-2xs font-mono truncate"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {sublabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {dot && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: dot }}
            aria-hidden
          />
        )}
        <span className="font-bold tabular-nums" style={{ color: valueColor }}>{value}</span>
        {suffix && (
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
});
