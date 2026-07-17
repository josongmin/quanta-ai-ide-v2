// Typed access to build-time environment (Vite `import.meta.env.VITE_*`).
//
// The Vite envPrefix already whitelists VITE_* (vite.config.ts). This is the
// single place app/runtime config is read — features import `env`, never
// `import.meta.env` directly, so config stays discoverable and mockable.
//
// Until a real backend exists the app runs in 'mock' mode (default): features
// use their in-app generators (buildRepo, simulate*, SAMPLE_* seeds). Flip to
// 'real' by setting VITE_API_MODE=real + VITE_API_BASE_URL (see .env.example).

type ApiMode = 'mock' | 'real';

// Strip trailing slashes so `${apiBaseUrl}${path}` never produces a `//`
// (many servers 404/redirect on a double slash, dropping the auth header).
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const apiMode: ApiMode = import.meta.env.VITE_API_MODE === 'real' ? 'real' : 'mock';

// Auth mirrors the api mock→real switch, but is independent: the demo runs
// standalone with `authMode='mock'` (stub sign-in, no route guards) and only
// talks to the accounts backend (better-auth) when `authMode='real'` AND an
// accounts origin is configured.
const accountsUrl = (import.meta.env.VITE_ACCOUNTS_URL ?? '').replace(/\/+$/, '');
const authMode: ApiMode = import.meta.env.VITE_AUTH_MODE === 'real' ? 'real' : 'mock';

export const env = {
  apiBaseUrl,
  apiMode,
  /** True only when a real backend is configured — the switch every data seam
   *  branches on (`env.useRealApi ? api.get(...) : simulate*()`). */
  useRealApi: apiMode === 'real' && apiBaseUrl !== '',
  accountsUrl,
  authMode,
  /** True only when real auth is wired — gates the better-auth client, real
   *  sign-in branches, and route guards (`env.useRealAuth ? guard : free`). */
  useRealAuth: authMode === 'real' && accountsUrl !== '',
} as const;
