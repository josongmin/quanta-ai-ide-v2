// The single better-auth client — the one gateway to the accounts backend,
// mirroring how `shared/api/client.ts` is the one HTTP gateway.
//
// Cookie-based session auth: `credentials: 'include'` is required so the
// session cookie flows cross-origin (dev: localhost:5173 → :4000, same-site
// different-port → SameSite=Lax cookies are sent). The accounts side must list
// the FE origin in TRUSTED_ORIGINS (drives CORS + CSRF).
//
// Encapsulation: nothing outside `entities/session` (state/actions) and the
// app-layer guard/init should import this instance directly.

import { createAuthClient } from 'better-auth/react';
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import { env } from '@shared/config/env';

// NOTE: twoFactorClient's inferred type references zod's `v4/core`; under pnpm
// that path is only nameable because tsconfig maps `zod/*` to the hoisted copy
// (declaration emit / composite build would otherwise fail TS2742).
export const authClient = createAuthClient({
  // origin only — better-auth appends basePath ('/api/auth').
  baseURL: env.accountsUrl,
  basePath: '/api/auth',
  fetchOptions: { credentials: 'include' },
  // Mirrors the accounts server plugins (better-auth.ts). organizationClient
  // gives `authClient.organization.*` (members/invitations/teams/roles) plus
  // the reactive `useActiveOrganization`/`useListOrganizations` hooks.
  // twoFactorClient gives `authClient.twoFactor.*` (enable/verifyTotp/disable/
  // backup codes) and injects `twoFactorRedirect` into sign-in when a second
  // factor is required. apiKey/admin clients are added in their own phases.
  plugins: [
    organizationClient({ teams: { enabled: true } }),
    twoFactorClient(),
  ],
});
