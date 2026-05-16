import { ExternalLink, GitCompareArrows, Sparkles } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { DiffPreviewBlock } from '../types';

// Compact preview card emitted by `/diff <ref>`. Lets the user orient
// before asking follow-up questions about a branch/ref's diff.
export function DiffPreviewBlockView({ block, isDark }: { block: DiffPreviewBlock; isDark: boolean }) {
  void isDark;
  const { t } = useTranslation('coding');
  const card = 'bg-[var(--bg-surface-muted)] border-[var(--border-default)]';
  const headerBorder = 'border-[var(--border-default)]';
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const primary = 'text-[var(--fg-strong)]';
  return (
    <div className={`rounded-lg border overflow-hidden ${card}`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${headerBorder}`}>
        <GitCompareArrows className={`w-3 h-3 ${muted}`} />
        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${faint}`}>
          {t('diffPreview.label')}
        </span>
        <span className={`text-[12px] font-mono ${primary}`}>{block.ref}</span>
        <span className={faint}>←</span>
        <span className={`text-[11px] font-mono ${muted}`}>{block.base}</span>
        <div className="flex-1" />
        <span className={`text-[10px] font-mono ${faint}`}>
          {t('diffPreview.summary', { added: block.added, removed: block.removed, files: block.files })}
        </span>
      </div>
      <div className={`px-3 py-2 text-[12px] leading-relaxed ${primary}`}>
        {block.summary}
      </div>
      <div className={`flex items-center justify-end gap-1 px-2 py-1.5 border-t ${headerBorder} bg-[var(--bg-surface-muted)]`}>
        <button
          type="button"
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:[background:var(--bg-hover)]`}
        >
          <Sparkles className="w-2.5 h-2.5" />
          {t('diffPreview.askAbout')}
        </button>
        <button
          type="button"
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors text-[var(--intent-success-vivid)] bg-[var(--intent-success-bg)] hover:[background:color-mix(in_srgb,var(--intent-success-vivid)_18%,transparent)] border border-[var(--intent-success-fg)]`}
        >
          <ExternalLink className="w-2.5 h-2.5" />
          {t('diffPreview.openInPr')}
        </button>
      </div>
    </div>
  );
}
