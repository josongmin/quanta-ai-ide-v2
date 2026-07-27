import { useTranslation } from 'react-i18next';
import { useParams } from '@tanstack/react-router';
import { OrgShell } from '../../../parts/OrgShell';
import { Section, Row } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import { useOrg } from '@entities/org';
import { useBillingStatus, type SubscriptionStatus } from '@entities/billing';
import { AUDIT_RETENTION_DAYS_BY_PLAN } from '@entities/plan';

// Statuses that keep the paid plan's entitlements — mirrors backend ENTITLED_STATUSES
// (billing/domain/subscription.ts). Anything else (none/canceled) is downgraded to free.
const ENTITLED_STATUSES = new Set<SubscriptionStatus>(['active', 'trialing', 'past_due']);

// Real-mode Retention: retention is a FIXED, plan-derived policy (backend
// PLAN_TABLE.auditRetentionDays), so this is a read-only DISPLAY of the org's plan +
// its audit-log retention. The mock's legal-holds / S3 archive / per-class overrides
// have no backend and are intentionally omitted (they implied writable config that
// doesn't exist). Plan is read from the already-wired GET /v1/billing/:orgId.
export function RetentionReal() {
  const { t } = useTranslation('org');
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';
  const { status, isPending, error, refetch } = useBillingStatus(orgId);

  // ★Effective plan, not raw: getStatus returns the RAW plan for UI, but retention (like all
  // entitlements) follows the status-aware effective plan — a canceled/lapsed 'business' org
  // actually gets free=7d, not 90d. Deriving from status.plan alone would over-state retention
  // (a wrong compliance number). Mirror backend effectivePlan(plan, status).
  const plan = status ? (ENTITLED_STATUSES.has(status.status) ? status.plan : 'free') : undefined;
  const days = plan ? AUDIT_RETENTION_DAYS_BY_PLAN[plan] : null;

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title={t('retention.title')}
      subtitle={t('retention.real.subtitle')}
    >
      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : isPending ? (
        <SkeletonText lines={4} />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : (
        <Section title={t('retention.title')} hint={t('retention.real.note')}>
          <Row label={t('retention.real.planLabel')}>
            <span className="text-base capitalize" style={{ color: 'var(--fg-strong)' }}>
              {plan ?? '—'}
            </span>
          </Row>
          <Row label={t('retention.real.auditLabel')}>
            <span className="text-base tabular-nums" style={{ color: 'var(--fg-strong)' }}>
              {days != null ? `${days} ${t('retention.default.days')}` : '—'}
            </span>
          </Row>
        </Section>
      )}
    </OrgShell>
  );
}
