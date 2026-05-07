import { useMemo, useState } from 'react';
import { ArrowRightLeft, Minus, Pencil, Plus } from 'lucide-react';
import type { ChangeKind, FileDiff, LineThread } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import DiffHunk, { type DiffMode } from './DiffHunk';

type Props = {
  file: FileDiff;
  mode: DiffMode;
  /** Threads attached to *this file* only — caller filters. */
  threads: LineThread[];
  onAddComment: (line: number, body: string) => void;
  onReply: (threadId: string, body: string) => void;
  onResolveThread: (threadId: string, resolved: boolean) => void;
  /** When provided AND `file.fileId !== null`, render inline analysis chips. */
  repo?: RepoData;
  isDark: boolean;
};

/**
 * Top-level diff component. Pure-presentational with all mutations
 * delegated to props (the parent review-stage widget wires them to
 * `useReviewStore`). The "Show whitespace" toggle is currently a
 * visual-only stub (`_showWs`) — preserved so the layout reserves space
 * before the behavioral change lands.
 */
export default function DiffView({
  file, mode, threads, onAddComment, onReply, onResolveThread, repo, isDark,
}: Props) {
  const [_showWs, setShowWs] = useState(false);

  // Defensive sort: surface changes top-to-bottom by new-side line number.
  const sortedHunks = useMemo(() => {
    return file.hunks.slice().sort((a, b) => a.newStart - b.newStart);
  }, [file.hunks]);

  const headerSurface = isDark
    ? 'bg-white/[0.04] border-white/10'
    : 'bg-black/[0.04] border-black/10';
  const containerSurface = isDark
    ? 'bg-[#0d1117] border-white/10'
    : 'bg-white border-black/10';
  const pathCls = isDark ? 'text-white/85' : 'text-black/85';
  const subCls = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <div className={`rounded-md border overflow-hidden ${containerSurface}`}>
      <header className={`flex items-center gap-2 px-3 py-2 border-b ${headerSurface}`}>
        <ChangeKindIcon kind={file.kind} />
        <div className="min-w-0 flex-1">
          <div className={`text-[12px] font-mono truncate ${pathCls}`}>
            {file.kind === 'renamed' && file.oldPath ? (
              <>
                <span className={subCls}>{file.oldPath}</span>
                <span className={`mx-1 ${subCls}`}>→</span>
                <span>{file.path}</span>
              </>
            ) : file.path}
          </div>
          <div className={`text-[10px] uppercase tracking-[0.18em] font-bold flex items-center gap-2 ${subCls}`}>
            <span className="text-[#4f9a5c]">+{file.added}</span>
            <span className="text-[#c25a55]">−{file.removed}</span>
            <span>·</span>
            <span>{file.kind}</span>
            {file.viewed && <><span>·</span><span>viewed</span></>}
          </div>
        </div>
        <WsToggle on={_showWs} onToggle={() => { setShowWs((v) => !v); }} isDark={isDark} />
      </header>

      <div>
        {sortedHunks.length === 0 ? (
          <div className={`p-6 text-center text-[11px] uppercase tracking-[0.18em] font-bold ${subCls}`}>
            No textual changes
          </div>
        ) : sortedHunks.map((h, i) => (
          <DiffHunk
            key={`${String(h.oldStart)}-${String(h.newStart)}-${String(i)}`}
            file={file}
            hunk={h}
            hunkIndex={i}
            mode={mode}
            threads={threads}
            isDark={isDark}
            onAddComment={onAddComment}
            onReply={onReply}
            onResolveThread={onResolveThread}
            repo={repo}
          />
        ))}
      </div>
    </div>
  );
}

function ChangeKindIcon({ kind }: { kind: ChangeKind }) {
  const cls = 'w-4 h-4 shrink-0';
  if (kind === 'added')    return <Plus className={`${cls} text-[#4f9a5c]`} />;
  if (kind === 'deleted')  return <Minus className={`${cls} text-[#c25a55]`} />;
  if (kind === 'renamed')  return <ArrowRightLeft className={`${cls} text-[#a8893a]`} />;
  return <Pencil className={`${cls} text-[#7aa7d4]`} />;
}

function WsToggle({ on, onToggle, isDark }: { on: boolean; onToggle: () => void; isDark: boolean }) {
  const { t } = useTranslation('diff');
  const idle = isDark
    ? 'text-white/55 hover:bg-white/5'
    : 'text-black/55 hover:bg-black/5';
  const active = isDark
    ? 'bg-white/15 text-white'
    : 'bg-black/10 text-black';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={t('view.whitespaceTitle')}
      className={`text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-md transition-colors ${
        on ? active : idle
      }`}
    >
      Show whitespace
    </button>
  );
}
