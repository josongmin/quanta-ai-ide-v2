import { memo, useState } from 'react';
import {
  AlertCircle, AlignLeft, ArrowRight, Columns2, Copy, ExternalLink, Eye,
  FileEdit, GitPullRequest,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { DiffBlock } from '../../types';
import { FileRow, type DiffViewMode } from './DiffFileRow';

function DiffBlockViewImpl({ block, isDark }: { block: DiffBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  const [applied, setApplied] = useState(block.applied === 'applied');
  // View mode lives at the block level so toggling once affects every
  // file in the diff at the same time. Persist across re-renders only
  // for this block instance — refreshing the page resets to unified.
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified');
  const textMuted = isDark ? 'text-white/55' : 'text-black/55';
  const textFaint = isDark ? 'text-white/40' : 'text-black/40';
  const card = isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-black/[0.08]';
  const headerBorder = isDark ? 'border-white/[0.06]' : 'border-black/[0.05]';

  const stateBadgeStyle: React.CSSProperties | undefined = applied
    ? {
        background: 'var(--intent-success-bg)',
        color: 'var(--intent-success-fg)',
        borderColor: 'color-mix(in srgb, var(--intent-success-vivid) 20%, transparent)',
      }
    : undefined;
  const stateBadge = applied
    ? ''
    : (isDark
        ? 'bg-white/[0.05] text-white/65 border-white/[0.10]'
        : 'bg-black/[0.04] text-black/65 border-black/[0.10]');
  const StateIcon = applied ? FileEdit : Eye;

  return (
    <div className={`rounded-lg border overflow-hidden ${card} shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${headerBorder}`}>
        <GitPullRequest className={`w-3 h-3 ${textMuted}`} />
        <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${textFaint}`}>
          changes
        </span>
        <span className={`text-[11px] font-mono ${textMuted}`}>
          {block.files.length} {block.files.length === 1 ? t('block.fileOne') : t('block.fileMany')}
        </span>
        <span
          style={stateBadgeStyle}
          className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-bold uppercase tracking-[0.18em] border ${stateBadge}`}
        >
          <StateIcon className="w-2.5 h-2.5" />
          {applied ? t('apply.applied') : t('apply.suggested')}
        </span>
        <div className="flex-1" />
        {/* unified ↔ split toggle. Two-button segmented control rather
            than a dropdown — the choice is binary and the icons tell the
            story without a label. */}
        <div className={`flex items-center gap-px rounded-md p-px ${
          isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
        }`} title={t('diffView.toggleTooltip')}>
          <button
            type="button"
            onClick={() => { setViewMode('unified'); }}
            aria-pressed={viewMode === 'unified'}
            title={t('diffView.unified')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'unified'
                ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black shadow-sm')
                : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')
            }`}
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('split'); }}
            aria-pressed={viewMode === 'split'}
            title={t('diffView.split')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'split'
                ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black shadow-sm')
                : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')
            }`}
          >
            <Columns2 className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
          <span style={{ color: 'var(--intent-success-vivid)' }} className="coding-num-rise">+{block.added}</span>
          <span style={{ color: 'var(--intent-danger-vivid)', animationDelay: '60ms' }} className="coding-num-rise">−{block.removed}</span>
        </div>
      </div>

      <div className={isDark ? 'divide-y divide-white/[0.04]' : 'divide-y divide-black/[0.04]'}>
        {block.files.map((file) => (
          <FileRow key={file.path} file={file} isDark={isDark} viewMode={viewMode} />
        ))}
      </div>

      <div className={`flex items-start gap-2 px-3 py-2 border-t ${headerBorder} ${
        isDark ? 'bg-white/[0.015]' : 'bg-black/[0.015]'
      }`}>
        <AlertCircle className={`w-3 h-3 shrink-0 mt-0.5 ${textFaint}`} />
        <span className={`text-[10px] leading-relaxed ${textMuted}`}>
          {applied ? t('apply.appliedNote') : t('apply.suggestedNote')}
        </span>
      </div>

      <div className={`flex items-center justify-between px-2.5 py-2 border-t ${headerBorder} ${
        isDark ? 'bg-white/[0.015]' : 'bg-black/[0.02]'
      }`}>
        <span className={`text-[11px] font-mono ${textFaint}`}>
          {applied ? t('apply.applied') : t('apply.previewOnly')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={t('block.patch')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
              isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-black/55 hover:text-black hover:bg-black/[0.06]'
            }`}
          >
            <Copy className="w-2.5 h-2.5" />
            {t('block.patch')}
          </button>
          {!applied ? (
            <button
              type="button"
              onClick={() => { setApplied(true); }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                isDark
                  ? 'text-white/85 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.10]'
                  : 'text-black/85 bg-black/[0.06] hover:bg-black/[0.12] border border-black/[0.10]'
              }`}
            >
              <FileEdit className="w-2.5 h-2.5" />
              {t('apply.applyToTree')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setApplied(false); }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-black/55 hover:text-black hover:bg-black/[0.06]'
              }`}
              title={t('apply.previewOnly')}
            >
              <Eye className="w-2.5 h-2.5" />
              {t('apply.previewOnly')}
            </button>
          )}
          <button
            type="button"
            style={{
              color: 'var(--intent-success-fg)',
              background: 'var(--intent-success-bg)',
              border: '1px solid color-mix(in srgb, var(--intent-success-vivid) 20%, transparent)',
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            {applied ? t('apply.applyAndPr') : t('block.openPr')}
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const DiffBlockView = memo(DiffBlockViewImpl);
