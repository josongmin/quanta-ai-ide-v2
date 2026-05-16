import { useState } from 'react';
import {
  AlertCircle, ArrowRight, Columns2, AlignLeft, Copy, Eye, ExternalLink,
  FileEdit, GitPullRequest,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { DiffBlock } from '../types';
import { FileRow, type DiffViewMode } from './FileRow';

export function DiffBlockView({ block, isDark }: { block: DiffBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  const [applied, setApplied] = useState(block.applied === 'applied');
  // View mode lives at the block level so toggling once affects every
  // file in the diff at the same time. Persist across re-renders only
  // for this block instance — refreshing the page resets to unified.
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified');
  const textMuted = 'text-[var(--fg-muted)]';
  const textFaint = 'text-[var(--fg-muted)]';
  const card = 'bg-[var(--bg-surface-muted)] border-[var(--border-default)]';
  const headerBorder = 'border-[var(--border-default)]';

  const stateBadge = applied
    ? ('bg-[var(--intent-success-bg)] text-[var(--intent-success-fg)] border-[var(--intent-success-fg)]')
    : ('bg-[var(--bg-active)] text-[var(--fg-default)] border-[var(--border-strong)]');
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
          className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-bold uppercase tracking-[0.18em] border ${stateBadge}`}
        >
          <StateIcon className="w-2.5 h-2.5" />
          {applied ? t('apply.applied') : t('apply.suggested')}
        </span>
        <div className="flex-1" />
        {/* unified ↔ split toggle. */}
        <div className={`flex items-center gap-px rounded-md p-px bg-[var(--bg-active)]`} title={t('diffView.toggleTooltip')}>
          <button
            type="button"
            onClick={() => { setViewMode('unified'); }}
            aria-pressed={viewMode === 'unified'}
            title={t('diffView.unified')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'unified'
                ? ('bg-[var(--bg-active-strong)] text-[var(--fg-on-active-strong)]')
                : ('text-[var(--fg-muted)] hover:text-[var(--fg-default)]')
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
                ? ('bg-[var(--bg-active-strong)] text-[var(--fg-on-active-strong)]')
                : ('text-[var(--fg-muted)] hover:text-[var(--fg-default)]')
            }`}
          >
            <Columns2 className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
          <span className="coding-num-rise" style={{ color: 'var(--intent-success-vivid)' }}>+{block.added}</span>
          <span className="coding-num-rise" style={{ color: 'var(--intent-danger-vivid)', animationDelay: '60ms' }}>−{block.removed}</span>
        </div>
      </div>

      <div className={'divide-y divide-[var(--border-muted)]'}>
        {block.files.map((file) => (
          <FileRow key={file.path} file={file} isDark={isDark} viewMode={viewMode} />
        ))}
      </div>

      <div className={`flex items-start gap-2 px-3 py-2 border-t ${headerBorder} bg-[var(--bg-surface-muted)]`}>
        <AlertCircle className={`w-3 h-3 shrink-0 mt-0.5 ${textFaint}`} />
        <span className={`text-[10px] leading-relaxed ${textMuted}`}>
          {applied ? t('apply.appliedNote') : t('apply.suggestedNote')}
        </span>
      </div>

      <div className={`flex items-center justify-between px-2.5 py-2 border-t ${headerBorder} bg-[var(--bg-surface-muted)]`}>
        <span className={`text-[11px] font-mono ${textFaint}`}>
          {applied ? t('apply.applied') : t('apply.previewOnly')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={t('block.patch')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:[background:var(--bg-hover)]`}
          >
            <Copy className="w-2.5 h-2.5" />
            {t('block.patch')}
          </button>
          {!applied ? (
            <button
              type="button"
              onClick={() => { setApplied(true); }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors text-[var(--fg-strong)] bg-[var(--bg-elevated)] hover:[background:var(--bg-active-strong)] border border-[var(--border-strong)]`}
            >
              <FileEdit className="w-2.5 h-2.5" />
              {t('apply.applyToTree')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setApplied(false); }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:[background:var(--bg-hover)]`}
              title={t('apply.previewOnly')}
            >
              <Eye className="w-2.5 h-2.5" />
              {t('apply.previewOnly')}
            </button>
          )}
          <button
            type="button"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors text-[var(--intent-success-vivid)] bg-[var(--intent-success-bg)] hover:[background:color-mix(in_srgb,var(--intent-success-vivid)_18%,transparent)] border border-[var(--intent-success-fg)]`}
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
