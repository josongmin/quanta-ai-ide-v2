// Reactive billing status by org — read model over accounts
// `GET /v1/billing/:orgId` (cookie-authed, requires billing.read). Minimal
// fetch-hook mirroring entities/org's useOrg.

import { useCallback, useEffect, useRef, useState } from 'react';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';
import type { BillingStatus } from './types';

type BillingState = {
  status: BillingStatus | null;
  isPending: boolean;
  error: string | null;
  refetch: () => void;
};

export function useBillingStatus(orgId: string): BillingState {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [isPending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  // Skeleton on first load per org; a refetch keeps the last-known status.
  const loadedOrg = useRef<string | null>(null);

  const refetch = useCallback(() => { setNonce((n) => n + 1); }, []);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    /* eslint-disable react-hooks/set-state-in-effect -- skeleton reset before the orgId/nonce fetch */
    if (loadedOrg.current !== orgId) {
      setPending(true);
      setStatus(null);
    }
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    void accountsApi.get<BillingStatus>(`/v1/billing/${orgId}`).then((res) => {
      if (!active) return;
      if (res.ok) setStatus(res.data);
      else setError(apiErrorMessage(res.error, 'billing'));
    }).finally(() => { if (active) { setPending(false); loadedOrg.current = orgId; } });
    return () => { active = false; };
  }, [orgId, nonce]);

  return { status, isPending, error, refetch };
}
