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

  // Match FocusScanPanel's embedded fill so workspace/folder tabs feel like
  // peer panels next to file tabs, not a different surface.
  const cardStyle: React.CSSProperties = isDark
    ? { backgroundColor: 'rgba(13, 17, 23, 0.92)' }
    : { backgroundColor: 'rgba(255, 255, 255, 0.95)' };

  return (
    <div
      className={`flex flex-col h-full max-h-[calc(100vh-130px)] overflow-hidden border transition-all duration-500 shadow-xl ${
        isDark ? 'glass-dark shadow-black/50 text-white' : 'glass-light shadow-black/10 text-black'
      }`}
      style={cardStyle}
    >
      {target.kind === 'workspace'
        ? <WorkspaceBody repo={repo} isDark={isDark} />
        : <FolderBody path={target.path} repo={repo} isDark={isDark} />}
    </div>
  );
}
