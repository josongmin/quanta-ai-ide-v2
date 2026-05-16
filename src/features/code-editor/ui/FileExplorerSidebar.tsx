import { useMemo, useState } from 'react';
import { ChevronRight, Folder, FolderOpen, FileCode, FileText, FileJson, Hash } from 'lucide-react';
import type { FileRecord, FolderRecord, RepoData } from '@entities/repo';

// File-explorer sidebar tied to the editor modal. Deliberately *not* the
// FilterBar's FolderTree — that one is bound to the global filter store
// (selectedFolders, matched counts) and would introduce side effects when
// the user just wants to swap buffers in the editor.
//
// This is a lean tree: expand/collapse, click a file to open it. Folders
// containing the active file are auto-expanded so the path is always
// visible on first paint.

type Tree = { folder: FolderRecord; children: Tree[] };

const LANGUAGE_ICONS = {
  md: FileText,
  css: Hash,
  js: FileJson,
  ts: FileCode,
  tsx: FileCode,
} as const;

export function FileExplorerSidebar({
  repo, activeFileId, onOpenFile,
}: {
  repo: RepoData;
  activeFileId: number;
  onOpenFile: (id: number) => void;
}) {
  const root = useMemo(() => buildTree(repo.folders), [repo.folders]);

  // Auto-expand the chain leading to the active file so it's always visible.
  const initialExpanded = useMemo(() => {
    const set = new Set<string>();
    const f = repo.files[activeFileId];
    if (!f) return set;
    let cursor: string | null = f.folderPath;
    while (cursor !== null) {
      set.add(cursor);
      const folder: FolderRecord | undefined = repo.foldersByPath.get(cursor);
      cursor = folder?.parentPath ?? null;
    }
    return set;
    // Only seed once per active file change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId]);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (!root) return null;

  return (
    <div
      className="h-full overflow-y-auto overflow-x-hidden text-[11px] py-2 pr-1 pl-1.5"
      style={{ color: 'var(--fg-default)' }}
    >
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em] px-1.5 pb-1.5"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Explorer
      </div>
      <Row
        node={root}
        depth={0}
        expanded={expanded}
        toggle={toggle}
        files={repo.files}
        activeFileId={activeFileId}
        onOpenFile={onOpenFile}
      />
    </div>
  );
}

function Row({
  node, depth, expanded, toggle, files, activeFileId, onOpenFile,
}: {
  node: Tree;
  depth: number;
  expanded: Set<string>;
  toggle: (p: string) => void;
  files: FileRecord[];
  activeFileId: number;
  onOpenFile: (id: number) => void;
}) {
  const path = node.folder.path;
  const isOpen = depth === 0 || expanded.has(path);
  const hasChildren = node.children.length > 0 || node.folder.fileIds.length > 0;
  const folderFiles = node.folder.fileIds
    .map((id) => files[id])
    .filter((f): f is FileRecord => f !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="relative">
      {depth > 0 && (
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: `${String((depth - 1) * 12 + 13 - 0.5)}px`,
            background: 'var(--border-muted)',
            opacity: 0.5,
          }}
        />
      )}
      <button
        type="button"
        onClick={() => { if (hasChildren) toggle(path); }}
        className="group w-full flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:[background:var(--bg-hover)] transition-colors"
        style={{ marginLeft: `${String(depth * 12)}px` }}
      >
        <span className="w-3 h-3 flex items-center justify-center shrink-0">
          {hasChildren ? (
            <ChevronRight
              className={`w-2.5 h-2.5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
              style={{ color: 'var(--fg-subtle)' }}
            />
          ) : (
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--fg-subtle)' }} />
          )}
        </span>
        {isOpen && hasChildren ? (
          <FolderOpen className="w-3 h-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
        ) : (
          <Folder className="w-3 h-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
        )}
        <span
          className={`truncate text-[10px] ${depth === 0 ? 'font-black uppercase tracking-[0.14em]' : 'font-medium'}`}
          style={{ color: depth === 0 ? 'var(--fg-default)' : 'var(--fg-default)' }}
        >
          {depth === 0 ? 'repo' : node.folder.name}
        </span>
      </button>

      {isOpen && (
        <div className="mt-0.5">
          {node.children.map((c) => (
            <Row
              key={c.folder.path}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              files={files}
              activeFileId={activeFileId}
              onOpenFile={onOpenFile}
            />
          ))}
          {folderFiles.map((f) => (
            <FileLeaf
              key={f.id}
              file={f}
              depth={depth + 1}
              isActive={f.id === activeFileId}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileLeaf({
  file, depth, isActive, onOpenFile,
}: {
  file: FileRecord;
  depth: number;
  isActive: boolean;
  onOpenFile: (id: number) => void;
}) {
  const Icon = LANGUAGE_ICONS[file.language] ?? FileCode;
  return (
    <button
      type="button"
      onClick={() => { onOpenFile(file.id); }}
      className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded-md text-left transition-colors ${
        isActive ? '' : 'hover:[background:var(--bg-hover)]'
      }`}
      style={{
        marginLeft: `${String(depth * 12)}px`,
        background: isActive ? 'var(--bg-surface)' : undefined,
      }}
      title={`${file.folderPath.split('.').join('/')}/${file.name}`}
    >
      <span className="w-3 h-3 shrink-0" />
      <Icon className="w-3 h-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
      <span
        className="truncate text-[10px] font-mono"
        style={{
          color: isActive ? 'var(--fg-default)' : 'var(--fg-muted)',
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {file.name}
      </span>
    </button>
  );
}

function buildTree(folders: FolderRecord[]): Tree | null {
  const map = new Map<string, Tree>();
  for (const f of folders) map.set(f.path, { folder: f, children: [] });
  let root: Tree | null = null;
  for (const f of folders) {
    const node = map.get(f.path);
    if (!node) continue;
    if (f.parentPath === null) {
      root = node;
    } else {
      const parent = map.get(f.parentPath);
      parent?.children.push(node);
    }
  }
  // Stable alpha sort within each folder.
  const sortRec = (t: Tree) => {
    t.children.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
    t.children.forEach(sortRec);
  };
  if (root) sortRec(root);
  return root;
}
