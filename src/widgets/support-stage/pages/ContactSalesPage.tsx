import { Users, Building2, Calendar, ShieldCheck, Sparkles, ArrowUpRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { PublicShell , Eyebrow, HeadlineGradient, SeamDivider } from '@shared/ui/marketing';

const BENEFITS = [
  { icon: Users,        title: 'Dedicated success manager',  blurb: 'Named contact, quarterly business reviews, training for your team.' },
  { icon: ShieldCheck,  title: 'Enterprise security',        blurb: 'SAML/OIDC SSO, SCIM, audit log export, customer-managed keys.' },
  { icon: Building2,    title: 'Custom contracts',           blurb: 'Pre-negotiated MSA, DPA, BAA, customized SLAs and uptime guarantees.' },
  { icon: Sparkles,     title: 'Custom integrations',        blurb: 'Private integrations, customer-specific webhooks, custom AI policies.' },
];

const PROOF = [
  { value: '99.99%', label: 'Uptime SLA' },
  { value: '< 15 min', label: 'P1 response' },
  { value: '180+',  label: 'Enterprise customers' },
  { value: 'SOC 2',  label: 'Type II audited' },
];

export default function ContactSalesPage() {
  return (
    <PublicShell width="bleed">
      <div className="max-w-[1080px] mx-auto px-8 pt-12 pb-24">
        <div className="grid grid-cols-2 gap-12 items-start">
          {/* Left: pitch */}
          <div className="flex flex-col gap-6 sticky top-24">
            <Eyebrow tone="info"><Building2 className="w-3 h-3" /> Enterprise sales</Eyebrow>
            <HeadlineGradient accent="at scale">Roll out se.field</HeadlineGradient>
            <p className="text-[14.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              For orgs with 100+ engineers, complex compliance needs, or a regulated industry. Talk to a human, get an architecture review, leave with a plan.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-2">
              {PROOF.map((p) => (
                <div
                  key={p.label}
                  className="rounded-lg p-3"
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div className="text-[18px] font-semibold tracking-tight tabular-nums" style={{ color: 'var(--fg-strong)' }}>
                    {p.value}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
                    {p.label}
                  </div>
                </div>
              ))}
            </div>

            <SeamDivider />

            <div className="flex flex-col gap-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
                      color: 'var(--fg-accent)',
                    }}
                  >
                    <b.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>{b.title}</span>
                    <span className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{b.blurb}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <div
            className="rounded-2xl p-7 flex flex-col gap-5"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 12px 40px -16px color-mix(in srgb, var(--fg-accent) 22%, transparent)',
            }}
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                Get a personalized demo
              </h2>
              <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
                Tell us a bit about your team. We reply within 4 business hours.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldInput label="Work email"    placeholder="you@company.com" />
              <FieldInput label="Full name"     placeholder="First last" />
              <FieldInput label="Company"       placeholder="ACME Inc." />
              <FieldInput label="Job title"     placeholder="VP Engineering" />
            </div>

            <FieldSelect label="Team size" options={['1–10', '11–50', '51–200', '201–1,000', '1,000+']} />
            <FieldSelect label="Use case"  options={['Admission gates at scale', 'Autonomous fix agents', 'Compliance / audit', 'AI policy enforcement', 'Other']} />

            <Field label="Tell us about your stack" hint="optional">
              <textarea
                rows={3}
                placeholder="Languages, monorepo or polyrepo, current CI, what you've tried…"
                className="w-full bg-transparent outline-none text-[12px] p-3 rounded-md resize-y"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-strong)',
                }}
              />
            </Field>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md text-[12px] font-semibold transition-colors"
              style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
            >
              <Calendar className="w-4 h-4" />
              Schedule a demo
            </button>

            <p className="text-[10px] text-center" style={{ color: 'var(--fg-subtle)' }}>
              By submitting you agree to our <Link to={'/legal/privacy' as never} className="underline" style={{ color: 'var(--fg-muted)' }}>privacy policy</Link>.
            </p>

            <div
              className="flex items-center gap-2 pt-3 text-[11px]"
              style={{ color: 'var(--fg-subtle)', borderTop: '1px solid var(--border-muted)' }}
            >
              <span>Prefer email?</span>
              <a
                href="mailto:sales@acme.dev"
                className="inline-flex items-center gap-1 font-semibold"
                style={{ color: 'var(--fg-link)' }}
              >
                sales@acme.dev
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{label}</span>
        {hint && <span className="lowercase tracking-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function FieldInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <Field label={label}>
      <input
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-[12px] h-9 px-3 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      />
    </Field>
  );
}

function FieldSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <Field label={label}>
      <select
        className="w-full bg-transparent outline-none text-[12px] h-9 px-3 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </Field>
  );
}
