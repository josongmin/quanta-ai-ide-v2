import type { ReactNode } from 'react';
import { Link as RouterLink } from '@tanstack/react-router';
import {
  Download,
  Scale,
  Lock,
  KeyRound,
  Eye,
  GraduationCap,
  ServerCog,
  AlertTriangle,
  ShieldCheck,
  Network,
  Mail,
} from 'lucide-react';
import { PublicShell } from '@shared/ui/marketing';
import { LegalSubNav } from '../parts/LegalSubNav';

const LAST_UPDATED = '2026-04-22';
const EFFECTIVE = '2026-05-01';

const DEFINITIONS: { term: string; def: string }[] = [
  { term: 'Controller',         def: 'The natural or legal person that determines the purposes and means of processing Personal Data — typically the Customer.' },
  { term: 'Processor',          def: 'The entity that processes Personal Data on behalf of the Controller — for this DPA, ACME, Inc.' },
  { term: 'Sub-processor',      def: 'Any third party engaged by the Processor to process Personal Data in connection with the Service.' },
  { term: 'Personal Data',      def: 'Any information relating to an identified or identifiable natural person, as defined in applicable Data Protection Law.' },
  { term: 'Data Protection Law',def: 'The GDPR, UK GDPR, CCPA/CPRA and other applicable laws governing the processing of Personal Data.' },
  { term: 'SCCs',               def: 'The EU Standard Contractual Clauses adopted by the European Commission, including the UK IDTA addendum where applicable.' },
];

const SECURITY_CONTROLS: { icon: typeof Lock; label: string; desc: string }[] = [
  { icon: Lock,           label: 'Encryption at rest',     desc: 'AES-256 across primary stores and backups.' },
  { icon: Network,        label: 'Encryption in transit',  desc: 'TLS 1.2+ enforced on all public endpoints.' },
  { icon: KeyRound,       label: 'Access controls',        desc: 'Least-privilege RBAC, SSO + MFA for personnel.' },
  { icon: Eye,            label: 'Access logging',         desc: 'Tamper-evident audit logs retained for 1 year.' },
  { icon: GraduationCap,  label: 'Employee training',      desc: 'Annual security and privacy training, attested.' },
  { icon: ServerCog,      label: 'Vulnerability mgmt.',    desc: 'Continuous scanning, patch SLAs by severity.' },
  { icon: AlertTriangle,  label: 'Incident response',      desc: 'Documented IR plan, 24/7 on-call, tabletop drills.' },
  { icon: ShieldCheck,    label: 'Independent audits',     desc: 'SOC 2 Type II annually; ISO 27001 in progress.' },
];

