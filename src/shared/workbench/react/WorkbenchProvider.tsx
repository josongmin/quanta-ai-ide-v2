// Workbench composition root (WB-301/304).
//
// Creates the canonical kernel session (app-root ScopeNode + registry + command +
// context-key + intent) and projects it into React. On unmount the app scope is
// disposed, cascading child-first teardown. StrictMode's mount/unmount/mount is
// handled by recreating the session if a prior cleanup disposed it, so there is
// no resource leak and no use of a disposed scope after settle.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  ScopeNode,
  ContributionRegistry,
  CommandService,
  ContextKeyService,
  IntentBus,
  type BusLimits,
} from '../core';
import type { ScopeIdentity } from '../contract';

export type WorkbenchSession = {
  readonly appScope: ScopeNode;
  readonly registry: ContributionRegistry;
  readonly commands: CommandService;
  readonly contextKeys: ContextKeyService;
  readonly intents: IntentBus;
};

const APP_SCOPE: ScopeIdentity = { id: 'core.app', kind: 'root', owner: { owner: 'core', trust: 'core' } };
const DEFAULT_BUS_LIMITS: BusLimits = { maxCount: 256, maxBytes: 1 << 20, ttlMs: 30_000 };

export function createWorkbenchSession(): WorkbenchSession {
  return {
    appScope: new ScopeNode(APP_SCOPE),
    registry: new ContributionRegistry(),
    commands: new CommandService(),
    contextKeys: new ContextKeyService(),
    intents: new IntentBus(DEFAULT_BUS_LIMITS),
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

export { WorkbenchContext };
