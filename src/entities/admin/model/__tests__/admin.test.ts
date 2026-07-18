import { describe, it, expect, vi, beforeEach } from 'vitest';

// entities/admin action layer — result mapping, moderation-denial (400) friendly
// message, 404-idempotent unban, defensive lists, query params. accountsApi mocked.
vi.mock('@shared/auth', () => ({
  accountsApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

import { accountsApi } from '@shared/auth';
import { listUsers, banUser, unbanUser, impersonateUser } from '../users';
import { listOrgs, overridePlan } from '../orgs';

const api = vi.mocked(accountsApi);
beforeEach(() => { vi.clearAllMocks(); });

describe('listUsers / listOrgs', () => {
  it('coerces malformed lists defensively', async () => {
    api.get.mockResolvedValue({ ok: true, data: { users: null, nextCursor: undefined } });
    expect(await listUsers()).toEqual({ ok: true, data: { users: [], nextCursor: null } });
  });
  it('passes search + cursor params', async () => {
    api.get.mockResolvedValue({ ok: true, data: { orgs: [], nextCursor: null } });
    await listOrgs({ search: 'acme', cursor: 't|1' });
    const path = api.get.mock.calls[0][0];
    expect(path).toContain('search=acme');
    expect(path).toContain('cursor=t');
  });
  it('surfaces a list error', async () => {
    api.get.mockResolvedValue({ ok: false, error: { kind: 'network', message: 'down' } });
    expect((await listUsers()).ok).toBe(false);
  });
});

describe('banUser / impersonateUser — 400 moderation denial', () => {
  it('maps 400 to a friendly self/admin message', async () => {
    api.post.mockResolvedValue({ ok: false, error: { kind: 'http', status: 400, message: 'self' } });
    const res = await banUser('u1', 'abuse');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/yourself or another admin/i);
  });
  it('impersonate maps 400 the same way', async () => {
    api.post.mockResolvedValue({ ok: false, error: { kind: 'http', status: 400, message: 'admin-target' } });
    expect((await impersonateUser('u1')).ok).toBe(false);
  });
  it('ban success', async () => {
    api.post.mockResolvedValue({ ok: true, data: undefined });
    expect(await banUser('u1', null)).toEqual({ ok: true });
  });
});

describe('unbanUser — 404 idempotent', () => {
  it('treats 404 as ok:true', async () => {
    api.post.mockResolvedValue({ ok: false, error: { kind: 'http', status: 404, message: 'x' } });
    expect(await unbanUser('u1')).toEqual({ ok: true });
  });
});

describe('overridePlan', () => {
  it('returns ok on success', async () => {
    api.patch.mockResolvedValue({ ok: true, data: undefined });
    expect(await overridePlan('o1', 'business', 'partner')).toEqual({ ok: true });
  });
  it('surfaces an error', async () => {
    api.patch.mockResolvedValue({ ok: false, error: { kind: 'http', status: 404, message: 'x' } });
    expect((await overridePlan('o1', 'team', null)).ok).toBe(false);
  });
});
