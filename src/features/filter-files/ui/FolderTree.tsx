import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { ChevronRight, Folder, FolderOpen, FileCode } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { FileRecord, FolderRecord } from '@entities/repo';
import { useFilterStore } from '@entities/filter-state';
import { useRowHandlers, type RowHandlers } from '../lib/useRowHandlers';

type Tree = { folder: FolderRecord; children: Tree[] };

// Callbacks lifted from the inspect-target StackContext so this tree no
// longer reaches into a sibling slice. The host wires `onOpenFolder` /
// `onOpenFile` to whichever stack/tab system is active.
export type FolderTreeProps = {
  onOpenFolder?: (path: string) => void;
  onOpenFile?: (id: number) => void;
  activeKey?: string | null;
};

function build(folders: FolderRecord[]): Tree {
  const map = new Map<string, Tree>();
  for (const f of folders) map.set(f.path, { folder: f, children: [] });
  let root: Tree | null = null;
  for (const f of folders) {
    // Invariant: every folder was inserted into `map` keyed by its own path
    // in the loop above, so this lookup is always defined.
    const node = map.get(f.path)!;
    if (f.parentPath === null) root = node;
    else map.get(f.parentPath)?.children.push(node);
  }
  // Invariant: repo folder data always contains exactly one root folder
  // (parentPath === null), so `root` is assigned during the loop.
  return root!;
}

