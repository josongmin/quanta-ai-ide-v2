// Two-factor (TOTP) actions over the better-auth twoFactorClient plugin.
// Enrollment: enableTwoFactor → user scans the totpURI → verifyTotp confirms it.
// Login challenge: verifyTotp / verifyBackupCode after signIn reports
// twoFactorRedirect. Disable + backup-code regeneration require the password.

import {
  authClient, normalizeResult, normalizeData,
  type ActionResult, type ActionData,
} from '@shared/auth';
import { messageForError } from '../lib/errorMessages';

export type { ActionResult };

export type TotpEnrollment = { totpURI: string; backupCodes: string[] };

function normalize(res: { error: unknown }): ActionResult {
  return normalizeResult(res, messageForError);
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string') : [];
}

/** Begin TOTP enrollment — returns the otpauth URI (render as a QR) + one-time
 *  backup codes. Not active until a code is confirmed via verifyTotp. */
export async function enableTwoFactor(input: { password: string }): Promise<ActionData<TotpEnrollment>> {
  const res = await authClient.twoFactor.enable(input);
  const norm = normalizeData(res, messageForError);
  if (!norm.ok) return norm;
  const d = norm.data as { totpURI?: unknown; backupCodes?: unknown };
  return {
    ok: true,
    data: { totpURI: typeof d.totpURI === 'string' ? d.totpURI : '', backupCodes: strings(d.backupCodes) },
  };
}

/** Verify a TOTP code — confirms enrollment OR clears the login challenge
 *  (trustDevice skips future prompts on this device). */
export async function verifyTotp(input: { code: string; trustDevice?: boolean }): Promise<ActionResult> {
  return normalize(await authClient.twoFactor.verifyTotp(input));
}

/** Verify a one-time backup code during the login challenge. */
export async function verifyBackupCode(input: { code: string; trustDevice?: boolean }): Promise<ActionResult> {
  return normalize(await authClient.twoFactor.verifyBackupCode(input));
}

export async function disableTwoFactor(input: { password: string }): Promise<ActionResult> {
  return normalize(await authClient.twoFactor.disable(input));
}

/** Regenerate backup codes (invalidates the old set). */
export async function regenerateBackupCodes(input: { password: string }): Promise<ActionData<{ backupCodes: string[] }>> {
  const res = await authClient.twoFactor.generateBackupCodes(input);
  const norm = normalizeData(res, messageForError);
  if (!norm.ok) return norm;
  return { ok: true, data: { backupCodes: strings((norm.data as { backupCodes?: unknown }).backupCodes) } };
}
