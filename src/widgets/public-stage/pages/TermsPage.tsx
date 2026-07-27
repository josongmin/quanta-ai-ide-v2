import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { PublicShell } from '@shared/ui/marketing';
import { LegalSubNav } from '../parts/LegalSubNav';
import { DownloadPdfButton } from '../parts/DownloadPdfButton';
import { LEGAL_LAST_UPDATED as LAST_UPDATED, LEGAL_EFFECTIVE as EFFECTIVE } from '../lib/legalDates';

export default function TermsPage() {
  return (
    <PublicShell active="legal" width="narrow">
      <LegalSubNav active="terms" />
      <DocHeader />

      <div className="space-y-10">
        <Section n={1} title="Acceptance of Terms">
          <Tldr>By signing in or using ACME, you agree to these terms; if you don&apos;t, please stop using the service.</Tldr>
          <p>
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;Customer&quot;,
            &quot;you&quot;) and ACME, Inc. (&quot;ACME&quot;, &quot;we&quot;, &quot;us&quot;) governing your access to and use of the
            ACME platform, websites, APIs and related software (collectively, the &quot;Service&quot;).
          </p>
          <p>
            By creating an account, clicking &quot;I accept&quot;, or otherwise accessing the Service, you represent
            that you have read, understood and agreed to be bound by these Terms and our Privacy Policy. If you
            are entering into these Terms on behalf of an entity, you represent that you have the authority to
            bind such entity.
          </p>
          <p>
            We may revise these Terms from time to time. Material changes will be communicated at least thirty
            (30) days before they take effect, and your continued use after the effective date constitutes
            acceptance of the revised Terms.
          </p>
        </Section>

        <Section n={2} title="Eligibility">
          <Tldr>You must be at least 18 and able to form a binding contract in your jurisdiction.</Tldr>
          <p>
            The Service is intended for users who are at least eighteen (18) years of age and who have the
            legal capacity to enter into a binding contract under the laws of their jurisdiction. By using the
            Service you represent and warrant that you meet these eligibility requirements.
          </p>
          <p>
            We reserve the right to refuse service, terminate accounts or remove content at our sole discretion
            where we reasonably believe eligibility requirements are not met or where continued provision of
            the Service would expose us or other users to undue risk.
          </p>
        </Section>

        <Section n={3} title="Account Registration">
          <Tldr>Keep your credentials safe; you&apos;re responsible for activity under your account.</Tldr>
          <p>
            To access most features you must register an account. You agree to (a) provide accurate, current
            and complete information; (b) maintain and promptly update such information; and (c) keep your
            password and authentication tokens confidential.
          </p>
          <ol className="list-decimal pl-6 space-y-1.5" style={{ color: 'var(--fg-default)' }}>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must notify us immediately of any unauthorized access or suspected breach.</li>
            <li>You may not share, sell or transfer your account without our prior written consent.</li>
          </ol>
        </Section>

        <Section n={4} title="Acceptable Use">
          <Tldr>Don&apos;t do illegal, abusive, or infrastructure-damaging things with the Service.</Tldr>
          <p>
            You agree not to misuse the Service. Without limiting the generality of the foregoing, you shall
            not, and shall not permit any third party to:
          </p>
          <ol className="list-decimal pl-6 space-y-1.5" style={{ color: 'var(--fg-default)' }}>
            <li>violate any applicable law, regulation or third-party right;</li>
            <li>upload material that is unlawful, infringing, defamatory or harmful;</li>
            <li>attempt to gain unauthorized access to the Service or its related systems;</li>
            <li>probe, scan, or test the vulnerability of the Service without authorization;</li>
            <li>interfere with the integrity or performance of the Service or its data.</li>
          </ol>
        </Section>

        <Section n={5} title="Intellectual Property">
          <Tldr>We own the Service. You own your data. Each side gets a narrow license to make the Service work.</Tldr>
          <p>
            The Service, including all software, designs, trademarks and content provided by ACME, is owned by
            ACME or its licensors and is protected by intellectual property laws. Subject to your compliance
            with these Terms, ACME grants you a limited, non-exclusive, non-transferable, revocable license to
            access and use the Service for your internal business purposes.
          </p>
          <p>
            You retain all rights, title and interest in and to data, content and materials you submit to the
            Service (&quot;Customer Data&quot;). You grant ACME a worldwide, non-exclusive, royalty-free license to
            host, copy, transmit and display Customer Data solely as necessary to provide the Service.
          </p>
        </Section>

        <Section n={6} title="Subscription &amp; Billing">
          <Tldr>Fees are billed in advance, are non-refundable, and renew automatically unless cancelled.</Tldr>
          <p>
            Fees for paid plans are described on our Pricing page or in an applicable order form. Unless
            otherwise stated, fees are billed in advance on a monthly or annual basis and are non-refundable
            except as required by law. Subscriptions auto-renew at the end of each term until cancelled.
          </p>
          <p>
            We may change subscription fees upon at least thirty (30) days&apos; notice. Continued use of the
            Service after a fee change constitutes acceptance of the new fees. Overdue amounts may bear
            interest at the lesser of 1.5% per month or the maximum rate permitted by law.
          </p>
        </Section>

        <Section n={7} title="Termination">
          <Tldr>Either side can end the contract; egregious breach lets us suspend immediately.</Tldr>
          <p>
            Either party may terminate these Terms for convenience at the end of the then-current subscription
            term by providing notice through the Service or by email at least thirty (30) days prior. ACME may
            suspend or terminate your access immediately if we reasonably believe you have materially breached
            these Terms or engaged in conduct that creates risk of harm to ACME, its users or third parties.
          </p>
          <p>
            Upon termination, your right to access the Service will cease and we will delete or return Customer
            Data in accordance with our data retention policy. Sections that by their nature should survive
            termination will survive.
          </p>
        </Section>

        <Section n={8} title="Disclaimers">
          <Tldr>The Service is provided &quot;as is&quot; — no implied warranties beyond what the law requires.</Tldr>
          <p>
            EXCEPT AS EXPRESSLY SET FORTH HEREIN, THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
            WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY OR OTHERWISE, INCLUDING WITHOUT
            LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            NON-INFRINGEMENT OR ANY WARRANTY ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.
          </p>
          <p>
            ACME does not warrant that the Service will be uninterrupted, error-free, secure, or that any
            defects will be corrected. Some jurisdictions do not allow the disclaimer of implied warranties, so
            the foregoing disclaimer may not apply to you.
          </p>
        </Section>

        <Section n={9} title="Limitation of Liability">
          <Tldr>Our liability is capped at fees paid in the prior 12 months; no indirect or consequential damages.</Tldr>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL EITHER PARTY BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE,
            DATA OR BUSINESS, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE SERVICE.
          </p>
          <p>
            Each party&apos;s aggregate liability arising out of or related to these Terms shall not exceed the
            total fees paid or payable by Customer to ACME for the Service in the twelve (12) months preceding
            the event giving rise to the claim.
          </p>
        </Section>

        <Section n={10} title="Governing Law">
          <Tldr>Delaware law governs; disputes go to the courts of Wilmington, Delaware.</Tldr>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of
            Delaware, United States, without regard to its conflict of laws principles. Any dispute arising
            out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the
            state and federal courts located in Wilmington, Delaware.
          </p>
          <p>
            Notwithstanding the foregoing, either party may seek injunctive or equitable relief in any court
            of competent jurisdiction to protect its intellectual property or confidential information.
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
        <FileText size={12} />
        Legal · Terms of Service
      </div>
      <h1
        className="text-[32px] font-semibold tracking-tight mb-3"
        style={{ color: 'var(--fg-strong)' }}
      >
        Terms of Service
      </h1>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 text-base" style={{ color: 'var(--fg-muted)' }}>
        <span>Last updated <span style={{ color: 'var(--fg-default)' }}>{LAST_UPDATED}</span></span>
        <span style={{ color: 'var(--border-default)' }}>·</span>
        <span>Effective <span style={{ color: 'var(--fg-default)' }}>{EFFECTIVE}</span></span>
      </div>
      <DownloadPdfButton />
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
        <span
          className="text-base font-mono tabular-nums w-7 inline-flex justify-end"
          style={{ color: 'var(--fg-subtle)' }}
        >
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
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="inline-flex items-center px-1.5 h-[18px] rounded text-xs font-bold tracking-wide flex-shrink-0 mt-0.5"
          style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', color: 'var(--fg-accent)' }}
        >
          TL;DR
        </span>
        <p className="text-base leading-6" style={{ color: 'var(--fg-default)' }}>
          {children}
        </p>
      </div>
    </div>
  );
}
