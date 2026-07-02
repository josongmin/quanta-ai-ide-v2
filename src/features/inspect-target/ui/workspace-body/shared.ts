// ─── shared types + helpers used across the WorkspaceBody tabs ───────────
//
// Split out from WorkspaceBody.tsx (SRP) so each tab body / viz primitive can
// import the common tab type, the stats shape, and the footer helper without
// re-deriving them. Mirrors the focus-scan/shared.tsx convention.

import type { computeRepoStats } from '@entities/metric';

export type WorkspaceTab = 'overview' | 'activity' | 'risk' | 'deps' | 'ownership';

// The memoized computeRepoStats result, threaded to every tab body.
export type RepoStats = ReturnType<typeof computeRepoStats>;

export function tabFooter(tab: WorkspaceTab, t: (k: string) => string): string {
  switch (tab) {
    case 'overview':  return t('footer.workspaceOverview');
    case 'activity':  return t('footer.activity');
    case 'risk':      return t('footer.risk');
    case 'deps':      return t('footer.deps');
    case 'ownership': return 'Routing · stack · reviewer suggestions (mock data)';
  }
}
