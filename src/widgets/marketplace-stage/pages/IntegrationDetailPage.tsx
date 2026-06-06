import { useParams, Link } from '@tanstack/react-router';
import {
  Star, ShieldCheck, CheckCircle2, ArrowLeft, ExternalLink, Download,
  Lock, Calendar, FileText, Plug,
} from 'lucide-react';
import { PublicShell } from '@shared/ui/marketing';
import { INTEGRATIONS } from './MarketplacePage';
import { formatNumber } from '@shared/i18n';

export default function IntegrationDetailPage() {
  // This route's `$slug` isn't in the typed param registry (path registered as
  // a plain string), so narrow it in `select` across that untyped boundary.
  const slug = useParams({ strict: false, select: (p) => (p as { slug?: string }).slug });
  const integration = INTEGRATIONS.find((i) => i.slug === slug) ?? INTEGRATIONS[0];
  const { icon: Icon } = integration;

  return (
    <PublicShell width="wide">
      <Link
        to={'/integrations' as never}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium mb-6 transition-colors"
        style={{ color: 'var(--fg-muted)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All integrations
      </Link>

      {/* Hero */}
      <div className="flex items-start gap-6 mb-8">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white shrink-0"
          style={{
            backgroundImage: `linear-gradient(135deg, ${integration.tone.from}, ${integration.tone.to})`,
            boxShadow: '0 12px 28px -10px color-mix(in srgb, var(--fg-strong) 22%, transparent)',
          }}
        >
          <Icon className="w-10 h-10" />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-semibold tracking-tight leading-none" style={{ color: 'var(--fg-strong)' }}>
              {integration.name}
            </h1>
            {integration.verified && (
              <span
                className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full text-[10px] font-semibold"
                style={{
                  color: 'var(--fg-accent)',
                  background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
                }}
              >
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
          <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            By <span className="font-medium">{integration.vendor}</span> · {integration.category}
          </p>
          <div className="flex items-center gap-4 mt-1 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5" />
              <span className="tabular-nums font-medium" style={{ color: 'var(--fg-default)' }}>
                {integration.rating.toFixed(1)}
              </span>
              <span>· 184 reviews</span>
            </span>
            <span className="tabular-nums">
              <span className="font-medium" style={{ color: 'var(--fg-default)' }}>{formatNumber(integration.installs)}</span>
              <span> installs</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Updated 5 days ago
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-md text-[12px] font-semibold transition-colors"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-10 px-3 rounded-md text-[11px] font-semibold transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            Website
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main column */}
        <div className="col-span-2 flex flex-col gap-10">
          <section>
            <h2 className="text-[14px] font-semibold tracking-tight mb-3" style={{ color: 'var(--fg-strong)' }}>
              Overview
            </h2>
            <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: 'var(--fg-default)' }}>
              {integration.blurb}
            </p>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              This integration is maintained by {integration.vendor}. It connects {integration.name} to your se.field
              workspace using OAuth, exchanges scoped tokens, and listens for the events you opt in to. Uninstalling
              revokes the token immediately — see the audit log for every action it takes.
            </p>
          </section>

          <section>
            <h2 className="text-[14px] font-semibold tracking-tight mb-3" style={{ color: 'var(--fg-strong)' }}>
              What you can do
            </h2>
            <ul className="flex flex-col gap-2">
              {[
                'Route admission failures to a chosen channel or workspace',
                'Acknowledge alerts inline with bi-directional message updates',
                'Slash commands for triaging the latest agent runs',
                'Per-team routing rules driven by CODEOWNERS metadata',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--fg-default)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-success-fg)' }} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[14px] font-semibold tracking-tight mb-3" style={{ color: 'var(--fg-strong)' }}>
              Screenshots
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="aspect-video rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      `linear-gradient(135deg, color-mix(in srgb, ${integration.tone.from} 18%, var(--bg-canvas)), color-mix(in srgb, ${integration.tone.to} 14%, var(--bg-canvas)))`,
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <Icon className="w-8 h-8 opacity-30" style={{ color: 'var(--fg-strong)' }} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[14px] font-semibold tracking-tight mb-3" style={{ color: 'var(--fg-strong)' }}>
              Permissions requested
            </h2>
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
              }}
            >
              {['workspaces:read', 'admission:read', 'agents:read', 'webhooks:write'].map((scope, i, arr) => (
                <div
                  key={scope}
                  className="flex items-center gap-3 p-3"
                  style={{
                    borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-muted)',
                  }}
                >
                  <Lock className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
                  <code className="text-[12px] font-mono" style={{ color: 'var(--fg-strong)' }}>{scope}</code>
                  <span className="ml-auto text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                    {scope.endsWith(':write') ? 'Send updates back to your workspace' : 'Read events for routing'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          <SideCard title="Details">
            <SideRow label="Category" value={integration.category} />
            <SideRow label="Pricing"  value="Free" />
            <SideRow label="Plan"     value={integration.slug === 'okta' ? 'Enterprise' : 'All plans'} />
            <SideRow label="Vendor"   value={integration.vendor} />
            <SideRow label="Updated"  value="5 days ago" />
          </SideCard>

          <SideCard title="Resources">
            <SideLink icon={FileText} label="Documentation" />
            <SideLink icon={Plug} label="Setup guide" />
            <SideLink icon={ExternalLink} label="Vendor support" />
          </SideCard>

          <div
            className="rounded-lg p-4"
            style={{
              background: 'color-mix(in srgb, var(--intent-success-fg) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--intent-success-fg) 35%, transparent)',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--intent-success-fg)' }}>
                Security reviewed
              </span>
            </div>
            <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
              Verified integrations are reviewed for permissions hygiene, secret handling, and event payload exposure.
            </p>
          </div>
        </aside>
      </div>
    </PublicShell>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="px-4 h-8 flex items-center text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{ color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-muted)' }}
      >
        {title}
      </div>
      <div className="p-1">{children}</div>
    </div>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 h-8 text-[11px]">
      <span style={{ color: 'var(--fg-subtle)' }}>{label}</span>
      <span className="font-medium capitalize" style={{ color: 'var(--fg-default)' }}>{value}</span>
    </div>
  );
}

function SideLink({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-3 h-8 rounded text-[11px] font-medium transition-colors w-full bg-transparent border-0 text-left cursor-pointer"
      style={{ color: 'var(--fg-default)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
      {label}
      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
    </button>
  );
}
