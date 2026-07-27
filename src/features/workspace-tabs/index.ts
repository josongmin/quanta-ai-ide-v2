// Public surface of the workspace-tabs feature. The app layer composes the
// surface catalog (view + icon) and injects it via SurfaceRuntimeProvider,
// keyed on surfaceId — no closed TabKind registry.

export { useWorkspaceTabsStore, useActiveTab, type WorkspaceTab } from './model/store';
export {
  SurfaceRuntimeProvider,
  useSurfaceRuntime,
  useSurfaceEntry,
  type SurfaceRuntimeEntry,
} from './model/RegistryContext';
export {
  FIRST_LAUNCH_SURFACE_IDS,
  SURFACE_IDS_ORDERED,
  surfaceIdFromPath,
  surfaceIdsByGroup,
  getSurfaceMeta,
  isKnownSurface,
  type SurfaceMeta,
  type SurfaceGroup,
} from '@shared/config/surfaces';

export { default as WorkspaceTabsStrip } from './ui/WorkspaceTabsStrip';
export { default as WorkspaceTabsHost } from './ui/WorkspaceTabsHost';
export { default as AddTabModal } from './ui/AddTabModal';
export { useTabVisibility, TabVisibilityProvider } from './ui/TabVisibilityContext';
