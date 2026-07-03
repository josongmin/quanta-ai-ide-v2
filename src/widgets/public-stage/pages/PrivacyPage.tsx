import type { ReactNode } from 'react';
import { Download, ShieldCheck, Eye, Edit3, Download as DownloadIco, Trash2, Slash, FileWarning } from 'lucide-react';
import { PublicShell } from '@shared/ui/marketing';
import { LegalSubNav } from '../parts/LegalSubNav';

const LAST_UPDATED = '2026-04-22';
const EFFECTIVE = '2026-05-01';

const DATA_TABLE: { category: string; examples: string; purpose: string }[] = [
  { category: 'Account data',     examples: 'Name, email, organization, role',                    purpose: 'Authenticate and provision access' },
  { category: 'Usage telemetry',  examples: 'Pages viewed, feature events, latency, errors',      purpose: 'Operate, debug and improve the Service' },
  { category: 'Customer Content', examples: 'Files, prompts, project metadata you upload',        purpose: 'Provide the Service per your instructions' },
  { category: 'Device & network', examples: 'IP address, browser, OS, device identifiers',        purpose: 'Security, fraud prevention, regional routing' },
  { category: 'Billing data',     examples: 'Plan, billing address, last 4 of card (via Stripe)', purpose: 'Process payments and produce invoices' },
];

const RIGHTS: { icon: typeof Eye; label: string; desc: string }[] = [
  { icon: Eye,         label: 'Right of access',          desc: 'Request a copy of personal data we hold about you.' },
  { icon: Edit3,       label: 'Right to rectification',   desc: 'Ask us to correct inaccurate or incomplete data.' },
  { icon: Trash2,      label: 'Right to erasure',         desc: 'Request deletion when there is no overriding lawful basis.' },
  { icon: Slash,       label: 'Right to restrict',        desc: 'Limit how we process your data while a dispute is resolved.' },
  { icon: DownloadIco, label: 'Right to portability',     desc: 'Receive your data in a structured, machine-readable format.' },
  { icon: FileWarning, label: 'Right to object',          desc: 'Object to processing based on legitimate interests or for marketing.' },
];

export default function PrivacyPage() {
  return (
    <PublicShell active="legal" width="narrow">
      <LegalSubNav active="privacy" />
      <DocHeader />

      <div className="space-y-10">
        <Section n={1} title="Information We Collect">
          <Tldr>We collect what you give us, what your usage produces, and basic device signals to keep the Service safe.</Tldr>
          <p>
            We collect information directly from you (when you create an account or contact us), automatically
            from your use of the Service (telemetry, logs), and from third parties such as identity providers
            and payment processors. The categories below summarise what we collect and why.
          </p>

          <div
            className="rounded-md overflow-hidden mt-2"
            style={{ border: '1px solid var(--border-default)' }}
          >
            <table className="w-full text-base">
              <thead>
                <tr style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)' }}>
                  <th className="text-left font-medium px-3 py-2 w-[28%]">Category</th>
                  <th className="text-left font-medium px-3 py-2 w-[42%]">Examples</th>
                  <th className="text-left font-medium px-3 py-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {DATA_TABLE.map((row, i) => (
                  <tr
                    key={row.category}
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                      color: 'var(--fg-default)',
                    }}
                  >
                    <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--fg-strong)' }}>{row.category}</td>
                    <td className="px-3 py-2.5">{row.examples}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--fg-muted)' }}>{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section n={2} title="How We Use It">
          <Tldr>To run the Service, keep it secure, bill you, and (with consent) improve it.</Tldr>
          <p>
            We process personal data to (a) provide and maintain the Service; (b) authenticate users and
            prevent fraud; (c) communicate about the Service, including security alerts and product updates;
            (d) process payments; and (e) comply with legal obligations.
          </p>
          <p>
            Where required by law, we rely on your consent or legitimate interests as the lawful basis for
            processing. You can withdraw consent at any time without affecting the lawfulness of processing
            carried out before withdrawal.
          </p>
        </Section>

        <Section n={3} title="Sharing &amp; Disclosure">
          <Tldr>We share data with vetted subprocessors and never sell it.</Tldr>
          <p>
            We share personal data only with: (i) subprocessors listed on our Subprocessors page who help us
            operate the Service under written data-processing agreements; (ii) authorities when legally
            compelled; and (iii) acquirers in the event of a merger, acquisition or asset sale (subject to
            this Privacy Policy continuing to apply).
          </p>
          <p>
            We do not sell personal data, and we do not share personal data with advertisers or data brokers
            for cross-context behavioural advertising.
          </p>
        </Section>

        <Section n={4} title="International Transfers">
          <Tldr>Data may move across regions; we use SCCs and the EU-US DPF where required.</Tldr>
          <p>
            ACME operates globally, which means personal data may be transferred to and processed in countries
            other than your own, including the United States. Where data leaves the European Economic Area,
            United Kingdom or Switzerland, we rely on EU Standard Contractual Clauses, the UK International
            Data Transfer Addendum, or the EU-US Data Privacy Framework as appropriate transfer mechanisms.
          </p>
        </Section>

        <Section n={5} title="Your Rights">
          <Tldr>If you&apos;re in the EEA, UK, or a similar jurisdiction, you have the rights listed below.</Tldr>
          <p>
            Subject to applicable law, you have the following rights regarding your personal data. To exercise
            any of these rights, contact us at <Link>privacy@acme.com</Link>.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 not-prose">
            {RIGHTS.map((r) => (
              <li
                key={r.label}
                className="rounded-md p-3"
                style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
              >
                <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--fg-strong)' }}>
                  <r.icon size={14} style={{ color: 'var(--fg-accent)' }} />
                  <span className="text-base font-semibold">{r.label}</span>
                </div>
                <p className="text-base leading-5" style={{ color: 'var(--fg-muted)' }}>{r.desc}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={6} title="Cookies &amp; Tracking">
          <Tldr>We use a small set of essential and analytics cookies; you can manage them in your browser.</Tldr>
          <p>
            We use cookies and similar technologies to keep you signed in, remember your preferences, and
            understand aggregate usage. Strictly necessary cookies cannot be disabled. Analytics cookies are
            optional and require your consent in jurisdictions that require it.
          </p>
          <p>
            You can manage cookie preferences via your browser settings or our in-product preferences panel.
            Disabling certain cookies may impair functionality of the Service.
          </p>
        </Section>

        <Section n={7} title="Data Retention">
          <Tldr>Account data lives until you delete the account; logs roll off in 90 days.</Tldr>
          <p>
            We retain personal data only for as long as necessary to provide the Service and for legitimate,
            essential purposes such as legal compliance and dispute resolution. Customer Content is retained
            for the duration of your subscription and deleted within thirty (30) days of termination, unless
            you instruct otherwise.
          </p>
          <p>
            Operational logs and security telemetry are retained for ninety (90) days, after which they are
            either deleted or aggregated into non-identifiable form.
          </p>
        </Section>

        <Section n={8} title="Contact Us / DPO">
          <Tldr>Questions, complaints, or requests — contact our Data Protection Officer.</Tldr>
          <p>
            For any questions about this Privacy Policy or our data practices, you can reach our Data
            Protection Officer at <Link>dpo@acme.com</Link> or by post at:
          </p>
          <p style={{ color: 'var(--fg-muted)' }}>
            ACME, Inc.<br />
            Attn: Data Protection Officer<br />
            548 Market Street, PMB 92485<br />
            San Francisco, CA 94104, USA
          </p>
          <p>
            You also have the right to lodge a complaint with your local supervisory authority.
          </p>
        </Section>
      </div>
    </PublicShell>
  );
}

