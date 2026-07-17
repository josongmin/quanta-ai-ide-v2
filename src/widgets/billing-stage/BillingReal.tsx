import { useState } from 'react';
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
import { PLANS } from './parts/data';
import { PlanLineup } from './parts/PlanLineup';
import { Section, Divider } from './parts/Section';

// Real billing over accounts /v1/billing. The backend models plan + status +
// renewal + Stripe checkout/portal — so invoices, payment methods, tax IDs, and
// contracts (the mock's rich sections) are delegated to the Stripe customer
// portal rather than faked. Sales-led plans (free downgrade / enterprise) route
// out of self-serve checkout.
const STATUS_META: Record<SubscriptionStatus, { label: string; variant: BadgeVariant }> = {
  none: { label: 'No subscription', variant: 'neutral' },
  trialing: { label: 'Trialing', variant: 'info' },
  active: { label: 'Active', variant: 'success' },
  past_due: { label: 'Past due', variant: 'danger' },
  canceled: { label: 'Canceled', variant: 'warn' },
};

function renewalLabel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function BillingReal() {
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

  const planName = PLANS.find((p) => p.id === (status?.plan ?? 'free'))?.name ?? 'Free';
  const meta = STATUS_META[status?.status ?? 'none'];

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
            {detail?.org.name ?? org} · Settings
          </span>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>Billing</h1>
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
              title="Plan"
              hint="Annual billing saves 17%."
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
                      <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
                    </div>
                    <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
                      {status?.currentPeriodEnd
                        ? `Renews ${renewalLabel(status.currentPeriodEnd)}`
                        : 'No active subscription'}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    leading={<CreditCard className="w-3.5 h-3.5" />}
                    disabled={busy || !orgId}
                    onClick={() => { void manage(); }}
                  >
                    Manage billing
                  </Button>
                </div>
              )}
            </Section>

            <Divider />

            <Section anchor="plans" title="Plans" hint="Upgrade or change your plan. Payment is handled securely by Stripe.">
              <PlanLineup currentPlan={status?.plan ?? 'free'} cycle={cycle} onSelect={onSelectPlan} />
              <p className="text-sm mt-4" style={{ color: 'var(--fg-subtle)' }}>
                Invoices, payment methods, and cancellation are managed in the Stripe billing portal
                (&ldquo;Manage billing&rdquo; above).
              </p>
            </Section>
          </>
        )}
      </div>
    </ScrollPane>
  );
}

function CycleToggle({ cycle, onChange }: { cycle: 'monthly' | 'annual'; onChange: (c: 'monthly' | 'annual') => void }) {
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
            className="h-6 px-2.5 rounded capitalize transition-colors"
            style={{
              background: active ? 'var(--bg-canvas)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
