// Reactive current-user state — the app-facing contract over better-auth's
// `authClient.useSession()`. Widgets read this (never the raw client) so the
// session shape stays stable and mockable.

import { authClient } from '@shared/auth';

type CurrentUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  /** Whether the user has a confirmed second factor (better-auth twoFactor). */
  twoFactorEnabled: boolean;
};

type SessionState = {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isPending: boolean;
  /** Id of the current session — used to mark "this device" in the session list
   *  (me-stage/Security) via the stable session id, not the token. Null when
   *  signed out / pending. */
  sessionId: string | null;
};

export function useSession(): SessionState {
  const { data, isPending } = authClient.useSession();
  const raw = data?.user;
  const id = (data?.session as { id?: unknown } | undefined)?.id;
  return {
    user: raw
      ? {
          id: raw.id, email: raw.email, name: raw.name, image: raw.image,
          twoFactorEnabled: Boolean((raw as { twoFactorEnabled?: unknown }).twoFactorEnabled),
        }
      : null,
    isAuthenticated: Boolean(data),
    isPending,
    sessionId: typeof id === 'string' ? id : null,
  };
}
