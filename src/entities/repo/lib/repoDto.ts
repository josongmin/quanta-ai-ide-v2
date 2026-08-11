import { z } from 'zod';
import { RANGE_KEYS, type RepoData, type FolderRecord } from '../model';

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

// Best-effort structural schema for the wire DTO, so `fetchRepoData` validates
// at the trust boundary instead of a fail-open `as T`. It is intentionally
// STRUCTURAL, not exhaustive: the metric object carries ~40 numeric fields and
// the backend graph payload is still evolving, so `.loose()` keeps unknown
// keys and the metrics/ranges objects are validated loosely (right shape, right
// primitive types) rather than pinned field-by-field. This catches the failure
// modes that matter here — a non-array `files`/`folders`, a missing geometry
// field, a boundary of the wrong kind — without rejecting a backend that adds a
// metric. Cast to ZodType<RepoDataDTO> because the loose objects don't infer to
// the exact runtime type.
const rangeSchema = z.tuple([z.number(), z.number()]);

const boundarySchema = z.union([
  z.object({ kind: z.literal('entry'), label: z.string() }),
  z.object({ kind: z.literal('ingress'), protocol: z.string(), method: z.string().optional(), path: z.string().optional() }),
  z.object({ kind: z.literal('egress'), protocol: z.string(), target: z.string() }),
]);

const fileSchema = z.object({
  id: z.number(),
  name: z.string(),
  folderPath: z.string(),
  folderParts: z.array(z.string()),
  ix: z.number(),
  iz: z.number(),
  status: z.string(),
  language: z.string(),
  layer: z.string(),
  owner: z.string(),
  isTest: z.boolean(),
  isGenerated: z.boolean(),
  isDeprecated: z.boolean(),
  // Metrics: right shape, loose fields (the numeric/boolean grab-bag is large and
  // still churning) — validate it's an object, keep every key.
  metrics: z.record(z.string(), z.unknown()),
  deps: z.array(z.number()),
  boundaries: z.array(boundarySchema).optional(),
}).loose();

const folderSchema = z.object({
  path: z.string(),
  parts: z.array(z.string()),
  name: z.string(),
  fileIds: z.array(z.number()),
  childPaths: z.array(z.string()),
  parentPath: z.string().nullable(),
  xStart: z.number(),
  zStart: z.number(),
  width: z.number(),
  height: z.number(),
  depth: z.number(),
}).loose();

// ranges = one [min,max] per filterable metric key (+ derived `halstead`).
const rangesShape: Record<string, typeof rangeSchema> = { halstead: rangeSchema };
for (const key of RANGE_KEYS) rangesShape[key] = rangeSchema;

export const RepoDataDTOSchema = z.object({
  files: z.array(fileSchema),
  folders: z.array(folderSchema),
  ranges: z.object(rangesShape).loose(),
  owners: z.array(z.string()),
}).loose() as unknown as z.ZodType<RepoDataDTO>;

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
