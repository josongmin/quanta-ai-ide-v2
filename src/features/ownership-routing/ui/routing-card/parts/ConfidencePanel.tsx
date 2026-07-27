import { useTranslation } from 'react-i18next';
import { confidenceTone } from '../../../lib';

export function ConfidencePanel({ value }: { value: number }) {
  const { t } = useTranslation('ownership');
  const tone = confidenceTone(value);
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-stretch gap-4">
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1">
          <span
            className="text-4xl font-black leading-none tabular-nums tracking-tight"
            style={{ color: 'var(--fg-strong)' }}
          >
            {pct}
          </span>
          <span
            className="text-lg font-bold leading-none"
            style={{ color: 'var(--fg-muted)' }}
          >
            %
          </span>
        </div>
        <div
          className="mt-1 text-2xs font-black uppercase tracking-eyebrow"
          style={{ color: 'var(--fg-muted)' }}
          title={t('routing.confidence.ownerConfidenceTitle')}
        >
          {t('routing.confidence.ownerConfidence')}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-2xs font-mono uppercase tracking-eyebrow"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('routing.confidence.signalStrength')}
          </span>
          <span
            className="text-2xs font-bold uppercase tracking-eyebrow px-1.5 py-0.5 rounded-md"
            style={{
              background: tone.bg,
              color: tone.fg,
            }}
          >
            {t(tone.labelKey)}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden w-full"
          style={{ background: 'var(--bg-surface-muted)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: tone.vivid,
            }}
          />
        </div>
        <div
          className="mt-1 flex justify-between text-2xs font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <span>0</span>
          <span>40</span>
          <span>70</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}
