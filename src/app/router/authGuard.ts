// Pure auth-redirect decision for the root `beforeLoad` guard. No router/React
// deps → unit-testable in isolation. In mock mode there are no guards (the demo
// browses freely, exactly as today); guards only apply when real auth is wired.

// Surfaces reachable WITHOUT a session even in real mode: the auth flow itself
// plus public marketing / legal / status / error-preview pages. Everything
// else (app tabs, /me, /org, /onboarding, /_admin, /developers) needs a session.
const PUBLIC_EXACT = new Set<string>([
  '/pricing', '/changelog', '/help', '/status', '/trust', '/security',
  '/support', '/contact-sales', '/feedback', '/whats-new', '/roadmap',
  '/accessibility', '/maintenance', '/offline', '/integrations',
]);
const PUBLIC_PREFIXES = ['/auth', '/legal/', '/integrations/', '/_errors/'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export type AuthRedirect = { to: string; search?: { redirect: string } } | null;

/**
 * Decide whether a navigation should be redirected for auth reasons.
 * - mock mode → never redirect (free browsing).
 * - authed on an /auth/* page (except session-expired) → bounce to the app.
 * - unauthenticated on a protected page → send to login, remembering the target.
 */
export function decideAuthRedirect(input: {
  authed: boolean;
  pathname: string;
  useRealAuth: boolean;
}): AuthRedirect {
  if (!input.useRealAuth) return null;

  const isAuthRoute = input.pathname.startsWith('/auth');

  if (
    input.authed &&
    isAuthRoute &&
    !input.pathname.startsWith('/auth/session-expired')
  ) {
    return { to: '/intelligence' };
  }

  if (!input.authed && !isPublicPath(input.pathname)) {
    return { to: '/auth/login', search: { redirect: input.pathname } };
  }

  return null;
}
