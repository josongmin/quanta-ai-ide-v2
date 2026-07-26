// Public boundary of the workbench React host (WBT-04). This is the ONLY layer
// that imports React; contract and core stay host-neutral.
export {
  WorkbenchRoot,
  useWorkbench,
  useOptionalWorkbench,
  createWorkbenchSession,
  type WorkbenchSession,
} from './WorkbenchProvider';
export { KeybindingService, type Keybinding, type KeybindingRegistration } from './KeybindingService';
export { ScopeProvider, useWorkbenchScope } from './ScopeProvider';
export { useCommand, useContextKey } from './hooks';
export { CrashBoundary, type CrashState } from './CrashBoundary';
export { SurfaceHost } from './SurfaceHost';
export {
  SurfaceLifecycle,
  isMounted,
  isVisible,
  type SurfaceState,
  type SurfaceEvent,
} from './lifecycle';
