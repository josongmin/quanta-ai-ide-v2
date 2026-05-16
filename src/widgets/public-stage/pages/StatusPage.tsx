import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, AlertTriangle, Mail, Rss, Server, Globe, Bot,
  Webhook, ShieldCheck, KeyRound, Cloud, Database, ChevronDown, Activity,
} from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { PublicShell , HeroBackdrop, Eyebrow, SectionHead, SeamDivider } from '@shared/ui/marketing';

type Status = 'operational' | 'degraded' | 'outage';

type Service = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  status: Status;
};

type Region = {
  id: string;
  label: string;
  lat: number;       // 0-100 (approx for our 1080×260 svg map)
  lon: number;
  status: Status;
  latencyMs: number;
};

const SERVICES: Service[] = [
  { id: 'api',        name: 'API',                description: 'REST + GraphQL',                icon: Server,      status: 'operational' },
  { id: 'web',        name: 'Web app',            description: 'app.acme.com',                  icon: Globe,       status: 'operational' },
  { id: 'agents',     name: 'Agent runtime',      description: 'Autonomous runs',               icon: Bot,         status: 'operational' },
  { id: 'webhooks',   name: 'Webhook delivery',   description: 'Org + workspace endpoints',     icon: Webhook,     status: 'operational' },
  { id: 'admission',  name: 'Admission gates',    description: 'Pre-merge policy checks',       icon: ShieldCheck, status: 'operational' },
  { id: 'auth',       name: 'Authentication',     description: 'Sign-in, SSO, MFA',             icon: KeyRound,    status: 'operational' },
  { id: 'cdn',        name: 'CDN',                description: 'Static assets + docs',          icon: Cloud,       status: 'operational' },
  { id: 'db',         name: 'Database',           description: 'Primary + read replicas',       icon: Database,    status: 'operational' },
];

const REGIONS: Region[] = [
  { id: 'us-east',  label: 'US East (Virginia)', lat: 42, lon: 26, status: 'operational', latencyMs:  18 },
  { id: 'us-west',  label: 'US West (Oregon)',   lat: 38, lon: 14, status: 'operational', latencyMs:  22 },
  { id: 'eu-west',  label: 'EU West (Dublin)',   lat: 30, lon: 48, status: 'operational', latencyMs:  31 },
  { id: 'eu-cent',  label: 'EU Central (Frankfurt)', lat: 32, lon: 53, status: 'operational', latencyMs: 28 },
  { id: 'ap-ne',    label: 'AP Northeast (Tokyo)', lat: 44, lon: 86, status: 'operational', latencyMs: 42 },
  { id: 'ap-se',    label: 'AP Southeast (Singapore)', lat: 60, lon: 78, status: 'operational', latencyMs: 47 },
];

type Incident = {
  id: string;
  title: string;
  status: 'monitoring' | 'investigating' | 'resolved';
  startedAt: string;
  resolvedAt?: string;
  affected: string[];
  updates: { at: string; status: string; body: string }[];
};

const INCIDENTS: Incident[] = [
  {
    id: 'inc-2026-05-08',
    title: 'Webhook delivery delays in EU region',
    status: 'monitoring',
    startedAt: '2026-05-08 14:32 UTC',
    affected: ['Webhook delivery', 'Agent runtime'],
    updates: [
      { at: '2026-05-08 16:10 UTC', status: 'Monitoring',  body: 'Delivery latency normalized over the past 60 minutes. We\'re monitoring for one more hour before marking resolved.' },
      { at: '2026-05-08 15:18 UTC', status: 'Identified',   body: 'Root cause traced to a noisy neighbor on the EU webhook worker pool. Shifted load and added isolation.' },
      { at: '2026-05-08 14:32 UTC', status: 'Investigating',body: 'Some EU customers are seeing 30-90s delays on webhook delivery. Investigating now.' },
    ],
  },
  {
    id: 'inc-2026-05-02',
    title: 'Admission gate evaluation slow',
    status: 'resolved',
    startedAt: '2026-05-02 09:14 UTC',
    resolvedAt: '2026-05-02 10:48 UTC',
    affected: ['Admission gates'],
    updates: [
      { at: '2026-05-02 10:48 UTC', status: 'Resolved',     body: 'Gate evaluations are back to normal. Postmortem in 48h.' },
      { at: '2026-05-02 09:55 UTC', status: 'Identified',   body: 'A bad migration was holding row locks. Rolled back.' },
      { at: '2026-05-02 09:14 UTC', status: 'Investigating',body: 'Customers may see admission gates take 5-10s to evaluate.' },
    ],
  },
  {
    id: 'inc-2026-04-21',
    title: 'CDN error rate spike (5xx)',
    status: 'resolved',
    startedAt: '2026-04-21 03:02 UTC',
    resolvedAt: '2026-04-21 03:34 UTC',
    affected: ['CDN', 'Web app'],
    updates: [
      { at: '2026-04-21 03:34 UTC', status: 'Resolved',     body: 'Provider issue resolved upstream.' },
      { at: '2026-04-21 03:18 UTC', status: 'Identified',   body: 'Confirmed upstream CDN provider incident.' },
      { at: '2026-04-21 03:02 UTC', status: 'Investigating',body: 'Elevated 5xx on static asset requests.' },
    ],
  },
];

