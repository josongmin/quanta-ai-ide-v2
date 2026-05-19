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
  createRootRoute, createRoute, createRouter, Outlet, redirect,
} from '@tanstack/react-router';

import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { buildRepo } from '@entities/repo';
import { FilterProvider } from '@features/filter-files';
import { AppShell } from '@widgets/app-shell';
import { ErrorBoundary } from '@app/providers';
import { IntelligenceLayout } from './intelligence';

// Lazy stages — same boundaries we had before so route splits keep
// matching `viz-modes` / `coding-stage` / `review-stage` chunks.
const CodingStage = lazy(() =>
  import('@widgets/coding-stage').then((m) => ({ default: m.CodingStage })),
);
const ReviewStage = lazy(() =>
  import('@widgets/review-stage').then((m) => ({ default: m.ReviewStage })),
);
const AdmissionRoot = lazy(() =>
  import('@features/admission-rules').then((m) => ({ default: m.AdmissionRoot })),
);
const VerifiedFixRoot = lazy(() =>
  import('@features/verified-fix').then((m) => ({ default: m.VerifiedFixRoot })),
);
const FixPipelineStage = lazy(() =>
  import('@widgets/fix-pipeline-stage').then((m) => ({ default: m.FixPipelineStage })),
);
const FixPipelineHandoffBanner = lazy(() =>
  import('@features/investigation').then((m) => ({ default: m.FixPipelineHandoffBanner })),
);
const HandoffBreadcrumb = lazy(() =>
  import('@features/investigation/handoff').then((m) => ({ default: m.HandoffBreadcrumb })),
);
const InvestigateStage = lazy(() =>
  import('@widgets/investigate-stage').then((m) => ({ default: m.InvestigateStage })),
);

// ─────────────────────────────────────────────────────────────────────────
// Root route — owns the chrome (header, tabs, modals) via AppShell. The
// active tab content renders inside AppShell's `<Outlet />`.
// ─────────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: function RootLayout() {
    // Outer boundary — protects the entire tree (AppShell + active route).
    // A crash here gives the user a chance to recover without forcing a
    // full reload, and keeps the canvas-based stages from taking the whole
    // app down on a Three.js / WebGL fault.
    return (
      <ErrorBoundary label="App">
        <FilterProviderRoot>
          <AppShell>
            <Outlet />
          </AppShell>
        </FilterProviderRoot>
      </ErrorBoundary>
    );
  },
});

function FilterProviderRoot({ children }: { children: React.ReactNode }) {
  // Repo data lives at the root so all routes share the same in-memory
  // graph. Building once on mount is enough — the demo data is static.
  const repo = useMemo(() => buildRepo(), []);
  return <FilterProvider repo={repo}>{children}</FilterProvider>;
}

// ─────────────────────────────────────────────────────────────────────────
// Intelligence route (default) — the dot-field stage + filter sidebar.
// ─────────────────────────────────────────────────────────────────────────

function IntelligenceRoute() {
  return <IntelligenceLayout />;
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
  component: IntelligenceRoute,
});

const codingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/coding',
  component: function CodingRouteComponent() {
    return (
      <Suspense fallback={null}>
        <CodingStage />
      </Suspense>
    );
  },
});

const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agents',
  component: function AgentsRouteComponent() {
    return <PlaceholderTab tab="agents" />;
  },
});

const reviewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reviews',
  component: function ReviewsRouteComponent() {
    return (
      <Suspense fallback={null}>
        <ReviewStage />
      </Suspense>
    );
  },
});

const admissionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admission',
  component: function AdmissionRouteComponent() {
    return (
      <Suspense fallback={null}>
        <AdmissionRoot />
      </Suspense>
    );
  },
});

const fixesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fixes',
  component: function FixesRouteComponent() {
    return (
      <Suspense fallback={null}>
        <VerifiedFixRoot />
      </Suspense>
    );
  },
});

const fixPipelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fix-pipeline',
  component: function FixPipelineRouteComponent() {
    return (
      <Suspense fallback={null}>
        <FixPipelineStage />
        <FixPipelineHandoffBanner />
        <HandoffBreadcrumb />
      </Suspense>
    );
  },
});

const investigateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/investigate',
  component: function InvestigateRouteComponent() {
    return (
      <Suspense fallback={null}>
        <InvestigateStage />
      </Suspense>
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────
// /me/* — the per-user settings area (profile, account, appearance/theme
// presets, …). Each page self-wraps in MeShell (side-nav + AppShell
// chrome stays visible), so a route only needs to render the page. The
// page set used to be unreachable — present in `@widgets/me-stage` but
// never wired into the tree, which is why the theme/appearance picker
// "disappeared". Data-driven so the 11 paths stay in one place.
// ─────────────────────────────────────────────────────────────────────────
const meStage = () => import('@widgets/me-stage');
const ME_ROUTES: { path: string; load: Parameters<typeof lazy>[0] }[] = [
  { path: '/me/profile',        load: () => meStage().then((m) => ({ default: m.ProfilePage })) },
  { path: '/me/account',        load: () => meStage().then((m) => ({ default: m.AccountPage })) },
  { path: '/me/security',       load: () => meStage().then((m) => ({ default: m.SecurityPage })) },
  { path: '/me/connected-apps', load: () => meStage().then((m) => ({ default: m.ConnectedAppsPage })) },
  { path: '/me/api-tokens',     load: () => meStage().then((m) => ({ default: m.ApiTokensPage })) },
  { path: '/me/notifications',  load: () => meStage().then((m) => ({ default: m.NotificationsPage })) },
  { path: '/me/appearance',     load: () => meStage().then((m) => ({ default: m.AppearancePage })) },
  { path: '/me/preferences',    load: () => meStage().then((m) => ({ default: m.PreferencesPage })) },
  { path: '/me/keyboard',       load: () => meStage().then((m) => ({ default: m.KeyboardPage })) },
  { path: '/me/ai',             load: () => meStage().then((m) => ({ default: m.AiPage })) },
  { path: '/me/inbox',          load: () => meStage().then((m) => ({ default: m.InboxPage })) },
];
const meRoutes = ME_ROUTES.map(({ path, load }) => {
  const Page = lazy(load);
  return createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: function MeRouteComponent() {
      return (
        <Suspense fallback={null}>
          <Page />
        </Suspense>
      );
    },
  });
});
// Bare /me → first settings page.
const meIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/me',
  beforeLoad: () => { redirect({ to: '/me/profile', throw: true }); },
});

// 404 — anything else lands back on intelligence. Cheaper than a real
// not-found page for an internal app and keeps copy-pasted bad URLs from
// looking broken.
const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => { redirect({ to: '/intelligence', throw: true }); },
});

// ─────────────────────────────────────────────────────────────────────────

function PlaceholderTab({ tab }: { tab: string }) {
  const { isDark } = useTheme();
  const { t } = useTranslation('app');
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'text-white/30' : 'text-black/30'}`}>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.18em] font-black mb-2">{tab}</div>
        <div className="text-[12px]">{t('placeholder.comingSoon')}</div>
      </div>
    </div>
  );
}

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
  investigateRoute,
  meIndexRoute,
  ...meRoutes,
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
