// Thin dispatcher — picks Workspace vs Folder body. The whole right rail now
// sits inside one large GlassCard shell, with the detailed sections rendered
// as nested cards inside it.

import { useFilterRepo } from '@entities/filter-state';
import { GlassCard } from '@shared/ui';
import WorkspaceBody from './WorkspaceBody';
import FolderBody from './FolderBody';

export type InspectTarget =
  | { kind: 'workspace' }
  | { kind: 'folder'; path: string };

export default function InspectPanel({ isDark, target }: { isDark: boolean; target: InspectTarget }) {
  const repo = useFilterRepo();

  return (
    <aside className="w-full h-full min-h-0 z-30 flex flex-col shrink-0">
      <GlassCard className="flex-1 h-full min-h-0 px-3 py-2">
        <div className="h-full min-h-0 overflow-y-auto scrollbar-hide space-y-2">
          {target.kind === 'workspace'
            ? <WorkspaceBody repo={repo} isDark={isDark} />
            : <FolderBody path={target.path} repo={repo} isDark={isDark} />}
        </div>
      </GlassCard>
    </aside>
  );
}
