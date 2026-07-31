// Reactive billing status by org — read model over accounts
// `GET /v1/billing/:orgId` (cookie-authed, requires billing.read). Minimal
// fetch-hook mirroring entities/org's useOrg.

import { z } from 'zod';
import { useAsyncResource } from '@shared/lib';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';
import type { BillingStatus } from './types';

// Runtime mirror of the imported `BillingStatus` contract. `satisfies
// z.ZodType<BillingStatus>` keeps tsc enforcing that this schema matches the
// imported type (the type stays owned by ./types, so we don't move it here).
const BillingStatusSchema = z.object({
  orgId: z.string(),
  plan: z.enum(['free', 'team', 'business', 'enterprise']),
  status: z.enum(['none', 'trialing', 'active', 'past_due', 'canceled']),
  // ISO datetime or null when unsubscribed.
  currentPeriodEnd: z.string().nullable(),
}) satisfies z.ZodType<BillingStatus>;

type BillingState = {
  status: BillingStatus | null;
  isPending: boolean;
  error: string | null;
  refetch: () => void;
};

// The skeleton-vs-keep-stale + active-guard semantics live in the shared
// useAsyncResource now; `orgId` is the resetKey so a new org blanks the skeleton
// on first load while a refetch keeps the last-known status in place.
export function useBillingStatus(orgId: string): BillingState {
  const { data, isPending, error, refetch } = useAsyncResource<BillingStatus>(
    async () => {
      // No org yet (parent still resolving detail) — hold the skeleton, no
      // request and no error, matching the old `if (!orgId) return;` guard.
      if (!orgId) return new Promise<never>(() => { /* never resolves */ });
      const res = await accountsApi.get<BillingStatus>(`/v1/billing/${encodeURIComponent(orgId)}`, BillingStatusSchema);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: apiErrorMessage(res.error, 'billing') };
    },
    [orgId],
    orgId,
  );
  return { status: data, isPending, error, refetch };
}
