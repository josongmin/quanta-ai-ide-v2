// Org outbound webhooks over accounts /v1/webhooks/:orgId (cookie-authed, member
// RBAC; create requires Business+ plan). Delivers audit-spine events to customer
// endpoints with HMAC signing. Signing secret returned ONLY on create.
//
// NOTE: shapes mirror @p0/contracts webhooks; replace with codegen when wired.
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

export type WebhookEndpointRecord = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  enabled: boolean;
  createdAt: string;
};
export type WebhookEndpointCreated = WebhookEndpointRecord & { secret: string };
export type WebhookDeliveryRecord = {
  id: string;
  endpointId: string;
  event: string;
  status: 'pending' | 'sending' | 'delivered' | 'failed' | 'exhausted';
  attempts: number;
  responseStatus: number | null;
  createdAt: string;
  deliveredAt: string | null;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

export async function listWebhooks(orgId: string): Promise<Result<WebhookEndpointRecord[]>> {
  const res = await accountsApi.get<{ endpoints: WebhookEndpointRecord[] }>(`/v1/webhooks/${encodeURIComponent(orgId)}`);
  return res.ok
    ? { ok: true, data: Array.isArray(res.data.endpoints) ? res.data.endpoints : [] }
    : { ok: false, error: apiErrorMessage(res.error, 'webhooks') };
}

export async function createWebhook(
  orgId: string,
  input: { url: string; description?: string | null; events: string[] },
): Promise<Result<WebhookEndpointCreated>> {
  const res = await accountsApi.post<WebhookEndpointCreated>(`/v1/webhooks/${encodeURIComponent(orgId)}`, input);
  return res.ok
    ? { ok: true, data: res.data }
    : { ok: false, error: res.error.kind === 'http' && res.error.status === 403
        ? 'Webhooks require a Business plan or higher.'
        : apiErrorMessage(res.error, 'webhooks') };
}

export async function updateWebhook(
  orgId: string,
  id: string,
  patch: { enabled?: boolean; events?: string[]; description?: string | null },
): Promise<ActionResult> {
  const res = await accountsApi.patch(`/v1/webhooks/${encodeURIComponent(orgId)}/${encodeURIComponent(id)}`, patch);
  return res.ok ? { ok: true } : { ok: false, error: apiErrorMessage(res.error, 'webhooks') };
}

export async function deleteWebhook(orgId: string, id: string): Promise<ActionResult> {
  const res = await accountsApi.del(`/v1/webhooks/${encodeURIComponent(orgId)}/${encodeURIComponent(id)}`);
  if (res.ok) return { ok: true };
  if (res.error.kind === 'http' && res.error.status === 404) return { ok: true }; // already gone
  return { ok: false, error: apiErrorMessage(res.error, 'webhooks') };
}

export async function listDeliveries(orgId: string): Promise<Result<WebhookDeliveryRecord[]>> {
  const res = await accountsApi.get<{ deliveries: WebhookDeliveryRecord[] }>(`/v1/webhooks/${encodeURIComponent(orgId)}/deliveries`);
  return res.ok
    ? { ok: true, data: Array.isArray(res.data.deliveries) ? res.data.deliveries : [] }
    : { ok: false, error: apiErrorMessage(res.error, 'webhook deliveries') };
}

export async function replayDelivery(orgId: string, deliveryId: string): Promise<ActionResult> {
  const res = await accountsApi.post(`/v1/webhooks/${encodeURIComponent(orgId)}/deliveries/${encodeURIComponent(deliveryId)}/replay`);
  return res.ok ? { ok: true } : { ok: false, error: apiErrorMessage(res.error, 'webhook deliveries') };
}
