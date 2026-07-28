// Reactive org detail by slug — the app-facing read model over better-auth's
// `getFullOrganization`. A minimal fetch-hook (loading/error/refetch) rather
// than the plugin's `useActiveOrganization`, because the org-stage addresses an
// org by its route slug without necessarily making it the session's active org,
// and mutations refetch explicitly via the returned `refetch`.
//
// Real-mode only: mounted solely on the `env.useRealAuth` branch of each page,
// so it always has a configured better-auth client to call.

import { useAsyncResource } from '@shared/lib';
import { authClient } from '@shared/auth';
import { toOrgDetail } from './mappers';
import type { OrgDetail } from './types';
import { messageForOrgError } from '../lib/orgErrors';

type OrgState = {
  detail: OrgDetail | null;
  isPending: boolean;
  error: string | null;
  refetch: () => void;
};

// Reactive org detail by slug over better-auth's getFullOrganization. The
// skeleton-vs-keep-stale + active-guard semantics live in the shared
// useAsyncResource now; `slug` is the resetKey so a new org blanks the skeleton
// while a post-mutation refetch keeps the current rows in place.
export function useOrg(slug: string): OrgState {
  const { data, isPending, error, refetch } = useAsyncResource<OrgDetail>(
    async () => {
      const res = await authClient.organization.getFullOrganization({ query: { organizationSlug: slug } });
      if (res.error || !res.data) return { ok: false, error: messageForOrgError(res.error) };
      return { ok: true, data: toOrgDetail(res.data) };
    },
    [slug],
    slug,
  );
  return { detail: data, isPending, error, refetch };
}
