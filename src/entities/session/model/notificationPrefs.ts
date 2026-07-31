// Per-user notification settings over accounts /v1/me/notification-preferences (cookie).
// Mirrors the accounts `notificationPrefs` contract. Persist-only (delivery enforcement is
// a backend follow-up). matrix is eventId → per-channel booleans.

import { z } from 'zod';

import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const NotifChannelsSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  slack: z.boolean(),
  mobile: z.boolean(),
});
export type NotifChannels = z.infer<typeof NotifChannelsSchema>;

export const NotificationPrefsSchema = z.object({
  matrix: z.record(z.string(), NotifChannelsSchema),
  digest: z.enum(['realtime', 'hourly', 'daily-9am', 'weekly-monday']),
  quietHours: z.object({
    enabled: z.boolean(),
    from: z.string(),
    to: z.string(),
    timezone: z.string(),
  }),
  doNotDisturb: z.boolean(),
  globalMute: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

export async function getNotificationPrefs(): Promise<Result<NotificationPrefs>> {
  const res = await accountsApi.get<NotificationPrefs>('/v1/me/notification-preferences', NotificationPrefsSchema);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'notification settings') };
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<Result<NotificationPrefs>> {
  const res = await accountsApi.put<NotificationPrefs>('/v1/me/notification-preferences', prefs, NotificationPrefsSchema);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'notification settings') };
}
