// Imperative auth actions — the layer widgets call. Wraps the better-auth
// client (encapsulated in shared/auth) and normalizes every result into the
// app's tagged `{ ok } | { ok:false, error }` shape (mirrors ApiResult), since
// better-auth methods resolve `{ data, error }` and never throw.

import { authClient, normalizeResult, type ActionResult } from '@shared/auth';
import { messageForError } from '../lib/errorMessages';

export type { ActionResult };

/** Sign-in can succeed OR require a second factor before the session is live. */
export type SignInResult =
  | { ok: true; twoFactorRedirect: boolean }
  | { ok: false; error: string };

export type OAuthProvider = 'github' | 'google';

// Auth-specific messaging (invalid credentials / verify email) over the shared
// normalizer — the ActionResult shape itself lives in shared/auth (one source).
function normalize(res: { error: unknown }): ActionResult {
  return normalizeResult(res, messageForError);
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<SignInResult> {
  const res = await authClient.signIn.email(input);
  if (res.error) return { ok: false, error: messageForError(res.error) };
  // The twoFactor plugin injects `twoFactorRedirect` when the account has a
  // confirmed second factor — the session is NOT live until it's verified.
  const twoFactorRedirect = Boolean(
    (res.data as { twoFactorRedirect?: unknown } | null | undefined)?.twoFactorRedirect,
  );
  return { ok: true, twoFactorRedirect };
}

/** OAuth sign-in. On success better-auth redirects the browser to the provider,
 *  so this only returns here on an immediate error. GitLab/SSO are not backed.
 *  newUserCallbackURL routes first-time OAuth users (e.g. to onboarding). */
export async function signInWithProvider(
  provider: OAuthProvider,
  opts?: { callbackURL?: string; errorCallbackURL?: string; newUserCallbackURL?: string },
): Promise<ActionResult> {
  return normalize(await authClient.signIn.social({ provider, ...opts }));
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  name: string;
}): Promise<ActionResult> {
  return normalize(await authClient.signUp.email(input));
}

export async function signOut(): Promise<ActionResult> {
  return normalize(await authClient.signOut());
}

export async function requestPasswordReset(input: {
  email: string;
  redirectTo: string;
}): Promise<ActionResult> {
  return normalize(await authClient.requestPasswordReset(input));
}

export async function resetPassword(input: {
  newPassword: string;
  token: string;
}): Promise<ActionResult> {
  return normalize(await authClient.resetPassword(input));
}

export async function verifyEmail(input: { token: string }): Promise<ActionResult> {
  return normalize(await authClient.verifyEmail({ query: { token: input.token } }));
}
