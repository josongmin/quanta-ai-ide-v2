import { Check, Sparkles } from 'lucide-react';
import { LiftCard } from '@shared/ui/marketing';
import type { Cycle, Plan } from './types';
import { PrimaryCta, SecondaryCta } from './atoms';

export function PlanCard({ plan, cycle }: { plan: Plan; cycle: Cycle }) {
  const price = cycle === 'annual' ? plan.annual : plan.monthly;
  return (
    <div className="relative">
      {plan.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span
            className="inline-flex items-center gap-1 px-2.5 h-6 text-xs uppercase tracking-eyebrow font-semibold rounded-full"
            style={{
              background: 'var(--fg-accent)',
              color: 'var(--bg-canvas)',
              boxShadow: '0 6px 18px -4px color-mix(in srgb, var(--fg-accent) 65%, transparent)',
            }}
          >
            <Sparkles className="w-3 h-3" />
            Most popular
          </span>
        </div>
      )}
      <LiftCard featured={plan.featured} className="p-6 h-full">
        <div className="flex flex-col gap-1 min-h-[60px]">
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>{plan.name}</span>
          <span className="text-base" style={{ color: 'var(--fg-muted)' }}>{plan.tagline}</span>
        </div>

        <div className="mt-4 mb-5 flex items-baseline gap-1.5">
          {price === null ? (
            <span className="text-[34px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Custom
            </span>
          ) : (
            <>
              <span className="text-lg" style={{ color: 'var(--fg-muted)' }}>$</span>
              <span className="text-[42px] font-semibold tracking-[-0.02em] tabular-nums leading-none" style={{ color: 'var(--fg-strong)' }}>
                {price}
              </span>
              <span className="text-base ml-1" style={{ color: 'var(--fg-muted)' }}>{plan.unit}</span>
            </>
          )}
        </div>
        {cycle === 'annual' && plan.monthly && plan.annual && plan.monthly > plan.annual && (
          <p className="text-sm -mt-3 mb-4" style={{ color: 'var(--intent-success-fg)' }}>
            ${plan.monthly}/mo billed monthly
          </p>
        )}

        {plan.ctaPrimary ? (
          <PrimaryCta block>{plan.cta}</PrimaryCta>
        ) : (
          <SecondaryCta block>{plan.cta}</SecondaryCta>
        )}

        <ul className="flex flex-col gap-2.5 mt-6">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-base" style={{ color: 'var(--fg-default)' }}>
              <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-success-fg)' }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </LiftCard>
    </div>
  );
}
