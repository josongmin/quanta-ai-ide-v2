import { useParams } from '@tanstack/react-router';
import { OrgShell } from './OrgShell';
import { EmptyState } from '@shared/ui';

// Placeholder shown in REAL auth mode for org pages whose backend isn't built
// yet (SAML/SCIM/webhooks/policies/etc. — Phase 3). Prevents the standalone
// demo's fabricated ACME data from masquerading as the signed-in org's real
// configuration. The mock (demo) versions still render in mock mode.
export function OrgComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  const { org = '' } = useParams({ strict: false });
  return (
    <OrgShell
      orgName={org}
      orgSlug={org}
      title={title}
      {...(subtitle ? { subtitle } : {})}
    >
      <EmptyState
        title="Available soon"
        subtitle={`${title} isn't connected to your organization yet — it's coming in a later release.`}
      />
    </OrgShell>
  );
}
