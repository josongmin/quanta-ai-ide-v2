import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { env } from '@shared/config/env';
import { useTheme } from '@shared/theme';
import { ScrollPane } from '@shared/ui';
import { useTabVisibility } from '@features/workspace-tabs';
import { BillingReal } from './BillingReal';
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

// Real auth → live plan/status/checkout/portal over accounts; otherwise the
// standalone demo's rich seeded billing surface below.
export default function BillingStage() {
  return env.useRealAuth ? <BillingReal /> : <BillingMock />;
}

// Single-page scroll layout. No sidebar, no boxed cards stacked vertically —
// sections are separated by hairlines and large whitespace, à la Linear /
// Vercel settings. Anchor links in the header jump down the page.
function BillingMock() {
  const { t } = useTranslation('billing');
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
          breadcrumb={['ACME', t('breadcrumb.settings'), t('title')]}
        />

        <Section anchor="plan" title={t('sections.plan.title')} hint={t('sections.plan.hint')}>
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
          title={t('sections.lineup.title')}
          hint={t('sections.lineup.hint')}
          right={<CycleToggle cycle={cycle} onChange={setCycle} />}
        >
          <PlanLineup
            currentPlan={planId}
            cycle={cycle}
            onSelect={setPlanId}
          />
        </Section>

        <Divider />

        <Section anchor="usage" title={t('sections.usage.title')} hint={t('sections.usage.hint')}>
          <UsageGrid usage={USAGE} />
        </Section>

        <Divider />

        <Section anchor="invoices" title={t('sections.invoices.title')}>
          <InvoicesList invoices={INVOICES} />
        </Section>

        <Divider />

        <Section anchor="payment" title={t('sections.payment.title')}>
          <PaymentList methods={PAYMENT_METHODS} />
        </Section>

        <Divider />

        <Section anchor="profile" title={t('sections.profile.title')}>
          <ProfileGrid profile={BILLING_PROFILE} />
        </Section>

        <Divider />

        <Section
          anchor="tax"
          title={t('sections.tax.title')}
          hint={t('sections.tax.hint')}
        >
          <TaxSection />
        </Section>

        <Divider />

        <Section
          anchor="contracts"
          title={t('sections.contracts.title')}
          hint={t('sections.contracts.hint', { orgName: 'ACME, Inc.' })}
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
  const { t } = useTranslation('billing');
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
            {c === 'annual' ? t('cycle.annual') : t('cycle.monthly')}
          </button>
        );
      })}
    </div>
  );
}
