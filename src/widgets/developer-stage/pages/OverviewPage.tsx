import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  BookOpen, PlayCircle, KeyRound, Webhook, Terminal, Package,
  ArrowUpRight, Sparkles, Cpu, Activity,
} from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { DeveloperShell } from '../parts/DeveloperShell';

type Card = {
  to: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  blurb: string;
  meta?: string;
};

const PRIMARY: Card[] = [
  { to: '/developers/api',        icon: BookOpen,   title: 'API reference', blurb: 'REST & GraphQL surface, every endpoint with copy-as-curl.', meta: 'v2025-10 · stable' },
  { to: '/developers/playground', icon: PlayCircle, title: 'Playground',     blurb: 'Run authenticated requests against your live workspace.',     meta: 'Live · 18ms p50' },
  { to: '/developers/cli',        icon: Terminal,   title: 'CLI',            blurb: 'One binary. Pipelines, scripts, CI. Mac · Linux · Windows.',  meta: 'v3.14.0' },
];

const SECONDARY: Card[] = [
  { to: '/developers/oauth-apps', icon: KeyRound, title: 'OAuth apps',     blurb: 'Register clients, manage scopes, rotate secrets.' },
  { to: '/developers/webhooks',   icon: Webhook,  title: 'Webhooks',       blurb: 'Subscribe to events. Inspect, retry, replay individual deliveries.' },
  { to: '/developers/sdks',       icon: Package,  title: 'SDKs',           blurb: 'TypeScript · Go · Python · Ruby. Typed clients, auto-pagination.' },
];

const QUICKSTART = [
  { lang: 'curl',       code: `curl https://api.acme.dev/v1/workspaces \\\n  -H "Authorization: Bearer $ACME_TOKEN"` },
  { lang: 'TypeScript', code: `import { Acme } from "@acme/sdk";\nconst acme = new Acme(process.env.ACME_TOKEN);\nawait acme.workspaces.list();` },
  { lang: 'Go',         code: `client := acme.NewClient(os.Getenv("ACME_TOKEN"))\nws, _ := client.Workspaces.List(ctx, nil)` },
  { lang: 'Python',     code: `from acme import Acme\nacme = Acme(os.environ["ACME_TOKEN"])\nacme.workspaces.list()` },
];

export default function DevOverviewPage() {
  return (
    <DeveloperShell
      title="Build on se.field"
      subtitle="The same API powers our app, your scripts, and every integration in the marketplace."
      topRight={
        <a
          href="https://github.com/acme/se-field"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold transition-colors"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        >
          <GithubIcon className="w-3.5 h-3.5" />
          GitHub
          <ArrowUpRight className="w-3 h-3 opacity-60" />
        </a>
      }
    >
      {/* Three-up primary cards */}
      <div className="grid grid-cols-3 gap-3 mb-12">
        {PRIMARY.map((c) => (
          <BigCard key={c.to} card={c} />
        ))}
      </div>

      {/* Quickstart */}
      <section className="mb-12">
        <SectionTitle
          icon={Sparkles}
          title="Quickstart"
          hint="A request authenticated as you, in your preferred language."
        />
        <Quickstart />
      </section>

      {/* Secondary cards */}
      <section className="mb-12">
        <SectionTitle icon={Cpu} title="More tools" />
        <div className="grid grid-cols-3 gap-3">
          {SECONDARY.map((c) => (
            <SmallCard key={c.to} card={c} />
          ))}
        </div>
      </section>

      {/* Live API health strip */}
      <section className="mb-2">
        <SectionTitle icon={Activity} title="API health" hint="Past 24 hours" />
        <HealthStrip />
      </section>
    </DeveloperShell>
  );
}

function SectionTitle({
  icon: Icon, title, hint,
}: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; title: string; hint?: string }) {
  return (
    <header className="flex items-baseline justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        <h2 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {title}
        </h2>
      </div>
      {hint && (
        <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>{hint}</span>
      )}
    </header>
  );
}

