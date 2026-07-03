import type { TFunction } from 'i18next';
import type { DeliveryDecision } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  decision: DeliveryDecision;
  t: TFunction;
};

export function DeliveryGatePanel({ decision, t }: Props) {
  const tone = TIER_TONE[decision.tier];
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader title={t('gate.header')} />
      <div
        className="rounded-md px-2 py-2 mt-1.5 flex items-center justify-between"
        style={{
          background: tone.bg,
          color: tone.fg,
          border: `1px solid ${tone.border}`,
        }}
      >
        <span className="text-base font-black uppercase tracking-eyebrow">
          {t(`gate.tier.${decision.tier}`)}
        </span>
      </div>

      {decision.reasons.length > 0 && (
        <div className="mt-2">
          <h4
            className="text-2xs font-black uppercase tracking-eyebrow mb-1"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('gate.reasons')}
          </h4>
          <ul className="flex flex-col gap-0.5">
            {decision.reasons.map((r, i) => (
              <li
                key={`r-${i.toString()}`}
                className="text-sm"
                style={{ color: 'var(--fg-default)' }}
              >
                · {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {decision.blockers.length > 0 && (
        <div className="mt-2">
          <h4
            className="text-2xs font-black uppercase tracking-eyebrow mb-1"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('gate.blockers')}
          </h4>
          <ul className="flex flex-col gap-0.5">
            {decision.blockers.map((b, i) => (
              <li
                key={`b-${i.toString()}`}
                className="text-sm"
                style={{ color: 'var(--fg-default)' }}
              >
                · {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}

const TIER_TONE: Record<
  DeliveryDecision['tier'],
  { bg: string; fg: string; border: string }
> = {
  'safe-mechanical': {
    bg: 'var(--intent-success-vivid)',
    fg: 'var(--bg-canvas)',
    border: 'var(--intent-success-vivid)',
  },
  guarded: {
    bg: 'var(--bg-surface-muted)',
    fg: 'var(--fg-strong)',
    border: 'var(--border-default)',
  },
  'human-required': {
    bg: 'var(--bg-surface-muted)',
    fg: 'var(--fg-strong)',
    border: 'var(--fg-strong)',
  },
};
