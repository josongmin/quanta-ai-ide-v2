import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, FileCode, FilePlus, FileMinus, FileSymlink,
  Eye, EyeOff,
} from 'lucide-react';
import type { ChangeKind, FileDiff, LineThread, PullRequest } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { DiffView, ModeToggle } from '@features/diff-view';

// `DiffMode` is also defined in @features/diff-view/ModeToggle, but we keep
// a local string-literal alias here to avoid coupling the widget to the
// barrel's exact named export — they're built in parallel.
type DiffMode = 'unified' | 'split';
import { useReviewStore, viewerLogin } from '@features/review-pr';

type Props = {
  pr: PullRequest;
  repo: RepoData;
  isDark: boolean;
  /** Mirrors the widget's own activeFilePath state so keyboard nav (n/p) and
      click both drive a single source of truth. */
  activeFilePath: string | null;
  setActiveFilePath: (path: string | null) => void;
};

// Two-pane: file tree on the left, diff viewer on the right. The tree is
// folder-grouped so a 50-file PR doesn't become a wall of basenames.

export default function FilesTab({
  pr, repo, isDark, activeFilePath, setActiveFilePath,
}: Props) {
  const [mode, setMode] = useState<DiffMode>('unified');

  // Default selection: first file. Only fire on explicit transitions so
  // the user's `n/p` choices stick.
  useEffect(() => {
    if (activeFilePath !== null) {
      const stillExists = pr.files.some((f) => f.path === activeFilePath);
      if (stillExists) return;
    }
    const first = pr.files[0];
    setActiveFilePath(first ? first.path : null);
  }, [pr.number, pr.files, activeFilePath, setActiveFilePath]);

  const activeFile = useMemo(
    () => pr.files.find((f) => f.path === activeFilePath) ?? pr.files[0] ?? null,
    [pr.files, activeFilePath],
  );

  const threadsForFile = useMemo<LineThread[]>(
    () => activeFile === null
      ? []
      : pr.threads.filter((t) => t.filePath === activeFile.path),
    [pr.threads, activeFile],
  );

  const postLineComment = useReviewStore((s) => s.postLineComment);
  const resolveThread   = useReviewStore((s) => s.resolveThread);
  const markFileViewed  = useReviewStore((s) => s.markFileViewed);

  const border = 'border-[color:var(--border-muted)]';
  const muted = 'text-[color:var(--fg-muted)]';

  if (pr.files.length === 0) {
    return (
      <div className={`px-4 py-12 text-center text-[11px] ${muted}`}>
        This PR has no file diffs yet.
      </div>
    );
  }

  return (
    <div
      className={`flex h-full min-h-0 border rounded-xl overflow-hidden ${border}`}
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      }}
    >
      <FileTree
        files={pr.files}
        activePath={activeFile?.path ?? null}
        onSelect={setActiveFilePath}
        onToggleViewed={(path, viewed) => { markFileViewed(pr.number, path, viewed); }}
        isDark={isDark}
      />
      <div className={`flex-1 min-w-0 flex flex-col border-l ${border}`}>
        <div className={`shrink-0 h-10 flex items-center justify-between px-3 border-b ${border}`}>
          <div className="flex items-center gap-2 min-w-0">
            <FileKindIcon kind={activeFile?.kind ?? 'modified'} isDark={isDark} />
            <span className="text-[12px] font-mono truncate text-[color:var(--fg-strong)]">
              {activeFile?.path ?? '—'}
            </span>
            {activeFile && (
              <span className="text-[10px] font-mono shrink-0">
                <span className="text-emerald-500">+{activeFile.added}</span>
                <span className={muted}> </span>
                <span className="text-rose-500">−{activeFile.removed}</span>
              </span>
            )}
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {activeFile && (
            <DiffView
              file={activeFile}
              mode={mode}
              threads={threadsForFile}
              repo={repo}
              isDark={isDark}
              onAddComment={(line, body) => {
                postLineComment(pr.number, activeFile.path, line, body, viewerLogin);
              }}
              onReply={(threadId, body) => {
                // The thread is already keyed by file+line — we still pass
                // the file so the action is attributable in logs.
                const thread = pr.threads.find((t) => t.id === threadId);
                if (!thread) return;
                postLineComment(
                  pr.number, thread.filePath, thread.line, body, viewerLogin,
                );
              }}
              onResolveThread={(threadId, resolved) => {
                resolveThread(pr.number, threadId, resolved);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── File tree ───────────────────────────────────────────────────────────

type TreeNode = {
  path: string;
  name: string;
  /** Children folders, sorted alphabetically. */
  children: Map<string, TreeNode>;
  /** Files at this folder. */
  files: FileDiff[];
};

function buildTree(files: FileDiff[]): TreeNode {
  const root: TreeNode = { path: '', name: '', children: new Map(), files: [] };
  for (const f of files) {
    const parts = f.path.split('/');
    const fileName = parts.pop();
    if (fileName === undefined) continue;
    let cur = root;
    let acc = '';
    for (const part of parts) {
      acc = acc.length === 0 ? part : `${acc}/${part}`;
      let next = cur.children.get(part);
      if (!next) {
        next = { path: acc, name: part, children: new Map(), files: [] };
        cur.children.set(part, next);
      }
      cur = next;
    }
    cur.files.push(f);
  }
  return root;
}

function FileTree({
  files, activePath, onSelect, onToggleViewed, isDark,
}: {
  files: FileDiff[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onToggleViewed: (path: string, viewed: boolean) => void;
  isDark: boolean;
}) {
  const tree = useMemo(() => buildTree(files), [files]);
  return (
    <div
      className="shrink-0 w-[220px] overflow-auto py-1"
      style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.03)' }}
    >
      <FolderNode
        node={tree}
        depth={0}
        rootMode
        activePath={activePath}
        onSelect={onSelect}
        onToggleViewed={onToggleViewed}
        isDark={isDark}
      />
    </div>
  );
}

function FolderNode({
  node, depth, activePath, onSelect, onToggleViewed, isDark, rootMode = false,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
  onToggleViewed: (path: string, viewed: boolean) => void;
  isDark: boolean;
  rootMode?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // Theme-agnostic via CSS var; keep `isDark` lookup so the prop is read.
  const muted = isDark ? 'text-[color:var(--fg-subtle)]' : 'text-[color:var(--fg-subtle)]';

  const childFolders = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
  const sortedFiles = [...node.files].sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div>
      {!rootMode && (
        <button
          type="button"
          onClick={() => { setCollapsed((v) => !v); }}
          className={`w-full text-left flex items-center gap-1 pr-2 py-0.5 text-[11px] font-mono ${muted} hover:opacity-90`}
          style={{ paddingLeft: 8 + depth * 10 }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span className="truncate">{node.name}</span>
        </button>
      )}
      {!collapsed && (
        <>
          {childFolders.map((c) => (
            <FolderNode
              key={c.path}
              node={c}
              depth={rootMode ? depth : depth + 1}
              activePath={activePath}
              onSelect={onSelect}
              onToggleViewed={onToggleViewed}
              isDark={isDark}
            />
          ))}
          {sortedFiles.map((f) => (
            <FileLeaf
              key={f.path}
              file={f}
              depth={rootMode ? depth : depth + 1}
              active={f.path === activePath}
              onSelect={() => { onSelect(f.path); }}
              onToggleViewed={() => { onToggleViewed(f.path, !f.viewed); }}
              isDark={isDark}
            />
          ))}
        </>
      )}
    </div>
  );
}

function FileLeaf({
  file, depth, active, onSelect, onToggleViewed, isDark,
}: {
  file: FileDiff;
  depth: number;
  active: boolean;
  onSelect: () => void;
  onToggleViewed: () => void;
  isDark: boolean;
}) {
  const baseName = (() => {
    const i = file.path.lastIndexOf('/');
    return i === -1 ? file.path : file.path.slice(i + 1);
  })();
  const rowBg = active
    ? (isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]')
    : 'hover:bg-[color:var(--bg-hover)]';
  const titleColor = active
    ? 'text-[color:var(--fg-strong)]'
    : 'text-[color:var(--fg-default)]';

  return (
    <div
      className={`flex items-center gap-1 pr-2 py-0.5 text-[11px] font-mono ${rowBg} ${file.viewed ? 'opacity-50' : ''}`}
      style={{ paddingLeft: 8 + depth * 10 }}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`flex-1 min-w-0 flex items-center gap-1 text-left ${titleColor}`}
      >
        <FileKindIcon kind={file.kind} isDark={isDark} />
        <span className="truncate">{baseName}</span>
      </button>
      <span className="text-[10px] tabular-nums shrink-0">
        <span className="text-emerald-500">+{file.added}</span>
        <span className="text-rose-500"> −{file.removed}</span>
      </span>
      <button
        type="button"
        onClick={onToggleViewed}
        className="shrink-0 p-0.5 rounded-md text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-default)]"
        title={file.viewed ? 'Mark as not viewed' : 'Mark as viewed'}
      >
        {file.viewed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      </button>
    </div>
  );
}

function FileKindIcon({ kind, isDark }: { kind: ChangeKind; isDark: boolean }) {
  // Theme-agnostic via CSS var; keep `isDark` lookup so the prop is read.
  const tone = isDark ? 'text-[color:var(--fg-subtle)]' : 'text-[color:var(--fg-subtle)]';
  if (kind === 'added')   return <FilePlus    className="w-3 h-3 text-emerald-500 shrink-0" />;
  if (kind === 'deleted') return <FileMinus   className="w-3 h-3 text-rose-500    shrink-0" />;
  if (kind === 'renamed') return <FileSymlink className={`w-3 h-3 shrink-0 ${tone}`} />;
  return <FileCode className={`w-3 h-3 shrink-0 ${tone}`} />;
}
