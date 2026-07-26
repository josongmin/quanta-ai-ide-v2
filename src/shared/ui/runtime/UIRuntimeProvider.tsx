import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { DialogService, type DialogSnapshot } from './DialogService';
import { LayerManager } from './LayerManager';
import { useOptionalWorkbench } from '@shared/workbench/react';
import type { ScopeIdentity } from '@shared/workbench';
import type { DialogCloseReason, UiOwnerRef } from './types';

// The command/keybinding authority is the workbench (P1-6) — the UI runtime owns
// only dialogs + layers now.
export type UIRuntime = {
  dialogs: DialogService;
  layers: LayerManager;
};

type UiScope = {
  owner: UiOwnerRef;
  activeRef: { current: boolean };
  commandPriority: number;
};

const RuntimeContext = createContext<UIRuntime | null>(null);
const ScopeContext = createContext<UiScope | null>(null);
const APP_OWNER: UiOwnerRef = { ownerId: 'app', scopeInstanceId: 'app' };

export function createUIRuntime(): UIRuntime {
  return {
    dialogs: new DialogService(),
    layers: new LayerManager(),
  };
}

export function UIRuntimeProvider({ children, runtime: suppliedRuntime }: { children: ReactNode; runtime?: UIRuntime }) {
  const [runtime] = useState(() => suppliedRuntime ?? createUIRuntime());
  const workbench = useOptionalWorkbench();
  const activeRef = useRef(true);
  const appScope = useMemo<UiScope>(() => ({ owner: APP_OWNER, activeRef, commandPriority: 0 }), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Layers (modal dismiss) intercept first; then command dispatch delegates
      // to the canonical workbench keybinding authority.
      if (runtime.layers.handleKeydown(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      if (runtime.layers.hasModalLayer()) return;
      if (workbench?.keybindings.dispatchKeydown(event) === true) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => { window.removeEventListener('keydown', onKeyDown, true); };
  }, [runtime, workbench]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const previous = root.inert;
    const sync = () => { root.inert = runtime.layers.hasModalLayer(); };
    sync();
    const unsubscribe = runtime.layers.subscribe(sync);
    return () => {
      unsubscribe();
      root.inert = previous;
    };
  }, [runtime]);

  return (
    <RuntimeContext.Provider value={runtime}>
      <ScopeContext.Provider value={appScope}>{children}</ScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

// A per-surface UI scope whose DISPOSE truth is the workbench ScopeNode (P1-7).
// The dialog/layer owner cleanup is registered as a disposable on a child
// ScopeNode, so surface teardown flows through the single kernel scope tree — no
// parallel active/dispose tree. Without a WorkbenchRoot (isolated shared-UI
// tests) it falls back to direct owner cleanup.
export function SurfaceScope({
  owner,
  active,
  commandPriority = 100,
  children,
}: {
  owner: UiOwnerRef;
  active: boolean;
  commandPriority?: number;
  children: ReactNode;
}) {
  const runtime = useUIRuntime();
  const workbench = useOptionalWorkbench();
  const activeRef = useRef(active);
  const scope = useMemo<UiScope>(() => ({ owner, activeRef, commandPriority }), [owner, commandPriority]);

  useLayoutEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const cleanup = (): void => {
      runtime.layers.disposeOwner(owner);
      runtime.dialogs.disposeOwner(owner);
    };
    if (!workbench) return cleanup; // no workbench (standalone tests) → direct cleanup
    const identity: ScopeIdentity = {
      id: owner.scopeInstanceId,
      kind: 'surface',
      owner: { owner: owner.ownerId, trust: 'core' },
    };
    const created = workbench.appScope.createChild(identity);
    if (!created.ok) return cleanup;
    const node = created.value;
    node.registerDisposable(cleanup);
    return () => {
      node.dispose();
    };
  }, [owner, runtime, workbench]);

  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

export function useUIRuntime(): UIRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('UIRuntimeProvider is missing above this subtree');
  return runtime;
}

export function useUiScope(): UiScope {
  const scope = useContext(ScopeContext);
  if (!scope) throw new Error('UIRuntimeProvider is missing above this subtree');
  return scope;
}

export function useDialogController<TPayload = unknown>(id: string) {
  const { dialogs } = useUIRuntime();
  const { owner } = useUiScope();
  const subscribe = useMemo(() => (listener: () => void) => dialogs.subscribe(id, listener), [dialogs, id]);
  const getSnapshot = useMemo(() => () => dialogs.getSnapshot<TPayload>(id), [dialogs, id]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => ({
    ...snapshot,
    show: (payload?: TPayload) => { dialogs.open(id, payload, owner); },
    close: (reason: DialogCloseReason = 'action') => { dialogs.close(id, reason); },
  }), [dialogs, id, owner, snapshot]);
}

export type { DialogSnapshot };
