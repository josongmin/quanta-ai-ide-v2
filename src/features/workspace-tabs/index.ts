// Public surface of the workspace-tabs feature. AppShell consumes the
// strip; the router consumes the host (one host instance per renderable
// route). The store is exported for the control palette and other
// places that want to drive tab state programmatically.

export { useWorkspaceTabsStore, useActiveTab, type WorkspaceTab } from './model/store';
export {
  TAB_REGISTRY,
  TAB_KINDS_ORDERED,
  DEFAULT_TAB_KINDS,
  resolveTabKindFromPath,
  getKindDef,
  getKindsByGroup,
  type TabKind,
  type TabKindDef,
} from '@app/router/workspaceTabsRegistry';

export { default as WorkspaceTabsStrip } from './ui/WorkspaceTabsStrip';
export { default as WorkspaceTabsHost } from './ui/WorkspaceTabsHost';
export { default as AddTabModal } from './ui/AddTabModal';
export { useTabVisibility, TabVisibilityProvider } from './ui/TabVisibilityContext';
