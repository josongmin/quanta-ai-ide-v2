// Personal access tokens (PATs) over accounts /v1/tokens (cookie-authed). The
// apiKey better-auth CLIENT plugin isn't shipped in core, so — like billing/
// audit — we call the custom /v1 endpoints via accountsApi rather than a client
// plugin. The plaintext key is returned ONLY on create.
//
// NOTE: shapes mirror @p0/contracts api-keys; replace with codegen from
// <accountsUrl>/openapi.json when wired into CI.
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

export type ApiKeyRecord = {
  id: string;
  name: string | null;
  prefix: string | null;
  start: string | null;
  createdAt: string;
  expiresAt: string | null;
  lastRequest: string | null;
};
export type ApiKeyCreated = ApiKeyRecord & { key: string };

export type KeyResult<T> = { ok: true; data: T } | { ok: false; error: string };
export type KeyActionResult = { ok: true } | { ok: false; error: string };

export async function listPersonalTokens(): Promise<KeyResult<ApiKeyRecord[]>> {
  const res = await accountsApi.get<{ tokens: ApiKeyRecord[] }>('/v1/tokens');
  return res.ok
    ? { ok: true, data: Array.isArray(res.data.tokens) ? res.data.tokens : [] }
    : { ok: false, error: apiErrorMessage(res.error, 'tokens') };
}

export async function createPersonalToken(input: {
  name: string;
  expiresInDays?: number | null;
}): Promise<KeyResult<ApiKeyCreated>> {
  const res = await accountsApi.post<ApiKeyCreated>('/v1/tokens', input);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'tokens') };
}

export async function revokePersonalToken(keyId: string): Promise<KeyActionResult> {
  const res = await accountsApi.del(`/v1/tokens/${keyId}`);
  if (res.ok) return { ok: true };
  // Already gone → idempotent success (avoids a cryptic "HTTP 404" on a
  // duplicate/concurrent revoke).
  if (res.error.kind === 'http' && res.error.status === 404) return { ok: true };
  return { ok: false, error: apiErrorMessage(res.error, 'tokens') };
}
