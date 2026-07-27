import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { OrgShell } from './OrgShell';
import { EmptyState } from '@shared/ui';

// Placeholder shown in REAL auth mode for org pages whose backend isn't built
// yet (SAML/SCIM/webhooks/policies/etc. — Phase 3). Prevents the standalone
// demo's fabricated ACME data from masquerading as the signed-in org's real
// configuration. The mock (demo) versions still render in mock mode. `titleKey`
// / `subtitleKey` are keys into the `org` namespace.
export function OrgComingSoon({ titleKey, subtitleKey }: { titleKey: string; subtitleKey?: string }) {
  const { t } = useTranslation('org');
  const { org = '' } = useParams({ strict: false });
  const title = t(titleKey);
  return (
    <OrgShell
      orgName={org}
      orgSlug={org}
      title={title}
      {...(subtitleKey ? { subtitle: t(subtitleKey) } : {})}
    >
      <EmptyState
        title={t('comingSoon.title')}
        subtitle={t('comingSoon.subtitle', { title })}
      />
    </OrgShell>
  );
}
