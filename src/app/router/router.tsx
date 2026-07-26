// Code-based TanStack Router tree. We deliberately avoid the file-based
// generator (and its Vite plugin) — the app has a flat top-level surface
// and a hand-written tree keeps the diff visible in code review.
//
// Layout: a single root route renders the AppShell chrome (header + tabs)
// plus an `<Outlet />` for the active tab. Each child route owns its
// stage component; they're lazily code-split via React.lazy already, so
// switching tabs is one network round-trip on cold cache and free after.

import { lazy, Suspense, useMemo } from 'react';
import {
  createRootRoute, createRoute, createRouter, Outlet, redirect, useRouterState,
} from '@tanstack/react-router';

import { buildRepo, buildRepoData, toRepoDataDTO } from '@entities/repo';
import { FilterProvider } from '@entities/filter-state';
import { AppShell } from '@widgets/app-shell';
import { ErrorBoundary } from '@app/providers';
import { RouteFallback } from '@shared/ui';
import { env } from '@shared/config/env';
import { isChromeless } from './routeChrome';
import { decideAuthRedirect } from './authGuard';
import { WorkspaceSurfaceGuard } from './workspaceSurfaceRoute';

// Tab-kind routes are now rendered by WorkspaceTabsHost — the host keeps
// every open tab mounted in parallel and only paints the active one. The
// per-kind route components below all delegate to the host; the URL is
// preserved purely as a deep-linking surface.
const BillingStage = lazy(() =>
  import('@widgets/billing-stage').then((m) => ({ default: m.BillingStage })),
);
const BillingSuccessPage = lazy(() =>
  import('@widgets/billing-stage').then((m) => ({ default: m.BillingSuccessPage })),
);
const BillingCancelPage = lazy(() =>
  import('@widgets/billing-stage').then((m) => ({ default: m.BillingCancelPage })),
);
const OnboardingStage     = lazy(() => import('@widgets/onboarding-stage').then((m) => ({ default: m.OnboardingStage })));
const ProfilePage         = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.ProfilePage })));
const AccountPage         = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.AccountPage })));
const SecurityPage        = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.SecurityPage })));
const ConnectedAppsPage   = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.ConnectedAppsPage })));
const ApiTokensPage       = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.ApiTokensPage })));
const NotificationsPage   = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.NotificationsPage })));
const AppearancePage      = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.AppearancePage })));
const PreferencesPage     = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.PreferencesPage })));
const KeyboardPage        = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.KeyboardPage })));
const AiPage              = lazy(() => import('@widgets/me-stage').then((m) => ({ default: m.AiPage })));
const OrgMembersPage      = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.MembersPage })));
const OrgGeneralPage      = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.GeneralPage })));
const OrgTeamsPage        = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.TeamsPage })));
const OrgRolesPage        = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.RolesPage })));
const OrgSecurityPage     = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.SecurityPage })));
const OrgIntegrationsPage = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.IntegrationsPage })));
const OrgWebhooksPage     = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.WebhooksPage })));
const OrgApiOAuthPage     = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.ApiOAuthPage })));
const OrgPoliciesPage     = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.PoliciesPage })));
const OrgAiPoliciesPage   = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.AiPoliciesPage })));
const OrgSamlSsoPage      = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.SamlSsoPage })));
const OrgScimPage         = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.ScimPage })));
const OrgAuditLogPage     = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.AuditLogPage })));
const OrgDataResidencyPage= lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.DataResidencyPage })));
const OrgRetentionPage    = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.RetentionPolicyPage })));
const WsGeneralPage       = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsGeneralPage })));
const WsSourcePage        = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsSourcePage })));
const WsOwnershipPage     = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsOwnershipPage })));
const WsAdmissionPage     = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsAdmissionPage })));
const WsReviewPage        = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsReviewPage })));
const WsFixPipelinePage   = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsFixPipelinePage })));
const WsAgentsPage        = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsAgentsPage })));
const WsSecretsPage       = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsSecretsPage })));
const WsEnvironmentsPage  = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsEnvironmentsPage })));
const WsWebhooksPage      = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsWebhooksPage })));
const WsLabelsPage        = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsLabelsPage })));
const WsDangerPage        = lazy(() => import('@widgets/ws-stage').then((m) => ({ default: m.WsDangerPage })));
const SignInPage          = lazy(() => import('@widgets/auth-stage').then((m) => ({ default: m.SignInPage })));
const SignUpPage          = lazy(() => import('@widgets/auth-stage').then((m) => ({ default: m.SignUpPage })));
const SsoRedirectPage     = lazy(() => import('@widgets/auth-stage').then((m) => ({ default: m.SsoRedirectPage })));
const ForgotPasswordPage  = lazy(() => import('@widgets/auth-stage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage   = lazy(() => import('@widgets/auth-stage').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage     = lazy(() => import('@widgets/auth-stage').then((m) => ({ default: m.VerifyEmailPage })));
const MfaChallengePage    = lazy(() => import('@widgets/auth-stage').then((m) => ({ default: m.MfaChallengePage })));
const SessionExpiredPage  = lazy(() => import('@widgets/auth-stage').then((m) => ({ default: m.SessionExpiredPage })));
const AcceptInvitationPage = lazy(() => import('@widgets/auth-stage').then((m) => ({ default: m.AcceptInvitationPage })));
const PricingPage         = lazy(() => import('@widgets/public-stage').then((m) => ({ default: m.PricingPage })));
const ChangelogPage       = lazy(() => import('@widgets/public-stage').then((m) => ({ default: m.ChangelogPage })));
const HelpPage            = lazy(() => import('@widgets/public-stage').then((m) => ({ default: m.HelpPage })));
const StatusPage          = lazy(() => import('@widgets/public-stage').then((m) => ({ default: m.StatusPage })));
const TermsPage           = lazy(() => import('@widgets/public-stage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage         = lazy(() => import('@widgets/public-stage').then((m) => ({ default: m.PrivacyPage })));
const DpaPage             = lazy(() => import('@widgets/public-stage').then((m) => ({ default: m.DpaPage })));
const SubprocessorsPage   = lazy(() => import('@widgets/public-stage').then((m) => ({ default: m.SubprocessorsPage })));
const AdminPage           = lazy(() => import('@widgets/public-stage').then((m) => ({ default: m.AdminPage })));

// New SaaS scaffold pages — developer platform, marketplace, trust, support, errors.
const DevOverviewPage     = lazy(() => import('@widgets/developer-stage').then((m) => ({ default: m.DevOverviewPage })));
const ApiReferencePage    = lazy(() => import('@widgets/developer-stage').then((m) => ({ default: m.ApiReferencePage })));
const PlaygroundPage      = lazy(() => import('@widgets/developer-stage').then((m) => ({ default: m.PlaygroundPage })));
const OAuthAppsPage       = lazy(() => import('@widgets/developer-stage').then((m) => ({ default: m.OAuthAppsPage })));
const WebhooksLogPage     = lazy(() => import('@widgets/developer-stage').then((m) => ({ default: m.WebhooksLogPage })));
const CliPage             = lazy(() => import('@widgets/developer-stage').then((m) => ({ default: m.CliPage })));
const SdksPage            = lazy(() => import('@widgets/developer-stage').then((m) => ({ default: m.SdksPage })));
const MarketplacePage         = lazy(() => import('@widgets/marketplace-stage').then((m) => ({ default: m.MarketplacePage })));
const IntegrationDetailPage   = lazy(() => import('@widgets/marketplace-stage').then((m) => ({ default: m.IntegrationDetailPage })));
const TrustCenterPage         = lazy(() => import('@widgets/trust-stage').then((m) => ({ default: m.TrustCenterPage })));
const SecurityDisclosurePage  = lazy(() => import('@widgets/trust-stage').then((m) => ({ default: m.SecurityDisclosurePage })));
const SupportPage         = lazy(() => import('@widgets/support-stage').then((m) => ({ default: m.SupportPage })));
const ContactSalesPage    = lazy(() => import('@widgets/support-stage').then((m) => ({ default: m.ContactSalesPage })));
const FeedbackPage        = lazy(() => import('@widgets/support-stage').then((m) => ({ default: m.FeedbackPage })));
const NotFoundPage        = lazy(() => import('@widgets/error-stage').then((m) => ({ default: m.NotFoundPage })));
const ServerErrorPage     = lazy(() => import('@widgets/error-stage').then((m) => ({ default: m.ServerErrorPage })));
const MaintenancePage     = lazy(() => import('@widgets/error-stage').then((m) => ({ default: m.MaintenancePage })));
const OfflinePage         = lazy(() => import('@widgets/error-stage').then((m) => ({ default: m.OfflinePage })));
const CookiesPage         = lazy(() => import('@widgets/error-stage').then((m) => ({ default: m.CookiesPage })));
const AccessibilityPage   = lazy(() => import('@widgets/error-stage').then((m) => ({ default: m.AccessibilityPage })));
const WhatsNewPage        = lazy(() => import('@widgets/error-stage').then((m) => ({ default: m.WhatsNewPage })));
const RoadmapPage         = lazy(() => import('@widgets/error-stage').then((m) => ({ default: m.RoadmapPage })));
// Extra org-level pages.
const OrgInvitationsPage      = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.InvitationsPage })));
const OrgDomainsPage          = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.DomainsPage })));
const OrgServiceAccountsPage  = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.ServiceAccountsPage })));
const OrgUsagePage            = lazy(() => import('@widgets/org-stage').then((m) => ({ default: m.UsagePage })));

