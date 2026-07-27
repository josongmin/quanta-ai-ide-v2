import { useTranslation } from 'react-i18next';
import type { MergeStrategy, RiskBadge } from '@entities/ownership';
import { PersonAvatar, riskTone } from '../../../lib';

export { PersonAvatar };

// Enum → i18n key map (ownership namespace). Labels resolved via t() at the
// rendering component so this module stays hook-free.
export const MERGE_STRATEGY_SHORT_KEY: Record<MergeStrategy, `mergeStrategy.${MergeStrategy}`> = {
  'split-now': 'mergeStrategy.split-now',
  'keep-as-one': 'mergeStrategy.keep-as-one',
  'land-bottom-up': 'mergeStrategy.land-bottom-up',
  parallelizable: 'mergeStrategy.parallelizable',
  'risky-serial': 'mergeStrategy.risky-serial',
};

export function MergeStrategyPill({ strategy }: { strategy: MergeStrategy }) {
  const { t } = useTranslation('ownership');
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-md text-2xs font-black uppercase tracking-eyebrow"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {t(MERGE_STRATEGY_SHORT_KEY[strategy])}
    </span>
  );
}

export function RiskBadgePill({ risk }: { risk: RiskBadge }) {
  const { t } = useTranslation('ownership');
  const tone = riskTone(risk);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-eyebrow shrink-0"
      style={{
        background: tone.bg,
        color: tone.fg,
        border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
      }}
    >
      {t(tone.labelKey)}
    </span>
  );
}
