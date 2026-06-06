import { ShieldCheck } from 'lucide-react';
import { PublicShell, HeroBackdrop, Eyebrow, HeadlineGradient, SectionHead, SeamDivider } from '@shared/ui/marketing';
import { CertsStrip } from './parts/trust-center/CertsStrip';
import { PoliciesGrid } from './parts/trust-center/PoliciesGrid';
import { ArchitectureDiagram } from './parts/trust-center/ArchitectureDiagram';
import { DocumentsList } from './parts/trust-center/DocumentsList';
import { SubprocessorsTable } from './parts/trust-center/SubprocessorsTable';
import { SecurityCta } from './parts/trust-center/SecurityCta';

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
          <CertsStrip />
        </div>
      </div>

      <div className="max-w-[1080px] mx-auto px-8 pb-24">
        {/* Policies grid */}
        <SectionHead
          eyebrow="What we do"
          title="Engineering trust, every layer"
          lede="Encryption, identity, network, and operations — each treated as a first-class product surface."
        />
        <PoliciesGrid />

        <SeamDivider />

        {/* Architecture diagram simplified */}
        <SectionHead
          eyebrow="Architecture"
          title="Defense in depth, by design"
          lede="Multi-tenant isolation. Customer secrets never touch shared memory. AI calls are opt-in and scoped."
        />
        <ArchitectureDiagram />

        <SeamDivider />

        {/* Documents */}
        <SectionHead
          eyebrow="Documents"
          title="Reports, available on request"
          lede="Mutual NDA for SOC 2 and pentest reports. Everything else is downloadable now."
          align="left"
        />
        <DocumentsList />

        {/* Subprocessors */}
        <SectionHead
          eyebrow="Subprocessors"
          title="Who we share data with"
          lede="Every external service we use is listed below. We notify customers 30 days before adding a new one."
          align="left"
        />
        <SubprocessorsTable />

        {/* CTA */}
        <SecurityCta />
      </div>
    </PublicShell>
  );
}
