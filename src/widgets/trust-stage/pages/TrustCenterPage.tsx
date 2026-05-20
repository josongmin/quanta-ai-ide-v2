import { useRef, type CSSProperties, type ReactNode } from 'react';
import {
  ShieldCheck, Lock, FileText, Globe, KeyRound, Activity, Eye, Download,
  CheckCircle2, ArrowUpRight, Cpu, Server, ScrollText,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useHoverStyle } from '@shared/lib';
import { PublicShell , HeroBackdrop, Eyebrow, HeadlineGradient, SectionHead, SeamDivider } from '@shared/ui/marketing';

const CERTS = [
  { id: 'soc2',  label: 'SOC 2 Type II', sub: 'Audited annually', tone: 'var(--intent-success-fg)' },
  { id: 'iso',   label: 'ISO 27001',     sub: 'Certified 2024',   tone: 'var(--intent-info-fg)' },
  { id: 'iso2',  label: 'ISO 27701',     sub: 'Privacy extension',tone: 'var(--fg-accent)' },
  { id: 'gdpr',  label: 'GDPR',          sub: 'EU + UK compliant',tone: 'var(--fg-link)' },
  { id: 'ccpa',  label: 'CCPA',          sub: 'California',       tone: 'var(--intent-warn-fg)' },
  { id: 'hipaa', label: 'HIPAA BAA',     sub: 'On request',       tone: 'var(--intent-danger-fg)' },
];

const POLICIES = [
  { icon: ShieldCheck, title: 'Data encryption',          blurb: 'AES-256 at rest, TLS 1.3 in transit. Per-org KMS keys on Business+.',  tag: 'Always-on' },
  { icon: KeyRound,    title: 'Authentication',           blurb: 'WebAuthn, TOTP, SSO via SAML/OIDC. SCIM provisioning on Enterprise.',  tag: 'Configurable' },
  { icon: Eye,         title: 'Access controls',          blurb: 'Role-based access, scoped tokens, fine-grained audit trail.',         tag: 'Always-on' },
  { icon: Globe,       title: 'Data residency',           blurb: 'US, EU, AP regions. Pick per workspace. Data never leaves your region.', tag: 'Enterprise' },
  { icon: Activity,    title: 'Monitoring & response',    blurb: '24/7 SOC. Median IR engagement under 12 minutes.',                    tag: 'Always-on' },
  { icon: ScrollText,  title: 'Audit log',                blurb: 'Every action, exportable to SIEM. 1y retention; configurable.',       tag: 'Always-on' },
];

const SUBPROCESSORS = [
  { name: 'Amazon Web Services', purpose: 'Hosting · compute · storage', region: 'us-east, eu-west, ap-ne' },
  { name: 'Stripe',              purpose: 'Payment processing',           region: 'us-east' },
  { name: 'OpenAI',              purpose: 'LLM inference (opt-in)',       region: 'us-east' },
  { name: 'Sentry',              purpose: 'Error monitoring',             region: 'us-west' },
];

const DOCS = [
  { id: 'whitepaper',  title: 'Security whitepaper',      sub: 'Architecture, encryption, IR' },
  { id: 'soc2-report', title: 'SOC 2 Type II report',    sub: 'NDA required' },
  { id: 'pentest',     title: 'Pentest summary',          sub: 'Latest: 2026-Q1' },
  { id: 'dpa',         title: 'Data processing addendum', sub: 'Pre-signed PDF' },
  { id: 'subs',        title: 'Subprocessors list',       sub: 'Notification SLA: 30 days' },
];

