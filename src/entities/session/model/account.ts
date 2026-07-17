// Account-management actions over the better-auth client (profile, email,
// password, deletion, active sessions). Kept separate from actions.ts (the
// sign-in/up/reset auth flow) but sharing the same normalization. Widgets in
// me-stage call these; the raw client stays encapsulated in shared/auth.

import {
  authClient, normalizeResult, normalizeData,
  type ActionResult, type ActionData,
} from '@shared/auth';

export type { ActionResult };

/** One active session as the UI needs it. `id` identifies the current session
 *  (stable), `token` is what revoke takes. */
export type ActiveSession = {
  id: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export async function updateProfile(input: { name?: string; image?: string }): Promise<ActionResult> {
  return normalizeResult(await authClient.updateUser(input));
}

/** Request an email change — better-auth sends a confirmation link to the new
 *  address (accounts is configured with sendChangeEmailVerification). */
export async function changeEmail(input: { newEmail: string; callbackURL?: string }): Promise<ActionResult> {
  return normalizeResult(await authClient.changeEmail(input));
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}): Promise<ActionResult> {
  return normalizeResult(await authClient.changePassword(input));
}

/** Request account deletion — accounts sends a confirmation email
 *  (sendDeleteAccountVerification); the account is removed once confirmed. */
export async function requestAccountDeletion(input: { callbackURL?: string }): Promise<ActionResult> {
  return normalizeResult(await authClient.deleteUser(input));
}

function isoOf(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'string' ? v : '';
}

export async function listSessions(): Promise<ActionData<ActiveSession[]>> {
  const res = await authClient.listSessions();
  const norm = normalizeData(res);
  if (!norm.ok) return norm;
  const sessions = (Array.isArray(norm.data) ? norm.data : []).map((s): ActiveSession => {
    const row = s as {
      id?: unknown; token?: unknown; createdAt?: unknown; updatedAt?: unknown;
      ipAddress?: unknown; userAgent?: unknown;
    };
    return {
      id: typeof row.id === 'string' ? row.id : '',
      token: typeof row.token === 'string' ? row.token : '',
      createdAt: isoOf(row.createdAt),
      updatedAt: isoOf(row.updatedAt),
      ipAddress: typeof row.ipAddress === 'string' ? row.ipAddress : null,
      userAgent: typeof row.userAgent === 'string' ? row.userAgent : null,
    };
  });
  return { ok: true, data: sessions };
}

export async function revokeSession(input: { token: string }): Promise<ActionResult> {
  return normalizeResult(await authClient.revokeSession(input));
}

/** Sign out every OTHER session (keeps the current one). */
export async function revokeOtherSessions(): Promise<ActionResult> {
  return normalizeResult(await authClient.revokeOtherSessions());
}
