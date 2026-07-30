// Billing mutations — Stripe checkout + customer portal over accounts
// (cookie-authed, require billing.manage). Both return a redirect URL the
// caller sends the browser to.

import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';
import type { BillingCycle, CheckoutPlan } from './types';

export type UrlResult = { ok: true; url: string } | { ok: false; error: string };

/** Create a Stripe Checkout session for a paid plan. */
export async function startCheckout(
  orgId: string,
  input: { plan: CheckoutPlan; cycle: BillingCycle },
): Promise<UrlResult> {
  const res = await accountsApi.post<{ url: string }>(`/v1/billing/${encodeURIComponent(orgId)}/checkout`, input);
  return res.ok ? { ok: true, url: res.data.url } : { ok: false, error: apiErrorMessage(res.error, 'billing') };
}

/** Open the Stripe customer portal (manage payment method, invoices, cancel). */
export async function openPortal(orgId: string): Promise<UrlResult> {
  const res = await accountsApi.post<{ url: string }>(`/v1/billing/${encodeURIComponent(orgId)}/portal`);
  return res.ok ? { ok: true, url: res.data.url } : { ok: false, error: apiErrorMessage(res.error, 'billing') };
}
