// Normalized action result for better-auth calls — the one shape every
// imperative auth/org mutation resolves to. better-auth client methods return
// `{ data, error }` and never throw, so wrapping them into a tagged
// `{ ok } | { ok:false, error }` (mirrors shared/api's ApiResult) lets widgets
// branch on `.ok` uniformly. Centralized here so entities/session and
// entities/org share ONE definition instead of each re-deriving it.

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Generic better-auth error → user string. Callers may pass a domain-specific
 *  mapper (e.g. auth or org error tables) for friendlier copy. */
export function normalizeError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; status?: unknown };
    if (typeof e.message === 'string' && e.message.length > 0) return e.message;
    if (e.status === 401) return 'You are not signed in.';
    if (e.status === 403) return "You don't have permission to do that.";
    if (e.status === 429) return 'Too many attempts. Please wait and try again.';
  }
  return 'Something went wrong. Please try again.';
}

/** Wrap a better-auth `{ error }` result into the tagged ActionResult. */
export function normalizeResult(
  res: { error: unknown },
  mapError: (e: unknown) => string = normalizeError,
): ActionResult {
  return res.error ? { ok: false, error: mapError(res.error) } : { ok: true };
}

/** Data-carrying variant for better-auth *queries* (e.g. listSessions). */
export type ActionData<T> = { ok: true; data: T } | { ok: false; error: string };

export function normalizeData<T>(
  res: { data: T | null | undefined; error: unknown },
  mapError: (e: unknown) => string = normalizeError,
): ActionData<T> {
  if (res.error || res.data == null) return { ok: false, error: mapError(res.error) };
  return { ok: true, data: res.data };
}