export default function DpaPage() {
  return (
    <PublicShell active="legal" width="narrow">
      <LegalSubNav active="dpa" />
      <DocHeader />

      <AutoExecutionNotice />

      <div className="space-y-10 mt-10">
        <Section n={1} title="Definitions">
          <p>
            Capitalised terms used in this Data Processing Addendum (&quot;DPA&quot;) and not otherwise defined have
            the meanings set out below. Terms not defined here have the meanings given in the Master Services
            Agreement (&quot;MSA&quot;) or the applicable Data Protection Law.
          </p>
          <div
            className="rounded-md overflow-hidden mt-2"
            style={{ border: '1px solid var(--border-default)' }}
          >
            <table className="w-full text-base">
              <tbody>
                {DEFINITIONS.map((d, i) => (
                  <tr
                    key={d.term}
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                    }}
                  >
                    <td
                      className="px-3 py-2.5 align-top w-[34%] font-medium"
                      style={{
                        color: 'var(--fg-strong)',
                        background: 'var(--bg-surface-muted)',
                        borderRight: '1px solid var(--border-muted)',
                      }}
                    >
                      {d.term}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--fg-default)' }}>{d.def}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section n={2} title="Subject Matter &amp; Duration">
          <p>
            The subject matter of the processing is the provision of the Service to the Customer pursuant to
            the MSA. The duration of the processing corresponds to the term of the MSA, plus any period
            required for return or deletion of Personal Data in accordance with this DPA.
          </p>
          <p>
            The nature and purpose of the processing, the types of Personal Data processed and the categories
            of Data Subjects are described in <em>Annex I</em> to this DPA.
          </p>
        </Section>

        <Section n={3} title="Processor Obligations">
          <p>
            ACME, acting as Processor, shall: (a) process Personal Data only on documented instructions from
            the Controller, including with regard to international transfers; (b) ensure that personnel
            authorised to process Personal Data are bound by appropriate confidentiality obligations; (c)
            implement and maintain the technical and organisational measures described in Section 4; and (d)
            assist the Controller in fulfilling its obligations to respond to Data Subject requests.
          </p>
          <p>
            ACME shall promptly inform the Controller if, in its opinion, an instruction infringes applicable
            Data Protection Law.
          </p>
        </Section>

        <Section n={4} title="Security Measures">
          <p>
            ACME implements appropriate technical and organisational measures to ensure a level of security
            appropriate to the risk, including, at a minimum, the following controls:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2 not-prose">
            {SECURITY_CONTROLS.map((c) => (
              <li
                key={c.label}
                className="rounded-md p-3"
                style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <c.icon size={14} style={{ color: 'var(--fg-accent)' }} />
                  <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>{c.label}</span>
                </div>
                <p className="text-base leading-5" style={{ color: 'var(--fg-muted)' }}>{c.desc}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={5} title="Sub-processing">
          <p>
            The Controller authorises ACME to engage Sub-processors in connection with the provision of the
            Service. A current list of Sub-processors is maintained at{' '}
            <RouterLink
              to={'/legal/subprocessors' as never}
              className="underline underline-offset-2"
              style={{ color: 'var(--fg-link)' }}
            >
              /legal/subprocessors
            </RouterLink>
            . ACME will provide at least thirty (30) days&apos; prior notice of any new Sub-processor and the
            Controller may object on reasonable data-protection grounds.
          </p>
          <p>
            ACME remains liable for the acts and omissions of its Sub-processors to the same extent as if
            performed by ACME itself.
          </p>
        </Section>

        <Section n={6} title="International Transfers">
          <p>
            Where the processing of Personal Data involves a transfer outside the European Economic Area, the
            United Kingdom or Switzerland to a country not deemed adequate, the parties agree to enter into
            the SCCs, which are hereby incorporated by reference. ACME is also self-certified under the EU-US
            Data Privacy Framework (DPF) and its UK Extension where applicable.
          </p>
        </Section>

        <Section n={7} title="Audits">
          <p>
            ACME shall make available to the Controller all information reasonably necessary to demonstrate
            compliance with this DPA, including by providing copies of its most recent SOC 2 Type II report
            and ISO certifications under NDA. The Controller may request an audit no more than once per
            twelve (12) month period, conducted during business hours and subject to reasonable
            confidentiality and security restrictions.
          </p>
        </Section>

        <Section n={8} title="Data Subject Requests">
          <p>
            Taking into account the nature of the processing, ACME shall assist the Controller by appropriate
            technical and organisational measures, insofar as possible, in responding to requests from Data
            Subjects exercising their rights under Data Protection Law. Where ACME receives such a request
            directly, it will promptly forward it to the Controller and shall not respond except on the
            Controller&apos;s instruction.
          </p>
        </Section>

        <Section n={9} title="Termination">
          <p>
            Upon termination or expiration of the MSA, ACME shall, at the Controller&apos;s option, return or
            delete all Personal Data processed on behalf of the Controller, unless retention is required by
            applicable law. Deletion shall be performed within thirty (30) days and confirmed in writing
            upon request.
          </p>
        </Section>

        <Section n={10} title="Liability">
          <p>
            Each party&apos;s liability arising out of or related to this DPA, whether in contract, tort or
            otherwise, is subject to the limitations of liability set forth in the MSA. Nothing in this DPA
            limits any right of a Data Subject under Data Protection Law.
          </p>
        </Section>
      </div>
    </PublicShell>
  );
}

function DocHeader() {
  return (
    <div className="mb-8">
      <div
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-sm font-medium mb-4"
        style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', color: 'var(--fg-accent)' }}
      >
        <Scale size={12} />
        Legal · Data Processing Addendum
      </div>
      <h1 className="text-[32px] font-semibold tracking-tight mb-3" style={{ color: 'var(--fg-strong)' }}>
        Data Processing Addendum
      </h1>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 text-base" style={{ color: 'var(--fg-muted)' }}>
        <span>Last updated <span style={{ color: 'var(--fg-default)' }}>{LAST_UPDATED}</span></span>
        <span style={{ color: 'var(--border-default)' }}>·</span>
        <span>Effective <span style={{ color: 'var(--fg-default)' }}>{EFFECTIVE}</span></span>
        <span style={{ color: 'var(--border-default)' }}>·</span>
        <span>Version <span style={{ color: 'var(--fg-default)' }}>v3.2</span></span>
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

function AutoExecutionNotice() {
  return (
    <div
      className="rounded-md p-4 flex items-start gap-3"
      style={{
        background: 'var(--intent-info-bg)',
        border: '1px solid var(--border-default)',
      }}
    >
      <ShieldCheck size={16} style={{ color: 'var(--intent-info-fg)', marginTop: 2 }} />
      <div className="flex-1">
        <div className="text-base font-semibold mb-1" style={{ color: 'var(--fg-strong)' }}>
          Auto-execution
        </div>
        <p className="text-base leading-6" style={{ color: 'var(--fg-default)' }}>
          This DPA is automatically executed alongside the MSA when you sign up — no separate signature
          required. Need a counter-signed copy for your records? Email{' '}
          <a
            href="mailto:legal@acme.com"
            className="inline-flex items-center gap-1 underline underline-offset-2"
            style={{ color: 'var(--fg-link)' }}
          >
            <Mail size={12} />
            legal@acme.com
          </a>{' '}
          and we&apos;ll return a PDF within 2 business days.
        </p>
      </div>
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
