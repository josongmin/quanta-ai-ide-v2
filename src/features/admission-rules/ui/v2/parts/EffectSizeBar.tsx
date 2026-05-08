import { Scale } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { cohensD } from './statsKit';
import { useV2 } from './tokens';
import { V2Card, SectionTitle } from './primitives';

// Cohen's d effect-size bar. Quantifies how much a rule moved a metric
// (e.g. pre-rollout vs post-rollout pass-rates, or rule-fired vs
// rule-skipped PR's defect counts) using a *standardised* mean
// difference, so two metrics on different scales become comparable.
// Cohen 1988 bands:  <0.2 negligible · <0.5 small · <0.8 medium · ≥0.8 large
//
// Why d, not raw delta: a 5pp move on a noisy metric is meaningless;
// a 0.3-pp move on a stable one might be huge. d normalises by the
// pooled standard deviation, so the picture stays calibrated.

type Props = {
  // Two distributions to compare. e.g. defect counts before / after
  // adopting the rule, or fail-rates with / without the rule active.
  before: number[];
  after: number[];
  metricLabel: string;
  // Lower-is-better metrics get the d sign flipped at display time so
  // "improvement" always reads as a green positive bar.
  lowerIsBetter?: boolean;
};

export function EffectSizeBar({
  before, after, metricLabel, lowerIsBetter = false,
}: Props) {
  const { t } = useTranslation('admission');
  const v = useV2();
  const eff = cohensD(before, after);
  // For lower-is-better metrics the *reduction* is the win.
  const displayD = lowerIsBetter ? -eff.d : eff.d;
  const win = displayD > 0;

  const bandLabel =
    eff.band === 'negligible' ? t('effect.band.negligible', { defaultValue: 'Negligible' }) :
    eff.band === 'small'      ? t('effect.band.small',      { defaultValue: 'Small' }) :
    eff.band === 'medium'     ? t('effect.band.medium',     { defaultValue: 'Medium' }) :
                                t('effect.band.large',      { defaultValue: 'Large' });

  // Map d to bar position. We render a centered bar [-2, +2] with bands.
  const clamped = Math.max(-2, Math.min(2, displayD));
  const pct = ((clamped + 2) / 4) * 100;

  const accentColor = win ? v.ok : '#d98a85';
  const dimAccent = eff.band === 'negligible' ? v.textFaint : accentColor;

  return (
    <V2Card className="p-4">
      <SectionTitle icon={Scale}>
        {t('effect.title', { defaultValue: 'Effect size · Cohen’s d' })}
      </SectionTitle>

      <div className="text-[9px] font-mono mt-0.5"
           style={{ color: v.textFaint }}>
        {metricLabel} ·
        n<sub>before</sub>={before.length} ·
        n<sub>after</sub>={after.length}
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span
          className="text-[28px] font-black tabular-nums leading-none"
          style={{ color: dimAccent }}
        >
          {displayD >= 0 ? '+' : ''}{displayD.toFixed(2)}
        </span>
        <span
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: dimAccent }}
        >
          {bandLabel}
        </span>
      </div>

      {/* Effect-size bar with band dividers at ±0.2 / ±0.5 / ±0.8 */}
      <div className="relative mt-3 h-2 rounded-full"
           style={{ background: v.inset }}>
        {[ -0.8, -0.5, -0.2, 0.2, 0.5, 0.8 ].map((b) => (
          <div
            key={b}
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${((b + 2) / 4) * 100}%`,
              background: v.borderSoft,
            }}
          />
        ))}
        <div
          className="absolute top-0 bottom-0 w-1 rounded-full"
          style={{
            left: `calc(${pct}% - 2px)`,
            background: dimAccent,
            boxShadow: `0 0 8px ${dimAccent}`,
          }}
        />
        {/* Zero line — center marker */}
        <div
          className="absolute top-[-2px] bottom-[-2px] w-px"
          style={{
            left: '50%',
            background: v.textFaint,
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-1 text-[8.5px] font-mono"
           style={{ color: v.textFaint }}>
        <span>−2σ</span>
        <span>0</span>
        <span>+2σ</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[9.5px] font-mono">
        <span style={{ color: v.textFaint }}>
          μ<sub>before</sub>: <span style={{ color: v.textBody }}>{eff.meanA.toFixed(2)}</span>
        </span>
        <span style={{ color: v.textFaint }}>
          μ<sub>after</sub>: <span style={{ color: v.textBody }}>{eff.meanB.toFixed(2)}</span>
        </span>
      </div>
    </V2Card>
  );
}
