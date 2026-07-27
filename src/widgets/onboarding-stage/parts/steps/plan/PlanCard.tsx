import { useTranslation } from 'react-i18next';
import { Check, Clock } from 'lucide-react';
import type { Plan } from './data';

// Plan card — same geometry as before, with trial badge + min-seats.
export function PlanCard({
  plan, cycle, selected, pageBg, onSelect,
}: {
  plan: Plan;
  cycle: 'monthly' | 'annual';
  selected: boolean;
  pageBg: string;
  onSelect: () => void;
}) {
  const { t } = useTranslation('onboarding');
  const price = cycle === 'annual' ? plan.annual : plan.monthly;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex flex-col gap-3 p-5 transition-colors text-left"
      style={{
        background: selected ? 'var(--accent-selected-bg)' : pageBg,
        color: selected ? 'var(--accent-selected-fg)' : undefined,
        boxShadow: selected ? 'inset 0 0 0 1px var(--accent-selected-fg)' : undefined,
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = pageBg; }}
    >
      {plan.recommended && !selected && (
        <span
          className="absolute top-3 right-3 text-2xs font-bold uppercase tracking-eyebrow px-1.5 py-0.5 rounded"
          style={{ background: 'var(--fg-accent)', color: 'var(--bg-canvas)' }}
        >
          {t('plan.recommended')}
        </span>
      )}

      <div className="flex items-center gap-2">
        <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {t(`plan.plans.${plan.id}Name`)}
        </span>
        {selected && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full onb-tick"
            style={{ background: 'var(--fg-accent)', color: 'var(--bg-canvas)' }}
          >
            <Check className="w-2.5 h-2.5" />
          </span>
        )}
        {plan.trial && (
          <span
            className="ml-auto text-2xs uppercase tracking-eyebrow font-semibold inline-flex items-center gap-1"
            style={{ color: 'var(--fg-accent)' }}
          >
            <Clock className="w-2.5 h-2.5" />
            {t('plan.trial', { days: plan.trial })}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 min-h-[32px]">
        {price == null ? (
          <span className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            {t('plan.custom')}
          </span>
        ) : (
          <>
            <span className="text-3xl font-semibold tracking-tight tabular-nums leading-none"
              style={{ color: 'var(--fg-strong)' }}>
              ${price}
            </span>
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
              {t('plan.perSeatMo')}
            </span>
          </>
        )}
      </div>

      <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
        {t(`plan.plans.${plan.id}Hint`)}
        {plan.minSeats && plan.minSeats > 1 && (
          <span>{t('plan.minSeats', { count: plan.minSeats })}</span>
        )}
      </span>

      <ul className="flex flex-col gap-1.5 mt-1">
        {plan.highlightKeys.map((h) => (
          <li key={h} className="flex items-start gap-1.5 text-sm leading-snug" style={{ color: 'var(--fg-default)' }}>
            <Check className="w-3 h-3 shrink-0 mt-[2px]" style={{ color: 'var(--fg-muted)' }} />
            <span>{t(`plan.highlights.${h}`)}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
