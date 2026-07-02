// ─── shared types + helpers used across the FolderBody tabs ──────────────
//
// Split out from FolderBody.tsx (SRP), mirroring the workspace-body/shared.ts
// convention. Unlike the workspace variant, the folder tabs also share a
// DepRow helper (dependency direction rows), so it lives here rather than
// re-deriving it per tab. DepRow is a component, so this is a .tsx file.

import { GitBranch } from 'lucide-react';
import type { computeFolderStats } from '@entities/metric';
import { useTranslation } from '@shared/i18n';

export type FolderTab = 'overview' | 'activity' | 'risk' | 'deps';

// The memoized computeFolderStats result, threaded to every tab body.
export type FolderStats = ReturnType<typeof computeFolderStats>;

export function folderTabFooter(
  tab: FolderTab,
  files: number,
  t: (k: string, opts?: Record<string, unknown>) => string,
): string {
  switch (tab) {
    case 'overview': return t('footer.folderScope', { count: files });
    case 'activity': return t('footer.activity');
    case 'risk':     return t('footer.risk');
    case 'deps':     return t('footer.folderDeps');
  }
}

// Dependency-direction row — shared by the Deps tab (outbound + inbound) and
// kept here because both directions render identically apart from the arrow.
export function DepRow({ path, n, dir }: { path: string; n: number; dir: 'in' | 'out' }) {
  const { t } = useTranslation('inspect');
  return (
    <div className="flex items-center gap-2 py-0.5">
      <GitBranch
        className={`w-2.5 h-2.5 shrink-0 text-[var(--fg-subtle)] ${
          dir === 'in' ? 'rotate-180' : ''
        }`}
      />
      <span className="flex-1 text-[11px] font-mono truncate text-[var(--fg-muted)]">
        {path ? path.split('.').join('/') : t('deps.rootLabel')}
      </span>
      <span className="text-[10px] tabular-nums font-bold text-[var(--fg-strong)]">
        {n}
      </span>
    </div>
  );
}
