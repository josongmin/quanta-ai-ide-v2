import { describe, it, expect, vi, beforeEach } from 'vitest';

// entities/org service-accounts action layer — 403→Team-plan message,
// 404-idempotent revoke, error mapping. accountsApi mocked.
vi.mock('@shared/auth', () => ({
  accountsApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

import { accountsApi } from '@shared/auth';
import { listServiceAccounts, createServiceAccount, revokeServiceAccount } from '../serviceAccounts';

const api = vi.mocked(accountsApi);
beforeEach(() => { vi.clearAllMocks(); });

describe('createServiceAccount', () => {
  it('surfaces a 403 as the Team-plan message', async () => {
    api.post.mockResolvedValue({ ok: false, error: { kind: 'http', status: 403, message: 'x' } });
    const res = await createServiceAccount('org1', { name: 'ci', expiresInDays: null });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Team plan/i);
  });
  it('returns the created key on success', async () => {
    const data = { id: 's1', name: 'ci', key: 'svc_x', prefix: 'svc', start: 'svc_ab', createdAt: 't', createdBy: 'u1', expiresAt: null };
    api.post.mockResolvedValue({ ok: true, data });
    expect(await createServiceAccount('org1', { name: 'ci', expiresInDays: null })).toEqual({ ok: true, data });
  });
});

describe('revokeServiceAccount — 404 idempotent', () => {
  it('treats 404 as ok:true', async () => {
    api.del.mockResolvedValue({ ok: false, error: { kind: 'http', status: 404, message: 'x' } });
    expect(await revokeServiceAccount('org1', 's1')).toEqual({ ok: true });
  });
  it('surfaces a non-404 error', async () => {
    api.del.mockResolvedValue({ ok: false, error: { kind: 'unauthorized', status: 401, message: 'x' } });
    expect((await revokeServiceAccount('org1', 's1')).ok).toBe(false);
  });
});

describe('listServiceAccounts', () => {
  it('coerces a non-array payload to []', async () => {
    api.get.mockResolvedValue({ ok: true, data: { accounts: undefined } });
    expect(await listServiceAccounts('org1')).toEqual({ ok: true, data: [] });
  });
});
