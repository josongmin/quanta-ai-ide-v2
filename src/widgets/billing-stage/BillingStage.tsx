import { useState } from 'react';
import { useTheme } from '@shared/theme';
import { ScrollPane } from '@shared/ui';
import { useTabVisibility } from '@features/workspace-tabs';
import {
  PLANS, USAGE, INVOICES, PAYMENT_METHODS, BILLING_PROFILE,
  type PlanId,
} from './parts/data';
import { BillingHeader } from './parts/BillingHeader';
import { CurrentPlanRow } from './parts/CurrentPlanRow';
import { UsageGrid } from './parts/UsageGrid';
import { PlanLineup } from './parts/PlanLineup';
import { InvoicesList } from './parts/InvoicesList';
import { PaymentList } from './parts/PaymentList';
import { ProfileGrid } from './parts/ProfileGrid';
import { TaxSection } from './parts/TaxSection';
import { ContractsSection } from './parts/ContractsSection';
import { Section, Divider } from './parts/Section';

// Single-page scroll layout. No sidebar, no boxed cards stacked vertically —
// sections are separated by hairlines and large whitespace, à la Linear /
// Vercel settings. Anchor links in the header jump down the page.
export default function BillingStage() {
  const { isDark } = useTheme();
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');
  const [planId, setPlanId] = useState<PlanId>('team');
  const visible = useTabVisibility();

  // planId is the PlanId union (every value has a PLANS entry); USAGE always
  // has a 'seats' row. Fallbacks keep these non-undefined without an assertion.
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const seats = USAGE.find((u) => u.key === 'seats') ?? USAGE[0];
  const seatCount = seats.used;
  const monthlyUsd =
    plan.monthly == null ? 0
    // In this branch monthly is a number, and annual mirrors it in the data;
    // fall back to monthly if annual were ever absent.
    : (cycle === 'annual' ? (plan.annual ?? plan.monthly) : plan.monthly) * seatCount;

  return (
    <ScrollPane
      scope="billing"
      visible={visible}
      className="absolute inset-0 overflow-y-auto"
      style={{ background: isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)' }}
    >
      <div className="max-w-[860px] mx-auto px-10 pt-12 pb-32">
        <BillingHeader
          orgName="ACME, Inc."
          breadcrumb={['ACME', 'Settings', 'Billing']}
        />

        <Section anchor="plan" title="Plan" hint="Annual billing saves 17%.">
          <CurrentPlanRow
            plan={plan}
            cycle={cycle}
            seats={seatCount}
            monthlyUsd={monthlyUsd}
            nextBillDate="2026-06-01"
          />
        </Section>

        <Divider />

        <Section
          anchor="lineup"
          title="Available plans"
          hint="Switch any time. Pro-rated on the next invoice."
          right={<CycleToggle cycle={cycle} onChange={setCycle} />}
        >
          <PlanLineup
            currentPlan={planId}
            cycle={cycle}
            onSelect={setPlanId}
          />
        </Section>

        <Divider />

        <Section anchor="usage" title="Usage" hint="May 1 — May 31, 2026.">
          <UsageGrid usage={USAGE} />
        </Section>

        <Divider />

        <Section anchor="invoices" title="Invoices">
          <InvoicesList invoices={INVOICES} />
        </Section>

        <Divider />

        <Section anchor="payment" title="Payment methods">
          <PaymentList methods={PAYMENT_METHODS} />
        </Section>

        <Divider />

        <Section anchor="profile" title="Billing profile">
          <ProfileGrid profile={BILLING_PROFILE} />
        </Section>

        <Divider />

        <Section
          anchor="tax"
          title="Tax & VAT"
          hint="Per-jurisdiction tax IDs applied to invoices."
        >
          <TaxSection />
        </Section>

        <Divider />

        <Section
          anchor="contracts"
          title="Contracts"
          hint="Counter-signed agreements on file with ACME, Inc."
        >
          <ContractsSection />
        </Section>
      </div>
    </ScrollPane>
  );
}

function CycleToggle({
  cycle, onChange,
}: { cycle: 'monthly' | 'annual'; onChange: (c: 'monthly' | 'annual') => void }) {
  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {(['monthly', 'annual'] as const).map((c) => {
        const active = c === cycle;
        return (
          <button
            key={c}
            type="button"
            onClick={() => { onChange(c); }}
            className="px-2.5 h-6 rounded text-sm font-medium transition-colors"
            style={{
              background: active ? 'var(--bg-canvas)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {c === 'annual' ? 'Annual' : 'Monthly'}
          </button>
        );
      })}
    </div>
  );
}
