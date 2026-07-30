// Org SSO (OIDC) connection over accounts /v1/sso/:orgId (cookie-authed, owner/
// admin RBAC; requires an Enterprise plan). The clientSecret is write-only —
// sent on register/update, never returned (the record exposes `hasSecret` only).
// Users whose email domain matches route to this org's IdP at login.
//
// NOTE: shapes mirror @p0/contracts sso; replace with codegen when wired.
import { accountsApi } from '@shared/auth';
import { apiErrorMessage, type ApiError } from '@shared/api';

export type SsoConnection = {
  orgId: string;
  domain: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
  clientId: string;
  hasSecret: boolean;
  enabled: boolean;
  // Domain ownership proof (DNS TXT). Logins route to the IdP only when verified.
  verified: boolean;
  // The TXT value the org must publish (not a secret) — shown to owners/admins.
  verificationToken: string;
  createdAt: string | null;
};
export type SsoVerifyResult = { verified: boolean; record: SsoConnection };
export type SsoRegisterInput = {
  domain: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
  clientId: string;
  clientSecret: string;
};
export type SsoUpdateInput = Partial<SsoRegisterInput> & { enabled?: boolean };

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

const PLAN_MSG = 'SSO requires an Enterprise plan.';
const DOMAIN_MSG = 'That domain is already claimed by another organization.';

const PUBLIC_MSG = "Public email providers (gmail, outlook, …) can't be used for SSO — use your company domain.";

function connError(res: { error: ApiError }, fallback: string): string {
  if (res.error.kind === 'http' && res.error.status === 403) return PLAN_MSG;
  if (res.error.kind === 'http' && res.error.status === 409) return DOMAIN_MSG;
  if (res.error.kind === 'http' && res.error.status === 400) return PUBLIC_MSG;
  return apiErrorMessage(res.error, fallback);
}

export async function getSsoConnection(orgId: string): Promise<Result<SsoConnection | null>> {
  const res = await accountsApi.get<SsoConnection | null>(`/v1/sso/${encodeURIComponent(orgId)}`);
  return res.ok ? { ok: true, data: res.data ?? null } : { ok: false, error: apiErrorMessage(res.error, 'SSO') };
}

export async function registerSso(orgId: string, input: SsoRegisterInput): Promise<Result<SsoConnection>> {
  const res = await accountsApi.post<SsoConnection>(`/v1/sso/${encodeURIComponent(orgId)}`, input);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: connError(res, 'SSO') };
}

export async function updateSso(orgId: string, patch: SsoUpdateInput): Promise<Result<SsoConnection>> {
  const res = await accountsApi.patch<SsoConnection>(`/v1/sso/${encodeURIComponent(orgId)}`, patch);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: connError(res, 'SSO') };
}

// Login-time (pre-auth, public): does this email's domain use SSO? Returns the
// authorize entry point to redirect the browser to (the server generates
// state/PKCE/nonce there, then 302s to the IdP). { sso:false } → fall back to password.
export async function resolveSso(email: string): Promise<{ sso: boolean; authorizationUrl: string | null }> {
  const res = await accountsApi.get<{ sso: boolean; authorizationUrl: string | null }>(
    `/v1/sso/resolve?email=${encodeURIComponent(email)}`,
  );
  return res.ok && res.data ? res.data : { sso: false, authorizationUrl: null };
}

// Trigger a DNS TXT ownership check. Idempotent: returns the latest record with
// verified true/false. verified:false means "publish the TXT and retry".
export async function verifySso(orgId: string): Promise<Result<SsoVerifyResult>> {
  const res = await accountsApi.post<SsoVerifyResult>(`/v1/sso/${encodeURIComponent(orgId)}/verify`, {});
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'SSO') };
}

export async function deleteSso(orgId: string): Promise<ActionResult> {
  const res = await accountsApi.del(`/v1/sso/${encodeURIComponent(orgId)}`);
  if (res.ok) return { ok: true };
  if (res.error.kind === 'http' && res.error.status === 404) return { ok: true }; // already gone
  return { ok: false, error: apiErrorMessage(res.error, 'SSO') };
}
