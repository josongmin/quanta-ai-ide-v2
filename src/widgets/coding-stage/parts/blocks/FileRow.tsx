import { useState } from 'react';
import { ChevronRight, Check, XCircle } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { CodingFileChange, HunkComment } from '../types';
import { UnifiedHunkBody, SplitHunkBody } from './DiffLines';
import { HunkCommentThread } from './DiffComments';
import { DriftBadge, DiffBar } from './DiffBadges';

export type DiffViewMode = 'unified' | 'split';

export function FileRow({
  file, isDark, viewMode = 'unified',
}: {
  file: CodingFileChange;
  isDark: boolean;
  viewMode?: DiffViewMode;
}) {
  const { t } = useTranslation('coding');
  const [open, setOpen] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, 'accepted' | 'rejected' | undefined>>(() => {
    const seed: Record<string, 'accepted' | 'rejected' | undefined> = {};
    file.hunks.forEach((h, i) => {
      const key = h.id ?? `i:${i}`;
      seed[key] = h.decision;
    });
    return seed;
  });
  const [comments, setComments] = useState<Record<string, HunkComment[]>>({});
  const [composing, setComposing] = useState<string>('');
  function addComment(key: string, text: string, kind: 'note' | 'ask') {
    if (!text.trim()) return;
    setComments((cur) => ({
      ...cur,
      [key]: [...(cur[key] ?? []), {
        id: `c-${Date.now().toString(36)}`,
        text: text.trim(),
        kind, at: 'now',
        author: 'user',
        replies: [],
      }],
    }));
    setComposing('');
    if (kind === 'ask') {
      setTimeout(() => {
        setComments((cur) => ({
          ...cur,
          [key]: (cur[key] ?? []).map((c, i, arr) =>
            i === arr.length - 1
              ? {
                  ...c,
                  replies: [
                    ...(c.replies ?? []),
                    {
                      id: `c-${Date.now().toString(36)}`,
                      text: '이 hunk의 변경 의도를 분석해 답변드릴게요. 더 구체적으로 알고 싶은 부분이 있다면 알려주세요.',
                      kind: 'note', at: 'now', author: 'agent',
                    },
                  ],
                }
              : c,
          ),
        }));
      }, 900);
    }
  }
  function replyToComment(key: string, parentId: string, text: string) {
    if (!text.trim()) return;
    setComments((cur) => ({
      ...cur,
      [key]: (cur[key] ?? []).map((c) =>
        c.id === parentId
          ? {
              ...c,
              replies: [
                ...(c.replies ?? []),
                {
                  id: `c-${Date.now().toString(36)}`,
                  text: text.trim(),
                  kind: 'note', at: 'now', author: 'user',
                },
              ],
            }
          : c,
      ),
    }));
  }
  function toggleResolve(key: string, commentId: string) {
    setComments((cur) => ({
      ...cur,
      [key]: (cur[key] ?? []).map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c,
      ),
    }));
  }
  const expandable = file.hunks.length > 0;
  const textPrimary = 'text-[var(--fg-strong)]';
  const textFaint = 'text-[var(--fg-subtle)]';

  const acceptedCount = Object.values(decisions).filter((d) => d === 'accepted').length;
  const total = file.hunks.length;
  return (
    <div>
      <button type="button"
        disabled={!expandable}
        onClick={() => { if (expandable) setOpen((v) => !v); }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
          expandable
            ? ('hover:[background:var(--bg-hover)]')
            : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expandable && (
            <ChevronRight className={`w-3 h-3 transition-transform ${textFaint} ${open ? 'rotate-90' : ''}`} />
          )}
          {!expandable && <span className="w-3 h-3 shrink-0" />}
          <span className={`text-[11px] font-mono truncate ${textPrimary}`}>{file.path}</span>
          {expandable && acceptedCount > 0 && (
            <span
              className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono bg-[var(--intent-success-bg)] text-[var(--intent-success-fg)]`}
              title={t('hunk.summary', { accepted: acceptedCount, total })}
            >
              <Check className="w-2.5 h-2.5" />
              {acceptedCount}/{total}
            </span>
          )}
          {file.drift && file.drift.state !== 'clean' && (
            <DriftBadge drift={file.drift} isDark={isDark} t={t} />
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
          <span style={{ color: 'var(--intent-success-vivid)' }}>+{file.added}</span>
          <span style={{ color: 'var(--intent-danger-vivid)' }}>−{file.removed}</span>
          <DiffBar added={file.added} removed={file.removed} isDark={isDark} />
        </div>
      </button>
      {open && expandable && (
        <div className={`px-3 pb-2`}>
          {file.hunks.map((hunk, i) => {
            const key = hunk.id ?? `i:${i}`;
            const decision = decisions[key];
            const isAccepted = decision === 'accepted';
            const isRejected = decision === 'rejected';
            const hunkDrifted = file.drift?.driftedHunkIdx?.includes(i) ?? false;
            const driftGlyph =
              file.drift?.state === 'overlap' ? '⚠'
              : file.drift?.state === 'shifted' ? '⊙'
              : file.drift?.state === 'gone' ? '✕'
              : null;
            return (
              <div key={key} className={`mt-1 rounded-md overflow-hidden border transition-opacity relative border-[var(--border-default)] ${isRejected ? 'opacity-45' : ''}`}>
                <div
                  className={`sticky top-0 z-10 flex items-center gap-2 px-2 py-1 text-[10px] font-mono backdrop-blur bg-[var(--bg-overlay)] text-[var(--fg-muted)]`}
                >
                  {hunkDrifted && driftGlyph && (
                    <span
                      className={`shrink-0 ${
                        file.drift?.state === 'overlap'
                          ? ('text-[var(--intent-warn-fg)]')
                          : file.drift?.state === 'gone'
                            ? ('text-[var(--intent-danger-fg)]')
                            : ('text-[var(--fg-link)]')
                      }`}
                      title={
                        file.drift?.state === 'overlap' ? t('drift.fileOverlap')
                        : file.drift?.state === 'gone' ? t('drift.fileGone')
                        : t('drift.fileShifted')
                      }
                    >
                      {driftGlyph}
                    </span>
                  )}
                  <span className="flex-1 truncate">{hunk.header}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDecisions((d) => ({ ...d, [key]: isAccepted ? undefined : 'accepted' })); }}
                    title={t('hunk.accept')}
                    aria-label={t('hunk.accept')}
                    aria-pressed={isAccepted}
                    className={`p-0.5 rounded transition-colors ${
                      isAccepted
                        ? ('text-[var(--intent-success-fg)] bg-[var(--intent-success-bg)]')
                        : ('text-[var(--fg-subtle)] hover:text-[var(--intent-success-fg)] hover:[background:var(--intent-success-bg)]')
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDecisions((d) => ({ ...d, [key]: isRejected ? undefined : 'rejected' })); }}
                    title={t('hunk.reject')}
                    aria-label={t('hunk.reject')}
                    aria-pressed={isRejected}
                    className={`p-0.5 rounded transition-colors ${
                      isRejected
                        ? ('text-[var(--intent-danger-fg)] bg-[var(--intent-danger-bg)]')
                        : ('text-[var(--fg-subtle)] hover:text-[var(--intent-danger-fg)] hover:[background:var(--intent-danger-bg)]')
                    }`}
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
                <div className="relative">
                  {hunkDrifted && file.drift?.state === 'overlap' && (
                    <div
                      className="coding-drift-hatch pointer-events-none absolute inset-0 z-[5]"
                      aria-hidden
                    />
                  )}
                  {viewMode === 'unified'
                    ? <UnifiedHunkBody hunk={hunk} isDark={isDark} />
                    : <SplitHunkBody hunk={hunk} isDark={isDark} />
                  }
                </div>
                <HunkCommentThread
                  hunkKey={key}
                  comments={comments[key] ?? []}
                  composing={composing === key}
                  onOpenCompose={() => { setComposing(key); }}
                  onCancelCompose={() => { setComposing(''); }}
                  onSubmit={(text, kind) => { addComment(key, text, kind); }}
                  onReply={(parentId, text) => { replyToComment(key, parentId, text); }}
                  onToggleResolve={(commentId) => { toggleResolve(key, commentId); }}
                  isDark={isDark}
                  t={t}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
