// org 검증 도메인 read/mutate model — accounts /v1/orgs/:orgId/domains (cookie, sso 권한).
// mirrors the accounts `orgDomainRecord` contract. 소유증명(DNS TXT)은 백엔드가 검증.

import { z } from 'zod';

import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

const OrgDomainRecordSchema = z.object({
  id: z.string(),
  domain: z.string(),
  verified: z.boolean(),
  autoJoin: z.boolean(),
  verificationToken: z.string(),
  createdAt: z.string().nullable(),
  verifiedAt: z.string().nullable(),
});

export type OrgDomainRecord = z.infer<typeof OrgDomainRecordSchema>;

const DomainListSchema = z.object({ domains: z.array(OrgDomainRecordSchema) });

// org가 도메인 루트에 게시해야 할 TXT 레코드 값(백엔드 lib/domain-verify VERIFICATION_PREFIX와 일치).
export function domainTxtRecord(token: string): string {
  return `p0-domain-verification=${token}`;
}

export async function listDomains(orgId: string): Promise<Result<OrgDomainRecord[]>> {
  const res = await accountsApi.get<{ domains: OrgDomainRecord[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/domains`, DomainListSchema);
  return res.ok
    ? { ok: true, data: res.data.domains }
    : { ok: false, error: apiErrorMessage(res.error, 'domains') };
}

export async function addDomain(orgId: string, domain: string): Promise<Result<OrgDomainRecord>> {
  const res = await accountsApi.post<OrgDomainRecord>(`/v1/orgs/${encodeURIComponent(orgId)}/domains`, { domain }, OrgDomainRecordSchema);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'domains') };
}

export async function verifyDomain(orgId: string, id: string): Promise<Result<OrgDomainRecord>> {
  const res = await accountsApi.post<OrgDomainRecord>(`/v1/orgs/${encodeURIComponent(orgId)}/domains/${encodeURIComponent(id)}/verify`, undefined, OrgDomainRecordSchema);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'domains') };
}

// auto-join 토글 — verified 도메인만 켤 수 있다(백엔드가 verified-only 강제, 422 반환).
// 실제 가입-시 auto-join은 플랫폼 ops 스위치(DOMAIN_AUTO_JOIN_ENABLED)로 게이트된다.
export async function setDomainAutoJoin(orgId: string, id: string, autoJoin: boolean): Promise<Result<OrgDomainRecord>> {
  const res = await accountsApi.patch<OrgDomainRecord>(
    `/v1/orgs/${encodeURIComponent(orgId)}/domains/${encodeURIComponent(id)}/auto-join`,
    { autoJoin },
    OrgDomainRecordSchema,
  );
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'domains') };
}

export async function removeDomain(orgId: string, id: string): Promise<ActionResult> {
  const res = await accountsApi.del(`/v1/orgs/${encodeURIComponent(orgId)}/domains/${encodeURIComponent(id)}`);
  return res.ok ? { ok: true } : { ok: false, error: apiErrorMessage(res.error, 'domains') };
}
