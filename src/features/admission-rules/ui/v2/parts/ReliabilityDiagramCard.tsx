import { useMemo } from 'react';
import { Crosshair } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { reliability } from './statsKit';
import { useV2 } from './tokens';
import { V2Card, SectionTitle } from './primitives';

// Reliability diagram + Expected Calibration Error (ECE).
// Bins predictions by their own confidence and compares each bin's
// mean confidence to the bin's observed positive rate. A perfectly
// calibrated classifier sits exactly on the y = x diagonal.
//
// Bars above the diagonal = under-confident (we said 30% but were
// right 50% of the time); bars below = over-confident (the more
// dangerous failure mode for a gating system: we said "definitely
// block" but the PR was actually fine).
//
// ECE summarises the gap as a single number: the bin-weighted average
// of |confidence − accuracy|. Lower is better; <0.05 is "well
// calibrated" by Guo et al. 2017.
//
// Reference: DeGroot & Fienberg 1983; Niculescu-Mizil & Caruana 2005;
// Guo, Pleiss, Sun, Weinberger 2017 ("On Calibration of Modern Neural
// Networks").

type Props = {
  // Each prediction has a confidence p ∈ [0, 1] and a binary outcome.
  predictions: { p: number; outcome: 0 | 1 }[];
  nBins?: number;
};

export function ReliabilityDiagramCard({ predictions, nBins = 10 }: Props) {
  const { t } = useTranslation('admission');
  const v = useV2();
  const result = useMemo(
    () => reliability(predictions, nBins),
    [predictions, nBins],
  );

  const W = 240;
  const H = 170;
  const padL = 30;
  const padR = 10;
  const padT = 12;
  const padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xAt = (p: number) => padL + p * innerW;
  const yAt = (p: number) => padT + (1 - p) * innerH;

  // ECE color band: ≤0.05 great, ≤0.10 ok, ≤0.20 warn, > danger.
  const eceColor =
    result.ece <= 0.05 ? v.ok :
    result.ece <= 0.10 ? '#c5a155' :
    result.ece <= 0.20 ? '#d98a85' :
                         '#a83a3f';

  return (
    <V2Card className="p-4">
      <SectionTitle icon={Crosshair}>
        {t('reliability.title', { defaultValue: 'Reliability diagram' })}
      </SectionTitle>

      <div className="text-2xs font-mono mt-0.5"
           style={{ color: v.textFaint }}>
        {t('reliability.sub', {
          n: nBins,
          defaultValue: `${nBins}-bin · expected calibration error`,
        })}
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span
          className="text-4xl font-black tabular-nums leading-none"
          style={{ color: eceColor }}
        >
          {result.ece.toFixed(3)}
        </span>
        <span className="text-2xs font-mono uppercase tracking-[0.16em]"
              style={{ color: eceColor }}>
          ECE
        </span>
        <span className="ml-auto text-2xs font-mono"
              style={{ color: v.textFaint }}>
          n={result.totalN}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full mt-2"
        style={{ height: 170 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Diagonal — perfect calibration */}
        <line
          x1={xAt(0)} y1={yAt(0)} x2={xAt(1)} y2={yAt(1)}
          stroke={v.borderSoft}
          strokeWidth={0.6}
          strokeDasharray="2 3"
        />

        {/* Per-bin bars: confidence on x, observed rate on y, drawn
            as a small rect with width = bin and height = (observed -
            confidence). Below diagonal → red (over-confident). */}
        {result.bins.map((b, i) => {
          if (b.count === 0) return null;
          const cx = xAt(b.meanConfidence);
          const yObs = yAt(b.observedRate);
          const yConf = yAt(b.meanConfidence);
          const overConfident = b.observedRate < b.meanConfidence;
          const color = overConfident ? '#d98a85' : v.ok;
          const barWidth = Math.max(2, innerW / nBins - 2);
          // Connect the dots and shade the gap.
          return (
            <g key={i}>
              <line
                x1={cx} y1={yConf} x2={cx} y2={yObs}
                stroke={color}
                strokeWidth={Math.max(1, Math.min(8, b.count * 0.3))}
                opacity={0.55}
              />
              <circle
                cx={cx}
                cy={yObs}
                r={Math.max(1.5, Math.min(4, b.count * 0.15 + 1.5))}
                fill={color}
                stroke={v.cardBacking}
                strokeWidth={0.5}
              />
              {/* Bin tick on x-axis showing population */}
              <rect
                x={xAt(b.lo) + 1}
                y={H - padB + 2}
                width={barWidth - 2}
                height={Math.max(1, Math.min(8, b.count * 0.3))}
                fill={v.borderSoft}
                opacity={0.85}
              />
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB}
              stroke={v.borderSoft} strokeWidth={0.6} />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB}
              stroke={v.borderSoft} strokeWidth={0.6} />
        <text x={padL - 4} y={padT + 5}
              fontSize={8.5}
              fontFamily="ui-monospace, monospace"
              fill={v.textFaint}
              textAnchor="end">1</text>
        <text x={padL - 4} y={H - padB + 2}
              fontSize={8.5}
              fontFamily="ui-monospace, monospace"
              fill={v.textFaint}
              textAnchor="end">0</text>
        <text x={padL} y={H - 6}
              fontSize={8.5}
              fontFamily="ui-monospace, monospace"
              fill={v.textFaint}>conf</text>
        <text x={W - padR} y={H - 6}
              fontSize={8.5}
              fontFamily="ui-monospace, monospace"
              fill={v.textFaint}
              textAnchor="end">1.0</text>
      </svg>

      <div className="mt-1 grid grid-cols-2 gap-x-3 text-2xs font-mono"
           style={{ color: v.textFaint }}>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: '#d98a85' }} />
          {t('reliability.over', { defaultValue: 'over-confident' })}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: v.ok }} />
          {t('reliability.under', { defaultValue: 'under-confident' })}
        </span>
      </div>
    </V2Card>
  );
}
