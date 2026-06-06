import { RouterProvider } from '@tanstack/react-router';
import { WorkspaceTabsRegistryProvider } from '@features/workspace-tabs';
import { AppProviders } from './providers';
import { router } from './router/router';
import { TAB_REGISTRY } from './router/workspaceTabsRegistry';

// Top-level entry. The router is the *content* — it owns the AppShell
// chrome via its root route — while AppProviders wraps everything that
// needs to live above the route tree (theme, prefs, overlay, etc.).
// Tab registry composition stays in app; features read it via context.

export default function App() {
  return (
    <AppProviders>
      <WorkspaceTabsRegistryProvider registry={TAB_REGISTRY}>
        <RouterProvider router={router} />
      </WorkspaceTabsRegistryProvider>
    </AppProviders>
  );
}
