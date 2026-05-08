import { useMemo } from 'react';
import { Waves } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { cusum } from './statsKit';
import { useV2 } from './tokens';
import { V2Card, SectionTitle } from './primitives';

// Tabular CUSUM control chart. Where EWMA tells you "today is a bit
// low," CUSUM tells you "we crossed below baseline starting on day 11
// and haven't recovered." The change-point estimate is the killer
// feature — a single timestamp marking when the drift began, derived
// from the latest reset of the alarming arm before threshold.
//
// Convention here: positive arm in green (improvement), negative arm
// in red (degradation). H = 4σ, K = 0.5σ — standard 6-Sigma defaults.
//
// Reference: Page 1954, Montgomery's "Introduction to Statistical
// Quality Control" (Chapter 9).

type Props = {
  // Daily series. Higher-is-worse semantics is the default; we draw
  // the negative arm in green when the metric is "lower-is-better"
  // by passing `lowerIsBetter`.
  daily: number[];
  lowerIsBetter?: boolean;
  metricLabel?: string;
};

export function CusumDriftCard({ daily, lowerIsBetter = false, metricLabel }: Props) {
  const { t } = useTranslation('admission');
  const v = useV2();

  const result = useMemo(() => cusum(daily), [daily]);

  // For lower-is-better, a positive CUSUM means the metric is climbing
  // (bad); for higher-is-better, a negative CUSUM is bad. We always
  // colour the *bad* arm red regardless of sign convention.
  const badArm: 'pos' | 'neg' = lowerIsBetter ? 'pos' : 'neg';

  const W = 320;
  const H = 130;
  const padL = 28;
  const padR = 10;
  const padT = 12;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxArm = Math.max(
    result.H * 1.2,
    ...result.points.map((p) => Math.max(p.cuPos, p.cuNeg)),
  ) || 1;

  const xAt = (i: number) =>
    padL + (i / Math.max(1, result.points.length - 1)) * innerW;
  const yAt = (val: number, sign: 1 | -1) =>
    padT + innerH / 2 - (sign * val / maxArm) * (innerH / 2);

  const pathFor = (sign: 1 | -1) => {
    if (result.points.length === 0) return '';
    const parts: string[] = [];
    for (let i = 0; i < result.points.length; i++) {
      const v = sign === 1 ? result.points[i].cuPos : result.points[i].cuNeg;
      parts.push(`${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)} ${yAt(v, sign).toFixed(2)}`);
    }
    return parts.join(' ');
  };

  const alarmHi = result.points.some((p) => p.alarmHi);
  const alarmLo = result.points.some((p) => p.alarmLo);
  const anyAlarm = alarmHi || alarmLo;

  // Signed-correctly headline. If the bad arm is alarming, headline
  // turns red; if both arms quiet, neutral.
  const accent = !anyAlarm ? v.textHi
    : (badArm === 'pos' ? alarmHi : alarmLo) ? '#d98a85' : v.ok;

  return (
    <V2Card className="p-4">
      <SectionTitle icon={Waves}>
        {t('cusum.title', { defaultValue: 'CUSUM drift detector' })}
      </SectionTitle>

      <div className="text-[9px] font-mono mt-0.5"
           style={{ color: v.textFaint }}>
        {t('cusum.sub', {
          defaultValue: 'Tabular CUSUM · K = 0.5σ · H = 4σ',
        })}
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span
          className="text-[24px] font-black tabular-nums leading-none"
          style={{ color: accent }}
        >
          {result.changePoint == null
            ? t('cusum.stable', { defaultValue: 'stable' })
            : `Δ@${result.changePoint}`}
        </span>
        <span className="text-[9px] font-mono"
              style={{ color: v.textFaint }}>
          {result.changePoint == null
            ? t('cusum.noAlarm', { defaultValue: 'no alarm' })
            : t('cusum.changePoint', {
                defaultValue: 'change point detected',
              })}
        </span>
      </div>

      {metricLabel && (
        <div className="text-[9px] font-mono mt-0.5"
             style={{ color: v.textFaint }}>
          {metricLabel}
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full mt-2"
        style={{ height: 130 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* H boundary band (dashed) — top and bottom */}
        <line x1={padL} y1={yAt(result.H, 1)} x2={W - padR} y2={yAt(result.H, 1)}
              stroke={v.borderSoft} strokeDasharray="2 3" strokeWidth={0.5} />
        <line x1={padL} y1={yAt(result.H, -1)} x2={W - padR} y2={yAt(result.H, -1)}
              stroke={v.borderSoft} strokeDasharray="2 3" strokeWidth={0.5} />

        {/* Zero baseline */}
        <line x1={padL} y1={padT + innerH / 2} x2={W - padR} y2={padT + innerH / 2}
              stroke={v.borderSoft} strokeWidth={0.6} />

        {/* Change-point shading */}
        {result.changePoint != null && (
          <rect
            x={xAt(result.changePoint)}
            y={padT}
            width={Math.max(2, xAt(result.points.length - 1) - xAt(result.changePoint))}
            height={innerH}
            fill={badArm === 'pos' ? (alarmHi ? '#d98a85' : v.ok) : (alarmLo ? '#d98a85' : v.ok)}
            opacity={0.08}
          />
        )}

        {/* Positive arm */}
        <path d={pathFor(1)}
              fill="none"
              stroke={badArm === 'pos' ? '#d98a85' : v.ok}
              strokeWidth={1.4} />
        {/* Negative arm */}
        <path d={pathFor(-1)}
              fill="none"
              stroke={badArm === 'neg' ? '#d98a85' : v.ok}
              strokeWidth={1.4} />

        {/* Y-axis labels */}
        <text x={padL - 4} y={padT + 8}
              fontSize={9}
              fontFamily="ui-monospace, monospace"
              fill={v.textFaint}
              textAnchor="end">+H</text>
        <text x={padL - 4} y={padT + innerH - 1}
              fontSize={9}
              fontFamily="ui-monospace, monospace"
              fill={v.textFaint}
              textAnchor="end">−H</text>
      </svg>

      <div className="mt-1 flex items-center gap-3 text-[9px] font-mono"
           style={{ color: v.textFaint }}>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-px"
                style={{ background: badArm === 'pos' ? '#d98a85' : v.ok }} />
          C+
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-px"
                style={{ background: badArm === 'neg' ? '#d98a85' : v.ok }} />
          C−
        </span>
        <span className="ml-auto">
          σ ≈ {(result.K / 0.5).toFixed(2)}
        </span>
      </div>
    </V2Card>
  );
}
