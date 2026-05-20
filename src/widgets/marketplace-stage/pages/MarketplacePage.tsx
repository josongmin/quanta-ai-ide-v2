import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Search, Filter, Sparkles, ShieldCheck, Star, ArrowUpRight, CheckCircle2,
  MessageSquare, GitBranch, BarChart3, Bell, Briefcase, Bot, Code2, Lock,
} from 'lucide-react';
import { PublicShell , HeroBackdrop, Eyebrow, HeadlineGradient, SeamDivider } from '@shared/ui/marketing';
import { formatNumber } from '@shared/i18n';

type Category =
  | 'all' | 'chat' | 'ticketing' | 'observability' | 'identity'
  | 'devtools' | 'analytics' | 'ai';

type Integration = {
  slug: string;
  name: string;
  vendor: string;
  category: Exclude<Category, 'all'>;
  blurb: string;
  installs: number;
  rating: number;
  verified: boolean;
  featured?: boolean;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tone: { from: string; to: string };
};

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all',           label: 'All' },
  { id: 'chat',          label: 'Chat' },
  { id: 'ticketing',     label: 'Ticketing' },
  { id: 'observability', label: 'Observability' },
  { id: 'identity',      label: 'Identity' },
  { id: 'devtools',      label: 'Dev tools' },
  { id: 'analytics',     label: 'Analytics' },
  { id: 'ai',            label: 'AI' },
];

const INTEGRATIONS: Integration[] = [
  { slug: 'slack',     name: 'Slack',      vendor: 'Slack',      category: 'chat',           blurb: 'Channel routing, threaded alerts, and slash commands.',     installs: 12480, rating: 4.8, verified: true, featured: true, icon: MessageSquare, tone: { from: 'var(--fg-accent)', to: 'var(--fg-link)' } },
  { slug: 'linear',    name: 'Linear',     vendor: 'Linear',     category: 'ticketing',      blurb: 'Sync admission failures and fix PRs to Linear issues.',     installs: 6420,  rating: 4.9, verified: true, featured: true, icon: Briefcase, tone: { from: 'var(--fg-link)', to: 'var(--intent-info-fg)' } },
  { slug: 'jira',      name: 'Jira',       vendor: 'Atlassian',  category: 'ticketing',      blurb: 'Bi-directional issue sync. Auto-create from agent runs.',  installs: 4810,  rating: 4.5, verified: true, icon: Briefcase, tone: { from: 'var(--intent-info-fg)', to: 'var(--fg-accent)' } },
  { slug: 'datadog',   name: 'Datadog',    vendor: 'Datadog',    category: 'observability',  blurb: 'Push metrics and admission events to a Datadog dashboard.', installs: 3210,  rating: 4.6, verified: true, icon: BarChart3, tone: { from: 'var(--intent-warn-fg)', to: 'var(--intent-danger-fg)' } },
  { slug: 'pagerduty', name: 'PagerDuty',  vendor: 'PagerDuty',  category: 'observability',  blurb: 'Page oncall on agent failures or admission outages.',       installs: 2840,  rating: 4.7, verified: true, icon: Bell, tone: { from: 'var(--intent-success-fg)', to: 'var(--fg-accent)' } },
  { slug: 'okta',      name: 'Okta',       vendor: 'Okta',       category: 'identity',       blurb: 'SAML SSO + SCIM provisioning. Enterprise plan.',            installs: 1820,  rating: 4.8, verified: true, icon: Lock, tone: { from: 'var(--intent-info-fg)', to: 'var(--fg-link)' } },
  { slug: 'github',    name: 'GitHub',     vendor: 'GitHub',     category: 'devtools',       blurb: 'Repo connection, status checks, PR comments.',              installs: 18900, rating: 4.9, verified: true, featured: true, icon: GitBranch, tone: { from: 'var(--fg-strong)', to: 'var(--fg-accent)' } },
  { slug: 'gitlab',    name: 'GitLab',     vendor: 'GitLab',     category: 'devtools',       blurb: 'MR pipelines and merge checks, self-hosted-compatible.',    installs: 2410,  rating: 4.4, verified: true, icon: GitBranch, tone: { from: 'var(--intent-warn-fg)', to: 'var(--intent-danger-fg)' } },
  { slug: 'amplitude', name: 'Amplitude',  vendor: 'Amplitude',  category: 'analytics',      blurb: 'Stream usage events for product analytics.',                installs: 1120,  rating: 4.3, verified: false, icon: BarChart3, tone: { from: 'var(--fg-link)', to: 'var(--fg-accent)' } },
  { slug: 'openai',    name: 'OpenAI',     vendor: 'OpenAI',     category: 'ai',             blurb: 'Bring-your-own model key for the autonomous fix agents.',   installs: 5320,  rating: 4.7, verified: true, icon: Bot, tone: { from: 'var(--intent-success-fg)', to: 'var(--intent-info-fg)' } },
  { slug: 'anthropic', name: 'Anthropic',  vendor: 'Anthropic',  category: 'ai',             blurb: 'Use Claude as the reasoning engine for review + fix.',      installs: 4210,  rating: 4.8, verified: true, featured: true, icon: Bot, tone: { from: 'var(--fg-accent)', to: 'var(--intent-warn-fg)' } },
  { slug: 'sentry',    name: 'Sentry',     vendor: 'Sentry',     category: 'observability',  blurb: 'Pull live errors into admission context.',                  installs: 2010,  rating: 4.5, verified: true, icon: Code2, tone: { from: 'var(--intent-danger-fg)', to: 'var(--fg-link)' } },
];

