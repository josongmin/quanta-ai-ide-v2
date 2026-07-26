import { RouterProvider } from '@tanstack/react-router';
import { SurfaceRuntimeProvider } from '@features/workspace-tabs';
import { AppProviders } from './providers';
import { AuthInit } from './providers/AuthInit';
import { router } from './router/router';
import { SURFACE_RUNTIME } from './router/surfaceRuntime';

// Top-level entry. The router is the *content* — it owns the AppShell
// chrome via its root route — while AppProviders wraps everything that
// needs to live above the route tree (theme, prefs, overlay, etc.).
// Tab registry composition stays in app; features read it via context.

export default function App() {
  return (
    <AppProviders>
      <AuthInit />
      <SurfaceRuntimeProvider registry={SURFACE_RUNTIME}>
        <RouterProvider router={router} />
      </SurfaceRuntimeProvider>
    </AppProviders>
  );
}
