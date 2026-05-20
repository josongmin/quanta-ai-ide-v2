import { useParams } from '@tanstack/react-router';
import { useRef, type ReactNode } from 'react';
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
    key: 'seats',     icon: Users,    label: 'Active seats',   value: 184, delta: 6,    unit: '/ 200',  cap: true,
    series: curve(1, 170, 0.5), tone: 'var(--fg-accent)',
  },
  {
    key: 'agents',    icon: Bot,      label: 'Agent runs',     value: 12482, delta: 14, unit: '/ mo',
    series: curve(2, 320, 1.2), tone: 'var(--fg-link)',
  },
  {
    key: 'tokens',    icon: Sparkles, label: 'AI tokens',      value: 42_140_000, delta: 22, unit: 'tokens / mo', format: 'compact' as const,
    series: curve(3, 1_400_000, 8_000), tone: 'var(--intent-info-fg)',
  },
  {
    key: 'storage',   icon: Database, label: 'Storage',        value: 184, delta: -2,  unit: 'GB',
    series: curve(4, 180, 0.05), tone: 'var(--intent-warn-fg)',
  },
  {
    key: 'webhooks',  icon: Webhook,  label: 'Webhook deliveries', value: 1_842_321, delta: 4,  unit: '/ mo', format: 'compact' as const,
    series: curve(5, 60_000, 200), tone: 'var(--intent-success-fg)',
  },
  {
    key: 'requests',  icon: Activity, label: 'API requests',   value: 184_209_111, delta: 18, unit: '/ mo', format: 'compact' as const,
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
  const { org } = useParams({ strict: false }) as unknown as { org: string };

  return (
    <OrgShell
      orgName={org}
      orgSlug={org}
      title="Usage"
      subtitle="What your org has consumed in the past 30 days. Costs map to your current plan; switch in billing."
      topRight={
        <div className="flex items-center gap-2">
          <select
            className="h-8 px-3 rounded-md text-[11px] font-medium outline-none"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
            <option>This billing period</option>
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
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
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
            You&apos;re projected to hit 92% of plan limits this month
          </span>
          <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            Set a budget alert at 80%, or upgrade plans for cleaner headroom.
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11px] font-semibold transition-colors"
          style={{ background: 'var(--intent-warn-fg)', color: '#fff' }}
        >
          Set budget alert
        </button>
      </div>

      {/* Breakdown by workspace */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
          <h2 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            Cost by workspace
          </h2>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>This month</span>
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="grid items-center px-4 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{
            gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.8fr 1.4fr',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span>Workspace</span>
          <span className="text-right">Runs</span>
          <span className="text-right">Tokens</span>
          <span className="text-right">Cost</span>
          <span>Share</span>
        </div>
        {(() => {
          const total = BREAKDOWN.reduce((acc, b) => acc + b.runs, 0);
          return BREAKDOWN.map((b, i) => {
            const pct = (b.runs / total) * 100;
            return (
              <BreakdownRow key={b.ws} isLast={i === BREAKDOWN.length - 1}>
                <code className="text-[12px] font-mono font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {b.ws}
                </code>
                <span className="text-right text-[12px] tabular-nums" style={{ color: 'var(--fg-default)' }}>{formatNumber(b.runs)}</span>
                <span className="text-right text-[12px] tabular-nums" style={{ color: 'var(--fg-default)' }}>{b.tokens}</span>
                <span className="text-right text-[12px] tabular-nums font-semibold" style={{ color: 'var(--fg-strong)' }}>{b.cost}</span>
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
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)', minWidth: 36 }}>
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
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums"
          style={{ color: up ? 'var(--intent-success-fg)' : 'var(--intent-danger-fg)' }}
        >
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(m.delta)}%
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
          {m.label}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[22px] font-semibold tabular-nums tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            {format(m.value, m.format)}
          </span>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>{m.unit}</span>
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
