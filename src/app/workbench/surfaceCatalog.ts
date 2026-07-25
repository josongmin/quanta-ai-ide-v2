// Built-in surface catalog (WB-401).
//
// Surface METADATA is eager and React-free; surface ACTIVATORS are lazy async
// factories that must not be called during discovery. The catalog validates the
// metadata/activator set (validate-all) and materializes it into an immutable,
// deterministically-ordered snapshot — a single invalid owner never yields a
// partial catalog.
import { type Result, type WorkbenchError, ownerOf, ok, err, fail } from '@shared/workbench';

// Eager, serialisable surface metadata. `icon` is a name (string), not a
// component — no React import at discovery time.
export type SurfaceManifest = {
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly icon: string;
  readonly instancing: 'singleton' | 'multi';
  readonly contextKinds: readonly string[];
};

// Lazy activator: resolves the React view only when the surface is activated.
export type SurfaceActivator = () => Promise<{ default: unknown } | Record<string, unknown>>;

export type CatalogEntry = {
  readonly manifest: SurfaceManifest;
  readonly activate: SurfaceActivator;
};

export type SurfaceCatalog = {
  readonly entries: readonly CatalogEntry[];
  readonly hash: string;
  resolve(surfaceId: string): CatalogEntry | undefined;
};

function hashIds(sortedIds: readonly string[]): string {
  let h = 0x811c9dc5;
  const text = sortedIds.join('\n');
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// Build the catalog from separately-discovered metadata and activators. The two
// maps are keyed by surface id; every manifest needs exactly one activator and
// vice-versa. Errors are collected (validate-all) and sorted so glob/input order
// cannot change the verdict.
export function buildSurfaceCatalog(
  manifests: readonly SurfaceManifest[],
  activators: Readonly<Record<string, SurfaceActivator>>,
): Result<SurfaceCatalog> {
  const errors: WorkbenchError[] = [];
  const byId = new Map<string, SurfaceManifest>();
  const groupIds = new Set<string>();

  for (const manifest of manifests) {
    if (byId.has(manifest.id)) {
      errors.push(fail('duplicate-id', `duplicate surface id ${manifest.id}`, { path: manifest.id }));
    } else {
      byId.set(manifest.id, manifest);
    }
    if (ownerOf(manifest.id) === 'core' && !manifest.id.startsWith('core.')) {
      errors.push(fail('reserved-namespace', `invalid core id ${manifest.id}`, { path: manifest.id }));
    }
    groupIds.add(manifest.group);
  }

  // metadata <-> activator must be one-to-one.
  for (const manifest of manifests) {
    if (!(manifest.id in activators)) {
      errors.push(fail('missing-reference', `surface ${manifest.id} has no activator`, { path: manifest.id }));
    }
  }
  for (const id of Object.keys(activators)) {
    if (!byId.has(id)) {
      errors.push(fail('missing-reference', `activator ${id} has no manifest`, { path: id }));
    }
  }

  if (errors.length > 0) {
    errors.sort((a, b) => `${a.reason}:${a.path ?? ''}`.localeCompare(`${b.reason}:${b.path ?? ''}`));
    return err(errors);
  }

  // Sorted atomic materialisation — deterministic regardless of input order.
  const entries: CatalogEntry[] = [...byId.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((manifest) => ({ manifest, activate: activators[manifest.id] }));
  const resolveMap = new Map(entries.map((e) => [e.manifest.id, e]));

  return ok({
    entries,
    hash: hashIds(entries.map((e) => e.manifest.id)),
    resolve: (surfaceId) => resolveMap.get(surfaceId),
  });
}
