// org usage summary read model over accounts `GET /v1/usage/:orgId` (cookie-authed,
// billing.read). Mirrors the accounts `usageSummary` contract (packages/contracts/usage.ts).
// used/limit are null for unlimited metrics (storage_mb / enterprise) — not metered.

import { useAsyncResource } from '@shared/lib';
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
  const { data, isPending, error, refetch } = useAsyncResource<UsageSummary>(
    async () => {
      if (!orgId) return { ok: true, data: { period: '', metrics: [] } };
      const res = await accountsApi.get<UsageSummary>(`/v1/usage/${orgId}`);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: apiErrorMessage(res.error, 'usage') };
    },
    [orgId],
    orgId,
  );

  return { summary: data, isPending, error, refetch };
}
