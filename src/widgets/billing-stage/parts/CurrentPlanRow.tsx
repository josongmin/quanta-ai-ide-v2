import { ArrowUpRight } from 'lucide-react';
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
            {plan.name}
          </span>
          <span
            className="text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
            style={{
              color: 'var(--fg-muted)',
              background: 'var(--bg-surface-muted)',
            }}
          >
            {cycle}
          </span>
        </div>
        <div className="text-base" style={{ color: 'var(--fg-subtle)' }}>
          {plan.tagline}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-x-10 gap-y-1 text-base">
        <Cell label="Monthly cost" value={fmtUsd(monthlyUsd)} sub={`${seats} seats`} />
        <Cell label="Next invoice" value={next} sub="Auto-charge" />
        <Cell
          label="Status"
          value={<span style={{ color: 'var(--fg-accent)' }}>Active</span>}
          sub="No issues"
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
        Manage subscription
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
