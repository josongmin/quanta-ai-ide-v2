import { useMemo, useState, type ReactNode } from 'react';
import { Brain, Globe, Hash, Plus, ShieldAlert } from 'lucide-react';
import type { DiffHunk as DiffHunkT, DiffLine, FileDiff, LineThread } from '@entities/pr';
import type { FileRecord, RepoData } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import InlineCommentComposer from './InlineCommentComposer';
import InlineThread from './InlineThread';

export type DiffMode = 'unified' | 'split';

type Props = {
  file: FileDiff;
  hunk: DiffHunkT;
  hunkIndex: number;
  mode: DiffMode;
  threads: LineThread[];
  isDark: boolean;
  /** Callbacks come from the parent — this slice never mutates a store. */
  onAddComment: (line: number, body: string) => void;
  onReply: (threadId: string, body: string) => void;
  onResolveThread: (threadId: string, resolved: boolean) => void;
  /** When provided AND `file.fileId !== null`, render static-analysis chips. */
  repo?: RepoData;
};

const ROW_H = 'h-6'; // strict 24px row height per spec.

export default function DiffHunk({
  file, hunk, hunkIndex, mode, threads, isDark,
  onAddComment, onReply, onResolveThread, repo,
}: Props) {
  const { t } = useTranslation('diff');
  // Composer slot keyed by new-side line number; one open at a time.
  const [openComposerOn, setOpenComposerOn] = useState<number | null>(null);

  const threadByLine = useMemo(() => {
    const m = new Map<number, LineThread>();
    for (const t of threads) m.set(t.line, t);
    return m;
  }, [threads]);

  const fileRecord = useMemo<FileRecord | null>(() => {
    if (!repo || file.fileId === null) return null;
    return repo.files.find((f) => f.id === file.fileId) ?? null;
  }, [repo, file.fileId]);

  // Chip cluster anchors to the first added line in the hunk.
  const firstAddedNewNo = useMemo<number | null>(() => {
    for (const ln of hunk.lines) if (ln.kind === 'add' && ln.newNo !== null) return ln.newNo;
    return null;
  }, [hunk.lines]);

  const headerCls = isDark
    ? 'bg-white/[0.03] text-white/55 border-white/10'
    : 'bg-black/[0.03] text-black/55 border-black/10';

  const renderAfterRow = (newNo: number | null) => {
    const thread = newNo !== null ? threadByLine.get(newNo) ?? null : null;
    return (
      <>
        {newNo !== null && openComposerOn === newNo && (
          <InlineCommentComposer
            isDark={isDark}
            placeholder={t('comment.linePlaceholder')}
            onSubmit={(body) => { onAddComment(newNo, body); setOpenComposerOn(null); }}
            onCancel={() => { setOpenComposerOn(null); }}
          />
        )}
        {thread && (
          <InlineThread
            thread={thread}
            isDark={isDark}
            onReply={onReply}
            onResolveThread={onResolveThread}
          />
        )}
      </>
    );
  };

  return (
    <div className={`border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
      <div className={`px-2 py-1 text-[10px] font-mono border-b ${headerCls}`}>
        {hunk.header}
      </div>
      {mode === 'unified' ? (
        <div className="font-mono text-[12px] leading-none">
          {hunk.lines.map((ln, i) => {
            const isFirstAdd = ln.kind === 'add' && ln.newNo !== null && ln.newNo === firstAddedNewNo;
            return (
              <div key={`${String(hunkIndex)}-u-${String(i)}`}>
                <UnifiedRow
                  line={ln}
                  isDark={isDark}
                  onAddComment={(t) => { setOpenComposerOn(t); }}
                  chips={isFirstAdd && fileRecord ? <AnalysisChips file={fileRecord} isDark={isDark} /> : null}
                />
                {renderAfterRow(ln.newNo)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="font-mono text-[12px] leading-none">
          {pairForSplit(hunk.lines).map((p, i) => {
            const rightNew = p.right?.newNo ?? null;
            const isFirstAdd = p.right?.kind === 'add' && rightNew !== null && rightNew === firstAddedNewNo;
            return (
              <div key={`${String(hunkIndex)}-s-${String(i)}`}>
                <SplitRow
                  left={p.left}
                  right={p.right}
                  isDark={isDark}
                  onAddComment={(t) => { setOpenComposerOn(t); }}
                  chips={isFirstAdd && fileRecord ? <AnalysisChips file={fileRecord} isDark={isDark} /> : null}
                />
                {renderAfterRow(rightNew)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Pair lines for split view. Greedy: collect runs of dels and adds, flush
 * on context. Within a run, dels go left and adds go right at the same
 * row; the longer side bleeds into rows where the other side is blank.
 */
type Pair = { left: DiffLine | null; right: DiffLine | null };
function pairForSplit(lines: readonly DiffLine[]): Pair[] {
  const out: Pair[] = [];
  let dels: DiffLine[] = [];
  let adds: DiffLine[] = [];
  const flush = () => {
    const rows = Math.max(dels.length, adds.length);
    for (let i = 0; i < rows; i += 1) {
      out.push({ left: dels[i] ?? null, right: adds[i] ?? null });
    }
    dels = [];
    adds = [];
  };
  for (const ln of lines) {
    if (ln.kind === 'context') { flush(); out.push({ left: ln, right: ln }); }
    else if (ln.kind === 'del') dels.push(ln);
    else adds.push(ln);
  }
  flush();
  return out;
}

/* ─────────────────────────── Rows ────────────────────────────────── */

function UnifiedRow({
  line, isDark, onAddComment, chips,
}: {
  line: DiffLine; isDark: boolean;
  onAddComment: (targetLine: number) => void; chips: ReactNode;
}) {
  const sign = line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' ';
  return (
    <div className={`group relative grid items-center ${ROW_H} ${bgFor(line.kind, isDark)}`}
         style={{ gridTemplateColumns: '44px 44px 14px 1fr 64px' }}>
      <Gutter n={line.oldNo} faint={line.kind === 'add'} isDark={isDark} />
      <Gutter n={line.newNo} faint={line.kind === 'del'} isDark={isDark} />
      <span className={`text-center select-none ${signColor(line.kind, isDark)}`}>{sign}</span>
      <pre className={`m-0 px-2 whitespace-pre overflow-x-auto ${textColor(isDark)}`}>{line.text}</pre>
      <div className="flex items-center justify-end pr-1 gap-1">
        {chips}
        {line.newNo !== null && (() => {
          const ln = line.newNo;
          return <AddCommentBtn isDark={isDark} onClick={() => { onAddComment(ln); }} />;
        })()}
      </div>
    </div>
  );
}

function SplitRow({
  left, right, isDark, onAddComment, chips,
}: {
  left: DiffLine | null; right: DiffLine | null; isDark: boolean;
  onAddComment: (targetLine: number) => void; chips: ReactNode;
}) {
  const targetLine = right?.newNo ?? null;
  return (
    <div className={`group grid ${ROW_H}`} style={{ gridTemplateColumns: '1fr 1fr' }}>
      <SplitHalf side="left" line={left} isDark={isDark} />
      <SplitHalf
        side="right" line={right} isDark={isDark} chips={chips}
        onAddComment={targetLine !== null ? () => { onAddComment(targetLine); } : undefined}
      />
    </div>
  );
}

function SplitHalf({
  side, line, isDark, chips, onAddComment,
}: {
  side: 'left' | 'right'; line: DiffLine | null; isDark: boolean;
  chips?: ReactNode; onAddComment?: () => void;
}) {
  const borderCls = isDark ? 'border-white/10' : 'border-black/10';
  if (!line) {
    const empty = isDark ? 'bg-white/[0.015]' : 'bg-black/[0.02]';
    return <div className={`${empty} border-r last:border-r-0 ${borderCls} h-full`} />;
  }
  // Pure add/del shows on its own side only. The opposite side gets
  // 'context' visuals so spacer rows don't bleed color.
  const visibleKind: DiffLine['kind'] =
    (side === 'left' && line.kind === 'add') || (side === 'right' && line.kind === 'del')
      ? 'context' : line.kind;
  const lineNo = side === 'left' ? line.oldNo : line.newNo;
  const sign = side === 'left'  && line.kind === 'del' ? '-'
             : side === 'right' && line.kind === 'add' ? '+' : ' ';
  return (
    <div className={`relative grid items-center h-full border-r last:border-r-0 ${borderCls} ${bgFor(visibleKind, isDark)}`}
         style={{ gridTemplateColumns: '40px 14px 1fr 64px' }}>
      <Gutter n={lineNo} faint={false} isDark={isDark} />
      <span className={`text-center select-none ${signColor(visibleKind, isDark)}`}>{sign}</span>
      <pre className={`m-0 px-2 whitespace-pre overflow-x-auto ${textColor(isDark)}`}>{line.text}</pre>
      <div className="flex items-center justify-end pr-1 gap-1">
        {chips}
        {onAddComment && <AddCommentBtn isDark={isDark} onClick={onAddComment} />}
      </div>
    </div>
  );
}

/* ─────────────────────────── Bits ────────────────────────────────── */

function Gutter({ n, faint, isDark }: { n: number | null; faint: boolean; isDark: boolean }) {
  const base = isDark ? 'text-white/40' : 'text-black/40';
  const dim  = isDark ? 'text-white/30' : 'text-black/30';
  return (
    <span className={`text-right pr-2 select-none tabular-nums text-[11px] ${faint ? dim : base}`}>
      {n ?? ''}
    </span>
  );
}

function AddCommentBtn({ isDark, onClick }: { isDark: boolean; onClick: () => void }) {
  const { t } = useTranslation('diff');
  const cls = isDark
    ? 'bg-white/10 text-white/70 hover:bg-white/20'
    : 'bg-black/10 text-black/70 hover:bg-black/20';
  return (
    <button
      type="button"
      onClick={onClick}
      title={t('comment.lineTitle')}
      aria-label={t('comment.lineTitle')}
      className={`opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-4 h-4 rounded-md grid place-items-center ${cls}`}
    >
      <Plus className="w-3 h-3" />
    </button>
  );
}

/* ─────────────── Static-analysis chip cluster ─────────────────────── */

function AnalysisChips({ file, isDark }: { file: FileRecord; isDark: boolean }) {
  const m = file.metrics;
  const chips: ReactNode[] = [];
  if (m.cognitive >= 20)     chips.push(<Chip key="cog"  icon={<Brain      className="w-2.5 h-2.5" />} label="cog"        value={m.cognitive}  tone="warn"   isDark={isDark} />);
  if (m.anyCount  >= 5)      chips.push(<Chip key="any"  icon={<Hash       className="w-2.5 h-2.5" />} label="any"        value={m.anyCount}   tone="warn"   isDark={isDark} />);
  if (m.publicApi)           chips.push(<Chip key="api"  icon={<Globe      className="w-2.5 h-2.5" />} label="public api"                       tone="info"   isDark={isDark} />);
  if (m.editSafety < 40)     chips.push(<Chip key="safe" icon={<ShieldAlert className="w-2.5 h-2.5" />} label="low safety" value={m.editSafety} tone="danger" isDark={isDark} />);
  if (chips.length === 0) return null;
  return <div className="flex items-center gap-1">{chips}</div>;
}

function Chip({
  icon, label, value, tone, isDark,
}: {
  icon: ReactNode; label: string; value?: number;
  tone: 'warn' | 'info' | 'danger'; isDark: boolean;
}) {
  const palette = tone === 'danger'
    ? 'bg-[#c25a55]/15 text-[#c25a55] border-[#c25a55]/30'
    : tone === 'warn'
    ? 'bg-[#a8893a]/15 text-[#a8893a] border-[#a8893a]/30'
    : isDark
    ? 'bg-white/10 text-white/70 border-white/20'
    : 'bg-black/10 text-black/70 border-black/20';
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1 h-4 rounded-md border text-[8px] uppercase tracking-[0.18em] font-bold ${palette}`}
      title={`${label}${value !== undefined ? `: ${String(value)}` : ''}`}
    >
      {icon}
      <span>{label}</span>
      {value !== undefined && <span className="font-mono tabular-nums">{value}</span>}
    </span>
  );
}

/* ─────────────────────────── Theme helpers ───────────────────────── */

function bgFor(kind: DiffLine['kind'], isDark: boolean): string {
  if (kind === 'add') return isDark ? 'bg-[#4f9a5c]/10' : 'bg-[#4f9a5c]/15';
  if (kind === 'del') return isDark ? 'bg-[#c25a55]/10' : 'bg-[#c25a55]/15';
  return '';
}
function signColor(kind: DiffLine['kind'], isDark: boolean): string {
  if (kind === 'add') return 'text-[#4f9a5c]';
  if (kind === 'del') return 'text-[#c25a55]';
  return isDark ? 'text-white/30' : 'text-black/30';
}
function textColor(isDark: boolean): string {
  return isDark ? 'text-white/85' : 'text-black/85';
}
