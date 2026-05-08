// Thin dispatcher — picks Workspace vs Folder body and supplies the shared
// glass-card frame. The two bodies live in their own files now; this used
// to be a 1057-line god-component that hosted both render trees plus eight
// tab subcomponents. Splitting them lets each surface evolve without
// dragging the other through churn.

import { useFilterRepo } from '@features/filter-files';
import WorkspaceBody from './WorkspaceBody';
import FolderBody from './FolderBody';

export type InspectTarget =
  | { kind: 'workspace' }
  | { kind: 'folder'; path: string };

export default function InspectPanel({ isDark, target }: { isDark: boolean; target: InspectTarget }) {
  const repo = useFilterRepo();

  // `glass-auto` flips dark↔light alpha+border via :root[data-theme]; text
  // colour follows the foreground tokens, so we drop the per-mode className
  // ternary and the inline cardStyle at the same time.
  return (
    <div
      className="flex flex-col h-full max-h-[calc(100vh-130px)] overflow-hidden border transition-all duration-500 shadow-xl glass-auto text-[color:var(--fg-default)]"
    >
      {target.kind === 'workspace'
        ? <WorkspaceBody repo={repo} isDark={isDark} />
        : <FolderBody path={target.path} repo={repo} isDark={isDark} />}
    </div>
  );
}