export default function MarketplacePage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category>('all');

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return INTEGRATIONS.filter((i) => {
      const matchCat = cat === 'all' || i.category === cat;
      const matchQ = !n
        || i.name.toLowerCase().includes(n)
        || i.vendor.toLowerCase().includes(n)
        || i.blurb.toLowerCase().includes(n);
      return matchCat && matchQ;
    });
  }, [q, cat]);

  const featured = INTEGRATIONS.filter((i) => i.featured);

  return (
    <PublicShell width="bleed">
      <div className="relative">
        <HeroBackdrop height="h-[460px]" intensity={0.5} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-16 pb-12 flex flex-col items-center text-center gap-5">
          <Eyebrow>Marketplace</Eyebrow>
          <HeadlineGradient accent="every tool">Plug se.field into</HeadlineGradient>
          <p className="text-[14.5px] leading-relaxed max-w-[560px]" style={{ color: 'var(--fg-muted)' }}>
            Verified, security-reviewed integrations from Slack to Datadog. Install in one click; revoke just as fast.
          </p>

          {/* Search */}
          <div
            className="mt-4 flex items-center gap-2 h-12 w-full max-w-[560px] px-4 rounded-full"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 4px 20px -8px color-mix(in srgb, var(--fg-strong) 18%, transparent)',
            }}
          >
            <Search className="w-4 h-4" style={{ color: 'var(--fg-subtle)' }} />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); }}
              placeholder="Search integrations — Slack, Datadog, OpenAI…"
              className="flex-1 bg-transparent outline-none text-[13.5px]"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
              {INTEGRATIONS.length} apps
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1080px] mx-auto px-8 pb-24">
        {/* Featured strip */}
        {q.trim() === '' && cat === 'all' && (
          <>
            <SectionLabel icon={Sparkles} label="Featured" hint="Hand-picked by the team" />
            <div className="grid grid-cols-2 gap-3 mb-12">
              {featured.slice(0, 4).map((i) => (
                <FeaturedCard key={i.slug} integration={i} />
              ))}
            </div>
            <SeamDivider />
          </>
        )}

        {/* Category filter */}
        <div className="flex items-center gap-2 my-6 flex-wrap">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
          {CATEGORIES.map((c) => {
            const active = c.id === cat;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCat(c.id); }}
                className="h-8 px-3 rounded-full text-[11px] font-medium transition-colors"
                style={{
                  background: active ? 'color-mix(in srgb, var(--fg-accent) 12%, transparent)' : 'transparent',
                  color: active ? 'var(--fg-accent)' : 'var(--fg-muted)',
                  border: `1px solid ${active ? 'color-mix(in srgb, var(--fg-accent) 40%, transparent)' : 'var(--border-default)'}`,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((i) => (
            <IntegrationCard key={i.slug} integration={i} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-[12px]" style={{ color: 'var(--fg-subtle)' }}>
            No integrations match &quot;{q}&quot;.
          </div>
        )}

        {/* CTA: build your own */}
        <div
          className="mt-16 rounded-2xl p-8 flex items-center justify-between gap-6 overflow-hidden relative"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 90% 50%, color-mix(in srgb, var(--fg-accent) 16%, transparent), transparent 70%)',
            }}
          />
          <div className="relative flex flex-col gap-1">
            <h3 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Need something custom?
            </h3>
            <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
              Build a private integration with our OAuth + webhooks. Or list it publicly — partners get a fast-track review.
            </p>
          </div>
          <div className="relative flex items-center gap-2 shrink-0">
            <Link
              to={'/developers' as never}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-colors"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              Developer docs
              <ArrowUpRight className="w-3 h-3" />
            </Link>
            <Link
              to={'/contact-sales' as never}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-colors"
              style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
            >
              Partner with us
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

