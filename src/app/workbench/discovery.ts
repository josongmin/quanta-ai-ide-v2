// Surface discovery (WB-401).
//
// Metadata is discovered EAGERLY (cheap, serialisable) while activators stay
// LAZY — importing a manifest never pulls its React chunk. New surfaces are added
// by dropping a `src/pages/workspace-<name>/{manifest,activate}.ts` pair; no shell
// file changes (WB-406 zero-shell-change).
import { type Result, err, fail } from '@shared/workbench';
import { buildSurfaceCatalog, type SurfaceActivator, type SurfaceCatalog, type SurfaceManifest } from './surfaceCatalog';

// Eager metadata modules; lazy activator modules. Vite resolves these at build
// time; both are empty until surface pages exist.
const manifestModules = import.meta.glob<{ manifest: SurfaceManifest }>('/src/pages/workspace-*/manifest.ts', { eager: true });
const activatorModules = import.meta.glob<{ activate: SurfaceActivator }>('/src/pages/workspace-*/activate.ts');

// `/src/pages/workspace-intelligence/manifest.ts` -> `workspace-intelligence`
function segmentOf(path: string): string {
  return path.replace(/^.*\/pages\//, '').split('/')[0];
}

export function discoverSurfaces(): Result<SurfaceCatalog> {
  const manifests: SurfaceManifest[] = [];
  const bySegment = new Map<string, SurfaceManifest>();
  for (const [path, mod] of Object.entries(manifestModules)) {
    if (mod.manifest === undefined) {
      return err(fail('schema-invalid', `${path} does not export a manifest`, { path }));
    }
    manifests.push(mod.manifest);
    bySegment.set(segmentOf(path), mod.manifest);
  }

  const activators: Record<string, SurfaceActivator> = {};
  for (const [path, loader] of Object.entries(activatorModules)) {
    const manifest = bySegment.get(segmentOf(path));
    if (manifest === undefined) {
      return err(fail('missing-reference', `activator ${path} has no sibling manifest`, { path }));
    }
    // Lazy: unwrap the module's `activate` export only when invoked.
    activators[manifest.id] = () => loader().then((mod) => mod.activate());
  }

  return buildSurfaceCatalog(manifests, activators);
}
