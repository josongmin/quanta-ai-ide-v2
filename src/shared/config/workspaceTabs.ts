// Route-level workspace tab metadata (no React components).
// App layer composes lazy stage components onto this map in
// `app/router/workspaceTabsRegistry.tsx`; features read chrome via
// `WorkspaceTabsRegistryProvider`.

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

export type TabMeta = {
  kind: TabKind;
  label: string;
  group: TabKindGroup;
  path: string;
  description: string;
};

export const WORKSPACE_TAB_META: Record<TabKind, TabMeta> = {
  intelligence: {
    kind: 'intelligence',
    label: 'Intelligence',
    group: 'core',
    path: '/intelligence',
    description: 'Dot-field map of the repo with filter sidebar.',
  },
  coding: {
    kind: 'coding',
    label: 'Coding',
    group: 'core',
    path: '/coding',
    description: 'Inline editor with AI assistance and ownership cues.',
  },
  agents: {
    kind: 'agents',
    label: 'Agents',
    group: 'core',
    path: '/agents',
    description: 'Manage long-running agent jobs and fleets.',
  },
  reviews: {
    kind: 'reviews',
    label: 'Reviews',
    group: 'core',
    path: '/reviews',
    description: 'Review pull requests with PR-aware copilot.',
  },
  admission: {
    kind: 'admission',
    label: 'Admission',
    group: 'core',
    path: '/admission',
    description: 'Author and tune admission rules.',
  },
  fixes: {
    kind: 'fixes',
    label: 'Fixes',
    group: 'core',
    path: '/fixes',
    description: 'Verified-fix authoring board.',
  },
  'fix-pipeline': {
    kind: 'fix-pipeline',
    label: 'Fix Pipeline',
    group: 'more',
    path: '/fix-pipeline',
    description: 'End-to-end pipeline view for a fix in flight.',
  },
  catalog: {
    kind: 'catalog',
    label: 'Catalog',
    group: 'more',
    path: '/catalog',
    description: 'Browse the service / module catalog.',
  },
  inbox: {
    kind: 'inbox',
    label: 'Inbox',
    group: 'more',
    path: '/me/inbox',
    description: 'Personal inbox of mentions and assignments.',
  },
};

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

const TAB_KIND_SET = new Set<TabKind>(TAB_KINDS_ORDERED);

export function isTabKind(value: string): value is TabKind {
  return TAB_KIND_SET.has(value as TabKind);
}

export const PATH_TO_KIND: Record<string, TabKind> = (() => {
  const out: Record<string, TabKind> = {};
  for (const k of TAB_KINDS_ORDERED) {
    out[WORKSPACE_TAB_META[k].path] = k;
  }
  return out;
})();

export function resolveTabKindFromPath(pathname: string): TabKind | null {
  if (PATH_TO_KIND[pathname]) return PATH_TO_KIND[pathname];
  const matches = TAB_KINDS_ORDERED
    .filter((k) => pathname.startsWith(`${WORKSPACE_TAB_META[k].path}/`))
    .sort((a, b) => WORKSPACE_TAB_META[b].path.length - WORKSPACE_TAB_META[a].path.length);
  return matches[0] ?? null;
}

export const DEFAULT_TAB_KINDS: TabKind[] = [
  'intelligence',
  'coding',
  'agents',
  'reviews',
  'admission',
  'fixes',
];

export function getKindsByGroup(group: TabKindGroup): TabKind[] {
  return TAB_KINDS_ORDERED.filter((k) => WORKSPACE_TAB_META[k].group === group);
}

export function getTabMeta(kind: TabKind): TabMeta {
  return WORKSPACE_TAB_META[kind];
}
