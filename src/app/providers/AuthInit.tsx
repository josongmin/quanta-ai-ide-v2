import { useEffect } from 'react';
import { setUnauthorizedHandler } from '@shared/api';
import { env } from '@shared/config/env';
import { router } from '../router/router';

// One-shot auth wiring, mounted once at boot. Renders nothing.
//   1. Registers the product-API 401 handler (the `shared/api` seam) → routes
//      to the session-expired page. Accounts auth itself is cookie-based; this
//      is for the future product API. Uses the router instance directly so it
//      needs no RouterProvider context.
//   2. Primes the better-auth session store so the root `beforeLoad` guard
//      reads a warm session (no per-navigation network wait on first load).
// No-op in mock mode.
export function AuthInit(): null {
  useEffect(() => {
    if (!env.useRealAuth) return;
    setUnauthorizedHandler(() => {
      void router.navigate({ to: '/auth/session-expired' as never });
    });
    // Dynamic import keeps better-auth out of the initial chunk (mock demo pays
    // nothing). Primes the session store so the route guard reads it warm.
    void import('@shared/auth').then(({ authClient }) => authClient.getSession());
  }, []);
  return null;
}