function Row({
  node, depth, expanded, handlers, counts, files, activeKey,
}: {
  node: Tree; depth: number;
  expanded: Set<string>;
  handlers: RowHandlers;
  counts: { matched: Map<string, number>; total: Map<string, number> };
  files: FileRecord[];
  activeKey?: string | null;
}) {
  const { toggle, onOpenFolder, onOpenFile } = handlers;
  const { t: tr } = useTranslation('inspect');
  // Narrow selectors. Each row in a deep tree subscribes only to the slices
  // it actually reads, so a slider tweak elsewhere won't re-render every row.
  const selectedFolders = useFilterStore((s) => s.state.selectedFolders);
  const toggleFolder = useFilterStore((s) => s.toggleFolder);
  const matched = useFilterStore((s) => s.matched);
  const path = node.folder.path;
  const isOpen = expanded.has(path) || depth === 0;
  const isSelected = selectedFolders.has(path);
  const folderFiles = node.folder.fileIds.map((id) => files[id]);
  const hasChildren = node.children.length > 0 || folderFiles.length > 0;
  const m = counts.matched.get(path) ?? 0;
  const t = counts.total.get(path) ?? 0;

  return (
    <div className="relative">
      {depth > 0 && (
        // Vertical guide aligned with the parent row's chevron center.
        // Each level indents the row by 14px; chevron center sits 15px in.
        // Subtracting 0.5 visually centers a 1px line on a sub-pixel.
        <div
          className="absolute top-0 bottom-0 w-px bg-[var(--border-default)]"
          style={{ left: `${(depth - 1) * 14 + 15 - 0.5}px` }}
        />
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => { toggleFolder(path); onOpenFolder?.(path); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleFolder(path);
            onOpenFolder?.(path);
          }
        }}
        className={`group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'text-[color:var(--fg-strong)] [background:color-mix(in_srgb,var(--fg-accent)_16%,transparent)]'
            : 'hover:bg-[var(--bg-hover)]'
        }`}
        style={{ marginLeft: `${depth * 14}px` }}
      >
        <button type="button"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(path); }}
          className="w-3.5 h-3.5 flex items-center justify-center"
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren
            ? <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''} text-[var(--fg-default)]`} />
            : <span className="w-1.5 h-1.5 rounded-full bg-[var(--fg-subtle)]" />}
        </button>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {hasChildren
            ? (isOpen
              ? <FolderOpen className="w-3.5 h-3.5 text-[var(--fg-default)]" />
              : <Folder className="w-3.5 h-3.5 text-[var(--fg-muted)]" />)
            : <FileCode className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />}
          <span className={`text-sm truncate ${depth === 0 ? 'font-black uppercase tracking-wider' : 'font-medium'} ${
            isSelected ? '' : 'text-[var(--fg-muted)]'
          }`}>
            {depth === 0 ? tr('tree.repo') : node.folder.name}
          </span>
        </div>
        <span className={`tabular-nums text-2xs ${m === 0 ? 'text-[var(--fg-subtle)]' : 'text-[var(--fg-muted)]'}`}>
          {m}/{t}
        </span>
      </div>
      {isOpen && hasChildren && (
        <div className="mt-0.5">
          {node.children.map((c) => (
            <Row
              key={c.folder.path}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              handlers={handlers}
              counts={counts}
              files={files}
              activeKey={activeKey}
            />
          ))}
          {folderFiles.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              depth={depth + 1}
              matched={Boolean(matched[f.id])}
              onOpenFile={onOpenFile}
              isActive={activeKey === `file:${f.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file, depth, matched, onOpenFile, isActive,
}: {
  file: FileRecord; depth: number; matched: boolean;
  onOpenFile?: (id: number) => void;
  isActive: boolean;
}) {
  // Mirror the map click: invoking `onOpenFile` lets the host (typically
  // an inspect stack / tab strip) decide how to surface the file.
  return (
    <div
      onClick={() => { onOpenFile?.(file.id); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenFile?.(file.id);
        }
      }}
      className={`group flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'text-[color:var(--fg-strong)] [background:color-mix(in_srgb,var(--fg-accent)_16%,transparent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
      style={{ marginLeft: `${depth * 14}px` }}
      title={`${file.folderPath}/${file.name}`}
    >
      <span className="w-3.5 h-3.5 flex items-center justify-center">
        <span className={`w-1 h-1 rounded-full ${
          matched
            ? 'bg-[var(--fg-accent)]'
            : 'bg-[var(--fg-subtle)]'
        }`} />
      </span>
      <FileCode className={`w-3 h-3 shrink-0 ${
        isActive ? 'text-[var(--fg-default)]' : 'text-[var(--fg-subtle)]'
      }`} />
      <span className={`flex-1 min-w-0 truncate text-sm font-medium ${
        isActive
          ? 'text-[var(--fg-strong)]'
          : matched
            ? 'text-[var(--fg-default)]'
            : 'text-[var(--fg-subtle)]'
      }`}>
        {file.name}
      </span>
    </div>
  );
}

// Imperative handle so parents (FilterBar's Files card header) can drive
// expand-all / collapse-all from IDE-style toolbar buttons without lifting
// the entire `expanded` Set into a global store.
export type FolderTreeHandle = {
  expandAll: () => void;
  collapseAll: () => void;
};

const FolderTree = forwardRef<FolderTreeHandle, FolderTreeProps>(function FolderTree(
  { onOpenFolder, onOpenFile, activeKey }, ref,
) {
  const repo = useFilterStore((s) => s.repo);
  const matched = useFilterStore((s) => s.matched);
  const tree = useMemo(() => build(repo.folders), [repo.folders]);
  // Expanded-folder paths. Bounded by the repo's folder count (every entry
  // is an existing folder path, deduped by Set semantics), so this grows at
  // most to one entry per folder and never unboundedly — no LRU/eviction
  // needed even for large trees.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    s.add('');
    for (const f of repo.folders) if (f.depth === 1) s.add(f.path);
    return s;
  });
  const toggle = useCallback((p: string) => { setExpanded((cur) => {
    const next = new Set(cur);
    next.has(p) ? next.delete(p) : next.add(p);
    return next;
  }); }, []);

  useImperativeHandle(ref, () => ({
    expandAll: () => {
      // Every folder path becomes "open". Root row treats `''` and depth===0
      // specially, so include both for symmetry.
      const all = new Set<string>(['']);
      for (const f of repo.folders) all.add(f.path);
      setExpanded(all);
    },
    collapseAll: () => {
      // Keep only the root open — the root row is force-open via depth===0
      // anyway, but storing it keeps the chevron state consistent.
      setExpanded(new Set<string>(['']));
    },
  }), [repo.folders]);

  const counts = useMemo(() => {
    const total = new Map<string, number>();
    const m = new Map<string, number>();
    for (const f of repo.folders) { total.set(f.path, 0); m.set(f.path, 0); }
    for (const file of repo.files) {
      const parts = file.folderParts;
      for (let i = parts.length; i >= 0; i--) {
        const ap = parts.slice(0, i).join('.');
        if (!total.has(ap)) continue;
        total.set(ap, total.get(ap)! + 1);
        if (matched[file.id]) m.set(ap, m.get(ap)! + 1);
      }
    }
    return { matched: m, total };
  }, [repo, matched]);

  const handlers = useRowHandlers({ toggle, onOpenFolder, onOpenFile });

  return (
    <Row
      node={tree}
      depth={0}
      expanded={expanded}
      handlers={handlers}
      counts={counts}
      files={repo.files}
      activeKey={activeKey}
    />
  );
});

export default FolderTree;
