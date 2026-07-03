import { memo } from 'react';
import { ExternalLink, GitCompareArrows, Sparkles } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { DiffPreviewBlock } from '../../types';

// Compact preview card emitted by `/diff <ref>`. Lets the user orient
// before asking follow-up questions about a branch/ref's diff.
function DiffPreviewBlockViewImpl({ block }: { block: DiffPreviewBlock }) {
  const { t } = useTranslation('coding');
  const card = 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-default)]';
  const headerBorder = 'border-[color:var(--border-muted)]';
  const muted = 'text-[color:var(--fg-muted)]';
  const faint = 'text-[color:var(--fg-subtle)]';
  const primary = 'text-[color:var(--fg-strong)]';
  return (
    <div className={`rounded-lg border overflow-hidden ${card}`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${headerBorder}`}>
        <GitCompareArrows className={`w-3 h-3 ${muted}`} />
        <span className={`text-xs font-bold uppercase tracking-eyebrow ${faint}`}>
          {t('diffPreview.label')}
        </span>
        <span className={`text-base font-mono ${primary}`}>{block.ref}</span>
        <span className={faint}>←</span>
        <span className={`text-sm font-mono ${muted}`}>{block.base}</span>
        <div className="flex-1" />
        <span className={`text-xs font-mono ${faint}`}>
          {t('diffPreview.summary', { added: block.added, removed: block.removed, files: block.files })}
        </span>
      </div>
      <div className={`px-3 py-2 text-base leading-relaxed ${primary}`}>
        {block.summary}
      </div>
      <div className={`flex items-center justify-end gap-1 px-2 py-1.5 border-t ${headerBorder} bg-[color:var(--bg-surface-muted)]`}>
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium transition-colors text-[color:var(--fg-muted)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]"
        >
          <Sparkles className="w-2.5 h-2.5" />
          {t('diffPreview.askAbout')}
        </button>
        <button
          type="button"
          style={{
            color: 'var(--intent-success-fg)',
            background: 'var(--intent-success-bg)',
            border: '1px solid color-mix(in srgb, var(--intent-success-vivid) 20%, transparent)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          {t('diffPreview.openInPr')}
        </button>
      </div>
    </div>
  );
}

export const DiffPreviewBlockView = memo(DiffPreviewBlockViewImpl);
