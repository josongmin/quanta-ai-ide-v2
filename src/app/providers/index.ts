// Public API of the app provider layer: the composed `AppProviders` tree
// (theme + i18n + filter/etc.) and the `ErrorBoundary` wrapper used at boot.
export { AppProviders } from './AppProviders';
export { ErrorBoundary } from './ErrorBoundary';
// NOTE: AuthInit is intentionally NOT re-exported here. It imports the router
// singleton, and router.tsx imports this barrel (for ErrorBoundary) — routing
// AuthInit through the barrel would create a providers↔router import cycle.
// App.tsx imports it directly from './providers/AuthInit'.
