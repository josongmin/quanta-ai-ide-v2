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
import { FilterBar, FilterProvider } from '@features/filter-files';
import { SearchBar } from '@features/search-dsl';
import { ModeSwitcher, useViewMode } from '@features/switch-mode';
import { OverlayPopover } from '@features/apply-overlay';
import { useStack } from '@features/inspect-target';
import { AppShell } from '@widgets/app-shell';
import { Stage } from '@widgets/stage';
import { ErrorBoundary } from '@app/providers';

// Lazy stages — same boundaries we had before so route splits keep
// matching `viz-modes` / `coding-stage` / `review-stage` chunks.
const ChatAgent = lazy(() =>
  import('@features/chat-agent').then((m) => ({ default: m.ChatAgent })),
);
const CodingStage = lazy(() =>
  import('@widgets/coding-stage').then((m) => ({ default: m.CodingStage })),
);
const ReviewStage = lazy(() =>
  import('@widgets/review-stage').then((m) => ({ default: m.ReviewStage })),
);
const AdmissionRoot = lazy(() =>
  import('@features/admission-rules').then((m) => ({ default: m.AdmissionRoot })),
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
  const { mode } = useViewMode();
  const { isDark } = useTheme();
  void isDark; // theme flip is now driven by --bg-stage* CSS vars below.
  // Both modes follow the active theme via the semantic stage tokens.
  // Universe-mode flips to the cyanotype Prussian blue in light theme.
  const bgClass = mode === 'universe'
    ? 'bg-[color:var(--bg-stage-universe)]'
    : 'bg-[color:var(--bg-stage)]';

  return (
    <div className={`absolute inset-0 overflow-hidden font-sans select-none ${bgClass}`}>
      {/* Stage owns the WebGL context — by far the most likely source of a
          runtime fault (driver hiccups, OOM, lost context). Isolated so a
          single crash doesn't blank the chrome around it. */}
      <ErrorBoundary label="Stage">
        <Stage />
      </ErrorBoundary>

      <div className="absolute top-4 left-4 bottom-4 z-40 pointer-events-auto flex">
        <FilterBarHost />
      </div>

      <SearchBar />

      <div className="absolute top-4 left-[316px] z-30 pointer-events-auto flex items-start gap-2 flex-wrap max-w-[calc(100vw-340px)]">
        <ModeSwitcher />
        <OverlayPopover />
      </div>

      {/* Git actions (commit/push) live in the GNB itself now — see
          AppShell. The old corner-mounted PR preview surface was removed
          per product call: branch state belongs in chrome, not as a
          floating panel competing with the FilterBar. */}

      <Suspense fallback={null}>
        <ChatAgent />
      </Suspense>
    </div>
  );
}

// Tiny adapter that bridges filter-files → inspect-target without making
// FilterBar import the inspect-target slice. The router is a natural
// integration seam: it already imports both slices.
function FilterBarHost() {
  const { open, activeKey } = useStack();
  return (
    <FilterBar
      onOpenFolder={(path) => { open({ kind: 'folder', path }); }}
      onOpenFile={(id) => { open({ kind: 'file', id }); }}
      activeKey={activeKey}
    />
  );
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
