import { memo, useState } from 'react';
import { Brain, ChevronRight } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { ThinkingBlock } from '../../types';

function ThinkingBlockViewImpl({ block, isDark }: { block: ThinkingBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  const [open, setOpen] = useState(false);
  const seconds = (block.durationMs / 1000).toFixed(1);
  const muted = isDark ? 'text-white/40' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  return (
    <div>
      <button type="button"
        onClick={() => { setOpen((v) => !v); }}
        className={`group flex items-center gap-1.5 text-[11px] font-medium transition-colors ${muted} hover:${isDark ? 'text-white/70' : 'text-black/70'}`}
      >
        <Brain className="w-3 h-3" />
        <span>{t('block.thoughtFor', { seconds })}</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div
          className={`mt-1.5 ml-4 pl-3 border-l text-[12px] leading-[1.6] italic ${
            isDark ? 'border-white/[0.08] text-white/55' : 'border-black/[0.08] text-black/55'
          }`}
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

export const ThinkingBlockView = memo(ThinkingBlockViewImpl);
