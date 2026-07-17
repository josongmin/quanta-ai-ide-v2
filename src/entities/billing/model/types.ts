// Normalized billing shapes — mirrors the accounts `OrgBillingStatus` contract
// (packages/contracts/billing.ts). NOTE: the wire shape is also published at
// `<accountsUrl>/openapi.json`; replace with codegen once the server is
// reachable in the build.

import type { PlanId } from '@entities/plan';

export type { PlanId };

export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
export type BillingCycle = 'monthly' | 'annual';

/** Plans eligible for self-serve checkout (free = downgrade, enterprise = sales). */
export type CheckoutPlan = 'team' | 'business';

export type BillingStatus = {
  orgId: string;
  plan: PlanId;
  status: SubscriptionStatus;
  /** ISO datetime the current period ends (renewal), or null when unsubscribed. */
  currentPeriodEnd: string | null;
};
