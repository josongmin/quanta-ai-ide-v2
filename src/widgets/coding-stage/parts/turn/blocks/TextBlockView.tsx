import { memo, useMemo } from 'react';
import type { TextBlock } from '../../types';

// Tiny inline-code formatter: anything between backticks gets a chip.
function TextBlockViewImpl({ block }: { block: TextBlock }) {
  const color = 'text-[color:var(--fg-strong)]';
  // Memo the split — the regex re-allocates an array on every render
  // otherwise. Keyed on `block.text` so it only recomputes when the
  // streaming text actually grows.
  const parts = useMemo(() => block.text.split(/(`[^`]+`)/g), [block.text]);
  return (
    <div className={`text-md leading-[1.65] ${color} whitespace-pre-wrap break-words`}>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code
            key={i}
            style={{ color: 'var(--intent-success-fg)' }}
            className="mx-px px-1 py-px rounded-md text-base font-mono bg-[color:var(--bg-active)] border border-[color:var(--border-muted)]"
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