export default function TrustCenterPage() {
  return (
    <PublicShell width="bleed">
      <div className="relative">
        <HeroBackdrop height="h-[520px]" intensity={0.55} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-16 pb-14 flex flex-col items-center text-center gap-5">
          <Eyebrow tone="success"><ShieldCheck className="w-3 h-3" /> Trust center</Eyebrow>
          <HeadlineGradient accent="auditable">Security built in,</HeadlineGradient>
          <p className="text-[14.5px] leading-relaxed max-w-[600px]" style={{ color: 'var(--fg-muted)' }}>
            How we protect your code, your data, and the agents that act on your behalf. Read the report; meet our security team.
          </p>

          {/* Certs strip */}
          <div className="mt-6 grid grid-cols-6 gap-3 w-full max-w-[840px]">
            {CERTS.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-3 flex flex-col items-center gap-1"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{
                    background: `color-mix(in srgb, ${c.tone} 14%, transparent)`,
                    color: c.tone,
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                  {c.label}
                </span>
                <span className="text-[9px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
                  {c.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1080px] mx-auto px-8 pb-24">
        {/* Policies grid */}
        <SectionHead
          eyebrow="What we do"
          title="Engineering trust, every layer"
          lede="Encryption, identity, network, and operations — each treated as a first-class product surface."
        />
        <div className="grid grid-cols-3 gap-3 mb-16">
          {POLICIES.map((p) => (
            <HoverCard
              key={p.title}
              className="rounded-xl p-5 flex flex-col gap-3 transition-colors"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
              }}
              hover={{ background: 'var(--bg-hover)' }}
              rest={{ background: 'var(--bg-canvas)' }}
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
                    color: 'var(--fg-accent)',
                  }}
                >
                  <p.icon className="w-4 h-4" />
                </div>
                <span
                  className="text-[9px] uppercase tracking-[0.14em] font-semibold"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {p.tag}
                </span>
              </div>
              <h3 className="text-[13.5px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                {p.title}
              </h3>
              <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{p.blurb}</p>
            </HoverCard>
          ))}
        </div>

        <SeamDivider />

        {/* Architecture diagram simplified */}
        <SectionHead
          eyebrow="Architecture"
          title="Defense in depth, by design"
          lede="Multi-tenant isolation. Customer secrets never touch shared memory. AI calls are opt-in and scoped."
        />
        <div
          className="rounded-2xl p-6 mb-16"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Globe,  label: 'Edge',        sub: 'CDN · WAF · DDoS' },
              { icon: Server, label: 'API tier',    sub: 'mTLS · token scoping' },
              { icon: Cpu,    label: 'Agent sandbox',sub: 'Ephemeral · per-job VM' },
              { icon: Lock,   label: 'Secrets',     sub: 'KMS · per-org keys' },
              { icon: Activity, label: 'Audit',     sub: 'Append-only · SIEM' },
              { icon: ShieldCheck, label: 'Compliance', sub: 'SOC2 · ISO27001' },
            ].map((b) => (
              <div
                key={b.label}
                className="rounded-lg p-4 flex items-center gap-3"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, var(--fg-link) 14%, transparent)',
                    color: 'var(--fg-link)',
                  }}
                >
                  <b.icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>{b.label}</span>
                  <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{b.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SeamDivider />

        {/* Documents */}
        <SectionHead
          eyebrow="Documents"
          title="Reports, available on request"
          lede="Mutual NDA for SOC 2 and pentest reports. Everything else is downloadable now."
          align="left"
        />
        <div
          className="rounded-xl overflow-hidden mb-16"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          {DOCS.map((d, i) => (
            <HoverCard
              key={d.id}
              className="flex items-center gap-4 p-4 transition-colors"
              style={{
                borderBottom: i === DOCS.length - 1 ? 'none' : '1px solid var(--border-muted)',
              }}
              hover={{ background: 'var(--bg-hover)' }}
              rest={{ background: 'transparent' }}
            >
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-muted)',
                }}
              >
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                  {d.title}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>{d.sub}</span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11px] font-semibold transition-colors"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-default)',
                }}
              >
                {d.sub.includes('NDA') ? 'Request access' : 'Download'}
                {d.sub.includes('NDA')
                  ? <ArrowUpRight className="w-3 h-3" />
                  : <Download className="w-3 h-3" />}
              </button>
            </HoverCard>
          ))}
        </div>

        {/* Subprocessors */}
        <SectionHead
          eyebrow="Subprocessors"
          title="Who we share data with"
          lede="Every external service we use is listed below. We notify customers 30 days before adding a new one."
          align="left"
        />
        <div
          className="rounded-xl overflow-hidden mb-16"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            className="grid items-center px-4 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{
              gridTemplateColumns: '1.2fr 1.6fr 1fr',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>Subprocessor</span>
            <span>Purpose</span>
            <span>Region</span>
          </div>
          {SUBPROCESSORS.map((s, i) => (
            <div
              key={s.name}
              className="grid items-center px-4 h-11"
              style={{
                gridTemplateColumns: '1.2fr 1.6fr 1fr',
                borderBottom: i === SUBPROCESSORS.length - 1 ? 'none' : '1px solid var(--border-muted)',
              }}
            >
              <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>{s.name}</span>
              <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>{s.purpose}</span>
              <span className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--fg-subtle)' }}>{s.region}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="rounded-2xl p-8 flex items-center justify-between gap-6"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Want to talk to our security team?
            </h3>
            <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
              We respond within one business day. Vendor questionnaires, architecture diagrams, customer reference calls.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={'/security' as never}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-colors"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              Report a vulnerability
            </Link>
            <Link
              to={'/contact-sales' as never}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-colors"
              style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
            >
              Talk to security
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
