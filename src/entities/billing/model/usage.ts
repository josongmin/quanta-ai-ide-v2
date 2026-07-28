// org usage summary read model over accounts `GET /v1/usage/:orgId` (cookie-authed,
// billing.read). Mirrors the accounts `usageSummary` contract (packages/contracts/usage.ts).
// used/limit are null for unlimited metrics (storage_mb / enterprise) — not metered.

import { useCallback, useEffect, useRef, useState } from 'react';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

export type UsageMetricId = 'ai_tokens' | 'scans' | 'storage_mb';

export type UsageMetricSummary = {
  metric: UsageMetricId;
  used: number | null;
  limit: number | null;
};

export type UsageSummary = {
  period: string;
  metrics: UsageMetricSummary[];
};

type UsageState = {
  summary: UsageSummary | null;
  isPending: boolean;
  error: string | null;
  refetch: () => void;
};

export function useUsageSummary(orgId: string): UsageState {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [isPending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const loadedOrg = useRef<string | null>(null);

  const refetch = useCallback(() => { setNonce((n) => n + 1); }, []);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    /* eslint-disable react-hooks/set-state-in-effect -- skeleton reset before the orgId/nonce fetch */
    if (loadedOrg.current !== orgId) {
      setPending(true);
      setSummary(null);
    }
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    void accountsApi.get<UsageSummary>(`/v1/usage/${orgId}`).then((res) => {
      if (!active) return;
      if (res.ok) setSummary(res.data);
      else setError(apiErrorMessage(res.error, 'usage'));
    }).finally(() => { if (active) { setPending(false); loadedOrg.current = orgId; } });
    return () => { active = false; };
  }, [orgId, nonce]);

  return { summary, isPending, error, refetch };
}
