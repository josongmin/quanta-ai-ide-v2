import { useState } from 'react';
import {
  Check, Minus, ChevronDown, Sparkles, ArrowRight,
  Zap, ShieldCheck, Users, Bot, Database, Globe, BarChart3,
} from 'lucide-react';
import { PublicShell ,
  HeroBackdrop, Eyebrow, HeadlineGradient, CountUp, LogoMarquee,
  SectionHead, LiftCard, SeamDivider,
} from '@shared/ui/marketing';

type Cycle = 'monthly' | 'annual';

type Plan = {
  id: 'free' | 'team' | 'business' | 'enterprise';
  name: string;
  tagline: string;
  monthly: number | null;
  annual: number | null;
  unit: string;
  cta: string;
  ctaPrimary?: boolean;
  featured?: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: 'free', name: 'Free', tagline: 'For individuals exploring the platform',
    monthly: 0, annual: 0, unit: '/ month',
    cta: 'Start free',
    features: [
      'Up to 5 members',
      '1 connected workspace',
      '500 agent runs / month',
      'Basic admission gates',
      'Community support',
    ],
  },
  {
    id: 'team', name: 'Team', tagline: 'For teams shipping every week',
    monthly: 29, annual: 24, unit: '/ seat / month',
    cta: 'Start 14-day trial', ctaPrimary: true, featured: true,
    features: [
      'Unlimited members',
      'Unlimited workspaces',
      'Unlimited agent runs',
      'Custom admission rules',
      'Slack / Linear / Jira integrations',
      'Email + chat support',
      'Audit log (30 days)',
    ],
  },
  {
    id: 'business', name: 'Business', tagline: 'For orgs with security & compliance',
    monthly: 79, annual: 64, unit: '/ seat / month',
    cta: 'Start 14-day trial',
    features: [
      'Everything in Team',
      'SAML SSO + SCIM provisioning',
      'Audit log (1 year)',
      'IP allowlist + session policy',
      'Custom roles (RBAC)',
      'Priority support · 4h SLA',
    ],
  },
  {
    id: 'enterprise', name: 'Enterprise', tagline: 'For regulated industries at scale',
    monthly: null, annual: null, unit: 'Annual contract',
    cta: 'Talk to sales',
    features: [
      'Everything in Business',
      'Data residency (US / EU / APAC)',
      'Dedicated infrastructure option',
      'Per-data-class retention policy',
      'Named CSM + onboarding',
      '99.99% uptime SLA',
      'Custom MSA / DPA / BAA',
    ],
  },
];