// ─────────────────────────────────────────────────────────────────────────
// Root route — owns the chrome (header, tabs, modals) via AppShell. The
// active tab content renders inside AppShell's `<Outlet />`.
// ─────────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  validateSearch: (search: Record<string, unknown>) => search as Record<string, unknown> & { tab?: string },
  // Auth guard — real mode only. Awaits the (boot-primed, warm) better-auth
  // session so protected content never flashes before the redirect resolves.
  // Mock mode returns immediately → free browsing, exactly as before.
  beforeLoad: async ({ location }) => {
    if (!env.useRealAuth) return;
    // Dynamic import so better-auth stays out of the initial chunk — in mock
    // mode (the standalone demo) it's never loaded at all.
    const { authClient } = await import('@shared/auth');
    const { data } = await authClient.getSession();
    const decision = decideAuthRedirect({
      authed: Boolean(data),
      pathname: location.pathname,
      useRealAuth: env.useRealAuth,
    });
    if (decision) {
      redirect({ to: decision.to as never, search: decision.search as never, throw: true });
    }
  },
  component: function RootLayout() {
    // Auth, onboarding, public/marketing/legal, and the super-admin console
    // render full-bleed, without the AppShell chrome (header, GNB, modals).
    // We branch here so each stage owns the whole viewport — same pattern
    // Linear / Vercel use for /login. The pathname rule set lives in
    // routeChrome.ts so it stays testable and declarative.
    const pathname = useRouterState({ select: (s) => s.location.pathname });

    return (
      <ErrorBoundary label="App">
        {isChromeless(pathname) ? (
          <Outlet />
        ) : (
          <FilterProviderRoot>
            <AppShell>
              <Outlet />
            </AppShell>
          </FilterProviderRoot>
        )}
      </ErrorBoundary>
    );
  },
});

