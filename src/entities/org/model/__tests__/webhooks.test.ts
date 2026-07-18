import { describe, it, expect, vi, beforeEach } from 'vitest';

// entities/org webhooks action layer — result mapping, 403→plan message,
// 404-idempotency, defensive array handling. accountsApi is mocked.
vi.mock('@shared/auth', () => ({
  accountsApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

import { accountsApi } from '@shared/auth';
import {
  listWebhooks, createWebhook, updateWebhook, deleteWebhook, listDeliveries, replayDelivery,
} from '../webhooks';

const api = vi.mocked(accountsApi);
beforeEach(() => { vi.clearAllMocks(); });

describe('createWebhook', () => {
  it('surfaces a 403 as the Business-plan message', async () => {
    api.post.mockResolvedValue({ ok: false, error: { kind: 'http', status: 403, message: 'x' } });
    const res = await createWebhook('org1', { url: 'https://x', events: ['*'] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Business plan/i);
  });
  it('returns the created record with secret on success', async () => {
    const data = { id: 'w1', url: 'https://x', description: null, events: ['*'], enabled: true, createdAt: 't', secret: 'whsec_x' };
    api.post.mockResolvedValue({ ok: true, data });
    const res = await createWebhook('org1', { url: 'https://x', events: ['*'] });
    expect(res).toEqual({ ok: true, data });
  });
});

describe('deleteWebhook — 404 is idempotent success', () => {
  it('treats 404 as ok:true (already gone)', async () => {
    api.del.mockResolvedValue({ ok: false, error: { kind: 'http', status: 404, message: 'x' } });
    expect(await deleteWebhook('org1', 'w1')).toEqual({ ok: true });
  });
  it('surfaces a non-404 error', async () => {
    api.del.mockResolvedValue({ ok: false, error: { kind: 'http', status: 500, message: 'x' } });
    const res = await deleteWebhook('org1', 'w1');
    expect(res.ok).toBe(false);
  });
});

describe('listWebhooks / listDeliveries — defensive', () => {
  it('coerces a non-array payload to []', async () => {
    api.get.mockResolvedValue({ ok: true, data: { endpoints: null } });
    const res = await listWebhooks('org1');
    expect(res).toEqual({ ok: true, data: [] });
  });
  it('passes through a delivery list', async () => {
    api.get.mockResolvedValue({ ok: true, data: { deliveries: [{ id: 'd1' }] } });
    const res = await listDeliveries('org1');
    expect(res.ok && res.data.length).toBe(1);
  });
  it('surfaces a list error', async () => {
    api.get.mockResolvedValue({ ok: false, error: { kind: 'network', message: 'down' } });
    expect((await listWebhooks('org1')).ok).toBe(false);
  });
});

describe('updateWebhook / replayDelivery', () => {
  it('updateWebhook returns ok on success', async () => {
    api.patch.mockResolvedValue({ ok: true, data: undefined });
    expect(await updateWebhook('org1', 'w1', { enabled: false })).toEqual({ ok: true });
  });
  it('replayDelivery returns ok on success', async () => {
    api.post.mockResolvedValue({ ok: true, data: undefined });
    expect(await replayDelivery('org1', 'd1')).toEqual({ ok: true });
  });
});
