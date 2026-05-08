import { GitCompareArrows } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { diffInDiff } from './statsKit';
import { useV2 } from './tokens';
import { V2Card, SectionTitle } from './primitives';

// Counterfactual impact via Difference-in-Differences. Pre/post means
// alone are misleading because the underlying environment moves with
// time (more PRs in Q4, new framework rolls out, etc). DiD subtracts
// the *control* group's same-window delta from the *treated* group's
// delta, isolating the rule's marginal effect.
//
// Visual: two pairs of mean dots connected by lines. Slope of the
// treated line vs the control line literally is the effect; we draw
// the gap between them to make ATE pop without reading the legend.
//
// Reference: Card & Krueger 1994, MIT 14.387, Google PAIR causality.

type Props = {
  treatedBefore: number[];
  treatedAfter: number[];
  controlBefore: number[];
  controlAfter: number[];
  metricLabel: string;
  // Lower-is-better metrics flip the bar color so "improvement" reads
  // green even when ATE is mathematically negative.
  lowerIsBetter?: boolean;
};

export function CounterfactualImpactCard({
  treatedBefore, treatedAfter, controlBefore, controlAfter,
  metricLabel, lowerIsBetter = false,
}: Props) {
  const { t } = useTranslation('admission');
  const v = useV2();
  const did = diffInDiff(treatedBefore, treatedAfter, controlBefore, controlAfter);

  const win = lowerIsBetter ? did.ate < 0 : did.ate > 0;
  // Significance: 95% CI excludes zero.
  const significant = did.loCI > 0 || did.hiCI < 0;
  const accent = !significant ? v.textFaint : (win ? v.ok : '#d98a85');

  const W = 240;
  const H = 96;
  const padX = 26;
  const padY = 14;
  const padBottom = 18;

  const allMeans = [did.beforeT, did.afterT, did.beforeC, did.afterC];
  const lo = Math.min(...allMeans);
  const hi = Math.max(...allMeans);
  const range = Math.max(0.01, hi - lo);
  const yAt = (val: number) =>
    padY + ((hi - val) / range) * (H - padY - padBottom);
  const xBefore = padX;
  const xAfter = W - padX;

  const tBeforeY = yAt(did.beforeT);
  const tAfterY = yAt(did.afterT);
  const cBeforeY = yAt(did.beforeC);
  const cAfterY = yAt(did.afterC);

  return (
    <V2Card className="p-4">
      <SectionTitle icon={GitCompareArrows}>
        {t('counterfactual.title', { defaultValue: 'Counterfactual impact' })}
      </SectionTitle>

      <div className="text-[9px] font-mono mt-0.5"
           style={{ color: v.textFaint }}>
        {t('counterfactual.sub', {
          defaultValue: 'Difference-in-differences · 95% CI',
        })}
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span
          className="text-[28px] font-black tabular-nums leading-none"
          style={{ color: accent }}
        >
          {did.ate >= 0 ? '+' : ''}{did.ate.toFixed(2)}
        </span>
        <span
          className="text-[9px] font-mono"
          style={{ color: accent }}
        >
          ATE · {significant
            ? t('counterfactual.significant', { defaultValue: 'significant' })
            : t('counterfactual.notSignificant', { defaultValue: 'not significant' })}
        </span>
      </div>

      <div className="text-[9px] font-mono mt-0.5"
           style={{ color: v.textFaint }}>
        {metricLabel} · 95% CI [{did.loCI.toFixed(2)}, {did.hiCI.toFixed(2)}]
      </div>

      {/* Two-line plot. SVG height is pinned in pixels and the viewBox is
          large enough that hard-coded font sizes (7–8px in user space)
          render at sensible pixel sizes after scaling. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full mt-3"
        style={{ height: 96 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Period dividers */}
        {['before', 'after'].map((label, i) => {
          const x = i === 0 ? xBefore : xAfter;
          return (
            <text
              key={label}
              x={x}
              y={H - 4}
              fontSize={9}
              fontFamily="ui-monospace, monospace"
              fill={v.textFaint}
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}

        {/* Control line — dashed, neutral */}
        <line
          x1={xBefore} y1={cBeforeY}
          x2={xAfter}  y2={cAfterY}
          stroke={v.textFaint}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle cx={xBefore} cy={cBeforeY} r={2.5}
                fill={v.textFaint} />
        <circle cx={xAfter} cy={cAfterY} r={2.5}
                fill={v.textFaint} />

        {/* Treated line — solid, accent */}
        <line
          x1={xBefore} y1={tBeforeY}
          x2={xAfter}  y2={tAfterY}
          stroke={accent}
          strokeWidth={1.5}
        />
        <circle cx={xBefore} cy={tBeforeY} r={3} fill={accent} />
        <circle cx={xAfter}  cy={tAfterY}  r={3} fill={accent} />

        {/* Effect gap — vertical guide at "after" */}
        <line
          x1={xAfter + 8} y1={tAfterY}
          x2={xAfter + 8} y2={cAfterY}
          stroke={accent}
          strokeWidth={1}
          strokeDasharray="1 2"
          opacity={0.7}
        />
      </svg>

      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-mono"
           style={{ color: v.textFaint }}>
        <span>
          <span className="inline-block w-2 h-px mr-1" style={{ background: accent }} />
          {t('counterfactual.treated', { defaultValue: 'Treated' })} (n={did.nT})
        </span>
        <span>
          <span className="inline-block w-2 h-px mr-1 border-t border-dashed"
                style={{ borderColor: v.textFaint }} />
          {t('counterfactual.control', { defaultValue: 'Control' })} (n={did.nC})
        </span>
      </div>
    </V2Card>
  );
}
