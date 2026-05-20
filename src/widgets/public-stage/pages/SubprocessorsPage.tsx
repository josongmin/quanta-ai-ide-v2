import { useState } from 'react';
import {
  Server,
  Cloud,
  CreditCard,
  Mail,
  Activity,
  ListTodo,
  MessageSquare,
  Sparkles,
  Brain,
  ExternalLink,
  Bell,
  ShieldCheck,
  FileCheck2,
  ScrollText,
  Eye,
} from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { PublicShell } from '@shared/ui/marketing';
import { LegalSubNav } from '../parts/LegalSubNav';

type Subprocessor = {
  name: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  glyphBg: string;
  glyphFg: string;
  purpose: string;
  category: 'Compute' | 'CDN' | 'Payments' | 'Email' | 'Observability' | 'Support' | 'Comms' | 'LLM' | 'Source';
  location: 'US' | 'EU' | 'Global' | 'US/EU';
  added: string;
  dpaUrl: string;
};

const SUBPROCESSORS: Subprocessor[] = [
  { name: 'AWS',         icon: Server,        glyphBg: '#FF9900', glyphFg: '#1A1A1A', purpose: 'Compute & storage',      category: 'Compute',       location: 'US/EU',  added: '2023-01-12', dpaUrl: 'https://aws.amazon.com/compliance/gdpr-center/' },
  { name: 'Cloudflare',  icon: Cloud,         glyphBg: '#F38020', glyphFg: '#FFFFFF', purpose: 'CDN & edge security',    category: 'CDN',           location: 'Global', added: '2023-01-12', dpaUrl: 'https://www.cloudflare.com/cloudflare-customer-dpa/' },
  { name: 'Stripe',      icon: CreditCard,    glyphBg: '#635BFF', glyphFg: '#FFFFFF', purpose: 'Payment processing',     category: 'Payments',      location: 'US',     added: '2023-01-12', dpaUrl: 'https://stripe.com/legal/dpa' },
  { name: 'Resend',      icon: Mail,          glyphBg: '#0F0F0F', glyphFg: '#FFFFFF', purpose: 'Transactional email',    category: 'Email',         location: 'US',     added: '2023-04-03', dpaUrl: 'https://resend.com/legal/dpa' },
  { name: 'Datadog',     icon: Activity,      glyphBg: '#632CA6', glyphFg: '#FFFFFF', purpose: 'Observability & logs',   category: 'Observability', location: 'US',     added: '2023-02-20', dpaUrl: 'https://www.datadoghq.com/legal/data-processing-addendum/' },
  { name: 'Linear',      icon: ListTodo,      glyphBg: '#5E6AD2', glyphFg: '#FFFFFF', purpose: 'Support tracker',        category: 'Support',       location: 'US',     added: '2023-06-14', dpaUrl: 'https://linear.app/dpa' },
  { name: 'Slack',       icon: MessageSquare, glyphBg: '#4A154B', glyphFg: '#FFFFFF', purpose: 'Customer comms',         category: 'Comms',         location: 'US',     added: '2023-01-12', dpaUrl: 'https://slack.com/trust/compliance/data-processing-addendum' },
  { name: 'Anthropic',   icon: Sparkles,      glyphBg: '#D97757', glyphFg: '#FFFFFF', purpose: 'LLM inference',          category: 'LLM',           location: 'US',     added: '2024-02-01', dpaUrl: 'https://www.anthropic.com/legal/dpa' },
  { name: 'OpenAI',      icon: Brain,         glyphBg: '#10A37F', glyphFg: '#FFFFFF', purpose: 'LLM inference',          category: 'LLM',           location: 'US',     added: '2024-02-01', dpaUrl: 'https://openai.com/policies/data-processing-addendum/' },
  { name: 'GitHub',      icon: GithubIcon,    glyphBg: '#181717', glyphFg: '#FFFFFF', purpose: 'Source mirror & CI',     category: 'Source',        location: 'US',     added: '2023-01-12', dpaUrl: 'https://github.com/customer-terms/github-data-protection-agreement' },
];

const CRITERIA: { icon: typeof ShieldCheck; label: string; desc: string }[] = [
  { icon: ShieldCheck, label: 'Security review',        desc: 'Architecture review, SOC 2 / ISO 27001 evidence, pen-test reports.' },
  { icon: FileCheck2,  label: 'Signed DPA',             desc: 'Standard DPA with SCCs and our flow-down obligations executed before go-live.' },
  { icon: ScrollText,  label: 'Recognised certification', desc: 'At minimum SOC 2 Type II, with bonus for ISO 27001, ISO 27701 or HIPAA.' },
  { icon: Eye,         label: 'Audit logging access',   desc: 'Programmatic access to logs of who-touched-what, retained 1 year minimum.' },
];

