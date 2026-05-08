import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { ewma, zscoreSeries } from './statsKit';
import { useV2 } from './tokens';
import { V2Card, SectionTitle } from './primitives';

// Anomaly sentinel — turns a 30-day daily-fire series into a control
// chart: raw points + an EWMA trend (α = 0.3, the textbook default
// for control charting), with any |z| ≥ 2 point flagged red. Z-score
// is computed against a *trailing* window so today doesn't include
// itself in its baseline. This is the same pattern Datadog / Grafana
// "anomaly detection" widgets and SPC charts use.

type Props = {
  // Daily counts for the last N days (oldest → newest).
  daily: number[];
  label?: string;
};

export function AnomalySentinel({ daily, label }: Props) {
  const { t } = useTranslation('admission');
  const v = useV2();

  const { trend, z, anomalies } = useMemo(() => {
    const trend = ewma(daily, 0.3);
    const z = zscoreSeries(daily, 7, 2);
    const anomalies = z.filter((p) => p.anomaly).length;
    return { trend, z, anomalies };
  }, [daily]);

  const W = 320;
  const H = 80;
  const padX = 6;
  const padY = 8;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const max = Math.max(1, ...daily, ...trend);
  const xAt = (i: number) =>
    padX + (i / Math.max(1, daily.length - 1)) * innerW;
  const yAt = (val: number) =>
    padY + innerH - (val / max) * innerH;

  const trendPath = trend.length === 0
    ? ''
    : trend
        .map((val, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)} ${yAt(val).toFixed(2)}`)
        .join(' ');

  return (
    <V2Card className="p-4">
      <SectionTitle icon={Activity}>
        {t('anomaly.title', { defaultValue: 'Anomaly sentinel' })}
      </SectionTitle>

      <div className="text-[9px] font-mono mt-0.5"
           style={{ color: v.textFaint }}>
        {label ?? t('anomaly.sub', {
          defaultValue: '30 d · EWMA α=0.3 · |z|≥2 flagged',
        })}
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span
          className="text-[28px] font-black tabular-nums leading-none"
          style={{ color: anomalies > 0 ? '#d98a85' : v.textHi }}
        >
          {anomalies}
        </span>
        <span className="text-[10px] font-mono"
              style={{ color: v.textFaint }}>
          {t('anomaly.outliers', {
            n: daily.length,
            defaultValue: `outliers in ${daily.length} d`,
          })}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full mt-2"
        style={{ height: 80 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Subtle gridline at the mean of trend */}
        <line
          x1={padX} y1={H / 2} x2={W - padX} y2={H / 2}
          stroke={v.borderSoft}
          strokeWidth={0.5}
          strokeDasharray="2 3"
        />

        {/* Daily bars */}
        {daily.map((val, i) => {
          const x = xAt(i);
          const y = yAt(val);
          const isAnom = z[i]?.anomaly;
          const barW = Math.max(1.5, (innerW / Math.max(1, daily.length)) * 0.65);
          return (
            <rect
              key={i}
              x={x - barW / 2}
              y={y}
              width={barW}
              height={padY + innerH - y}
              fill={isAnom ? '#d98a85' : v.borderSoft}
              opacity={isAnom ? 0.9 : 0.85}
              rx={0.5}
            />
          );
        })}

        {/* EWMA trend line */}
        {trendPath && (
          <path
            d={trendPath}
            stroke={v.accent}
            strokeWidth={1.2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Anomaly markers (rings on top) */}
        {z.map((p, i) =>
          p.anomaly ? (
            <circle
              key={`a${i}`}
              cx={xAt(i)}
              cy={yAt(p.value)}
              r={2.5}
              fill="none"
              stroke="#d98a85"
              strokeWidth={1}
            />
          ) : null,
        )}
      </svg>

      <div className="mt-2 flex items-center gap-2 text-[8.5px] font-mono"
           style={{ color: v.textFaint }}>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-px"
                style={{ background: v.accent }} />
          {t('anomaly.legend.trend', { defaultValue: 'EWMA' })}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: '#d98a85' }} />
          {t('anomaly.legend.anom', { defaultValue: '|z| ≥ 2' })}
        </span>
        <span className="ml-auto">
          σ ≈ {(z.reduce((s, p) => s + (p.std || 0), 0) / Math.max(1, z.length)).toFixed(2)}
        </span>
      </div>
    </V2Card>
  );
}
