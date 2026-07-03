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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const apiMode: ApiMode = import.meta.env.VITE_API_MODE === 'real' ? 'real' : 'mock';

export const env = {
  apiBaseUrl,
  apiMode,
  /** True only when a real backend is configured — the switch every data seam
   *  branches on (`env.useRealApi ? api.get(...) : simulate*()`). */
  useRealApi: apiMode === 'real' && apiBaseUrl !== '',
  /** Vite's own DEV flag, surfaced here so nothing else reads import.meta.env. */
  isDev: import.meta.env.DEV,
} as const;
