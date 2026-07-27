// Built-in surface declarations (WB-401/404/406).
//
// The nine built-in workspace surfaces as catalog DATA (an open array) plus lazy
// activators — replacing the closed per-kind component switch that used to map
// each tab kind to a hard-coded view. Adding a built-in surface is a data edit
// here, not a shell/router edit.
// Metadata is eager and serialisable; activators import their React chunk only on
// activation.
import { SURFACE_IDS_ORDERED, getSurfaceMeta } from '@shared/config/surfaces';
import { buildSurfaceCatalog, type SurfaceActivator, type SurfaceCatalog, type SurfaceManifest } from './surfaceCatalog';
import { SURFACE_ICONS } from './icons';

// Legacy tab kind → canonical surface id (migration only).
export function surfaceIdForKind(kind: string): string {
  return `core.${kind}`;
}

// Descriptors derive title/group/icon from the shared metadata SoT
// (`@shared/config/surfaces`); the catalog adds only owner/trust/instancing +
// the lazy activator. There is no second copy of the tab metadata.
const SURFACES: readonly SurfaceManifest[] = SURFACE_IDS_ORDERED.map((surfaceId) => {
  const meta = getSurfaceMeta(surfaceId);
  if (meta === undefined) throw new Error(`no surface metadata for ${surfaceId}`);
  // Every meta.icon must resolve in the icon registry. An unknown icon name is
  // a hard programming error — throw rather than mount a surface whose icon
  // silently renders `undefined`.
  if (!(meta.icon in SURFACE_ICONS)) {
    throw new Error(`surface ${surfaceId} references unknown icon '${meta.icon}' (not in SURFACE_ICONS)`);
  }
  return {
    id: surfaceId,
    owner: 'core',
    trust: 'core',
    title: meta.title,
    group: `core.${meta.group}`,
    icon: meta.icon,
    // Instancing is the descriptor's authority, sourced from the single
    // metadata SoT — not hard-coded here and not decided by the tab store.
    instancing: meta.instancing,
    contextKinds: [],
  };
});

const ACTIVATORS: Readonly<Record<string, SurfaceActivator>> = {
  'core.intelligence': () => import('@widgets/intelligence-stage').then((m) => ({ Component: m.IntelligenceStage })),
  'core.coding': () => import('@widgets/coding-stage').then((m) => ({ Component: m.CodingStage })),
  'core.agents': () => import('@widgets/agent-fleet-stage').then((m) => ({ Component: m.AgentFleetStage })),
  'core.reviews': () => import('@widgets/review-stage').then((m) => ({ Component: m.ReviewStage })),
  'core.admission': () => import('@features/admission-rules').then((m) => ({ Component: m.AdmissionRoot })),
  'core.fixes': () => import('@features/verified-fix').then((m) => ({ Component: m.VerifiedFixRoot })),
  'core.fix-pipeline': () => import('@widgets/fix-pipeline-stage').then((m) => ({ Component: m.FixPipelineStage })),
  'core.catalog': () => import('@widgets/catalog').then((m) => ({ Component: m.CatalogStage })),
  'core.inbox': () => import('@widgets/me-stage').then((m) => ({ Component: m.InboxPage })),
};

// Fail-closed 1:1 guard: the metadata id set (SURFACE_IDS_ORDERED) and the
// activator id set must be exactly equal — every declared surface has an
// activator and no activator refers to a phantom surface. buildSurfaceCatalog
// re-checks manifest<->activator, but this asserts directly against the
// metadata SoT so a drift is caught at its source with a clear message.
(function assertActivatorSetMatchesMetadata(): void {
  const metaIds = new Set(SURFACE_IDS_ORDERED);
  const activatorIds = new Set(Object.keys(ACTIVATORS));
  const missingActivator = [...metaIds].filter((id) => !activatorIds.has(id));
  const orphanActivator = [...activatorIds].filter((id) => !metaIds.has(id));
  if (missingActivator.length > 0 || orphanActivator.length > 0) {
    throw new Error(
      `built-in surface activators are not 1:1 with metadata: ` +
        `missing activator=[${missingActivator.join(', ')}] ` +
        `orphan activator=[${orphanActivator.join(', ')}]`,
    );
  }
})();

// Materialised once. An invalid built-in set is a hard programming error.
export const builtinCatalog: SurfaceCatalog = (() => {
  const result = buildSurfaceCatalog(SURFACES, ACTIVATORS);
  if (!result.ok) {
    throw new Error(`built-in surface catalog is invalid: ${JSON.stringify(result.errors)}`);
  }
  return result.value;
})();
