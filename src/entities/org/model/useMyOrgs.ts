// Resolve the signed-in user's organization slug — used to make the app's
// org-scoped navigation (/org/$org/*) point at the real org instead of the
// demo's hard-coded "acme". Prefers the session's active org, falling back to
// the first org the user belongs to. Null while pending / when the user has no
// org yet (→ onboarding).

import { authClient } from '@shared/auth';
import { env } from '@shared/config/env';

export function useActiveOrgSlug(): string | null {
  // Mock mode (the standalone demo) has no accounts backend: calling the
  // better-auth org hooks would subscribe their nanostores and fire
  // `/api/auth/organization/{list,get-full-organization}` against the demo's
  // own origin (baseURL=''), 404ing on every mount. Short-circuit first.
  // `env.useRealAuth` is a build-time constant, so this branch never changes
  // across renders — hook order stays stable.
  if (!env.useRealAuth) return null;

  const active = authClient.useActiveOrganization();
  const list = authClient.useListOrganizations();

  const activeSlug = (active.data as { slug?: unknown } | null | undefined)?.slug;
  if (typeof activeSlug === 'string' && activeSlug.length > 0) return activeSlug;

  const first = Array.isArray(list.data)
    ? (list.data[0] as { slug?: unknown } | undefined)
    : undefined;
  return typeof first?.slug === 'string' && first.slug.length > 0 ? first.slug : null;
}
