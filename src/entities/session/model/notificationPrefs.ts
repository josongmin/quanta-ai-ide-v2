// Per-user notification settings over accounts /v1/me/notification-preferences (cookie).
// Mirrors the accounts `notificationPrefs` contract. Persist-only (delivery enforcement is
// a backend follow-up). matrix is eventId → per-channel booleans.

import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type NotifChannels = { inApp: boolean; email: boolean; slack: boolean; mobile: boolean };

export type NotificationPrefs = {
  matrix: Record<string, NotifChannels>;
  digest: 'realtime' | 'hourly' | 'daily-9am' | 'weekly-monday';
  quietHours: { enabled: boolean; from: string; to: string; timezone: string };
  doNotDisturb: boolean;
  globalMute: boolean;
};

export async function getNotificationPrefs(): Promise<Result<NotificationPrefs>> {
  const res = await accountsApi.get<NotificationPrefs>('/v1/me/notification-preferences');
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'notification settings') };
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<Result<NotificationPrefs>> {
  const res = await accountsApi.put<NotificationPrefs>('/v1/me/notification-preferences', prefs);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'notification settings') };
}
