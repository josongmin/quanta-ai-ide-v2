// Public surface of the workspace-tabs feature. App composes the tab
// registry at the app layer and mounts WorkspaceTabsRegistryProvider.

export { useWorkspaceTabsStore, useActiveTab, type WorkspaceTab } from './model/store';
export {
  WorkspaceTabsRegistryProvider,
  useWorkspaceTabsRegistry,
  useTabKindDef,
  type TabKindDef,
} from './model/RegistryContext';
export {
  DEFAULT_TAB_KINDS,
  TAB_KINDS_ORDERED,
  resolveTabKindFromPath,
  getKindsByGroup,
  getTabMeta,
  isTabKind,
  type TabKind,
  type TabKindGroup,
  type TabMeta,
} from '@shared/config/workspaceTabs';

export { default as WorkspaceTabsStrip } from './ui/WorkspaceTabsStrip';
export { default as WorkspaceTabsHost } from './ui/WorkspaceTabsHost';
export { default as AddTabModal } from './ui/AddTabModal';
export { useTabVisibility, TabVisibilityProvider } from './ui/TabVisibilityContext';