function FilterProviderRoot({ children }: { children: React.ReactNode }) {
  // Repo data lives at the root so all routes share the same in-memory graph.
  // Building once on mount is enough — the demo data is static.
  //
  // Routed through the DTO adapter (buildRepoData ∘ toRepoDataDTO) so the
  // serialization boundary is exercised on every load. Backend swap (Phase 1):
  // replace with the async `fetchRepoData()` seam behind a Suspense/loader.
  const repo = useMemo(() => buildRepoData(toRepoDataDTO(buildRepo())), []);
  return <FilterProvider repo={repo}>{children}</FilterProvider>;
}

// ─────────────────────────────────────────────────────────────────────────
// Tab-kind routes — every kind that the WorkspaceTabsHost knows about
// renders nothing. The host lives in AppShell (above the route boundary)
// and reads the URL to decide which tab to activate. Putting the host
// *inside* the route would unmount/remount it on every tab switch,
// which would defeat the keep-mounted contract.
// ─────────────────────────────────────────────────────────────────────────

function TabHostRoute() {
  return null;
}

// Index ('/') redirects to '/intelligence' so deep-linking is consistent —
// the canonical URL for the dot field is `/intelligence`, not `/`.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { redirect({ to: '/intelligence', throw: true }); },
});

const intelligenceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/intelligence',
  component: TabHostRoute,
});

const codingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/coding',
  component: TabHostRoute,
});

const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agents',
  component: TabHostRoute,
});

const reviewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reviews',
  component: TabHostRoute,
});

const admissionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admission',
  component: TabHostRoute,
});

const fixesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fixes',
  component: TabHostRoute,
});

const fixPipelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fix-pipeline',
  component: TabHostRoute,
});

const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/org/$org/billing',
  component: function BillingRouteComponent() {
    return (
      <Suspense fallback={null}>
        <BillingStage />
      </Suspense>
    );
  },
});

// Every page route shares the same shape: a lazy component wrapped in a
// null-fallback Suspense, parented to the root route. One factory covers all
// of them (org / ws / me / auth / public) — the only thing that ever varied
// was the wrapper's display name, which has no runtime effect.
function makeLazyRoute(
  parentRoute: typeof rootRoute,
  path: string,
  Component: React.LazyExoticComponent<React.ComponentType>,
) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path,
    component: function LazyRouteComponent() {
      // Per-route boundary: a failed lazy chunk (or a crash inside the route)
      // is contained to the outlet — the app chrome and other routes survive,
      // instead of the top-level "App" boundary replacing the whole shell.
      return (
        <ErrorBoundary label={path}>
          <Suspense fallback={<RouteFallback />}>
            <Component />
          </Suspense>
        </ErrorBoundary>
      );
    },
  });
}
const makeOrg = (path: string, Component: React.LazyExoticComponent<React.ComponentType>) =>
  makeLazyRoute(rootRoute, path, Component);
const orgGeneralRoute      = makeOrg('/org/$org/general',      OrgGeneralPage);
const orgMembersRoute      = makeOrg('/org/$org/members',      OrgMembersPage);
const orgTeamsRoute        = makeOrg('/org/$org/teams',        OrgTeamsPage);
const orgRolesRoute        = makeOrg('/org/$org/roles',        OrgRolesPage);
const orgSecurityRoute     = makeOrg('/org/$org/security',     OrgSecurityPage);
const orgIntegrationsRoute = makeOrg('/org/$org/integrations', OrgIntegrationsPage);
const orgWebhooksRoute     = makeOrg('/org/$org/webhooks',     OrgWebhooksPage);
const orgApiRoute          = makeOrg('/org/$org/api',          OrgApiOAuthPage);
const orgPoliciesRoute     = makeOrg('/org/$org/policies',     OrgPoliciesPage);
const orgAiPoliciesRoute   = makeOrg('/org/$org/ai-policies',  OrgAiPoliciesPage);
const orgSamlSsoRoute      = makeOrg('/org/$org/sso',            OrgSamlSsoPage);
const orgScimRoute         = makeOrg('/org/$org/scim',           OrgScimPage);
const orgAuditRoute        = makeOrg('/org/$org/audit',          OrgAuditLogPage);
const orgResidencyRoute    = makeOrg('/org/$org/data-residency', OrgDataResidencyPage);
const orgRetentionRoute    = makeOrg('/org/$org/retention',      OrgRetentionPage);