function DocHeader() {
  return (
    <div className="mb-10">
      <div
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-sm font-medium mb-4"
        style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', color: 'var(--fg-accent)' }}
      >
        <ShieldCheck size={12} />
        Legal · Privacy Policy
      </div>
      <h1 className="text-[32px] font-semibold tracking-tight mb-3" style={{ color: 'var(--fg-strong)' }}>
        Privacy Policy
      </h1>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 text-base" style={{ color: 'var(--fg-muted)' }}>
        <span>Last updated <span style={{ color: 'var(--fg-default)' }}>{LAST_UPDATED}</span></span>
        <span style={{ color: 'var(--border-default)' }}>·</span>
        <span>Effective <span style={{ color: 'var(--fg-default)' }}>{EFFECTIVE}</span></span>
      </div>
      <button
        type="button"
        onClick={() => { /* no-op */ }}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-base font-medium"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-default)',
        }}
      >
        <Download size={13} />
        Download PDF
      </button>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h2
        className="text-2xl font-semibold tracking-tight mb-3 flex items-baseline gap-3"
        style={{ color: 'var(--fg-strong)' }}
      >
        <span className="text-base font-mono tabular-nums w-7 inline-flex justify-end" style={{ color: 'var(--fg-subtle)' }}>
          {String(n).padStart(2, '0')}
        </span>
        {title}
      </h2>
      <div className="pl-10 space-y-3.5 text-lg leading-7" style={{ color: 'var(--fg-default)' }}>
        {children}
      </div>
    </section>
  );
}

function Tldr({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-md px-3.5 py-3 mb-1"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="inline-flex items-center px-1.5 h-[18px] rounded text-xs font-bold tracking-wide flex-shrink-0 mt-0.5"
          style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', color: 'var(--fg-accent)' }}
        >
          TL;DR
        </span>
        <p className="text-base leading-6" style={{ color: 'var(--fg-default)' }}>{children}</p>
      </div>
    </div>
  );
}

function Link({ children }: { children: ReactNode }) {
  return (
    <a
      href={`mailto:${typeof children === 'string' ? children : ''}`}
      className="underline underline-offset-2"
      style={{ color: 'var(--fg-link)' }}
    >
      {children}
    </a>
  );
}
