// Consolidates the FolderTree row callbacks (expand toggle + host open
// callbacks) into one stable handlers object so the recursive Row component
// drills a single `handlers` prop instead of three separate callbacks.
import { useMemo } from 'react';

export type RowHandlers = {
  /** Expand/collapse a folder by path (local `expanded` Set). */
  toggle: (path: string) => void;
  /** Host callback when a folder row is activated. */
  onOpenFolder?: (path: string) => void;
  /** Host callback when a file row is activated. */
  onOpenFile?: (id: number) => void;
};

export function useRowHandlers(handlers: RowHandlers): RowHandlers {
  const { toggle, onOpenFolder, onOpenFile } = handlers;
  // Memoised so the object identity is stable while its members are — the
  // recursive Row tree can treat `handlers` as a stable reference.
  return useMemo(
    () => ({ toggle, onOpenFolder, onOpenFile }),
    [toggle, onOpenFolder, onOpenFile],
  );
}
