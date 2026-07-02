import type { FixCase } from '../../model/types';
import { ACCENT, mix } from './tokens';
import { PaneHeader } from './shared';

export function LoopTimelinePane({ iterations }: { iterations: FixCase['loop']['iterations'] }) {
  if (iterations.length === 0) return null;
  return (
    <div className="px-4 py-3 border-b border-[var(--border-muted)]">
      <PaneHeader label="Self-check loop" />
      <ol className="space-y-1">
        {iterations.map((it) => (
          <li key={it.index} className="flex items-center gap-2 text-[10px]">
            <span
              className="w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[8px] font-mono"
              style={{
                background: mix(ACCENT, 18),
                color: ACCENT,
                border: `1px solid ${mix(ACCENT, 33)}`,
              }}
            >
              {it.index + 1}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)] w-[88px] shrink-0">
              {it.stage}
            </span>
            <span className="text-[10px] text-[var(--fg-default)] leading-snug">{it.note}</span>
            <span className="ml-auto text-[9px] font-mono text-[var(--fg-subtle)] shrink-0">
              {it.costTokens.toLocaleString()} tok
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
