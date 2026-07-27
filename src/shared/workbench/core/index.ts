// Public boundary of the workbench kernel. After the surface-authority
// convergence the kernel's single load-bearing primitive is the scope tree
// (ScopeNode) — the app-root scope + child-first disposable teardown that the
// React host projects via WorkbenchRoot/appScope. The former contribution/
// command/context-key/intent/surface/layout classes were never wired into the
// runtime (the real command axis is KeybindingService; the real surface axis is
// the zustand tab store + SURFACE_RUNTIME), so they were removed rather than
// left as dead parallel authority.
export { ScopeNode, type Disposable } from './ScopeNode';
