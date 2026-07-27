// Workbench composition root.
//
// Creates the canonical session and projects it into React. The session holds
// the two primitives that are actually load-bearing at runtime:
//   - appScope: the app-root ScopeNode. On unmount it disposes, cascading
//     child-first teardown; per-surface child scopes are created off it by
//     SurfaceScope (shared/ui/runtime).
//   - keybindings: the single keybinding-dispatch authority, fed by
//     useShortcut / useGlobalShortcuts and drained by the UI runtime keydown.
// StrictMode's mount/unmount/mount is handled by recreating the session if a
// prior cleanup disposed it, so there is no resource leak and no use of a
// disposed scope after settle.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ScopeNode } from '../core';
import type { ScopeIdentity } from '../contract';
import { KeybindingService } from './KeybindingService';

export type WorkbenchSession = {
  readonly appScope: ScopeNode;
  readonly keybindings: KeybindingService;
};

const APP_SCOPE: ScopeIdentity = { id: 'core.app', kind: 'root', owner: { owner: 'core', trust: 'core' } };

export function createWorkbenchSession(): WorkbenchSession {
  return {
    appScope: new ScopeNode(APP_SCOPE),
    keybindings: new KeybindingService(),
  };
}

const WorkbenchContext = createContext<WorkbenchSession | null>(null);

export function WorkbenchRoot({ children, session: supplied }: { children: ReactNode; session?: WorkbenchSession }) {
  const [session, setSession] = useState<WorkbenchSession>(() => supplied ?? createWorkbenchSession());

  useEffect(() => {
    // A supplied session is owned by the caller — never disposed or recreated here.
    if (supplied !== undefined) return;
    // If a StrictMode cleanup disposed the internal session, recreate a fresh one
    // and re-render with it; otherwise own its teardown. Recreation is a real
    // side effect (a new app ScopeNode), so it must live in the effect, not render.
    if (session.appScope.lifecycle === 'disposed') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- StrictMode disposable recovery; recreation is side-effectful and cannot run in render
      setSession(createWorkbenchSession());
      return;
    }
    return () => {
      session.appScope.dispose();
    };
  }, [session, supplied]);

  return <WorkbenchContext.Provider value={session}>{children}</WorkbenchContext.Provider>;
}

export function useWorkbench(): WorkbenchSession {
  const session = useContext(WorkbenchContext);
  if (session === null) throw new Error('WorkbenchRoot is missing above this subtree');
  return session;
}

// Null when no WorkbenchRoot is above (e.g. isolated shared-UI tests). Lets the
// UI runtime delegate command dispatch to the workbench only when present.
export function useOptionalWorkbench(): WorkbenchSession | null {
  return useContext(WorkbenchContext);
}

export { WorkbenchContext };
