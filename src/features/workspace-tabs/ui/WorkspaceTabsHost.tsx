import { Suspense, memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';
import { ErrorBoundary, UiScopeProvider } from '@shared/ui';
import { useWorkspaceTabsStore, type WorkspaceTab } from '../model/store';
import { resolveTabKindFromPath, type TabKind } from '@shared/config/workspaceTabs';
import { useWorkspaceTabsRegistry, type TabKindDef } from '../model/RegistryContext';
import { TabVisibilityProvider } from './TabVisibilityContext';
import { reconcileMountedTabs } from '../model/lifecycle';

// Cap on simultaneously-mounted tab panels. Each WebGL-bearing tab
// (intelligence/explore) holds a renderer + scene graph + window
// listeners + DOM label tree — without a cap, opening 15 tabs means 15
// live WebGL contexts even with only one visible. We bound it via LRU:
// the active tab is always mounted, and the least-recently-active
// inactive tab is evicted (unmounted) when a new activation would push
// us over the cap. An evicted tab re-mounts fresh next time it is
// activated (zoom/pan/selection within the mode resets — acceptable
// tradeoff for the memory ceiling). 6 chosen to comfortably cover a
// typical 3-5 tab session with headroom.
const MAX_MOUNTED_TABS = 6;

// Renders every *activated* tab as a sibling in the DOM, with only the
// active tab visible. Inactive tabs stay mounted so per-tab state (scroll
// position, uncommitted form input, locally-derived UI flags) survives a
// switch — the same trick browser tab strips use.
//
// Mounted once in AppShell, above the route boundary. Self-hides on
// non-tab paths (e.g. /me/profile) so the page underneath can paint
// over it. Putting the host inside a route component would force a full
// unmount/remount on every tab switch, which would tear down every
// mounted tab panel and defeat the keep-mounted contract.
//
// Two further refinements:
//
//   1. Tabs are only rendered after their first activation. A fresh app
//      boot with seven default tabs no longer downloads seven lazy
//      chunks; only the active tab's chunk loads.
//
//   2. Every panel publishes its visibility via TabVisibilityContext so
//      heavy descendants (WebGL rAF loops, polling intervals) can pause
//      when hidden behind `display: none`.
export default function WorkspaceTabsHost() {
  const tabRegistry = useWorkspaceTabsRegistry();
  // One shallow-equal subscription rather than two separate ones — the
  // host always needs both fields together, so reading them in a single
  // selector cuts per-update comparator work in half. The shallow
  // wrapper bails out cleanly when nothing relevant has changed.
  const { tabs, activeId } = useWorkspaceTabsStore(
    useShallow((s) => ({ tabs: s.tabs, activeId: s.activeId })),
  );
  const location = useRouterState({ select: (s) => s.location }) as { pathname: string; href?: string };
  const pathname = location.pathname;
  const search = useMemo(() => {
    if (location.href && typeof window !== 'undefined') {
      try {
        return new URL(location.href, window.location.origin).search;
      } catch {
        return window.location.search;
      }
    }
    return typeof window !== 'undefined' ? window.location.search : '';
  }, [location.href]);
  useTabUrlSync(pathname, search);

  // Whether the current URL is owned by a tab kind. On non-tab routes
  // (e.g. /me/profile) we render nothing so the route's own page can
  // paint into <main> instead. The tab list stays alive in the store
  // and resumes painting the moment the user navigates back to a tab
  // path.
  const onTabPath = resolveTabKindFromPath(pathname) !== null;

  // LRU of currently-mounted tab ids (oldest → newest). The active tab
  // is always at the back; eviction removes from the front when length
  // exceeds MAX_MOUNTED_TABS. This replaces the unbounded "everActive"
  // set: keep-mounted survives a tab switch, but doesn't survive being
  // pushed out of the LRU. Bootstrapped with `activeId` so the first
  // paint shows the initial active tab without an extra render pass.
  const [mountedOrder, setMountedOrder] = useState<string[]>(() => [activeId]);
  useEffect(() => useWorkspaceTabsStore.subscribe((state) => {
    const aliveIds = new Set(state.tabs.map((tab) => tab.id));
    setMountedOrder((current) => {
      const next = reconcileMountedTabs(current, state.activeId, aliveIds, MAX_MOUNTED_TABS);
      return sameOrder(current, next) ? current : next;
    });
  }), []);

  const mounted = useMemo(() => new Set(mountedOrder), [mountedOrder]);

  if (!onTabPath) return null;

  return (
    <div className="absolute inset-0">
      {tabs.map((tab) => {
        if (!mounted.has(tab.id)) return null;
        return (
          <TabPanel
            key={tab.id}
            tab={tab}
            visible={tab.id === activeId}
            tabRegistry={tabRegistry}
          />
        );
      })}
    </div>
  );
}

// Memoised so a non-active tab doesn't re-render when sibling tabs come
// or go. The component re-renders only when its own `tab` or `visible`
// changes, which is exactly what we want for the keep-mounted pattern.
const TabPanel = memo(function TabPanel({
  tab,
  visible,
  tabRegistry,
}: {
  tab: WorkspaceTab;
  visible: boolean;
  tabRegistry: Record<TabKind, TabKindDef>;
}) {
  const def = tabRegistry[tab.kind];
  const Component = def.Component;
  const owner = useMemo(() => ({
    ownerId: `workspace-tab:${tab.kind}`,
    scopeInstanceId: `tab:${tab.id}`,
    tabId: tab.id,
  }), [tab.id, tab.kind]);
  // A surface's optional Provider is folded into its lazy Component by the
  // catalog derivation, so the host renders a single element.
  const content = <Component />;

  // `display: none` keeps subtree state alive (state, layout effects,
  // scroll containers) but stops paint and hit-testing. We also disable
  // pointer events explicitly because some descendants set their own
  // `pointer-events: auto` and would otherwise leak clicks.
  const style: CSSProperties = visible
    ? { position: 'absolute', inset: 0 }
    : {
        position: 'absolute',
        inset: 0,
        display: 'none',
        pointerEvents: 'none',
      };

  return (
    <div
      role="tabpanel"
      aria-hidden={!visible}
      style={style}
    >
      <ErrorBoundary label={`Tab:${def.label}`}>
        <Suspense fallback={null}>
          <UiScopeProvider owner={owner} active={visible}>
            <TabVisibilityProvider visible={visible}>
              {content}
            </TabVisibilityProvider>
          </UiScopeProvider>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
});

// URL → active-tab one-way sync. The store→URL leg is handled by the
// strip's click handler so we don't ping-pong when the user navigates to
// a non-tab path like `/me/profile`.
//
// We deliberately do NOT subscribe to `tabs` / `activeId` here. The
// host's render already subscribes (it needs them to paint). Using
// `getState()` from inside the effect lets the sync read the current
// snapshot without adding another subscription that re-fires on store
// churn.
function useTabUrlSync(pathname: string, search: string) {
  useEffect(() => {
    const kind = resolveTabKindFromPath(pathname);
    if (!kind) return;
    const { tabs, activeId, setActive, open } = useWorkspaceTabsStore.getState();
    const explicitTabId = new URLSearchParams(search).get('tab');
    if (explicitTabId) {
      const exact = tabs.find((t) => t.id === explicitTabId && t.kind === kind);
      if (exact) {
        if (activeId !== exact.id) setActive(exact.id);
        return;
      }
    }
    const active = tabs.find((t) => t.id === activeId);
    if (active?.kind === kind) return;
    // Prefer focusing an existing tab of that kind over opening a new
    // one — direct URL navigation should feel like "jump to that view",
    // not "spawn another instance".
    const existing = tabs.find((t) => t.kind === kind);
    if (existing) setActive(existing.id);
    else open(kind);
  }, [pathname, search]);
}

// Navigation hook used by the strip when the user clicks a tab. Pushes
// the canonical path for the activated kind so deep links and back/
// forward stay coherent. Wrapped in useCallback so consumers that pass
// it into useMemo/useCallback dependency arrays get a stable identity.
export function useNavigateToTab() {
  const navigate = useNavigate();
  const tabRegistry = useWorkspaceTabsRegistry();
  return useCallback(
    (kind: TabKind, tabId?: string) => {
      const path = tabRegistry[kind].path;
      // `replace: true` keeps tab switches off the browser history
      // stack. Linear behaves the same way: back/forward moves between
      // sessions, not between tabs.
      void navigate({
        to: path,
        replace: true,
        search: (previous) => ({ ...previous, tab: tabId }),
      });
    },
    [navigate, tabRegistry],
  );
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
