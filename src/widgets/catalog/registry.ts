// SaaS scaffold catalog. Single source of truth for which generic-SaaS
// surfaces exist, where they live, and what status they're in. The
// /catalog page renders this; cmd-k opens it.
//
// To register a new SaaS scaffold page: add an entry below + (when ready)
// a real route in src/app/router/router.tsx. `path` of '#' means the
// route stub is not wired yet — the catalog still lists it so we can
// see what's left to build.

export type CatalogStatus = 'live' | 'stub' | 'planned';

export type CatalogGroup =
  | 'auth'
  | 'onboarding'
  | 'account'
  | 'organization'
  | 'workspace'
  | 'billing'
  | 'enterprise'
  | 'developer'
  | 'marketplace'
  | 'trust'
  | 'support'
  | 'errors'
  | 'global';

export type CatalogEntry = {
  id: string;
  title: string;
  blurb: string;
  path: string;             // '#' if not wired
  status: CatalogStatus;
  group: CatalogGroup;
  // Optional shortcut path that opens directly in cmd-k recents
  keywords?: string[];
};

export const GROUP_META: Record<CatalogGroup, { title: string; hint: string }> = {
  auth:         { title: 'Authentication',     hint: 'Login, signup, MFA, sessions.' },
  onboarding:   { title: 'Onboarding',         hint: 'Post-signup flow before the app shell.' },
  account:      { title: 'Personal account',   hint: 'Per-user settings under /me.' },
  organization: { title: 'Organization',       hint: 'Org-wide admin under /org/{org}.' },
  workspace:    { title: 'Workspace',          hint: 'Repo-scoped settings.' },
  billing:      { title: 'Billing & plan',     hint: 'Plans, usage, invoices, payment.' },
  enterprise:   { title: 'Enterprise',         hint: 'SSO/SCIM, audit, residency, contracts.' },
  developer:    { title: 'Developer platform', hint: 'API · CLI · SDKs · webhooks · OAuth.' },
  marketplace:  { title: 'Marketplace',        hint: 'Installable integrations directory.' },
  trust:        { title: 'Trust & security',   hint: 'Trust center, vulnerability disclosure.' },
  support:      { title: 'Support & sales',    hint: 'Tickets, chat, contact sales, feedback.' },
  errors:       { title: 'Error & meta',       hint: 'Empty states, maintenance, what\'s new.' },
  global:       { title: 'Global pages',       hint: 'Public + cross-cutting surfaces.' },
};

