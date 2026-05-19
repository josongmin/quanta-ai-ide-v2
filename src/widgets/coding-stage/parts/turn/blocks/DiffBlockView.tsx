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
  const textMuted = 'text-[color:var(--fg-muted)]';
  const textFaint = 'text-[color:var(--fg-subtle)]';
  const card = 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-default)]';
  const headerBorder = 'border-[color:var(--border-muted)]';

  const stateBadgeStyle: React.CSSProperties | undefined = applied
    ? {
        background: 'var(--intent-success-bg)',
        color: 'var(--intent-success-fg)',
        borderColor: 'color-mix(in srgb, var(--intent-success-vivid) 20%, transparent)',
      }
    : undefined;
  const stateBadge = applied
    ? ''
    : 'bg-[color:var(--bg-hover)] text-[color:var(--fg-default)] border-[color:var(--border-default)]';
  const StateIcon = applied ? FileEdit : Eye;

  return (
    <div className={`rounded-lg border overflow-hidden ${card} shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${headerBorder}`}>
        <GitPullRequest className={`w-3 h-3 ${textMuted}`} />
        <span className={`text-[11px] font-bold uppercase tracking-[var(--track-eyebrow)] ${textFaint}`}>
          changes
        </span>
        <span className={`text-[11px] font-mono ${textMuted}`}>
          {block.files.length} {block.files.length === 1 ? t('block.fileOne') : t('block.fileMany')}
        </span>
        <span
          style={stateBadgeStyle}
          className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] border ${stateBadge}`}
        >
          <StateIcon className="w-2.5 h-2.5" />
          {applied ? t('apply.applied') : t('apply.suggested')}
        </span>
        <div className="flex-1" />
        {/* unified ↔ split toggle. Two-button segmented control rather
            than a dropdown — the choice is binary and the icons tell the
            story without a label. */}
        <div className="flex items-center gap-px rounded-md p-px bg-[color:var(--bg-surface-muted)]" title={t('diffView.toggleTooltip')}>
          <button
            type="button"
            onClick={() => { setViewMode('unified'); }}
            aria-pressed={viewMode === 'unified'}
            title={t('diffView.unified')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'unified'
                ? 'bg-[color:var(--bg-active-strong)] text-[color:var(--fg-on-active-strong)]'
                : 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-default)]'
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
                ? 'bg-[color:var(--bg-active-strong)] text-[color:var(--fg-on-active-strong)]'
                : 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-default)]'
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

      <div className="divide-y divide-[color:var(--border-muted)]">
        {block.files.map((file) => (
          <FileRow key={file.path} file={file} isDark={isDark} viewMode={viewMode} />
        ))}
      </div>

      <div className={`flex items-start gap-2 px-3 py-2 border-t ${headerBorder} bg-[color:var(--bg-surface-muted)]`}>
        <AlertCircle className={`w-3 h-3 shrink-0 mt-0.5 ${textFaint}`} />
        <span className={`text-[10px] leading-relaxed ${textMuted}`}>
          {applied ? t('apply.appliedNote') : t('apply.suggestedNote')}
        </span>
      </div>

      <div className={`flex items-center justify-between px-2.5 py-2 border-t ${headerBorder} bg-[color:var(--bg-surface-muted)]`}>
        <span className={`text-[11px] font-mono ${textFaint}`}>
          {applied ? t('apply.applied') : t('apply.previewOnly')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={t('block.patch')}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors text-[color:var(--fg-muted)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]"
          >
            <Copy className="w-2.5 h-2.5" />
            {t('block.patch')}
          </button>
          {!applied ? (
            <button
              type="button"
              onClick={() => { setApplied(true); }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors text-[color:var(--fg-strong)] bg-[color:var(--bg-active)] hover:bg-[color:var(--bg-selected)] border border-[color:var(--border-default)]"
            >
              <FileEdit className="w-2.5 h-2.5" />
              {t('apply.applyToTree')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setApplied(false); }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors text-[color:var(--fg-muted)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]"
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
