import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useParams } from '@tanstack/react-router';
import { OrgShell } from '../../../parts/OrgShell';
import { InlineError, SkeletonText } from '@shared/ui';
import { formatNumber } from '@shared/i18n';
import { useOrg } from '@entities/org';
import { useUsageSummary, type UsageMetricSummary } from '@entities/billing';

// Real-mode org Usage: per-metric used/limit gauges over GET /v1/usage/:orgId (current
// billing period). The mock's 30-day sparklines, per-workspace breakdown, cost alert,
// range picker and CSV export are descoped — no backing data model (usage_period is a
// single current-period aggregate). Unlimited metrics report used=null → shown "not metered".
const METRIC_KEY: Record<string, string> = {
  ai_tokens: 'aiTokens',
  scans: 'scans',
  storage_mb: 'storage',
};

export function UsageReal() {
  const { t } = useTranslation('org');
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';
  const { summary, isPending, error, refetch } = useUsageSummary(orgId);

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title={t('usage.title')}
      subtitle={t('usage.real.subtitle')}
    >
      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : isPending ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={4} />
        </div>
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-8">
          {(summary?.metrics ?? []).map((m) => <UsageGauge key={m.metric} m={m} t={t} />)}
        </div>
      )}
    </OrgShell>
  );
}

function UsageGauge({ m, t }: { m: UsageMetricSummary; t: TFunction<'org'> }) {
  const k = METRIC_KEY[m.metric] ?? m.metric;
  const fmt = (n: number) => (n >= 1000 ? formatNumber(n) : Number.isInteger(n) ? String(n) : n.toFixed(1));
  const untracked = m.used == null; // unlimited metric — not metered in usage_period
  const pct = m.used != null && m.limit != null && m.limit > 0 ? Math.min(100, (m.used / m.limit) * 100) : 0;
  const barColor = pct >= 90 ? 'var(--intent-danger-fg)' : pct >= 75 ? 'var(--intent-warn-fg)' : 'var(--fg-default)';

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {t(`usage.real.${k}.label`)}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-3xl font-semibold tracking-tight tabular-nums leading-none"
          style={{ color: 'var(--fg-strong)' }}
        >
          {m.used == null ? '—' : fmt(m.used)}
        </span>
        <span className="text-sm tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
          / {m.limit == null ? '∞' : fmt(m.limit)} {t(`usage.real.${k}.unit`)}
        </span>
      </div>
      <div className="relative h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-muted)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
        {untracked ? t('usage.real.untracked') : t('usage.real.percentUsed', { pct: Math.round(pct) })}
      </div>
    </div>
  );
}