type Feature = { id: string; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; cells: (boolean | string)[] };
const MATRIX: { group: string; rows: Feature[] }[] = [
  {
    group: 'Core',
    rows: [
      { id: 'members',    label: 'Members',                icon: Users,    cells: ['5', '∞', '∞', '∞'] },
      { id: 'workspaces', label: 'Workspaces',             icon: Globe,    cells: ['1', '∞', '∞', '∞'] },
      { id: 'agentRuns',  label: 'Agent runs / month',     icon: Bot,      cells: ['500', '∞', '∞', '∞'] },
      { id: 'admission',  label: 'Custom admission rules', icon: ShieldCheck, cells: [false, true, true, true] },
    ],
  },
  {
    group: 'Security & compliance',
    rows: [
      { id: 'sso',        label: 'SAML SSO',               icon: ShieldCheck, cells: [false, false, true, true] },
      { id: 'scim',       label: 'SCIM provisioning',      icon: Users,    cells: [false, false, true, true] },
      { id: 'audit',      label: 'Audit log retention',    icon: BarChart3,cells: ['—', '30 days', '1 year', 'Custom'] },
      { id: 'rbac',       label: 'Custom roles (RBAC)',    icon: ShieldCheck, cells: [false, false, true, true] },
      { id: 'residency',  label: 'Data residency',         icon: Globe,    cells: [false, false, false, true] },
    ],
  },
  {
    group: 'Support',
    rows: [
      { id: 'sup',        label: 'Support channels',       icon: Sparkles, cells: ['Community', 'Email + chat', 'Priority · 4h', 'Named CSM'] },
      { id: 'sla',        label: 'Uptime SLA',             icon: Zap,      cells: ['—', '99.9%', '99.95%', '99.99%'] },
      { id: 'onboarding', label: 'Onboarding',             icon: Database, cells: ['Self-serve', 'Self-serve', 'Guided', 'White-glove'] },
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  { q: 'How does seat-based pricing work?', a: 'You\'re billed for active members each month. Invited-but-unconfirmed seats are free. Deactivating a member immediately drops them from the next invoice — no proration tricks.' },
  { q: 'What counts as an "agent run"?', a: 'A single autonomous action triggered by an admission gate, review request, or fix-pipeline kickoff. Failed runs that retry automatically don\'t multi-count.' },
  { q: 'Can I switch plans mid-cycle?', a: 'Yes. Upgrades take effect immediately and we prorate. Downgrades take effect at the next billing cycle so you keep features you\'ve paid for.' },
  { q: 'Do you offer discounts for non-profits or open source?', a: 'Yes — 50% off Team and Business for verified non-profits, and Free with no member cap for OSI-approved open source projects. Email hello@acme.com.' },
  { q: 'How are agent costs calculated for Enterprise?', a: 'Either bundled into a flat per-seat rate or metered per million tokens — your AE will quote both so you can compare against your usage profile.' },
  { q: 'Is there a free trial for paid plans?', a: 'Team and Business include a 14-day trial of all features. No card required to start, and the trial doesn\'t convert silently — you\'ll get a 3-day notice email before charging.' },
];

const CUSTOMERS = [
  { label: 'Linear',      mark: 'LN' },
  { label: 'Vercel',      mark: 'VC' },
  { label: 'Stripe',      mark: 'ST' },
  { label: 'Notion',      mark: 'NT' },
  { label: 'Figma',       mark: 'FG' },
  { label: 'Anthropic',   mark: 'AN' },
  { label: 'Datadog',     mark: 'DD' },
  { label: 'Cloudflare',  mark: 'CF' },
  { label: 'PlanetScale', mark: 'PS' },
  { label: 'Sentry',      mark: 'SN' },
];

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <PublicShell active="pricing" width="bleed">
      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="relative">
        <HeroBackdrop height="h-[640px]" intensity={0.7} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-20 pb-16 flex flex-col items-center text-center gap-6">
          <Eyebrow>Pricing</Eyebrow>
          <HeadlineGradient accent="engineering rigor.">Pricing that scales with</HeadlineGradient>
          <p className="text-[16.5px] leading-relaxed max-w-[620px]" style={{ color: 'var(--fg-muted)' }}>
            Start free. Upgrade when admission gates, custom roles, or data residency
            become non-negotiable. No hidden seat minimums. No &quot;contact us&quot; for the
            features you actually need.
          </p>

          <CycleToggle value={cycle} onChange={setCycle} />

          {/* Trust strip — small stat row sitting on the hero */}
          <div className="flex items-center gap-8 mt-6 text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            <TrustStat label="Active orgs"    value={<CountUp to={1284} />} />
            <Divider />
            <TrustStat label="Engineers shipping" value={<CountUp to={42392} format="compact" />} />
            <Divider />
            <TrustStat label="Median uptime" value="99.97%" />
          </div>
        </div>
      </section>

      {/* ─── PLAN GRID ──────────────────────────────────────────────── */}
      <section className="relative max-w-[1080px] mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-2">
          {PLANS.map((p) => <PlanCard key={p.id} plan={p} cycle={cycle} />)}
        </div>
        <p className="text-[11px] mt-4 text-center" style={{ color: 'var(--fg-subtle)' }}>
          All plans include unlimited workspaces, public Git host integrations, and the open-source CLI.
        </p>
      </section>

      {/* ─── LOGO MARQUEE ──────────────────────────────────────────── */}
      <section className="mt-16">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: 'var(--fg-subtle)' }}>
          Engineering teams shipping with se.field
        </p>
        <LogoMarquee items={CUSTOMERS} />
      </section>

      <SectionWrap><SeamDivider /></SectionWrap>

      {/* ─── FEATURE MATRIX ────────────────────────────────────────── */}
      <SectionWrap>
        <SectionHead
          eyebrow="Compare"
          title="Every feature, side-by-side."
          lede="No asterisks. No starter-edition footnotes. Here's exactly what you get on each plan."
        />
        <FeatureMatrix />
      </SectionWrap>

      <SectionWrap><SeamDivider /></SectionWrap>

      {/* ─── FAQ ────────────────────────────────────────────────────── */}
      <SectionWrap narrow>
        <SectionHead
          eyebrow="FAQ"
          title="The questions sales gets every week."
          lede="If your question isn't here, the answer is probably 'yes' — but email us anyway and we'll add it to the page."
        />
        <div className="flex flex-col gap-2">
          {FAQ.map((f, i) => {
            const open = openFaq === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { setOpenFaq(open ? null : i); }}
                className="flex flex-col text-left rounded-lg transition-colors"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-[14.5px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                    {f.q}
                  </span>
                  <ChevronDown
                    className="w-4 h-4 transition-transform shrink-0"
                    style={{
                      color: 'var(--fg-muted)',
                      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </div>
                {open && (
                  <div className="px-5 pb-4 -mt-1 text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                    {f.a}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </SectionWrap>

      <SectionWrap><SeamDivider /></SectionWrap>

      {/* ─── CTA BAND ───────────────────────────────────────────────── */}
      <SectionWrap>
        <div
          className="relative overflow-hidden rounded-2xl px-10 py-12 flex flex-col items-center text-center gap-5"
          style={{
            background:
              'radial-gradient(ellipse 80% 100% at 50% 0%, color-mix(in srgb, var(--brand-vivid) 22%, transparent), transparent 70%), var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <Eyebrow>Get started</Eyebrow>
          <h2 className="text-[28px] sm:text-[34px] leading-tight font-semibold tracking-[-0.018em] max-w-[640px]" style={{ color: 'var(--fg-strong)' }}>
            Start free. Upgrade when you&apos;re ready.
          </h2>
          <p className="text-[14.5px] leading-relaxed max-w-[520px]" style={{ color: 'var(--fg-muted)' }}>
            14 days to evaluate every paid feature. No card. No silent conversion. Cancel inside the app — no email needed.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <PrimaryCta>Start for free</PrimaryCta>
            <SecondaryCta>Talk to sales</SecondaryCta>
          </div>
        </div>
      </SectionWrap>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Hero pieces

function CycleToggle({ value, onChange }: { value: Cycle; onChange: (v: Cycle) => void }) {
  return (
    <div
      className="inline-flex items-center p-1 rounded-full mt-2"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 2px color-mix(in srgb, var(--fg-strong) 8%, transparent)',
      }}
    >
      {(['monthly', 'annual'] as Cycle[]).map((id) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => { onChange(id); }}
            className="relative h-9 px-4 rounded-full text-[12px] font-semibold transition-colors"
            style={{
              color: active ? 'var(--bg-canvas)' : 'var(--fg-muted)',
              background: active ? 'var(--fg-strong)' : 'transparent',
            }}
          >
            <span className="capitalize">{id}</span>
            {id === 'annual' && (
              <span
                className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: active ? 'color-mix(in srgb, var(--bg-canvas) 22%, transparent)' : 'var(--intent-success-bg)',
                  color: active ? 'var(--bg-canvas)' : 'var(--intent-success-fg)',
                }}
              >
                Save 17%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function TrustStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[16px] font-semibold tabular-nums" style={{ color: 'var(--fg-strong)' }}>{value}</span>
      <span style={{ color: 'var(--fg-subtle)' }}>{label}</span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="w-px h-3" style={{ background: 'var(--border-muted)' }} />;
}

// ─────────────────────────────────────────────────────────────────────────
// Plan card

function PlanCard({ plan, cycle }: { plan: Plan; cycle: Cycle }) {
  const price = cycle === 'annual' ? plan.annual : plan.monthly;
  return (
    <div className="relative">
      {plan.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span
            className="inline-flex items-center gap-1 px-2.5 h-6 text-[10px] uppercase tracking-[0.18em] font-semibold rounded-full"
            style={{
              background: 'var(--brand-vivid)',
              color: 'var(--bg-canvas)',
              boxShadow: '0 6px 18px -4px color-mix(in srgb, var(--brand-vivid) 65%, transparent)',
            }}
          >
            <Sparkles className="w-3 h-3" />
            Most popular
          </span>
        </div>
      )}
      <LiftCard featured={plan.featured} className="p-6 h-full">
        <div className="flex flex-col gap-1 min-h-[60px]">
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>{plan.name}</span>
          <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>{plan.tagline}</span>
        </div>

        <div className="mt-4 mb-5 flex items-baseline gap-1.5">
          {price === null ? (
            <span className="text-[34px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Custom
            </span>
          ) : (
            <>
              <span className="text-[14px]" style={{ color: 'var(--fg-muted)' }}>$</span>
              <span className="text-[42px] font-semibold tracking-[-0.02em] tabular-nums leading-none" style={{ color: 'var(--fg-strong)' }}>
                {price}
              </span>
              <span className="text-[12px] ml-1" style={{ color: 'var(--fg-muted)' }}>{plan.unit}</span>
            </>
          )}
        </div>
        {cycle === 'annual' && plan.monthly && plan.annual && plan.monthly > plan.annual && (
          <p className="text-[11px] -mt-3 mb-4" style={{ color: 'var(--intent-success-fg)' }}>
            ${plan.monthly}/mo billed monthly
          </p>
        )}

        {plan.ctaPrimary ? (
          <PrimaryCta block>{plan.cta}</PrimaryCta>
        ) : (
          <SecondaryCta block>{plan.cta}</SecondaryCta>
        )}

        <ul className="flex flex-col gap-2.5 mt-6">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--fg-default)' }}>
              <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-success-fg)' }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </LiftCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Feature matrix — per plan across rows

function FeatureMatrix() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div
        className="grid items-center px-4 sm:px-6 h-12 text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1.6fr repeat(4, 1fr)',
          gap: 12,
          background: 'var(--bg-canvas)',
          borderBottom: '1px solid var(--border-default)',
          color: 'var(--fg-subtle)',
        }}
      >
        <span>Feature</span>
        {PLANS.map((p) => (
          <span key={p.id} className="text-center" style={{ color: p.featured ? 'var(--brand-fg)' : 'var(--fg-default)' }}>
            {p.name}
          </span>
        ))}
      </div>

      {MATRIX.map((g, gi) => (
        <div key={g.group}>
          <div
            className="px-4 sm:px-6 py-2 text-[10px] uppercase tracking-[0.18em] font-semibold"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderTop: gi === 0 ? 'none' : '1px solid var(--border-muted)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            {g.group}
          </div>
          {g.rows.map((r, ri) => {
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                className="grid items-center px-4 sm:px-6 h-12 text-[12px] transition-colors"
                style={{
                  gridTemplateColumns: '1.6fr repeat(4, 1fr)',
                  gap: 12,
                  borderTop: ri === 0 ? 'none' : '1px solid var(--border-muted)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="flex items-center gap-2.5" style={{ color: 'var(--fg-default)' }}>
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                  {r.label}
                </span>
                {r.cells.map((c, ci) => (
                  <span key={ci} className="flex items-center justify-center text-[12px] tabular-nums">
                    {typeof c === 'boolean' ? (
                      c
                        ? <Check className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
                        : <Minus className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
                    ) : (
                      <span style={{ color: 'var(--fg-default)' }}>{c}</span>
                    )}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Layout helpers

function SectionWrap({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <section className={`${narrow ? 'max-w-[760px]' : 'max-w-[1080px]'} mx-auto px-8 mt-16`}>
      {children}
    </section>
  );
}

function PrimaryCta({ children, block = false }: { children: React.ReactNode; block?: boolean }) {
  return (
    <button
      type="button"
      className={`${block ? 'w-full' : ''} inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-md text-[12px] font-semibold transition-transform`}
      style={{
        background: 'var(--fg-strong)',
        color: 'var(--bg-canvas)',
        boxShadow: '0 4px 14px -4px color-mix(in srgb, var(--fg-strong) 50%, transparent)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {children}
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}

function SecondaryCta({ children, block = false }: { children: React.ReactNode; block?: boolean }) {
  return (
    <button
      type="button"
      className={`${block ? 'w-full' : ''} inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-md text-[12px] font-semibold transition-colors`}
      style={{
        background: 'var(--bg-canvas)',
        color: 'var(--fg-strong)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
    >
      {children}
    </button>
  );
}
