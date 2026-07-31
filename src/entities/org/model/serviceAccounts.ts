// Org service accounts (machine API keys) over accounts /v1/service-accounts/:orgId
// (cookie-authed, requires member RBAC; create requires a Team+ plan). Org-scoped
// via the key's metadata.orgId. Plaintext key returned ONLY on create.
//
// NOTE: shapes mirror @p0/contracts api-keys; replace with codegen when wired.
import { z } from 'zod';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

const ServiceAccountRecordSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  prefix: z.string().nullable(),
  start: z.string().nullable(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
  lastRequest: z.string().nullable(),
  createdBy: z.string(),
});
export type ServiceAccountRecord = z.infer<typeof ServiceAccountRecordSchema>;

const ServiceAccountCreatedSchema = ServiceAccountRecordSchema.omit({ createdBy: true }).extend({
  key: z.string(),
});
export type ServiceAccountCreated = z.infer<typeof ServiceAccountCreatedSchema>;

const ListServiceAccountsSchema = z.object({
  accounts: z.array(ServiceAccountRecordSchema),
});

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

export async function listServiceAccounts(orgId: string): Promise<Result<ServiceAccountRecord[]>> {
  const res = await accountsApi.get<{ accounts: ServiceAccountRecord[] }>(`/v1/service-accounts/${encodeURIComponent(orgId)}`, ListServiceAccountsSchema);
  return res.ok
    ? { ok: true, data: Array.isArray(res.data.accounts) ? res.data.accounts : [] }
    : { ok: false, error: apiErrorMessage(res.error, 'service accounts') };
}

export async function createServiceAccount(
  orgId: string,
  input: { name: string; expiresInDays?: number | null },
): Promise<Result<ServiceAccountCreated>> {
  const res = await accountsApi.post<ServiceAccountCreated>(`/v1/service-accounts/${encodeURIComponent(orgId)}`, input, ServiceAccountCreatedSchema);
  return res.ok
    ? { ok: true, data: res.data }
    // 403 = plan gate; surface a helpful message.
    : { ok: false, error: res.error.kind === 'http' && res.error.status === 403
        ? 'Service accounts require a Team plan or higher.'
        : apiErrorMessage(res.error, 'service accounts') };
}

export async function revokeServiceAccount(orgId: string, keyId: string): Promise<ActionResult> {
  const res = await accountsApi.del(`/v1/service-accounts/${encodeURIComponent(orgId)}/${encodeURIComponent(keyId)}`);
  if (res.ok) return { ok: true };
  if (res.error.kind === 'http' && res.error.status === 404) return { ok: true }; // already gone
  return { ok: false, error: apiErrorMessage(res.error, 'service accounts') };
}
