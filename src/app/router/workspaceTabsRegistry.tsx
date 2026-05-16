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

// All tab kinds the user can open. Each entry binds a kind to its display
// chrome (label/icon), its canonical route path (for URL deep-linking),
// and the component that owns the tab body.
//
// Adding a new kind = one entry here + (optional) a route in router.tsx.
// The picker modal and the URL-sync effect read this map directly.
//
// Lives at the app layer because it stitches together stage widgets and
// feature roots from many slices — exactly the cross-slice composition
// that the app layer owns. Importing it from a feature would force the
// feature to know about every other feature/widget that ships a tab.

export type TabKind =
  | 'intelligence'
  | 'coding'
  | 'agents'
  | 'reviews'
  | 'admission'
  | 'fixes'
  | 'fix-pipeline'
  | 'catalog'
  | 'inbox';

export type TabKindGroup = 'core' | 'more';

export type TabKindDef = {
  kind: TabKind;
  label: string;
  icon: ComponentType<LucideProps>;
  group: TabKindGroup;
  // Canonical route path. Used both for sync (URL ↔ active tab) and as the
  // initial `to` for `<Link>`-style preloading.
  path: string;
  // The component rendered inside the tab. Lazy so cold tabs don't pull
  // their stage chunk until the user actually opens one.
  Component: ComponentType;
  // Short blurb shown in the picker modal.
  description: string;
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

export const TAB_REGISTRY: Record<TabKind, TabKindDef> = {
  intelligence: {
    kind: 'intelligence',
    label: 'Intelligence',
    icon: Brain,
    group: 'core',
    path: '/intelligence',
    Component: IntelligenceLayout,
    description: 'Dot-field map of the repo with filter sidebar.',
  },
  coding: {
    kind: 'coding',
    label: 'Coding',
    icon: Code2,
    group: 'core',
    path: '/coding',
    Component: CodingStage,
    description: 'Inline editor with AI assistance and ownership cues.',
  },
  agents: {
    kind: 'agents',
    label: 'Agents',
    icon: Bot,
    group: 'core',
    path: '/agents',
    Component: AgentFleetStage,
    description: 'Manage long-running agent jobs and fleets.',
  },
  reviews: {
    kind: 'reviews',
    label: 'Reviews',
    icon: GitPullRequest,
    group: 'core',
    path: '/reviews',
    Component: ReviewStage,
    description: 'Review pull requests with PR-aware copilot.',
  },
  admission: {
    kind: 'admission',
    label: 'Admission',
    icon: ShieldCheck,
    group: 'core',
    path: '/admission',
    Component: AdmissionRoot,
    description: 'Author and tune admission rules.',
  },
  fixes: {
    kind: 'fixes',
    label: 'Fixes',
    icon: Wand2,
    group: 'core',
    path: '/fixes',
    Component: VerifiedFixRoot,
    description: 'Verified-fix authoring board.',
  },
  'fix-pipeline': {
    kind: 'fix-pipeline',
    label: 'Fix Pipeline',
    icon: Wrench,
    group: 'more',
    path: '/fix-pipeline',
    Component: FixPipelineStage,
    description: 'End-to-end pipeline view for a fix in flight.',
  },
  catalog: {
    kind: 'catalog',
    label: 'Catalog',
    icon: Layers,
    group: 'more',
    path: '/catalog',
    Component: CatalogStage,
    description: 'Browse the service / module catalog.',
  },
  inbox: {
    kind: 'inbox',
    label: 'Inbox',
    icon: Inbox,
    group: 'more',
    path: '/me/inbox',
    Component: InboxPage,
    description: 'Personal inbox of mentions and assignments.',
  },
};

// Order for the picker modal. Core block first (mirrors product flow);
// "more" block appears below.
export const TAB_KINDS_ORDERED: TabKind[] = [
  'intelligence',
  'coding',
  'agents',
  'reviews',
  'admission',
  'fixes',
  'fix-pipeline',
  'catalog',
  'inbox',
];

// Path → kind, derived once. Used to map the current URL back to a tab
// kind when bootstrapping or when the user navigates via the address bar.
export const PATH_TO_KIND: Record<string, TabKind> = (() => {
  const out: Record<string, TabKind> = {};
  for (const k of TAB_KINDS_ORDERED) {
    out[TAB_REGISTRY[k].path] = k;
  }
  return out;
})();

// Best-effort: match a pathname (which may include trailing slashes or
// nested segments under /me/*) to a known tab kind. Returns null if the
// path does not correspond to any registered tab.
export function resolveTabKindFromPath(pathname: string): TabKind | null {
  if (PATH_TO_KIND[pathname]) return PATH_TO_KIND[pathname];
  // For nested paths (e.g. /me/inbox), prefer the longest registered prefix.
  const matches = TAB_KINDS_ORDERED
    .filter((k) => pathname.startsWith(`${TAB_REGISTRY[k].path}/`))
    .sort((a, b) => TAB_REGISTRY[b].path.length - TAB_REGISTRY[a].path.length);
  return matches[0] ?? null;
}

// Default set of tabs opened on a fresh boot — matches the legacy GNB.
export const DEFAULT_TAB_KINDS: TabKind[] = [
  'intelligence',
  'coding',
  'agents',
  'reviews',
  'admission',
  'fixes',
];

// kept for forward-compat: callers that want to tag UI based on the
// product flow group (core/more) can import this rather than re-deriving.
export function getKindDef(kind: TabKind): TabKindDef {
  return TAB_REGISTRY[kind];
}

// Re-export the icon type so modal callers don't have to import lucide
// directly just to type props.
export type { LucideProps };

// Convenience used by the picker to render section headers in stable order.
export function getKindsByGroup(group: TabKindGroup): TabKind[] {
  return TAB_KINDS_ORDERED.filter((k) => TAB_REGISTRY[k].group === group);
}
