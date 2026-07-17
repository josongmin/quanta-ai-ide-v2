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
import { organizationClient } from 'better-auth/client/plugins';
import { env } from '@shared/config/env';

export const authClient = createAuthClient({
  // origin only — better-auth appends basePath ('/api/auth').
  baseURL: env.accountsUrl,
  basePath: '/api/auth',
  fetchOptions: { credentials: 'include' },
  // Mirrors the accounts server plugins (better-auth.ts). organizationClient
  // gives `authClient.organization.*` (members/invitations/teams/roles) plus
  // the reactive `useActiveOrganization`/`useListOrganizations` hooks — so the
  // org-admin UI needs no hand-rolled CRUD layer. twoFactor/apiKey/admin
  // clients are added in their own phases (MFA / PAT / backoffice) to keep the
  // async auth chunk minimal and every capability justified by a consumer.
  plugins: [organizationClient({ teams: { enabled: true } })],
});
