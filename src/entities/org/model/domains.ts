// org 검증 도메인 read/mutate model — accounts /v1/orgs/:orgId/domains (cookie, sso 권한).
// mirrors the accounts `orgDomainRecord` contract. 소유증명(DNS TXT)은 백엔드가 검증.

import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

export type OrgDomainRecord = {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string;
  createdAt: string;
  verifiedAt: string | null;
};

// org가 도메인 루트에 게시해야 할 TXT 레코드 값(백엔드 lib/domain-verify VERIFICATION_PREFIX와 일치).
export function domainTxtRecord(token: string): string {
  return `p0-domain-verification=${token}`;
}

export async function listDomains(orgId: string): Promise<Result<OrgDomainRecord[]>> {
  const res = await accountsApi.get<{ domains: OrgDomainRecord[] }>(`/v1/orgs/${orgId}/domains`);
  return res.ok
    ? { ok: true, data: res.data.domains }
    : { ok: false, error: apiErrorMessage(res.error, 'domains') };
}

export async function addDomain(orgId: string, domain: string): Promise<Result<OrgDomainRecord>> {
  const res = await accountsApi.post<OrgDomainRecord>(`/v1/orgs/${orgId}/domains`, { domain });
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'domains') };
}

export async function verifyDomain(orgId: string, id: string): Promise<Result<OrgDomainRecord>> {
  const res = await accountsApi.post<OrgDomainRecord>(`/v1/orgs/${orgId}/domains/${id}/verify`);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'domains') };
}

export async function removeDomain(orgId: string, id: string): Promise<ActionResult> {
  const res = await accountsApi.del(`/v1/orgs/${orgId}/domains/${id}`);
  return res.ok ? { ok: true } : { ok: false, error: apiErrorMessage(res.error, 'domains') };
}
