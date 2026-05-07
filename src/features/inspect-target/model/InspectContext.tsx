import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';

// Inspect target = what the right-hand panel describes when no file is open.
// File stack is handled separately (Stage); when that stack is empty, the
// workspace/folder inspect target gets the prime real-estate instead.
export type InspectTarget =
  | { kind: 'workspace' }
  | { kind: 'folder'; path: string }
  | null;

type Ctx = {
  target: InspectTarget;
  inspectWorkspace: () => void;
  inspectFolder: (path: string) => void;
  clear: () => void;
};

const InspectContext = createContext<Ctx | null>(null);

export function InspectProvider({ children }: { children: ReactNode }) {
  // Default to the workspace overview so the right rail is never empty —
  // it shows repo-level signals (SE health, AI efficiency, deps) until the
  // user clicks into a folder or file.
  const [target, setTarget] = useState<InspectTarget>({ kind: 'workspace' });
  const inspectWorkspace = useCallback(() => { setTarget({ kind: 'workspace' }); }, []);
  const inspectFolder = useCallback((path: string) => { setTarget({ kind: 'folder', path }); }, []);
  const clear = useCallback(() => { setTarget(null); }, []);
  const value = useMemo<Ctx>(() => ({
    target,
    inspectWorkspace,
    inspectFolder,
    clear,
  }), [target, inspectWorkspace, inspectFolder, clear]);
  return <InspectContext.Provider value={value}>{children}</InspectContext.Provider>;
}

export function useInspect() {
  const ctx = useContext(InspectContext);
  if (!ctx) throw new Error('useInspect must be used inside InspectProvider');
  return ctx;
}
