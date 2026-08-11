// Platform super-admin: domain force-release over accounts /v1/admin/domains/*.
// Frees a domain squatted by a defunct org across both registries (org-domain
// claim + SSO claim) — the only path to reclaim SSO for that domain. Idempotent
// server-side: a domain with no claims still returns 200 with both fields null.
import { z } from 'zod';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

const ReleaseDomainSchema = z.object({
  orgDomainReleased: z.string().nullable(),
  ssoReleased: z.string().nullable(),
});
export type ReleaseDomainResult = z.infer<typeof ReleaseDomainSchema>;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function releaseDomain(domain: string): Promise<Result<ReleaseDomainResult>> {
  const res = await accountsApi.post<ReleaseDomainResult>(
    `/v1/admin/domains/${encodeURIComponent(domain)}/release`,
    undefined,
    ReleaseDomainSchema,
  );
  return res.ok
    ? { ok: true, data: res.data }
    : { ok: false, error: apiErrorMessage(res.error, 'domain release') };
}
