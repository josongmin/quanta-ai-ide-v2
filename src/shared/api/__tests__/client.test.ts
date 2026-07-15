import { afterEach, describe, it, expect, vi } from 'vitest';

// The API client is the single network gateway. It must never throw (returns a
// tagged ApiResult), must stay inert in mock mode, and must honor the auth /
// 401 seams in real mode. env.useRealApi is computed at module load from
// import.meta.env, so we stub the env and re-import the module per mode.

async function loadClient(mode: 'mock' | 'real') {
  vi.resetModules();
  vi.stubEnv('VITE_API_MODE', mode);
  vi.stubEnv('VITE_API_BASE_URL', mode === 'real' ? 'http://api.test' : '');
  return import('../client');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('api client — mock mode', () => {
  it('never hits the network; returns a not-wired result', async () => {
    const { api } = await loadClient('mock');
    const res = await api.get('/anything');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.kind).toBe('not-wired');
  });
});

describe('api client — real mode', () => {
  it('returns { ok:true, data } on a 200 and attaches the auth token', async () => {
    const { api, setAuthTokenGetter } = await loadClient('real');
    setAuthTokenGetter(() => 'tok-123');
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(new Response(JSON.stringify({ hello: 'world' }), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await api.get<{ hello: string }>('/thing');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.hello).toBe('world');

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ authorization: 'Bearer tok-123' });
  });

  it('calls the 401 handler and returns an unauthorized result', async () => {
    const { api, setUnauthorizedHandler } = await loadClient('real');
    const onUnauth = vi.fn();
    setUnauthorizedHandler(onUnauth);
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 401 })));

    const res = await api.get('/secure');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.kind).toBe('unauthorized');
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });

  it('maps a non-2xx to an http error', async () => {
    const { api } = await loadClient('real');
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })));
    const res = await api.get('/boom');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('http');
      expect(res.error.status).toBe(500);
    }
  });

  it('maps a thrown fetch to a network error (never throws)', async () => {
    const { api } = await loadClient('real');
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    const res = await api.post('/x', { a: 1 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.kind).toBe('network');
  });

  it('treats a 204 / empty body as success, not a parse error', async () => {
    const { api } = await loadClient('real');
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 204 })));
    const res = await api.del('/thing');
    expect(res.ok).toBe(true);

    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 200 })));
    const res2 = await api.get('/empty');
    expect(res2.ok).toBe(true);
  });
});
