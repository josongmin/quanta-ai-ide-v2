import { memo, useMemo } from 'react';
import type { TextBlock } from '../../types';

// Tiny inline-code formatter: anything between backticks gets a chip.
function TextBlockViewImpl({ block, isDark }: { block: TextBlock; isDark: boolean }) {
  const color = isDark ? 'text-white/85' : 'text-black/85';
  // Memo the split — the regex re-allocates an array on every render
  // otherwise. Keyed on `block.text` so it only recomputes when the
  // streaming text actually grows.
  const parts = useMemo(() => block.text.split(/(`[^`]+`)/g), [block.text]);
  return (
    <div className={`text-[13px] leading-[1.65] ${color} whitespace-pre-wrap break-words`}>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code
            key={i}
            style={{ color: 'var(--intent-success-fg)' }}
            className={`mx-px px-1 py-px rounded-md text-[12px] font-mono ${
              isDark
                ? 'bg-white/[0.08] border border-white/[0.06]'
                : 'bg-black/[0.05] border border-black/[0.05]'
            }`}
          >
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
}

export const TextBlockView = memo(TextBlockViewImpl);
