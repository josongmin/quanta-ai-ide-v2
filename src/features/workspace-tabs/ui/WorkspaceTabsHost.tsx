import { Suspense, memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';
import { ErrorBoundary, SurfaceScope } from '@shared/ui';
import { useWorkspaceTabsStore, type WorkspaceTab } from '../model/store';
import { surfaceIdFromPath, getSurfaceMeta, legacyPathForSurface } from '@shared/config/surfaces';
import { useSurfaceRuntime, type SurfaceRuntimeEntry } from '../model/RegistryContext';
import { TabVisibilityProvider } from './TabVisibilityContext';
import { reconcileMountedTabs } from '../model/lifecycle';

// Cap on simultaneously-mounted tab panels. Each WebGL-bearing surface holds a
// renderer + scene graph + listeners; without a cap, many open tabs mean many
// live contexts. Bounded via LRU: the active tab is always mounted, the
// least-recently-active inactive tab is evicted when a new activation exceeds
// the cap. An evicted tab re-mounts fresh next activation.
const MAX_MOUNTED_TABS = 6;

// Renders every activated tab as a sibling, painting only the active one.
// Inactive tabs stay mounted so per-tab state survives a switch. Mounted once in
// AppShell, above the route boundary; self-hides on non-surface paths.
export default function WorkspaceTabsHost() {
  const surfaceRuntime = useSurfaceRuntime();
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

  // Whether the current URL is owned by a surface. On non-surface routes we
  // render nothing so the route's own page paints into <main>.
  const onSurfacePath = surfaceIdFromPath(pathname) !== null;

  const [mountedOrder, setMountedOrder] = useState<string[]>(() => [activeId]);
  useEffect(() => useWorkspaceTabsStore.subscribe((state) => {
    const aliveIds = new Set(state.tabs.map((tab) => tab.id));
    setMountedOrder((current) => {
      const next = reconcileMountedTabs(current, state.activeId, aliveIds, MAX_MOUNTED_TABS);
      return sameOrder(current, next) ? current : next;
    });
  }), []);

  const mounted = useMemo(() => new Set(mountedOrder), [mountedOrder]);

  if (!onSurfacePath) return null;

  return (
    <div className="absolute inset-0">
      {tabs.map((tab) => {
        if (!mounted.has(tab.id)) return null;
        return (
          <TabPanel
            key={tab.id}
            tab={tab}
            visible={tab.id === activeId}
            surfaceRuntime={surfaceRuntime}
          />
        );
      })}
    </div>
  );
}

const TabPanel = memo(function TabPanel({
  tab,
  visible,
  surfaceRuntime,
}: {
  tab: WorkspaceTab;
  visible: boolean;
  surfaceRuntime: Readonly<Record<string, SurfaceRuntimeEntry>>;
}) {
  const entry = surfaceRuntime[tab.surfaceId];
  const owner = useMemo(() => ({
    ownerId: `workspace-surface:${tab.surfaceId}`,
    scopeInstanceId: `tab:${tab.id}`,
    tabId: tab.id,
  }), [tab.id, tab.surfaceId]);
  const title = getSurfaceMeta(tab.surfaceId)?.title ?? tab.surfaceId;

  const style: CSSProperties = visible
    ? { position: 'absolute', inset: 0 }
    : { position: 'absolute', inset: 0, display: 'none', pointerEvents: 'none' };

  const Component = entry?.Component;

  return (
    <div role="tabpanel" aria-hidden={!visible} style={style}>
      <ErrorBoundary label={`Surface:${title}`}>
        <Suspense fallback={null}>
          <SurfaceScope owner={owner} active={visible}>
            <TabVisibilityProvider visible={visible}>
              {Component ? <Component /> : <div role="alert">Unknown surface: {tab.surfaceId}</div>}
            </TabVisibilityProvider>
          </SurfaceScope>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
});

// URL → active-surface one-way sync.
function useTabUrlSync(pathname: string, search: string) {
  useEffect(() => {
    const surfaceId = surfaceIdFromPath(pathname);
    if (!surfaceId) return;
    const { tabs, activeId, setActive, openSurface } = useWorkspaceTabsStore.getState();
    const explicitTabId = new URLSearchParams(search).get('tab');
    if (explicitTabId) {
      const exact = tabs.find((t) => t.id === explicitTabId && t.surfaceId === surfaceId);
      if (exact) {
        if (activeId !== exact.id) setActive(exact.id);
        return;
      }
    }
    const active = tabs.find((t) => t.id === activeId);
    if (active?.surfaceId === surfaceId) return;
    const existing = tabs.find((t) => t.surfaceId === surfaceId);
    if (existing) setActive(existing.id);
    else openSurface(surfaceId);
  }, [pathname, search]);
}

// Navigation hook used by the strip when the user clicks a tab. Pushes the
// legacy ingress path for the surface (deep links stay coherent); canonical
// `/w/...` is the forward-looking form.
export function useNavigateToTab() {
  const navigate = useNavigate();
  return useCallback(
    (surfaceId: string, tabId?: string) => {
      const path = legacyPathForSurface(surfaceId) ?? `/w/default/${surfaceId}`;
      void navigate({
        to: path,
        replace: true,
        search: (previous) => ({ ...previous, tab: tabId }),
      });
    },
    [navigate],
  );
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