const makeWs = (path: string, Component: React.LazyExoticComponent<React.ComponentType>) =>
  makeLazyRoute(rootRoute, path, Component);
const wsGeneralRoute      = makeWs('/$org/$ws/settings/general',      WsGeneralPage);
const wsSourceRoute       = makeWs('/$org/$ws/settings/source',       WsSourcePage);
const wsOwnershipRoute    = makeWs('/$org/$ws/settings/ownership',    WsOwnershipPage);
const wsAdmissionRoute    = makeWs('/$org/$ws/settings/admission',    WsAdmissionPage);
const wsReviewRoute       = makeWs('/$org/$ws/settings/review',       WsReviewPage);
const wsFixRoute          = makeWs('/$org/$ws/settings/fix',          WsFixPipelinePage);
const wsAgentsRoute       = makeWs('/$org/$ws/settings/agents',       WsAgentsPage);
const wsSecretsRoute      = makeWs('/$org/$ws/settings/secrets',      WsSecretsPage);
const wsEnvironmentsRoute = makeWs('/$org/$ws/settings/environments', WsEnvironmentsPage);
const wsWebhooksRoute     = makeWs('/$org/$ws/settings/webhooks',     WsWebhooksPage);
const wsLabelsRoute       = makeWs('/$org/$ws/settings/labels',       WsLabelsPage);
const wsDangerRoute       = makeWs('/$org/$ws/settings/danger',       WsDangerPage);

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog',
  component: TabHostRoute,
});

// Generic canonical surface route (WB-402): one route resolves ANY surface from
// the catalog by identity — adding a surface needs no router edit. The route is a
// deep-link GUARD only: the keep-mounted WorkspaceTabsHost is the single mount
// authority, so the guard renders a typed error for a bad surfaceId and nothing
// for a valid one (the host paints it — exactly one mount). Legacy tab paths
// (/intelligence, …) remain read-only aliases handled by the same host.
const workspaceSurfaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/w/$workspaceId/$surfaceId',
  component: function WorkspaceSurfaceRouteComponent() {
    const { workspaceId, surfaceId } = workspaceSurfaceRoute.useParams();
    return (
      <ErrorBoundary label={`surface:${surfaceId}`}>
        <WorkspaceSurfaceGuard workspaceId={workspaceId} surfaceId={surfaceId} />
      </ErrorBoundary>
    );
  },
});

// Personal account pages (/me/*). These render INSIDE the AppShell chrome
// (the GNB tabs stay visible). Each page mounts its own MeShell which adds
// the left-side settings sidebar.
const makeMe = (path: string, Component: React.LazyExoticComponent<React.ComponentType>) =>
  makeLazyRoute(rootRoute, path, Component);
const meProfileRoute        = makeMe('/me/profile',        ProfilePage);
const meAccountRoute        = makeMe('/me/account',        AccountPage);
const meSecurityRoute       = makeMe('/me/security',       SecurityPage);
const meConnectedAppsRoute  = makeMe('/me/connected-apps', ConnectedAppsPage);
const meApiTokensRoute      = makeMe('/me/api-tokens',     ApiTokensPage);
const meNotificationsRoute  = makeMe('/me/notifications',  NotificationsPage);
const meAppearanceRoute     = makeMe('/me/appearance',     AppearancePage);
const mePreferencesRoute    = makeMe('/me/preferences',    PreferencesPage);
const meKeyboardRoute       = makeMe('/me/keyboard',       KeyboardPage);
const meAiRoute             = makeMe('/me/ai',             AiPage);
// Inbox is a tab-kind, so its route renders the host (the host owns the
// InboxPage instance). The other /me/* routes stay page-direct because
// they are personal-account surfaces, not workspace tabs.
const meInboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/me/inbox',
  component: TabHostRoute,
});

// Auth surfaces (sign-in flow). Mount under /auth/* so the root layout
// can drop the AppShell chrome for the entire branch.
const makeAuth = (path: string, Component: React.LazyExoticComponent<React.ComponentType>) =>
  makeLazyRoute(rootRoute, path, Component);
