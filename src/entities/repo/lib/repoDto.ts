import type { RepoData, FolderRecord } from '../model';

// Serialization boundary between the WIRE shape (what a JSON backend returns)
// and the runtime `RepoData` the app consumes.
//
// `RepoData` carries `foldersByPath: Map<string, FolderRecord>` — a runtime
// collection that does NOT survive JSON (`JSON.parse` yields `{}`). But it is
// purely DERIVED from `folders`, so it must never be sent over the wire: the
// DTO omits it and `buildRepoData()` reconstructs it client-side. This is the
// pattern for every derived Map/Set/typed-array in the domain: keep them out
// of the DTO, rebuild them in the adapter.

/** JSON-serializable repo payload — exactly what `GET /repos/:id/graph`
 *  should return. Every field here is a plain array / object / primitive. */
export type RepoDataDTO = Omit<RepoData, 'foldersByPath'>;

/** Adapter: wire DTO → runtime RepoData. Rebuilds the derived `foldersByPath`
 *  index from `folders`. This is the single place a backend response becomes
 *  a live `RepoData`. */
export function buildRepoData(dto: RepoDataDTO): RepoData {
  const foldersByPath = new Map<string, FolderRecord>(
    dto.folders.map((f) => [f.path, f]),
  );
  // Duplicate/colliding paths would make the derived index disagree with the
  // `folders` array (last-wins). Surface it — a malformed backend payload, not
  // something to swallow silently.
  if (foldersByPath.size !== dto.folders.length) {
    console.warn(
      `buildRepoData: ${(dto.folders.length - foldersByPath.size).toString()} duplicate folder path(s) — the folders array and foldersByPath index disagree.`,
    );
  }
  return { ...dto, foldersByPath };
}

/** Inverse: strip the derived index to get the serializable payload. Used to
 *  round-trip the mock generator through the same boundary (and in tests). */
export function toRepoDataDTO(repo: RepoData): RepoDataDTO {
  const { foldersByPath: _drop, ...dto } = repo;
  return dto;
}
