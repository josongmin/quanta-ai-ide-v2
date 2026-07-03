import { Sigma } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { wilson } from './statsKit';
import { useV2 } from './tokens';
import { V2Card, SectionTitle } from './primitives';

// Wilson-interval pass-rate band. Replaces the bare "passes / total"
// counter with a 95% confidence interval — the gate's *true* pass-rate,
// given the sample we've seen. Width of the band = how confident we
// are; small N produces a wide band even at extreme rates, which is
// honest. Source: Wilson 1927, recommended by NIST handbook over the
// naive Wald interval especially when the rate is near 0 or 1.

type Props = {
  passes: number;
  total: number;
  level?: 0.95 | 0.99;
};

export function ConfidenceBand({ passes, total, level = 0.95 }: Props) {
  const { t } = useTranslation('admission');
  const v = useV2();
  const z = level === 0.99 ? 2.576 : 1.96;
  const ci = wilson(passes, total, z);

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  const loPct = ci.lo * 100;
  const hiPct = ci.hi * 100;
  const pointPct = ci.point * 100;
  const bandWidth = Math.max(0.5, hiPct - loPct);

  return (
    <V2Card className="p-4">
      <SectionTitle icon={Sigma}>
        {t('confidence.title', { defaultValue: 'Pass-rate confidence' })}
      </SectionTitle>

      <div className="text-2xs font-mono mt-0.5"
           style={{ color: v.textFaint }}>
        {t('confidence.sub', {
          level: Math.round(level * 100),
          z: z.toFixed(2),
          defaultValue: `Wilson ${Math.round(level * 100)}% CI · z = ${z.toFixed(2)}`,
        })}
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span
          className="text-4xl font-black tabular-nums leading-none"
          style={{ color: v.textHi }}
        >
          {pct(ci.point)}
        </span>
        <span className="text-xs font-mono"
              style={{ color: v.textFaint }}>
          {passes}/{total}
        </span>
      </div>

      <div className="relative mt-3 h-2 rounded-full"
           style={{ background: v.inset }}>
        <div
          className="absolute h-full rounded-full"
          style={{
            left: `${loPct}%`,
            width: `${bandWidth}%`,
            background: `linear-gradient(90deg, ${v.accent}66, ${v.accent}, ${v.accent}66)`,
          }}
        />
        <div
          className="absolute -top-0.5 w-px h-3"
          style={{
            left: `calc(${pointPct}% - 0.5px)`,
            background: v.textHi,
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs font-mono"
           style={{ color: v.textFaint }}>
        <span>↳ {pct(ci.lo)}</span>
        <span style={{ color: v.textBody }}>±{((hiPct - loPct) / 2).toFixed(1)}pp</span>
        <span>{pct(ci.hi)} ↰</span>
      </div>

      <div className="mt-2 text-2xs leading-relaxed"
           style={{ color: v.textFaint }}>
        {t('confidence.note', {
          defaultValue: 'Narrower band = more samples. Wide band on a small N is honest, not noisy.',
        })}
      </div>
    </V2Card>
  );
}
