import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Plan } from './data';
import { formatDate } from '@shared/i18n';

type Props = {
  plan: Plan;
  cycle: 'monthly' | 'annual';
  seats: number;
  monthlyUsd: number;       // total $/mo, not per-seat
  nextBillDate: string;
};

const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function CurrentPlanRow({
  plan, cycle, seats, monthlyUsd, nextBillDate,
}: Props) {
  const { t } = useTranslation('billing');
  const next = formatDate(new Date(nextBillDate), {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="flex items-baseline justify-between gap-8 flex-wrap">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-semibold tracking-tight leading-none"
            style={{ color: 'var(--fg-strong)' }}
          >
            {t(`plans.${plan.id}.name`)}
          </span>
          <span
            className="text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
            style={{
              color: 'var(--fg-muted)',
              background: 'var(--bg-surface-muted)',
            }}
          >
            {t(`cycle.${cycle}`)}
          </span>
        </div>
        <div className="text-base" style={{ color: 'var(--fg-subtle)' }}>
          {t(`plans.${plan.id}.tagline`)}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-x-10 gap-y-1 text-base">
        <Cell label={t('currentPlan.monthlyCost')} value={fmtUsd(monthlyUsd)} sub={t('currentPlan.seats', { count: seats })} />
        <Cell label={t('currentPlan.nextInvoice')} value={next} sub={t('currentPlan.autoCharge')} />
        <Cell
          label={t('currentPlan.status')}
          value={<span style={{ color: 'var(--fg-accent)' }}>{t('currentPlan.active')}</span>}
          sub={t('currentPlan.noIssues')}
        />
      </dl>

      <button
        type="button"
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
        style={{
          color: 'var(--fg-default)',
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
      >
        {t('currentPlan.manageSubscription')}
        <ArrowUpRight className="w-3 h-3 opacity-70" />
      </button>
    </div>
  );
}

function Cell({
  label, value, sub,
}: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt
        className="text-xs uppercase tracking-eyebrow font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </dt>
      <dd
        className="text-base font-medium tabular-nums"
        style={{ color: 'var(--fg-strong)' }}
      >
        {value}
      </dd>
      {sub && (
        <span className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
          {sub}
        </span>
      )}
    </div>
  );
}
