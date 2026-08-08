import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@shared/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
  apiErrorMessage: (error: { message?: string }) => error.message ?? 'x',
}));

import { api } from '@shared/api';
import { getWorkspace, updateWorkspace } from '../model';

const mockedApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getWorkspace', () => {
  it('falls back from slug GET to list resolution by name, then re-reads by id', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ ok: false, error: { kind: 'http', status: 404, message: 'missing' } })
      .mockResolvedValueOnce({ ok: true, data: { data: [{ id: 'ws_8f3a', name: 'monorepo' }] } })
      .mockResolvedValueOnce({ ok: true, data: { id: 'ws_8f3a', name: 'Monorepo', default_branch: 'develop' } });

    const res = await getWorkspace('acme', 'monorepo');

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual(expect.objectContaining({
      id: 'ws_8f3a',
      name: 'Monorepo',
      defaultBranch: 'develop',
      orgSlug: 'acme',
      slug: 'monorepo',
    }));
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/v1/workspaces/monorepo', expect.anything());
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/v1/workspaces', expect.anything());
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/v1/workspaces/ws_8f3a', expect.anything());
  });

  it('degrades to `unavailable` when the collection route itself 404s (service not deployed)', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ ok: false, error: { kind: 'http', status: 404, message: 'missing' } })
      .mockResolvedValueOnce({ ok: false, error: { kind: 'http', status: 404, message: 'no route' } });

    const res = await getWorkspace('acme', 'monorepo');

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.kind).toBe('unavailable');
  });

  it('reports `not-found` when the collection resolves but holds no match', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ ok: false, error: { kind: 'http', status: 404, message: 'missing' } })
      .mockResolvedValueOnce({ ok: true, data: { data: [{ id: 'ws_other', name: 'other' }] } });

    const res = await getWorkspace('acme', 'monorepo');

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.kind).toBe('not-found');
  });
});

describe('updateWorkspace', () => {
  it('tries id first and falls back to slug on 404', async () => {
    mockedApi.patch
      .mockResolvedValueOnce({ ok: false, error: { kind: 'http', status: 404, message: 'missing' } })
      .mockResolvedValueOnce({ ok: true, data: { id: 'ws_8f3a' } });

    const res = await updateWorkspace({
      orgSlug: 'acme',
      workspaceSlug: 'monorepo',
      workspaceId: 'ws_8f3a',
      data: { default_branch: 'develop' },
    });

    expect(res).toEqual({ ok: true });
    expect(mockedApi.patch).toHaveBeenNthCalledWith(1, '/v1/workspaces/ws_8f3a', { default_branch: 'develop' });
    expect(mockedApi.patch).toHaveBeenNthCalledWith(2, '/v1/workspaces/monorepo', { default_branch: 'develop' });
  });
});
