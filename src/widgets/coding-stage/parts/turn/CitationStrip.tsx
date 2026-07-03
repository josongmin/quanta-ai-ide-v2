import { useState } from 'react';
import { FileCode } from 'lucide-react';
import type { AgentTurn } from '../types';
import { useCodingStage } from '../../model/CodingStageContext';

export function CitationStrip({
  citations,
}: {
  citations: NonNullable<AgentTurn['citations']>;
}) {
  const { t } = useCodingStage();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? citations : citations.slice(0, 3);
  const overflow = citations.length - visible.length;
  const muted = 'text-[color:var(--fg-subtle)]';
  const chip = 'bg-[color:var(--bg-surface-muted)] text-[color:var(--fg-default)]';

  return (
    <div className="mb-2 flex items-center gap-1.5 flex-wrap">
      <span className={`text-2xs font-bold uppercase tracking-eyebrow ${muted}`}>
        {t('citations.label')}
      </span>
      {visible.map((c, i) => {
        const basename = c.path.split('/').pop() ?? c.path;
        const range = c.lines
          ? t('citations.lines', { start: c.lines[0], end: c.lines[1] })
          : t('citations.noLines');
        const isStale = c.staleAfterTurn != null;
        const fullTitle = [
          c.path,
          c.lines ? `L${c.lines[0]}-${c.lines[1]}` : null,
          c.note,
          isStale ? t('citationStale.tooltip') : null,
        ].filter(Boolean).join(' · ');
        const staleChipStyle: React.CSSProperties = {
          borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 40%, transparent)',
          background: 'var(--intent-warn-bg)',
          color: 'var(--intent-warn-fg)',
        };
        return (
          <span
            key={`${c.path}:${i}`}
            title={fullTitle}
            className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-xs font-mono cursor-help ${chip} ${
              isStale ? 'opacity-75' : ''
            }`}
          >
            <FileCode className="w-2.5 h-2.5 opacity-70" />
            <span className={isStale ? 'line-through opacity-80' : ''}>{basename}</span>
            <span className="opacity-60">·</span>
            <span className="opacity-70">{range}</span>
            {isStale && (
              <span
                style={staleChipStyle}
                className="ml-0.5 px-1 rounded-sm text-2xs font-bold uppercase tracking-eyebrow border"
              >
                {t('citationStale.label')}
              </span>
            )}
          </span>
        );
      })}
      {overflow > 0 && !expanded && (
        <button
          type="button"
          onClick={() => { setExpanded(true); }}
          className={`text-xs font-mono underline ${muted}`}
        >
          {t('citations.more', { count: overflow })}
        </button>
      )}
    </div>
  );
}
