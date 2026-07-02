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

import { safeLocalGet, safeLocalSet } from '@shared/lib';

const KEY = 'auth.lastUsed.v1';

export function getLastUsedMethod(): AuthMethod | null {
  const v = safeLocalGet(KEY);
  return (v as AuthMethod) ?? null;
}

export function setLastUsedMethod(method: AuthMethod) {
  safeLocalSet(KEY, method);
}