const onboardingRoute   = makeAuth('/onboarding',           OnboardingStage);
const authLoginRoute    = makeAuth('/auth/login',           SignInPage);
const authSignupRoute   = makeAuth('/auth/signup',          SignUpPage);
const authSsoRoute      = makeAuth('/auth/sso',             SsoRedirectPage);
const authForgotRoute   = makeAuth('/auth/forgot',          ForgotPasswordPage);
const authResetRoute    = makeAuth('/auth/reset',           ResetPasswordPage);
const authVerifyRoute   = makeAuth('/auth/verify-email',    VerifyEmailPage);
const authMfaRoute      = makeAuth('/auth/mfa',             MfaChallengePage);
const authExpiredRoute  = makeAuth('/auth/session-expired', SessionExpiredPage);
// Emailed invite-accept link (needs a session; the auth guard bounces + returns).
const acceptInviteRoute = makeAuth('/accept-invitation/$id', AcceptInvitationPage);
// Stripe checkout return (success_url / cancel_url point here, set by accounts).
const billingSuccessRoute = makeAuth('/billing/success', BillingSuccessPage);
const billingCancelRoute  = makeAuth('/billing/cancel',  BillingCancelPage);

// Public marketing / legal / status pages — chromeless, same lazy-suspense
// wrapper as auth.
const pricingRoute       = makeAuth('/pricing',                PricingPage);
const changelogRoute     = makeAuth('/changelog',              ChangelogPage);
const helpRoute          = makeAuth('/help',                   HelpPage);
const statusRoute        = makeAuth('/status',                 StatusPage);
const legalTermsRoute    = makeAuth('/legal/terms',            TermsPage);
const legalPrivacyRoute  = makeAuth('/legal/privacy',          PrivacyPage);
const legalDpaRoute      = makeAuth('/legal/dpa',              DpaPage);
const legalSubsRoute     = makeAuth('/legal/subprocessors',    SubprocessorsPage);
const adminRoute         = makeAuth('/_admin',                 AdminPage);

// Developer platform — renders inside AppShell (keeps GNB visible).
const devOverviewRoute   = makeMe('/developers',             DevOverviewPage);
const devApiRoute        = makeMe('/developers/api',         ApiReferencePage);
const devPlaygroundRoute = makeMe('/developers/playground',  PlaygroundPage);
const devOAuthRoute      = makeMe('/developers/oauth-apps',  OAuthAppsPage);
const devWebhooksRoute   = makeMe('/developers/webhooks',    WebhooksLogPage);
const devCliRoute        = makeMe('/developers/cli',         CliPage);
const devSdksRoute       = makeMe('/developers/sdks',        SdksPage);

// Marketplace + trust + support + meta — chromeless (own their own shell).
const marketplaceRoute       = makeAuth('/integrations',          MarketplacePage);
const integrationDetailRoute = makeAuth('/integrations/$slug',    IntegrationDetailPage);
const trustRoute             = makeAuth('/trust',                 TrustCenterPage);
const securityDisclosureRoute = makeAuth('/security',             SecurityDisclosurePage);
const supportRoute           = makeAuth('/support',               SupportPage);
const contactSalesRoute      = makeAuth('/contact-sales',         ContactSalesPage);
const feedbackRoute          = makeAuth('/feedback',              FeedbackPage);
const whatsNewRoute          = makeAuth('/whats-new',             WhatsNewPage);
const roadmapRoute           = makeAuth('/roadmap',               RoadmapPage);
const cookiesRoute           = makeAuth('/legal/cookies',         CookiesPage);
const accessibilityRoute     = makeAuth('/accessibility',         AccessibilityPage);

// Error / status pages — chromeless previews. Real 404 already redirects via
// the catch-all; these are linkable demo previews from the catalog.
const errors404Route     = makeAuth('/_errors/404',     NotFoundPage);
const errors500Route     = makeAuth('/_errors/500',     ServerErrorPage);
const maintenanceRoute   = makeAuth('/maintenance',     MaintenancePage);
const offlineRoute       = makeAuth('/offline',         OfflinePage);

