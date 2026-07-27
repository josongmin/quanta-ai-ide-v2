import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from '@tanstack/react-router';
import { CreditCard } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { ScrollPane, Badge, InlineError, SkeletonText, type BadgeVariant } from '@shared/ui';
import { Button } from '@shared/ui/forms';
import { useTabVisibility } from '@features/workspace-tabs';
import { useOrg } from '@entities/org';
import {
  useBillingStatus, startCheckout, openPortal,
  type PlanId, type SubscriptionStatus,
} from '@entities/billing';
import { PlanLineup } from './parts/PlanLineup';
import { Section, Divider } from './parts/Section';

// Real billing over accounts /v1/billing. The backend models plan + status +
// renewal + Stripe checkout/portal — so invoices, payment methods, tax IDs, and
// contracts (the mock's rich sections) are delegated to the Stripe customer
// portal rather than faked. Sales-led plans (free downgrade / enterprise) route
// out of self-serve checkout.
const STATUS_VARIANT: Record<SubscriptionStatus, BadgeVariant> = {
  none: 'neutral',
  trialing: 'info',
  active: 'success',
  past_due: 'danger',
  canceled: 'warn',
};

export function BillingReal() {
  const { t } = useTranslation('billing');
  const { isDark } = useTheme();
  const visible = useTabVisibility();
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';
  const { status, isPending, error, refetch } = useBillingStatus(orgId);

  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function upgrade(plan: 'team' | 'business') {
    setBusy(true);
    setActionError(null);
    const res = await startCheckout(orgId, { plan, cycle });
    if (!res.ok) { setBusy(false); setActionError(res.error); return; }
    window.location.href = res.url;
  }

  async function manage() {
    setBusy(true);
    setActionError(null);
    const res = await openPortal(orgId);
    if (!res.ok) { setBusy(false); setActionError(res.error); return; }
    window.location.href = res.url;
  }

  function onSelectPlan(id: PlanId) {
    if (!status || id === status.plan || busy) return;
    if (id === 'enterprise') { window.location.href = 'mailto:sales@se-field.app?subject=Enterprise%20plan'; return; }
    if (id === 'free') { void manage(); return; } // downgrade/cancel via portal
    void upgrade(id);
  }

  const planName = t(`plans.${status?.plan ?? 'free'}.name`);
  const statusKey = status?.status ?? 'none';
  const renewalLabel = (iso: string | null): string => {
    if (!iso) return t('real.renewalNone');
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? t('real.renewalNone')
      : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <ScrollPane
      scope="billing"
      visible={visible}
      className="absolute inset-0 overflow-y-auto"
      style={{ background: isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)' }}
    >
      <div className="max-w-[860px] mx-auto px-10 pt-12 pb-32">
        <div className="flex flex-col gap-1 mb-2">
          <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
            {detail?.org.name ?? org} · {t('real.settings')}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>{t('title')}</h1>
        </div>

        {orgError ? (
          <InlineError message={orgError} onRetry={refetchOrg} />
        ) : (
          <>
            {actionError && (
              <div className="my-4"><InlineError message={actionError} onRetry={() => { setActionError(null); }} /></div>
            )}

            <Section
              anchor="plan"
              title={t('sections.plan.title')}
              hint={t('sections.plan.hint')}
              right={<CycleToggle cycle={cycle} onChange={setCycle} />}
            >
              {error ? (
                <InlineError message={error} onRetry={refetch} />
              ) : isPending ? (
                <SkeletonText lines={2} />
              ) : (
                <div
                  className="flex items-center justify-between gap-4 rounded-md px-4 py-3.5"
                  style={{ border: '1px solid var(--border-muted)' }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>{planName}</span>
                      <Badge variant={STATUS_VARIANT[statusKey]} size="sm">{t(`real.status.${statusKey}`)}</Badge>
                    </div>
                    <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
                      {status?.currentPeriodEnd
                        ? t('real.renews', { date: renewalLabel(status.currentPeriodEnd) })
                        : t('real.noActiveSubscription')}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    leading={<CreditCard className="w-3.5 h-3.5" />}
                    disabled={busy || !orgId}
                    onClick={() => { void manage(); }}
                  >
                    {t('real.manageBilling')}
                  </Button>
                </div>
              )}
            </Section>

            <Divider />

            <Section anchor="plans" title={t('sections.plans.title')} hint={t('sections.plans.hint')}>
              <PlanLineup currentPlan={status?.plan ?? 'free'} cycle={cycle} onSelect={onSelectPlan} />
              <p className="text-sm mt-4" style={{ color: 'var(--fg-subtle)' }}>
                {t('real.plansNote')}
              </p>
            </Section>
          </>
        )}
      </div>
    </ScrollPane>
  );
}

function CycleToggle({ cycle, onChange }: { cycle: 'monthly' | 'annual'; onChange: (c: 'monthly' | 'annual') => void }) {
  const { t } = useTranslation('billing');
  return (
    <div
      className="inline-flex items-center rounded-md p-0.5 text-sm font-medium"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
    >
      {(['monthly', 'annual'] as const).map((c) => {
        const active = cycle === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => { onChange(c); }}
            className="h-6 px-2.5 rounded transition-colors"
            style={{
              background: active ? 'var(--bg-canvas)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t(`cycle.${c}`)}
          </button>
        );
      })}
    </div>
  );
}
