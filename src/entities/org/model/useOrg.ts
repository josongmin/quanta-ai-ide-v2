// Reactive org detail by slug — the app-facing read model over better-auth's
// `getFullOrganization`. A minimal fetch-hook (loading/error/refetch) rather
// than the plugin's `useActiveOrganization`, because the org-stage addresses an
// org by its route slug without necessarily making it the session's active org,
// and mutations refetch explicitly via the returned `refetch`.
//
// Real-mode only: mounted solely on the `env.useRealAuth` branch of each page,
// so it always has a configured better-auth client to call.

import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useOrg(slug: string): OrgState {
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [isPending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  // First load shows the skeleton; a refetch (after a mutation) keeps the stale
  // rows in place instead of blanking the whole table — so search/scroll/expand
  // state and focus survive. Reset the skeleton only when the slug changes.
  const loadedSlug = useRef<string | null>(null);

  const refetch = useCallback(() => { setNonce((n) => n + 1); }, []);

  useEffect(() => {
    let active = true;
    const firstLoadForSlug = loadedSlug.current !== slug;
    /* eslint-disable react-hooks/set-state-in-effect -- skeleton reset before the slug/nonce fetch */
    if (firstLoadForSlug) {
      setPending(true);
      setDetail(null);
    }
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    void authClient.organization
      .getFullOrganization({ query: { organizationSlug: slug } })
      .then((res) => {
        if (!active) return;
        if (res.error || !res.data) {
          setError(messageForOrgError(res.error));
          setDetail(null);
        } else {
          setDetail(toOrgDetail(res.data));
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) { setPending(false); loadedSlug.current = slug; }
      });
    return () => { active = false; };
  }, [slug, nonce]);

  return { detail, isPending, error, refetch };
}
