import { memo } from 'react';
import { useTranslation } from '@shared/i18n';
import { C } from '../lib/color';

// All numeric/boolean props — shallow equality is correct. Renders inside
// memoized tab bodies so this mostly defends against stats object identity
// flips, but it's a cheap guard.
export const ConfidenceMeter = memo(function ConfidenceMeter({
  exact, overapprox, unknown, stale, total,
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  isDark,
}: {
  isDark?: boolean;
  exact: number; overapprox: number; unknown: number; stale: number; total: number;
}) {
  const { t } = useTranslation('common');
  // Diverging order: known-good → degraded → unknown → unindexed.
  // The hue *is* the meaning, so reordering the legend grid would lie.
  // The `stale` colour is the one place we still need an isDark tone — it's
  // a chart-data hue (not chrome) and the spec doesn't yet ship a token for
  // it. Falls back to the dark value if `isDark` was omitted.
  const staleHue = isDark === false ? '#9aa1aa' : '#6e7681';
  const segs = [
    { k: 'exact',       n: exact,      hue: C.ok },
    { k: 'overapprox',  n: overapprox, hue: C.warning },
    { k: 'unknown',     n: unknown,    hue: C.critical },
    { k: 'stale',       n: stale,      hue: staleHue },
  ];
  const safeTotal = Math.max(1, total);
  return (
    <div className="space-y-1.5">
      {/* Caption-weight, not section-weight — the bar itself carries the
          attention; this just disambiguates it from the gauge above. */}
      <div
        className="flex items-baseline justify-between text-[9px] font-mono"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{t('filesByConfidence')}</span>
        <span className="tabular-nums">{safeTotal.toLocaleString()} total</span>
      </div>
      <div
        className="flex w-full h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        {segs.map((s) => (
          <div
            key={s.k}
            style={{ width: `${(s.n / safeTotal) * 100}%`, background: s.hue }}
            className="h-full"
            title={`${s.k}: ${s.n}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {segs.map((s) => {
          const segPct = Math.round((s.n / safeTotal) * 100);
          return (
            <div key={s.k} className="flex items-center gap-1.5 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.hue }} />
              <span className="flex-1" style={{ color: 'var(--fg-muted)' }}>{s.k}</span>
              <span className="tabular-nums font-bold" style={{ color: 'var(--fg-default)' }}>{s.n}</span>
              <span
                className="tabular-nums text-[9px] w-7 text-right"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {segPct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
