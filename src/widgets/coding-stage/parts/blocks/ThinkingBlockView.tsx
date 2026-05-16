import { useState } from 'react';
import { Brain, ChevronRight } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { ThinkingBlock } from '../types';

export function ThinkingBlockView({ block, isDark }: { block: ThinkingBlock; isDark: boolean }) {
  void isDark;
  const { t } = useTranslation('coding');
  const [open, setOpen] = useState(false);
  const seconds = (block.durationMs / 1000).toFixed(1);
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  return (
    <div>
      <button type="button"
        onClick={() => { setOpen((v) => !v); }}
        className={`group flex items-center gap-1.5 text-[11px] font-medium transition-colors ${muted} hover:text-[var(--fg-default)]`}
      >
        <Brain className="w-3 h-3" />
        <span>{t('block.thoughtFor', { seconds })}</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div
          className={`mt-1.5 ml-4 pl-3 border-l text-[12px] leading-[1.6] italic border-[var(--border-default)] text-[var(--fg-muted)]`}
        >
          {block.text}
        </div>
      )}
      {!open && (
        <div className={`ml-4 mt-0.5 text-[11px] ${faint} italic line-clamp-1`}>
          {block.text}
        </div>
      )}
    </div>
  );
}
