import { memo } from 'react';
import { C } from '../lib/color';
import { useTranslation } from '@shared/i18n';

export type ScoreTrend = { dir: 'up' | 'down' | 'flat'; delta: number };

// Score is the headline gauge — appears multiple times per panel. All props
// are primitives except `trend`, and the only callsite that supplies one
// reads it from a memoized stats object so its identity is stable.
export const Score = memo(function Score({
  label, value, hero = false, diverging = false, trend,
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  isDark: _isDark,
}: {
  label: string;
  value: number;
  isDark?: boolean;
  // `hero` controls *typographic* weight (big number, grade label).
  // `diverging` controls *gauge style* (faint red→amber→green track + marker
  // vs. simple solid fill). They're orthogonal: only one diverging gauge
  // should appear per panel — repeating the same chart grammar back-to-back
  // makes the eye treat them as a single chart.
  hero?: boolean;
  diverging?: boolean;
  trend?: ScoreTrend;
}) {
  const { t } = useTranslation('common');
  const color =
    value >= 70 ? C.ok :
    value >= 40 ? C.warning : C.critical;
  const gradeKey =
    value >= 70 ? 'good' :
    value >= 40 ? 'fair' : 'poor';
  const grade = t(`grade.${gradeKey}`);
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={hero ? 'mb-1' : ''}>
      <div className={`flex items-baseline justify-between mb-1.5`}>
        <span
          className={hero ? 'text-[11px] font-bold' : 'text-[10px]'}
          style={{ color: 'var(--fg-default)' }}
        >{label}</span>
        <div className="flex items-baseline gap-1.5">
          {hero && trend && trend.dir !== 'flat' && (
            <span
              className="text-[9px] font-bold tabular-nums"
              style={{
                color: trend.dir === 'up'
                  ? 'var(--intent-success-vivid)'
                  : 'var(--intent-danger-vivid)',
              }}
              title={t('score.vsLastWeek')}
            >
              {trend.dir === 'up' ? '▲' : '▼'} {Math.abs(trend.delta)}
            </span>
          )}
          {hero && (
            <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
              {grade}
            </span>
          )}
          <span
            className={`font-black tabular-nums ${hero ? 'text-[18px]' : 'text-[12px]'} leading-none`}
            style={{ color }}
          >
            {value}
          </span>
        </div>
      </div>
      {diverging ? (
        // Diverging gauge: faint reference gradient + a bright marker at value.
        // Avoids painting half the bar saturated red, which would dominate
        // the visual field even when value is fine.
        <div className="relative">
          <div
            className={`w-full h-2 rounded-full overflow-hidden`}
            style={{
              background: `linear-gradient(90deg,
                ${C.critical}33 0%,
                ${C.critical}33 30%,
                ${C.warning}33 50%,
                ${C.ok}33 70%,
                ${C.ok}33 100%)`,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-[3px] h-3 rounded-sm shadow-md"
            style={{
              left: `calc(${clamped}% - 1.5px)`,
              background: color,
              boxShadow: `0 0 6px ${color}99`,
            }}
          />
        </div>
      ) : (
        <div
          className={`w-full h-1.5 rounded-full overflow-hidden`}
          style={{ background: 'var(--bg-surface-muted)' }}
        >
          <div
            style={{ width: `${clamped}%`, background: color }}
            className="h-full rounded-full transition-all"
          />
        </div>
      )}
    </div>
  );
});
