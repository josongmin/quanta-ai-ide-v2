import { useMemo } from 'react';
import { TrendingDown } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { kaplanMeier, medianSurvival, type SurvivalEvent } from './statsKit';
import { useV2 } from './tokens';
import { V2Card, SectionTitle } from './primitives';

// Kaplan-Meier survival curve for "time-to-merge" of admission-gated
// PRs. Right-censored data (PRs still open at the observation cutoff)
// are handled correctly by the product-limit estimator. The 95% CI
// band uses Greenwood's formula and gets wider as fewer PRs remain
// at risk — the natural visual hint that the tail is uncertain.
//
// Median time-to-merge is annotated as a single dropline; that's the
// number engineering managers actually want.
//
// Reference: Kaplan & Meier 1958 (most-cited paper in statistics).

type Props = {
  // Event series. `time` is hours-to-merge or hours-to-cutoff.
  events: SurvivalEvent[];
  // Optional secondary cohort (e.g. "PRs touched by rule X" vs "all
  // others") for split-curve comparison.
  control?: SurvivalEvent[];
  cohortLabel?: string;
  controlLabel?: string;
  // Display-friendly name of the time unit.
  timeUnit?: string;
};

export function SurvivalCurveCard({
  events, control, cohortLabel, controlLabel, timeUnit = 'h',
}: Props) {
  const { t } = useTranslation('admission');
  const v = useV2();

  const treated = useMemo(() => kaplanMeier(events), [events]);
  const ctrl = useMemo(
    () => (control ? kaplanMeier(control) : []),
    [control],
  );

  const tMedian = useMemo(() => medianSurvival(treated), [treated]);
  const cMedian = useMemo(() => medianSurvival(ctrl), [ctrl]);

  const W = 320;
  const H = 140;
  const padL = 32;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const tMaxTime = useMemo(() => {
    let m = 0;
    for (const p of treated) m = Math.max(m, p.t);
    for (const p of ctrl) m = Math.max(m, p.t);
    return Math.max(1, m);
  }, [treated, ctrl]);

  const xAt = (t: number) => padL + (t / tMaxTime) * innerW;
  const yAt = (s: number) => padT + (1 - s) * innerH;

  const stepPath = (curve: typeof treated): string => {
    if (curve.length === 0) return '';
    const parts: string[] = [];
    parts.push(`M ${xAt(curve[0].t).toFixed(2)} ${yAt(1).toFixed(2)}`);
    for (let i = 0; i < curve.length; i++) {
      const p = curve[i];
      const next = curve[i + 1];
      parts.push(`L ${xAt(p.t).toFixed(2)} ${yAt(p.s).toFixed(2)}`);
      if (next) {
        parts.push(`L ${xAt(next.t).toFixed(2)} ${yAt(p.s).toFixed(2)}`);
      }
    }
    return parts.join(' ');
  };

  const ciBandPath = (curve: typeof treated): string => {
    if (curve.length === 0) return '';
    const top: string[] = [];
    const bot: string[] = [];
    for (let i = 0; i < curve.length; i++) {
      const p = curve[i];
      const next = curve[i + 1];
      top.push(`L ${xAt(p.t).toFixed(2)} ${yAt(p.hiCI).toFixed(2)}`);
      bot.push(`L ${xAt(p.t).toFixed(2)} ${yAt(p.loCI).toFixed(2)}`);
      if (next) {
        top.push(`L ${xAt(next.t).toFixed(2)} ${yAt(p.hiCI).toFixed(2)}`);
        bot.push(`L ${xAt(next.t).toFixed(2)} ${yAt(p.loCI).toFixed(2)}`);
      }
    }
    return `M ${xAt(curve[0].t).toFixed(2)} ${yAt(1).toFixed(2)} ${top.join(' ')} ${bot.reverse().join(' ')} Z`;
  };

  return (
    <V2Card className="p-4">
      <SectionTitle icon={TrendingDown}>
        {t('survival.title', { defaultValue: 'Time-to-merge survival' })}
      </SectionTitle>

      <div className="text-2xs font-mono mt-0.5"
           style={{ color: v.textFaint }}>
        {t('survival.sub', {
          defaultValue: 'Kaplan-Meier · Greenwood 95% CI band',
        })}
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span
          className="text-3xl font-black tabular-nums leading-none"
          style={{ color: v.textHi }}
        >
          {tMedian == null ? '—' : `${tMedian.toFixed(1)}${timeUnit}`}
        </span>
        <span className="text-2xs font-mono"
              style={{ color: v.textFaint }}>
          {t('survival.median', { defaultValue: 'median' })}
        </span>
        {cMedian != null && ctrl.length > 0 && (
          <span className="ml-auto text-2xs font-mono"
                style={{ color: v.textFaint }}>
            {t('survival.vs', { defaultValue: 'vs' })} {cMedian.toFixed(1)}{timeUnit}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full mt-2"
        style={{ height: 140 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis ticks at 0, 0.25, 0.5, 0.75, 1 */}
        {[0, 0.25, 0.5, 0.75, 1].map((s) => (
          <g key={s}>
            <line x1={padL} y1={yAt(s)} x2={W - padR} y2={yAt(s)}
                  stroke={v.borderSoft} strokeWidth={0.5}
                  strokeDasharray="2 3" />
            <text x={padL - 4} y={yAt(s) + 3}
                  fontSize={8.5}
                  fontFamily="ui-monospace, monospace"
                  fill={v.textFaint}
                  textAnchor="end">
              {(s * 100).toFixed(0)}
            </text>
          </g>
        ))}

        {/* Control band + curve (drawn first so treated paints on top) */}
        {ctrl.length > 0 && (
          <>
            <path d={ciBandPath(ctrl)}
                  fill={v.textFaint} opacity={0.10} />
            <path d={stepPath(ctrl)}
                  fill="none"
                  stroke={v.textFaint}
                  strokeWidth={1.2}
                  strokeDasharray="3 3"
                  strokeLinejoin="miter" />
          </>
        )}

        {/* Treated band + curve */}
        <path d={ciBandPath(treated)}
              fill={v.accent} opacity={0.18} />
        <path d={stepPath(treated)}
              fill="none"
              stroke={v.accent}
              strokeWidth={1.6}
              strokeLinejoin="miter" />

        {/* Median dropline */}
        {tMedian != null && (
          <g>
            <line x1={xAt(tMedian)} y1={yAt(0.5)}
                  x2={xAt(tMedian)} y2={yAt(0)}
                  stroke={v.textFaint}
                  strokeWidth={0.8}
                  strokeDasharray="1 2" />
            <line x1={padL} y1={yAt(0.5)}
                  x2={xAt(tMedian)} y2={yAt(0.5)}
                  stroke={v.textFaint}
                  strokeWidth={0.8}
                  strokeDasharray="1 2" />
          </g>
        )}

        {/* X-axis */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB}
              stroke={v.borderSoft} strokeWidth={0.6} />
        <text x={padL} y={H - 6}
              fontSize={8.5}
              fontFamily="ui-monospace, monospace"
              fill={v.textFaint}>0</text>
        <text x={W - padR} y={H - 6}
              fontSize={8.5}
              fontFamily="ui-monospace, monospace"
              fill={v.textFaint}
              textAnchor="end">
          {tMaxTime.toFixed(0)}{timeUnit}
        </text>
      </svg>

      <div className="mt-1 flex items-center gap-3 text-2xs font-mono"
           style={{ color: v.textFaint }}>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-px"
                style={{ background: v.accent }} />
          {cohortLabel ?? t('survival.legend.treated', { defaultValue: 'rule fired' })}
        </span>
        {ctrl.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-px border-t border-dashed"
                  style={{ borderColor: v.textFaint }} />
            {controlLabel ?? t('survival.legend.control', { defaultValue: 'rule skipped' })}
          </span>
        )}
        <span className="ml-auto">
          n={events.length}
          {ctrl.length > 0 ? ` / ${ctrl.length}` : ''}
        </span>
      </div>
    </V2Card>
  );
}
