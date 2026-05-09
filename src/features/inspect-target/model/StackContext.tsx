import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';

// Unified inspect stack: a single tab strip that holds files, folders, and
// the workspace summary. Click sources (canvas, folder tree, sidebar) all
// push into the same stack so the user has one ordered history.
export type StackItem =
  | { kind: 'workspace' }
  | { kind: 'folder'; path: string }
  | { kind: 'file'; id: number };

export function stackKey(item: StackItem): string {
  if (item.kind === 'workspace') return 'workspace';
  if (item.kind === 'folder') return `folder:${item.path}`;
  return `file:${item.id}`;
}

type Ctx = {
  items: StackItem[];
  activeKey: string | null;
  open: (item: StackItem) => void;
  activate: (key: string) => void;
  close: (key: string) => void;
  closeAll: () => void;
};

const StackContext = createContext<Ctx | null>(null);

export function StackProvider({ children }: { children: ReactNode }) {
  // Workspace tab is always present so the right rail is never empty.
  const [items, setItems] = useState<StackItem[]>([{ kind: 'workspace' }]);
  const [activeKey, setActiveKey] = useState<string | null>('workspace');

  // Replace-mode: clicking anywhere (canvas dot, folder tree row, etc.)
  // *replaces* the currently-open file/folder rather than pushing a new
  // tab. The workspace summary tab stays anchored as the resting state
  // so the right rail is never empty. The list is therefore at most two
  // entries: [workspace, currentFocus].
  const open = useCallback((item: StackItem) => {
    const key = stackKey(item);
    setItems((cur) => {
      // Already-active item — no-op so we don't churn the rendered key.
      if (cur.some((x) => stackKey(x) === key)) return cur;
      // Workspace click → just activate the workspace, no extra entry.
      if (item.kind === 'workspace') return cur;
      // file / folder click → drop the prior file/folder, append the new one.
      const without = cur.filter((x) => x.kind === 'workspace');
      return [...without, item];
    });
    setActiveKey(key);
  }, []);

  const activate = useCallback((key: string) => { setActiveKey(key); }, []);

  const close = useCallback((key: string) => {
    setItems((cur) => {
      const next = cur.filter((x) => stackKey(x) !== key);
      if (next.length === 0) {
        // Never go fully empty — bring workspace back as the resting state.
        setActiveKey('workspace');
        return [{ kind: 'workspace' }];
      }
      setActiveKey((curActive) => (key === curActive ? stackKey(next[next.length - 1]) : curActive));
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setItems([{ kind: 'workspace' }]);
    setActiveKey('workspace');
  }, []);

  const value = useMemo<Ctx>(
    () => ({ items, activeKey, open, activate, close, closeAll }),
    [items, activeKey, open, activate, close, closeAll],
  );

  return (
    <StackContext.Provider value={value}>
      {children}
    </StackContext.Provider>
  );
}

export function useStack() {
  const ctx = useContext(StackContext);
  if (!ctx) throw new Error('useStack must be used inside StackProvider');
  return ctx;
}
