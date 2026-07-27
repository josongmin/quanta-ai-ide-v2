import { useParams } from '@tanstack/react-router';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, TrendingDown, Users, Bot, Database, Webhook, Sparkles,
  AlertTriangle, Download, BarChart3, Activity,
} from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { OrgShell } from '../parts/OrgShell';
import { formatNumber } from '@shared/i18n';

// Deterministic 30-day usage curve
function curve(seed: number, base: number, slope: number) {
  let s = seed * 9301 + 49297;
  const out: number[] = [];
  for (let i = 0; i < 30; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    out.push(Math.round(base + (slope * i) + (r - 0.5) * base * 0.3));
  }
  return out;
}

const METRICS = [
  {
    key: 'seats',     icon: Users,    labelKey: 'usage.metric.seats',   unitKey: 'usage.unit.seats',  value: 184, delta: 6,    cap: true,
    series: curve(1, 170, 0.5), tone: 'var(--fg-accent)',
  },
  {
    key: 'agents',    icon: Bot,      labelKey: 'usage.metric.agents',  unitKey: 'usage.unit.perMonth', value: 12482, delta: 14,
    series: curve(2, 320, 1.2), tone: 'var(--fg-link)',
  },
  {
    key: 'tokens',    icon: Sparkles, labelKey: 'usage.metric.tokens',  unitKey: 'usage.unit.tokens', value: 42_140_000, delta: 22, format: 'compact' as const,
    series: curve(3, 1_400_000, 8_000), tone: 'var(--intent-info-fg)',
  },
  {
    key: 'storage',   icon: Database, labelKey: 'usage.metric.storage', unitKey: 'usage.unit.storage', value: 184, delta: -2,
    series: curve(4, 180, 0.05), tone: 'var(--intent-warn-fg)',
  },
  {
    key: 'webhooks',  icon: Webhook,  labelKey: 'usage.metric.webhooks', unitKey: 'usage.unit.perMonth', value: 1_842_321, delta: 4, format: 'compact' as const,
    series: curve(5, 60_000, 200), tone: 'var(--intent-success-fg)',
  },
  {
    key: 'requests',  icon: Activity, labelKey: 'usage.metric.requests', unitKey: 'usage.unit.perMonth', value: 184_209_111, delta: 18, format: 'compact' as const,
    series: curve(6, 6_000_000, 30_000), tone: 'var(--fg-accent)',
  },
];

const BREAKDOWN = [
  { ws: 'monorepo',       runs: 5821, tokens: '18.4M',  cost: '$4,210' },
  { ws: 'design-system',  runs: 2104, tokens: '6.2M',   cost: '$1,420' },
  { ws: 'mobile-ios',     runs: 1820, tokens: '5.8M',   cost: '$1,320' },
  { ws: 'mobile-android', runs: 1421, tokens: '4.8M',   cost: '$1,140' },
  { ws: 'ml-platform',    runs: 1316, tokens: '6.9M',   cost: '$1,640' },
];

function format(n: number, mode?: 'compact') {
  if (mode === 'compact') {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  }
  return formatNumber(n);
}

export default function UsagePage() {
  const { t } = useTranslation('org');
  // Route is always /org/$org/* so `org` is present; default keeps the type `string`.
  const { org = '' } = useParams({ strict: false });

  return (
    <OrgShell
      orgName={org}
      orgSlug={org}
      title={t('usage.title')}
      subtitle={t('usage.subtitle')}
      topRight={
        <div className="flex items-center gap-2">
          <select
            className="h-8 px-3 rounded-md text-sm font-medium outline-none"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            <option>{t('usage.range.days30')}</option>
            <option>{t('usage.range.days7')}</option>
            <option>{t('usage.range.days90')}</option>
            <option>{t('usage.range.billingPeriod')}</option>
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-semibold transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            {t('usage.exportCsv')}
          </button>
        </div>
      }
    >
      {/* Metric tiles */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {METRICS.map((m) => (
          <MetricTile key={m.key} m={m} />
        ))}
      </div>

      {/* Cost alert */}
      <div
        className="rounded-xl p-5 mb-10 flex items-center gap-4"
        style={{
          background: 'color-mix(in srgb, var(--intent-warn-fg) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--intent-warn-fg) 35%, transparent)',
        }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--intent-warn-fg) 16%, transparent)',
            color: 'var(--intent-warn-fg)',
          }}
        >
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {t('usage.alert.title')}
          </span>
          <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            {t('usage.alert.sub')}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-sm font-semibold transition-colors"
          style={{ background: 'var(--intent-warn-fg)', color: '#fff' }}
        >
          {t('usage.alert.action')}
        </button>
      </div>

      {/* Breakdown by workspace */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
          <h2 className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            {t('usage.breakdown.title')}
          </h2>
        </div>
        <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('usage.breakdown.thisMonth')}</span>
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="grid items-center px-4 h-9 text-xs uppercase tracking-eyebrow font-semibold"
          style={{
            gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.8fr 1.4fr',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span>{t('usage.breakdown.workspace')}</span>
          <span className="text-right">{t('usage.breakdown.runs')}</span>
          <span className="text-right">{t('usage.breakdown.tokens')}</span>
          <span className="text-right">{t('usage.breakdown.cost')}</span>
          <span>{t('usage.breakdown.share')}</span>
        </div>
        {(() => {
          const total = BREAKDOWN.reduce((acc, b) => acc + b.runs, 0);
          return BREAKDOWN.map((b, i) => {
            const pct = (b.runs / total) * 100;
            return (
              <BreakdownRow key={b.ws} isLast={i === BREAKDOWN.length - 1}>
                <code className="text-base font-mono font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {b.ws}
                </code>
                <span className="text-right text-base tabular-nums" style={{ color: 'var(--fg-default)' }}>{formatNumber(b.runs)}</span>
                <span className="text-right text-base tabular-nums" style={{ color: 'var(--fg-default)' }}>{b.tokens}</span>
                <span className="text-right text-base tabular-nums font-semibold" style={{ color: 'var(--fg-strong)' }}>{b.cost}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg-surface-muted)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(to right, var(--fg-accent), var(--fg-link))',
                      }}
                    />
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)', minWidth: 36 }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </BreakdownRow>
            );
          });
        })()}
      </div>
    </OrgShell>
  );
}

function BreakdownRow({ isLast, children }: { isLast: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-4 h-12 transition-colors"
      style={{
        gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.8fr 1.4fr',
        borderBottom: isLast ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      {children}
    </div>
  );
}

function MetricTile({ m }: { m: (typeof METRICS)[number] }) {
  const { t } = useTranslation('org');
  const max = Math.max(...m.series);
  const up = m.delta >= 0;
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `color-mix(in srgb, ${m.tone} 14%, transparent)`,
            color: m.tone,
          }}
        >
          <m.icon className="w-4 h-4" />
        </div>
        <span
          className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums"
          style={{ color: up ? 'var(--intent-success-fg)' : 'var(--intent-danger-fg)' }}
        >
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(m.delta)}%
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
          {t(m.labelKey)}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            {format(m.value, m.format)}
          </span>
          <span className="text-sm tabular-nums" style={{ color: 'var(--fg-subtle)' }}>{t(m.unitKey)}</span>
        </div>
      </div>
      <div className="flex items-end gap-[2px] h-10">
        {m.series.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(8, (v / max) * 100)}%`,
              background: `color-mix(in srgb, ${m.tone} ${30 + (v / max) * 50}%, transparent)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