function BigCard({ card }: { card: Card }) {
  const { icon: Icon, title, blurb, meta, to } = card;
  return (
    <Link
      to={to as never}
      className="group flex flex-col gap-3 rounded-xl p-5 transition-all"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 0 0 color-mix(in srgb, var(--fg-strong) 4%, transparent)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 30px -12px color-mix(in srgb, var(--fg-accent) 22%, transparent)';
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--fg-accent) 60%, var(--border-default))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 0 0 color-mix(in srgb, var(--fg-strong) 4%, transparent)';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--fg-accent) 12%, transparent)',
            color: 'var(--fg-accent)',
          }}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <ArrowUpRight
          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--fg-link)' }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {title}
        </h3>
        <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{blurb}</p>
      </div>
      {meta && (
        <code className="text-[10px] font-mono tabular-nums mt-1" style={{ color: 'var(--fg-subtle)' }}>
          {meta}
        </code>
      )}
    </Link>
  );
}

function SmallCard({ card }: { card: Card }) {
  const { icon: Icon, title, blurb, to } = card;
  return (
    <Link
      to={to as never}
      className="group flex flex-col gap-2 rounded-lg p-4 transition-colors"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-canvas)';
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>{title}</span>
        <ArrowUpRight
          className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--fg-link)' }}
        />
      </div>
      <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{blurb}</p>
    </Link>
  );
}

function Quickstart() {
  const [tab, setTab] = useState(0);
  const current = QUICKSTART[tab];
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center border-b"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        {QUICKSTART.map((q, i) => {
          const active = i === tab;
          return (
            <button
              key={q.lang}
              type="button"
              onClick={() => { setTab(i); }}
              className="h-9 px-4 text-[11px] font-medium transition-colors"
              style={{
                color: active ? 'var(--fg-strong)' : 'var(--fg-subtle)',
                background: active ? 'var(--bg-surface-muted)' : 'transparent',
                borderRight: '1px solid var(--border-muted)',
                position: 'relative',
              }}
            >
              {q.lang}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-px"
                  style={{ background: 'var(--fg-accent)' }}
                />
              )}
            </button>
          );
        })}
        <div className="ml-auto pr-3">
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                void navigator.clipboard.writeText(current.code);
              }
            }}
            className="h-7 px-2.5 rounded text-[10px] uppercase tracking-[0.14em] font-semibold transition-colors"
            style={{
              color: 'var(--fg-muted)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Copy
          </button>
        </div>
      </div>
      <pre
        className="text-[12px] leading-relaxed p-5 m-0 overflow-x-auto font-mono"
        style={{
          color: 'var(--fg-strong)',
          background: 'var(--bg-surface-muted)',
        }}
      >
        {current.code}
      </pre>
    </div>
  );
}

function HealthStrip() {
  // 24 hourly buckets, deterministic
  const buckets = Array.from({ length: 24 }, (_, i) => {
    const r = (Math.sin(i * 1.37) + 1) / 2;
    const p50 = 12 + r * 8;
    const p99 = 38 + r * 18 + (i === 14 ? 22 : 0);
    return { hour: i, p50, p99 };
  });
  const max = Math.max(...buckets.map((b) => b.p99));
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
            p50 latency
          </span>
          <span className="text-[20px] font-semibold tracking-tight tabular-nums" style={{ color: 'var(--fg-strong)' }}>
            18<span className="text-[12px] font-normal" style={{ color: 'var(--fg-muted)' }}>ms</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Stat label="p99" value="74ms" />
          <Stat label="success" value="99.98%" tone="success" />
          <Stat label="requests" value="4.2M / day" />
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-14">
        {buckets.map((b) => (
          <div
            key={b.hour}
            title={`${b.hour}:00 · p50 ${b.p50.toFixed(0)}ms · p99 ${b.p99.toFixed(0)}ms`}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(8, (b.p99 / max) * 100)}%`,
              background: `linear-gradient(to top, color-mix(in srgb, var(--fg-accent) ${20 + (b.p99 / max) * 50}%, transparent), var(--fg-accent))`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex flex-col gap-0.5 text-right">
      <span className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <span
        className="text-[12px] font-semibold tabular-nums"
        style={{ color: tone === 'success' ? 'var(--intent-success-fg)' : 'var(--fg-strong)' }}
      >
        {value}
      </span>
    </div>
  );
}
