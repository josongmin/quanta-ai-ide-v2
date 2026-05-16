import { memo } from 'react';
import { ExternalLink, GitCompareArrows, Sparkles } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { DiffPreviewBlock } from '../../types';

// Compact preview card emitted by `/diff <ref>`. Lets the user orient
// before asking follow-up questions about a branch/ref's diff.
function DiffPreviewBlockViewImpl({ block, isDark }: { block: DiffPreviewBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  const card = isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-black/[0.08]';
  const headerBorder = isDark ? 'border-white/[0.06]' : 'border-black/[0.05]';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const primary = isDark ? 'text-white/85' : 'text-black/85';
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
      <div className={`flex items-center justify-end gap-1 px-2 py-1.5 border-t ${headerBorder} ${
        isDark ? 'bg-white/[0.015]' : 'bg-black/[0.015]'
      }`}>
        <button
          type="button"
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
            isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-black/55 hover:text-black hover:bg-black/[0.06]'
          }`}
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
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          {t('diffPreview.openInPr')}
        </button>
      </div>
    </div>
  );
}

export const DiffPreviewBlockView = memo(DiffPreviewBlockViewImpl);
