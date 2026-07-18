import { describe, it, expect, vi, beforeEach } from 'vitest';

// entities/org SCIM action layer — result mapping, 403→Enterprise-plan message,
// 409→not-enabled message. accountsApi mocked.
vi.mock('@shared/auth', () => ({
  accountsApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

import { accountsApi } from '@shared/auth';
import { getScimConfig, enableScim, rotateScimToken, disableScim } from '../scim';

const api = vi.mocked(accountsApi);
beforeEach(() => { vi.clearAllMocks(); });

describe('getScimConfig', () => {
  it('returns the config on success', async () => {
    const data = { orgId: 'o1', enabled: true, baseUrl: 'https://acc/scim/v2', createdAt: 't' };
    api.get.mockResolvedValue({ ok: true, data });
    expect(await getScimConfig('o1')).toEqual({ ok: true, data });
  });
  it('surfaces an error', async () => {
    api.get.mockResolvedValue({ ok: false, error: { kind: 'network', message: 'down' } });
    expect((await getScimConfig('o1')).ok).toBe(false);
  });
});

describe('enableScim', () => {
  it('surfaces 403 as the Enterprise-plan message', async () => {
    api.post.mockResolvedValue({ ok: false, error: { kind: 'http', status: 403, message: 'x' } });
    const res = await enableScim('o1');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Enterprise plan/i);
  });
  it('returns config + token on success', async () => {
    const data = { orgId: 'o1', enabled: true, baseUrl: 'u', createdAt: 't', token: 'scim_x' };
    api.post.mockResolvedValue({ ok: true, data });
    expect(await enableScim('o1')).toEqual({ ok: true, data });
  });
});

describe('rotateScimToken', () => {
  it('403 → plan message, 409 → not-enabled message', async () => {
    api.post.mockResolvedValueOnce({ ok: false, error: { kind: 'http', status: 403, message: 'x' } });
    const r1 = await rotateScimToken('o1');
    expect(!r1.ok && /Enterprise plan/i.test(r1.error)).toBe(true);
    api.post.mockResolvedValueOnce({ ok: false, error: { kind: 'http', status: 409, message: 'x' } });
    const r2 = await rotateScimToken('o1');
    expect(!r2.ok && /Enable SCIM/i.test(r2.error)).toBe(true);
  });
});

describe('disableScim', () => {
  it('returns ok on success', async () => {
    api.post.mockResolvedValue({ ok: true, data: undefined });
    expect(await disableScim('o1')).toEqual({ ok: true });
  });
});
