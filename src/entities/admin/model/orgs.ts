// Platform super-admin: org directory + plan override over accounts /v1/admin/*.
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

export type AdminOrg = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
};
export type AdminOrgPage = { orgs: AdminOrg[]; nextCursor: string | null };
export type AdminPlan = 'free' | 'team' | 'business' | 'enterprise';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

export async function listOrgs(opts: { search?: string; cursor?: string | null } = {}): Promise<Result<AdminOrgPage>> {
  const params = new URLSearchParams();
  if (opts.search?.trim()) params.set('search', opts.search.trim());
  if (opts.cursor) params.set('cursor', opts.cursor);
  const qs = params.toString();
  const res = await accountsApi.get<AdminOrgPage>(`/v1/admin/orgs${qs ? `?${qs}` : ''}`);
  return res.ok
    ? { ok: true, data: { orgs: Array.isArray(res.data.orgs) ? res.data.orgs : [], nextCursor: res.data.nextCursor ?? null } }
    : { ok: false, error: apiErrorMessage(res.error, 'organizations') };
}

export async function overridePlan(orgId: string, plan: AdminPlan, reason: string | null): Promise<ActionResult> {
  const res = await accountsApi.patch(`/v1/admin/orgs/${encodeURIComponent(orgId)}/plan`, { plan, reason });
  return res.ok ? { ok: true } : { ok: false, error: apiErrorMessage(res.error, 'plan override') };
}
