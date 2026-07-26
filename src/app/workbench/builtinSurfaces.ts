// Built-in surface declarations (WB-401/404/406).
//
// The nine built-in workspace surfaces as catalog DATA (an open array) plus lazy
// activators — replacing the closed per-kind component switch that used to map
// each tab kind to a hard-coded view. Adding a built-in surface is a data edit
// here, not a shell/router edit.
// Metadata is eager and serialisable; activators import their React chunk only on
// activation.
import { buildSurfaceCatalog, type SurfaceActivator, type SurfaceCatalog, type SurfaceManifest } from './surfaceCatalog';

// Legacy tab kinds map to canonical surface ids `core.<kind>`.
export function surfaceIdForKind(kind: string): string {
  return `core.${kind}`;
}
export function kindForSurfaceId(surfaceId: string): string {
  return surfaceId.replace(/^core\./, '');
}

const SURFACES: readonly SurfaceManifest[] = [
  { id: 'core.intelligence', title: 'Intelligence', group: 'core.core', icon: 'Brain', instancing: 'singleton', contextKinds: [] },
  { id: 'core.coding', title: 'Coding', group: 'core.core', icon: 'Code2', instancing: 'singleton', contextKinds: [] },
  { id: 'core.agents', title: 'Agents', group: 'core.core', icon: 'Bot', instancing: 'singleton', contextKinds: [] },
  { id: 'core.reviews', title: 'Reviews', group: 'core.core', icon: 'GitPullRequest', instancing: 'singleton', contextKinds: [] },
  { id: 'core.admission', title: 'Admission', group: 'core.core', icon: 'ShieldCheck', instancing: 'singleton', contextKinds: [] },
  { id: 'core.fixes', title: 'Fixes', group: 'core.core', icon: 'Wand2', instancing: 'singleton', contextKinds: [] },
  { id: 'core.fix-pipeline', title: 'Fix Pipeline', group: 'core.more', icon: 'Wrench', instancing: 'singleton', contextKinds: [] },
  { id: 'core.catalog', title: 'Catalog', group: 'core.more', icon: 'Layers', instancing: 'singleton', contextKinds: [] },
  { id: 'core.inbox', title: 'Inbox', group: 'core.more', icon: 'Inbox', instancing: 'singleton', contextKinds: [] },
];

const ACTIVATORS: Readonly<Record<string, SurfaceActivator>> = {
  'core.intelligence': () =>
    Promise.all([import('@app/router/intelligence'), import('@app/providers/IntelligenceTabProviders')]).then(
      ([m, p]) => ({ Component: m.IntelligenceLayout, Provider: p.IntelligenceTabProviders }),
    ),
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
