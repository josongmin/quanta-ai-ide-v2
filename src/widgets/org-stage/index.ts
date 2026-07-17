// Backend-wired pages (self-switch mock↔real inside their own file).
export { default as MembersPage }     from './pages/MembersPage';
export { default as GeneralPage }     from './pages/GeneralPage';
export { default as TeamsPage }       from './pages/TeamsPage';
export { default as AuditLogPage }    from './pages/AuditLogPage';
export { default as InvitationsPage } from './pages/InvitationsPage';

// Not-yet-wired pages: real mode shows OrgComingSoon, mock mode the demo seed.
// (Gated in ./gated so the 14 mock files need no per-file changes.)
export {
  RolesPage, UsagePage, ServiceAccountsPage, DomainsPage, SecurityPage,
  IntegrationsPage, WebhooksPage, ApiOAuthPage, PoliciesPage, AiPoliciesPage,
  SamlSsoPage, ScimPage, DataResidencyPage, RetentionPolicyPage,
} from './gated';
