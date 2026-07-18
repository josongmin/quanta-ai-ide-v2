import { describe, it, expect, vi, beforeEach } from 'vitest';

// entities/session personal-access-token action layer — 404-idempotent revoke,
// error mapping, defensive list. accountsApi mocked.
vi.mock('@shared/auth', () => ({
  accountsApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

import { accountsApi } from '@shared/auth';
import { listPersonalTokens, createPersonalToken, revokePersonalToken } from '../apiKeys';

const api = vi.mocked(accountsApi);
beforeEach(() => { vi.clearAllMocks(); });

describe('revokePersonalToken — 404 idempotent', () => {
  it('treats 404 as ok:true (already gone)', async () => {
    api.del.mockResolvedValue({ ok: false, error: { kind: 'http', status: 404, message: 'x' } });
    expect(await revokePersonalToken('k1')).toEqual({ ok: true });
  });
  it('surfaces a non-404 error', async () => {
    api.del.mockResolvedValue({ ok: false, error: { kind: 'http', status: 500, message: 'x' } });
    expect((await revokePersonalToken('k1')).ok).toBe(false);
  });
});

describe('createPersonalToken / listPersonalTokens', () => {
  it('returns the created token (with plaintext key) on success', async () => {
    const data = { id: 'k1', name: 'ci', prefix: 'sef', start: 'sef_ab', createdAt: 't', expiresAt: null, lastRequest: null, key: 'sef_secret' };
    api.post.mockResolvedValue({ ok: true, data });
    expect(await createPersonalToken({ name: 'ci' })).toEqual({ ok: true, data });
  });
  it('coerces a non-array token payload to []', async () => {
    api.get.mockResolvedValue({ ok: true, data: { tokens: null } });
    expect(await listPersonalTokens()).toEqual({ ok: true, data: [] });
  });
  it('surfaces a list error', async () => {
    api.get.mockResolvedValue({ ok: false, error: { kind: 'network', message: 'down' } });
    expect((await listPersonalTokens()).ok).toBe(false);
  });
});
