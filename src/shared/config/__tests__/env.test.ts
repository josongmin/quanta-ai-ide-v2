import { afterEach, describe, it, expect, vi } from 'vitest';

// `env` is computed at module load from import.meta.env, so stub + re-import
// per case (same pattern as the api client test).
async function loadEnv(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import('../env')).env;
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('env — auth gating (mirrors useRealApi)', () => {
  it('defaults to mock: useRealAuth is false with nothing set', async () => {
    const env = await loadEnv({});
    expect(env.authMode).toBe('mock');
    expect(env.useRealAuth).toBe(false);
  });

  it('real mode WITHOUT accounts url → still mock (false)', async () => {
    const env = await loadEnv({ VITE_AUTH_MODE: 'real' });
    expect(env.useRealAuth).toBe(false);
  });

  it('mock mode WITH url → false (mode gates it)', async () => {
    const env = await loadEnv({ VITE_AUTH_MODE: 'mock', VITE_ACCOUNTS_URL: 'http://localhost:4000' });
    expect(env.useRealAuth).toBe(false);
  });

  it('real mode AND url → useRealAuth true', async () => {
    const env = await loadEnv({ VITE_AUTH_MODE: 'real', VITE_ACCOUNTS_URL: 'http://localhost:4000' });
    expect(env.useRealAuth).toBe(true);
    expect(env.accountsUrl).toBe('http://localhost:4000');
  });

  it('strips trailing slashes from accountsUrl', async () => {
    const env = await loadEnv({ VITE_AUTH_MODE: 'real', VITE_ACCOUNTS_URL: 'http://localhost:4000///' });
    expect(env.accountsUrl).toBe('http://localhost:4000');
  });
});
