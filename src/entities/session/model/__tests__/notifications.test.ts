import { describe, it, expect, vi, beforeEach } from 'vitest';

// entities/session notifications action layer — result mapping, 404-idempotent
// markRead, defensive list, query params. accountsApi mocked.
vi.mock('@shared/auth', () => ({
  accountsApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

import { accountsApi } from '@shared/auth';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../notifications';

const api = vi.mocked(accountsApi);
beforeEach(() => { vi.clearAllMocks(); });

describe('listNotifications', () => {
  it('returns the page on success', async () => {
    api.get.mockResolvedValue({ ok: true, data: { notifications: [{ id: 'n1' }], nextCursor: 'c1', unreadCount: 3 } });
    const res = await listNotifications();
    expect(res.ok && res.data.notifications.length).toBe(1);
    expect(res.ok && res.data.nextCursor).toBe('c1');
    expect(res.ok && res.data.unreadCount).toBe(3);
  });
  it('coerces a malformed payload defensively', async () => {
    api.get.mockResolvedValue({ ok: true, data: { notifications: null, nextCursor: undefined, unreadCount: 'x' } });
    const res = await listNotifications();
    expect(res).toEqual({ ok: true, data: { notifications: [], nextCursor: null, unreadCount: 0 } });
  });
  it('passes cursor + unread query params', async () => {
    api.get.mockResolvedValue({ ok: true, data: { notifications: [], nextCursor: null, unreadCount: 0 } });
    await listNotifications({ cursor: 'abc|1', unreadOnly: true });
    const path = api.get.mock.calls[0][0];
    expect(path).toContain('cursor=abc');
    expect(path).toContain('unread=true');
  });
  it('surfaces an error', async () => {
    api.get.mockResolvedValue({ ok: false, error: { kind: 'network', message: 'down' } });
    expect((await listNotifications()).ok).toBe(false);
  });
});

describe('markNotificationRead — 404 idempotent', () => {
  it('treats 404 as ok:true', async () => {
    api.patch.mockResolvedValue({ ok: false, error: { kind: 'http', status: 404, message: 'x' } });
    expect(await markNotificationRead('n1')).toEqual({ ok: true });
  });
  it('surfaces a non-404 error', async () => {
    api.patch.mockResolvedValue({ ok: false, error: { kind: 'http', status: 500, message: 'x' } });
    expect((await markNotificationRead('n1')).ok).toBe(false);
  });
});

describe('markAllNotificationsRead', () => {
  it('returns ok on success', async () => {
    api.post.mockResolvedValue({ ok: true, data: { updated: 4 } });
    expect(await markAllNotificationsRead()).toEqual({ ok: true });
  });
});
