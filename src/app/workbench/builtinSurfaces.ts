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

// Materialised once. An invalid built-in set is a hard programming error.
export const builtinCatalog: SurfaceCatalog = (() => {
  const result = buildSurfaceCatalog(SURFACES, ACTIVATORS);
  if (!result.ok) {
    throw new Error(`built-in surface catalog is invalid: ${JSON.stringify(result.errors)}`);
  }
  return result.value;
})();
