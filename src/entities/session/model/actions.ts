// Imperative auth actions — the layer widgets call. Wraps the better-auth
// client (encapsulated in shared/auth) and normalizes every result into the
// app's tagged `{ ok } | { ok:false, error }` shape (mirrors ApiResult), since
// better-auth methods resolve `{ data, error }` and never throw.

import { authClient, normalizeResult, type ActionResult } from '@shared/auth';
import { messageForError } from '../lib/errorMessages';

export type { ActionResult };

// Auth-specific messaging (invalid credentials / verify email) over the shared
// normalizer — the ActionResult shape itself lives in shared/auth (one source).
function normalize(res: { error: unknown }): ActionResult {
  return normalizeResult(res, messageForError);
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  return normalize(await authClient.signIn.email(input));
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
