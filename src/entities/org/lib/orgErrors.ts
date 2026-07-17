// better-auth org error → user-facing string. English literals to match the
// org-stage copy. Narrows from `unknown` — no coupling to better-auth internals.

export function messageForOrgError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; status?: unknown };
    if (typeof e.message === 'string' && e.message.length > 0) return e.message;
    if (e.status === 401) return 'Your session expired. Please sign in again.';
    if (e.status === 403) return "You don't have permission to manage this organization.";
    if (e.status === 404) return 'Organization not found.';
    if (e.status === 429) return 'Too many requests. Please wait and try again.';
  }
  return 'Something went wrong. Please try again.';
}
