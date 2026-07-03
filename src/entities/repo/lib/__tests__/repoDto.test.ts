import { describe, it, expect } from 'vitest';
import { buildRepo } from '../build';
import { buildRepoData, toRepoDataDTO, type RepoDataDTO } from '../repoDto';
import { fetchRepoData } from '../loadRepo';

// Guards the serialization boundary: RepoData carries a derived
// `foldersByPath: Map` that does NOT survive JSON. The DTO must omit it and the
// adapter must rebuild it — else a real JSON backend response breaks every
// consumer. These tests prove the adapter round-trips and survives JSON.

describe('repo DTO boundary', () => {
  it('round-trips RepoData through the wire DTO unchanged', () => {
    const original = buildRepo(7);
    const rebuilt = buildRepoData(toRepoDataDTO(original));
    expect(rebuilt).toEqual(original); // Maps compared structurally
  });

  it('the DTO is JSON-serializable and the adapter rebuilds foldersByPath', () => {
    // Simulate a real backend: serialize → wire → parse → adapt.
    const wire = JSON.parse(
      JSON.stringify(toRepoDataDTO(buildRepo(7))),
    ) as RepoDataDTO;

    // After JSON, foldersByPath is gone from the wire shape...
    expect('foldersByPath' in wire).toBe(false);

    const repo = buildRepoData(wire);
    // ...and the adapter reconstructs it as a real Map keyed by path.
    expect(repo.foldersByPath).toBeInstanceOf(Map);
    expect(repo.foldersByPath.size).toBe(repo.folders.length);
    const folder = repo.folders[0];
    expect(repo.foldersByPath.get(folder.path)).toBe(folder);
  });

  it('fetchRepoData() resolves a live RepoData in mock mode', async () => {
    const repo = await fetchRepoData(7);
    expect(repo.files.length).toBeGreaterThan(0);
    expect(repo.foldersByPath).toBeInstanceOf(Map);
    expect(repo.foldersByPath.size).toBe(repo.folders.length);
  });
});