export default function SubprocessorsPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  function onSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  }

  return (
    <PublicShell active="legal" width="narrow">
      <LegalSubNav active="subprocessors" />

      <header className="mb-8">
        <h1 className="text-[32px] font-semibold tracking-tight mb-3" style={{ color: 'var(--fg-strong)' }}>
          Subprocessors
        </h1>
        <p className="text-[14px] leading-7" style={{ color: 'var(--fg-muted)' }}>
          To deliver the ACME service we rely on a small set of carefully vetted third parties (&quot;Subprocessors&quot;).
          The list below is current as of the date shown and is updated whenever a Subprocessor is added,
          removed or materially changed. We notify subscribers at least <strong style={{ color: 'var(--fg-default)' }}>30 days</strong> before any addition takes effect.
        </p>
      </header>

      <section
        className="rounded-lg p-4 mb-10"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--fg-strong)' }}>
          <Bell size={14} style={{ color: 'var(--fg-accent)' }} />
          <span className="text-[12px] font-semibold">Get notified of changes</span>
        </div>
        <p className="text-[12px] leading-5 mb-3" style={{ color: 'var(--fg-muted)' }}>
          We&apos;ll email you at least 30 days before adding any new subprocessor. Unsubscribe anytime.
        </p>
        {subscribed ? (
          <div
            className="rounded-md px-3 py-2 text-[12px]"
            style={{
              background: 'var(--intent-success-bg)',
              color: 'var(--intent-success-fg)',
              border: '1px solid var(--border-default)',
            }}
          >
            Subscribed. We&apos;ll send change notices to <strong>{email}</strong>.
          </div>
        ) : (
          <form onSubmit={onSubscribe} className="flex items-center gap-2">
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
              className="flex-1 h-9 px-3 rounded-md text-[12px] outline-none"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-default)',
              }}
            />
            <button
              type="submit"
              className="h-9 px-4 rounded-md text-[12px] font-semibold whitespace-nowrap"
              style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
            >
              Notify me
            </button>
          </form>
        )}
      </section>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            Current subprocessors
          </h2>
          <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
            {SUBPROCESSORS.length} active · last reviewed 2026-04-22
          </span>
        </div>

        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border-default)' }}
        >
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)' }}>
                <th className="text-left font-medium px-3 py-2.5">Name</th>
                <th className="text-left font-medium px-3 py-2.5">Purpose</th>
                <th className="text-left font-medium px-3 py-2.5">Data location</th>
                <th className="text-left font-medium px-3 py-2.5">Added on</th>
                <th className="text-right font-medium px-3 py-2.5">DPA</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((s, i) => (
                <tr
                  key={s.name}
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                    color: 'var(--fg-default)',
                  }}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center flex-shrink-0"
                        style={{ background: s.glyphBg, color: s.glyphFg }}
                        aria-hidden
                      >
                        <s.icon size={14} />
                      </span>
                      <span className="font-medium" style={{ color: 'var(--fg-strong)' }}>{s.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span>{s.purpose}</span>
                      <CategoryChip label={s.category} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <LocationBadge location={s.location} />
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                    {s.added}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <a
                      href={s.dpaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] underline underline-offset-2"
                      style={{ color: 'var(--fg-link)' }}
                    >
                      View
                      <ExternalLink size={11} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[16px] font-semibold tracking-tight mb-2" style={{ color: 'var(--fg-strong)' }}>
          How we vet subprocessors
        </h2>
        <p className="text-[12px] leading-6 mb-4" style={{ color: 'var(--fg-muted)' }}>
          Every vendor on the list above is reviewed against the four criteria below before they go live, and
          re-reviewed annually. We document each assessment in our internal vendor register.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 not-prose">
          {CRITERIA.map((c) => (
            <li
              key={c.label}
              className="rounded-md p-3.5"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <c.icon size={14} style={{ color: 'var(--fg-accent)' }} />
                <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>{c.label}</span>
              </div>
              <p className="text-[12px] leading-5" style={{ color: 'var(--fg-muted)' }}>{c.desc}</p>
            </li>
          ))}
        </ul>
      </section>
    </PublicShell>
  );
}

function CategoryChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 h-[18px] rounded text-[10px] font-medium"
      style={{
        background: 'var(--bg-active)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {label}
    </span>
  );
}

function LocationBadge({ location }: { location: 'US' | 'EU' | 'Global' | 'US/EU' }) {
  return (
    <span
      className="inline-flex items-center px-2 h-[20px] rounded-full text-[11px] font-medium"
      style={{
        background: 'var(--bg-canvas)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-default)',
      }}
    >
      {location}
    </span>
  );
}
