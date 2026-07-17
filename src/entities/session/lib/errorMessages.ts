// better-auth error → user-facing string. English literals to match the
// existing (un-internationalized) auth-stage convention. No coupling to
// better-auth's internal error types — narrow from `unknown`.

export function messageForError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; status?: unknown };
    if (typeof e.message === 'string' && e.message.length > 0) return e.message;
    if (e.status === 401) return 'Invalid email or password.';
    if (e.status === 403) return 'Please verify your email before signing in.';
    if (e.status === 429) return 'Too many attempts. Please wait and try again.';
  }
  return 'Something went wrong. Please try again.';
}
