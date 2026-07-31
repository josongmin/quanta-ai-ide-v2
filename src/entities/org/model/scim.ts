// Org SCIM 2.0 provisioning config over accounts /v1/scim/:orgId (cookie-authed,
// owner/admin RBAC; enable requires an Enterprise plan). The bearer token is
// returned ONLY on enable/rotate (shown once). The IdP then pushes users to
// <baseUrl>/Users with that token.
//
// NOTE: shapes mirror @p0/contracts scim; replace with codegen when wired.
import { z } from 'zod';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

export const ScimConfigSchema = z.object({
  orgId: z.string(),
  enabled: z.boolean(),
  baseUrl: z.string().nullable(),
  createdAt: z.string().nullable(),
});
export type ScimConfig = z.infer<typeof ScimConfigSchema>;

export const ScimTokenResponseSchema = ScimConfigSchema.extend({
  token: z.string(),
});
export type ScimTokenResponse = z.infer<typeof ScimTokenResponseSchema>;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

const PLAN_MSG = 'SCIM provisioning requires an Enterprise plan.';

export async function getScimConfig(orgId: string): Promise<Result<ScimConfig | null>> {
  // The backend returns null when SCIM isn't configured yet (mirrors SSO), so the
  // response schema is nullable and null maps to "not configured", not an error.
  const res = await accountsApi.get<ScimConfig | null>(`/v1/scim/${encodeURIComponent(orgId)}`, ScimConfigSchema.nullable());
  return res.ok ? { ok: true, data: res.data ?? null } : { ok: false, error: apiErrorMessage(res.error, 'SCIM') };
}

export async function enableScim(orgId: string): Promise<Result<ScimTokenResponse>> {
  const res = await accountsApi.post<ScimTokenResponse>(`/v1/scim/${encodeURIComponent(orgId)}/enable`, undefined, ScimTokenResponseSchema);
  return res.ok
    ? { ok: true, data: res.data }
    : { ok: false, error: res.error.kind === 'http' && res.error.status === 403 ? PLAN_MSG : apiErrorMessage(res.error, 'SCIM') };
}

export async function rotateScimToken(orgId: string): Promise<Result<ScimTokenResponse>> {
  const res = await accountsApi.post<ScimTokenResponse>(`/v1/scim/${encodeURIComponent(orgId)}/rotate`, undefined, ScimTokenResponseSchema);
  if (res.ok) return { ok: true, data: res.data };
  if (res.error.kind === 'http' && res.error.status === 403) return { ok: false, error: PLAN_MSG };
  if (res.error.kind === 'http' && res.error.status === 409) return { ok: false, error: 'Enable SCIM before rotating the token.' };
  return { ok: false, error: apiErrorMessage(res.error, 'SCIM') };
}

export async function disableScim(orgId: string): Promise<ActionResult> {
  const res = await accountsApi.post(`/v1/scim/${encodeURIComponent(orgId)}/disable`);
  return res.ok ? { ok: true } : { ok: false, error: apiErrorMessage(res.error, 'SCIM') };
}
