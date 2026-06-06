import { lazy, type ComponentType } from 'react';
import {
  Bot,
  Brain,
  Code2,
  GitPullRequest,
  Inbox,
  Layers,
  ShieldCheck,
  Wand2,
  Wrench,
  type LucideProps,
} from 'lucide-react';
import {
  DEFAULT_TAB_KINDS,
  getKindsByGroup,
  PATH_TO_KIND,
  resolveTabKindFromPath,
  TAB_KINDS_ORDERED,
  WORKSPACE_TAB_META,
  type TabKind,
  type TabKindGroup,
  type TabMeta,
} from '@shared/config/workspaceTabs';
import type { TabKindDef } from '@features/workspace-tabs/model/RegistryContext';

// App-layer composition: lazy stage components stitched onto shared tab
// metadata. Features consume the result via WorkspaceTabsRegistryProvider.

export type { TabKind, TabKindGroup, TabMeta };
export {
  DEFAULT_TAB_KINDS,
  getKindsByGroup,
  PATH_TO_KIND,
  resolveTabKindFromPath,
  TAB_KINDS_ORDERED,
  WORKSPACE_TAB_META,
};

const IntelligenceLayout = lazy(() =>
  import('@app/router/intelligence').then((m) => ({ default: m.IntelligenceLayout })),
);
const CodingStage = lazy(() =>
  import('@widgets/coding-stage').then((m) => ({ default: m.CodingStage })),
);
const AgentFleetStage = lazy(() =>
  import('@widgets/agent-fleet-stage').then((m) => ({ default: m.AgentFleetStage })),
);
const ReviewStage = lazy(() =>
  import('@widgets/review-stage').then((m) => ({ default: m.ReviewStage })),
);
const AdmissionRoot = lazy(() =>
  import('@features/admission-rules').then((m) => ({ default: m.AdmissionRoot })),
);
const VerifiedFixRoot = lazy(() =>
  import('@features/verified-fix').then((m) => ({ default: m.VerifiedFixRoot })),
);
const FixPipelineStage = lazy(() =>
  import('@widgets/fix-pipeline-stage').then((m) => ({ default: m.FixPipelineStage })),
);
const CatalogStage = lazy(() =>
  import('@widgets/catalog').then((m) => ({ default: m.CatalogStage })),
);
const InboxPage = lazy(() =>
  import('@widgets/me-stage').then((m) => ({ default: m.InboxPage })),
);

const TAB_ICONS: Record<TabKind, ComponentType<LucideProps>> = {
  intelligence: Brain,
  coding: Code2,
  agents: Bot,
  reviews: GitPullRequest,
  admission: ShieldCheck,
  fixes: Wand2,
  'fix-pipeline': Wrench,
  catalog: Layers,
  inbox: Inbox,
};

const TAB_COMPONENTS: Record<TabKind, ComponentType> = {
  intelligence: IntelligenceLayout,
  coding: CodingStage,
  agents: AgentFleetStage,
  reviews: ReviewStage,
  admission: AdmissionRoot,
  fixes: VerifiedFixRoot,
  'fix-pipeline': FixPipelineStage,
  catalog: CatalogStage,
  inbox: InboxPage,
};

export const TAB_REGISTRY: Record<TabKind, TabKindDef> = (() => {
  const out = {} as Record<TabKind, TabKindDef>;
  for (const kind of TAB_KINDS_ORDERED) {
    const meta = WORKSPACE_TAB_META[kind];
    out[kind] = {
      ...meta,
      icon: TAB_ICONS[kind],
      Component: TAB_COMPONENTS[kind],
    };
  }
  return out;
})();

export function getKindDef(kind: TabKind): TabKindDef {
  return TAB_REGISTRY[kind];
}

export type { LucideProps, TabKindDef };
