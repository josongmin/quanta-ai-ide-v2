import { describe, it, expect, vi, beforeEach } from 'vitest';

// entities/org SSO action layer — 403→Enterprise, 409→domain-taken messages,
// 404-idempotent delete, null-connection read. accountsApi mocked.
vi.mock('@shared/auth', () => ({
  accountsApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

import { accountsApi } from '@shared/auth';
import { getSsoConnection, registerSso, updateSso, verifySso, deleteSso } from '../sso';

const api = vi.mocked(accountsApi);
beforeEach(() => { vi.clearAllMocks(); });

const REC = { orgId: 'o1', domain: 'acme.com', issuer: 'https://i', authorizationEndpoint: 'https://a', clientId: 'c', hasSecret: true, enabled: true, verified: false, verificationToken: 'tok123', createdAt: 't' };

describe('getSsoConnection', () => {
  it('returns null when not configured', async () => {
    api.get.mockResolvedValue({ ok: true, data: null });
    expect(await getSsoConnection('o1')).toEqual({ ok: true, data: null });
  });
  it('returns the masked record', async () => {
    api.get.mockResolvedValue({ ok: true, data: REC });
    expect(await getSsoConnection('o1')).toEqual({ ok: true, data: REC });
  });
});

describe('verifySso', () => {
  it('returns the verify result (verified true/false)', async () => {
    api.post.mockResolvedValue({ ok: true, data: { verified: true, record: { ...REC, verified: true } } });
    const res = await verifySso('o1');
    expect(res).toEqual({ ok: true, data: { verified: true, record: { ...REC, verified: true } } });
    expect(api.post).toHaveBeenCalledWith('/v1/sso/o1/verify', {});
  });
});

describe('registerSso', () => {
  it('403 → Enterprise-plan message', async () => {
    api.post.mockResolvedValue({ ok: false, error: { kind: 'http', status: 403, message: 'x' } });
    const res = await registerSso('o1', { domain: 'acme.com', issuer: 'https://i', authorizationEndpoint: 'https://a', clientId: 'c', clientSecret: 's' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Enterprise plan/i);
  });
  it('409 → domain-taken message', async () => {
    api.post.mockResolvedValue({ ok: false, error: { kind: 'http', status: 409, message: 'x' } });
    const res = await registerSso('o1', { domain: 'acme.com', issuer: 'https://i', authorizationEndpoint: 'https://a', clientId: 'c', clientSecret: 's' });
    expect(!res.ok && /already claimed/i.test(res.error)).toBe(true);
  });
});

describe('updateSso / deleteSso', () => {
  it('update returns the updated record', async () => {
    const data = { orgId: 'o1', domain: 'acme.com', issuer: 'https://i2', authorizationEndpoint: 'https://a', clientId: 'c', hasSecret: true, enabled: true, createdAt: 't' };
    api.patch.mockResolvedValue({ ok: true, data });
    expect(await updateSso('o1', { issuer: 'https://i2' })).toEqual({ ok: true, data });
  });
  it('delete treats 404 as idempotent success', async () => {
    api.del.mockResolvedValue({ ok: false, error: { kind: 'http', status: 404, message: 'x' } });
    expect(await deleteSso('o1')).toEqual({ ok: true });
  });
});
