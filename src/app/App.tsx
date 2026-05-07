import { RouterProvider } from '@tanstack/react-router';
import { AppProviders } from './providers';
import { router } from './router/router';

// Top-level entry. The router is the *content* — it owns the AppShell
// chrome via its root route — while AppProviders wraps everything that
// needs to live above the route tree (theme, prefs, overlay, etc.).

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
