// Public boundary of the workbench React host. This is the ONLY layer that
// imports React; contract and core stay host-neutral. The host projects the two
// primitives that are actually load-bearing at runtime: the app-scope dispose
// tree (WorkbenchRoot/appScope) and the keybinding dispatch authority
// (KeybindingService, driven by useShortcut / useGlobalShortcuts).
export {
  WorkbenchRoot,
  useWorkbench,
  useOptionalWorkbench,
  createWorkbenchSession,
  type WorkbenchSession,
} from './WorkbenchProvider';
export { KeybindingService, type Keybinding, type KeybindingRegistration } from './KeybindingService';