export const CATALOG: CatalogEntry[] = [
  // Auth
  { id: 'login',          group: 'auth', title: 'Sign in',                blurb: 'Email · SSO · OAuth providers',           path: '/auth/login',           status: 'live' },
  { id: 'signup',         group: 'auth', title: 'Sign up',                blurb: 'Create org or accept invite',             path: '/auth/signup',          status: 'live' },
  { id: 'sso',            group: 'auth', title: 'SSO redirect',           blurb: 'Org-domain → IdP routing',                path: '/auth/sso',             status: 'live' },
  { id: 'forgot',         group: 'auth', title: 'Forgot password',        blurb: 'Email reset request',                     path: '/auth/forgot',          status: 'live' },
  { id: 'reset',          group: 'auth', title: 'Reset password',         blurb: 'Token-bound new password',                path: '/auth/reset',           status: 'live' },
  { id: 'verify-email',   group: 'auth', title: 'Verify email',           blurb: 'Token confirmation landing',              path: '/auth/verify-email',    status: 'live' },
  { id: 'mfa',            group: 'auth', title: 'MFA challenge',          blurb: 'TOTP / WebAuthn / backup codes',          path: '/auth/mfa',             status: 'live' },
  { id: 'session-expired',group: 'auth', title: 'Session expired',        blurb: 'Re-auth gate',                            path: '/auth/session-expired', status: 'live' },

  // Onboarding (single wizard, step query param)
  { id: 'onb-profile',    group: 'onboarding', title: 'Profile setup',    blurb: 'Name, handle, avatar',                    path: '/onboarding?step=0', status: 'live' },
  { id: 'onb-org',        group: 'onboarding', title: 'Create org',       blurb: 'Or join via invite',                      path: '/onboarding?step=1', status: 'live' },
  { id: 'onb-workspace',  group: 'onboarding', title: 'Connect workspace',blurb: 'Pick repo from Git host',                 path: '/onboarding?step=2', status: 'live' },
  { id: 'onb-invite',     group: 'onboarding', title: 'Invite teammates', blurb: 'Skippable',                               path: '/onboarding?step=3', status: 'live' },
  { id: 'onb-plan',       group: 'onboarding', title: 'Choose plan',      blurb: 'Free / Team / Business / Enterprise',     path: '/onboarding?step=4', status: 'live' },
  { id: 'onb-done',       group: 'onboarding', title: 'Welcome screen',   blurb: 'Confetti + summary',                      path: '/onboarding?done=1', status: 'live' },

  // Personal account (/me)
  { id: 'me-profile',     group: 'account', title: 'Profile',             blurb: 'Name, handle, avatar, bio, social',       path: '/me/profile',        status: 'live' },
  { id: 'me-account',     group: 'account', title: 'Account',             blurb: 'Email, password, export, delete',         path: '/me/account',        status: 'live' },
  { id: 'me-security',    group: 'account', title: 'Security',            blurb: 'MFA, sessions, recovery codes, history',  path: '/me/security',       status: 'live' },
  { id: 'me-apps',        group: 'account', title: 'Connected apps',      blurb: 'OAuth providers + integrations + scopes', path: '/me/connected-apps', status: 'live' },
  { id: 'me-tokens',      group: 'account', title: 'API tokens',          blurb: 'PAT generation, scopes, last-used, revoke', path: '/me/api-tokens',  status: 'live' },
  { id: 'me-notifs',      group: 'account', title: 'Notifications',       blurb: 'Channel × event matrix, quiet hours',     path: '/me/notifications',  status: 'live' },
  { id: 'me-appearance',  group: 'account', title: 'Appearance',          blurb: 'Theme, density, motion, accent',          path: '/me/appearance',     status: 'live' },
  { id: 'me-prefs',       group: 'account', title: 'Preferences',         blurb: 'Workbench defaults, behaviors',           path: '/me/preferences',    status: 'live' },
  { id: 'me-keys',        group: 'account', title: 'Keyboard',            blurb: 'Shortcut customization, conflict detection', path: '/me/keyboard',    status: 'live' },
  { id: 'me-ai',          group: 'account', title: 'AI preferences',      blurb: 'Model picks, auto-suggest, cost cap',     path: '/me/ai',             status: 'live' },
  { id: 'me-inbox',       group: 'account', title: 'Inbox',               blurb: 'Mentions, reviews, gates, agents',        path: '/me/inbox',          status: 'live' },

  // Organization (/org/{org})
  { id: 'org-general',    group: 'organization', title: 'General',        blurb: 'Name, slug, logo, default ws',            path: '/org/acme/general',      status: 'live' },
  { id: 'org-members',    group: 'organization', title: 'Members',        blurb: 'Invite, role, deactivate',                path: '/org/acme/members',      status: 'live' },
  { id: 'org-teams',      group: 'organization', title: 'Teams',          blurb: 'Group ownership, routing input',          path: '/org/acme/teams',        status: 'live' },
  { id: 'org-roles',      group: 'organization', title: 'Roles (RBAC)',   blurb: 'Custom role definitions',                 path: '/org/acme/roles',        status: 'live' },
  { id: 'org-security',   group: 'organization', title: 'Security',       blurb: 'Session policy, IP allowlist, MFA req',   path: '/org/acme/security',     status: 'live' },
  { id: 'org-integrations', group: 'organization', title: 'Integrations', blurb: 'Slack/Jira/Linear/PagerDuty/Datadog',     path: '/org/acme/integrations', status: 'live' },
  { id: 'org-webhooks',   group: 'organization', title: 'Webhooks',       blurb: 'Org-level event subscriptions',           path: '/org/acme/webhooks',     status: 'live' },
  { id: 'org-api',        group: 'organization', title: 'API & OAuth',    blurb: 'Org PATs, OAuth apps',                    path: '/org/acme/api',          status: 'live' },
  { id: 'org-policies',   group: 'organization', title: 'Policies',       blurb: 'Org-default admission rules',             path: '/org/acme/policies',     status: 'live' },
  { id: 'org-ai',         group: 'organization', title: 'AI policies',    blurb: 'Allowed models, opt-out, residency',      path: '/org/acme/ai-policies',  status: 'live' },
  { id: 'org-invitations',     group: 'organization', title: 'Invitations',      blurb: 'Pending invites, resend, revoke',          path: '/org/acme/invitations',      status: 'live' },
  { id: 'org-domains',         group: 'organization', title: 'Domains',          blurb: 'Verify, auto-join, SSO enforcement',       path: '/org/acme/domains',          status: 'live' },
  { id: 'org-service-accounts',group: 'organization', title: 'Service accounts', blurb: 'Machine identities for CI / workers',     path: '/org/acme/service-accounts', status: 'live' },
  { id: 'org-usage',           group: 'organization', title: 'Usage',            blurb: '30-day spend, breakdown by workspace',     path: '/org/acme/usage',            status: 'live' },

  // Workspace (/{org}/{ws}/settings)
  { id: 'ws-general',     group: 'workspace', title: 'General',           blurb: 'Display name, default branch',            path: '/acme/monorepo/settings/general',      status: 'live' },
  { id: 'ws-source',      group: 'workspace', title: 'Source connection',blurb: 'Git host link, branch protection',         path: '/acme/monorepo/settings/source',       status: 'live' },
  { id: 'ws-ownership',   group: 'workspace', title: 'Ownership',         blurb: 'CODEOWNERS + team routing',                path: '/acme/monorepo/settings/ownership',    status: 'live' },
  { id: 'ws-admission',   group: 'workspace', title: 'Admission rules',   blurb: 'Per-ws gate policy',                       path: '/acme/monorepo/settings/admission',    status: 'live' },
  { id: 'ws-review',      group: 'workspace', title: 'Review policy',     blurb: 'Required approvers, auto-assign',          path: '/acme/monorepo/settings/review',       status: 'live' },
  { id: 'ws-fix',         group: 'workspace', title: 'Fix pipeline',      blurb: 'Permissions, rollback, cost cap',          path: '/acme/monorepo/settings/fix',          status: 'live' },
  { id: 'ws-agents',      group: 'workspace', title: 'Agents',            blurb: 'Activation, concurrency cap',              path: '/acme/monorepo/settings/agents',       status: 'live' },
  { id: 'ws-secrets',     group: 'workspace', title: 'Secrets',           blurb: 'CI / agent secrets',                       path: '/acme/monorepo/settings/secrets',      status: 'live' },
  { id: 'ws-envs',        group: 'workspace', title: 'Environments',      blurb: 'dev/stg/prod metadata',                    path: '/acme/monorepo/settings/environments', status: 'live' },
  { id: 'ws-webhooks',    group: 'workspace', title: 'Webhooks',          blurb: 'Workspace-scoped',                         path: '/acme/monorepo/settings/webhooks',     status: 'live' },
  { id: 'ws-labels',      group: 'workspace', title: 'Labels',            blurb: 'Tag taxonomy',                             path: '/acme/monorepo/settings/labels',       status: 'live' },
  { id: 'ws-danger',      group: 'workspace', title: 'Danger zone',       blurb: 'Archive, transfer, delete',                path: '/acme/monorepo/settings/danger',       status: 'live' },

  // Billing & plan
  { id: 'billing-overview',group: 'billing', title: 'Overview',           blurb: 'Plan, usage, invoices, payment',           path: '/org/acme/billing', status: 'live' },
  { id: 'billing-plan',   group: 'billing', title: 'Plan picker',         blurb: 'Free / Team / Business / Enterprise',      path: '/org/acme/billing#plan', status: 'live' },
  { id: 'billing-usage',  group: 'billing', title: 'Usage',               blurb: 'Seats, agents, tokens, storage',           path: '/org/acme/billing#usage', status: 'live' },
  { id: 'billing-invoices',group: 'billing', title: 'Invoices',           blurb: 'History, PDF, export',                     path: '/org/acme/billing#invoices', status: 'live' },
  { id: 'billing-payment',group: 'billing', title: 'Payment methods',     blurb: 'Cards, default, expiry',                   path: '/org/acme/billing#payment', status: 'live' },
  { id: 'billing-profile',group: 'billing', title: 'Billing profile',     blurb: 'Legal name, tax ID, address',              path: '/org/acme/billing#profile', status: 'live' },
  { id: 'billing-tax',    group: 'billing', title: 'Tax & VAT',           blurb: 'Country tax IDs',                          path: '/org/acme/billing#tax',       status: 'live' },
  { id: 'billing-contracts',group: 'billing', title: 'Contracts',         blurb: 'Enterprise MSA, DPA',                      path: '/org/acme/billing#contracts', status: 'live' },

  // Enterprise
  { id: 'sso-saml',       group: 'enterprise', title: 'SAML SSO',         blurb: 'IdP metadata config',                      path: '/org/acme/sso',            status: 'live' },
  { id: 'scim',           group: 'enterprise', title: 'SCIM provisioning',blurb: 'User auto-sync',                            path: '/org/acme/scim',           status: 'live' },
  { id: 'audit',          group: 'enterprise', title: 'Audit log',        blurb: 'Searchable, exportable',                   path: '/org/acme/audit',          status: 'live' },
  { id: 'data-residency', group: 'enterprise', title: 'Data residency',   blurb: 'Region selection',                         path: '/org/acme/data-residency', status: 'live' },
  { id: 'data-retention', group: 'enterprise', title: 'Retention policy', blurb: 'Per-data-class retention',                 path: '/org/acme/retention',      status: 'live' },

  // Developer platform
  { id: 'dev-overview',  group: 'developer', title: 'Overview',         blurb: 'Build-on landing · quickstart',         path: '/developers',            status: 'live' },
  { id: 'dev-api',       group: 'developer', title: 'API reference',    blurb: 'REST + GraphQL · cURL + lang samples',  path: '/developers/api',        status: 'live' },
  { id: 'dev-playground',group: 'developer', title: 'Playground',       blurb: 'Live authenticated requests',           path: '/developers/playground', status: 'live' },
  { id: 'dev-oauth',     group: 'developer', title: 'OAuth apps',       blurb: 'Register clients · rotate secrets',     path: '/developers/oauth-apps', status: 'live' },
  { id: 'dev-webhooks',  group: 'developer', title: 'Webhook log',      blurb: 'Inspect deliveries · resend · replay',  path: '/developers/webhooks',   status: 'live' },
  { id: 'dev-cli',       group: 'developer', title: 'CLI',              blurb: 'Install · auth · common commands',      path: '/developers/cli',        status: 'live' },
  { id: 'dev-sdks',      group: 'developer', title: 'SDKs',             blurb: 'TypeScript · Go · Python · Ruby',       path: '/developers/sdks',       status: 'live' },

  // Marketplace
  { id: 'mkt-directory', group: 'marketplace', title: 'Marketplace',          blurb: 'Browse verified integrations',         path: '/integrations',        status: 'live' },
  { id: 'mkt-detail',    group: 'marketplace', title: 'Integration detail',   blurb: 'Per-integration install + scopes',     path: '/integrations/slack',  status: 'live' },

  // Trust & security
  { id: 'trust',         group: 'trust', title: 'Trust center',           blurb: 'Certs · reports · subprocessors',        path: '/trust',    status: 'live' },
  { id: 'security',      group: 'trust', title: 'Vulnerability disclosure', blurb: 'Scope · rewards · hall of fame',       path: '/security', status: 'live' },

  // Support
  { id: 'support',       group: 'support', title: 'Support',          blurb: 'Tickets · live chat · email',                path: '/support',         status: 'live' },
  { id: 'contact-sales', group: 'support', title: 'Contact sales',    blurb: 'Enterprise demo request',                    path: '/contact-sales',   status: 'live' },
  { id: 'feedback',      group: 'support', title: 'Feedback / votes', blurb: 'Ideas, bugs, praise · upvote feed',          path: '/feedback',        status: 'live' },

  // Errors & meta
  { id: 'err-404',       group: 'errors', title: '404 not found',     blurb: 'Wrong URL landing',                          path: '/_errors/404',     status: 'live' },
  { id: 'err-500',       group: 'errors', title: '500 server error',  blurb: 'Backend / unhandled error',                  path: '/_errors/500',     status: 'live' },
  { id: 'maintenance',   group: 'errors', title: 'Maintenance',       blurb: 'Planned downtime page',                      path: '/maintenance',     status: 'live' },
  { id: 'offline',       group: 'errors', title: 'Offline',           blurb: 'No connection state',                        path: '/offline',         status: 'live' },
  { id: 'whats-new',     group: 'errors', title: "What's new",        blurb: 'Recent ships feed',                          path: '/whats-new',       status: 'live' },
  { id: 'roadmap',       group: 'errors', title: 'Roadmap',           blurb: 'Now · Next · Later kanban',                  path: '/roadmap',         status: 'live' },
  { id: 'cookies',       group: 'errors', title: 'Cookie preferences', blurb: 'Granular cookie consent',                   path: '/legal/cookies',   status: 'live' },
  { id: 'accessibility', group: 'errors', title: 'Accessibility',     blurb: 'WCAG conformance + VPAT',                    path: '/accessibility',   status: 'live' },

  // Global
  { id: 'changelog',      group: 'global', title: 'Changelog',            blurb: 'Product updates feed',                     path: '/changelog',           status: 'live' },
  { id: 'help',           group: 'global', title: 'Help center',          blurb: 'Searchable articles',                      path: '/help',                status: 'live' },
  { id: 'status',         group: 'global', title: 'Status',               blurb: 'Statuspage link out',                      path: '/status',              status: 'live' },
  { id: 'pricing',        group: 'global', title: 'Pricing (public)',     blurb: 'Marketing page',                           path: '/pricing',             status: 'live' },
  { id: 'legal-terms',    group: 'global', title: 'Terms',                blurb: 'Legal',                                    path: '/legal/terms',         status: 'live' },
  { id: 'legal-privacy',  group: 'global', title: 'Privacy',              blurb: 'Legal',                                    path: '/legal/privacy',       status: 'live' },
  { id: 'legal-dpa',      group: 'global', title: 'DPA',                  blurb: 'Data processing addendum',                 path: '/legal/dpa',           status: 'live' },
  { id: 'legal-subs',     group: 'global', title: 'Subprocessors',        blurb: 'Third-party list',                         path: '/legal/subprocessors', status: 'live' },
  { id: 'admin',          group: 'global', title: 'Super-admin',          blurb: 'Internal /_admin',                          path: '/_admin',              status: 'live' },
];

export const GROUP_ORDER: CatalogGroup[] = [
  'auth', 'onboarding', 'account', 'organization', 'workspace', 'billing', 'enterprise',
  'developer', 'marketplace', 'trust', 'support', 'errors', 'global',
];

export function catalogStats() {
  const total = CATALOG.length;
  const live = CATALOG.filter((c) => c.status === 'live').length;
  const stub = CATALOG.filter((c) => c.status === 'stub').length;
  return { total, live, stub, planned: total - live - stub };
}
