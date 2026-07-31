// Personal notification inbox over accounts /v1/notifications (cookie-authed,
// per-session-user scope). Fed by the accounts audit-spine 3rd sink: security
// actions notify you, other org actions notify owners/admins.
//
// NOTE: shapes mirror @p0/contracts notifications; replace with codegen when wired.
import { z } from 'zod';

import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

export const NotificationRecordSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  action: z.string(),
  actor: z.string(),
  target: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string().nullable(),
});
export type NotificationRecord = z.infer<typeof NotificationRecordSchema>;

export const NotificationPageSchema = z.object({
  notifications: z.array(NotificationRecordSchema).catch([]),
  nextCursor: z.string().nullable(),
  unreadCount: z.number().catch(0),
});
export type NotificationPage = z.infer<typeof NotificationPageSchema>;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

export async function listNotifications(
  opts: { cursor?: string | null; unreadOnly?: boolean } = {},
): Promise<Result<NotificationPage>> {
  const params = new URLSearchParams();
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.unreadOnly) params.set('unread', 'true');
  const qs = params.toString();
  const res = await accountsApi.get<NotificationPage>(
    `/v1/notifications${qs ? `?${qs}` : ''}`,
    NotificationPageSchema,
  );
  return res.ok
    ? {
        ok: true,
        data: {
          notifications: Array.isArray(res.data.notifications) ? res.data.notifications : [],
          nextCursor: res.data.nextCursor ?? null,
          unreadCount: typeof res.data.unreadCount === 'number' ? res.data.unreadCount : 0,
        },
      }
    : { ok: false, error: apiErrorMessage(res.error, 'notifications') };
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const res = await accountsApi.patch(`/v1/notifications/${encodeURIComponent(id)}/read`);
  if (res.ok) return { ok: true };
  if (res.error.kind === 'http' && res.error.status === 404) return { ok: true }; // already gone/read
  return { ok: false, error: apiErrorMessage(res.error, 'notifications') };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const res = await accountsApi.post('/v1/notifications/read-all');
  return res.ok ? { ok: true } : { ok: false, error: apiErrorMessage(res.error, 'notifications') };
}
