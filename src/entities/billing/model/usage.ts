// org usage summary read model over accounts `GET /v1/usage/:orgId` (cookie-authed,
// billing.read). Mirrors the accounts `usageSummary` contract (packages/contracts/usage.ts).
// used/limit are null for unlimited metrics (storage_mb / enterprise) — not metered.

import { z } from 'zod';

import { useAsyncResource } from '@shared/lib';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

const UsageMetricIdSchema = z.enum(['ai_tokens', 'scans', 'storage_mb']);
export type UsageMetricId = z.infer<typeof UsageMetricIdSchema>;

const UsageMetricSummarySchema = z.object({
  metric: UsageMetricIdSchema,
  used: z.number().nullable(),
  limit: z.number().nullable(),
});
export type UsageMetricSummary = z.infer<typeof UsageMetricSummarySchema>;

const UsageSummarySchema = z.object({
  period: z.string(),
  metrics: z.array(UsageMetricSummarySchema),
});
export type UsageSummary = z.infer<typeof UsageSummarySchema>;

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
      const res = await accountsApi.get<UsageSummary>(
        `/v1/usage/${encodeURIComponent(orgId)}`,
        UsageSummarySchema,
      );
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: apiErrorMessage(res.error, 'usage') };
    },
    [orgId],
    orgId,
  );

  return { summary: data, isPending, error, refetch };
}
