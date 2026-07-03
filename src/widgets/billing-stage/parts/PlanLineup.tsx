import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '@shared/theme';
import type { Plan, PlanId } from './data';
import { PLANS } from './data';

type Props = {
  currentPlan: PlanId;
  cycle: 'monthly' | 'annual';
  onSelect: (id: PlanId) => void;
};

export function PlanLineup({ currentPlan, cycle, onSelect }: Props) {
  const { isDark } = useTheme();
  const pageBg = isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)';
  return (
    <div className="grid grid-cols-4 gap-px rounded-md overflow-hidden"
      style={{ background: 'var(--border-muted)' }}
    >
      {PLANS.map((p) => (
        <PlanCell
          key={p.id}
          plan={p}
          cycle={cycle}
          current={p.id === currentPlan}
          pageBg={pageBg}
          onSelect={() => { onSelect(p.id); }}
        />
      ))}
    </div>
  );
}

function PlanCell({
  plan, cycle, current, pageBg, onSelect,
}: { plan: Plan; cycle: 'monthly' | 'annual'; current: boolean; pageBg: string; onSelect: () => void }) {
  const price = cycle === 'annual' ? plan.annual : plan.monthly;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEnter = () => { if (!current) el.style.background = 'var(--bg-hover)'; };
    const onLeave = () => { if (!current) el.style.background = pageBg; };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [current, pageBg]);
  return (
    <div
      ref={ref}
      className="flex flex-col gap-4 p-5 transition-colors relative"
      style={{
        background: pageBg,
        boxShadow: current ? 'inset 0 0 0 1px var(--fg-accent)' : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--fg-strong)' }}
        >
          {plan.name}
        </span>
        {current && (
          <span
            className="text-2xs font-semibold uppercase tracking-eyebrow"
            style={{ color: 'var(--fg-accent)' }}
          >
            Current
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5 min-h-[44px]">
        {price == null ? (
          <span className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            Custom
          </span>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span
                className="text-3xl font-semibold tracking-tight tabular-nums leading-none"
                style={{ color: 'var(--fg-strong)' }}
              >
                ${price}
              </span>
              <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
                /seat/mo
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
              {cycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
            </span>
          </>
        )}
      </div>

      <ul className="flex flex-col gap-1.5 flex-1">
        {plan.highlights.map((h) => (
          <li
            key={h}
            className="flex items-start gap-1.5 text-sm leading-snug"
            style={{ color: 'var(--fg-default)' }}
          >
            <Check className="w-3 h-3 shrink-0 mt-[2px]" style={{ color: 'var(--fg-muted)' }} />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        disabled={current}
        className="h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
        style={{
          background: current ? 'transparent' : 'var(--bg-surface-muted)',
          color: current ? 'var(--fg-subtle)' : 'var(--fg-strong)',
          border: '1px solid var(--border-default)',
          cursor: current ? 'default' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!current) e.currentTarget.style.background = 'var(--bg-active)';
        }}
        onMouseLeave={(e) => {
          if (!current) e.currentTarget.style.background = 'var(--bg-surface-muted)';
        }}
      >
        {current ? 'Current' : plan.id === 'enterprise' ? 'Talk to sales' : 'Switch plan'}
      </button>
    </div>
  );
}
