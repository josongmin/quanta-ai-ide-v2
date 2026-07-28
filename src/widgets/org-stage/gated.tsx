// Real-mode gate for org pages whose backend lands in Phase 3. In the standalone
// demo (mock auth) these render their rich seeded mock; once real auth is wired
// they show OrgComingSoon instead of fabricated ACME data. Centralized here so
// the 14 not-yet-wired pages need no per-file edits — the barrel re-exports the
// gated wrapper under the page's public name. (Members/Invitations/Teams/General/
// Audit are already backend-wired and self-switch in their own files.)
import { env } from '@shared/config/env';
import { OrgComingSoon } from './parts/OrgComingSoon';
import { ServiceAccountsReal } from './pages/parts/service-accounts/ServiceAccountsReal';
import { WebhooksReal } from './pages/parts/webhooks/WebhooksReal';
import { ScimReal } from './pages/parts/scim/ScimReal';
import { SsoReal } from './pages/parts/sso/SsoReal';
import { RetentionReal } from './pages/parts/retention/RetentionReal';
import { UsageReal } from './pages/parts/usage/UsageReal';

import RolesMock from './pages/RolesPage';
import UsageMock from './pages/UsagePage';
import ServiceAccountsMock from './pages/ServiceAccountsPage';
import DomainsMock from './pages/DomainsPage';
import SecurityMock from './pages/SecurityPage';
import IntegrationsMock from './pages/IntegrationsPage';
import WebhooksMock from './pages/WebhooksPage';
import ApiOAuthMock from './pages/ApiOAuthPage';
import PoliciesMock from './pages/PoliciesPage';
import AiPoliciesMock from './pages/AiPoliciesPage';
import SamlSsoMock from './pages/SamlSsoPage';
import ScimMock from './pages/ScimPage';
import DataResidencyMock from './pages/DataResidencyPage';
import RetentionMock from './pages/RetentionPolicyPage';

export function RolesPage() {
  return env.useRealAuth ? <OrgComingSoon titleKey="comingSoon.titles.roles" subtitleKey="comingSoon.subtitles.roles" /> : <RolesMock />;
}
export function UsagePage() {
  return env.useRealAuth ? <UsageReal /> : <UsageMock />;
}
export function ServiceAccountsPage() {
  return env.useRealAuth ? <ServiceAccountsReal /> : <ServiceAccountsMock />;
}
export function DomainsPage() {
  return env.useRealAuth ? <OrgComingSoon titleKey="comingSoon.titles.domains" /> : <DomainsMock />;
}
export function SecurityPage() {
  return env.useRealAuth ? <OrgComingSoon titleKey="comingSoon.titles.security" /> : <SecurityMock />;
}
export function IntegrationsPage() {
  return env.useRealAuth ? <OrgComingSoon titleKey="comingSoon.titles.integrations" /> : <IntegrationsMock />;
}
export function WebhooksPage() {
  return env.useRealAuth ? <WebhooksReal /> : <WebhooksMock />;
}
export function ApiOAuthPage() {
  return env.useRealAuth ? <OrgComingSoon titleKey="comingSoon.titles.api" /> : <ApiOAuthMock />;
}
export function PoliciesPage() {
  return env.useRealAuth ? <OrgComingSoon titleKey="comingSoon.titles.policies" /> : <PoliciesMock />;
}
export function AiPoliciesPage() {
  return env.useRealAuth ? <OrgComingSoon titleKey="comingSoon.titles.aiPolicies" /> : <AiPoliciesMock />;
}
export function SamlSsoPage() {
  return env.useRealAuth ? <SsoReal /> : <SamlSsoMock />;
}
export function ScimPage() {
  return env.useRealAuth ? <ScimReal /> : <ScimMock />;
}
export function DataResidencyPage() {
  return env.useRealAuth ? <OrgComingSoon titleKey="comingSoon.titles.dataResidency" /> : <DataResidencyMock />;
}
export function RetentionPolicyPage() {
  return env.useRealAuth ? <RetentionReal /> : <RetentionMock />;
}
