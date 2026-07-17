// Real-mode gate for org pages whose backend lands in Phase 3. In the standalone
// demo (mock auth) these render their rich seeded mock; once real auth is wired
// they show OrgComingSoon instead of fabricated ACME data. Centralized here so
// the 14 not-yet-wired pages need no per-file edits — the barrel re-exports the
// gated wrapper under the page's public name. (Members/Invitations/Teams/General/
// Audit are already backend-wired and self-switch in their own files.)
import { env } from '@shared/config/env';
import { OrgComingSoon } from './parts/OrgComingSoon';

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
  return env.useRealAuth ? <OrgComingSoon title="Roles" subtitle="Role permissions are managed by the platform." /> : <RolesMock />;
}
export function UsagePage() {
  return env.useRealAuth ? <OrgComingSoon title="Usage" subtitle="Organization usage metrics." /> : <UsageMock />;
}
export function ServiceAccountsPage() {
  return env.useRealAuth ? <OrgComingSoon title="Service accounts" /> : <ServiceAccountsMock />;
}
export function DomainsPage() {
  return env.useRealAuth ? <OrgComingSoon title="Domains" /> : <DomainsMock />;
}
export function SecurityPage() {
  return env.useRealAuth ? <OrgComingSoon title="Security" /> : <SecurityMock />;
}
export function IntegrationsPage() {
  return env.useRealAuth ? <OrgComingSoon title="Integrations" /> : <IntegrationsMock />;
}
export function WebhooksPage() {
  return env.useRealAuth ? <OrgComingSoon title="Webhooks" /> : <WebhooksMock />;
}
export function ApiOAuthPage() {
  return env.useRealAuth ? <OrgComingSoon title="API & OAuth" /> : <ApiOAuthMock />;
}
export function PoliciesPage() {
  return env.useRealAuth ? <OrgComingSoon title="Policies" /> : <PoliciesMock />;
}
export function AiPoliciesPage() {
  return env.useRealAuth ? <OrgComingSoon title="AI policies" /> : <AiPoliciesMock />;
}
export function SamlSsoPage() {
  return env.useRealAuth ? <OrgComingSoon title="SAML SSO" /> : <SamlSsoMock />;
}
export function ScimPage() {
  return env.useRealAuth ? <OrgComingSoon title="SCIM" /> : <ScimMock />;
}
export function DataResidencyPage() {
  return env.useRealAuth ? <OrgComingSoon title="Data residency" /> : <DataResidencyMock />;
}
export function RetentionPolicyPage() {
  return env.useRealAuth ? <OrgComingSoon title="Retention" /> : <RetentionMock />;
}