// Deterministic 90-bar history per service. Each bar is a single day.
function historyFor(seed: number, baseFail = 0.06): Status[] {
  // simple LCG
  let s = seed * 9301 + 49297;
  const out: Status[] = [];
  for (let i = 0; i < 90; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    if (r < baseFail * 0.18) out.push('outage');
    else if (r < baseFail) out.push('degraded');
    else out.push('operational');
  }
  return out;
}

export default function StatusPage() {
  // Overall = worst of any service
  const overall: Status = SERVICES.reduce<Status>((acc, s) => worstOf(acc, s.status), 'operational');

  return (
    <PublicShell active="status" width="bleed">
      {/* ─── HERO + OVERALL STATUS ─────────────────────────────────── */}
      <section className="relative">
        <HeroBackdrop height="h-[420px]" intensity={overall === 'operational' ? 0.5 : 0.7} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-20 pb-12 flex flex-col items-center text-center gap-5">
          <Eyebrow tone={overall === 'operational' ? 'success' : overall === 'degraded' ? 'warn' : 'brand'}>
            <PulseDot status={overall} />
            Live status
          </Eyebrow>

          <h1
            className="text-[40px] sm:text-[52px] leading-[1.05] font-semibold tracking-[-0.022em]"
            style={{ color: overall === 'operational' ? 'var(--intent-success-fg)' : overall === 'degraded' ? 'var(--intent-warn-fg)' : 'var(--intent-danger-fg)' }}
          >
            {overall === 'operational' ? 'All systems operational.' : overall === 'degraded' ? 'Some systems degraded.' : 'Major outage in progress.'}
          </h1>

          <p className="text-[14.5px]" style={{ color: 'var(--fg-muted)' }}>
            Updated <span className="font-mono">2026-05-11 17:42 UTC</span> · Refreshes every 60 seconds
          </p>

          <div className="flex items-center gap-6 mt-3 text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            <UptimeStat label="90-day uptime"  value="99.97%" />
            <Divider />
            <UptimeStat label="Last incident"  value="3 days ago" />
            <Divider />
            <UptimeStat label="MTTR (90d)"     value="14 min" />
          </div>
        </div>
      </section>

      {/* ─── REGIONAL MAP ──────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-2">
        <RegionalMap />
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-10"><SeamDivider /></div>

      {/* ─── SERVICE GRID ──────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-12">
        <SectionHead
          eyebrow="Components"
          title="Health by component, last 90 days."
          lede="Each tile is one day. Hover to see the date and status. Anything not green gets a public incident."
          align="left"
        />

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
        >
          {SERVICES.map((s, i) => (
            <ServiceRow key={s.id} service={s} idx={i} />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 px-1 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
          <span>Last 90 days</span>
          <Legend color="var(--intent-success-fg)" label="Operational" />
          <Legend color="var(--intent-warn-fg)"    label="Degraded" />
          <Legend color="var(--intent-danger-fg)"  label="Outage" />
        </div>
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-12"><SeamDivider /></div>

      {/* ─── INCIDENTS ─────────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-12">
        <SectionHead
          eyebrow="Recent incidents"
          title="What broke. What we did. When it ended."
          lede="Public incidents are posted within 5 minutes. Postmortems land within 5 business days."
          align="left"
        />
        <div className="flex flex-col gap-3">
          {INCIDENTS.map((inc) => <IncidentCard key={inc.id} incident={inc} />)}
        </div>
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-12"><SeamDivider /></div>

      {/* ─── SUBSCRIBE BAND ────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-12 mb-12">
        <SubscribeBand />
      </section>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Pulse dot (live indicator)

function PulseDot({ status }: { status: Status }) {
  const color = status === 'operational' ? 'var(--intent-success-fg)'
    : status === 'degraded' ? 'var(--intent-warn-fg)'
    : 'var(--intent-danger-fg)';
  return (
    <span className="relative inline-flex w-2 h-2 mr-1">
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pulse-ring"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      <style>{`
        .pulse-ring {
          animation: status-pulse 1.8s ease-out infinite;
        }
        @keyframes status-pulse {
          0%   { transform: scale(1); opacity: 0.7; }
          80%  { transform: scale(2.6); opacity: 0; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      `}</style>
    </span>
  );
}

function UptimeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--fg-strong)' }}>{value}</span>
      <span style={{ color: 'var(--fg-subtle)' }}>{label}</span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="w-px h-3" style={{ background: 'var(--border-muted)' }} />;
}

// ─────────────────────────────────────────────────────────────────────────
// Regional map — pure SVG with dots positioned by lat/lon

function RegionalMap() {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-6"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: 'var(--fg-muted)' }} />
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>Edge regions</span>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
          Median latency from your nearest probe
        </span>
      </div>

      <div className="relative w-full" style={{ height: 260 }}>
        {/* Faint world-grid backdrop */}
        <svg
          aria-hidden
          viewBox="0 0 100 50"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
              <circle cx="0.5" cy="0.5" r="0.4" fill="color-mix(in srgb, var(--fg-strong) 14%, transparent)" />
            </pattern>
          </defs>
          <rect width="100" height="50" fill="url(#dots)" />
        </svg>

        {/* Region pins */}
        {REGIONS.map((r) => {
          const color = r.status === 'operational' ? 'var(--intent-success-fg)'
            : r.status === 'degraded' ? 'var(--intent-warn-fg)'
            : 'var(--intent-danger-fg)';
          return (
            <div
              key={r.id}
              className="absolute group"
              style={{
                left: `${r.lon}%`,
                top: `${r.lat}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <PulseDot status={r.status} />
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 rounded-md whitespace-nowrap text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-default)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <span className="font-semibold" style={{ color }}>{r.label}</span>
                <span className="ml-2 font-mono tabular-nums" style={{ color: 'var(--fg-muted)' }}>{r.latencyMs}ms</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Region table strip below the map */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-muted)' }}>
        {REGIONS.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: r.status === 'operational' ? 'var(--intent-success-fg)'
                    : r.status === 'degraded' ? 'var(--intent-warn-fg)'
                    : 'var(--intent-danger-fg)',
                }}
              />
              <span className="truncate" style={{ color: 'var(--fg-default)' }}>{r.label}</span>
            </span>
            <span className="font-mono tabular-nums shrink-0" style={{ color: 'var(--fg-muted)' }}>{r.latencyMs}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Service row — name + 90-bar sparkbar + uptime %

function ServiceRow({ service, idx }: { service: Service; idx: number }) {
  const Icon = service.icon;
  const history = useMemo(
    () => historyFor(service.id.charCodeAt(0) * 31 + service.id.length, service.status === 'degraded' ? 0.18 : 0.06),
    [service.id, service.status],
  );
  const uptime = (history.filter((d) => d === 'operational').length / history.length) * 100;

  const rowRef = useRef<HTMLDivElement>(null);
  useHoverStyle(rowRef, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={rowRef}
      className="grid items-center px-5 py-4 transition-colors"
      style={{
        gridTemplateColumns: '220px 1fr 90px 110px',
        gap: 16,
        borderTop: idx === 0 ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>{service.name}</span>
          <span className="text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>{service.description}</span>
        </div>
      </div>

      <SparkBar history={history} />

      <span className="text-[12px] tabular-nums text-right" style={{ color: 'var(--fg-muted)' }}>
        {uptime.toFixed(2)}%
      </span>

      <StatusPill status={service.status} />
    </div>
  );
}

function SparkBar({ history }: { history: Status[] }) {
  return (
    <div className="flex items-end gap-[2px] h-7 group">
      {history.map((d, i) => {
        const color = d === 'operational' ? 'var(--intent-success-fg)'
          : d === 'degraded' ? 'var(--intent-warn-fg)'
          : 'var(--intent-danger-fg)';
        return (
          <span
            key={i}
            className="flex-1 rounded-sm transition-opacity"
            style={{
              background: color,
              minWidth: 2,
              height: d === 'operational' ? '60%' : d === 'degraded' ? '90%' : '100%',
              opacity: 0.85,
            }}
            title={`Day ${90 - i} · ${d}`}
          />
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const fg = status === 'operational' ? 'var(--intent-success-fg)'
    : status === 'degraded' ? 'var(--intent-warn-fg)'
    : 'var(--intent-danger-fg)';
  const bg = status === 'operational' ? 'var(--intent-success-bg)'
    : status === 'degraded' ? 'var(--intent-warn-bg)'
    : 'var(--intent-danger-bg)';
  const Icon = status === 'operational' ? CheckCircle2 : status === 'degraded' ? AlertTriangle : AlertTriangle;
  const label = status === 'operational' ? 'Operational' : status === 'degraded' ? 'Degraded' : 'Outage';
  return (
    <span
      className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] uppercase tracking-[0.14em] font-semibold w-fit ml-auto"
      style={{
        background: bg,
        color: fg,
        border: `1px solid color-mix(in srgb, ${fg} 35%, transparent)`,
      }}
    >
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Incident card

function IncidentCard({ incident }: { incident: Incident }) {
  const [open, setOpen] = useState(incident.status !== 'resolved');
  const tone = incident.status === 'resolved' ? 'success'
    : incident.status === 'monitoring' ? 'info'
    : 'warn';
  const fg = tone === 'success' ? 'var(--intent-success-fg)'
    : tone === 'info'    ? 'var(--intent-info-fg)'
    : 'var(--intent-warn-fg)';
  const bg = tone === 'success' ? 'var(--intent-success-bg)'
    : tone === 'info'    ? 'var(--intent-info-bg)'
    : 'var(--intent-warn-bg)';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span
          className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] uppercase tracking-[0.14em] font-semibold shrink-0"
          style={{
            background: bg,
            color: fg,
            border: `1px solid color-mix(in srgb, ${fg} 35%, transparent)`,
          }}
        >
          {incident.status === 'monitoring' && <PulseDot status="degraded" />}
          {incident.status}
        </span>
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>{incident.title}</span>
          <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
            <span className="font-mono">{incident.startedAt}</span>
            {incident.resolvedAt && <> → <span className="font-mono">{incident.resolvedAt}</span></>}
            {' · '}Affected: {incident.affected.join(' · ')}
          </span>
        </div>
        <ChevronDown
          className="w-4 h-4 transition-transform shrink-0"
          style={{
            color: 'var(--fg-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open && (
        <div className="relative px-5 pb-5 pt-1 pl-12">
          <div
            aria-hidden
            className="absolute top-2 bottom-6 w-px"
            style={{ left: 24, background: 'var(--border-muted)' }}
          />
          <div className="flex flex-col gap-4">
            {incident.updates.map((u, i) => (
              <div key={i} className="relative">
                <div
                  aria-hidden
                  className="absolute -left-[16px] top-1.5 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: i === 0 ? fg : 'var(--bg-canvas)',
                    border: `2px solid ${i === 0 ? fg : 'var(--border-default)'}`,
                  }}
                />
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: i === 0 ? fg : 'var(--fg-muted)' }}>
                    {u.status}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{u.at}</span>
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-default)' }}>{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Subscribe band

function SubscribeBand() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-8 py-10 grid gap-6"
      style={{
        background:
          'radial-gradient(ellipse 70% 100% at 100% 0%, color-mix(in srgb, var(--brand-vivid) 18%, transparent), transparent 70%), var(--bg-canvas)',
        border: '1px solid var(--border-default)',
        gridTemplateColumns: '1fr 360px',
      }}
    >
      <div className="flex flex-col gap-3 min-w-0">
        <Eyebrow tone="info"><Activity className="w-2.5 h-2.5" /> Subscribe</Eyebrow>
        <h3 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.018em]" style={{ color: 'var(--fg-strong)' }}>
          Get notified when something breaks.
        </h3>
        <p className="text-[12px] leading-relaxed max-w-[480px]" style={{ color: 'var(--fg-muted)' }}>
          One email per incident, when it opens and again when it resolves. No marketing.
          Webhook + RSS available for status-page-aggregators.
        </p>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); setDone(true); }}
        className="flex flex-col gap-2 self-end"
      >
        <div
          className="flex items-center h-11 rounded-md"
          style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
        >
          <Mail className="w-3.5 h-3.5 mx-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setDone(false); }}
            placeholder="oncall@team.com"
            required
            className="flex-1 bg-transparent outline-none text-[12px] pr-3"
            style={{ color: 'var(--fg-strong)' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md text-[12px] font-semibold"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            {done ? 'Subscribed ✓' : 'Subscribe'}
          </button>
          <a
            href="/status.rss"
            className="inline-flex items-center justify-center w-10 h-10 rounded-md"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-muted)',
            }}
            aria-label="RSS feed"
          >
            <Rss className="w-3.5 h-3.5" />
          </a>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Util

function worstOf(a: Status, b: Status): Status {
  const rank = { operational: 0, degraded: 1, outage: 2 } as const;
  return rank[b] > rank[a] ? b : a;
}
