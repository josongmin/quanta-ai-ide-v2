import { api } from '@shared/api';
import { env } from '@shared/config/env';
import type { RepoData } from '../model';
import { buildRepo } from './build';
import { buildRepoData, toRepoDataDTO, type RepoDataDTO } from './repoDto';

// The async repo-load seam. Today it resolves the in-app mock generator
// (routed through the DTO adapter so the serialization boundary is exercised
// even in mock mode); when VITE_API_MODE=real it fetches the backend graph and
// runs it through the SAME adapter. Phase 1 (async data loading) wires this
// into a route loader / Suspense boundary — until then the app uses the
// synchronous `buildRepo()` path and this is the ready swap point.
export async function fetchRepoData(seed?: number): Promise<RepoData> {
  if (env.useRealApi) {
    const res = await api.get<RepoDataDTO>('/repos/graph');
    if (!res.ok) throw new Error(`repo graph load failed: ${res.error.message}`);
    return buildRepoData(res.data);
  }
  // Mock: generate, then round-trip through the wire boundary so mock and real
  // exercise the identical adapter path.
  return buildRepoData(toRepoDataDTO(buildRepo(seed)));
}