// Extra org-level surfaces.
const orgInvitationsRoute     = makeOrg('/org/$org/invitations',      OrgInvitationsPage);
const orgDomainsRoute         = makeOrg('/org/$org/domains',          OrgDomainsPage);
const orgServiceAccountsRoute = makeOrg('/org/$org/service-accounts', OrgServiceAccountsPage);
const orgUsageRoute           = makeOrg('/org/$org/usage',            OrgUsagePage);

// 404 — anything else lands back on intelligence. Cheaper than a real
// not-found page for an internal app and keeps copy-pasted bad URLs from
// looking broken.
const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => { redirect({ to: '/intelligence', throw: true }); },
});

// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// Tree assembly + router instance.
// ─────────────────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  intelligenceRoute,
  codingRoute,
  agentsRoute,
  reviewsRoute,
  admissionRoute,
  fixesRoute,
  fixPipelineRoute,
  billingRoute,
  orgGeneralRoute,
  orgMembersRoute,
  orgTeamsRoute,
  orgRolesRoute,
  orgSecurityRoute,
  orgIntegrationsRoute,
  orgWebhooksRoute,
  orgApiRoute,
  orgPoliciesRoute,
  orgAiPoliciesRoute,
  orgSamlSsoRoute,
  orgScimRoute,
  orgAuditRoute,
  orgResidencyRoute,
  orgRetentionRoute,
  wsGeneralRoute,
  wsSourceRoute,
  wsOwnershipRoute,
  wsAdmissionRoute,
  wsReviewRoute,
  wsFixRoute,
  wsAgentsRoute,
  wsSecretsRoute,
  wsEnvironmentsRoute,
  wsWebhooksRoute,
  wsLabelsRoute,
  wsDangerRoute,
  catalogRoute,
  workspaceSurfaceRoute,
  meProfileRoute,
  meAccountRoute,
  meSecurityRoute,
  meConnectedAppsRoute,
  meApiTokensRoute,
  meNotificationsRoute,
  meAppearanceRoute,
  mePreferencesRoute,
  meKeyboardRoute,
  meAiRoute,
  meInboxRoute,
  onboardingRoute,
  authLoginRoute,
  authSignupRoute,
  authSsoRoute,
  authForgotRoute,
  authResetRoute,
  authVerifyRoute,
  acceptInviteRoute,
  billingSuccessRoute,
  billingCancelRoute,
  authMfaRoute,
  authExpiredRoute,
  pricingRoute,
  changelogRoute,
  helpRoute,
  statusRoute,
  legalTermsRoute,
  legalPrivacyRoute,
  legalDpaRoute,
  legalSubsRoute,
  adminRoute,
  devOverviewRoute,
  devApiRoute,
  devPlaygroundRoute,
  devOAuthRoute,
  devWebhooksRoute,
  devCliRoute,
  devSdksRoute,
  marketplaceRoute,
  integrationDetailRoute,
  trustRoute,
  securityDisclosureRoute,
  supportRoute,
  contactSalesRoute,
  feedbackRoute,
  whatsNewRoute,
  roadmapRoute,
  cookiesRoute,
  accessibilityRoute,
  errors404Route,
  errors500Route,
  maintenanceRoute,
  offlineRoute,
  orgInvitationsRoute,
  orgDomainsRoute,
  orgServiceAccountsRoute,
  orgUsageRoute,
  catchAllRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',  // hover/focus a Link → pre-fetch its chunk
});

// Type registration — gives `<Link to="…">` exhaustive autocomplete.
// `interface` is required for declaration-merging into TanStack Router's
// own `Register` interface; a `type` alias here triggers TS2300.
declare module '@tanstack/react-router' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- declaration-merging requires `interface`; see comment above.
  interface Register {
    router: typeof router;
  }
}

export type AppRouter = typeof router;
