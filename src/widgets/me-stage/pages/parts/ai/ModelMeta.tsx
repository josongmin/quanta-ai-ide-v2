import { useTranslation } from 'react-i18next';
import type { Model } from './types';

export function ModelMeta({ model }: { model: Model }) {
  const { t } = useTranslation('me');
  const tierColor = model.tier === 'best'
    ? 'var(--fg-accent)'
    : model.tier === 'balanced'
      ? 'var(--fg-default)'
      : 'var(--fg-muted)';
  return (
    <div className="flex items-center gap-2 text-xs tabular-nums shrink-0" style={{ color: 'var(--fg-subtle)' }}>
      <span style={{ color: tierColor }}>{t(`ai.tier.${model.tier}`)}</span>
      <span>· {model.context}</span>
      <span>· {model.speed} tok/s</span>
      <span className="font-mono">${model.inputCostPerMTok.toFixed(2)} / ${model.outputCostPerMTok.toFixed(2)} /Mtok</span>
    </div>
  );
}
