// Remember which method the user last used to sign in, so we can surface a
// "last used" hint on the right login button. Stored locally so it survives
// reload but not session — a cookie would be the production choice.

export type AuthMethod =
  | 'password'
  | 'oauth-github'
  | 'oauth-gitlab'
  | 'oauth-google'
  | 'sso'
  | 'magic-link';

const KEY = 'auth.lastUsed.v1';

export function getLastUsedMethod(): AuthMethod | null {
  try {
    const v = localStorage.getItem(KEY);
    return (v as AuthMethod) ?? null;
  } catch {
    return null;
  }
}

export function setLastUsedMethod(method: AuthMethod) {
  try { localStorage.setItem(KEY, method); } catch { /* ignore */ }
}
