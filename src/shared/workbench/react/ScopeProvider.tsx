// Scope projection into React (WB-303).
//
// Projects a kernel ScopeNode identity/active-state into the tree. A child scope
// is created under the parent (app scope by default) and disposed on unmount,
// child-first. Identity is stable across re-renders and only recreated if a prior
// StrictMode cleanup disposed it.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ScopeNode } from '../core';
import type { ScopeIdentity } from '../contract';
import { useWorkbench } from './WorkbenchProvider';

const ScopeContext = createContext<ScopeNode | null>(null);

export function ScopeProvider({ identity, children }: { identity: ScopeIdentity; children: ReactNode }) {
  const { appScope } = useWorkbench();
  const parent = useContext(ScopeContext) ?? appScope;

  const [scope, setScope] = useState<ScopeNode>(() => {
    const created = parent.createChild(identity);
    if (!created.ok) throw new Error(created.errors[0]?.message ?? 'cannot create scope');
    return created.value;
  });

  useEffect(() => {
    if (scope.lifecycle === 'disposed') {
      // StrictMode disposable recovery: creating a child scope registers it on the
      // parent (a side effect), so it must happen in the effect, not in render.
      const recreated = parent.createChild(identity);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      if (recreated.ok) setScope(recreated.value);
      return;
    }
    return () => {
      scope.dispose();
    };
    // identity is addressed by its stable id; a new object with the same id must
    // not churn the scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, parent, identity.id]);

  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

export function useWorkbenchScope(): ScopeNode {
  const { appScope } = useWorkbench();
  return useContext(ScopeContext) ?? appScope;
}

export { ScopeContext };
