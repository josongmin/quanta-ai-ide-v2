// Surface host (WB-301).
//
// Mounts a surface's view inside its own scope and crash boundary. `hidden` keeps
// the view mounted (kept-alive) and toggles visibility rather than remounting, per
// the lifecycle contract; a crash is isolated to this host and reported typed.
import { Suspense, type ReactNode } from 'react';
import type { ScopeIdentity } from '../contract';
import { isMounted, isVisible, type SurfaceState } from './lifecycle';
import { ScopeProvider } from './ScopeProvider';
import { CrashBoundary } from './CrashBoundary';

export function SurfaceHost({
  identity,
  state,
  children,
  fallback,
  loading = null,
}: {
  identity: ScopeIdentity;
  state: SurfaceState;
  children: ReactNode;
  fallback?: (message: string) => ReactNode;
  loading?: ReactNode;
}) {
  if (!isMounted(state)) return null; // registered/active/disposed => not in the tree

  return (
    <ScopeProvider identity={identity}>
      <div data-surface={identity.id} hidden={!isVisible(state)}>
        <CrashBoundary
          fallback={(crash) => (fallback ? fallback(crash.message) : <div role="alert">Surface failed: {crash.message}</div>)}
        >
          <Suspense fallback={loading}>{children}</Suspense>
        </CrashBoundary>
      </div>
    </ScopeProvider>
  );
}