function SectionLabel({
  icon: Icon, label, hint,
}: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mt-12 mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
        <h2 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {label}
        </h2>
      </div>
      {hint && (
        <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>{hint}</span>
      )}
    </div>
  );
}

function FeaturedCard({ integration }: { integration: Integration }) {
  const { icon: Icon } = integration;
  return (
    <Link
      to={'/integrations/$slug' as never}
      params={{ slug: integration.slug } as never}
      className="group flex items-center gap-4 rounded-xl p-5 transition-all"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 30px -12px color-mix(in srgb, var(--fg-accent) 22%, transparent)';
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--fg-accent) 60%, var(--border-default))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, ${integration.tone.from}, ${integration.tone.to})`,
        }}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold tracking-tight truncate" style={{ color: 'var(--fg-strong)' }}>
            {integration.name}
          </h3>
          {integration.verified && (
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
          )}
        </div>
        <p className="text-[12px] leading-snug truncate" style={{ color: 'var(--fg-muted)' }}>
          {integration.blurb}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          <span className="inline-flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span className="tabular-nums">{integration.rating.toFixed(1)}</span>
          </span>
          <span className="tabular-nums">{formatNumber(integration.installs)} installs</span>
        </div>
      </div>
      <ArrowUpRight
        className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: 'var(--fg-link)' }}
      />
    </Link>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const { icon: Icon } = integration;
  return (
    <Link
      to={'/integrations/$slug' as never}
      params={{ slug: integration.slug } as never}
      className="group flex flex-col gap-3 rounded-xl p-4 transition-colors"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style={{
            backgroundImage: `linear-gradient(135deg, ${integration.tone.from}, ${integration.tone.to})`,
          }}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex items-center gap-1">
          {integration.verified && (
            <span
              title="Verified"
              className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] font-semibold"
              style={{ color: 'var(--fg-accent)' }}
            >
              <ShieldCheck className="w-3 h-3" />
              verified
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {integration.name}
        </h3>
        <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{integration.blurb}</p>
      </div>
      <div className="flex items-center gap-3 mt-auto text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
        <span className="inline-flex items-center gap-1">
          <Star className="w-3 h-3" />
          <span className="tabular-nums">{integration.rating.toFixed(1)}</span>
        </span>
        <span className="tabular-nums">{formatNumber(integration.installs)} installs</span>
      </div>
    </Link>
  );
}

export { INTEGRATIONS };
